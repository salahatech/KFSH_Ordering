import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../../lib/api';
import { format } from 'date-fns';
import { formatCurrency } from '../../lib/format';
import { CreditCard, Check, X, Eye, Clock, AlertCircle, CheckCircle, XCircle, FileText, ExternalLink } from 'lucide-react';
import toast from 'react-hot-toast';

export default function PaymentApprovals() {
  const queryClient = useQueryClient();
  const [statusFilter, setStatusFilter] = useState('PENDING_CONFIRMATION');
  const [selectedRequest, setSelectedRequest] = useState<any>(null);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [rejectReason, setRejectReason] = useState('');

  const { data: stats } = useQuery({
    queryKey: ['payment-stats'],
    queryFn: async () => {
      const { data } = await api.get('/payments/stats');
      return data;
    },
  });

  const { data: requests, isLoading } = useQuery({
    queryKey: ['payment-requests', statusFilter],
    queryFn: async () => {
      const params: any = { limit: 50 };
      if (statusFilter) params.status = statusFilter;
      const { data } = await api.get('/payments', { params });
      return data.data;
    },
  });

  const { data: requestDetail, refetch: refetchDetail } = useQuery({
    queryKey: ['payment-request-detail', selectedRequest?.id],
    queryFn: async () => {
      if (!selectedRequest?.id) return null;
      const { data } = await api.get(`/payments/${selectedRequest.id}`);
      return data;
    },
    enabled: !!selectedRequest?.id,
  });

  const confirmMutation = useMutation({
    mutationFn: async (id: string) => {
      const { data } = await api.post(`/payments/${id}/confirm`);
      return data;
    },
    onSuccess: (data) => {
      toast.success('Payment confirmed! Receipt voucher generated.');
      queryClient.invalidateQueries({ queryKey: ['payment-requests'] });
      queryClient.invalidateQueries({ queryKey: ['payment-stats'] });
      refetchDetail();
      setSelectedRequest(null);
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error || 'Failed to confirm payment');
    },
  });

  const rejectMutation = useMutation({
    mutationFn: async ({ id, reason }: { id: string; reason: string }) => {
      const { data } = await api.post(`/payments/${id}/reject`, { reason });
      return data;
    },
    onSuccess: () => {
      toast.success('Payment rejected');
      queryClient.invalidateQueries({ queryKey: ['payment-requests'] });
      queryClient.invalidateQueries({ queryKey: ['payment-stats'] });
      setShowRejectModal(false);
      setRejectReason('');
      setSelectedRequest(null);
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error || 'Failed to reject payment');
    },
  });

  const getStatusBadge = (status: string) => {
    const config: Record<string, { color: string; icon: any }> = {
      PENDING_CONFIRMATION: { color: 'warning', icon: Clock },
      CONFIRMED: { color: 'success', icon: CheckCircle },
      REJECTED: { color: 'danger', icon: XCircle },
    };
    const { color, icon: Icon } = config[status] || { color: 'default', icon: Clock };
    return (
      <span className={`badge badge-${color}`} style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}>
        <Icon size={12} />
        {status}
      </span>
    );
  };

  if (isLoading) {
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
          <h2 style={{ fontSize: '1.5rem', fontWeight: 600, marginBottom: '0.25rem' }}>Payment Approvals</h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>
            Review and process customer payment submissions
          </p>
        </div>
      </div>

      <div className="grid" style={{ gridTemplateColumns: 'repeat(4, 1fr)', gap: '1rem', marginBottom: '1.5rem' }}>
        <div 
          className="card" 
          style={{ padding: '1.25rem', cursor: 'pointer', border: statusFilter === 'PENDING_CONFIRMATION' ? '2px solid var(--warning)' : undefined }}
          onClick={() => setStatusFilter('PENDING_CONFIRMATION')}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <div style={{ 
              width: '40px', 
              height: '40px', 
              borderRadius: '10px', 
              backgroundColor: 'rgba(234, 179, 8, 0.1)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <Clock size={20} style={{ color: 'var(--warning)' }} />
            </div>
            <div>
              <div style={{ fontSize: '1.25rem', fontWeight: 600 }}>
                {stats?.pending || 0}
              </div>
              <div style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>Pending Review</div>
            </div>
          </div>
        </div>

        <div 
          className="card" 
          style={{ padding: '1.25rem', cursor: 'pointer', border: statusFilter === 'CONFIRMED' ? '2px solid var(--success)' : undefined }}
          onClick={() => setStatusFilter('CONFIRMED')}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <div style={{ 
              width: '40px', 
              height: '40px', 
              borderRadius: '10px', 
              backgroundColor: 'rgba(34, 197, 94, 0.1)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <CheckCircle size={20} style={{ color: 'var(--success)' }} />
            </div>
            <div>
              <div style={{ fontSize: '1.25rem', fontWeight: 600, color: 'var(--success)' }}>
                {stats?.confirmed || 0}
              </div>
              <div style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>Confirmed</div>
            </div>
          </div>
        </div>

        <div 
          className="card" 
          style={{ padding: '1.25rem', cursor: 'pointer', border: statusFilter === 'REJECTED' ? '2px solid var(--danger)' : undefined }}
          onClick={() => setStatusFilter('REJECTED')}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <div style={{ 
              width: '40px', 
              height: '40px', 
              borderRadius: '10px', 
              backgroundColor: 'rgba(239, 68, 68, 0.1)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <XCircle size={20} style={{ color: 'var(--danger)' }} />
            </div>
            <div>
              <div style={{ fontSize: '1.25rem', fontWeight: 600, color: 'var(--danger)' }}>
                {stats?.rejected || 0}
              </div>
              <div style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>Rejected</div>
            </div>
          </div>
        </div>

        <div className="card" style={{ padding: '1.25rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <div style={{ 
              width: '40px', 
              height: '40px', 
              borderRadius: '10px', 
              backgroundColor: 'rgba(13, 148, 136, 0.1)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <CreditCard size={20} style={{ color: '#0d9488' }} />
            </div>
            <div>
              <div style={{ fontSize: '1.25rem', fontWeight: 600 }}>
                {formatCurrency(stats?.totalPendingAmount || 0)}
              </div>
              <div style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>Pending Amount</div>
            </div>
          </div>
        </div>
      </div>

      <div className="grid" style={{ gridTemplateColumns: selectedRequest ? '1fr 450px' : '1fr', gap: '1.5rem' }}>
        <div className="card">
          <table className="table">
            <thead>
              <tr>
                <th>Customer</th>
                <th>Invoice</th>
                <th>Amount</th>
                <th>Method</th>
                <th>Submitted</th>
                <th>Status</th>
                <th style={{ width: '60px' }}>Action</th>
              </tr>
            </thead>
            <tbody>
              {requests?.map((req: any) => (
                <tr 
                  key={req.id}
                  style={{ 
                    cursor: 'pointer',
                    backgroundColor: selectedRequest?.id === req.id ? 'var(--background-secondary)' : undefined
                  }}
                  onClick={() => setSelectedRequest(req)}
                >
                  <td>
                    <div style={{ fontWeight: 500 }}>{req.invoice?.customer?.nameEn || req.invoice?.customer?.name}</div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{req.invoice?.customer?.code}</div>
                  </td>
                  <td style={{ fontFamily: 'monospace' }}>{req.invoice?.invoiceNumber}</td>
                  <td style={{ fontWeight: 500 }}>{formatCurrency(req.amount)}</td>
                  <td>{req.paymentMethod?.replace('_', ' ')}</td>
                  <td>{format(new Date(req.submittedAt), 'MMM d, HH:mm')}</td>
                  <td>{getStatusBadge(req.status)}</td>
                  <td onClick={(e) => e.stopPropagation()}>
                    <button
                      className="btn btn-sm btn-outline"
                      onClick={() => setSelectedRequest(req)}
                    >
                      <Eye size={14} />
                    </button>
                  </td>
                </tr>
              ))}
              {(!requests || requests.length === 0) && (
                <tr>
                  <td colSpan={7} style={{ textAlign: 'center', padding: '3rem' }}>
                    <CreditCard size={48} style={{ color: 'var(--text-muted)', opacity: 0.3, marginBottom: '1rem' }} />
                    <p style={{ color: 'var(--text-muted)' }}>No payment requests found</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {selectedRequest && (
          <div className="card" style={{ maxHeight: 'calc(100vh - 240px)', overflowY: 'auto' }}>
            <div style={{ 
              display: 'flex', 
              justifyContent: 'space-between', 
              alignItems: 'flex-start',
              paddingBottom: '1rem',
              borderBottom: '1px solid var(--border)',
              marginBottom: '1rem'
            }}>
              <div>
                <h3 style={{ fontWeight: 600, fontSize: '1.125rem', marginBottom: '0.25rem' }}>
                  Payment Request
                </h3>
                <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', margin: 0 }}>
                  {requestDetail?.invoice?.customer?.nameEn || requestDetail?.invoice?.customer?.name}
                </p>
              </div>
              <button className="btn btn-sm btn-outline" onClick={() => setSelectedRequest(null)}>
                <X size={14} />
              </button>
            </div>

            <div style={{ 
              backgroundColor: 'var(--primary)', 
              color: 'white', 
              padding: '1rem', 
              borderRadius: '0.5rem',
              marginBottom: '1.5rem'
            }}>
              <div style={{ fontSize: '0.75rem', opacity: 0.8 }}>Payment Amount</div>
              <div style={{ fontSize: '1.5rem', fontWeight: 600 }}>
                {formatCurrency(selectedRequest.amount)}
              </div>
            </div>

            <div className="grid" style={{ gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginBottom: '1.5rem' }}>
              <div style={{ backgroundColor: 'var(--background-secondary)', padding: '0.75rem', borderRadius: '0.5rem' }}>
                <div style={{ fontSize: '0.6875rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Invoice</div>
                <div style={{ fontWeight: 500, marginTop: '0.25rem', fontFamily: 'monospace' }}>
                  {requestDetail?.invoice?.invoiceNumber}
                </div>
              </div>
              <div style={{ backgroundColor: 'var(--background-secondary)', padding: '0.75rem', borderRadius: '0.5rem' }}>
                <div style={{ fontSize: '0.6875rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Method</div>
                <div style={{ fontWeight: 500, marginTop: '0.25rem' }}>
                  {selectedRequest.paymentMethod?.replace('_', ' ')}
                </div>
              </div>
              <div style={{ backgroundColor: 'var(--background-secondary)', padding: '0.75rem', borderRadius: '0.5rem' }}>
                <div style={{ fontSize: '0.6875rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Submitted</div>
                <div style={{ fontWeight: 500, marginTop: '0.25rem' }}>
                  {format(new Date(selectedRequest.submittedAt), 'MMM d, yyyy HH:mm')}
                </div>
              </div>
              <div style={{ backgroundColor: 'var(--background-secondary)', padding: '0.75rem', borderRadius: '0.5rem' }}>
                <div style={{ fontSize: '0.6875rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Status</div>
                <div style={{ marginTop: '0.25rem' }}>
                  {getStatusBadge(selectedRequest.status)}
                </div>
              </div>
            </div>

            {selectedRequest.reference && (
              <div style={{ marginBottom: '1rem' }}>
                <div style={{ fontSize: '0.6875rem', color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '0.25rem' }}>Reference</div>
                <div style={{ fontFamily: 'monospace', backgroundColor: 'var(--background-secondary)', padding: '0.5rem', borderRadius: '0.25rem' }}>
                  {selectedRequest.reference}
                </div>
              </div>
            )}

            {selectedRequest.notes && (
              <div style={{ marginBottom: '1rem' }}>
                <div style={{ fontSize: '0.6875rem', color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '0.25rem' }}>Notes</div>
                <div style={{ backgroundColor: 'var(--background-secondary)', padding: '0.5rem', borderRadius: '0.25rem', fontSize: '0.875rem' }}>
                  {selectedRequest.notes}
                </div>
              </div>
            )}

            {selectedRequest.proofUrl && (
              <div style={{ marginBottom: '1.5rem' }}>
                <div style={{ fontSize: '0.6875rem', color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '0.5rem' }}>Payment Proof</div>
                <a 
                  href={selectedRequest.proofUrl} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="btn btn-outline"
                  style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem' }}
                >
                  <FileText size={16} />
                  View Proof
                  <ExternalLink size={14} />
                </a>
              </div>
            )}

            {requestDetail?.invoice && (
              <div style={{ marginBottom: '1.5rem' }}>
                <div style={{ fontSize: '0.6875rem', color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '0.5rem' }}>Invoice Summary</div>
                <div style={{ backgroundColor: 'var(--background-secondary)', padding: '0.75rem', borderRadius: '0.5rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                    <span style={{ color: 'var(--text-muted)' }}>Total Amount</span>
                    <span>{formatCurrency(requestDetail.invoice.totalAmount)}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                    <span style={{ color: 'var(--text-muted)' }}>Already Paid</span>
                    <span style={{ color: 'var(--success)' }}>{formatCurrency(requestDetail.invoice.paidAmount)}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px solid var(--border)', paddingTop: '0.5rem' }}>
                    <span style={{ fontWeight: 500 }}>Balance After This Payment</span>
                    <span style={{ fontWeight: 500 }}>
                      {formatCurrency(Math.max(0, requestDetail.invoice.totalAmount - requestDetail.invoice.paidAmount - selectedRequest.amount))}
                    </span>
                  </div>
                </div>
              </div>
            )}

            {selectedRequest.status === 'REJECTED' && selectedRequest.rejectReason && (
              <div style={{ 
                backgroundColor: 'rgba(239, 68, 68, 0.1)', 
                border: '1px solid var(--danger)',
                padding: '0.75rem', 
                borderRadius: '0.5rem',
                marginBottom: '1.5rem'
              }}>
                <div style={{ fontSize: '0.6875rem', color: 'var(--danger)', textTransform: 'uppercase', marginBottom: '0.25rem' }}>Rejection Reason</div>
                <div style={{ color: 'var(--danger)' }}>{selectedRequest.rejectReason}</div>
              </div>
            )}

            {selectedRequest.status === 'PENDING_CONFIRMATION' && (
              <div style={{ display: 'flex', gap: '0.75rem' }}>
                <button 
                  className="btn btn-success" 
                  style={{ flex: 1 }}
                  onClick={() => confirmMutation.mutate(selectedRequest.id)}
                  disabled={confirmMutation.isPending}
                >
                  <Check size={16} style={{ marginRight: '0.5rem' }} />
                  {confirmMutation.isPending ? 'Confirming...' : 'Confirm Payment'}
                </button>
                <button 
                  className="btn btn-danger" 
                  style={{ flex: 1 }}
                  onClick={() => setShowRejectModal(true)}
                  disabled={rejectMutation.isPending}
                >
                  <X size={16} style={{ marginRight: '0.5rem' }} />
                  Reject
                </button>
              </div>
            )}

            {selectedRequest.reviewedBy && (
              <div style={{ marginTop: '1rem', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                {selectedRequest.status === 'CONFIRMED' ? 'Confirmed' : 'Rejected'} by {selectedRequest.reviewedBy?.fullName || selectedRequest.reviewedBy?.username}
                {selectedRequest.reviewedAt && ` on ${format(new Date(selectedRequest.reviewedAt), 'MMM d, yyyy HH:mm')}`}
              </div>
            )}
          </div>
        )}
      </div>

      {showRejectModal && (
        <div className="modal-overlay" onClick={() => setShowRejectModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '400px' }}>
            <div className="modal-header">
              <h3 className="modal-title">Reject Payment</h3>
              <button className="modal-close" onClick={() => setShowRejectModal(false)}>
                <X size={20} />
              </button>
            </div>
            <div className="modal-body">
              <div className="form-group">
                <label className="form-label">Rejection Reason *</label>
                <textarea
                  className="form-textarea"
                  value={rejectReason}
                  onChange={(e) => setRejectReason(e.target.value)}
                  placeholder="Please provide a reason for rejection"
                  rows={3}
                  required
                />
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-outline" onClick={() => setShowRejectModal(false)}>
                Cancel
              </button>
              <button 
                className="btn btn-danger" 
                onClick={() => rejectMutation.mutate({ id: selectedRequest.id, reason: rejectReason })}
                disabled={!rejectReason || rejectMutation.isPending}
              >
                {rejectMutation.isPending ? 'Rejecting...' : 'Reject Payment'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
