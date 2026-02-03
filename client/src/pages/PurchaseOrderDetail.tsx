import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../lib/api';
import { format } from 'date-fns';
import {
  FileText,
  ShoppingCart,
  Package,
  Truck,
  History,
  Edit,
  Send,
  Check,
  X,
  DollarSign,
  Clock,
  User,
  Building2,
  AlertCircle,
} from 'lucide-react';
import { EntityDetailLayout, EntityKpi, EntityTab, EmptyState } from '../components/shared';
import { LinkedRecord } from '../components/shared/LinkedRecordsSidebar';
import { TimelineEvent } from '../components/shared/Timeline';
import { useToast } from '../components/ui/Toast';
import AttachmentPanel from '../components/AttachmentPanel';

function safeFormat(date: any, formatStr: string): string {
  try {
    if (!date) return '-';
    const d = new Date(date);
    if (isNaN(d.getTime())) return '-';
    return format(d, formatStr);
  } catch {
    return '-';
  }
}

const STATUS_COLORS: Record<string, string> = {
  DRAFT: 'default',
  PENDING_APPROVAL: 'warning',
  APPROVED: 'info',
  SENT: 'info',
  ACKNOWLEDGED: 'info',
  PARTIALLY_RECEIVED: 'warning',
  RECEIVED: 'success',
  CLOSED: 'success',
  CANCELLED: 'danger',
};

export default function PurchaseOrderDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const toast = useToast();

  const { data: po, isLoading } = useQuery({
    queryKey: ['purchase-order', id],
    queryFn: async () => {
      const { data } = await api.get(`/purchase-orders/${id}`);
      return data;
    },
    enabled: !!id,
  });

  const { data: auditLogs } = useQuery({
    queryKey: ['po-audit', id],
    queryFn: async () => {
      const { data } = await api.get(`/audit?entityType=PurchaseOrder&entityId=${id}`);
      return data;
    },
    enabled: !!id,
  });

  const submitMutation = useMutation({
    mutationFn: async () => {
      const { data } = await api.post(`/purchase-orders/${id}/submit`);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['purchase-order', id] });
      toast.success('Purchase order submitted for approval');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error || 'Failed to submit PO');
    },
  });

  const approveMutation = useMutation({
    mutationFn: async () => {
      const { data } = await api.post(`/purchase-orders/${id}/approve`);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['purchase-order', id] });
      toast.success('Purchase order approved');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error || 'Failed to approve PO');
    },
  });

  const sendMutation = useMutation({
    mutationFn: async () => {
      const { data } = await api.post(`/purchase-orders/${id}/send`);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['purchase-order', id] });
      toast.success('Purchase order sent to supplier');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error || 'Failed to send PO');
    },
  });

  if (isLoading) {
    return (
      <div className="loading-overlay">
        <div className="spinner" />
      </div>
    );
  }

  if (!po) {
    return (
      <div style={{ padding: '2rem', textAlign: 'center' }}>
        <EmptyState
          icon="search"
          title="Purchase Order Not Found"
          message="The purchase order you're looking for doesn't exist or has been deleted."
          ctaLabel="Back to Purchase Orders"
          onCta={() => navigate('/purchase-orders')}
        />
      </div>
    );
  }

  const totalItems = po.items?.length || 0;
  const totalValue = po.items?.reduce((sum: number, item: any) => 
    sum + (Number(item.quantity) * Number(item.unitPrice)), 0) || 0;
  const receivedQty = po.grns?.reduce((sum: number, grn: any) => 
    sum + grn.items?.reduce((s: number, i: any) => s + Number(i.receivedQuantity || 0), 0), 0) || 0;
  const orderedQty = po.items?.reduce((sum: number, item: any) => sum + Number(item.quantity), 0) || 0;
  const receiptRate = orderedQty > 0 ? Math.round((receivedQty / orderedQty) * 100) : 0;

  const kpis: EntityKpi[] = [
    {
      title: 'Line Items',
      value: totalItems,
      icon: <Package size={24} />,
      color: 'primary',
    },
    {
      title: 'Total Value',
      value: `${totalValue.toLocaleString()} ${po.currency || 'SAR'}`,
      icon: <DollarSign size={24} />,
      color: 'success',
    },
    {
      title: 'Receipt Rate',
      value: `${receiptRate}%`,
      icon: <Truck size={24} />,
      color: receiptRate >= 100 ? 'success' : receiptRate > 0 ? 'warning' : 'default',
    },
    {
      title: 'GRNs',
      value: po.grns?.length || 0,
      icon: <FileText size={24} />,
      color: 'info',
    },
  ];

  const linkedRecords: LinkedRecord[] = [];

  if (po.supplier) {
    linkedRecords.push({
      type: 'supplier',
      label: po.supplier.name,
      link: `/suppliers/${po.supplier.id}`,
    });
  }

  if (po.grns?.length > 0) {
    linkedRecords.push({
      type: 'grn',
      label: 'Goods Receipts',
      link: `/grn?purchaseOrderId=${id}`,
      count: po.grns.length,
    });
  }

  const timeline: TimelineEvent[] = (auditLogs || []).map((log: any) => ({
    id: log.id,
    title: log.action.replace(/_/g, ' '),
    description: log.details || '',
    timestamp: log.createdAt,
    actor: log.user?.firstName ? `${log.user.firstName} ${log.user.lastName}` : 'System',
    type: log.action.includes('APPROVED') ? 'success' : 
          log.action.includes('REJECTED') || log.action.includes('CANCELLED') ? 'error' : 'info',
  }));

  const getActions = () => {
    const actions: any[] = [];
    
    if (po.status === 'DRAFT') {
      actions.push({
        label: 'Submit for Approval',
        icon: <Send size={16} />,
        onClick: () => submitMutation.mutate(),
        variant: 'primary',
        loading: submitMutation.isPending,
      });
    }
    
    if (po.status === 'PENDING_APPROVAL') {
      actions.push({
        label: 'Approve',
        icon: <Check size={16} />,
        onClick: () => approveMutation.mutate(),
        variant: 'primary',
        loading: approveMutation.isPending,
      });
    }
    
    if (po.status === 'APPROVED') {
      actions.push({
        label: 'Send to Supplier',
        icon: <Send size={16} />,
        onClick: () => sendMutation.mutate(),
        variant: 'primary',
        loading: sendMutation.isPending,
      });
    }
    
    if (po.status === 'DRAFT' || po.status === 'PENDING_APPROVAL') {
      actions.push({
        label: 'Edit',
        icon: <Edit size={16} />,
        onClick: () => navigate('/purchase-orders'),
        variant: 'secondary',
      });
    }
    
    return actions;
  };

  const tabs: EntityTab[] = [
    {
      key: 'overview',
      label: 'Overview',
      icon: <FileText size={16} />,
      content: (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1.5rem' }}>
          <div>
            <h4 style={{ marginBottom: '1rem', fontWeight: 600 }}>Order Details</h4>
            <table style={{ width: '100%', fontSize: '0.875rem' }}>
              <tbody>
                <tr>
                  <td style={{ padding: '0.5rem 0', color: 'var(--text-muted)', width: '40%' }}>Order Date</td>
                  <td style={{ padding: '0.5rem 0' }}>{safeFormat(po.orderDate, 'dd MMM yyyy')}</td>
                </tr>
                <tr>
                  <td style={{ padding: '0.5rem 0', color: 'var(--text-muted)' }}>Expected Delivery</td>
                  <td style={{ padding: '0.5rem 0' }}>{safeFormat(po.expectedDeliveryDate, 'dd MMM yyyy')}</td>
                </tr>
                <tr>
                  <td style={{ padding: '0.5rem 0', color: 'var(--text-muted)' }}>Currency</td>
                  <td style={{ padding: '0.5rem 0' }}>{po.currency || 'SAR'}</td>
                </tr>
                <tr>
                  <td style={{ padding: '0.5rem 0', color: 'var(--text-muted)' }}>Payment Terms</td>
                  <td style={{ padding: '0.5rem 0' }}>{po.paymentTerms || '-'}</td>
                </tr>
              </tbody>
            </table>
          </div>

          <div>
            <h4 style={{ marginBottom: '1rem', fontWeight: 600 }}>Supplier</h4>
            {po.supplier ? (
              <div style={{ fontSize: '0.875rem' }}>
                <div style={{ fontWeight: 500, marginBottom: '0.5rem' }}>{po.supplier.name}</div>
                {po.supplier.email && <div style={{ color: 'var(--text-secondary)' }}>{po.supplier.email}</div>}
                {po.supplier.phone && <div style={{ color: 'var(--text-secondary)' }}>{po.supplier.phone}</div>}
                <button 
                  className="btn btn-secondary btn-sm" 
                  style={{ marginTop: '0.5rem' }}
                  onClick={() => navigate(`/suppliers/${po.supplier.id}`)}
                >
                  View Supplier
                </button>
              </div>
            ) : (
              <span style={{ color: 'var(--text-muted)' }}>No supplier assigned</span>
            )}
          </div>

          <div>
            <h4 style={{ marginBottom: '1rem', fontWeight: 600 }}>Financial Summary</h4>
            <table style={{ width: '100%', fontSize: '0.875rem' }}>
              <tbody>
                <tr>
                  <td style={{ padding: '0.5rem 0', color: 'var(--text-muted)', width: '40%' }}>Subtotal</td>
                  <td style={{ padding: '0.5rem 0' }}>{Number(po.subtotal || 0).toLocaleString()} {po.currency || 'SAR'}</td>
                </tr>
                <tr>
                  <td style={{ padding: '0.5rem 0', color: 'var(--text-muted)' }}>VAT ({po.vatRate || 15}%)</td>
                  <td style={{ padding: '0.5rem 0' }}>{Number(po.vatAmount || 0).toLocaleString()} {po.currency || 'SAR'}</td>
                </tr>
                <tr style={{ fontWeight: 600 }}>
                  <td style={{ padding: '0.5rem 0', color: 'var(--text-muted)' }}>Total</td>
                  <td style={{ padding: '0.5rem 0' }}>{Number(po.totalAmount || 0).toLocaleString()} {po.currency || 'SAR'}</td>
                </tr>
              </tbody>
            </table>
          </div>

          <div>
            <h4 style={{ marginBottom: '1rem', fontWeight: 600 }}>Workflow</h4>
            <table style={{ width: '100%', fontSize: '0.875rem' }}>
              <tbody>
                <tr>
                  <td style={{ padding: '0.5rem 0', color: 'var(--text-muted)', width: '40%' }}>Created By</td>
                  <td style={{ padding: '0.5rem 0' }}>{po.createdBy?.firstName ? `${po.createdBy.firstName} ${po.createdBy.lastName}` : '-'}</td>
                </tr>
                <tr>
                  <td style={{ padding: '0.5rem 0', color: 'var(--text-muted)' }}>Approved By</td>
                  <td style={{ padding: '0.5rem 0' }}>{po.approvedBy?.firstName ? `${po.approvedBy.firstName} ${po.approvedBy.lastName}` : '-'}</td>
                </tr>
                <tr>
                  <td style={{ padding: '0.5rem 0', color: 'var(--text-muted)' }}>Approved At</td>
                  <td style={{ padding: '0.5rem 0' }}>{safeFormat(po.approvedAt, 'dd MMM yyyy HH:mm')}</td>
                </tr>
              </tbody>
            </table>
          </div>

          {po.notes && (
            <div style={{ gridColumn: '1 / -1' }}>
              <h4 style={{ marginBottom: '1rem', fontWeight: 600 }}>Notes</h4>
              <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', whiteSpace: 'pre-wrap' }}>
                {po.notes}
              </p>
            </div>
          )}
        </div>
      ),
    },
    {
      key: 'items',
      label: 'Line Items',
      icon: <Package size={16} />,
      badge: totalItems,
      content: po.items?.length > 0 ? (
        <div>
          <table className="table">
            <thead>
              <tr>
                <th>#</th>
                <th>Description</th>
                <th>Unit</th>
                <th style={{ textAlign: 'right' }}>Qty</th>
                <th style={{ textAlign: 'right' }}>Unit Price</th>
                <th style={{ textAlign: 'right' }}>Total</th>
              </tr>
            </thead>
            <tbody>
              {po.items.map((item: any) => (
                <tr key={item.id}>
                  <td>{item.lineNumber}</td>
                  <td>
                    <div style={{ fontWeight: 500 }}>{item.description}</div>
                    {item.materialCode && (
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                        {item.materialCode}
                      </div>
                    )}
                  </td>
                  <td>{item.unit || 'EA'}</td>
                  <td style={{ textAlign: 'right' }}>{Number(item.quantity).toLocaleString()}</td>
                  <td style={{ textAlign: 'right' }}>{Number(item.unitPrice).toLocaleString()}</td>
                  <td style={{ textAlign: 'right' }}>
                    {(Number(item.quantity) * Number(item.unitPrice)).toLocaleString()}
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr style={{ fontWeight: 600 }}>
                <td colSpan={5} style={{ textAlign: 'right' }}>Total:</td>
                <td style={{ textAlign: 'right' }}>{totalValue.toLocaleString()} {po.currency || 'SAR'}</td>
              </tr>
            </tfoot>
          </table>
        </div>
      ) : (
        <EmptyState
          icon="package"
          title="No Line Items"
          message="No items have been added to this purchase order."
        />
      ),
    },
    {
      key: 'receiving',
      label: 'Receiving',
      icon: <Truck size={16} />,
      badge: po.grns?.length || 0,
      content: po.grns?.length > 0 ? (
        <div>
          <table className="table">
            <thead>
              <tr>
                <th>GRN Number</th>
                <th>Date</th>
                <th>Status</th>
                <th>Items</th>
                <th>Received By</th>
              </tr>
            </thead>
            <tbody>
              {po.grns.map((grn: any) => (
                <tr key={grn.id}>
                  <td style={{ fontFamily: 'monospace' }}>{grn.grnNumber}</td>
                  <td>{safeFormat(grn.receivedDate, 'dd MMM yyyy')}</td>
                  <td>
                    <span className={`badge badge-${
                      grn.status === 'APPROVED' ? 'success' :
                      grn.status === 'REJECTED' ? 'danger' :
                      grn.status === 'PENDING_QC' ? 'warning' : 'default'
                    }`}>
                      {grn.status?.replace(/_/g, ' ')}
                    </span>
                  </td>
                  <td>{grn.items?.length || 0}</td>
                  <td>{grn.receivedBy?.name || '-'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <EmptyState
          icon="truck"
          title="No Receipts"
          message="No goods have been received against this purchase order yet."
        />
      ),
    },
    {
      key: 'documents',
      label: 'Documents',
      icon: <FileText size={16} />,
      content: (
        <AttachmentPanel
          entityType="PurchaseOrder"
          entityId={id!}
        />
      ),
    },
    {
      key: 'timeline',
      label: 'Timeline',
      icon: <History size={16} />,
      badge: timeline.length,
      content: timeline.length > 0 ? (
        <div style={{ maxHeight: '500px', overflowY: 'auto' }}>
          {timeline.map((event: TimelineEvent) => (
            <div key={event.id} style={{ 
              padding: '0.75rem', 
              borderBottom: '1px solid var(--border)',
              display: 'flex',
              gap: '1rem',
              alignItems: 'flex-start'
            }}>
              <div style={{
                width: '8px',
                height: '8px',
                borderRadius: '50%',
                backgroundColor: event.type === 'success' ? 'var(--success)' : 
                                 event.type === 'error' ? 'var(--danger)' : 'var(--primary)',
                marginTop: '0.5rem',
                flexShrink: 0,
              }} />
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 500, marginBottom: '0.25rem' }}>{event.title}</div>
                {event.description && (
                  <div style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>{event.description}</div>
                )}
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
                  {event.actor} • {safeFormat(event.timestamp, 'dd MMM yyyy HH:mm')}
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <EmptyState
          icon="search"
          title="No Activity"
          message="No activity recorded for this purchase order yet."
        />
      ),
    },
  ];

  return (
    <EntityDetailLayout
      title={`Purchase Order ${po.poNumber}`}
      code={po.poNumber}
      status={{
        value: po.status,
        label: po.status?.replace(/_/g, ' '),
        variant: (STATUS_COLORS[po.status] || 'default') as 'default' | 'success' | 'warning' | 'danger' | 'info',
      }}
      metadata={[
        { label: 'Order Date', value: safeFormat(po.orderDate, 'dd MMM yyyy') },
        { label: 'Supplier', value: po.supplier?.name || '-' },
      ]}
      kpis={kpis}
      tabs={tabs}
      defaultTab="overview"
      actions={getActions()}
      linkedRecords={linkedRecords}
      timeline={timeline}
      showTimeline={false}
      backUrl="/purchase-orders"
      backLabel="Purchase Orders"
    />
  );
}
