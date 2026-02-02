import React from 'react';

interface StatusBadgeProps {
  status: string;
  size?: 'sm' | 'md' | 'lg';
  showDot?: boolean;
}

const statusColorMap: Record<string, string> = {
  // Order statuses
  DRAFT: 'default',
  SUBMITTED: 'info',
  VALIDATED: 'info',
  SCHEDULED: 'secondary',
  IN_PRODUCTION: 'info',
  QC_PENDING: 'warning',
  QC_IN_PROGRESS: 'warning',
  QC_PASSED: 'qc-passed',
  QP_REVIEW: 'qp-passed',
  RELEASED: 'released',
  DISPATCHED: 'info',
  DELIVERED: 'success',
  CANCELLED: 'danger',
  REJECTED: 'danger',
  FAILED_QC: 'danger',
  REWORK: 'warning',
  // Batch statuses
  PLANNED: 'default',
  PRODUCTION_COMPLETE: 'info',
  DISPENSING_IN_PROGRESS: 'teal',
  DISPENSED: 'teal',
  PACKED: 'info',
  CLOSED: 'closed',
  ON_HOLD: 'warning',
  DEVIATION_OPEN: 'warning',
  // Shipment statuses
  PENDING: 'default',
  READY_TO_PACK: 'info',
  PACKING: 'warning',
  READY_TO_DISPATCH: 'info',
  IN_TRANSIT: 'purple',
  DELAYED: 'danger',
  RETURNED: 'danger',
  DAMAGED: 'danger',
  // Dose statuses
  CREATED: 'default',
  ASSIGNED: 'info',
  SHIPPED: 'purple',
  ADMINISTERED: 'success',
  WASTED: 'danger',
  // Generic
  ACTIVE: 'success',
  INACTIVE: 'default',
  EXPIRED: 'danger',
  APPROVED: 'success',
  PENDING_APPROVAL: 'warning',
};

const sizeStyles = {
  sm: { padding: '0.125rem 0.5rem', fontSize: '0.625rem' },
  md: { padding: '0.25rem 0.75rem', fontSize: '0.75rem' },
  lg: { padding: '0.375rem 1rem', fontSize: '0.875rem' },
};

export function StatusBadge({ status, size = 'md', showDot = false }: StatusBadgeProps) {
  const colorClass = statusColorMap[status] || 'default';
  const displayStatus = status.replace(/_/g, ' ');
  const sizeStyle = sizeStyles[size];

  return (
    <span 
      className={`badge badge-${colorClass}`}
      style={{ 
        ...sizeStyle,
        display: 'inline-flex',
        alignItems: 'center',
        gap: '0.375rem',
      }}
    >
      {showDot && (
        <span style={{
          width: '6px',
          height: '6px',
          borderRadius: '50%',
          backgroundColor: 'currentColor',
        }} />
      )}
      {displayStatus}
    </span>
  );
}

export default StatusBadge;
