import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../lib/api';
import { format } from 'date-fns';
import {
  CheckCircle,
  XCircle,
  Clock,
  AlertCircle,
  FileCheck,
  ChevronDown,
  ChevronRight,
  Send,
} from 'lucide-react';

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
  const [expandedRequest, setExpandedRequest] = useState<string | null>(null);
  const [filter, setFilter] = useState<'PENDING' | 'APPROVED' | 'REJECTED' | 'all'>('PENDING');
  const [actionModal, setActionModal] = useState<{
    requestId: string;
    action: 'APPROVED' | 'REJECTED';
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
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['approvals'] });
      setActionModal(null);
      setComments('');
      setSignature('');
    },
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'PENDING':
        return <span className="badge" style={{ background: '#fef3c7', color: '#92400e' }}>Pending</span>;
      case 'APPROVED':
        return <span className="badge" style={{ background: '#dcfce7', color: '#166534' }}>Approved</span>;
      case 'REJECTED':
        return <span className="badge" style={{ background: '#fee2e2', color: '#991b1b' }}>Rejected</span>;
      default:
        return <span className="badge">{status}</span>;
    }
  };

  const getPriorityBadge = (priority: string) => {
    switch (priority) {
      case 'URGENT':
        return <span className="badge" style={{ background: '#fee2e2', color: '#991b1b' }}>Urgent</span>;
      case 'HIGH':
        return <span className="badge" style={{ background: '#fed7aa', color: '#9a3412' }}>High</span>;
      case 'NORMAL':
        return <span className="badge" style={{ background: '#e0e7ff', color: '#3730a3' }}>Normal</span>;
      case 'LOW':
        return <span className="badge" style={{ background: '#f3f4f6', color: '#374151' }}>Low</span>;
      default:
        return <span className="badge">{priority}</span>;
    }
  };

  const handleAction = (requestId: string, action: 'APPROVED' | 'REJECTED') => {
    setActionModal({ requestId, action });
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

  if (loadingPending || loadingAll) {
    return (
      <div className="loading-overlay">
        <div className="spinner" />
      </div>
    );
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <h1 style={{ margin: 0 }}>Approval Inbox</h1>
      </div>

      <div className="card" style={{ marginBottom: '1.5rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div style={{
            width: '3rem',
            height: '3rem',
            background: '#dbeafe',
            borderRadius: '12px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}>
            <FileCheck size={24} color="#2563eb" />
          </div>
          <div>
            <div style={{ fontSize: '2rem', fontWeight: 'bold', color: '#2563eb' }}>
              {pendingApprovals.length}
            </div>
            <div style={{ color: '#6b7280' }}>Pending Approvals Requiring Your Action</div>
          </div>
        </div>
      </div>

      {pendingApprovals.length > 0 && (
        <div style={{ marginBottom: '2rem' }}>
          <h2 style={{ marginBottom: '1rem' }}>Awaiting Your Approval</h2>
          <div className="table-container">
            <table>
              <thead>
                <tr>
                  <th></th>
                  <th>Workflow</th>
                  <th>Entity</th>
                  <th>Priority</th>
                  <th>Current Step</th>
                  <th>Requested By</th>
                  <th>Date</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {pendingApprovals.map((request) => (
                  <>
                    <tr key={request.id}>
                      <td>
                        <button
                          className="btn-ghost"
                          onClick={() => setExpandedRequest(expandedRequest === request.id ? null : request.id)}
                        >
                          {expandedRequest === request.id ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                        </button>
                      </td>
                      <td>
                        <div style={{ fontWeight: 500 }}>{request.workflow.name}</div>
                        <div style={{ fontSize: '0.75rem', color: '#6b7280' }}>{request.entityType}</div>
                      </td>
                      <td style={{ fontFamily: 'monospace', fontSize: '0.875rem' }}>
                        {request.entityId.slice(0, 8)}...
                      </td>
                      <td>{getPriorityBadge(request.priority)}</td>
                      <td>
                        {request.workflow.steps.find(s => s.stepOrder === request.currentStep)?.stepName || 'Unknown'}
                      </td>
                      <td>
                        {request.requestedBy.firstName} {request.requestedBy.lastName}
                      </td>
                      <td>{format(new Date(request.createdAt), 'MMM d, HH:mm')}</td>
                      <td>
                        <div style={{ display: 'flex', gap: '0.5rem' }}>
                          <button
                            className="btn-primary"
                            style={{ padding: '0.25rem 0.75rem', fontSize: '0.875rem' }}
                            onClick={() => handleAction(request.id, 'APPROVED')}
                          >
                            <CheckCircle size={14} style={{ marginRight: '0.25rem' }} />
                            Approve
                          </button>
                          <button
                            className="btn-secondary"
                            style={{ padding: '0.25rem 0.75rem', fontSize: '0.875rem' }}
                            onClick={() => handleAction(request.id, 'REJECTED')}
                          >
                            <XCircle size={14} style={{ marginRight: '0.25rem' }} />
                            Reject
                          </button>
                        </div>
                      </td>
                    </tr>
                    {expandedRequest === request.id && (
                      <tr key={`${request.id}-details`}>
                        <td colSpan={8} style={{ background: '#f9fafb', padding: '1rem' }}>
                          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                            <div>
                              <h4 style={{ marginBottom: '0.5rem' }}>Workflow Steps</h4>
                              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                                {request.workflow.steps.map((step) => (
                                  <div
                                    key={step.id}
                                    style={{
                                      display: 'flex',
                                      alignItems: 'center',
                                      gap: '0.5rem',
                                      padding: '0.5rem',
                                      background: step.stepOrder === request.currentStep ? '#dbeafe' : '#fff',
                                      borderRadius: '4px',
                                      border: '1px solid #e5e7eb',
                                    }}
                                  >
                                    {step.stepOrder < request.currentStep ? (
                                      <CheckCircle size={16} color="#22c55e" />
                                    ) : step.stepOrder === request.currentStep ? (
                                      <Clock size={16} color="#2563eb" />
                                    ) : (
                                      <div style={{ width: 16, height: 16, borderRadius: '50%', border: '2px solid #d1d5db' }} />
                                    )}
                                    <span style={{ fontWeight: step.stepOrder === request.currentStep ? 500 : 400 }}>
                                      {step.stepOrder}. {step.stepName}
                                    </span>
                                    <span style={{ marginLeft: 'auto', fontSize: '0.75rem', color: '#6b7280' }}>
                                      {step.approverRole.name}
                                    </span>
                                  </div>
                                ))}
                              </div>
                            </div>
                            <div>
                              <h4 style={{ marginBottom: '0.5rem' }}>Approval History</h4>
                              {request.actions.length === 0 ? (
                                <div style={{ color: '#6b7280', fontStyle: 'italic' }}>No actions yet</div>
                              ) : (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                                  {request.actions.map((action) => (
                                    <div
                                      key={action.id}
                                      style={{
                                        padding: '0.5rem',
                                        background: '#fff',
                                        borderRadius: '4px',
                                        border: '1px solid #e5e7eb',
                                      }}
                                    >
                                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                        {action.action === 'APPROVED' ? (
                                          <CheckCircle size={14} color="#22c55e" />
                                        ) : (
                                          <XCircle size={14} color="#ef4444" />
                                        )}
                                        <span style={{ fontWeight: 500 }}>{action.step.stepName}</span>
                                        <span style={{ marginLeft: 'auto', fontSize: '0.75rem', color: '#6b7280' }}>
                                          {format(new Date(action.createdAt), 'MMM d, HH:mm')}
                                        </span>
                                      </div>
                                      <div style={{ fontSize: '0.875rem', color: '#374151', marginTop: '0.25rem' }}>
                                        by {action.actionBy.firstName} {action.actionBy.lastName}
                                      </div>
                                      {action.comments && (
                                        <div style={{ fontSize: '0.875rem', color: '#6b7280', marginTop: '0.25rem', fontStyle: 'italic' }}>
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
                            <div style={{ marginTop: '1rem' }}>
                              <strong>Notes:</strong> {request.notes}
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

      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
          <h2 style={{ margin: 0 }}>All Approval Requests</h2>
          <div className="btn-group">
            <button
              className={filter === 'PENDING' ? 'btn-primary' : 'btn-secondary'}
              onClick={() => setFilter('PENDING')}
            >
              <Clock size={14} /> Pending
            </button>
            <button
              className={filter === 'APPROVED' ? 'btn-primary' : 'btn-secondary'}
              onClick={() => setFilter('APPROVED')}
            >
              <CheckCircle size={14} /> Approved
            </button>
            <button
              className={filter === 'REJECTED' ? 'btn-primary' : 'btn-secondary'}
              onClick={() => setFilter('REJECTED')}
            >
              <XCircle size={14} /> Rejected
            </button>
            <button
              className={filter === 'all' ? 'btn-primary' : 'btn-secondary'}
              onClick={() => setFilter('all')}
            >
              All
            </button>
          </div>
        </div>

        <div className="table-container">
          <table>
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
              {allRequests.length === 0 ? (
                <tr>
                  <td colSpan={7} style={{ textAlign: 'center', color: '#6b7280', padding: '2rem' }}>
                    No approval requests found
                  </td>
                </tr>
              ) : (
                allRequests.map((request) => (
                  <tr key={request.id}>
                    <td>{request.workflow.name}</td>
                    <td>{request.entityType}</td>
                    <td>{getStatusBadge(request.status)}</td>
                    <td>{getPriorityBadge(request.priority)}</td>
                    <td>
                      {request.workflow.steps.find(s => s.stepOrder === request.currentStep)?.stepName || '-'}
                    </td>
                    <td>
                      {request.requestedBy.firstName} {request.requestedBy.lastName}
                    </td>
                    <td>{format(new Date(request.createdAt), 'MMM d, yyyy HH:mm')}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {actionModal && (
        <div className="modal-overlay" onClick={() => setActionModal(null)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3 style={{ margin: 0, fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                {actionModal.action === 'APPROVED' ? (
                  <>
                    <CheckCircle color="#22c55e" size={20} /> Approve Request
                  </>
                ) : (
                  <>
                    <XCircle color="#ef4444" size={20} /> Reject Request
                  </>
                )}
              </h3>
              <button onClick={() => setActionModal(null)} style={{ background: 'var(--bg-secondary)', border: 'none', borderRadius: 'var(--radius)', padding: '0.375rem', cursor: 'pointer', fontSize: '1.25rem', lineHeight: 1 }}>&times;</button>
            </div>
            <div className="modal-body">
              <div className="form-group">
                <label className="form-label">Comments (optional)</label>
                <textarea
                  className="form-input"
                  value={comments}
                  onChange={(e) => setComments(e.target.value)}
                  placeholder="Add any comments or notes..."
                  rows={3}
                />
              </div>
              <div className="form-group">
                <label className="form-label">Electronic Signature</label>
                <input
                  type="text"
                  className="form-input"
                  value={signature}
                  onChange={(e) => setSignature(e.target.value)}
                  placeholder="Type your name to sign"
                />
                <small style={{ color: 'var(--text-muted)', display: 'block', marginTop: '0.25rem' }}>
                  By signing, you confirm this action is in compliance with GMP requirements.
                </small>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setActionModal(null)}>
                Cancel
              </button>
              <button
                className={`btn ${actionModal.action === 'APPROVED' ? 'btn-primary' : ''}`}
                style={actionModal.action === 'REJECTED' ? { background: '#ef4444', color: 'white' } : {}}
                onClick={submitAction}
                disabled={processActionMutation.isPending}
              >
                <Send size={14} style={{ marginRight: '0.25rem' }} />
                {processActionMutation.isPending ? 'Processing...' : `Confirm ${actionModal.action === 'APPROVED' ? 'Approval' : 'Rejection'}`}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
