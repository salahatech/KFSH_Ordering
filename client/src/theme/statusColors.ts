export interface StatusColorConfig {
  bg: string;
  text: string;
  border?: string;
  dot?: string;
}

export const statusColors: Record<string, StatusColorConfig> = {
  // Generic statuses
  DRAFT: { bg: '#f1f5f9', text: '#475569', border: '#e2e8f0' },
  PENDING: { bg: '#f1f5f9', text: '#475569', border: '#e2e8f0' },
  PENDING_APPROVAL: { bg: '#fef3c7', text: '#92400e', border: '#fcd34d' },
  APPROVED: { bg: '#dcfce7', text: '#166534', border: '#86efac' },
  ACTIVE: { bg: '#dcfce7', text: '#166534', border: '#86efac' },
  COMPLETED: { bg: '#dcfce7', text: '#166534', border: '#86efac' },
  CLOSED: { bg: '#e0e7ff', text: '#3730a3', border: '#a5b4fc' },
  CANCELLED: { bg: '#fee2e2', text: '#991b1b', border: '#fca5a5' },
  REJECTED: { bg: '#fee2e2', text: '#991b1b', border: '#fca5a5' },
  FAILED: { bg: '#fee2e2', text: '#991b1b', border: '#fca5a5' },
  ON_HOLD: { bg: '#fef3c7', text: '#92400e', border: '#fcd34d' },
  BLOCKED: { bg: '#fee2e2', text: '#991b1b', border: '#fca5a5' },
  INACTIVE: { bg: '#f1f5f9', text: '#64748b', border: '#e2e8f0' },
  EXPIRED: { bg: '#fee2e2', text: '#991b1b', border: '#fca5a5' },

  // Order lifecycle
  SUBMITTED: { bg: '#dbeafe', text: '#1d4ed8', border: '#93c5fd' },
  VALIDATED: { bg: '#dbeafe', text: '#1d4ed8', border: '#93c5fd' },
  SCHEDULED: { bg: '#e0e7ff', text: '#4338ca', border: '#a5b4fc' },
  IN_PRODUCTION: { bg: '#cffafe', text: '#0e7490', border: '#67e8f9' },
  QC_PENDING: { bg: '#fef3c7', text: '#92400e', border: '#fcd34d' },
  QC_IN_PROGRESS: { bg: '#fef3c7', text: '#b45309', border: '#fcd34d' },
  QC_PASSED: { bg: '#d1fae5', text: '#047857', border: '#6ee7b7' },
  FAILED_QC: { bg: '#fee2e2', text: '#991b1b', border: '#fca5a5' },
  QP_REVIEW: { bg: '#ede9fe', text: '#6d28d9', border: '#c4b5fd' },
  RELEASED: { bg: '#dcfce7', text: '#166534', border: '#86efac' },
  DISPATCHED: { bg: '#dbeafe', text: '#1d4ed8', border: '#93c5fd' },
  DELIVERED: { bg: '#dcfce7', text: '#166534', border: '#86efac' },
  REWORK: { bg: '#fef3c7', text: '#92400e', border: '#fcd34d' },

  // Batch statuses
  PLANNED: { bg: '#f1f5f9', text: '#475569', border: '#e2e8f0' },
  PRODUCTION_COMPLETE: { bg: '#cffafe', text: '#0e7490', border: '#67e8f9' },
  DISPENSING_IN_PROGRESS: { bg: '#ccfbf1', text: '#0d9488', border: '#5eead4' },
  DISPENSED: { bg: '#ccfbf1', text: '#0d9488', border: '#5eead4' },
  PACKED: { bg: '#dbeafe', text: '#1d4ed8', border: '#93c5fd' },
  DEVIATION_OPEN: { bg: '#fef3c7', text: '#92400e', border: '#fcd34d' },

  // Shipment statuses
  READY_TO_PACK: { bg: '#dbeafe', text: '#1d4ed8', border: '#93c5fd' },
  PACKING: { bg: '#fef3c7', text: '#92400e', border: '#fcd34d' },
  READY_TO_DISPATCH: { bg: '#e0e7ff', text: '#4338ca', border: '#a5b4fc' },
  IN_TRANSIT: { bg: '#ede9fe', text: '#6d28d9', border: '#c4b5fd' },
  DELAYED: { bg: '#fee2e2', text: '#991b1b', border: '#fca5a5' },
  RETURNED: { bg: '#fee2e2', text: '#991b1b', border: '#fca5a5' },
  DAMAGED: { bg: '#fee2e2', text: '#991b1b', border: '#fca5a5' },

  // Dose statuses
  CREATED: { bg: '#f1f5f9', text: '#475569', border: '#e2e8f0' },
  ASSIGNED: { bg: '#dbeafe', text: '#1d4ed8', border: '#93c5fd' },
  SHIPPED: { bg: '#ede9fe', text: '#6d28d9', border: '#c4b5fd' },
  ADMINISTERED: { bg: '#dcfce7', text: '#166534', border: '#86efac' },
  WASTED: { bg: '#fee2e2', text: '#991b1b', border: '#fca5a5' },

  // Purchase Order statuses
  SENT: { bg: '#dbeafe', text: '#1d4ed8', border: '#93c5fd' },
  ACKNOWLEDGED: { bg: '#cffafe', text: '#0e7490', border: '#67e8f9' },
  PARTIALLY_RECEIVED: { bg: '#fef3c7', text: '#92400e', border: '#fcd34d' },
  RECEIVED: { bg: '#dcfce7', text: '#166534', border: '#86efac' },

  // Recipe statuses
  PENDING_ACTIVATION: { bg: '#fef3c7', text: '#92400e', border: '#fcd34d' },
  SUPERSEDED: { bg: '#e0e7ff', text: '#4338ca', border: '#a5b4fc' },

  // Investigation statuses
  OPEN: { bg: '#fee2e2', text: '#991b1b', border: '#fca5a5' },
  UNDER_INVESTIGATION: { bg: '#fef3c7', text: '#92400e', border: '#fcd34d' },
  CAPA_PROPOSED: { bg: '#dbeafe', text: '#1d4ed8', border: '#93c5fd' },
  CAPA_APPROVED: { bg: '#d1fae5', text: '#047857', border: '#6ee7b7' },
  IMPLEMENTING: { bg: '#cffafe', text: '#0e7490', border: '#67e8f9' },
  CLOSED_CONFIRMED: { bg: '#dcfce7', text: '#166534', border: '#86efac' },
  CLOSED_INVALIDATED: { bg: '#fee2e2', text: '#991b1b', border: '#fca5a5' },
  CLOSED_INCONCLUSIVE: { bg: '#e0e7ff', text: '#4338ca', border: '#a5b4fc' },

  // Payment statuses
  SUBMITTED_FOR_PAYMENT: { bg: '#dbeafe', text: '#1d4ed8', border: '#93c5fd' },
  PAID: { bg: '#dcfce7', text: '#166534', border: '#86efac' },
  PARTIALLY_PAID: { bg: '#fef3c7', text: '#92400e', border: '#fcd34d' },
  OVERDUE: { bg: '#fee2e2', text: '#991b1b', border: '#fca5a5' },

  // Stock statuses
  AVAILABLE: { bg: '#dcfce7', text: '#166534', border: '#86efac' },
  QUARANTINE: { bg: '#fef3c7', text: '#92400e', border: '#fcd34d' },
  RESERVED: { bg: '#dbeafe', text: '#1d4ed8', border: '#93c5fd' },
};

export function getStatusColor(status: string): StatusColorConfig {
  return statusColors[status] || { bg: '#f1f5f9', text: '#475569', border: '#e2e8f0' };
}

export function getStatusBgColor(status: string): string {
  return getStatusColor(status).bg;
}

export function getStatusTextColor(status: string): string {
  return getStatusColor(status).text;
}

export default statusColors;
