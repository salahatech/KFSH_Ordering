import { PrismaClient, BatchStatus, ShipmentStatus } from '@prisma/client';
import { sendNotification, NotificationChannel } from '../notification.js';

const prisma = new PrismaClient();

export interface CriticalEvent {
  type: 'BATCH_READY' | 'QC_FAILED' | 'SHIPMENT_DELAYED' | 'MATERIAL_EXPIRING' | 'APPROVAL_OVERDUE';
  entityId: string;
  entityType: string;
  message: string;
  severity: 'CRITICAL' | 'HIGH' | 'MEDIUM';
  recipients: string[];
}

export async function checkCriticalEvents(): Promise<CriticalEvent[]> {
  const events: CriticalEvent[] = [];
  
  const batchReadyEvents = await checkBatchReadyForRelease();
  events.push(...batchReadyEvents);
  
  const qcFailedEvents = await checkQCFailures();
  events.push(...qcFailedEvents);
  
  const shipmentDelayedEvents = await checkShipmentDelays();
  events.push(...shipmentDelayedEvents);
  
  for (const event of events) {
    await notifyEvent(event);
  }
  
  return events;
}

async function checkBatchReadyForRelease(): Promise<CriticalEvent[]> {
  const events: CriticalEvent[] = [];
  
  try {
    const readyBatches = await prisma.batch.findMany({
      where: {
        status: BatchStatus.QC_PASSED,
      },
      include: {
        product: true,
      },
      take: 20
    });
    
    const qpRole = await prisma.role.findFirst({ where: { name: 'QP' } });
    const adminRole = await prisma.role.findFirst({ where: { name: 'Admin' } });
    
    const qpUsers = await prisma.user.findMany({
      where: {
        roleId: { in: [qpRole?.id, adminRole?.id].filter(Boolean) as string[] },
        isActive: true
      }
    });
    
    for (const batch of readyBatches) {
      const recentNotification = await prisma.notification.findFirst({
        where: {
          relatedId: batch.id,
          createdAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) }
        }
      });
      
      if (recentNotification) continue;
      
      events.push({
        type: 'BATCH_READY',
        entityId: batch.id,
        entityType: 'Batch',
        message: `Batch ${batch.batchNumber} (${batch.product.name}) is ready for QP release`,
        severity: 'HIGH',
        recipients: qpUsers.map(u => u.id)
      });
    }
  } catch (error) {
    console.error('[EventNotifications] Error checking batch ready:', error);
  }
  
  return events;
}

async function checkQCFailures(): Promise<CriticalEvent[]> {
  const events: CriticalEvent[] = [];
  
  try {
    const failedBatches = await prisma.batch.findMany({
      where: {
        status: BatchStatus.FAILED_QC,
        updatedAt: {
          gte: new Date(Date.now() - 4 * 60 * 60 * 1000)
        }
      },
      include: {
        product: true,
      },
      take: 10
    });
    
    const qcRole = await prisma.role.findFirst({ where: { name: 'QC' } });
    const adminRole = await prisma.role.findFirst({ where: { name: 'Admin' } });
    
    const qcManagers = await prisma.user.findMany({
      where: {
        roleId: { in: [qcRole?.id, adminRole?.id].filter(Boolean) as string[] },
        isActive: true
      }
    });
    
    for (const batch of failedBatches) {
      events.push({
        type: 'QC_FAILED',
        entityId: batch.id,
        entityType: 'Batch',
        message: `QC FAILED: Batch ${batch.batchNumber} (${batch.product.name})`,
        severity: 'CRITICAL',
        recipients: qcManagers.map(u => u.id)
      });
    }
  } catch (error) {
    console.error('[EventNotifications] Error checking QC failures:', error);
  }
  
  return events;
}

async function checkShipmentDelays(): Promise<CriticalEvent[]> {
  const events: CriticalEvent[] = [];
  
  try {
    const now = new Date();
    
    const delayedShipments = await prisma.shipment.findMany({
      where: {
        status: { in: [ShipmentStatus.ASSIGNED_TO_DRIVER, ShipmentStatus.PICKED_UP, ShipmentStatus.IN_TRANSIT] },
        scheduledDeliveryAt: { lt: now }
      },
      include: {
        driver: true,
      },
      take: 10
    });
    
    const logisticsRole = await prisma.role.findFirst({ where: { name: 'Logistics' } });
    const adminRole = await prisma.role.findFirst({ where: { name: 'Admin' } });
    
    const logisticsUsers = await prisma.user.findMany({
      where: {
        roleId: { in: [logisticsRole?.id, adminRole?.id].filter(Boolean) as string[] },
        isActive: true
      }
    });
    
    for (const shipment of delayedShipments) {
      const hoursLate = Math.round((now.getTime() - (shipment.scheduledDeliveryAt?.getTime() || now.getTime())) / (1000 * 60 * 60));
      
      events.push({
        type: 'SHIPMENT_DELAYED',
        entityId: shipment.id,
        entityType: 'Shipment',
        message: `Shipment ${shipment.shipmentNumber} is ${hoursLate}h overdue`,
        severity: hoursLate > 4 ? 'CRITICAL' : 'HIGH',
        recipients: logisticsUsers.map(u => u.id)
      });
    }
  } catch (error) {
    console.error('[EventNotifications] Error checking shipment delays:', error);
  }
  
  return events;
}

async function notifyEvent(event: CriticalEvent) {
  try {
    for (const userId of event.recipients) {
      const user = await prisma.user.findUnique({
        where: { id: userId }
      });
      
      if (!user) continue;
      
      const existingNotification = await prisma.notification.findFirst({
        where: {
          userId,
          relatedId: event.entityId,
          createdAt: {
            gte: new Date(Date.now() - 4 * 60 * 60 * 1000)
          }
        }
      });
      
      if (existingNotification) continue;
      
      const channels: NotificationChannel[] = [];
      if (event.severity === 'CRITICAL') {
        channels.push('email', 'sms');
      } else if (event.severity === 'HIGH') {
        channels.push('email');
      }
      
      await sendNotification({
        userId,
        type: 'SYSTEM',
        title: getEventTitle(event.type),
        message: event.message,
        relatedId: event.entityId,
        relatedType: event.entityType,
        channels,
        category: getCategoryForEvent(event.type)
      });
    }
  } catch (error) {
    console.error('[EventNotifications] Error sending notification:', error);
  }
}

function getEventTitle(type: CriticalEvent['type']): string {
  const titles: Record<string, string> = {
    'BATCH_READY': 'Batch Ready for Release',
    'QC_FAILED': 'QC Test Failed',
    'SHIPMENT_DELAYED': 'Shipment Delayed',
    'MATERIAL_EXPIRING': 'Material Expiring Soon',
    'APPROVAL_OVERDUE': 'Approval Overdue',
  };
  return titles[type] || 'System Alert';
}

function getCategoryForEvent(type: CriticalEvent['type']): 'batch' | 'delivery' | 'approval' | 'system' {
  const categories: Record<string, 'batch' | 'delivery' | 'approval' | 'system'> = {
    'BATCH_READY': 'batch',
    'QC_FAILED': 'batch',
    'SHIPMENT_DELAYED': 'delivery',
    'MATERIAL_EXPIRING': 'system',
    'APPROVAL_OVERDUE': 'approval',
  };
  return categories[type] || 'system';
}

export async function triggerBatchReadyNotification(batchId: string) {
  const batch = await prisma.batch.findUnique({
    where: { id: batchId },
    include: { product: true }
  });
  
  if (!batch) return;
  
  const qpRole = await prisma.role.findFirst({ where: { name: 'QP' } });
  const adminRole = await prisma.role.findFirst({ where: { name: 'Admin' } });
  
  const qpUsers = await prisma.user.findMany({
    where: {
      roleId: { in: [qpRole?.id, adminRole?.id].filter(Boolean) as string[] },
      isActive: true
    }
  });
  
  for (const user of qpUsers) {
    await sendNotification({
      userId: user.id,
      type: 'SYSTEM',
      title: 'Batch Ready for QP Release',
      message: `Batch ${batch.batchNumber} (${batch.product.name}) has passed QC and is ready for release`,
      relatedId: batchId,
      relatedType: 'Batch',
      channels: ['email'],
      category: 'batch'
    });
  }
}

export async function triggerQCFailedNotification(batchId: string, failedTests: string[]) {
  const batch = await prisma.batch.findUnique({
    where: { id: batchId },
    include: { product: true }
  });
  
  if (!batch) return;
  
  const qcRole = await prisma.role.findFirst({ where: { name: 'QC' } });
  const adminRole = await prisma.role.findFirst({ where: { name: 'Admin' } });
  
  const qcManagers = await prisma.user.findMany({
    where: {
      roleId: { in: [qcRole?.id, adminRole?.id].filter(Boolean) as string[] },
      isActive: true
    }
  });
  
  for (const user of qcManagers) {
    await sendNotification({
      userId: user.id,
      type: 'WARNING',
      title: 'QC Test Failed',
      message: `Batch ${batch.batchNumber} failed QC: ${failedTests.join(', ')}`,
      relatedId: batchId,
      relatedType: 'Batch',
      channels: ['email', 'sms'],
      category: 'batch'
    });
  }
}

export async function triggerShipmentDelayedNotification(shipmentId: string) {
  const shipment = await prisma.shipment.findUnique({
    where: { id: shipmentId }
  });
  
  if (!shipment) return;
  
  const logisticsRole = await prisma.role.findFirst({ where: { name: 'Logistics' } });
  const adminRole = await prisma.role.findFirst({ where: { name: 'Admin' } });
  
  const logisticsUsers = await prisma.user.findMany({
    where: {
      roleId: { in: [logisticsRole?.id, adminRole?.id].filter(Boolean) as string[] },
      isActive: true
    }
  });
  
  for (const user of logisticsUsers) {
    await sendNotification({
      userId: user.id,
      type: 'WARNING',
      title: 'Shipment Delayed',
      message: `Shipment ${shipment.shipmentNumber} is delayed past scheduled time`,
      relatedId: shipmentId,
      relatedType: 'Shipment',
      channels: ['email'],
      category: 'delivery'
    });
  }
}
