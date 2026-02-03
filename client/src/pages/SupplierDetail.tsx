import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import api from '../lib/api';
import { format } from 'date-fns';
import {
  User,
  Package,
  ShoppingCart,
  Truck,
  FileText,
  History,
  Edit,
  Mail,
  Phone,
  MapPin,
  Globe,
  Building2,
  Clock,
  CheckCircle,
  AlertCircle,
  DollarSign,
} from 'lucide-react';
import { EntityDetailLayout, EntityKpi, EntityTab, EmptyState } from '../components/shared';
import { LinkedRecord } from '../components/shared/LinkedRecordsSidebar';
import { TimelineEvent } from '../components/shared/Timeline';
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

export default function SupplierDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const { data: supplier, isLoading } = useQuery({
    queryKey: ['supplier', id],
    queryFn: async () => {
      const { data } = await api.get(`/suppliers/${id}`);
      return data;
    },
    enabled: !!id,
  });

  const { data: purchaseOrders } = useQuery({
    queryKey: ['supplier-pos', id],
    queryFn: async () => {
      const { data } = await api.get(`/purchase-orders?supplierId=${id}`);
      return data;
    },
    enabled: !!id,
  });

  const { data: grns } = useQuery({
    queryKey: ['supplier-grns', id],
    queryFn: async () => {
      const { data } = await api.get(`/grn?supplierId=${id}`);
      return data;
    },
    enabled: !!id,
  });

  const { data: auditLogs } = useQuery({
    queryKey: ['supplier-audit', id],
    queryFn: async () => {
      const { data } = await api.get(`/audit?entityType=Supplier&entityId=${id}`);
      return data.logs || [];
    },
    enabled: !!id,
  });

  if (isLoading) {
    return (
      <div className="loading-overlay">
        <div className="spinner" />
      </div>
    );
  }

  if (!supplier) {
    return (
      <div style={{ padding: '2rem', textAlign: 'center' }}>
        <EmptyState
          icon="search"
          title="Supplier Not Found"
          message="The supplier you're looking for doesn't exist or has been deleted."
          ctaLabel="Back to Suppliers"
          onCta={() => navigate('/suppliers')}
        />
      </div>
    );
  }

  const openPOCount = purchaseOrders?.filter((po: any) => 
    ['DRAFT', 'PENDING_APPROVAL', 'APPROVED', 'SENT', 'ACKNOWLEDGED', 'PARTIALLY_RECEIVED'].includes(po.status)
  ).length || 0;
  
  const totalSpend = purchaseOrders?.reduce((sum: number, po: any) => {
    if (po.status === 'RECEIVED' || po.status === 'CLOSED') {
      return sum + (Number(po.totalAmount) || 0);
    }
    return sum;
  }, 0) || 0;

  const receivedGRNs = grns?.filter((g: any) => g.status === 'APPROVED').length || 0;
  const totalGRNs = grns?.length || 0;
  const onTimeRate = totalGRNs > 0 ? Math.round((receivedGRNs / totalGRNs) * 100) : 0;

  const kpis: EntityKpi[] = [
    {
      title: 'Open POs',
      value: openPOCount,
      icon: <ShoppingCart size={24} />,
      color: 'primary',
    },
    {
      title: 'Total Spend',
      value: `${totalSpend.toLocaleString()} ${supplier.currency || 'SAR'}`,
      icon: <DollarSign size={24} />,
      color: 'success',
    },
    {
      title: 'GRNs Received',
      value: receivedGRNs,
      icon: <Truck size={24} />,
      color: 'info',
    },
    {
      title: 'On-Time Rate',
      value: `${onTimeRate}%`,
      icon: <Clock size={24} />,
      color: onTimeRate >= 90 ? 'success' : onTimeRate >= 70 ? 'warning' : 'danger',
    },
  ];

  const linkedRecords: LinkedRecord[] = [];

  if (purchaseOrders?.length > 0) {
    linkedRecords.push({
      type: 'purchaseOrder',
      label: 'Purchase Orders',
      link: `/purchase-orders?supplierId=${id}`,
      count: purchaseOrders.length,
    });
  }

  if (grns?.length > 0) {
    linkedRecords.push({
      type: 'grn',
      label: 'Goods Receipts',
      link: `/grn?supplierId=${id}`,
      count: grns.length,
    });
  }

  const timeline: TimelineEvent[] = (auditLogs || []).map((log: any) => ({
    id: log.id,
    title: log.action.replace(/_/g, ' '),
    description: log.details || '',
    timestamp: log.createdAt,
    actor: log.user?.firstName ? `${log.user.firstName} ${log.user.lastName}` : 'System',
    type: log.action.includes('CREATED') ? 'success' : log.action.includes('BLOCKED') ? 'error' : 'info',
  }));

  const tabs: EntityTab[] = [
    {
      key: 'overview',
      label: 'Overview',
      icon: <FileText size={16} />,
      content: (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1.5rem' }}>
          <div>
            <h4 style={{ marginBottom: '1rem', fontWeight: 600 }}>Contact Information</h4>
            <table style={{ width: '100%', fontSize: '0.875rem' }}>
              <tbody>
                <tr>
                  <td style={{ padding: '0.5rem 0', color: 'var(--text-muted)', width: '40%' }}>
                    <Mail size={14} style={{ marginRight: '0.5rem', verticalAlign: 'middle' }} />
                    Email
                  </td>
                  <td style={{ padding: '0.5rem 0' }}>{supplier.email || '-'}</td>
                </tr>
                <tr>
                  <td style={{ padding: '0.5rem 0', color: 'var(--text-muted)' }}>
                    <Phone size={14} style={{ marginRight: '0.5rem', verticalAlign: 'middle' }} />
                    Phone
                  </td>
                  <td style={{ padding: '0.5rem 0' }}>{supplier.phone || '-'}</td>
                </tr>
                <tr>
                  <td style={{ padding: '0.5rem 0', color: 'var(--text-muted)' }}>
                    <Phone size={14} style={{ marginRight: '0.5rem', verticalAlign: 'middle' }} />
                    Mobile
                  </td>
                  <td style={{ padding: '0.5rem 0' }}>{supplier.mobile || '-'}</td>
                </tr>
                {supplier.website && (
                  <tr>
                    <td style={{ padding: '0.5rem 0', color: 'var(--text-muted)' }}>
                      <Globe size={14} style={{ marginRight: '0.5rem', verticalAlign: 'middle' }} />
                      Website
                    </td>
                    <td style={{ padding: '0.5rem 0' }}>
                      <a href={supplier.website} target="_blank" rel="noopener noreferrer">{supplier.website}</a>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          <div>
            <h4 style={{ marginBottom: '1rem', fontWeight: 600 }}>Address</h4>
            <div style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
              {supplier.buildingNumber && <div>{supplier.buildingNumber}</div>}
              {supplier.street && <div>{supplier.street}</div>}
              {supplier.district && <div>{supplier.district}</div>}
              {supplier.city && <div>{supplier.city}{supplier.postalCode && `, ${supplier.postalCode}`}</div>}
              {supplier.country && <div>{supplier.country}</div>}
              {!supplier.buildingNumber && !supplier.street && !supplier.city && <span>-</span>}
            </div>
          </div>

          <div>
            <h4 style={{ marginBottom: '1rem', fontWeight: 600 }}>Business Details</h4>
            <table style={{ width: '100%', fontSize: '0.875rem' }}>
              <tbody>
                {supplier.taxNumber && (
                  <tr>
                    <td style={{ padding: '0.5rem 0', color: 'var(--text-muted)', width: '40%' }}>Tax Number</td>
                    <td style={{ padding: '0.5rem 0' }}>{supplier.taxNumber}</td>
                  </tr>
                )}
                {supplier.vatNumber && (
                  <tr>
                    <td style={{ padding: '0.5rem 0', color: 'var(--text-muted)' }}>VAT Number</td>
                    <td style={{ padding: '0.5rem 0' }}>{supplier.vatNumber}</td>
                  </tr>
                )}
                {supplier.crNumber && (
                  <tr>
                    <td style={{ padding: '0.5rem 0', color: 'var(--text-muted)' }}>CR Number</td>
                    <td style={{ padding: '0.5rem 0' }}>{supplier.crNumber}</td>
                  </tr>
                )}
                <tr>
                  <td style={{ padding: '0.5rem 0', color: 'var(--text-muted)' }}>Payment Terms</td>
                  <td style={{ padding: '0.5rem 0' }}>{supplier.paymentTerms || 'Net 30'}</td>
                </tr>
                <tr>
                  <td style={{ padding: '0.5rem 0', color: 'var(--text-muted)' }}>Currency</td>
                  <td style={{ padding: '0.5rem 0' }}>{supplier.currency || 'SAR'}</td>
                </tr>
              </tbody>
            </table>
          </div>

          {(supplier.bankName || supplier.bankIban) && (
            <div>
              <h4 style={{ marginBottom: '1rem', fontWeight: 600 }}>Banking Information</h4>
              <table style={{ width: '100%', fontSize: '0.875rem' }}>
                <tbody>
                  {supplier.bankName && (
                    <tr>
                      <td style={{ padding: '0.5rem 0', color: 'var(--text-muted)', width: '40%' }}>Bank Name</td>
                      <td style={{ padding: '0.5rem 0' }}>{supplier.bankName}</td>
                    </tr>
                  )}
                  {supplier.bankIban && (
                    <tr>
                      <td style={{ padding: '0.5rem 0', color: 'var(--text-muted)' }}>IBAN</td>
                      <td style={{ padding: '0.5rem 0', fontFamily: 'monospace' }}>{supplier.bankIban}</td>
                    </tr>
                  )}
                  {supplier.bankSwift && (
                    <tr>
                      <td style={{ padding: '0.5rem 0', color: 'var(--text-muted)' }}>SWIFT</td>
                      <td style={{ padding: '0.5rem 0', fontFamily: 'monospace' }}>{supplier.bankSwift}</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}

          {supplier.notes && (
            <div style={{ gridColumn: '1 / -1' }}>
              <h4 style={{ marginBottom: '1rem', fontWeight: 600 }}>Notes</h4>
              <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', whiteSpace: 'pre-wrap' }}>
                {supplier.notes}
              </p>
            </div>
          )}
        </div>
      ),
    },
    {
      key: 'purchase-orders',
      label: 'Purchase Orders',
      icon: <ShoppingCart size={16} />,
      badge: purchaseOrders?.length || 0,
      content: purchaseOrders?.length > 0 ? (
        <div>
          <table className="table">
            <thead>
              <tr>
                <th>PO Number</th>
                <th>Date</th>
                <th>Status</th>
                <th>Total</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {purchaseOrders.map((po: any) => (
                <tr key={po.id}>
                  <td style={{ fontFamily: 'monospace' }}>{po.poNumber}</td>
                  <td>{safeFormat(po.orderDate, 'dd MMM yyyy')}</td>
                  <td>
                    <span className={`badge badge-${
                      po.status === 'RECEIVED' || po.status === 'CLOSED' ? 'success' :
                      po.status === 'CANCELLED' ? 'danger' :
                      po.status === 'PENDING_APPROVAL' ? 'warning' : 'info'
                    }`}>
                      {po.status.replace(/_/g, ' ')}
                    </span>
                  </td>
                  <td>{Number(po.totalAmount || 0).toLocaleString()} {po.currency || 'SAR'}</td>
                  <td>
                    <button 
                      className="btn btn-secondary btn-sm"
                      onClick={() => navigate(`/purchase-orders`)}
                    >
                      View
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <EmptyState
          icon="package"
          title="No Purchase Orders"
          message="No purchase orders found for this supplier."
        />
      ),
    },
    {
      key: 'receiving',
      label: 'Receiving',
      icon: <Truck size={16} />,
      badge: grns?.length || 0,
      content: grns?.length > 0 ? (
        <div>
          <table className="table">
            <thead>
              <tr>
                <th>GRN Number</th>
                <th>PO</th>
                <th>Date</th>
                <th>Status</th>
                <th>Items</th>
              </tr>
            </thead>
            <tbody>
              {grns.map((grn: any) => (
                <tr key={grn.id}>
                  <td style={{ fontFamily: 'monospace' }}>{grn.grnNumber}</td>
                  <td>{grn.purchaseOrder?.poNumber || '-'}</td>
                  <td>{safeFormat(grn.receivedDate, 'dd MMM yyyy')}</td>
                  <td>
                    <span className={`badge badge-${
                      grn.status === 'APPROVED' ? 'success' :
                      grn.status === 'REJECTED' ? 'danger' :
                      grn.status === 'PENDING_QC' ? 'warning' : 'default'
                    }`}>
                      {grn.status.replace(/_/g, ' ')}
                    </span>
                  </td>
                  <td>{grn._count?.items || 0}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <EmptyState
          icon="truck"
          title="No Receipts"
          message="No goods receiving notes found for this supplier."
        />
      ),
    },
    {
      key: 'documents',
      label: 'Documents',
      icon: <FileText size={16} />,
      content: (
        <AttachmentPanel
          entityType="Supplier"
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
          message="No activity recorded for this supplier yet."
        />
      ),
    },
  ];

  return (
    <EntityDetailLayout
      title={supplier.name}
      code={supplier.code}
      subtitle={supplier.nameAr || undefined}
      status={{
        value: supplier.status,
        label: supplier.status,
        variant: supplier.status === 'ACTIVE' ? 'success' : 
                 supplier.status === 'ON_HOLD' ? 'warning' : 
                 supplier.status === 'BLOCKED' ? 'danger' : 'default',
      }}
      metadata={[
        { label: 'Created', value: safeFormat(supplier.createdAt, 'dd MMM yyyy') },
        ...(supplier.email ? [{ label: 'Email', value: supplier.email }] : []),
      ]}
      kpis={kpis}
      tabs={tabs}
      defaultTab="overview"
      actions={[
        {
          label: 'Edit',
          icon: <Edit size={16} />,
          onClick: () => navigate(`/suppliers`),
          variant: 'secondary',
        },
      ]}
      linkedRecords={linkedRecords}
      timeline={timeline}
      showTimeline={false}
      backUrl="/suppliers"
      backLabel="Suppliers"
    />
  );
}
