import React from 'react';
import { Link } from 'react-router-dom';
import { Package, Box, Truck, FileText, FlaskConical, Pill, ChevronRight, ExternalLink, User, Beaker, Warehouse, ShoppingCart, ClipboardList, Building2 } from 'lucide-react';

export interface LinkedRecord {
  type: 'order' | 'batch' | 'shipment' | 'doseUnit' | 'qcTest' | 'invoice' | 'supplier' | 'material' | 'recipe' | 'warehouse' | 'purchaseOrder' | 'grn' | 'customer';
  id?: string;
  label: string;
  status?: string;
  link: string;
  count?: number;
}

interface LinkedRecordsSidebarProps {
  records: LinkedRecord[];
  title?: string;
  collapsed?: boolean;
  onToggle?: () => void;
}

const typeIcons = {
  order: FileText,
  batch: FlaskConical,
  shipment: Truck,
  doseUnit: Pill,
  qcTest: Package,
  invoice: FileText,
  supplier: User,
  material: Beaker,
  recipe: ClipboardList,
  warehouse: Warehouse,
  purchaseOrder: ShoppingCart,
  grn: Box,
  customer: Building2,
};

const typeLabels = {
  order: 'Order',
  batch: 'Batch',
  shipment: 'Shipment',
  doseUnit: 'Dose Unit',
  qcTest: 'QC Test',
  invoice: 'Invoice',
  supplier: 'Supplier',
  material: 'Material',
  recipe: 'Recipe',
  warehouse: 'Warehouse',
  purchaseOrder: 'Purchase Order',
  grn: 'GRN',
  customer: 'Customer',
};

const statusColors: Record<string, string> = {
  DRAFT: 'default',
  SUBMITTED: 'info',
  VALIDATED: 'info',
  SCHEDULED: 'secondary',
  IN_PRODUCTION: 'info',
  QC_PENDING: 'warning',
  RELEASED: 'released',
  DISPATCHED: 'info',
  DELIVERED: 'success',
  CLOSED: 'closed',
  CANCELLED: 'danger',
  PACKED: 'info',
  IN_TRANSIT: 'purple',
  DISPENSED: 'teal',
};

export function LinkedRecordsSidebar({ 
  records, 
  title = 'Linked Records',
  collapsed = false,
  onToggle
}: LinkedRecordsSidebarProps) {
  const groupedRecords = records.reduce((acc, record) => {
    if (!acc[record.type]) acc[record.type] = [];
    acc[record.type].push(record);
    return acc;
  }, {} as Record<string, LinkedRecord[]>);

  if (records.length === 0) {
    return (
      <div style={{
        padding: '1rem',
        backgroundColor: 'var(--bg-secondary)',
        borderRadius: '8px',
        border: '1px solid var(--border)',
      }}>
        <h4 style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '0.5rem' }}>
          {title}
        </h4>
        <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>No linked records</p>
      </div>
    );
  }

  return (
    <div style={{
      backgroundColor: 'var(--bg-secondary)',
      borderRadius: '8px',
      border: '1px solid var(--border)',
      overflow: 'hidden',
    }}>
      <div 
        style={{ 
          padding: '0.75rem 1rem', 
          borderBottom: '1px solid var(--border)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          cursor: onToggle ? 'pointer' : 'default',
        }}
        onClick={onToggle}
      >
        <h4 style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', margin: 0 }}>
          {title} ({records.length})
        </h4>
        {onToggle && (
          <ChevronRight 
            size={16} 
            style={{ 
              color: 'var(--text-muted)',
              transform: collapsed ? 'rotate(0deg)' : 'rotate(90deg)',
              transition: 'transform 0.2s',
            }} 
          />
        )}
      </div>
      
      {!collapsed && (
        <div style={{ padding: '0.5rem' }}>
          {Object.entries(groupedRecords).map(([type, items]) => {
            const Icon = typeIcons[type as keyof typeof typeIcons] || FileText;
            return (
              <div key={type} style={{ marginBottom: '0.75rem' }}>
                <div style={{ 
                  fontSize: '0.625rem', 
                  color: 'var(--text-muted)', 
                  textTransform: 'uppercase', 
                  padding: '0.25rem 0.5rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.25rem',
                }}>
                  <Icon size={10} />
                  {typeLabels[type as keyof typeof typeLabels]}s ({items.length})
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                  {items.map(item => (
                    <Link
                      key={item.id}
                      to={item.link}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '0.5rem',
                        backgroundColor: 'var(--bg-primary)',
                        borderRadius: '4px',
                        textDecoration: 'none',
                        color: 'var(--text-primary)',
                        fontSize: '0.875rem',
                        transition: 'background-color 0.2s',
                      }}
                      onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--bg-tertiary)'}
                      onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'var(--bg-primary)'}
                    >
                      <span style={{ fontWeight: 500 }}>{item.label}</span>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        {item.status && (
                          <span className={`badge badge-${statusColors[item.status] || 'default'}`} style={{ fontSize: '0.625rem' }}>
                            {item.status.replace(/_/g, ' ')}
                          </span>
                        )}
                        <ExternalLink size={12} style={{ color: 'var(--text-muted)' }} />
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default LinkedRecordsSidebar;
