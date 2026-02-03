import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../lib/api';
import { format } from 'date-fns';
import {
  FileText,
  Package,
  Truck,
  History,
  Edit,
  Check,
  X,
  AlertCircle,
  Clipboard,
  User,
  Calendar,
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
  PENDING_QC: 'warning',
  APPROVED: 'success',
  PARTIALLY_APPROVED: 'info',
  REJECTED: 'danger',
};

export default function GRNDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const toast = useToast();

  const { data: grn, isLoading } = useQuery({
    queryKey: ['grn', id],
    queryFn: async () => {
      const { data } = await api.get(`/grn/${id}`);
      return data;
    },
    enabled: !!id,
  });

  const { data: auditLogs } = useQuery({
    queryKey: ['grn-audit', id],
    queryFn: async () => {
      const { data } = await api.get(`/audit?entityType=GoodsReceivingNote&entityId=${id}`);
      return data.logs || [];
    },
    enabled: !!id,
  });

  const submitMutation = useMutation({
    mutationFn: async () => {
      const { data } = await api.post(`/grn/${id}/submit`);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['grn', id] });
      toast.success('GRN submitted for QC');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error || 'Failed to submit GRN');
    },
  });

  const approveMutation = useMutation({
    mutationFn: async () => {
      const { data } = await api.post(`/grn/${id}/approve`);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['grn', id] });
      toast.success('GRN approved');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error || 'Failed to approve GRN');
    },
  });

  if (isLoading) {
    return (
      <div className="loading-overlay">
        <div className="spinner" />
      </div>
    );
  }

  if (!grn) {
    return (
      <div style={{ padding: '2rem', textAlign: 'center' }}>
        <EmptyState
          icon="search"
          title="GRN Not Found"
          message="The goods receiving note you're looking for doesn't exist or has been deleted."
          ctaLabel="Back to Goods Receiving"
          onCta={() => navigate('/grn')}
        />
      </div>
    );
  }

  const totalItems = grn.items?.length || 0;
  const totalReceived = grn.items?.reduce((sum: number, item: any) => 
    sum + Number(item.receivedQuantity || 0), 0) || 0;
  const totalOrdered = grn.items?.reduce((sum: number, item: any) => 
    sum + Number(item.orderedQuantity || 0), 0) || 0;
  const receiptRate = totalOrdered > 0 ? Math.round((totalReceived / totalOrdered) * 100) : 0;
  const passedQC = grn.items?.filter((item: any) => item.qcStatus === 'PASSED').length || 0;

  const kpis: EntityKpi[] = [
    {
      title: 'Line Items',
      value: totalItems,
      icon: <Package size={24} />,
      color: 'primary',
    },
    {
      title: 'Qty Received',
      value: totalReceived.toLocaleString(),
      icon: <Truck size={24} />,
      color: 'success',
    },
    {
      title: 'Receipt Rate',
      value: `${receiptRate}%`,
      icon: <Clipboard size={24} />,
      color: receiptRate >= 100 ? 'success' : receiptRate >= 80 ? 'warning' : 'danger',
    },
    {
      title: 'QC Passed',
      value: `${passedQC}/${totalItems}`,
      icon: <Check size={24} />,
      color: passedQC === totalItems ? 'success' : passedQC > 0 ? 'warning' : 'default',
    },
  ];

  const linkedRecords: LinkedRecord[] = [];

  if (grn.purchaseOrder) {
    linkedRecords.push({
      type: 'purchaseOrder',
      label: grn.purchaseOrder.poNumber,
      link: `/purchase-orders/${grn.purchaseOrder.id}`,
    });
  }

  if (grn.supplier) {
    linkedRecords.push({
      type: 'supplier',
      label: grn.supplier.name,
      link: `/suppliers/${grn.supplier.id}`,
    });
  }

  if (grn.warehouse) {
    linkedRecords.push({
      type: 'warehouse',
      label: grn.warehouse.name,
      link: `/warehouses/${grn.warehouse.id}`,
    });
  }

  const timeline: TimelineEvent[] = (auditLogs || []).map((log: any) => ({
    id: log.id,
    title: log.action.replace(/_/g, ' '),
    description: log.details || '',
    timestamp: log.createdAt,
    actor: log.user?.firstName ? `${log.user.firstName} ${log.user.lastName}` : 'System',
    type: log.action.includes('APPROVED') ? 'success' : 
          log.action.includes('REJECTED') ? 'error' : 'info',
  }));

  const getActions = () => {
    const actions: any[] = [];
    
    if (grn.status === 'DRAFT') {
      actions.push({
        label: 'Submit for QC',
        icon: <Clipboard size={16} />,
        onClick: () => submitMutation.mutate(),
        variant: 'primary',
        loading: submitMutation.isPending,
      });
    }
    
    if (grn.status === 'PENDING_QC') {
      actions.push({
        label: 'Approve',
        icon: <Check size={16} />,
        onClick: () => approveMutation.mutate(),
        variant: 'primary',
        loading: approveMutation.isPending,
      });
    }
    
    if (grn.status === 'DRAFT') {
      actions.push({
        label: 'Edit',
        icon: <Edit size={16} />,
        onClick: () => navigate('/grn'),
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
            <h4 style={{ marginBottom: '1rem', fontWeight: 600 }}>Receipt Details</h4>
            <table style={{ width: '100%', fontSize: '0.875rem' }}>
              <tbody>
                <tr>
                  <td style={{ padding: '0.5rem 0', color: 'var(--text-muted)', width: '40%' }}>
                    <Calendar size={14} style={{ marginRight: '0.5rem', verticalAlign: 'middle' }} />
                    Received Date
                  </td>
                  <td style={{ padding: '0.5rem 0' }}>{safeFormat(grn.receivedDate, 'dd MMM yyyy')}</td>
                </tr>
                <tr>
                  <td style={{ padding: '0.5rem 0', color: 'var(--text-muted)' }}>
                    <User size={14} style={{ marginRight: '0.5rem', verticalAlign: 'middle' }} />
                    Received By
                  </td>
                  <td style={{ padding: '0.5rem 0' }}>{grn.receivedBy?.name || '-'}</td>
                </tr>
                {grn.deliveryNote && (
                  <tr>
                    <td style={{ padding: '0.5rem 0', color: 'var(--text-muted)' }}>Delivery Note</td>
                    <td style={{ padding: '0.5rem 0' }}>{grn.deliveryNote}</td>
                  </tr>
                )}
                {grn.vehicleNumber && (
                  <tr>
                    <td style={{ padding: '0.5rem 0', color: 'var(--text-muted)' }}>Vehicle Number</td>
                    <td style={{ padding: '0.5rem 0' }}>{grn.vehicleNumber}</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          <div>
            <h4 style={{ marginBottom: '1rem', fontWeight: 600 }}>Source</h4>
            <table style={{ width: '100%', fontSize: '0.875rem' }}>
              <tbody>
                <tr>
                  <td style={{ padding: '0.5rem 0', color: 'var(--text-muted)', width: '40%' }}>Purchase Order</td>
                  <td style={{ padding: '0.5rem 0' }}>
                    {grn.purchaseOrder ? (
                      <a 
                        href="#" 
                        onClick={(e) => { e.preventDefault(); navigate(`/purchase-orders/${grn.purchaseOrder.id}`); }}
                        style={{ color: 'var(--primary)' }}
                      >
                        {grn.purchaseOrder.poNumber}
                      </a>
                    ) : '-'}
                  </td>
                </tr>
                <tr>
                  <td style={{ padding: '0.5rem 0', color: 'var(--text-muted)' }}>Supplier</td>
                  <td style={{ padding: '0.5rem 0' }}>
                    {grn.supplier ? (
                      <a 
                        href="#" 
                        onClick={(e) => { e.preventDefault(); navigate(`/suppliers/${grn.supplier.id}`); }}
                        style={{ color: 'var(--primary)' }}
                      >
                        {grn.supplier.name}
                      </a>
                    ) : '-'}
                  </td>
                </tr>
                <tr>
                  <td style={{ padding: '0.5rem 0', color: 'var(--text-muted)' }}>Warehouse</td>
                  <td style={{ padding: '0.5rem 0' }}>
                    {grn.warehouse ? (
                      <a 
                        href="#" 
                        onClick={(e) => { e.preventDefault(); navigate(`/warehouses/${grn.warehouse.id}`); }}
                        style={{ color: 'var(--primary)' }}
                      >
                        {grn.warehouse.name}
                      </a>
                    ) : '-'}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          {grn.notes && (
            <div style={{ gridColumn: '1 / -1' }}>
              <h4 style={{ marginBottom: '1rem', fontWeight: 600 }}>Notes</h4>
              <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', whiteSpace: 'pre-wrap' }}>
                {grn.notes}
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
      content: grn.items?.length > 0 ? (
        <div>
          <table className="table">
            <thead>
              <tr>
                <th>#</th>
                <th>Material</th>
                <th style={{ textAlign: 'right' }}>Ordered</th>
                <th style={{ textAlign: 'right' }}>Received</th>
                <th>Lot/Batch</th>
                <th>QC Status</th>
              </tr>
            </thead>
            <tbody>
              {grn.items.map((item: any, index: number) => (
                <tr key={item.id}>
                  <td>{index + 1}</td>
                  <td>
                    <div style={{ fontWeight: 500 }}>{item.material?.name || item.description || '-'}</div>
                    {item.material?.code && (
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                        {item.material.code}
                      </div>
                    )}
                  </td>
                  <td style={{ textAlign: 'right' }}>{Number(item.orderedQuantity || 0).toLocaleString()}</td>
                  <td style={{ textAlign: 'right' }}>{Number(item.receivedQuantity || 0).toLocaleString()}</td>
                  <td style={{ fontFamily: 'monospace' }}>{item.lotNumber || item.batchNumber || '-'}</td>
                  <td>
                    <span className={`badge badge-${
                      item.qcStatus === 'PASSED' ? 'success' :
                      item.qcStatus === 'FAILED' ? 'danger' :
                      item.qcStatus === 'PENDING' ? 'warning' : 'default'
                    }`}>
                      {item.qcStatus || 'Pending'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <EmptyState
          icon="package"
          title="No Line Items"
          message="No items have been added to this GRN."
        />
      ),
    },
    {
      key: 'documents',
      label: 'Documents',
      icon: <FileText size={16} />,
      content: (
        <AttachmentPanel
          entityType="GoodsReceivingNote"
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
          message="No activity recorded for this GRN yet."
        />
      ),
    },
  ];

  return (
    <EntityDetailLayout
      title={`GRN ${grn.grnNumber}`}
      code={grn.grnNumber}
      status={{
        value: grn.status,
        label: grn.status?.replace(/_/g, ' '),
        variant: (STATUS_COLORS[grn.status] || 'default') as 'default' | 'success' | 'warning' | 'danger' | 'info',
      }}
      metadata={[
        { label: 'Received', value: safeFormat(grn.receivedDate, 'dd MMM yyyy') },
        { label: 'Supplier', value: grn.supplier?.name || '-' },
      ]}
      kpis={kpis}
      tabs={tabs}
      defaultTab="overview"
      actions={getActions()}
      linkedRecords={linkedRecords}
      timeline={timeline}
      showTimeline={false}
      backUrl="/grn"
      backLabel="Goods Receiving"
    />
  );
}
