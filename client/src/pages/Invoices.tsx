import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../lib/api';
import { format } from 'date-fns';
import { Plus, Send, DollarSign, Eye, X, FileText, CreditCard } from 'lucide-react';

export default function Invoices() {
  const [selectedInvoice, setSelectedInvoice] = useState<any>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState<any>(null);
  const [statusFilter, setStatusFilter] = useState<string>('');
  const queryClient = useQueryClient();

  const { data: invoices, isLoading } = useQuery({
    queryKey: ['invoices', statusFilter],
    queryFn: async () => {
      const params: any = {};
      if (statusFilter) params.status = statusFilter;
      const { data } = await api.get('/invoices', { params });
      return data;
    },
  });

  const { data: summary } = useQuery({
    queryKey: ['invoices', 'summary'],
    queryFn: async () => {
      const { data } = await api.get('/invoices/summary');
      return data;
    },
  });

  const { data: customers } = useQuery({
    queryKey: ['customers'],
    queryFn: async () => {
      const { data } = await api.get('/customers');
      return data;
    },
  });

  const { data: deliveredOrders } = useQuery({
    queryKey: ['orders', 'DELIVERED'],
    queryFn: async () => {
      const { data } = await api.get('/orders', { params: { status: 'DELIVERED' } });
      return data;
    },
  });

  const [paymentForm, setPaymentForm] = useState({
    amount: '',
    paymentMethod: 'BANK_TRANSFER',
    referenceNumber: '',
    notes: '',
  });

  const sendMutation = useMutation({
    mutationFn: async (id: string) => {
      return api.put(`/invoices/${id}/send`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
    },
  });

  const paymentMutation = useMutation({
    mutationFn: async ({ id, ...data }: any) => {
      return api.post(`/invoices/${id}/payments`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
      setShowPaymentModal(null);
      setPaymentForm({
        amount: '',
        paymentMethod: 'BANK_TRANSFER',
        referenceNumber: '',
        notes: '',
      });
    },
  });

  const cancelMutation = useMutation({
    mutationFn: async ({ id, reason }: { id: string; reason: string }) => {
      return api.put(`/invoices/${id}/cancel`, { reason });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
    },
  });

  const generateFromOrdersMutation = useMutation({
    mutationFn: async (data: any) => {
      return api.post('/invoices/generate-from-orders', data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
      setShowCreateModal(false);
    },
  });

  const [createForm, setCreateForm] = useState({
    customerId: '',
    selectedOrders: [] as string[],
    taxRate: 0,
  });

  const getStatusColor = (status: string): string => {
    const colors: Record<string, string> = {
      DRAFT: 'default',
      SENT: 'warning',
      PAID: 'success',
      PARTIALLY_PAID: 'warning',
      OVERDUE: 'danger',
      CANCELLED: 'danger',
      DISPUTED: 'danger',
    };
    return colors[status] || 'default';
  };

  const handlePayment = () => {
    if (!showPaymentModal || !paymentForm.amount) return;
    paymentMutation.mutate({
      id: showPaymentModal.id,
      amount: parseFloat(paymentForm.amount),
      paymentMethod: paymentForm.paymentMethod,
      referenceNumber: paymentForm.referenceNumber || undefined,
      notes: paymentForm.notes || undefined,
    });
  };

  const handleGenerateInvoice = () => {
    if (!createForm.customerId || createForm.selectedOrders.length === 0) return;
    generateFromOrdersMutation.mutate({
      customerId: createForm.customerId,
      orderIds: createForm.selectedOrders,
      taxRate: createForm.taxRate,
    });
  };

  const customerOrders = deliveredOrders?.filter((o: any) => o.customerId === createForm.customerId) || [];

  if (isLoading) {
    return (
      <div className="loading-overlay">
        <div className="spinner" />
      </div>
    );
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
        <h2 style={{ fontSize: '1.25rem', fontWeight: 600 }}>Invoicing</h2>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <select
            className="form-select"
            style={{ width: 'auto' }}
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="">All Statuses</option>
            <option value="DRAFT">Draft</option>
            <option value="SENT">Sent</option>
            <option value="PAID">Paid</option>
            <option value="PARTIALLY_PAID">Partially Paid</option>
            <option value="OVERDUE">Overdue</option>
          </select>
          <button className="btn btn-primary" onClick={() => setShowCreateModal(true)}>
            <Plus size={16} /> Generate Invoice
          </button>
        </div>
      </div>

      {summary && (
        <div className="grid" style={{ gridTemplateColumns: 'repeat(4, 1fr)', gap: '1rem', marginBottom: '1.5rem' }}>
          <div className="card" style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '2rem', fontWeight: 600, color: 'var(--primary)' }}>
              ${summary.totalAmount?.toLocaleString(undefined, { minimumFractionDigits: 2 }) || '0.00'}
            </div>
            <div style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>Total Invoiced</div>
          </div>
          <div className="card" style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '2rem', fontWeight: 600, color: 'var(--success)' }}>
              ${summary.totalPaid?.toLocaleString(undefined, { minimumFractionDigits: 2 }) || '0.00'}
            </div>
            <div style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>Total Paid</div>
          </div>
          <div className="card" style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '2rem', fontWeight: 600, color: 'var(--warning)' }}>
              ${summary.totalOutstanding?.toLocaleString(undefined, { minimumFractionDigits: 2 }) || '0.00'}
            </div>
            <div style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>Outstanding</div>
          </div>
          <div className="card" style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '2rem', fontWeight: 600, color: 'var(--danger)' }}>
              {summary.byStatus?.overdue || 0}
            </div>
            <div style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>Overdue</div>
          </div>
        </div>
      )}

      <div className="grid" style={{ gridTemplateColumns: selectedInvoice ? '1fr 1fr' : '1fr' }}>
        <div className="card">
          <table className="table">
            <thead>
              <tr>
                <th>Invoice #</th>
                <th>Customer</th>
                <th>Date</th>
                <th>Due Date</th>
                <th>Total</th>
                <th>Paid</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {invoices?.map((invoice: any) => {
                const isOverdue = ['SENT', 'PARTIALLY_PAID'].includes(invoice.status) && 
                  new Date(invoice.dueDate) < new Date();
                return (
                  <tr key={invoice.id}>
                    <td style={{ fontFamily: 'monospace' }}>{invoice.invoiceNumber}</td>
                    <td>{invoice.customer?.name}</td>
                    <td>{format(new Date(invoice.invoiceDate), 'MMM d, yyyy')}</td>
                    <td style={{ color: isOverdue ? 'var(--danger)' : undefined }}>
                      {format(new Date(invoice.dueDate), 'MMM d, yyyy')}
                    </td>
                    <td>${invoice.totalAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                    <td>${invoice.paidAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                    <td>
                      <span className={`badge badge-${isOverdue ? 'danger' : getStatusColor(invoice.status)}`}>
                        {isOverdue ? 'OVERDUE' : invoice.status}
                      </span>
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: '0.25rem' }}>
                        <button
                          className="btn btn-sm btn-outline"
                          onClick={() => setSelectedInvoice(invoice)}
                          title="View Details"
                        >
                          <Eye size={14} />
                        </button>
                        {invoice.status === 'DRAFT' && (
                          <button
                            className="btn btn-sm btn-primary"
                            onClick={() => sendMutation.mutate(invoice.id)}
                            title="Send Invoice"
                          >
                            <Send size={14} />
                          </button>
                        )}
                        {['SENT', 'PARTIALLY_PAID'].includes(invoice.status) && (
                          <button
                            className="btn btn-sm btn-success"
                            onClick={() => {
                              setPaymentForm({
                                ...paymentForm,
                                amount: (invoice.totalAmount - invoice.paidAmount).toFixed(2),
                              });
                              setShowPaymentModal(invoice);
                            }}
                            title="Record Payment"
                          >
                            <CreditCard size={14} />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
              {(!invoices || invoices.length === 0) && (
                <tr>
                  <td colSpan={8} style={{ textAlign: 'center', color: 'var(--text-muted)' }}>
                    No invoices found
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {selectedInvoice && (
          <div className="card">
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem' }}>
              <div>
                <h3 style={{ fontWeight: 600 }}>Invoice {selectedInvoice.invoiceNumber}</h3>
                <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>
                  {selectedInvoice.customer?.name}
                </p>
              </div>
              <button className="btn btn-sm btn-outline" onClick={() => setSelectedInvoice(null)}>
                <X size={14} />
              </button>
            </div>

            <div className="grid" style={{ gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1.5rem' }}>
              <div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Invoice Date</div>
                <div>{format(new Date(selectedInvoice.invoiceDate), 'MMM d, yyyy')}</div>
              </div>
              <div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Due Date</div>
                <div>{format(new Date(selectedInvoice.dueDate), 'MMM d, yyyy')}</div>
              </div>
              <div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Subtotal</div>
                <div>${selectedInvoice.subtotal.toFixed(2)}</div>
              </div>
              <div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Tax</div>
                <div>${selectedInvoice.taxAmount.toFixed(2)}</div>
              </div>
              <div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Discount</div>
                <div>${selectedInvoice.discountAmount.toFixed(2)}</div>
              </div>
              <div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Total</div>
                <div style={{ fontWeight: 600, fontSize: '1.25rem' }}>
                  ${selectedInvoice.totalAmount.toFixed(2)}
                </div>
              </div>
            </div>

            <h4 style={{ fontWeight: 600, marginBottom: '0.5rem' }}>Line Items</h4>
            <table className="table">
              <thead>
                <tr>
                  <th>Description</th>
                  <th>Qty</th>
                  <th>Unit Price</th>
                  <th>Total</th>
                </tr>
              </thead>
              <tbody>
                {selectedInvoice.items?.map((item: any) => (
                  <tr key={item.id}>
                    <td>{item.description}</td>
                    <td>{item.quantity}</td>
                    <td>${item.unitPrice.toFixed(2)}</td>
                    <td>${item.lineTotal.toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>

            {selectedInvoice.payments?.length > 0 && (
              <>
                <h4 style={{ fontWeight: 600, marginTop: '1.5rem', marginBottom: '0.5rem' }}>Payments</h4>
                <table className="table">
                  <thead>
                    <tr>
                      <th>Date</th>
                      <th>Amount</th>
                      <th>Method</th>
                      <th>Reference</th>
                    </tr>
                  </thead>
                  <tbody>
                    {selectedInvoice.payments.map((payment: any) => (
                      <tr key={payment.id}>
                        <td>{format(new Date(payment.paymentDate), 'MMM d, yyyy')}</td>
                        <td>${payment.amount.toFixed(2)}</td>
                        <td>{payment.paymentMethod}</td>
                        <td>{payment.referenceNumber || '-'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </>
            )}
          </div>
        )}
      </div>

      {showCreateModal && (
        <div className="modal-overlay" onClick={() => setShowCreateModal(false)}>
          <div className="modal" style={{ maxWidth: '600px' }} onClick={(e) => e.stopPropagation()}>
            <h3 style={{ marginBottom: '1rem' }}>Generate Invoice from Orders</h3>
            <div className="form-group">
              <label>Customer *</label>
              <select
                className="form-select"
                value={createForm.customerId}
                onChange={(e) => setCreateForm({ ...createForm, customerId: e.target.value, selectedOrders: [] })}
              >
                <option value="">Select a customer</option>
                {customers?.map((customer: any) => (
                  <option key={customer.id} value={customer.id}>
                    {customer.name}
                  </option>
                ))}
              </select>
            </div>
            {createForm.customerId && (
              <div className="form-group">
                <label>Select Delivered Orders *</label>
                <div style={{ maxHeight: '200px', overflow: 'auto', border: '1px solid var(--border)', borderRadius: '0.5rem', padding: '0.5rem' }}>
                  {customerOrders.length > 0 ? customerOrders.map((order: any) => (
                    <label key={order.id} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.5rem', cursor: 'pointer' }}>
                      <input
                        type="checkbox"
                        checked={createForm.selectedOrders.includes(order.id)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setCreateForm({ ...createForm, selectedOrders: [...createForm.selectedOrders, order.id] });
                          } else {
                            setCreateForm({ ...createForm, selectedOrders: createForm.selectedOrders.filter(id => id !== order.id) });
                          }
                        }}
                      />
                      <span>{order.orderNumber}</span>
                      <span style={{ marginLeft: 'auto', color: 'var(--text-muted)' }}>
                        {order.requestedActivity} {order.activityUnit} - {order.product?.name}
                      </span>
                    </label>
                  )) : (
                    <p style={{ color: 'var(--text-muted)', textAlign: 'center', padding: '1rem' }}>
                      No delivered orders for this customer
                    </p>
                  )}
                </div>
              </div>
            )}
            <div className="form-group">
              <label>Tax Rate (%)</label>
              <input
                type="number"
                className="form-input"
                value={createForm.taxRate}
                onChange={(e) => setCreateForm({ ...createForm, taxRate: parseFloat(e.target.value) })}
                min="0"
                max="100"
                step="0.5"
              />
            </div>
            <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end', marginTop: '1rem' }}>
              <button className="btn btn-outline" onClick={() => setShowCreateModal(false)}>
                Cancel
              </button>
              <button
                className="btn btn-primary"
                onClick={handleGenerateInvoice}
                disabled={generateFromOrdersMutation.isPending || createForm.selectedOrders.length === 0}
              >
                {generateFromOrdersMutation.isPending ? 'Generating...' : 'Generate Invoice'}
              </button>
            </div>
          </div>
        </div>
      )}

      {showPaymentModal && (
        <div className="modal-overlay" onClick={() => setShowPaymentModal(null)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h3 style={{ marginBottom: '1rem' }}>Record Payment</h3>
            <p style={{ color: 'var(--text-muted)', marginBottom: '1rem' }}>
              Invoice: {showPaymentModal.invoiceNumber} | 
              Outstanding: ${(showPaymentModal.totalAmount - showPaymentModal.paidAmount).toFixed(2)}
            </p>
            <div className="form-group">
              <label>Amount *</label>
              <input
                type="number"
                className="form-input"
                value={paymentForm.amount}
                onChange={(e) => setPaymentForm({ ...paymentForm, amount: e.target.value })}
                step="0.01"
              />
            </div>
            <div className="form-group">
              <label>Payment Method</label>
              <select
                className="form-select"
                value={paymentForm.paymentMethod}
                onChange={(e) => setPaymentForm({ ...paymentForm, paymentMethod: e.target.value })}
              >
                <option value="BANK_TRANSFER">Bank Transfer</option>
                <option value="CHECK">Check</option>
                <option value="CREDIT_CARD">Credit Card</option>
                <option value="CASH">Cash</option>
              </select>
            </div>
            <div className="form-group">
              <label>Reference Number</label>
              <input
                type="text"
                className="form-input"
                value={paymentForm.referenceNumber}
                onChange={(e) => setPaymentForm({ ...paymentForm, referenceNumber: e.target.value })}
                placeholder="e.g., Check #, Transaction ID"
              />
            </div>
            <div className="form-group">
              <label>Notes</label>
              <textarea
                className="form-input"
                value={paymentForm.notes}
                onChange={(e) => setPaymentForm({ ...paymentForm, notes: e.target.value })}
                rows={2}
              />
            </div>
            <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end', marginTop: '1rem' }}>
              <button className="btn btn-outline" onClick={() => setShowPaymentModal(null)}>
                Cancel
              </button>
              <button
                className="btn btn-primary"
                onClick={handlePayment}
                disabled={paymentMutation.isPending}
              >
                {paymentMutation.isPending ? 'Recording...' : 'Record Payment'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
