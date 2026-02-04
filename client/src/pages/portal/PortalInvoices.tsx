import { useState, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../../lib/api';
import { format } from 'date-fns';
import { Receipt, Eye, X, Download, CreditCard, AlertCircle, CheckCircle, Upload, FileText, Clock, XCircle, FileDown } from 'lucide-react';
import toast from 'react-hot-toast';
import { formatMoney } from '../../lib/format';

export default function PortalInvoices() {
  const queryClient = useQueryClient();
  const [selectedInvoice, setSelectedInvoice] = useState<any>(null);
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [paymentForm, setPaymentForm] = useState({
    amount: '',
    paymentMethod: 'BANK_TRANSFER',
    reference: '',
    notes: '',
    proofFile: null as File | null,
  });
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { data: invoices, isLoading } = useQuery({
    queryKey: ['portal-invoices', statusFilter],
    queryFn: async () => {
      const params: any = {};
      if (statusFilter) params.status = statusFilter;
      const { data } = await api.get('/portal/invoices', { params });
      return data;
    },
  });

  const { data: invoiceDetail, refetch: refetchDetail } = useQuery({
    queryKey: ['portal-invoice-detail', selectedInvoice?.id],
    queryFn: async () => {
      if (!selectedInvoice?.id) return null;
      const { data } = await api.get(`/portal/invoices/${selectedInvoice.id}`);
      return data;
    },
    enabled: !!selectedInvoice?.id,
  });

  const submitPaymentMutation = useMutation({
    mutationFn: async (formData: FormData) => {
      const { data } = await api.post('/portal/payments', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      return data;
    },
    onSuccess: () => {
      toast.success('Payment submitted successfully! Awaiting confirmation.');
      queryClient.invalidateQueries({ queryKey: ['portal-invoices'] });
      refetchDetail();
      setShowPaymentModal(false);
      setPaymentForm({
        amount: '',
        paymentMethod: 'BANK_TRANSFER',
        reference: '',
        notes: '',
        proofFile: null,
      });
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error || 'Failed to submit payment');
    },
  });

  const handleSubmitPayment = () => {
    if (!selectedInvoice || !paymentForm.amount) {
      toast.error('Please enter payment amount');
      return;
    }
    if (!paymentForm.proofFile) {
      toast.error('Payment proof is required');
      return;
    }
    const formData = new FormData();
    formData.append('invoiceId', selectedInvoice.id);
    formData.append('amount', paymentForm.amount);
    formData.append('paymentMethod', paymentForm.paymentMethod);
    formData.append('reference', paymentForm.reference);
    formData.append('notes', paymentForm.notes);
    formData.append('proofFile', paymentForm.proofFile);
    submitPaymentMutation.mutate(formData);
  };

  const summary = {
    total: invoices?.reduce((sum: number, i: any) => sum + i.totalAmount, 0) || 0,
    paid: invoices?.reduce((sum: number, i: any) => sum + i.paidAmount, 0) || 0,
    outstanding: invoices?.reduce((sum: number, i: any) => sum + (i.totalAmount - i.paidAmount), 0) || 0,
    overdue: invoices?.filter((i: any) => i.status === 'OVERDUE' || 
      (['SENT', 'PARTIALLY_PAID'].includes(i.status) && new Date(i.dueDate) < new Date())
    ).length || 0,
  };

  const getStatusColor = (status: string, dueDate: string): string => {
    const isOverdue = ['SENT', 'PARTIALLY_PAID'].includes(status) && new Date(dueDate) < new Date();
    if (isOverdue) return 'danger';
    const colors: Record<string, string> = {
      DRAFT: 'default',
      SENT: 'warning',
      PAID: 'success',
      PARTIALLY_PAID: 'warning',
      OVERDUE: 'danger',
      CANCELLED: 'danger',
    };
    return colors[status] || 'default';
  };

  const getPaymentRequestStatusBadge = (status: string) => {
    const config: Record<string, { color: string; icon: any }> = {
      PENDING: { color: 'warning', icon: Clock },
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

  const remainingAmount = selectedInvoice ? selectedInvoice.totalAmount - selectedInvoice.paidAmount : 0;
  const canSubmitPayment = selectedInvoice && 
    ['SENT', 'ISSUED_POSTED', 'PARTIALLY_PAID', 'OVERDUE'].includes(selectedInvoice.status) && 
    remainingAmount > 0;

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
          <h2 style={{ fontSize: '1.5rem', fontWeight: 600, marginBottom: '0.25rem' }}>Invoices</h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>
            View and manage your billing history
          </p>
        </div>
        <select
          className="form-select"
          style={{ width: 'auto' }}
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
        >
          <option value="">All Statuses</option>
          <option value="SENT">Pending</option>
          <option value="PAID">Paid</option>
          <option value="PARTIALLY_PAID">Partially Paid</option>
          <option value="OVERDUE">Overdue</option>
        </select>
      </div>

      <div className="grid" style={{ gridTemplateColumns: 'repeat(4, 1fr)', gap: '1rem', marginBottom: '1.5rem' }}>
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
              <Receipt size={20} style={{ color: '#0d9488' }} />
            </div>
            <div>
              <div style={{ fontSize: '1.25rem', fontWeight: 600 }}>
                {formatMoney(summary.total)}
              </div>
              <div style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>Total Billed</div>
            </div>
          </div>
        </div>

        <div className="card" style={{ padding: '1.25rem' }}>
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
                {formatMoney(summary.paid)}
              </div>
              <div style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>Paid</div>
            </div>
          </div>
        </div>

        <div className="card" style={{ padding: '1.25rem' }}>
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
              <CreditCard size={20} style={{ color: 'var(--warning)' }} />
            </div>
            <div>
              <div style={{ fontSize: '1.25rem', fontWeight: 600, color: 'var(--warning)' }}>
                {formatMoney(summary.outstanding)}
              </div>
              <div style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>Outstanding</div>
            </div>
          </div>
        </div>

        <div className="card" style={{ padding: '1.25rem' }}>
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
              <AlertCircle size={20} style={{ color: 'var(--danger)' }} />
            </div>
            <div>
              <div style={{ fontSize: '1.25rem', fontWeight: 600, color: 'var(--danger)' }}>
                {summary.overdue}
              </div>
              <div style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>Overdue</div>
            </div>
          </div>
        </div>
      </div>

      <div className="grid" style={{ gridTemplateColumns: selectedInvoice ? '1fr 420px' : '1fr', gap: '1.5rem' }}>
        <div className="card">
          <table className="table">
            <thead>
              <tr>
                <th>Invoice #</th>
                <th>Date</th>
                <th>Due Date</th>
                <th>Amount</th>
                <th>Paid</th>
                <th>Status</th>
                <th style={{ width: '60px' }}>View</th>
              </tr>
            </thead>
            <tbody>
              {invoices?.map((invoice: any) => {
                const isOverdue = ['SENT', 'PARTIALLY_PAID'].includes(invoice.status) && 
                  new Date(invoice.dueDate) < new Date();
                return (
                  <tr 
                    key={invoice.id}
                    style={{ 
                      cursor: 'pointer',
                      backgroundColor: selectedInvoice?.id === invoice.id ? 'var(--background-secondary)' : undefined
                    }}
                    onClick={() => setSelectedInvoice(invoice)}
                  >
                    <td style={{ fontFamily: 'monospace', fontWeight: 500 }}>{invoice.invoiceNumber}</td>
                    <td>{format(new Date(invoice.invoiceDate), 'MMM d, yyyy')}</td>
                    <td style={{ color: isOverdue ? 'var(--danger)' : undefined }}>
                      {format(new Date(invoice.dueDate), 'MMM d, yyyy')}
                    </td>
                    <td style={{ fontWeight: 500 }}>{formatMoney(invoice.totalAmount)}</td>
                    <td style={{ color: invoice.paidAmount > 0 ? 'var(--success)' : 'var(--text-muted)' }}>
                      {formatMoney(invoice.paidAmount)}
                    </td>
                    <td>
                      <span className={`badge badge-${getStatusColor(invoice.status, invoice.dueDate)}`}>
                        {isOverdue ? 'OVERDUE' : invoice.status}
                      </span>
                    </td>
                    <td onClick={(e) => e.stopPropagation()}>
                      <button
                        className="btn btn-sm btn-outline"
                        onClick={() => setSelectedInvoice(invoice)}
                      >
                        <Eye size={14} />
                      </button>
                    </td>
                  </tr>
                );
              })}
              {(!invoices || invoices.length === 0) && (
                <tr>
                  <td colSpan={7} style={{ textAlign: 'center', padding: '3rem' }}>
                    <Receipt size={48} style={{ color: 'var(--text-muted)', opacity: 0.3, marginBottom: '1rem' }} />
                    <p style={{ color: 'var(--text-muted)' }}>No invoices found</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {selectedInvoice && (
          <div className="card" style={{ padding: 0, maxHeight: 'calc(100vh - 240px)', overflowY: 'auto', width: '380px' }}>
            <div style={{ 
              display: 'flex', 
              justifyContent: 'space-between', 
              alignItems: 'center',
              padding: '1rem 1.25rem',
              borderBottom: '1px solid var(--border)'
            }}>
              <h3 style={{ fontWeight: 600, fontSize: '1rem', margin: 0 }}>Invoice Details</h3>
              <button 
                onClick={() => setSelectedInvoice(null)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '0.25rem' }}
              >
                <X size={18} style={{ color: 'var(--text-muted)' }} />
              </button>
            </div>

            <div style={{ padding: '1.25rem', borderBottom: '1px solid var(--border)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
                <div style={{ 
                  width: '40px', 
                  height: '40px', 
                  borderRadius: '10px', 
                  background: 'rgba(13, 148, 136, 0.1)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}>
                  <Receipt size={20} style={{ color: '#0d9488' }} />
                </div>
                <div>
                  <div style={{ fontSize: '0.8125rem', color: 'var(--text-muted)' }}>
                    {selectedInvoice.invoiceNumber}
                  </div>
                  <div style={{ fontSize: '1rem', fontWeight: 600 }}>
                    {format(new Date(selectedInvoice.invoiceDate), 'MMMM d, yyyy')}
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.625rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '0.8125rem', color: 'var(--text-muted)' }}>Status</span>
                  <span className={`badge badge-${getStatusColor(selectedInvoice.status, selectedInvoice.dueDate)}`}>
                    {selectedInvoice.status.replace(/_/g, ' ')}
                  </span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '0.8125rem', color: 'var(--text-muted)' }}>Due Date</span>
                  <span style={{ fontSize: '0.875rem', fontWeight: 500 }}>
                    {format(new Date(selectedInvoice.dueDate), 'MMM d, yyyy')}
                  </span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '0.8125rem', color: 'var(--text-muted)' }}>Total Amount</span>
                  <span style={{ fontSize: '0.875rem', fontWeight: 600, color: '#0d9488' }}>
                    {formatMoney(selectedInvoice.totalAmount)}
                  </span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '0.8125rem', color: 'var(--text-muted)' }}>Paid</span>
                  <span style={{ fontSize: '0.875rem', color: 'var(--success)' }}>
                    {formatMoney(selectedInvoice.paidAmount)}
                  </span>
                </div>
                {remainingAmount > 0 && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: '0.8125rem', color: 'var(--text-muted)' }}>Balance Due</span>
                    <span style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--danger)' }}>
                      {formatMoney(remainingAmount)}
                    </span>
                  </div>
                )}
              </div>
            </div>

            <div style={{ padding: '1.25rem', borderBottom: '1px solid var(--border)' }}>
              <h4 style={{ fontSize: '0.8125rem', fontWeight: 600, marginBottom: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                Line Items
              </h4>
              {(invoiceDetail?.items || selectedInvoice.items)?.length > 0 ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  {(invoiceDetail?.items || selectedInvoice.items)?.map((item: any) => (
                    <div key={item.id} style={{ 
                      display: 'flex', 
                      justifyContent: 'space-between', 
                      alignItems: 'center',
                      padding: '0.5rem 0',
                      borderBottom: '1px solid var(--border)'
                    }}>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: '0.875rem' }}>{item.description}</div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Qty: {item.quantity}</div>
                      </div>
                      <span style={{ fontWeight: 500, fontSize: '0.875rem' }}>{formatMoney(item.lineTotal)}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <div style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', textAlign: 'center', padding: '1rem' }}>
                  No line items
                </div>
              )}

              <div style={{ marginTop: '1rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '0.8125rem', color: 'var(--text-muted)' }}>Subtotal</span>
                  <span style={{ fontSize: '0.875rem' }}>{formatMoney(invoiceDetail?.vatBreakdown?.subtotal || selectedInvoice.subtotal)}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '0.8125rem', color: 'var(--text-muted)' }}>VAT ({invoiceDetail?.vatBreakdown?.vatRate || 15}%)</span>
                  <span style={{ fontSize: '0.875rem' }}>{formatMoney(invoiceDetail?.vatBreakdown?.vatAmount || selectedInvoice.taxAmount)}</span>
                </div>
                {(invoiceDetail?.vatBreakdown?.discount > 0 || selectedInvoice.discountAmount > 0) && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: '0.8125rem', color: 'var(--success)' }}>Discount</span>
                    <span style={{ fontSize: '0.875rem', color: 'var(--success)' }}>
                      - {formatMoney(invoiceDetail?.vatBreakdown?.discount || selectedInvoice.discountAmount)}
                    </span>
                  </div>
                )}
                <div style={{ 
                  display: 'flex', 
                  justifyContent: 'space-between', 
                  alignItems: 'center',
                  paddingTop: '0.5rem',
                  borderTop: '1px solid var(--border)',
                  marginTop: '0.25rem'
                }}>
                  <span style={{ fontSize: '0.875rem', fontWeight: 600 }}>Grand Total</span>
                  <span style={{ fontSize: '1rem', fontWeight: 700, color: '#0d9488' }}>
                    {formatMoney(invoiceDetail?.vatBreakdown?.grandTotal || selectedInvoice.totalAmount)}
                  </span>
                </div>
              </div>
            </div>

            <div style={{ padding: '1.25rem' }}>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <button 
                  className="btn"
                  style={{ 
                    flex: 1, 
                    background: 'var(--bg-secondary)', 
                    border: '1px solid var(--border)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '0.5rem',
                    fontSize: '0.875rem'
                  }}
                  onClick={async () => {
                    try {
                      const response = await api.get(`/invoice-pdf/${selectedInvoice.id}`, {
                        responseType: 'blob',
                      });
                      const blob = new Blob([response.data], { type: 'application/pdf' });
                      const url = window.URL.createObjectURL(blob);
                      const a = document.createElement('a');
                      a.href = url;
                      a.download = `Invoice-${selectedInvoice.invoiceNumber}.pdf`;
                      document.body.appendChild(a);
                      a.click();
                      window.URL.revokeObjectURL(url);
                      document.body.removeChild(a);
                    } catch (error) {
                      toast.error('Failed to download PDF');
                    }
                  }}
                >
                  <FileDown size={16} />
                  Download PDF
                </button>
                {canSubmitPayment && (
                  <button 
                    className="btn" 
                    style={{ 
                      flex: 1, 
                      background: '#0d9488', 
                      borderColor: '#0d9488', 
                      color: 'white',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '0.5rem',
                      fontSize: '0.875rem'
                    }}
                    onClick={() => {
                      setPaymentForm(prev => ({ ...prev, amount: remainingAmount.toString() }));
                      setShowPaymentModal(true);
                    }}
                  >
                    <CreditCard size={16} />
                    Pay Now
                  </button>
                )}
              </div>
            </div>

            {invoiceDetail?.paymentRequests?.length > 0 && (
              <>
                <h4 style={{ fontWeight: 600, marginTop: '1.5rem', marginBottom: '0.75rem', fontSize: '0.875rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-muted)' }}>
                  Payment Requests
                </h4>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  {invoiceDetail.paymentRequests.map((pr: any) => (
                    <div key={pr.id} style={{ 
                      padding: '0.75rem', 
                      backgroundColor: 'var(--background-secondary)', 
                      borderRadius: '0.5rem',
                      borderLeft: `3px solid ${pr.status === 'CONFIRMED' ? 'var(--success)' : pr.status === 'REJECTED' ? 'var(--danger)' : 'var(--warning)'}` 
                    }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.25rem' }}>
                        <span style={{ fontWeight: 500 }}>{formatMoney(pr.amount)}</span>
                        {getPaymentRequestStatusBadge(pr.status)}
                      </div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                        {format(new Date(pr.submittedAt), 'MMM d, yyyy HH:mm')} via {pr.paymentMethod.replace('_', ' ')}
                      </div>
                      {pr.reference && (
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
                          Ref: {pr.reference}
                        </div>
                      )}
                      {pr.status === 'REJECTED' && pr.rejectReason && (
                        <div style={{ fontSize: '0.75rem', color: 'var(--danger)', marginTop: '0.25rem' }}>
                          Reason: {pr.rejectReason}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </>
            )}

            {(invoiceDetail?.payments?.length > 0 || selectedInvoice.payments?.length > 0) && (
              <>
                <h4 style={{ fontWeight: 600, marginTop: '1.5rem', marginBottom: '0.75rem', fontSize: '0.875rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-muted)' }}>
                  Confirmed Payments
                </h4>
                <table className="table">
                  <thead>
                    <tr>
                      <th>Date</th>
                      <th>Method</th>
                      <th>Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(invoiceDetail?.payments || selectedInvoice.payments).map((payment: any) => (
                      <tr key={payment.id}>
                        <td>{format(new Date(payment.paymentDate), 'MMM d, yyyy')}</td>
                        <td>{payment.paymentMethod.replace('_', ' ')}</td>
                        <td style={{ fontWeight: 500, color: 'var(--success)' }}>{formatMoney(payment.amount)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </>
            )}
          </div>
        )}
      </div>

      {showPaymentModal && (
        <div className="modal-overlay" onClick={() => setShowPaymentModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '480px' }}>
            <div className="modal-header">
              <h3 className="modal-title">Submit Payment</h3>
              <button className="modal-close" onClick={() => setShowPaymentModal(false)}>
                <X size={20} />
              </button>
            </div>
            <div className="modal-body">
              <div style={{ 
                backgroundColor: 'var(--background-secondary)', 
                padding: '1rem', 
                borderRadius: '0.5rem',
                marginBottom: '1.5rem' 
              }}>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Invoice</div>
                <div style={{ fontWeight: 600 }}>{selectedInvoice?.invoiceNumber}</div>
                <div style={{ fontSize: '0.875rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
                  Balance Due: {formatMoney(remainingAmount)}
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Payment Amount (SAR) *</label>
                <input
                  type="number"
                  className="form-input"
                  value={paymentForm.amount}
                  onChange={(e) => setPaymentForm(prev => ({ ...prev, amount: e.target.value }))}
                  max={remainingAmount}
                  step="0.01"
                />
              </div>

              <div className="form-group">
                <label className="form-label">Payment Method *</label>
                <select
                  className="form-select"
                  value={paymentForm.paymentMethod}
                  onChange={(e) => setPaymentForm(prev => ({ ...prev, paymentMethod: e.target.value }))}
                >
                  <option value="BANK_TRANSFER">Bank Transfer</option>
                  <option value="CREDIT_CARD">Credit Card</option>
                  <option value="CASH">Cash</option>
                  <option value="CHEQUE">Cheque</option>
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">Transaction Reference</label>
                <input
                  type="text"
                  className="form-input"
                  value={paymentForm.reference}
                  onChange={(e) => setPaymentForm(prev => ({ ...prev, reference: e.target.value }))}
                  placeholder="e.g., Bank transfer reference number"
                />
              </div>

              <div className="form-group">
                <label className="form-label">Payment Proof <span style={{ color: 'var(--danger)' }}>*</span></label>
                <input
                  type="file"
                  ref={fileInputRef}
                  style={{ display: 'none' }}
                  accept=".png,.jpg,.jpeg,.pdf"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      if (file.size > 10 * 1024 * 1024) {
                        toast.error('File size must be less than 10MB');
                        return;
                      }
                      setPaymentForm(prev => ({ ...prev, proofFile: file }));
                    }
                  }}
                />
                <div 
                  onClick={() => fileInputRef.current?.click()}
                  style={{
                    border: '2px dashed var(--border)',
                    borderRadius: '0.5rem',
                    padding: '1.5rem',
                    textAlign: 'center',
                    cursor: 'pointer',
                    backgroundColor: paymentForm.proofFile ? 'rgba(13, 148, 136, 0.05)' : undefined,
                  }}
                >
                  {paymentForm.proofFile ? (
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}>
                      <FileText size={20} style={{ color: '#0d9488' }} />
                      <span>{paymentForm.proofFile.name}</span>
                      <button 
                        className="btn btn-sm btn-outline"
                        onClick={(e) => {
                          e.stopPropagation();
                          setPaymentForm(prev => ({ ...prev, proofFile: null }));
                        }}
                      >
                        <X size={14} />
                      </button>
                    </div>
                  ) : (
                    <>
                      <Upload size={24} style={{ color: 'var(--text-muted)', marginBottom: '0.5rem' }} />
                      <div style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>
                        Click to upload payment proof<br />
                        <span style={{ fontSize: '0.75rem' }}>PNG, JPG or PDF up to 10MB</span>
                      </div>
                    </>
                  )}
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Notes</label>
                <textarea
                  className="form-textarea"
                  value={paymentForm.notes}
                  onChange={(e) => setPaymentForm(prev => ({ ...prev, notes: e.target.value }))}
                  placeholder="Any additional notes for finance team"
                  rows={2}
                />
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-outline" onClick={() => setShowPaymentModal(false)}>
                Cancel
              </button>
              <button 
                className="btn btn-primary" 
                onClick={handleSubmitPayment}
                disabled={submitPaymentMutation.isPending || !paymentForm.amount || !paymentForm.proofFile}
              >
                {submitPaymentMutation.isPending ? 'Submitting...' : 'Submit Payment'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
