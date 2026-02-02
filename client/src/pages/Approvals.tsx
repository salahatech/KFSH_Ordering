import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../lib/api';
import { format } from 'date-fns';
import {
  CheckCircle,
  XCircle,
  Clock,
  FileCheck,
  ChevronDown,
  ChevronRight,
  Send,
  Inbox,
  Filter,
  Eye,
} from 'lucide-react';
import { KpiCard, StatusBadge, FilterBar, EmptyState, type FilterWidget } from '../components/shared';
import { useToast } from '../components/ui/Toast';

interface ApprovalRequest {
  id: string;
  entityType: string;
  entityId: string;
  status: string;
  priority: string;
  currentStep: number;
  notes?: string;
  createdAt: string;
  workflow: {
    name: string;
    steps: Array<{
      id: string;
      stepOrder: number;
      stepName: string;
      approverRole: { name: string };
    }>;
  };
  requestedBy: {
    firstName: string;
    lastName: string;
    email: string;
  };
  actions: Array<{
    id: string;
    action: string;
    comments?: string;
    signature?: string;
    createdAt: string;
    actionBy: { firstName: string; lastName: string };
    step: { stepName: string };
  }>;
}

export default function Approvals() {
  const queryClient = useQueryClient();
  const toast = useToast();
  const [expandedRequest, setExpandedRequest] = useState<string | null>(null);
  const [filter, setFilter] = useState<'PENDING' | 'APPROVED' | 'REJECTED' | 'all'>('PENDING');
  const [searchFilters, setSearchFilters] = useState<Record<string, any>>({});
  const [actionModal, setActionModal] = useState<{
    requestId: string;
    action: 'APPROVED' | 'REJECTED';
    workflowName: string;
  } | null>(null);
  const [comments, setComments] = useState('');
  const [signature, setSignature] = useState('');

  const { data: pendingApprovals = [], isLoading: loadingPending } = useQuery({
    queryKey: ['approvals', 'pending'],
    queryFn: async () => {
      const { data } = await api.get('/approvals/pending');
      return data as ApprovalRequest[];
    },
  });

  const { data: allRequests = [], isLoading: loadingAll } = useQuery({
    queryKey: ['approvals', 'requests', filter],
    queryFn: async () => {
      const params = filter !== 'all' ? `?status=${filter}` : '';
      const { data } = await api.get(`/approvals/requests${params}`);
      return data as ApprovalRequest[];
    },
  });

  const processActionMutation = useMutation({
    mutationFn: async ({
      requestId,
      action,
      comments,
      signature,
    }: {
      requestId: string;
      action: string;
      comments?: string;
      signature?: string;
    }) => {
      const { data } = await api.post(`/approvals/${requestId}/action`, {
        action,
        comments,
        signature,
      });
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['approvals'] });
      setActionModal(null);
      setComments('');
      setSignature('');
      if (variables.action === 'APPROVED') {
        toast.success('Request Approved', 'The approval request has been approved successfully');
      } else {
        toast.warning('Request Rejected', 'The approval request has been rejected');
      }
    },
    onError: (error: any) => {
      toast.error('Action Failed', error.response?.data?.error || 'Failed to process approval action');
    },
  });

  const getPriorityColor = (priority: string): 'danger' | 'warning' | 'info' | 'default' => {
    switch (priority) {
      case 'URGENT': return 'danger';
      case 'HIGH': return 'warning';
      case 'NORMAL': return 'info';
      default: return 'default';
    }
  };

  const handleAction = (requestId: string, action: 'APPROVED' | 'REJECTED', workflowName: string) => {
    setActionModal({ requestId, action, workflowName });
  };

  const submitAction = () => {
    if (!actionModal) return;
    processActionMutation.mutate({
      requestId: actionModal.requestId,
      action: actionModal.action,
      comments: comments || undefined,
      signature: signature || undefined,
    });
  };

  const filterWidgets: FilterWidget[] = [
    { key: 'search', label: 'Search', type: 'search', placeholder: 'Search workflows...' },
  ];

  const filteredPending = pendingApprovals.filter((req) => {
    if (searchFilters.search) {
      const q = searchFilters.search.toLowerCase();
      if (!req.workflow.name.toLowerCase().includes(q) &&
          !req.entityType.toLowerCase().includes(q) &&
          !`${req.requestedBy.firstName} ${req.requestedBy.lastName}`.toLowerCase().includes(q)) {
        return false;
      }
    }
    return true;
  });

  const filteredAll = allRequests.filter((req) => {
    if (searchFilters.search) {
      const q = searchFilters.search.toLowerCase();
      if (!req.workflow.name.toLowerCase().includes(q) &&
          !req.entityType.toLowerCase().includes(q)) {
        return false;
      }
    }
    return true;
  });

  const stats = {
    pending: pendingApprovals.length,
    approved: allRequests.filter(r => r.status === 'APPROVED').length,
    rejected: allRequests.filter(r => r.status === 'REJECTED').length,
    urgent: pendingApprovals.filter(r => r.priority === 'URGENT').length,
  };

  if (loadingPending || loadingAll) {
    return (
      <div className="loading-overlay">
        <div className="spinner" />
      </div>
    );
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.5rem' }}>
        <div>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 600, marginBottom: '0.25rem' }}>Approval Inbox</h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', margin: 0 }}>
            Review and process pending approval requests
          </p>
        </div>
      </div>

      <div className="grid" style={{ gridTemplateColumns: 'repeat(4, 1fr)', gap: '1rem', marginBottom: '1.5rem' }}>
        <KpiCard 
          title="Pending Approvals" 
          value={stats.pending} 
          icon={<Clock size={20} />}
          color="warning"
        />
        <KpiCard 
          title="Urgent" 
          value={stats.urgent} 
          icon={<FileCheck size={20} />}
          color="danger"
        />
        <KpiCard 
          title="Approved" 
          value={stats.approved} 
          icon={<CheckCircle size={20} />}
          color="success"
        />
        <KpiCard 
          title="Rejected" 
          value={stats.rejected} 
          icon={<XCircle size={20} />}
          color="default"
        />
      </div>

      <div className="card" style={{ marginBottom: '1rem', padding: '1rem' }}>
        <FilterBar 
          widgets={filterWidgets}
          values={searchFilters}
          onChange={(key, value) => setSearchFilters(prev => ({ ...prev, [key]: value }))}
          onReset={() => setSearchFilters({})}
        />
      </div>

      {filteredPending.length > 0 && (
        <div className="card" style={{ marginBottom: '1.5rem' }}>
          <div style={{ padding: '1rem 1.5rem', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Inbox size={18} style={{ color: 'var(--warning)' }} />
            <h3 style={{ fontWeight: 600, fontSize: '1rem', margin: 0 }}>
              Awaiting Your Approval ({filteredPending.length})
            </h3>
          </div>
          <div style={{ padding: 0 }}>
            <table className="table" style={{ marginBottom: 0 }}>
              <thead>
                <tr>
                  <th style={{ width: '40px' }}></th>
                  <th>Workflow</th>
                  <th>Entity</th>
                  <th>Priority</th>
                  <th>Current Step</th>
                  <th>Requested By</th>
                  <th>Date</th>
                  <th style={{ width: '200px', textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredPending.map((request) => (
                  <>
                    <tr key={request.id}>
                      <td>
                        <button
                          className="btn btn-sm btn-outline"
                          style={{ padding: '0.25rem' }}
                          onClick={() => setExpandedRequest(expandedRequest === request.id ? null : request.id)}
                        >
                          {expandedRequest === request.id ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                        </button>
                      </td>
                      <td>
                        <div style={{ fontWeight: 500 }}>{request.workflow.name}</div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{request.entityType}</div>
                      </td>
                      <td style={{ fontFamily: 'monospace', fontSize: '0.8125rem' }}>
                        {request.entityId.slice(0, 8)}...
                      </td>
                      <td>
                        <StatusBadge status={request.priority} size="sm" />
                      </td>
                      <td>
                        {request.workflow.steps.find(s => s.stepOrder === request.currentStep)?.stepName || 'Unknown'}
                      </td>
                      <td>
                        {request.requestedBy.firstName} {request.requestedBy.lastName}
                      </td>
                      <td style={{ fontSize: '0.8125rem', color: 'var(--text-muted)' }}>
                        {format(new Date(request.createdAt), 'MMM d, HH:mm')}
                      </td>
                      <td>
                        <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
                          <button
                            className="btn btn-sm btn-outline"
                            onClick={() => setExpandedRequest(expandedRequest === request.id ? null : request.id)}
                            title="View Details"
                          >
                            <Eye size={14} />
                          </button>
                          <button
                            className="btn btn-sm btn-primary"
                            onClick={() => handleAction(request.id, 'APPROVED', request.workflow.name)}
                            style={{ minWidth: '80px' }}
                          >
                            <CheckCircle size={14} />
                            Approve
                          </button>
                          <button
                            className="btn btn-sm btn-danger"
                            onClick={() => handleAction(request.id, 'REJECTED', request.workflow.name)}
                            style={{ minWidth: '70px' }}
                          >
                            <XCircle size={14} />
                            Reject
                          </button>
                        </div>
                      </td>
                    </tr>
                    {expandedRequest === request.id && (
                      <tr key={`${request.id}-details`}>
                        <td colSpan={8} style={{ background: 'var(--bg-secondary)', padding: '1.5rem' }}>
                          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
                            <div>
                              <h4 style={{ marginBottom: '0.75rem', fontSize: '0.875rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-muted)' }}>Workflow Steps</h4>
                              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                                {request.workflow.steps.map((step) => (
                                  <div
                                    key={step.id}
                                    style={{
                                      display: 'flex',
                                      alignItems: 'center',
                                      gap: '0.75rem',
                                      padding: '0.75rem',
                                      background: step.stepOrder === request.currentStep ? 'rgba(59, 130, 246, 0.1)' : 'var(--bg)',
                                      borderRadius: 'var(--radius)',
                                      border: step.stepOrder === request.currentStep ? '1px solid var(--primary)' : '1px solid var(--border)',
                                    }}
                                  >
                                    {step.stepOrder < request.currentStep ? (
                                      <CheckCircle size={18} color="var(--success)" />
                                    ) : step.stepOrder === request.currentStep ? (
                                      <Clock size={18} color="var(--primary)" />
                                    ) : (
                                      <div style={{ width: 18, height: 18, borderRadius: '50%', border: '2px solid var(--border)' }} />
                                    )}
                                    <span style={{ fontWeight: step.stepOrder === request.currentStep ? 500 : 400, flex: 1 }}>
                                      {step.stepOrder}. {step.stepName}
                                    </span>
                                    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                                      {step.approverRole.name}
                                    </span>
                                  </div>
                                ))}
                              </div>
                            </div>
                            <div>
                              <h4 style={{ marginBottom: '0.75rem', fontSize: '0.875rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-muted)' }}>Approval History</h4>
                              {request.actions.length === 0 ? (
                                <div style={{ color: 'var(--text-muted)', fontStyle: 'italic', padding: '1rem', background: 'var(--bg)', borderRadius: 'var(--radius)', border: '1px solid var(--border)' }}>
                                  No actions taken yet
                                </div>
                              ) : (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                                  {request.actions.map((action) => (
                                    <div
                                      key={action.id}
                                      style={{
                                        padding: '0.75rem',
                                        background: 'var(--bg)',
                                        borderRadius: 'var(--radius)',
                                        border: '1px solid var(--border)',
                                      }}
                                    >
                                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                        {action.action === 'APPROVED' ? (
                                          <CheckCircle size={16} color="var(--success)" />
                                        ) : (
                                          <XCircle size={16} color="var(--danger)" />
                                        )}
                                        <span style={{ fontWeight: 500 }}>{action.step.stepName}</span>
                                        <span style={{ marginLeft: 'auto', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                                          {format(new Date(action.createdAt), 'MMM d, HH:mm')}
                                        </span>
                                      </div>
                                      <div style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)', marginTop: '0.25rem' }}>
                                        by {action.actionBy.firstName} {action.actionBy.lastName}
                                      </div>
                                      {action.comments && (
                                        <div style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', marginTop: '0.5rem', fontStyle: 'italic', paddingLeft: '1.5rem' }}>
                                          "{action.comments}"
                                        </div>
                                      )}
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>
                          </div>
                          {request.notes && (
                            <div style={{ marginTop: '1rem', padding: '0.75rem', background: 'var(--bg)', borderRadius: 'var(--radius)', border: '1px solid var(--border)' }}>
                              <strong style={{ fontSize: '0.8125rem' }}>Notes:</strong>
                              <span style={{ marginLeft: '0.5rem', color: 'var(--text-secondary)' }}>{request.notes}</span>
                            </div>
                          )}
                        </td>
                      </tr>
                    )}
                  </>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <div className="card">
        <div style={{ padding: '1rem 1.5rem', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Filter size={18} style={{ color: 'var(--text-muted)' }} />
            <h3 style={{ fontWeight: 600, fontSize: '1rem', margin: 0 }}>All Approval Requests</h3>
          </div>
          <div style={{ display: 'flex', gap: '0.25rem' }}>
            {(['PENDING', 'APPROVED', 'REJECTED', 'all'] as const).map((f) => (
              <button
                key={f}
                className={`btn btn-sm ${filter === f ? 'btn-primary' : 'btn-outline'}`}
                onClick={() => setFilter(f)}
              >
                {f === 'PENDING' && <Clock size={14} />}
                {f === 'APPROVED' && <CheckCircle size={14} />}
                {f === 'REJECTED' && <XCircle size={14} />}
                {f === 'all' ? 'All' : f.charAt(0) + f.slice(1).toLowerCase()}
              </button>
            ))}
          </div>
        </div>
        <div style={{ padding: 0 }}>
          {filteredAll.length > 0 ? (
            <table className="table" style={{ marginBottom: 0 }}>
              <thead>
                <tr>
                  <th>Workflow</th>
                  <th>Entity Type</th>
                  <th>Status</th>
                  <th>Priority</th>
                  <th>Current Step</th>
                  <th>Requested By</th>
                  <th>Date</th>
                </tr>
              </thead>
              <tbody>
                {filteredAll.map((request) => (
                  <tr key={request.id}>
                    <td style={{ fontWeight: 500 }}>{request.workflow.name}</td>
                    <td>{request.entityType}</td>
                    <td><StatusBadge status={request.status} size="sm" /></td>
                    <td><StatusBadge status={request.priority} size="sm" /></td>
                    <td>
                      {request.workflow.steps.find(s => s.stepOrder === request.currentStep)?.stepName || '-'}
                    </td>
                    <td>
                      {request.requestedBy.firstName} {request.requestedBy.lastName}
                    </td>
                    <td style={{ fontSize: '0.8125rem', color: 'var(--text-muted)' }}>
                      {format(new Date(request.createdAt), 'MMM d, yyyy HH:mm')}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <div style={{ padding: '2rem' }}>
              <EmptyState 
                title="No approval requests"
                message={`No ${filter === 'all' ? '' : filter.toLowerCase()} approval requests found`}
                icon="package"
                variant="compact"
              />
            </div>
          )}
        </div>
      </div>

      {actionModal && (
        <div className="modal-overlay" onClick={() => setActionModal(null)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3 style={{ margin: 0, fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                {actionModal.action === 'APPROVED' ? (
                  <>
                    <CheckCircle color="var(--success)" size={20} /> Approve Request
                  </>
                ) : (
                  <>
                    <XCircle color="var(--danger)" size={20} /> Reject Request
                  </>
                )}
              </h3>
              <button onClick={() => setActionModal(null)} style={{ background: 'var(--bg-secondary)', border: 'none', borderRadius: 'var(--radius)', padding: '0.375rem', cursor: 'pointer', fontSize: '1.25rem', lineHeight: 1 }}>&times;</button>
            </div>
            <div className="modal-body">
              <div
                style={{
                  padding: '1rem',
                  background: actionModal.action === 'APPROVED' ? 'rgba(34, 197, 94, 0.1)' : 'rgba(239, 68, 68, 0.1)',
                  borderRadius: 'var(--radius)',
                  marginBottom: '1rem',
                  border: actionModal.action === 'APPROVED' ? '1px solid rgba(34, 197, 94, 0.3)' : '1px solid rgba(239, 68, 68, 0.3)',
                }}
              >
                <p style={{ margin: 0, fontSize: '0.875rem' }}>
                  You are about to <strong>{actionModal.action === 'APPROVED' ? 'approve' : 'reject'}</strong> the request for <strong>{actionModal.workflowName}</strong>.
                </p>
              </div>

              <div className="form-group">
                <label className="form-label">Comments {actionModal.action === 'REJECTED' ? '*' : '(optional)'}</label>
                <textarea
                  className="form-input"
                  value={comments}
                  onChange={(e) => setComments(e.target.value)}
                  placeholder={actionModal.action === 'REJECTED' ? 'Please provide a reason for rejection...' : 'Add any comments or notes...'}
                  rows={3}
                  required={actionModal.action === 'REJECTED'}
                />
              </div>
              <div className="form-group">
                <label className="form-label">Electronic Signature *</label>
                <input
                  type="text"
                  className="form-input"
                  value={signature}
                  onChange={(e) => setSignature(e.target.value)}
                  placeholder="Type your full name to sign"
                />
                <small style={{ color: 'var(--text-muted)', display: 'block', marginTop: '0.5rem', fontSize: '0.75rem' }}>
                  By signing, you confirm this action is in compliance with GMP requirements.
                </small>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setActionModal(null)}>
                Cancel
              </button>
              <button
                className={`btn ${actionModal.action === 'APPROVED' ? 'btn-primary' : 'btn-danger'}`}
                onClick={submitAction}
                disabled={processActionMutation.isPending || !signature.trim() || (actionModal.action === 'REJECTED' && !comments.trim())}
                style={{ minWidth: '140px' }}
              >
                <Send size={16} />
                {processActionMutation.isPending ? 'Processing...' : `Confirm ${actionModal.action === 'APPROVED' ? 'Approval' : 'Rejection'}`}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
