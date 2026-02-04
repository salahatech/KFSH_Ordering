import { PrismaClient, OrderStatus, BatchStatus } from '@prisma/client';
import { sendNotification, NotificationChannel } from '../notification.js';

const prisma = new PrismaClient();

interface PendingApproval {
  id: string;
  type: 'order' | 'purchaseOrder' | 'batch';
  identifier: string;
  createdAt: Date;
  hoursWaiting: number;
  approverRoleName: string;
}

export async function runApprovalReminders() {
  console.log('[ApprovalReminders] Checking for pending approvals...');
  
  try {
    const reminderThresholdHours = await getReminderThreshold();
    
    const pendingApprovals = await getPendingApprovals(reminderThresholdHours);
    
    console.log(`[ApprovalReminders] Found ${pendingApprovals.length} pending approvals over ${reminderThresholdHours}h`);
    
    for (const approval of pendingApprovals) {
      await sendApprovalReminder(approval);
    }
    
    await logReminderRun(pendingApprovals.length);
  } catch (error) {
    console.error('[ApprovalReminders] Error:', error);
    throw error;
  }
}

async function getReminderThreshold(): Promise<number> {
  const config = await prisma.systemConfig.findUnique({
    where: { key: 'approval_reminder_hours' }
  });
  return config ? parseInt(config.value) : 4;
}

async function getPendingApprovals(thresholdHours: number): Promise<PendingApproval[]> {
  const thresholdDate = new Date(Date.now() - thresholdHours * 60 * 60 * 1000);
  const approvals: PendingApproval[] = [];
  
  const pendingOrders = await prisma.order.findMany({
    where: {
      status: OrderStatus.SUBMITTED,
      createdAt: { lt: thresholdDate }
    },
    select: {
      id: true,
      orderNumber: true,
      createdAt: true
    },
    take: 50
  });
  
  for (const order of pendingOrders) {
    const lastReminder = await getLastReminder('order', order.id);
    if (lastReminder && (Date.now() - lastReminder.getTime()) < 4 * 60 * 60 * 1000) {
      continue;
    }
    
    approvals.push({
      id: order.id,
      type: 'order',
      identifier: order.orderNumber,
      createdAt: order.createdAt,
      hoursWaiting: Math.round((Date.now() - order.createdAt.getTime()) / (1000 * 60 * 60)),
      approverRoleName: 'Order Desk'
    });
  }
  
  const pendingPOs = await prisma.purchaseOrder.findMany({
    where: {
      status: 'PENDING_APPROVAL',
      createdAt: { lt: thresholdDate }
    },
    select: {
      id: true,
      poNumber: true,
      createdAt: true
    },
    take: 50
  });
  
  for (const po of pendingPOs) {
    const lastReminder = await getLastReminder('purchaseOrder', po.id);
    if (lastReminder && (Date.now() - lastReminder.getTime()) < 4 * 60 * 60 * 1000) {
      continue;
    }
    
    approvals.push({
      id: po.id,
      type: 'purchaseOrder',
      identifier: po.poNumber,
      createdAt: po.createdAt,
      hoursWaiting: Math.round((Date.now() - po.createdAt.getTime()) / (1000 * 60 * 60)),
      approverRoleName: 'Procurement'
    });
  }
  
  const pendingReleases = await prisma.batch.findMany({
    where: {
      status: BatchStatus.QC_PASSED,
      updatedAt: { lt: thresholdDate }
    },
    select: {
      id: true,
      batchNumber: true,
      updatedAt: true
    },
    take: 50
  });
  
  for (const batch of pendingReleases) {
    const lastReminder = await getLastReminder('batch', batch.id);
    if (lastReminder && (Date.now() - lastReminder.getTime()) < 4 * 60 * 60 * 1000) {
      continue;
    }
    
    approvals.push({
      id: batch.id,
      type: 'batch',
      identifier: batch.batchNumber,
      createdAt: batch.updatedAt,
      hoursWaiting: Math.round((Date.now() - batch.updatedAt.getTime()) / (1000 * 60 * 60)),
      approverRoleName: 'QP'
    });
  }
  
  return approvals;
}

async function getLastReminder(type: string, entityId: string): Promise<Date | null> {
  const notification = await prisma.notification.findFirst({
    where: {
      relatedId: entityId,
    },
    orderBy: { createdAt: 'desc' }
  });
  
  return notification?.createdAt || null;
}

async function sendApprovalReminder(approval: PendingApproval) {
  const approvers = await getApproversForRole(approval.approverRoleName);
  
  if (approvers.length === 0) {
    console.log(`[ApprovalReminders] No approvers found for role: ${approval.approverRoleName}`);
    return;
  }
  
  const title = getApprovalTitle(approval.type);
  const message = `${approval.identifier} has been waiting for ${approval.hoursWaiting}h. Please review and approve.`;
  
  const channels: NotificationChannel[] = approval.hoursWaiting > 8 ? ['email', 'sms'] : ['email'];
  
  for (const approver of approvers) {
    await sendNotification({
      userId: approver.id,
      type: 'SYSTEM',
      title,
      message,
      relatedId: approval.id,
      relatedType: capitalizeFirst(approval.type),
      channels,
      category: 'approval'
    });
  }
  
  console.log(`[ApprovalReminders] Sent reminder for ${approval.type} ${approval.identifier} to ${approvers.length} users`);
}

async function getApproversForRole(roleName: string): Promise<{ id: string; email: string }[]> {
  const roleMapping: Record<string, string[]> = {
    'Order Desk': ['Order Desk', 'Admin'],
    'Procurement': ['Procurement', 'Admin'],
    'QP': ['QP', 'Admin'],
    'QC Manager': ['QC', 'Admin'],
    'Logistics': ['Logistics', 'Admin'],
  };
  
  const roleNames = roleMapping[roleName] || [roleName, 'Admin'];
  
  const roles = await prisma.role.findMany({
    where: { name: { in: roleNames } }
  });
  
  const roleIds = roles.map(r => r.id);
  
  const users = await prisma.user.findMany({
    where: {
      roleId: { in: roleIds },
      isActive: true
    },
    select: {
      id: true,
      email: true
    }
  });
  
  return users;
}

function getApprovalTitle(type: string): string {
  const titles: Record<string, string> = {
    'order': 'Order Approval Reminder',
    'purchaseOrder': 'Purchase Order Approval Reminder',
    'batch': 'Batch Release Reminder',
  };
  return titles[type] || 'Approval Reminder';
}

function capitalizeFirst(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

async function logReminderRun(count: number) {
  await prisma.systemConfig.upsert({
    where: { key: 'approval_reminders_last_run' },
    update: { value: new Date().toISOString() },
    create: { key: 'approval_reminders_last_run', value: new Date().toISOString(), dataType: 'string' }
  });
  
  await prisma.systemConfig.upsert({
    where: { key: 'approval_reminders_last_count' },
    update: { value: String(count) },
    create: { key: 'approval_reminders_last_count', value: String(count), dataType: 'number' }
  });
}
