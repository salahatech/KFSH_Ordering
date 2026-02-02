import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import api from '../../lib/api';
import { format } from 'date-fns';
import { Receipt, Eye, X, Download, CreditCard, AlertCircle, CheckCircle } from 'lucide-react';

export default function PortalInvoices() {
  const [selectedInvoice, setSelectedInvoice] = useState<any>(null);
  const [statusFilter, setStatusFilter] = useState<string>('');

  const { data: invoices, isLoading } = useQuery({
    queryKey: ['portal-invoices', statusFilter],
    queryFn: async () => {
      const params: any = {};
      if (statusFilter) params.status = statusFilter;
      const { data } = await api.get('/invoices', { params });
      return data;
    },
  });

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
                ${(summary.total / 1000).toFixed(1)}k
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
                ${(summary.paid / 1000).toFixed(1)}k
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
                ${(summary.outstanding / 1000).toFixed(1)}k
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

      <div className="grid" style={{ gridTemplateColumns: selectedInvoice ? '1fr 400px' : '1fr', gap: '1.5rem' }}>
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
                    <td style={{ fontWeight: 500 }}>${invoice.totalAmount.toFixed(2)}</td>
                    <td style={{ color: invoice.paidAmount > 0 ? 'var(--success)' : 'var(--text-muted)' }}>
                      ${invoice.paidAmount.toFixed(2)}
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
          <div className="card">
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
                  Invoice {selectedInvoice.invoiceNumber}
                </h3>
                <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', margin: 0 }}>
                  {format(new Date(selectedInvoice.invoiceDate), 'MMMM d, yyyy')}
                </p>
              </div>
              <button className="btn btn-sm btn-outline" onClick={() => setSelectedInvoice(null)}>
                <X size={14} />
              </button>
            </div>

            <div className="grid" style={{ gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginBottom: '1.5rem' }}>
              <div style={{ backgroundColor: 'var(--background-secondary)', padding: '0.75rem', borderRadius: '0.5rem' }}>
                <div style={{ fontSize: '0.6875rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Due Date</div>
                <div style={{ fontWeight: 500, marginTop: '0.25rem' }}>
                  {format(new Date(selectedInvoice.dueDate), 'MMM d, yyyy')}
                </div>
              </div>
              <div style={{ backgroundColor: 'var(--background-secondary)', padding: '0.75rem', borderRadius: '0.5rem' }}>
                <div style={{ fontSize: '0.6875rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Status</div>
                <div style={{ marginTop: '0.25rem' }}>
                  <span className={`badge badge-${getStatusColor(selectedInvoice.status, selectedInvoice.dueDate)}`}>
                    {selectedInvoice.status}
                  </span>
                </div>
              </div>
            </div>

            <div style={{ 
              backgroundColor: '#0d9488', 
              color: 'white', 
              padding: '1rem', 
              borderRadius: '0.5rem',
              marginBottom: '1.5rem'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <div style={{ fontSize: '0.75rem', opacity: 0.8 }}>Total Amount</div>
                  <div style={{ fontSize: '1.5rem', fontWeight: 600 }}>${selectedInvoice.totalAmount.toFixed(2)}</div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: '0.75rem', opacity: 0.8 }}>Balance Due</div>
                  <div style={{ fontSize: '1.25rem', fontWeight: 500 }}>
                    ${(selectedInvoice.totalAmount - selectedInvoice.paidAmount).toFixed(2)}
                  </div>
                </div>
              </div>
            </div>

            <h4 style={{ fontWeight: 600, marginBottom: '0.75rem', fontSize: '0.875rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-muted)' }}>
              Line Items
            </h4>
            <table className="table">
              <thead>
                <tr>
                  <th>Description</th>
                  <th>Qty</th>
                  <th>Total</th>
                </tr>
              </thead>
              <tbody>
                {selectedInvoice.items?.map((item: any) => (
                  <tr key={item.id}>
                    <td style={{ fontSize: '0.875rem' }}>{item.description}</td>
                    <td>{item.quantity}</td>
                    <td style={{ fontWeight: 500 }}>${item.lineTotal.toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>

            {selectedInvoice.payments?.length > 0 && (
              <>
                <h4 style={{ fontWeight: 600, marginTop: '1.5rem', marginBottom: '0.75rem', fontSize: '0.875rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-muted)' }}>
                  Payment History
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
                    {selectedInvoice.payments.map((payment: any) => (
                      <tr key={payment.id}>
                        <td>{format(new Date(payment.paymentDate), 'MMM d, yyyy')}</td>
                        <td>{payment.paymentMethod.replace('_', ' ')}</td>
                        <td style={{ fontWeight: 500, color: 'var(--success)' }}>${payment.amount.toFixed(2)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
