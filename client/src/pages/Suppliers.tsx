import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../lib/api';
import {
  Plus, Search, Edit2, X, User, Mail, Phone,
  MapPin, FileText, ShoppingCart, Check, AlertCircle, Ban,
  Filter, Building2, CreditCard, Globe
} from 'lucide-react';
import { useToast } from '../components/ui/Toast';
import { KpiCard, EmptyState } from '../components/shared';
import AttachmentPanel from '../components/AttachmentPanel';

const STATUSES = [
  { value: 'ACTIVE', label: 'Active', color: 'var(--success)' },
  { value: 'ON_HOLD', label: 'On Hold', color: 'var(--warning)' },
  { value: 'BLOCKED', label: 'Blocked', color: 'var(--error)' },
  { value: 'PENDING', label: 'Pending', color: 'var(--text-muted)' },
];

interface Supplier {
  id: string;
  code: string;
  name: string;
  nameAr?: string;
  email?: string;
  phone?: string;
  mobile?: string;
  website?: string;
  taxNumber?: string;
  vatNumber?: string;
  crNumber?: string;
  bankName?: string;
  bankIban?: string;
  address?: string;
  city?: string;
  region?: string;
  country?: string;
  postalCode?: string;
  paymentTermsDays: number;
  status: string;
  contacts?: SupplierContact[];
  _count?: { purchaseOrders: number; documents: number };
}

interface SupplierContact {
  id: string;
  name: string;
  title?: string;
  email?: string;
  phone?: string;
  isPrimary: boolean;
}

interface SupplierStats {
  total: number;
  active: number;
  onHold: number;
  blocked: number;
}

const getStatusStyle = (status: string) => {
  switch (status) {
    case 'ACTIVE': return { bg: 'rgba(34, 197, 94, 0.1)', color: 'var(--success)' };
    case 'ON_HOLD': return { bg: 'rgba(234, 179, 8, 0.1)', color: 'var(--warning)' };
    case 'BLOCKED': return { bg: 'rgba(239, 68, 68, 0.1)', color: 'var(--error)' };
    case 'PENDING': return { bg: 'rgba(107, 114, 128, 0.1)', color: 'var(--text-muted)' };
    default: return { bg: 'rgba(107, 114, 128, 0.1)', color: 'var(--text-muted)' };
  }
};

export default function Suppliers() {
  const queryClient = useQueryClient();
  const toast = useToast();

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState<Supplier | null>(null);
  const [detailSupplier, setDetailSupplier] = useState<Supplier | null>(null);

  const [formData, setFormData] = useState({
    code: '',
    name: '',
    nameAr: '',
    email: '',
    phone: '',
    mobile: '',
    website: '',
    taxNumber: '',
    vatNumber: '',
    crNumber: '',
    bankName: '',
    bankBranch: '',
    bankAccountName: '',
    bankAccountNumber: '',
    bankIban: '',
    bankSwift: '',
    address: '',
    city: '',
    region: '',
    country: 'Saudi Arabia',
    postalCode: '',
    paymentTermsDays: 30,
    status: 'ACTIVE',
  });

  const { data: stats } = useQuery<SupplierStats>({
    queryKey: ['supplier-stats'],
    queryFn: async () => {
      const { data } = await api.get('/suppliers/stats');
      return data;
    },
  });

  const { data: suppliers = [], isLoading } = useQuery<Supplier[]>({
    queryKey: ['suppliers', search, statusFilter],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (search) params.append('search', search);
      if (statusFilter) params.append('status', statusFilter);
      const { data } = await api.get(`/suppliers?${params}`);
      return data;
    },
  });

  const { data: supplierDetail } = useQuery<Supplier>({
    queryKey: ['supplier', detailSupplier?.id],
    queryFn: async () => {
      const { data } = await api.get(`/suppliers/${detailSupplier?.id}`);
      return data;
    },
    enabled: !!detailSupplier?.id,
  });

  const createMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      const response = await api.post('/suppliers', data);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['suppliers'] });
      queryClient.invalidateQueries({ queryKey: ['supplier-stats'] });
      toast.success('Supplier created successfully');
      handleCloseModal();
    },
    onError: (err: Error) => {
      toast.error(err.message);
    },
  });

  const updateMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      const response = await api.put(`/suppliers/${editingSupplier?.id}`, data);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['suppliers'] });
      queryClient.invalidateQueries({ queryKey: ['supplier-stats'] });
      queryClient.invalidateQueries({ queryKey: ['supplier', detailSupplier?.id] });
      toast.success('Supplier updated successfully');
      handleCloseModal();
    },
    onError: (err: Error) => {
      toast.error(err.message);
    },
  });

  const handleCloseModal = () => {
    setShowModal(false);
    setEditingSupplier(null);
    setFormData({
      code: '',
      name: '',
      nameAr: '',
      email: '',
      phone: '',
      mobile: '',
      website: '',
      taxNumber: '',
      vatNumber: '',
      crNumber: '',
      bankName: '',
      bankBranch: '',
      bankAccountName: '',
      bankAccountNumber: '',
      bankIban: '',
      bankSwift: '',
      address: '',
      city: '',
      region: '',
      country: 'Saudi Arabia',
      postalCode: '',
      paymentTermsDays: 30,
      status: 'ACTIVE',
    });
  };

  const handleEdit = (supplier: Supplier) => {
    setEditingSupplier(supplier);
    setFormData({
      code: supplier.code,
      name: supplier.name,
      nameAr: supplier.nameAr || '',
      email: supplier.email || '',
      phone: supplier.phone || '',
      mobile: supplier.mobile || '',
      website: supplier.website || '',
      taxNumber: supplier.taxNumber || '',
      vatNumber: supplier.vatNumber || '',
      crNumber: supplier.crNumber || '',
      bankName: supplier.bankName || '',
      bankBranch: '',
      bankAccountName: '',
      bankAccountNumber: '',
      bankIban: supplier.bankIban || '',
      bankSwift: '',
      address: supplier.address || '',
      city: supplier.city || '',
      region: supplier.region || '',
      country: supplier.country || 'Saudi Arabia',
      postalCode: supplier.postalCode || '',
      paymentTermsDays: supplier.paymentTermsDays || 30,
      status: supplier.status,
    });
    setShowModal(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingSupplier) {
      updateMutation.mutate(formData);
    } else {
      createMutation.mutate(formData);
    }
  };

  if (isLoading) {
    return (
      <div className="loading-overlay">
        <div className="spinner" />
      </div>
    );
  }

  const displaySupplier = supplierDetail || detailSupplier;

  return (
    <div style={{ padding: '1.5rem' }}>
      <div className="page-header">
        <div>
          <h1>Suppliers</h1>
          <p style={{ color: 'var(--text-muted)', marginTop: '0.25rem' }}>
            Manage vendor and supplier information
          </p>
        </div>
        <button className="btn btn-primary" onClick={() => setShowModal(true)}>
          <Plus size={16} /> Add Supplier
        </button>
      </div>

      <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
        <KpiCard 
          title="Total Suppliers" 
          value={stats?.total || 0} 
          icon={<Building2 size={24} />}
          color="primary"
        />
        <KpiCard 
          title="Active" 
          value={stats?.active || 0} 
          icon={<Check size={24} />}
          color="success"
        />
        <KpiCard 
          title="On Hold" 
          value={stats?.onHold || 0} 
          icon={<AlertCircle size={24} />}
          color="warning"
        />
        <KpiCard 
          title="Blocked" 
          value={stats?.blocked || 0} 
          icon={<Ban size={24} />}
          color="danger"
        />
      </div>

      <div className="card" style={{ padding: '1rem', marginBottom: '1.5rem' }}>
        <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Filter size={18} style={{ color: 'var(--text-muted)' }} />
            <span style={{ fontWeight: 500, color: 'var(--text-muted)' }}>Filters:</span>
          </div>
          <div style={{ position: 'relative', flex: 1, minWidth: '200px', maxWidth: '300px' }}>
            <Search size={16} style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
            <input
              type="text"
              className="form-input"
              placeholder="Search by name, code, or city..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{ paddingLeft: '2.25rem' }}
            />
          </div>
          <select 
            className="form-select"
            style={{ width: 'auto', minWidth: '130px' }}
            value={statusFilter} 
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="">All Statuses</option>
            {STATUSES.map(s => (
              <option key={s.value} value={s.value}>{s.label}</option>
            ))}
          </select>
          {(statusFilter || search) && (
            <button
              className="btn btn-sm btn-secondary"
              onClick={() => {
                setStatusFilter('');
                setSearch('');
              }}
            >
              <X size={14} /> Clear
            </button>
          )}
        </div>
      </div>

      <div className="grid" style={{ gridTemplateColumns: detailSupplier ? '1fr 400px' : '1fr', gap: '1.5rem' }}>
        <div>
          <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '1rem' }}>
            {suppliers.map((supplier) => {
              const statusStyle = getStatusStyle(supplier.status);
              const isSelected = detailSupplier?.id === supplier.id;
              return (
                <div 
                  key={supplier.id} 
                  className="card" 
                  style={{ 
                    padding: '1.25rem', 
                    cursor: 'pointer',
                    border: isSelected ? '2px solid var(--primary)' : '1px solid var(--border)',
                    transition: 'all 0.2s',
                  }}
                  onClick={() => setDetailSupplier(supplier)}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.75rem' }}>
                    <span 
                      className="badge"
                      style={{ 
                        background: statusStyle.bg, 
                        color: statusStyle.color,
                        fontWeight: 600,
                      }}
                    >
                      {STATUSES.find(s => s.value === supplier.status)?.label || supplier.status}
                    </span>
                    <button
                      className="btn btn-secondary btn-sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleEdit(supplier);
                      }}
                    >
                      <Edit2 size={14} />
                    </button>
                  </div>
                  
                  <h3 style={{ fontWeight: 600, marginBottom: '0.25rem', fontSize: '1rem' }}>{supplier.name}</h3>
                  {supplier.nameAr && (
                    <p style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', marginBottom: '0.25rem', direction: 'rtl' }}>
                      {supplier.nameAr}
                    </p>
                  )}
                  <p style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', marginBottom: '1rem' }}>
                    <span style={{ fontFamily: 'monospace' }}>{supplier.code}</span>
                  </p>
                  
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.375rem', fontSize: '0.8125rem' }}>
                    {supplier.email && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <Mail size={14} style={{ color: 'var(--text-muted)' }} />
                        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{supplier.email}</span>
                      </div>
                    )}
                    {supplier.phone && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <Phone size={14} style={{ color: 'var(--text-muted)' }} />
                        <span>{supplier.phone}</span>
                      </div>
                    )}
                    {supplier.city && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <MapPin size={14} style={{ color: 'var(--text-muted)' }} />
                        <span>{[supplier.city, supplier.country].filter(Boolean).join(', ')}</span>
                      </div>
                    )}
                  </div>

                  <div style={{ 
                    marginTop: '0.75rem', 
                    paddingTop: '0.75rem', 
                    borderTop: '1px solid var(--border)', 
                    fontSize: '0.75rem', 
                    color: 'var(--text-muted)',
                    display: 'flex',
                    gap: '1rem',
                    alignItems: 'center',
                  }}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                      <CreditCard size={12} /> {supplier.paymentTermsDays} days
                    </span>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                      <ShoppingCart size={12} /> {supplier._count?.purchaseOrders || 0} POs
                    </span>
                  </div>
                </div>
              );
            })}
          </div>

          {suppliers.length === 0 && (
            <div className="card" style={{ padding: '2rem' }}>
              <EmptyState 
                title="No suppliers found"
                message={search || statusFilter ? 'Try adjusting your filters' : 'Add your first supplier to get started'}
                icon="package"
              />
            </div>
          )}
        </div>

        {detailSupplier && displaySupplier && (
          <div className="card" style={{ padding: 0, height: 'fit-content', position: 'sticky', top: '1rem' }}>
            <div style={{ 
              padding: '1.25rem', 
              borderBottom: '1px solid var(--border)',
              background: getStatusStyle(displaySupplier.status).bg,
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                  <span 
                    className="badge"
                    style={{ 
                      background: getStatusStyle(displaySupplier.status).color, 
                      color: 'white',
                      marginBottom: '0.5rem',
                    }}
                  >
                    {STATUSES.find(s => s.value === displaySupplier.status)?.label || displaySupplier.status}
                  </span>
                  <h3 style={{ fontWeight: 600, fontSize: '1.125rem', margin: '0.5rem 0 0.25rem' }}>{displaySupplier.name}</h3>
                  {displaySupplier.nameAr && (
                    <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)', margin: 0, direction: 'rtl' }}>
                      {displaySupplier.nameAr}
                    </p>
                  )}
                  <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)', margin: '0.25rem 0 0' }}>
                    {displaySupplier.code}
                  </p>
                </div>
                <button
                  className="btn btn-sm btn-secondary"
                  onClick={() => setDetailSupplier(null)}
                  style={{ borderRadius: '50%', width: '28px', height: '28px', padding: 0 }}
                >
                  <X size={14} />
                </button>
              </div>
            </div>

            <div style={{ padding: '1.25rem' }}>
              <div style={{ marginBottom: '1.25rem' }}>
                <div style={{ fontSize: '0.6875rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.75rem' }}>
                  Contact Information
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  {displaySupplier.email && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.5rem', background: 'var(--bg-secondary)', borderRadius: 'var(--radius)' }}>
                      <Mail size={16} style={{ color: 'var(--primary)' }} />
                      <span style={{ fontSize: '0.875rem' }}>{displaySupplier.email}</span>
                    </div>
                  )}
                  {displaySupplier.phone && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.5rem', background: 'var(--bg-secondary)', borderRadius: 'var(--radius)' }}>
                      <Phone size={16} style={{ color: 'var(--success)' }} />
                      <span style={{ fontSize: '0.875rem' }}>{displaySupplier.phone}</span>
                    </div>
                  )}
                  {displaySupplier.mobile && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.5rem', background: 'var(--bg-secondary)', borderRadius: 'var(--radius)' }}>
                      <Phone size={16} style={{ color: 'var(--info)' }} />
                      <span style={{ fontSize: '0.875rem' }}>{displaySupplier.mobile}</span>
                    </div>
                  )}
                  {displaySupplier.website && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.5rem', background: 'var(--bg-secondary)', borderRadius: 'var(--radius)' }}>
                      <Globe size={16} style={{ color: 'var(--warning)' }} />
                      <a href={displaySupplier.website} target="_blank" rel="noopener noreferrer" style={{ fontSize: '0.875rem', color: 'var(--primary)' }}>
                        {displaySupplier.website}
                      </a>
                    </div>
                  )}
                </div>
              </div>

              {(displaySupplier.address || displaySupplier.city) && (
                <div style={{ marginBottom: '1.25rem' }}>
                  <div style={{ fontSize: '0.6875rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.5rem' }}>
                    Address
                  </div>
                  <div style={{ padding: '0.75rem', background: 'var(--bg-secondary)', borderRadius: 'var(--radius)' }}>
                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.5rem' }}>
                      <MapPin size={16} style={{ color: 'var(--primary)', marginTop: '0.125rem' }} />
                      <div style={{ fontSize: '0.875rem' }}>
                        {displaySupplier.address && <div>{displaySupplier.address}</div>}
                        <div>{[displaySupplier.city, displaySupplier.region, displaySupplier.country].filter(Boolean).join(', ')}</div>
                        {displaySupplier.postalCode && <div>Postal Code: {displaySupplier.postalCode}</div>}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              <div style={{ marginBottom: '1.25rem' }}>
                <div style={{ fontSize: '0.6875rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.75rem' }}>
                  Financial Details
                </div>
                <div className="grid" style={{ gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
                  <div style={{ padding: '0.75rem', background: 'var(--bg-secondary)', borderRadius: 'var(--radius)' }}>
                    <div style={{ fontSize: '0.6875rem', color: 'var(--text-muted)', marginBottom: '0.25rem' }}>Payment Terms</div>
                    <div style={{ fontWeight: 600 }}>{displaySupplier.paymentTermsDays} days</div>
                  </div>
                  <div style={{ padding: '0.75rem', background: 'var(--bg-secondary)', borderRadius: 'var(--radius)' }}>
                    <div style={{ fontSize: '0.6875rem', color: 'var(--text-muted)', marginBottom: '0.25rem' }}>Purchase Orders</div>
                    <div style={{ fontWeight: 600 }}>{displaySupplier._count?.purchaseOrders || 0}</div>
                  </div>
                </div>
              </div>

              {(displaySupplier.taxNumber || displaySupplier.vatNumber || displaySupplier.crNumber) && (
                <div style={{ marginBottom: '1.25rem' }}>
                  <div style={{ fontSize: '0.6875rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.5rem' }}>
                    Tax & Registration
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.375rem', fontSize: '0.8125rem' }}>
                    {displaySupplier.taxNumber && (
                      <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.5rem', border: '1px solid var(--border)', borderRadius: 'var(--radius)' }}>
                        <span style={{ color: 'var(--text-muted)' }}>Tax Number</span>
                        <span style={{ fontWeight: 500 }}>{displaySupplier.taxNumber}</span>
                      </div>
                    )}
                    {displaySupplier.vatNumber && (
                      <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.5rem', border: '1px solid var(--border)', borderRadius: 'var(--radius)' }}>
                        <span style={{ color: 'var(--text-muted)' }}>VAT Number</span>
                        <span style={{ fontWeight: 500 }}>{displaySupplier.vatNumber}</span>
                      </div>
                    )}
                    {displaySupplier.crNumber && (
                      <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.5rem', border: '1px solid var(--border)', borderRadius: 'var(--radius)' }}>
                        <span style={{ color: 'var(--text-muted)' }}>CR Number</span>
                        <span style={{ fontWeight: 500 }}>{displaySupplier.crNumber}</span>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {(displaySupplier.bankName || displaySupplier.bankIban) && (
                <div style={{ marginBottom: '1.25rem' }}>
                  <div style={{ fontSize: '0.6875rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.5rem' }}>
                    Bank Information
                  </div>
                  <div style={{ padding: '0.75rem', background: 'var(--bg-secondary)', borderRadius: 'var(--radius)' }}>
                    {displaySupplier.bankName && <div style={{ fontWeight: 500, marginBottom: '0.25rem' }}>{displaySupplier.bankName}</div>}
                    {displaySupplier.bankIban && (
                      <div style={{ fontSize: '0.8125rem', fontFamily: 'monospace', color: 'var(--text-muted)' }}>
                        {displaySupplier.bankIban}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {displaySupplier.contacts && displaySupplier.contacts.length > 0 && (
                <div style={{ marginBottom: '1.25rem' }}>
                  <div style={{ fontSize: '0.6875rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.5rem' }}>
                    Contacts ({displaySupplier.contacts.length})
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    {displaySupplier.contacts.map((contact) => (
                      <div key={contact.id} style={{ padding: '0.75rem', border: '1px solid var(--border)', borderRadius: 'var(--radius)' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <span style={{ fontWeight: 500 }}>{contact.name}</span>
                          {contact.isPrimary && (
                            <span className="badge" style={{ fontSize: '0.625rem', background: 'rgba(59, 130, 246, 0.1)', color: 'var(--primary)' }}>
                              Primary
                            </span>
                          )}
                        </div>
                        {contact.title && <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{contact.title}</div>}
                        {contact.email && <div style={{ fontSize: '0.75rem', marginTop: '0.25rem' }}>{contact.email}</div>}
                        {contact.phone && <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{contact.phone}</div>}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div style={{ marginBottom: '1.25rem' }}>
                <AttachmentPanel
                  entityType="Supplier"
                  entityId={displaySupplier.id}
                  title="Supplier Documents"
                />
              </div>

              <button
                className="btn btn-primary"
                style={{ width: '100%' }}
                onClick={() => handleEdit(displaySupplier)}
              >
                <Edit2 size={16} /> Edit Supplier
              </button>
            </div>
          </div>
        )}
      </div>

      {showModal && (
        <div className="modal-overlay" onClick={handleCloseModal}>
          <div className="modal" style={{ maxWidth: '40rem' }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3 style={{ fontWeight: 600, margin: 0 }}>{editingSupplier ? 'Edit Supplier' : 'Add Supplier'}</h3>
              <button type="button" onClick={handleCloseModal} style={{ background: 'var(--bg-secondary)', border: 'none', borderRadius: 'var(--radius)', padding: '0.375rem', cursor: 'pointer', fontSize: '1.25rem', lineHeight: 1 }}>&times;</button>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="modal-body">
                <div className="grid" style={{ gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                  <div className="form-group">
                    <label className="form-label">Code</label>
                    <input className="form-input" type="text" value={formData.code} onChange={(e) => setFormData({ ...formData, code: e.target.value })} required disabled={!!editingSupplier} placeholder="e.g., SUP-001" />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Status</label>
                    <select className="form-select" value={formData.status} onChange={(e) => setFormData({ ...formData, status: e.target.value })}>
                      {STATUSES.map(s => (
                        <option key={s.value} value={s.value}>{s.label}</option>
                      ))}
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Name (English)</label>
                    <input className="form-input" type="text" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} required />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Name (Arabic)</label>
                    <input className="form-input" type="text" value={formData.nameAr} onChange={(e) => setFormData({ ...formData, nameAr: e.target.value })} dir="rtl" />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Email</label>
                    <input className="form-input" type="email" value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Phone</label>
                    <input className="form-input" type="text" value={formData.phone} onChange={(e) => setFormData({ ...formData, phone: e.target.value })} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Mobile</label>
                    <input className="form-input" type="text" value={formData.mobile} onChange={(e) => setFormData({ ...formData, mobile: e.target.value })} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Website</label>
                    <input className="form-input" type="url" value={formData.website} onChange={(e) => setFormData({ ...formData, website: e.target.value })} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Tax Number</label>
                    <input className="form-input" type="text" value={formData.taxNumber} onChange={(e) => setFormData({ ...formData, taxNumber: e.target.value })} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">VAT Number</label>
                    <input className="form-input" type="text" value={formData.vatNumber} onChange={(e) => setFormData({ ...formData, vatNumber: e.target.value })} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">CR Number</label>
                    <input className="form-input" type="text" value={formData.crNumber} onChange={(e) => setFormData({ ...formData, crNumber: e.target.value })} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Bank Name</label>
                    <input className="form-input" type="text" value={formData.bankName} onChange={(e) => setFormData({ ...formData, bankName: e.target.value })} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">IBAN</label>
                    <input className="form-input" type="text" value={formData.bankIban} onChange={(e) => setFormData({ ...formData, bankIban: e.target.value })} placeholder="SA..." />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Payment Terms (Days)</label>
                    <input className="form-input" type="number" value={formData.paymentTermsDays} onChange={(e) => setFormData({ ...formData, paymentTermsDays: parseInt(e.target.value) || 30 })} min={0} />
                  </div>
                  <div className="form-group" style={{ gridColumn: 'span 2' }}>
                    <label className="form-label">Address</label>
                    <input className="form-input" type="text" value={formData.address} onChange={(e) => setFormData({ ...formData, address: e.target.value })} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">City</label>
                    <input className="form-input" type="text" value={formData.city} onChange={(e) => setFormData({ ...formData, city: e.target.value })} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Region</label>
                    <input className="form-input" type="text" value={formData.region} onChange={(e) => setFormData({ ...formData, region: e.target.value })} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Country</label>
                    <input className="form-input" type="text" value={formData.country} onChange={(e) => setFormData({ ...formData, country: e.target.value })} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Postal Code</label>
                    <input className="form-input" type="text" value={formData.postalCode} onChange={(e) => setFormData({ ...formData, postalCode: e.target.value })} />
                  </div>
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={handleCloseModal}>Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={createMutation.isPending || updateMutation.isPending}>
                  {(createMutation.isPending || updateMutation.isPending) ? 'Saving...' : 'Save Supplier'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
