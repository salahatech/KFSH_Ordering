import { useQuery } from '@tanstack/react-query';
import api from '../lib/api';
import { CheckCircle, Clock, XCircle, AlertCircle } from 'lucide-react';
import { format } from 'date-fns';

interface ApprovalStatusProps {
  entityType: string;
  entityId: string;
  compact?: boolean;
}

interface ApprovalHistory {
  id: string;
  status: string;
  currentStep: number;
  priority: string;
  createdAt: string;
  workflow: {
    name: string;
    steps: Array<{
      stepOrder: number;
      stepName: string;
    }>;
  };
  actions: Array<{
    action: string;
    comments?: string;
    createdAt: string;
    actionBy: { firstName: string; lastName: string };
    step: { stepName: string };
  }>;
}

export default function ApprovalStatus({ entityType, entityId, compact = false }: ApprovalStatusProps) {
  const { data: history, isLoading } = useQuery({
    queryKey: ['approvalHistory', entityType, entityId],
    queryFn: async () => {
      const { data } = await api.get(`/approvals/history/${entityType}/${entityId}`);
      return data as ApprovalHistory[];
    },
    enabled: !!entityId,
  });

  if (isLoading) {
    return <span style={{ color: '#9ca3af', fontSize: '0.875rem' }}>Loading...</span>;
  }

  if (!history || history.length === 0) {
    return compact ? null : (
      <div style={{ color: '#9ca3af', fontSize: '0.875rem', fontStyle: 'italic' }}>
        No approval workflow active
      </div>
    );
  }

  const latestRequest = history[0];

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'PENDING':
        return <Clock size={16} color="#f59e0b" />;
      case 'APPROVED':
        return <CheckCircle size={16} color="#22c55e" />;
      case 'REJECTED':
        return <XCircle size={16} color="#ef4444" />;
      default:
        return <AlertCircle size={16} color="#6b7280" />;
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'PENDING':
        return 'Pending Approval';
      case 'APPROVED':
        return 'Approved';
      case 'REJECTED':
        return 'Rejected';
      default:
        return status;
    }
  };

  if (compact) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
        {getStatusIcon(latestRequest.status)}
        <span style={{ fontSize: '0.875rem', color: '#374151' }}>
          {getStatusLabel(latestRequest.status)}
        </span>
      </div>
    );
  }

  const currentStepInfo = latestRequest.workflow.steps.find(
    s => s.stepOrder === latestRequest.currentStep
  );

  return (
    <div style={{ 
      padding: '0.75rem', 
      background: '#f9fafb', 
      borderRadius: '8px',
      border: '1px solid #e5e7eb',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
        {getStatusIcon(latestRequest.status)}
        <span style={{ fontWeight: 500 }}>{latestRequest.workflow.name}</span>
        <span 
          className="badge" 
          style={{ 
            marginLeft: 'auto',
            background: latestRequest.status === 'PENDING' ? '#fef3c7' : 
                        latestRequest.status === 'APPROVED' ? '#dcfce7' : '#fee2e2',
            color: latestRequest.status === 'PENDING' ? '#92400e' : 
                   latestRequest.status === 'APPROVED' ? '#166534' : '#991b1b',
          }}
        >
          {getStatusLabel(latestRequest.status)}
        </span>
      </div>

      {latestRequest.status === 'PENDING' && currentStepInfo && (
        <div style={{ fontSize: '0.875rem', color: '#6b7280', marginBottom: '0.5rem' }}>
          Awaiting: <strong>{currentStepInfo.stepName}</strong>
        </div>
      )}

      <div style={{ display: 'flex', gap: '0.25rem', marginBottom: '0.5rem' }}>
        {latestRequest.workflow.steps.map((step) => (
          <div
            key={step.stepOrder}
            style={{
              flex: 1,
              height: '4px',
              borderRadius: '2px',
              background: step.stepOrder < latestRequest.currentStep ? '#22c55e' :
                         step.stepOrder === latestRequest.currentStep ? '#f59e0b' : '#e5e7eb',
            }}
            title={step.stepName}
          />
        ))}
      </div>

      {latestRequest.actions.length > 0 && (
        <div style={{ fontSize: '0.75rem', color: '#6b7280' }}>
          Last action: {latestRequest.actions[latestRequest.actions.length - 1].step.stepName} 
          {' '}by {latestRequest.actions[latestRequest.actions.length - 1].actionBy.firstName}
          {' '}on {format(new Date(latestRequest.actions[latestRequest.actions.length - 1].createdAt), 'MMM d, HH:mm')}
        </div>
      )}
    </div>
  );
}
