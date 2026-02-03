import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import api from '../lib/api';
import { format } from 'date-fns';
import {
  FileText,
  Warehouse,
  Package,
  MapPin,
  History,
  Edit,
  Box,
  Thermometer,
  AlertCircle,
  Archive,
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

const TYPE_LABELS: Record<string, string> = {
  RAW_MATERIALS: 'Raw Materials',
  QUARANTINE: 'Quarantine',
  PRODUCTION: 'Production',
  FINISHED_GOODS: 'Finished Goods',
  COLD_STORAGE: 'Cold Storage',
  RADIOACTIVE: 'Radioactive',
  WASTE: 'Waste',
};

export default function WarehouseDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const { data: warehouse, isLoading } = useQuery({
    queryKey: ['warehouse', id],
    queryFn: async () => {
      const { data } = await api.get(`/warehouses/${id}`);
      return data;
    },
    enabled: !!id,
  });

  const { data: stock } = useQuery({
    queryKey: ['warehouse-stock', id],
    queryFn: async () => {
      const { data } = await api.get(`/stock?warehouseId=${id}`);
      return data;
    },
    enabled: !!id,
  });

  const { data: movements } = useQuery({
    queryKey: ['warehouse-movements', id],
    queryFn: async () => {
      const { data } = await api.get(`/stock/movements?warehouseId=${id}&limit=50`);
      return data;
    },
    enabled: !!id,
  });

  const { data: auditLogs } = useQuery({
    queryKey: ['warehouse-audit', id],
    queryFn: async () => {
      const { data } = await api.get(`/audit?entityType=Warehouse&entityId=${id}`);
      return data;
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

  if (!warehouse) {
    return (
      <div style={{ padding: '2rem', textAlign: 'center' }}>
        <EmptyState
          icon="search"
          title="Warehouse Not Found"
          message="The warehouse you're looking for doesn't exist or has been deleted."
          ctaLabel="Back to Warehouses"
          onCta={() => navigate('/warehouses')}
        />
      </div>
    );
  }

  const totalLocations = warehouse.locations?.length || 0;
  const totalStock = stock?.length || 0;
  const lowStockItems = stock?.filter((s: any) => 
    s.quantity <= (s.material?.reorderPoint || 0)
  ).length || 0;

  const kpis: EntityKpi[] = [
    {
      title: 'Locations',
      value: totalLocations,
      icon: <MapPin size={24} />,
      color: 'primary',
    },
    {
      title: 'Stock Items',
      value: totalStock,
      icon: <Package size={24} />,
      color: 'success',
    },
    {
      title: 'Low Stock',
      value: lowStockItems,
      icon: <AlertCircle size={24} />,
      color: lowStockItems > 0 ? 'danger' : 'success',
    },
    {
      title: 'Movements',
      value: movements?.length || 0,
      icon: <Archive size={24} />,
      color: 'info',
    },
  ];

  const linkedRecords: LinkedRecord[] = [];

  if (stock?.length > 0) {
    linkedRecords.push({
      type: 'material',
      label: 'Stock Items',
      link: `/inventory?warehouseId=${id}`,
      count: totalStock,
    });
  }

  const timeline: TimelineEvent[] = (auditLogs || []).map((log: any) => ({
    id: log.id,
    title: log.action.replace(/_/g, ' '),
    description: log.details || '',
    timestamp: log.createdAt,
    actor: log.user?.firstName ? `${log.user.firstName} ${log.user.lastName}` : 'System',
    type: log.action.includes('CREATED') ? 'success' : 'info',
  }));

  const tabs: EntityTab[] = [
    {
      key: 'overview',
      label: 'Overview',
      icon: <FileText size={16} />,
      content: (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1.5rem' }}>
          <div>
            <h4 style={{ marginBottom: '1rem', fontWeight: 600 }}>Warehouse Details</h4>
            <table style={{ width: '100%', fontSize: '0.875rem' }}>
              <tbody>
                <tr>
                  <td style={{ padding: '0.5rem 0', color: 'var(--text-muted)', width: '40%' }}>Type</td>
                  <td style={{ padding: '0.5rem 0' }}>{TYPE_LABELS[warehouse.type] || warehouse.type}</td>
                </tr>
                <tr>
                  <td style={{ padding: '0.5rem 0', color: 'var(--text-muted)' }}>Status</td>
                  <td style={{ padding: '0.5rem 0' }}>
                    <span className={`badge badge-${warehouse.isActive ? 'success' : 'default'}`}>
                      {warehouse.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                </tr>
                {warehouse.address && (
                  <tr>
                    <td style={{ padding: '0.5rem 0', color: 'var(--text-muted)' }}>Address</td>
                    <td style={{ padding: '0.5rem 0' }}>{warehouse.address}</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {(warehouse.temperatureMin !== null || warehouse.humidityMin !== null) && (
            <div>
              <h4 style={{ marginBottom: '1rem', fontWeight: 600 }}>Environmental Controls</h4>
              <table style={{ width: '100%', fontSize: '0.875rem' }}>
                <tbody>
                  {warehouse.temperatureMin !== null && (
                    <tr>
                      <td style={{ padding: '0.5rem 0', color: 'var(--text-muted)', width: '40%' }}>
                        <Thermometer size={14} style={{ marginRight: '0.5rem', verticalAlign: 'middle' }} />
                        Temperature Range
                      </td>
                      <td style={{ padding: '0.5rem 0' }}>
                        {warehouse.temperatureMin}°C - {warehouse.temperatureMax}°C
                      </td>
                    </tr>
                  )}
                  {warehouse.humidityMin !== null && (
                    <tr>
                      <td style={{ padding: '0.5rem 0', color: 'var(--text-muted)' }}>Humidity Range</td>
                      <td style={{ padding: '0.5rem 0' }}>
                        {warehouse.humidityMin}% - {warehouse.humidityMax}%
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}

          {warehouse.description && (
            <div style={{ gridColumn: '1 / -1' }}>
              <h4 style={{ marginBottom: '1rem', fontWeight: 600 }}>Description</h4>
              <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', whiteSpace: 'pre-wrap' }}>
                {warehouse.description}
              </p>
            </div>
          )}
        </div>
      ),
    },
    {
      key: 'locations',
      label: 'Locations',
      icon: <MapPin size={16} />,
      badge: totalLocations,
      content: warehouse.locations?.length > 0 ? (
        <div>
          <table className="table">
            <thead>
              <tr>
                <th>Code</th>
                <th>Zone</th>
                <th>Aisle</th>
                <th>Rack</th>
                <th>Shelf</th>
                <th>Bin</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {warehouse.locations.map((loc: any) => (
                <tr key={loc.id}>
                  <td style={{ fontFamily: 'monospace' }}>{loc.code}</td>
                  <td>{loc.zone || '-'}</td>
                  <td>{loc.aisle || '-'}</td>
                  <td>{loc.rack || '-'}</td>
                  <td>{loc.shelf || '-'}</td>
                  <td>{loc.bin || '-'}</td>
                  <td>
                    <span className={`badge badge-${loc.isActive ? 'success' : 'default'}`}>
                      {loc.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <EmptyState
          icon="box"
          title="No Locations"
          message="No storage locations have been defined for this warehouse."
        />
      ),
    },
    {
      key: 'stock',
      label: 'Stock',
      icon: <Package size={16} />,
      badge: totalStock,
      content: stock?.length > 0 ? (
        <div>
          <table className="table">
            <thead>
              <tr>
                <th>Material</th>
                <th>Location</th>
                <th>Lot/Batch</th>
                <th style={{ textAlign: 'right' }}>Quantity</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {stock.slice(0, 50).map((s: any) => (
                <tr key={s.id}>
                  <td>
                    <div style={{ fontWeight: 500 }}>{s.material?.name || '-'}</div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                      {s.material?.code}
                    </div>
                  </td>
                  <td style={{ fontFamily: 'monospace' }}>{s.location?.code || '-'}</td>
                  <td>{s.lotNumber || s.batchNumber || '-'}</td>
                  <td style={{ textAlign: 'right' }}>{Number(s.quantity).toLocaleString()} {s.unit || 'EA'}</td>
                  <td>
                    <span className={`badge badge-${
                      s.status === 'AVAILABLE' ? 'success' :
                      s.status === 'QUARANTINE' ? 'warning' :
                      s.status === 'RESERVED' ? 'info' :
                      s.status === 'EXPIRED' || s.status === 'REJECTED' ? 'danger' : 'default'
                    }`}>
                      {s.status?.replace(/_/g, ' ')}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {stock.length > 50 && (
            <p style={{ textAlign: 'center', marginTop: '1rem', color: 'var(--text-muted)' }}>
              Showing 50 of {stock.length} items. <a href={`/inventory?warehouseId=${id}`}>View all</a>
            </p>
          )}
        </div>
      ) : (
        <EmptyState
          icon="package"
          title="No Stock"
          message="No stock is currently stored in this warehouse."
        />
      ),
    },
    {
      key: 'movements',
      label: 'Movements',
      icon: <Archive size={16} />,
      badge: movements?.length || 0,
      content: movements?.length > 0 ? (
        <div>
          <table className="table">
            <thead>
              <tr>
                <th>Date</th>
                <th>Type</th>
                <th>Material</th>
                <th style={{ textAlign: 'right' }}>Quantity</th>
                <th>Reference</th>
              </tr>
            </thead>
            <tbody>
              {movements.map((m: any) => (
                <tr key={m.id}>
                  <td>{safeFormat(m.createdAt, 'dd MMM yyyy HH:mm')}</td>
                  <td>
                    <span className={`badge badge-${
                      m.type?.includes('RECEIPT') || m.type?.includes('IN') ? 'success' :
                      m.type?.includes('ISSUE') || m.type?.includes('OUT') ? 'warning' : 'default'
                    }`}>
                      {m.type?.replace(/_/g, ' ')}
                    </span>
                  </td>
                  <td>{m.material?.name || '-'}</td>
                  <td style={{ textAlign: 'right' }}>{Number(m.quantity).toLocaleString()}</td>
                  <td style={{ fontFamily: 'monospace' }}>{m.reference || '-'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <EmptyState
          icon="clock"
          title="No Movements"
          message="No stock movements recorded for this warehouse."
        />
      ),
    },
    {
      key: 'documents',
      label: 'Documents',
      icon: <FileText size={16} />,
      content: (
        <AttachmentPanel
          entityType="Warehouse"
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
                backgroundColor: event.type === 'success' ? 'var(--success)' : 'var(--primary)',
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
          message="No activity recorded for this warehouse yet."
        />
      ),
    },
  ];

  return (
    <EntityDetailLayout
      title={warehouse.name}
      code={warehouse.code}
      status={{
        value: warehouse.isActive ? 'ACTIVE' : 'INACTIVE',
        label: warehouse.isActive ? 'Active' : 'Inactive',
        variant: warehouse.isActive ? 'success' : 'default',
      }}
      metadata={[
        { label: 'Type', value: TYPE_LABELS[warehouse.type] || warehouse.type },
        { label: 'Locations', value: `${totalLocations}` },
      ]}
      kpis={kpis}
      tabs={tabs}
      defaultTab="overview"
      actions={[
        {
          label: 'Edit',
          icon: <Edit size={16} />,
          onClick: () => navigate('/warehouses'),
          variant: 'secondary',
        },
      ]}
      linkedRecords={linkedRecords}
      timeline={timeline}
      showTimeline={false}
      backUrl="/warehouses"
      backLabel="Warehouses"
    />
  );
}
