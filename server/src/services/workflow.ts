import { PrismaClient, WorkflowEntityType, ApprovalStatus } from '@prisma/client';
import { sendNotification } from './notification.js';

const prisma = new PrismaClient();

export interface WorkflowTriggerParams {
  entityType: WorkflowEntityType;
  entityId: string;
  triggerStatus?: string;
  requestedById: string;
  priority?: string;
  notes?: string;
}

export async function triggerWorkflow(params: WorkflowTriggerParams) {
  const { entityType, entityId, triggerStatus, requestedById, priority, notes } = params;

  const workflow = await prisma.workflowDefinition.findFirst({
    where: {
      entityType,
      triggerStatus: triggerStatus || null,
      isActive: true,
    },
    include: {
      steps: {
        orderBy: { stepOrder: 'asc' },
        include: { approverRole: true },
      },
    },
  });

  if (!workflow || workflow.steps.length === 0) {
    return null;
  }

  const approvalRequest = await prisma.approvalRequest.create({
    data: {
      workflowId: workflow.id,
      entityType,
      entityId,
      requestedById,
      currentStepOrder: 1,
      status: 'PENDING',
      priority: priority || 'NORMAL',
      notes,
    },
    include: {
      workflow: { include: { steps: { include: { approverRole: true } } } },
      requestedBy: true,
    },
  });

  const firstStep = workflow.steps[0];
  await notifyApprovers(approvalRequest.id, firstStep);

  return approvalRequest;
}

export async function processApproval(
  approvalRequestId: string,
  actionById: string,
  action: 'APPROVED' | 'REJECTED',
  comments?: string,
  signature?: string
) {
  const request = await prisma.approvalRequest.findUnique({
    where: { id: approvalRequestId },
    include: {
      workflow: {
        include: {
          steps: {
            orderBy: { stepOrder: 'asc' },
            include: { approverRole: { include: { users: true } } },
          },
        },
      },
      requestedBy: true,
    },
  });

  if (!request || request.status !== 'PENDING') {
    throw new Error('Invalid approval request or already processed');
  }

  const currentStep = request.workflow.steps.find(s => s.stepOrder === request.currentStepOrder);
  if (!currentStep) {
    throw new Error('Current step not found');
  }

  const actor = await prisma.user.findUnique({
    where: { id: actionById },
    include: { role: true },
  });

  if (!actor || actor.role.id !== currentStep.approverRoleId) {
    throw new Error('User not authorized to approve this step');
  }

  await prisma.approvalAction.create({
    data: {
      approvalRequestId,
      stepId: currentStep.id,
      actionById,
      action,
      comments,
      signature,
    },
  });

  if (action === 'REJECTED') {
    await prisma.approvalRequest.update({
      where: { id: approvalRequestId },
      data: {
        status: 'REJECTED',
        completedAt: new Date(),
      },
    });

    await sendNotification({
      userId: request.requestedById,
      type: 'SYSTEM',
      title: 'Approval Rejected',
      message: `Your ${request.entityType} approval request was rejected. ${comments || ''}`,
      relatedId: request.entityId,
      relatedType: request.entityType,
    });

    return { status: 'REJECTED', request };
  }

  const nextStepOrder = request.currentStepOrder + 1;
  const nextStep = request.workflow.steps.find(s => s.stepOrder === nextStepOrder);

  if (nextStep) {
    await prisma.approvalRequest.update({
      where: { id: approvalRequestId },
      data: { currentStepOrder: nextStepOrder },
    });

    await notifyApprovers(approvalRequestId, nextStep);

    return { status: 'PENDING_NEXT_STEP', nextStep, request };
  }

  await prisma.approvalRequest.update({
    where: { id: approvalRequestId },
    data: {
      status: 'APPROVED',
      completedAt: new Date(),
    },
  });

  await sendNotification({
    userId: request.requestedById,
    type: 'SYSTEM',
    title: 'Approval Completed',
    message: `Your ${request.entityType} has been fully approved.`,
    relatedId: request.entityId,
    relatedType: request.entityType,
  });

  return { status: 'FULLY_APPROVED', request };
}

async function notifyApprovers(approvalRequestId: string, step: any) {
  const approvers = await prisma.user.findMany({
    where: {
      roleId: step.approverRoleId,
      isActive: true,
    },
  });

  const request = await prisma.approvalRequest.findUnique({
    where: { id: approvalRequestId },
    include: { requestedBy: true },
  });

  for (const approver of approvers) {
    await sendNotification({
      userId: approver.id,
      type: 'SYSTEM',
      title: `Approval Required: ${step.stepName}`,
      message: `${request?.entityType} requires your approval. Requested by ${request?.requestedBy.firstName} ${request?.requestedBy.lastName}.`,
      relatedId: approvalRequestId,
      relatedType: 'ApprovalRequest',
      sendEmail: true,
    });
  }
}

export async function getPendingApprovals(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: { role: true },
  });

  if (!user) return [];

  const pendingRequests = await prisma.approvalRequest.findMany({
    where: {
      status: 'PENDING',
      workflow: {
        steps: {
          some: {
            approverRoleId: user.roleId,
          },
        },
      },
    },
    include: {
      workflow: {
        include: {
          steps: {
            orderBy: { stepOrder: 'asc' },
            include: { approverRole: true },
          },
        },
      },
      requestedBy: true,
      actions: {
        include: { actionBy: true, step: true },
        orderBy: { actionAt: 'desc' },
      },
    },
    orderBy: { createdAt: 'desc' },
  });

  return pendingRequests.filter(req => {
    const currentStep = req.workflow.steps.find(s => s.stepOrder === req.currentStepOrder);
    return currentStep?.approverRoleId === user.roleId;
  });
}

export async function getApprovalHistory(entityType: WorkflowEntityType, entityId: string) {
  return prisma.approvalRequest.findMany({
    where: { entityType, entityId },
    include: {
      workflow: true,
      requestedBy: true,
      actions: {
        include: { actionBy: true, step: true },
        orderBy: { actionAt: 'asc' },
      },
    },
    orderBy: { createdAt: 'desc' },
  });
}
