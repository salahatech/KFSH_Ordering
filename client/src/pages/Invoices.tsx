import { useState, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../lib/api';
import { jsPDF } from 'jspdf';
import { useLocalization } from '../hooks/useLocalization';
import QRCode from 'qrcode';
import { 
  Plus, 
  Send, 
  Eye, 
  X, 
  FileText, 
  CreditCard, 
  Receipt, 
  TrendingUp, 
  AlertCircle,
  Download,
  Building2,
  Calendar,
  Coins,
  CheckCircle,
  Clock,
  Printer,
  Paperclip,
} from 'lucide-react';
import AttachmentPanel from '../components/AttachmentPanel';
import { KpiCard } from '../components/shared';
import { formatMoney, SYSTEM_CURRENCY } from '../lib/format';

function generateZatcaQRData(invoice: any, sellerName: string, vatNumber: string): string {
  const invoiceDate = new Date(invoice.invoiceDate).toISOString();
  const totalWithVat = invoice.totalAmount.toFixed(2);
  const vatAmount = invoice.taxAmount.toFixed(2);
  
  const tlvData = [
    { tag: 1, value: sellerName },
    { tag: 2, value: vatNumber },
    { tag: 3, value: invoiceDate },
    { tag: 4, value: totalWithVat },
    { tag: 5, value: vatAmount },
  ];
  
  let tlvBytes: number[] = [];
  tlvData.forEach(item => {
    const valueBytes = new TextEncoder().encode(item.value);
    tlvBytes.push(item.tag);
    tlvBytes.push(valueBytes.length);
    tlvBytes.push(...valueBytes);
  });
  
  const base64 = btoa(String.fromCharCode(...tlvBytes));
  return base64;
}

export default function Invoices() {
  const [selectedInvoice, setSelectedInvoice] = useState<any>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState<any>(null);
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [detailTab, setDetailTab] = useState<'details' | 'payments' | 'attachments'>('details');
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  const queryClient = useQueryClient();
  const { formatDateOnly, formatMoney } = useLocalization();

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
    queryKey: ['invoices', 'stats'],
    queryFn: async () => {
      const { data } = await api.get('/invoices/stats');
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

  const submitForApprovalMutation = useMutation({
    mutationFn: async (id: string) => {
      return api.put(`/invoices/${id}/submit-for-approval`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
    },
  });

  const approvePostMutation = useMutation({
    mutationFn: async (id: string) => {
      return api.put(`/invoices/${id}/approve-post`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
    },
  });

  const closeMutation = useMutation({
    mutationFn: async (id: string) => {
      return api.put(`/invoices/${id}/close`);
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
      return api.put(`/invoices/${id}/void`, { reason });
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
    taxRate: 15,
  });

  const getStatusColor = (status: string): string => {
    const colors: Record<string, string> = {
      DRAFT: 'default',
      PENDING_APPROVAL: 'warning',
      ISSUED_POSTED: 'info',
      PAID: 'success',
      PARTIALLY_PAID: 'warning',
      CLOSED_ARCHIVED: 'success',
      CANCELLED_VOIDED: 'danger',
      OVERDUE: 'danger',
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

  const generatePDF = useCallback(async (invoice: any) => {
    setIsGeneratingPdf(true);
    try {
      const doc = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4',
      });
      
      const pageWidth = 210;
      const pageHeight = 297;
      const margin = 20;
      const contentWidth = pageWidth - (margin * 2);
      
      const sellerName = 'RadioPharma Manufacturing Co.';
      const vatNumber = '300000000000003';
      const zatcaData = generateZatcaQRData(invoice, sellerName, vatNumber);
      
      let qrDataUrl = '';
      try {
        qrDataUrl = await QRCode.toDataURL(zatcaData, { 
          width: 100, 
          margin: 1,
          errorCorrectionLevel: 'M'
        });
      } catch (e) {
        console.error('QR generation error:', e);
      }
      
      doc.setFillColor(30, 58, 95);
      doc.rect(0, 0, pageWidth, 45, 'F');
      
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(24);
      doc.setFont('helvetica', 'bold');
      doc.text('INVOICE', margin, 25);
      
      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      doc.text(invoice.invoiceNumber, margin, 35);
      
      doc.setFontSize(12);
      doc.setFont('helvetica', 'bold');
      doc.text(sellerName, pageWidth - margin, 20, { align: 'right' });
      doc.setFontSize(9);
      doc.setFont('helvetica', 'normal');
      doc.text('Riyadh, Saudi Arabia', pageWidth - margin, 27, { align: 'right' });
      doc.text(`VAT: ${vatNumber}`, pageWidth - margin, 34, { align: 'right' });
      
      let yPos = 60;
      
      doc.setTextColor(100, 100, 100);
      doc.setFontSize(9);
      doc.text('BILL TO', margin, yPos);
      
      doc.setTextColor(0, 0, 0);
      doc.setFontSize(12);
      doc.setFont('helvetica', 'bold');
      doc.text(invoice.customer?.name || 'Customer', margin, yPos + 7);
      
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(10);
      if (invoice.customer?.address) {
        doc.text(invoice.customer.address, margin, yPos + 14);
      }
      
      const invoiceDateFormatted = formatDateOnly(invoice.invoiceDate);
      const dueDateFormatted = formatDateOnly(invoice.dueDate);
      
      doc.setTextColor(100, 100, 100);
      doc.setFontSize(9);
      doc.text('INVOICE DATE', pageWidth - margin - 50, yPos, { align: 'left' });
      doc.text('DUE DATE', pageWidth - margin - 50, yPos + 15, { align: 'left' });
      
      doc.setTextColor(0, 0, 0);
      doc.setFontSize(10);
      doc.text(invoiceDateFormatted, pageWidth - margin - 50, yPos + 6);
      doc.text(dueDateFormatted, pageWidth - margin - 50, yPos + 21);
      
      yPos = 105;
      
      doc.setFillColor(245, 247, 250);
      doc.rect(margin, yPos, contentWidth, 10, 'F');
      
      doc.setTextColor(100, 100, 100);
      doc.setFontSize(8);
      doc.setFont('helvetica', 'bold');
      doc.text('DESCRIPTION', margin + 3, yPos + 7);
      doc.text('QTY', margin + 95, yPos + 7);
      doc.text('UNIT PRICE', margin + 115, yPos + 7);
      doc.text('TOTAL', margin + contentWidth - 3, yPos + 7, { align: 'right' });
      
      yPos += 15;
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(0, 0, 0);
      doc.setFontSize(10);
      
      if (invoice.items && invoice.items.length > 0) {
        invoice.items.forEach((item: any) => {
          doc.text(item.description || 'Item', margin + 3, yPos);
          doc.text(item.quantity?.toString() || '1', margin + 95, yPos);
          doc.text(`${SYSTEM_CURRENCY} ${item.unitPrice?.toFixed(2) || '0.00'}`, margin + 115, yPos);
          doc.text(`${SYSTEM_CURRENCY} ${item.lineTotal?.toFixed(2) || '0.00'}`, margin + contentWidth - 3, yPos, { align: 'right' });
          
          doc.setDrawColor(230, 230, 230);
          doc.line(margin, yPos + 3, margin + contentWidth, yPos + 3);
          
          yPos += 10;
        });
      }
      
      yPos += 10;
      const totalsX = margin + 100;
      
      doc.setFontSize(10);
      doc.setTextColor(100, 100, 100);
      doc.text('Subtotal:', totalsX, yPos);
      doc.setTextColor(0, 0, 0);
      doc.text(`${SYSTEM_CURRENCY} ${invoice.subtotal?.toFixed(2) || '0.00'}`, margin + contentWidth - 3, yPos, { align: 'right' });
      
      yPos += 8;
      doc.setTextColor(100, 100, 100);
      doc.text(`VAT (${invoice.taxRate || 15}%):`, totalsX, yPos);
      doc.setTextColor(0, 0, 0);
      doc.text(`${SYSTEM_CURRENCY} ${invoice.taxAmount?.toFixed(2) || '0.00'}`, margin + contentWidth - 3, yPos, { align: 'right' });
      
      yPos += 10;
      doc.setFillColor(30, 58, 95);
      doc.rect(totalsX - 5, yPos - 5, contentWidth - totalsX + margin + 5, 12, 'F');
      
      doc.setTextColor(255, 255, 255);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(11);
      doc.text('TOTAL:', totalsX, yPos + 3);
      doc.text(`${SYSTEM_CURRENCY} ${invoice.totalAmount?.toFixed(2) || '0.00'}`, margin + contentWidth - 3, yPos + 3, { align: 'right' });
      
      if (invoice.paidAmount > 0) {
        yPos += 18;
        doc.setTextColor(34, 197, 94);
        doc.setFontSize(10);
        doc.text(`Paid: ${SYSTEM_CURRENCY} ${invoice.paidAmount?.toFixed(2)}`, totalsX, yPos);
        
        const balance = invoice.totalAmount - invoice.paidAmount;
        if (balance > 0) {
          yPos += 8;
          doc.setTextColor(239, 68, 68);
          doc.text(`Balance Due: ${SYSTEM_CURRENCY} ${balance.toFixed(2)}`, totalsX, yPos);
        }
      }
      
      if (qrDataUrl) {
        const qrSize = 30;
        doc.addImage(qrDataUrl, 'PNG', margin, pageHeight - margin - qrSize - 15, qrSize, qrSize);
        
        doc.setTextColor(100, 100, 100);
        doc.setFontSize(7);
        doc.text('ZATCA E-Invoice QR Code', margin, pageHeight - margin - 12);
      }
      
      doc.setTextColor(100, 100, 100);
      doc.setFontSize(8);
      doc.setFont('helvetica', 'normal');
      doc.text('Thank you for your business!', pageWidth / 2, pageHeight - margin - 5, { align: 'center' });
      
      doc.setDrawColor(200, 200, 200);
      doc.line(margin, pageHeight - margin - 20, pageWidth - margin, pageHeight - margin - 20);
      
      doc.save(`Invoice_${invoice.invoiceNumber}.pdf`);
    } catch (error) {
      console.error('PDF generation error:', error);
      alert('Failed to generate PDF. Please try again.');
    } finally {
      setIsGeneratingPdf(false);
    }
  }, []);

  const customerOrders = deliveredOrders?.filter((o: any) => o.customerId === createForm.customerId) || [];

  const paidCount = invoices?.filter((i: any) => i.status === 'PAID' || i.status === 'CLOSED_ARCHIVED').length || 0;
  const issuedCount = invoices?.filter((i: any) => i.status === 'ISSUED_POSTED').length || 0;
  const draftCount = invoices?.filter((i: any) => i.status === 'DRAFT').length || 0;
  const pendingApprovalCount = invoices?.filter((i: any) => i.status === 'PENDING_APPROVAL').length || 0;

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
          <h2 style={{ fontSize: '1.25rem', fontWeight: 600, marginBottom: '0.25rem' }}>Invoicing</h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', margin: 0 }}>
            Generate invoices from delivered orders and track payments
          </p>
        </div>
        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
          <select
            className="form-select"
            style={{ width: 'auto', minWidth: '140px' }}
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="">All Statuses</option>
            <option value="DRAFT">Draft</option>
            <option value="PENDING_APPROVAL">Pending Approval</option>
            <option value="ISSUED_POSTED">Issued</option>
            <option value="PARTIALLY_PAID">Partially Paid</option>
            <option value="PAID">Paid</option>
            <option value="CLOSED_ARCHIVED">Closed</option>
            <option value="CANCELLED_VOIDED">Voided</option>
          </select>
          <button className="btn btn-primary" onClick={() => setShowCreateModal(true)}>
            <Plus size={16} /> Generate Invoice
          </button>
        </div>
      </div>

      {summary && (
        <div className="grid" style={{ gridTemplateColumns: 'repeat(5, 1fr)', gap: '1rem', marginBottom: '1.5rem' }}>
          <KpiCard 
            title="Pending Approval" 
            value={summary.pendingApproval || pendingApprovalCount}
            icon={<Clock size={20} />}
            color="warning"
            onClick={() => setStatusFilter('PENDING_APPROVAL')}
            selected={statusFilter === 'PENDING_APPROVAL'}
          />
          <KpiCard 
            title="Issued" 
            value={summary.issued || issuedCount}
            icon={<Send size={20} />}
            color="info"
            onClick={() => setStatusFilter('ISSUED_POSTED')}
            selected={statusFilter === 'ISSUED_POSTED'}
          />
          <KpiCard 
            title="Outstanding" 
            value={`SAR ${((summary.outstanding || 0) / 1000)?.toFixed(1)}k`}
            icon={<DollarSign size={20} />}
            color="primary"
            onClick={() => setStatusFilter('')}
            selected={!statusFilter}
          />
          <KpiCard 
            title="Paid" 
            value={summary.paid || paidCount}
            icon={<CheckCircle size={20} />}
            color="success"
            onClick={() => setStatusFilter('PAID')}
            selected={statusFilter === 'PAID'}
          />
          <KpiCard 
            title="Overdue" 
            value={summary.overdue || 0}
            icon={<AlertCircle size={20} />}
            color="danger"
            onClick={() => setStatusFilter('OVERDUE')}
            selected={statusFilter === 'OVERDUE'}
          />
        </div>
      )}

      <div className="grid" style={{ gridTemplateColumns: selectedInvoice ? '1fr 440px' : '1fr', gap: '1.5rem' }}>
        <div className="card">
          <table className="table">
            <thead>
              <tr>
                <th>Invoice</th>
                <th>Customer</th>
                <th>Date</th>
                <th>Amount</th>
                <th>Status</th>
                <th style={{ width: '140px' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {invoices?.map((invoice: any) => {
                const isOverdue = ['SENT', 'PARTIALLY_PAID'].includes(invoice.status) && 
                  new Date(invoice.dueDate) < new Date();
                const balance = invoice.totalAmount - invoice.paidAmount;
                return (
                  <tr 
                    key={invoice.id}
                    style={{ 
                      cursor: 'pointer',
                      backgroundColor: selectedInvoice?.id === invoice.id ? 'var(--bg-secondary)' : undefined
                    }}
                    onClick={() => {
                      setSelectedInvoice(invoice);
                      setDetailTab('details');
                    }}
                  >
                    <td>
                      <div style={{ fontWeight: 600, marginBottom: '0.125rem' }}>{invoice.invoiceNumber}</div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                        Due: {formatDateOnly(invoice.dueDate)}
                      </div>
                    </td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <div style={{ 
                          width: '32px', 
                          height: '32px', 
                          borderRadius: '8px', 
                          background: 'var(--bg-secondary)', 
                          display: 'flex', 
                          alignItems: 'center', 
                          justifyContent: 'center' 
                        }}>
                          <Building2 size={16} style={{ color: 'var(--text-muted)' }} />
                        </div>
                        <span style={{ fontWeight: 500 }}>{invoice.customer?.name}</span>
                      </div>
                    </td>
                    <td>
                      <div style={{ fontSize: '0.875rem' }}>
                        {formatDateOnly(invoice.invoiceDate)}
                      </div>
                    </td>
                    <td>
                      <div style={{ fontWeight: 600, fontSize: '1rem', fontFamily: 'var(--font-mono, monospace)' }}>
                        {formatMoney(invoice.totalAmount)}
                      </div>
                      {invoice.paidAmount > 0 && invoice.paidAmount < invoice.totalAmount && (
                        <div style={{ fontSize: '0.75rem', color: 'var(--success)' }}>
                          Paid: {formatMoney(invoice.paidAmount)}
                        </div>
                      )}
                    </td>
                    <td>
                      <span className={`badge badge-${isOverdue ? 'danger' : getStatusColor(invoice.status)}`}>
                        {isOverdue ? 'OVERDUE' : invoice.status.replace('_', ' ')}
                      </span>
                    </td>
                    <td onClick={(e) => e.stopPropagation()}>
                      <div style={{ display: 'flex', gap: '0.25rem' }}>
                        <button
                          className="btn btn-sm btn-secondary"
                          onClick={() => generatePDF(invoice)}
                          disabled={isGeneratingPdf}
                          title="Download PDF"
                        >
                          <Download size={14} />
                        </button>
                        {invoice.status === 'DRAFT' && (
                          <button
                            className="btn btn-sm btn-primary"
                            onClick={() => submitForApprovalMutation.mutate(invoice.id)}
                            disabled={submitForApprovalMutation.isPending}
                            title="Submit for Approval"
                          >
                            <Send size={14} />
                          </button>
                        )}
                        {invoice.status === 'PENDING_APPROVAL' && (
                          <button
                            className="btn btn-sm btn-success"
                            onClick={() => approvePostMutation.mutate(invoice.id)}
                            disabled={approvePostMutation.isPending}
                            title="Approve & Post"
                          >
                            <CheckCircle size={14} />
                          </button>
                        )}
                        {['ISSUED_POSTED', 'PARTIALLY_PAID'].includes(invoice.status) && (
                          <button
                            className="btn btn-sm btn-secondary"
                            style={{ background: 'rgba(34, 197, 94, 0.1)', color: 'var(--success)', border: 'none' }}
                            onClick={() => {
                              setPaymentForm({
                                ...paymentForm,
                                amount: balance.toFixed(2),
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
                  <td colSpan={6} style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '3rem' }}>
                    <Receipt size={40} style={{ opacity: 0.2, marginBottom: '0.75rem' }} />
                    <div>No invoices found</div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {selectedInvoice && (
          <div className="card" style={{ padding: 0 }}>
            <div style={{ 
              padding: '1.25rem',
              borderBottom: '1px solid var(--border)',
              background: 'var(--bg-secondary)',
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                    <span className={`badge badge-${getStatusColor(selectedInvoice.status)}`}>
                      {selectedInvoice.status.replace('_', ' ')}
                    </span>
                  </div>
                  <h3 style={{ fontWeight: 600, fontSize: '1.125rem', marginBottom: '0.25rem' }}>
                    Invoice {selectedInvoice.invoiceNumber}
                  </h3>
                  <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', margin: 0 }}>
                    {selectedInvoice.customer?.name}
                  </p>
                </div>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <button 
                    className="btn btn-sm btn-secondary"
                    onClick={() => generatePDF(selectedInvoice)}
                    disabled={isGeneratingPdf}
                    title="Download PDF"
                  >
                    <Printer size={14} />
                  </button>
                  <button 
                    className="btn btn-sm btn-secondary" 
                    onClick={() => setSelectedInvoice(null)}
                    style={{ borderRadius: '50%', width: '28px', height: '28px', padding: 0 }}
                  >
                    <X size={14} />
                  </button>
                </div>
              </div>
            </div>

            <div style={{ borderBottom: '1px solid var(--border)' }}>
              <div style={{ display: 'flex', padding: '0 1rem' }}>
                <button 
                  style={{ 
                    padding: '0.75rem 1rem',
                    background: 'none',
                    border: 'none',
                    borderBottom: detailTab === 'details' ? '2px solid var(--primary)' : '2px solid transparent',
                    color: detailTab === 'details' ? 'var(--primary)' : 'var(--text-muted)',
                    fontWeight: 500,
                    cursor: 'pointer',
                    fontSize: '0.875rem',
                  }}
                  onClick={() => setDetailTab('details')}
                >
                  Invoice Details
                </button>
                <button 
                  style={{ 
                    padding: '0.75rem 1rem',
                    background: 'none',
                    border: 'none',
                    borderBottom: detailTab === 'payments' ? '2px solid var(--primary)' : '2px solid transparent',
                    color: detailTab === 'payments' ? 'var(--primary)' : 'var(--text-muted)',
                    fontWeight: 500,
                    cursor: 'pointer',
                    fontSize: '0.875rem',
                  }}
                  onClick={() => setDetailTab('payments')}
                >
                  Payments ({selectedInvoice.payments?.length || 0})
                </button>
                <button 
                  style={{ 
                    padding: '0.75rem 1rem',
                    background: 'none',
                    border: 'none',
                    borderBottom: detailTab === 'attachments' ? '2px solid var(--primary)' : '2px solid transparent',
                    color: detailTab === 'attachments' ? 'var(--primary)' : 'var(--text-muted)',
                    fontWeight: 500,
                    cursor: 'pointer',
                    fontSize: '0.875rem',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.375rem',
                  }}
                  onClick={() => setDetailTab('attachments')}
                >
                  <Paperclip size={14} /> Documents
                </button>
              </div>
            </div>

            <div style={{ padding: '1.25rem' }}>
              {detailTab === 'details' && (
                <>
                  <div className="grid" style={{ gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginBottom: '1.25rem' }}>
                    <div style={{ 
                      padding: '0.875rem', 
                      background: 'var(--bg-secondary)', 
                      borderRadius: 'var(--radius)',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.75rem'
                    }}>
                      <Calendar size={18} style={{ color: 'var(--primary)' }} />
                      <div>
                        <div style={{ fontSize: '0.6875rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Invoice Date</div>
                        <div style={{ fontWeight: 500 }}>{formatDateOnly(selectedInvoice.invoiceDate)}</div>
                      </div>
                    </div>
                    <div style={{ 
                      padding: '0.875rem', 
                      background: 'var(--bg-secondary)', 
                      borderRadius: 'var(--radius)',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.75rem'
                    }}>
                      <Clock size={18} style={{ color: new Date(selectedInvoice.dueDate) < new Date() ? 'var(--danger)' : 'var(--warning)' }} />
                      <div>
                        <div style={{ fontSize: '0.6875rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Due Date</div>
                        <div style={{ fontWeight: 500, color: new Date(selectedInvoice.dueDate) < new Date() ? 'var(--danger)' : undefined }}>
                          {formatDateOnly(selectedInvoice.dueDate)}
                        </div>
                      </div>
                    </div>
                  </div>

                  <div style={{ 
                    background: 'linear-gradient(135deg, var(--primary) 0%, #1e40af 100%)', 
                    color: 'white', 
                    padding: '1.25rem', 
                    borderRadius: 'var(--radius)',
                    marginBottom: '1.25rem'
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <div>
                        <div style={{ fontSize: '0.75rem', opacity: 0.8, marginBottom: '0.25rem' }}>Total Amount</div>
                        <div style={{ fontSize: '1.75rem', fontWeight: 700 }}>{formatMoney(selectedInvoice.totalAmount)}</div>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <div style={{ fontSize: '0.75rem', opacity: 0.8, marginBottom: '0.25rem' }}>Paid</div>
                        <div style={{ fontSize: '1.25rem', fontWeight: 600 }}>{formatMoney(selectedInvoice.paidAmount)}</div>
                      </div>
                    </div>
                    {selectedInvoice.totalAmount - selectedInvoice.paidAmount > 0 && (
                      <div style={{ 
                        marginTop: '0.75rem', 
                        paddingTop: '0.75rem', 
                        borderTop: '1px solid rgba(255,255,255,0.2)',
                        display: 'flex',
                        justifyContent: 'space-between'
                      }}>
                        <span style={{ fontSize: '0.875rem', opacity: 0.8 }}>Balance Due</span>
                        <span style={{ fontWeight: 600 }}>{formatMoney(selectedInvoice.totalAmount - selectedInvoice.paidAmount)}</span>
                      </div>
                    )}
                  </div>

                  <div style={{ marginBottom: '1rem' }}>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '0.75rem' }}>
                      Line Items
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                      {selectedInvoice.items?.map((item: any) => (
                        <div 
                          key={item.id}
                          style={{ 
                            padding: '0.875rem',
                            border: '1px solid var(--border)',
                            borderRadius: 'var(--radius)',
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center'
                          }}
                        >
                          <div style={{ flex: 1 }}>
                            <div style={{ fontWeight: 500, marginBottom: '0.125rem' }}>{item.description}</div>
                            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                              {item.quantity} x {formatMoney(item.unitPrice)}
                            </div>
                          </div>
                          <div style={{ fontWeight: 600, color: 'var(--primary)' }}>
                            {formatMoney(item.lineTotal)}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div style={{ 
                    padding: '1rem', 
                    background: 'var(--bg-secondary)', 
                    borderRadius: 'var(--radius)'
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                      <span style={{ color: 'var(--text-muted)' }}>Subtotal</span>
                      <span>{formatMoney(selectedInvoice.subtotal)}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                      <span style={{ color: 'var(--text-muted)' }}>VAT ({selectedInvoice.taxRate || 15}%)</span>
                      <span>{formatMoney(selectedInvoice.taxAmount)}</span>
                    </div>
                    <div style={{ 
                      display: 'flex', 
                      justifyContent: 'space-between', 
                      paddingTop: '0.5rem',
                      borderTop: '1px solid var(--border)',
                      fontWeight: 600
                    }}>
                      <span>Total</span>
                      <span>{formatMoney(selectedInvoice.totalAmount)}</span>
                    </div>
                  </div>
                </>
              )}

              {detailTab === 'payments' && (
                <>
                  {selectedInvoice.payments?.length > 0 ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                      {selectedInvoice.payments.map((payment: any) => (
                        <div 
                          key={payment.id}
                          style={{ 
                            padding: '1rem',
                            border: '1px solid var(--border)',
                            borderRadius: 'var(--radius)',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.75rem'
                          }}
                        >
                          <div style={{ 
                            width: '40px', 
                            height: '40px', 
                            borderRadius: '10px', 
                            background: 'rgba(34, 197, 94, 0.1)', 
                            display: 'flex', 
                            alignItems: 'center', 
                            justifyContent: 'center' 
                          }}>
                            <CheckCircle size={20} style={{ color: 'var(--success)' }} />
                          </div>
                          <div style={{ flex: 1 }}>
                            <div style={{ fontWeight: 600, color: 'var(--success)', marginBottom: '0.125rem' }}>
                              {formatMoney(payment.amount)}
                            </div>
                            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                              {formatDateOnly(payment.paymentDate)} via {payment.paymentMethod.replace('_', ' ')}
                            </div>
                          </div>
                          {payment.referenceNumber && (
                            <div style={{ 
                              fontSize: '0.75rem', 
                              color: 'var(--text-muted)',
                              fontFamily: 'monospace'
                            }}>
                              #{payment.referenceNumber}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div style={{ 
                      textAlign: 'center', 
                      padding: '2.5rem 1rem', 
                      color: 'var(--text-muted)',
                      background: 'var(--bg-secondary)',
                      borderRadius: 'var(--radius)'
                    }}>
                      <CreditCard size={32} style={{ opacity: 0.3, marginBottom: '0.75rem' }} />
                      <div style={{ marginBottom: '0.25rem' }}>No payments recorded</div>
                      <div style={{ fontSize: '0.75rem' }}>Payments will appear here once recorded</div>
                    </div>
                  )}

                  {['SENT', 'PARTIALLY_PAID'].includes(selectedInvoice.status) && (
                    <button
                      className="btn btn-primary"
                      style={{ width: '100%', marginTop: '1rem' }}
                      onClick={() => {
                        const balance = selectedInvoice.totalAmount - selectedInvoice.paidAmount;
                        setPaymentForm({ ...paymentForm, amount: balance.toFixed(2) });
                        setShowPaymentModal(selectedInvoice);
                      }}
                    >
                      <CreditCard size={18} /> Record Payment
                    </button>
                  )}
                </>
              )}

              {detailTab === 'attachments' && (
                <AttachmentPanel
                  entityType="INVOICE"
                  entityId={selectedInvoice.id}
                  title="Invoice Documents"
                />
              )}
            </div>
          </div>
        )}
      </div>

      {showCreateModal && (
        <div className="modal-overlay" onClick={() => setShowCreateModal(false)}>
          <div className="modal" style={{ maxWidth: '560px' }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3 style={{ fontWeight: 600, margin: 0 }}>Generate Invoice</h3>
              <button onClick={() => setShowCreateModal(false)} style={{ background: 'var(--bg-secondary)', border: 'none', borderRadius: 'var(--radius)', padding: '0.375rem', cursor: 'pointer', fontSize: '1.25rem', lineHeight: 1 }}>&times;</button>
            </div>
            <div className="modal-body">
              <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', marginBottom: '1.5rem' }}>
                Select delivered orders to include in the invoice
              </p>
              <div className="form-group">
                <label className="form-label">Customer *</label>
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
                  <label className="form-label">Select Delivered Orders *</label>
                  <div style={{ 
                    maxHeight: '200px', 
                    overflow: 'auto', 
                    border: '1px solid var(--border)', 
                    borderRadius: 'var(--radius)', 
                  }}>
                    {customerOrders.length > 0 ? customerOrders.map((order: any) => (
                      <label 
                        key={order.id} 
                        style={{ 
                          display: 'flex', 
                          alignItems: 'center', 
                          gap: '0.75rem', 
                          padding: '0.75rem 1rem', 
                          cursor: 'pointer',
                          borderBottom: '1px solid var(--border)',
                          backgroundColor: createForm.selectedOrders.includes(order.id) ? 'rgba(59, 130, 246, 0.1)' : undefined
                        }}
                      >
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
                          style={{ width: '16px', height: '16px' }}
                        />
                        <div style={{ flex: 1 }}>
                          <div style={{ fontWeight: 500, fontFamily: 'monospace', fontSize: '0.8125rem' }}>{order.orderNumber}</div>
                          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                            {order.product?.name} - {order.requestedActivity} {order.activityUnit}
                          </div>
                        </div>
                      </label>
                    )) : (
                      <p style={{ color: 'var(--text-muted)', textAlign: 'center', padding: '2rem' }}>
                        No delivered orders for this customer
                      </p>
                    )}
                  </div>
                  {createForm.selectedOrders.length > 0 && (
                    <div style={{ marginTop: '0.5rem', fontSize: '0.875rem', color: 'var(--primary)' }}>
                      {createForm.selectedOrders.length} order(s) selected
                    </div>
                  )}
                </div>
              )}
              <div className="form-group">
                <label className="form-label">VAT Rate (%)</label>
                <input
                  type="number"
                  className="form-input"
                  value={createForm.taxRate}
                  onChange={(e) => setCreateForm({ ...createForm, taxRate: parseFloat(e.target.value) || 0 })}
                  min="0"
                  max="100"
                  step="0.5"
                />
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
                  Saudi Arabia standard VAT is 15%
                </div>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setShowCreateModal(false)}>
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
          <div className="modal" style={{ maxWidth: '440px' }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3 style={{ fontWeight: 600, margin: 0 }}>Record Payment</h3>
              <button onClick={() => setShowPaymentModal(null)} style={{ background: 'var(--bg-secondary)', border: 'none', borderRadius: 'var(--radius)', padding: '0.375rem', cursor: 'pointer', fontSize: '1.25rem', lineHeight: 1 }}>&times;</button>
            </div>
            <div className="modal-body">
              <div style={{ 
                padding: '1rem', 
                background: 'var(--bg-secondary)', 
                borderRadius: 'var(--radius)',
                marginBottom: '1.5rem'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                  <span style={{ color: 'var(--text-muted)' }}>Invoice</span>
                  <span style={{ fontWeight: 500 }}>{showPaymentModal.invoiceNumber}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: 'var(--text-muted)' }}>Outstanding</span>
                  <span style={{ fontWeight: 600, color: 'var(--danger)' }}>
                    {formatMoney(showPaymentModal.totalAmount - showPaymentModal.paidAmount)}
                  </span>
                </div>
              </div>
              <div className="form-group">
                <label className="form-label">Amount *</label>
                <input
                  type="number"
                  className="form-input"
                  value={paymentForm.amount}
                  onChange={(e) => setPaymentForm({ ...paymentForm, amount: e.target.value })}
                  step="0.01"
                  placeholder="Enter payment amount"
                />
              </div>
              <div className="form-group">
                <label className="form-label">Payment Method</label>
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
                <label className="form-label">Reference Number</label>
                <input
                  type="text"
                  className="form-input"
                  value={paymentForm.referenceNumber}
                  onChange={(e) => setPaymentForm({ ...paymentForm, referenceNumber: e.target.value })}
                  placeholder="e.g., Check #, Transaction ID"
                />
              </div>
              <div className="form-group">
                <label className="form-label">Notes</label>
                <textarea
                  className="form-input"
                  value={paymentForm.notes}
                  onChange={(e) => setPaymentForm({ ...paymentForm, notes: e.target.value })}
                  rows={2}
                  placeholder="Optional notes"
                />
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setShowPaymentModal(null)}>
                Cancel
              </button>
              <button
                className="btn btn-primary"
                onClick={handlePayment}
                disabled={paymentMutation.isPending || !paymentForm.amount}
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
