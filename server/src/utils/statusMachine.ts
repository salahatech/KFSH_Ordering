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
  PLANNED: ['SCHEDULED', 'IN_PRODUCTION', 'CANCELLED', 'ON_HOLD'],
  SCHEDULED: ['IN_PRODUCTION', 'CANCELLED', 'ON_HOLD'],
  IN_PRODUCTION: ['PRODUCTION_COMPLETE', 'CANCELLED', 'ON_HOLD', 'DEVIATION_OPEN'],
  PRODUCTION_COMPLETE: ['QC_PENDING', 'ON_HOLD'],
  QC_PENDING: ['QC_IN_PROGRESS', 'ON_HOLD'],
  QC_IN_PROGRESS: ['QC_PASSED', 'FAILED_QC', 'ON_HOLD'],
  QC_PASSED: ['QP_REVIEW'],
  QP_REVIEW: ['RELEASED', 'REJECTED', 'ON_HOLD'],
  RELEASED: ['DISPENSING_IN_PROGRESS'],
  DISPENSING_IN_PROGRESS: ['DISPENSED', 'ON_HOLD'],
  DISPENSED: ['PACKED'],
  PACKED: ['DISPATCHED'],
  DISPATCHED: ['CLOSED'],
  CLOSED: [],
  ON_HOLD: ['PLANNED', 'SCHEDULED', 'IN_PRODUCTION', 'PRODUCTION_COMPLETE', 'QC_PENDING', 'QC_IN_PROGRESS', 'QP_REVIEW', 'RELEASED', 'DISPENSING_IN_PROGRESS', 'CANCELLED'],
  REJECTED: ['CANCELLED'],
  FAILED_QC: ['QC_PENDING', 'CANCELLED'],
  CANCELLED: [],
  DEVIATION_OPEN: ['IN_PRODUCTION', 'CANCELLED'],
};

const batchToOrderStatusMap: Partial<Record<BatchStatus, OrderStatus>> = {
  IN_PRODUCTION: 'IN_PRODUCTION',
  QC_PENDING: 'QC_PENDING',
  QC_IN_PROGRESS: 'QC_PENDING',
  QC_PASSED: 'QC_PENDING',
  QP_REVIEW: 'QC_PENDING',
  RELEASED: 'RELEASED',
  DISPATCHED: 'DISPATCHED',
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

export function getOrderStatusForBatch(batchStatus: BatchStatus): OrderStatus | null {
  return batchToOrderStatusMap[batchStatus] || null;
}

export function isExceptionStatus(status: BatchStatus): boolean {
  return ['ON_HOLD', 'REJECTED', 'FAILED_QC', 'CANCELLED', 'DEVIATION_OPEN'].includes(status);
}

export function canDispense(status: BatchStatus): boolean {
  return ['RELEASED', 'DISPENSING_IN_PROGRESS', 'DISPENSED', 'PACKED', 'DISPATCHED', 'CLOSED'].includes(status);
}

export function isBlockedFromDispatch(status: BatchStatus): boolean {
  return ['ON_HOLD', 'REJECTED', 'FAILED_QC', 'CANCELLED', 'DEVIATION_OPEN'].includes(status);
}

export const batchStatusLabels: Record<BatchStatus, string> = {
  PLANNED: 'Planned',
  SCHEDULED: 'Scheduled',
  IN_PRODUCTION: 'In Production',
  PRODUCTION_COMPLETE: 'Production Complete',
  QC_PENDING: 'QC Pending',
  QC_IN_PROGRESS: 'QC In Progress',
  QC_PASSED: 'QC Passed',
  QP_REVIEW: 'QP Review',
  RELEASED: 'Released',
  DISPENSING_IN_PROGRESS: 'Dispensing',
  DISPENSED: 'Dispensed',
  PACKED: 'Packed',
  DISPATCHED: 'Dispatched',
  CLOSED: 'Closed',
  ON_HOLD: 'On Hold',
  REJECTED: 'Rejected',
  FAILED_QC: 'QC Failed',
  CANCELLED: 'Cancelled',
  DEVIATION_OPEN: 'Deviation Open',
};

export const mainBatchStatuses: BatchStatus[] = [
  'PLANNED',
  'SCHEDULED',
  'IN_PRODUCTION',
  'PRODUCTION_COMPLETE',
  'QC_PENDING',
  'QC_IN_PROGRESS',
  'QC_PASSED',
  'QP_REVIEW',
  'RELEASED',
  'DISPENSING_IN_PROGRESS',
  'DISPENSED',
  'PACKED',
  'DISPATCHED',
  'CLOSED',
];

export const exceptionBatchStatuses: BatchStatus[] = [
  'ON_HOLD',
  'REJECTED',
  'FAILED_QC',
  'CANCELLED',
  'DEVIATION_OPEN',
];
