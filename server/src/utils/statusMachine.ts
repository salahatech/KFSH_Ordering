import { OrderStatus, BatchStatus } from '@prisma/client';

const orderTransitions: Record<OrderStatus, OrderStatus[]> = {
  DRAFT: ['SUBMITTED', 'CANCELLED'],
  SUBMITTED: ['VALIDATED', 'REJECTED', 'CANCELLED'],
  VALIDATED: ['SCHEDULED', 'CANCELLED'],
  SCHEDULED: ['IN_PRODUCTION', 'CANCELLED'],
  IN_PRODUCTION: ['QC_PENDING', 'CANCELLED'],
  QC_PENDING: ['RELEASED', 'FAILED_QC'],
  RELEASED: ['DISPATCHED'],
  DISPATCHED: ['DELIVERED'],
  DELIVERED: [],
  CANCELLED: [],
  REJECTED: ['DRAFT'],
  FAILED_QC: ['REWORK', 'CANCELLED'],
  REWORK: ['IN_PRODUCTION', 'CANCELLED'],
};

const batchTransitions: Record<BatchStatus, BatchStatus[]> = {
  PLANNED: ['IN_PROGRESS', 'CANCELLED'],
  IN_PROGRESS: ['COMPLETED', 'CANCELLED'],
  COMPLETED: ['QC_PENDING'],
  QC_PENDING: ['QC_IN_PROGRESS'],
  QC_IN_PROGRESS: ['QC_PASSED', 'QC_FAILED'],
  QC_PASSED: ['RELEASED'],
  QC_FAILED: ['CANCELLED'],
  RELEASED: [],
  CANCELLED: [],
};

export function canTransitionOrder(
  currentStatus: OrderStatus,
  newStatus: OrderStatus
): boolean {
  const allowedTransitions = orderTransitions[currentStatus] || [];
  return allowedTransitions.includes(newStatus);
}

export function canTransitionBatch(
  currentStatus: BatchStatus,
  newStatus: BatchStatus
): boolean {
  const allowedTransitions = batchTransitions[currentStatus] || [];
  return allowedTransitions.includes(newStatus);
}

export function getNextOrderStatuses(currentStatus: OrderStatus): OrderStatus[] {
  return orderTransitions[currentStatus] || [];
}

export function getNextBatchStatuses(currentStatus: BatchStatus): BatchStatus[] {
  return batchTransitions[currentStatus] || [];
}
