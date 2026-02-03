import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import api from '../lib/api';
import { format } from 'date-fns';
import {
  Package,
  Beaker,
  AlertTriangle,
  Clock,
  FileText,
  History,
  Link2,
  Edit,
  Atom,
  DollarSign,
  Truck,
  Archive,
  CheckCircle,
  XCircle,
} from 'lucide-react';
import { EntityDetailLayout, EntityKpi, EntityTab, EmptyState } from '../components/shared';
import { LinkedRecord } from '../components/shared/LinkedRecordsSidebar';
import { TimelineEvent } from '../components/shared/Timeline';
import AttachmentPanel from '../components/AttachmentPanel';

const CATEGORY_LABELS: Record<string, string> = {
  RAW_MATERIAL: 'Raw Material',
  CONSUMABLE: 'Consumable',
  REAGENT: 'Reagent',
  PACKAGING: 'Packaging',
  RADIOISOTOPE: 'Radioisotope',
  TARGET_MATERIAL: 'Target Material',
  SOLVENT: 'Solvent',
  BUFFER: 'Buffer',
  FILTER: 'Filter',
  CONTAINER: 'Container',
  EXCIPIENT: 'Excipient',
  REFERENCE_STANDARD: 'Reference Standard',
};

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

export default function MaterialDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('overview');

  const { data: material, isLoading } = useQuery({
    queryKey: ['material', id],
    queryFn: async () => {
      const { data } = await api.get(`/materials/${id}`);
      return data;
    },
    enabled: !!id,
  });

  const { data: stockItems } = useQuery({
    queryKey: ['material-stock', id],
    queryFn: async () => {
      const { data } = await api.get(`/inventory/stock?materialId=${id}`);
      return data;
    },
    enabled: !!id,
  });

  const { data: auditLogs } = useQuery({
    queryKey: ['material-audit', id],
    queryFn: async () => {
      const { data } = await api.get(`/audit?entityType=Material&entityId=${id}`);
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

  if (!material) {
    return (
      <div style={{ padding: '2rem', textAlign: 'center' }}>
        <EmptyState
          icon="search"
          title="Material Not Found"
          message="The material you're looking for doesn't exist or has been deleted."
          ctaLabel="Back to Materials"
          onCta={() => navigate('/materials')}
        />
      </div>
    );
  }

  const totalOnHand = stockItems?.reduce((sum: number, s: any) => sum + (s.availableQty || 0), 0) || 0;
  const quarantineQty = stockItems?.filter((s: any) => s.status === 'QUARANTINE').reduce((sum: number, s: any) => sum + s.quantity, 0) || 0;
  const expiredQty = stockItems?.filter((s: any) => s.status === 'EXPIRED').reduce((sum: number, s: any) => sum + s.quantity, 0) || 0;
  const nearExpiryCount = stockItems?.filter((s: any) => {
    if (!s.expiryDate) return false;
    const daysToExpiry = Math.ceil((new Date(s.expiryDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
    return daysToExpiry > 0 && daysToExpiry <= 30;
  }).length || 0;

  const kpis: EntityKpi[] = [
    {
      title: 'On-Hand Qty',
      value: `${totalOnHand} ${material.unit}`,
      icon: <Package size={24} />,
      color: 'primary',
    },
    {
      title: 'Quarantine',
      value: `${quarantineQty} ${material.unit}`,
      icon: <AlertTriangle size={24} />,
      color: 'warning',
    },
    {
      title: 'Expired',
      value: `${expiredQty} ${material.unit}`,
      icon: <XCircle size={24} />,
      color: 'danger',
    },
    {
      title: 'Near Expiry',
      value: nearExpiryCount,
      icon: <Clock size={24} />,
      color: 'info',
    },
  ];

  const linkedRecords: LinkedRecord[] = [];
  
  if (material.supplier) {
    linkedRecords.push({
      type: 'supplier',
      label: material.supplier.name,
      link: `/suppliers`,
      count: 1,
    });
  }

  if (material.recipeComponents?.length > 0) {
    linkedRecords.push({
      type: 'recipe',
      label: 'Used in recipes',
      link: '/recipes',
      count: material.recipeComponents.length,
    });
  }

  const timeline: TimelineEvent[] = (auditLogs || []).map((log: any) => ({
    id: log.id,
    title: log.action.replace(/_/g, ' '),
    description: log.details || '',
    timestamp: log.createdAt,
    actor: log.user?.firstName ? `${log.user.firstName} ${log.user.lastName}` : 'System',
    type: log.action.includes('CREATED') ? 'success' : log.action.includes('DELETED') ? 'error' : 'info',
  }));

  const tabs: EntityTab[] = [
    {
      key: 'overview',
      label: 'Overview',
      icon: <FileText size={16} />,
      content: (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1.5rem' }}>
          <div>
            <h4 style={{ marginBottom: '1rem', fontWeight: 600 }}>Basic Information</h4>
            <table style={{ width: '100%', fontSize: '0.875rem' }}>
              <tbody>
                <tr>
                  <td style={{ padding: '0.5rem 0', color: 'var(--text-muted)', width: '40%' }}>Code</td>
                  <td style={{ padding: '0.5rem 0', fontWeight: 500 }}>{material.code}</td>
                </tr>
                <tr>
                  <td style={{ padding: '0.5rem 0', color: 'var(--text-muted)' }}>Name</td>
                  <td style={{ padding: '0.5rem 0', fontWeight: 500 }}>{material.name}</td>
                </tr>
                {material.nameAr && (
                  <tr>
                    <td style={{ padding: '0.5rem 0', color: 'var(--text-muted)' }}>Arabic Name</td>
                    <td style={{ padding: '0.5rem 0', fontWeight: 500 }}>{material.nameAr}</td>
                  </tr>
                )}
                <tr>
                  <td style={{ padding: '0.5rem 0', color: 'var(--text-muted)' }}>Category</td>
                  <td style={{ padding: '0.5rem 0' }}>{CATEGORY_LABELS[material.category] || material.category}</td>
                </tr>
                <tr>
                  <td style={{ padding: '0.5rem 0', color: 'var(--text-muted)' }}>Unit</td>
                  <td style={{ padding: '0.5rem 0' }}>{material.unit}</td>
                </tr>
                <tr>
                  <td style={{ padding: '0.5rem 0', color: 'var(--text-muted)' }}>Status</td>
                  <td style={{ padding: '0.5rem 0' }}>
                    <span className={`badge badge-${material.status === 'ACTIVE' ? 'success' : 'default'}`}>
                      {material.status}
                    </span>
                  </td>
                </tr>
                {material.description && (
                  <tr>
                    <td style={{ padding: '0.5rem 0', color: 'var(--text-muted)' }}>Description</td>
                    <td style={{ padding: '0.5rem 0' }}>{material.description}</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          
          <div>
            <h4 style={{ marginBottom: '1rem', fontWeight: 600 }}>Inventory Settings</h4>
            <table style={{ width: '100%', fontSize: '0.875rem' }}>
              <tbody>
                <tr>
                  <td style={{ padding: '0.5rem 0', color: 'var(--text-muted)', width: '40%' }}>Min Stock Level</td>
                  <td style={{ padding: '0.5rem 0' }}>{material.minStockLevel} {material.unit}</td>
                </tr>
                <tr>
                  <td style={{ padding: '0.5rem 0', color: 'var(--text-muted)' }}>Reorder Point</td>
                  <td style={{ padding: '0.5rem 0' }}>{material.reorderPoint} {material.unit}</td>
                </tr>
                <tr>
                  <td style={{ padding: '0.5rem 0', color: 'var(--text-muted)' }}>Reorder Qty</td>
                  <td style={{ padding: '0.5rem 0' }}>{material.reorderQuantity} {material.unit}</td>
                </tr>
                <tr>
                  <td style={{ padding: '0.5rem 0', color: 'var(--text-muted)' }}>Lead Time</td>
                  <td style={{ padding: '0.5rem 0' }}>{material.leadTimeDays} days</td>
                </tr>
                {material.shelfLifeDays && (
                  <tr>
                    <td style={{ padding: '0.5rem 0', color: 'var(--text-muted)' }}>Shelf Life</td>
                    <td style={{ padding: '0.5rem 0' }}>{material.shelfLifeDays} days</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          
          <div>
            <h4 style={{ marginBottom: '1rem', fontWeight: 600 }}>Supplier & Cost</h4>
            <table style={{ width: '100%', fontSize: '0.875rem' }}>
              <tbody>
                <tr>
                  <td style={{ padding: '0.5rem 0', color: 'var(--text-muted)', width: '40%' }}>Preferred Supplier</td>
                  <td style={{ padding: '0.5rem 0' }}>{material.supplier?.name || '-'}</td>
                </tr>
                <tr>
                  <td style={{ padding: '0.5rem 0', color: 'var(--text-muted)' }}>Unit Cost</td>
                  <td style={{ padding: '0.5rem 0' }}>
                    {material.unitCost ? `${material.unitCost.toFixed(2)} ${material.currency}` : '-'}
                  </td>
                </tr>
                <tr>
                  <td style={{ padding: '0.5rem 0', color: 'var(--text-muted)' }}>Requires QC</td>
                  <td style={{ padding: '0.5rem 0' }}>
                    {material.requiresQC ? <CheckCircle size={16} color="var(--success)" /> : <XCircle size={16} color="var(--text-muted)" />}
                  </td>
                </tr>
                <tr>
                  <td style={{ padding: '0.5rem 0', color: 'var(--text-muted)' }}>Radioactive</td>
                  <td style={{ padding: '0.5rem 0' }}>
                    {material.isRadioactive ? (
                      <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', color: 'var(--warning)' }}>
                        <Atom size={16} /> Yes {material.halfLifeMinutes && `(t½: ${material.halfLifeMinutes} min)`}
                      </span>
                    ) : 'No'}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          {(material.storageConditions || material.handlingInstructions || material.hazardClass) && (
            <div>
              <h4 style={{ marginBottom: '1rem', fontWeight: 600 }}>Storage & Handling</h4>
              <table style={{ width: '100%', fontSize: '0.875rem' }}>
                <tbody>
                  {material.storageConditions && (
                    <tr>
                      <td style={{ padding: '0.5rem 0', color: 'var(--text-muted)', width: '40%' }}>Storage</td>
                      <td style={{ padding: '0.5rem 0' }}>{material.storageConditions}</td>
                    </tr>
                  )}
                  {material.handlingInstructions && (
                    <tr>
                      <td style={{ padding: '0.5rem 0', color: 'var(--text-muted)' }}>Handling</td>
                      <td style={{ padding: '0.5rem 0' }}>{material.handlingInstructions}</td>
                    </tr>
                  )}
                  {material.hazardClass && (
                    <tr>
                      <td style={{ padding: '0.5rem 0', color: 'var(--text-muted)' }}>Hazard Class</td>
                      <td style={{ padding: '0.5rem 0' }}>{material.hazardClass}</td>
                    </tr>
                  )}
                  {material.casNumber && (
                    <tr>
                      <td style={{ padding: '0.5rem 0', color: 'var(--text-muted)' }}>CAS Number</td>
                      <td style={{ padding: '0.5rem 0' }}>{material.casNumber}</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      ),
    },
    {
      key: 'stock',
      label: 'Stock / Lots',
      icon: <Archive size={16} />,
      badge: stockItems?.length || 0,
      content: stockItems?.length > 0 ? (
        <div>
          <table className="table">
            <thead>
              <tr>
                <th>Lot #</th>
                <th>Warehouse</th>
                <th>Location</th>
                <th>Qty</th>
                <th>Available</th>
                <th>Status</th>
                <th>Expiry</th>
              </tr>
            </thead>
            <tbody>
              {stockItems.map((item: any) => (
                <tr key={item.id}>
                  <td style={{ fontFamily: 'monospace' }}>{item.lotNumber || '-'}</td>
                  <td>{item.warehouse?.name || '-'}</td>
                  <td>{item.location?.code || '-'}</td>
                  <td>{item.quantity} {item.unit}</td>
                  <td>{item.availableQty} {item.unit}</td>
                  <td>
                    <span className={`badge badge-${
                      item.status === 'AVAILABLE' ? 'success' :
                      item.status === 'QUARANTINE' ? 'warning' :
                      item.status === 'EXPIRED' ? 'danger' : 'default'
                    }`}>
                      {item.status}
                    </span>
                  </td>
                  <td>{safeFormat(item.expiryDate, 'dd MMM yyyy')}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <EmptyState
          icon="package"
          title="No Stock"
          message="This material has no inventory records yet."
        />
      ),
    },
    {
      key: 'recipes',
      label: 'Used In',
      icon: <Beaker size={16} />,
      badge: material.recipeComponents?.length || 0,
      content: material.recipeComponents?.length > 0 ? (
        <div>
          <table className="table">
            <thead>
              <tr>
                <th>Recipe</th>
                <th>Product</th>
                <th>Version</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {material.recipeComponents.map((rc: any) => (
                <tr key={rc.id}>
                  <td>{rc.recipe?.code} - {rc.recipe?.name}</td>
                  <td>{rc.recipe?.product?.name || '-'}</td>
                  <td>v{rc.recipe?.version}</td>
                  <td>
                    <span className={`badge badge-${rc.recipe?.status === 'ACTIVE' ? 'success' : 'default'}`}>
                      {rc.recipe?.status}
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
          title="Not Used in Recipes"
          message="This material is not currently used in any recipes."
        />
      ),
    },
    {
      key: 'documents',
      label: 'Documents',
      icon: <FileText size={16} />,
      content: (
        <AttachmentPanel
          entityType="Material"
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
          message="No activity recorded for this material yet."
        />
      ),
    },
  ];

  return (
    <EntityDetailLayout
      title={material.name}
      code={material.code}
      subtitle={CATEGORY_LABELS[material.category] || material.category}
      status={{
        value: material.status,
        label: material.status,
        variant: material.status === 'ACTIVE' ? 'success' : 'default',
      }}
      metadata={[
        { label: 'Unit', value: material.unit },
        { label: 'Created', value: safeFormat(material.createdAt, 'dd MMM yyyy') },
        ...(material.isRadioactive ? [{ label: 'Radioactive', value: <Atom size={14} style={{ color: 'var(--warning)' }} /> }] : []),
      ]}
      kpis={kpis}
      tabs={tabs}
      defaultTab="overview"
      actions={[
        {
          label: 'Edit',
          icon: <Edit size={16} />,
          onClick: () => navigate(`/materials`),
          variant: 'secondary',
        },
      ]}
      linkedRecords={linkedRecords}
      timeline={timeline}
      showTimeline={false}
      backUrl="/materials"
      backLabel="Materials"
    />
  );
}
