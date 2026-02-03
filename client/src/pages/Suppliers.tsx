import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../lib/api';
import {
  Plus, Search, Edit2, Eye, X, User, Mail, Phone,
  MapPin, FileText, ShoppingCart, Check, AlertCircle, Ban
} from 'lucide-react';
import { useToast } from '../components/ui/Toast';
import { KpiCard } from '../components/shared';

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

export default function Suppliers() {
  const queryClient = useQueryClient();
  const toast = useToast();

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState<Supplier | null>(null);
  const [selectedSupplier, setSelectedSupplier] = useState<Supplier | null>(null);

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
    queryKey: ['supplier', selectedSupplier?.id],
    queryFn: async () => {
      const { data } = await api.get(`/suppliers/${selectedSupplier?.id}`);
      return data;
    },
    enabled: !!selectedSupplier?.id,
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

  const getStatusColor = (status: string) => {
    const s = STATUSES.find(st => st.value === status);
    return s?.color || 'var(--text-muted)';
  };

  return (
    <div className="page-container">
      <div className="page-header">
        <div>
          <h1 className="page-title">Suppliers</h1>
          <p className="page-subtitle">Manage vendor and supplier information</p>
        </div>
        <button className="btn btn-primary" onClick={() => setShowModal(true)}>
          <Plus size={16} /> Add Supplier
        </button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
        <KpiCard 
          title="Total Suppliers" 
          value={stats?.total || 0} 
          icon={<User size={24} />}
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

      <div className="card">
        <div className="filter-bar">
          <div className="search-box">
            <Search className="search-icon" />
            <input
              type="text"
              placeholder="Search suppliers..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="filter-select"
          >
            <option value="">All Statuses</option>
            {STATUSES.map(s => (
              <option key={s.value} value={s.value}>{s.label}</option>
            ))}
          </select>
        </div>

        {isLoading ? (
          <div className="loading-spinner">Loading...</div>
        ) : suppliers.length === 0 ? (
          <div style={{ padding: '3rem', textAlign: 'center' }}>
            <ShoppingCart style={{ fontSize: '3rem', color: 'var(--text-muted)', marginBottom: '1rem' }} />
            <h3 style={{ marginBottom: '0.5rem' }}>No suppliers found</h3>
            <p style={{ color: 'var(--text-muted)', marginBottom: '1rem' }}>Add your first supplier to get started</p>
            <button className="btn btn-primary" onClick={() => setShowModal(true)}>
              <Plus size={16} /> Add Supplier
            </button>
          </div>
        ) : (
          <div className="table-container">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Code</th>
                  <th>Name</th>
                  <th>Contact</th>
                  <th>City</th>
                  <th>Payment Terms</th>
                  <th>POs</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {suppliers.map((supplier) => (
                  <tr key={supplier.id}>
                    <td><strong>{supplier.code}</strong></td>
                    <td>
                      <div>{supplier.name}</div>
                      {supplier.nameAr && (
                        <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                          {supplier.nameAr}
                        </div>
                      )}
                    </td>
                    <td>
                      {supplier.email && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', fontSize: '0.85rem' }}>
                          <Mail size={12} /> {supplier.email}
                        </div>
                      )}
                      {supplier.phone && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', fontSize: '0.85rem' }}>
                          <Phone size={12} /> {supplier.phone}
                        </div>
                      )}
                    </td>
                    <td>{supplier.city || '-'}</td>
                    <td>{supplier.paymentTermsDays} days</td>
                    <td>{supplier._count?.purchaseOrders || 0}</td>
                    <td>
                      <span
                        className="status-badge"
                        style={{ backgroundColor: getStatusColor(supplier.status) + '20', color: getStatusColor(supplier.status) }}
                      >
                        {STATUSES.find(s => s.value === supplier.status)?.label || supplier.status}
                      </span>
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: '0.5rem' }}>
                        <button
                          className="icon-button"
                          onClick={() => {
                            setSelectedSupplier(supplier);
                            setShowDetailModal(true);
                          }}
                          title="View Details"
                        >
                          <Eye size={16} />
                        </button>
                        <button
                          className="icon-button"
                          onClick={() => handleEdit(supplier)}
                          title="Edit"
                        >
                          <Edit2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {showModal && (
        <div className="modal-overlay" onClick={handleCloseModal}>
          <div className="modal" style={{ maxWidth: '50rem' }} onClick={(e) => e.stopPropagation()}>
            <form onSubmit={handleSubmit}>
              <div className="modal-header">
                <h3 style={{ fontWeight: 600, margin: 0 }}>{editingSupplier ? 'Edit Supplier' : 'Add Supplier'}</h3>
                <button type="button" onClick={handleCloseModal} style={{ background: 'var(--bg-secondary)', border: 'none', borderRadius: 'var(--radius)', padding: '0.375rem', cursor: 'pointer', fontSize: '1.25rem', lineHeight: 1 }}>&times;</button>
              </div>
              <div className="modal-body">
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <div className="form-group">
                <label>Supplier Code *</label>
                <input
                  type="text"
                  value={formData.code}
                  onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                  required
                  disabled={!!editingSupplier}
                  placeholder="e.g., SUP-001"
                />
              </div>
              <div className="form-group">
                <label>Status</label>
                <select
                  value={formData.status}
                  onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                >
                  {STATUSES.map(s => (
                    <option key={s.value} value={s.value}>{s.label}</option>
                  ))}
                </select>
              </div>
              <div className="form-group">
                <label>Name (English) *</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                />
              </div>
              <div className="form-group">
                <label>Name (Arabic)</label>
                <input
                  type="text"
                  value={formData.nameAr}
                  onChange={(e) => setFormData({ ...formData, nameAr: e.target.value })}
                  dir="rtl"
                />
              </div>
              <div className="form-group">
                <label>Email</label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                />
              </div>
              <div className="form-group">
                <label>Phone</label>
                <input
                  type="text"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                />
              </div>
              <div className="form-group">
                <label>Mobile</label>
                <input
                  type="text"
                  value={formData.mobile}
                  onChange={(e) => setFormData({ ...formData, mobile: e.target.value })}
                />
              </div>
              <div className="form-group">
                <label>Website</label>
                <input
                  type="url"
                  value={formData.website}
                  onChange={(e) => setFormData({ ...formData, website: e.target.value })}
                />
              </div>
            </div>

            <h4 style={{ marginTop: '1.5rem', marginBottom: '0.75rem' }}>Tax & Registration</h4>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1rem' }}>
              <div className="form-group">
                <label>Tax Number</label>
                <input
                  type="text"
                  value={formData.taxNumber}
                  onChange={(e) => setFormData({ ...formData, taxNumber: e.target.value })}
                />
              </div>
              <div className="form-group">
                <label>VAT Number</label>
                <input
                  type="text"
                  value={formData.vatNumber}
                  onChange={(e) => setFormData({ ...formData, vatNumber: e.target.value })}
                />
              </div>
              <div className="form-group">
                <label>CR Number</label>
                <input
                  type="text"
                  value={formData.crNumber}
                  onChange={(e) => setFormData({ ...formData, crNumber: e.target.value })}
                />
              </div>
            </div>

            <h4 style={{ marginTop: '1.5rem', marginBottom: '0.75rem' }}>Bank Information</h4>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <div className="form-group">
                <label>Bank Name</label>
                <input
                  type="text"
                  value={formData.bankName}
                  onChange={(e) => setFormData({ ...formData, bankName: e.target.value })}
                />
              </div>
              <div className="form-group">
                <label>IBAN</label>
                <input
                  type="text"
                  value={formData.bankIban}
                  onChange={(e) => setFormData({ ...formData, bankIban: e.target.value })}
                  placeholder="SA..."
                />
              </div>
            </div>

            <h4 style={{ marginTop: '1.5rem', marginBottom: '0.75rem' }}>Address</h4>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <div className="form-group" style={{ gridColumn: 'span 2' }}>
                <label>Address</label>
                <input
                  type="text"
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                />
              </div>
              <div className="form-group">
                <label>City</label>
                <input
                  type="text"
                  value={formData.city}
                  onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                />
              </div>
              <div className="form-group">
                <label>Region</label>
                <input
                  type="text"
                  value={formData.region}
                  onChange={(e) => setFormData({ ...formData, region: e.target.value })}
                />
              </div>
              <div className="form-group">
                <label>Country</label>
                <input
                  type="text"
                  value={formData.country}
                  onChange={(e) => setFormData({ ...formData, country: e.target.value })}
                />
              </div>
              <div className="form-group">
                <label>Postal Code</label>
                <input
                  type="text"
                  value={formData.postalCode}
                  onChange={(e) => setFormData({ ...formData, postalCode: e.target.value })}
                />
              </div>
            </div>

            <h4 style={{ marginTop: '1.5rem', marginBottom: '0.75rem' }}>Payment Terms</h4>
            <div className="form-group" style={{ maxWidth: '200px' }}>
              <label>Payment Terms (Days)</label>
              <input
                type="number"
                value={formData.paymentTermsDays}
                onChange={(e) => setFormData({ ...formData, paymentTermsDays: parseInt(e.target.value) || 30 })}
                min={0}
              />
            </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={handleCloseModal}>
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={createMutation.isPending || updateMutation.isPending}
                >
                  {(createMutation.isPending || updateMutation.isPending) ? 'Saving...' : (editingSupplier ? 'Update' : 'Create')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showDetailModal && supplierDetail && (
        <div className="modal-overlay" onClick={() => setShowDetailModal(false)}>
          <div className="modal" style={{ maxWidth: '50rem' }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3 style={{ fontWeight: 600, margin: 0 }}>Supplier Details</h3>
              <button type="button" onClick={() => setShowDetailModal(false)} style={{ background: 'var(--bg-secondary)', border: 'none', borderRadius: 'var(--radius)', padding: '0.375rem', cursor: 'pointer', fontSize: '1.25rem', lineHeight: 1 }}>&times;</button>
            </div>
            <div className="modal-body">
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
                <div>
                  <h4 style={{ marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <User size={16} /> General Information
                  </h4>
                  <div className="detail-list">
                    <div><strong>Code:</strong> {supplierDetail.code}</div>
                    <div><strong>Name:</strong> {supplierDetail.name}</div>
                    {supplierDetail.nameAr && <div><strong>Arabic Name:</strong> {supplierDetail.nameAr}</div>}
                    <div>
                      <strong>Status:</strong>{' '}
                      <span
                        className="status-badge"
                        style={{ backgroundColor: getStatusColor(supplierDetail.status) + '20', color: getStatusColor(supplierDetail.status) }}
                      >
                        {STATUSES.find(s => s.value === supplierDetail.status)?.label}
                      </span>
                    </div>
                  </div>
                </div>

                <div>
                  <h4 style={{ marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <Mail size={16} /> Contact
                  </h4>
                  <div className="detail-list">
                    <div><strong>Email:</strong> {supplierDetail.email || '-'}</div>
                    <div><strong>Phone:</strong> {supplierDetail.phone || '-'}</div>
                    <div><strong>Mobile:</strong> {supplierDetail.mobile || '-'}</div>
                    <div><strong>Website:</strong> {supplierDetail.website || '-'}</div>
                  </div>
                </div>

                <div>
                  <h4 style={{ marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <MapPin size={16} /> Address
                  </h4>
                  <div className="detail-list">
                    <div>{supplierDetail.address || '-'}</div>
                    <div>{[supplierDetail.city, supplierDetail.region, supplierDetail.country].filter(Boolean).join(', ') || '-'}</div>
                    <div><strong>Postal Code:</strong> {supplierDetail.postalCode || '-'}</div>
                  </div>
                </div>

                <div>
                  <h4 style={{ marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <FileText size={16} /> Tax & Financial
                  </h4>
                  <div className="detail-list">
                    <div><strong>Tax Number:</strong> {supplierDetail.taxNumber || '-'}</div>
                    <div><strong>VAT Number:</strong> {supplierDetail.vatNumber || '-'}</div>
                    <div><strong>CR Number:</strong> {supplierDetail.crNumber || '-'}</div>
                    <div><strong>Payment Terms:</strong> {supplierDetail.paymentTermsDays} days</div>
                  </div>
                </div>
              </div>

              {supplierDetail.contacts && supplierDetail.contacts.length > 0 && (
                <div style={{ marginTop: '1.5rem' }}>
                  <h4 style={{ marginBottom: '0.75rem' }}>Contacts</h4>
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th>Name</th>
                        <th>Title</th>
                        <th>Email</th>
                        <th>Phone</th>
                        <th>Primary</th>
                      </tr>
                    </thead>
                    <tbody>
                      {supplierDetail.contacts.map((contact) => (
                        <tr key={contact.id}>
                          <td>{contact.name}</td>
                          <td>{contact.title || '-'}</td>
                          <td>{contact.email || '-'}</td>
                          <td>{contact.phone || '-'}</td>
                          <td>{contact.isPrimary ? <Check color="var(--success)" /> : '-'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
            <div className="modal-footer">
              <button type="button" className="btn btn-secondary" onClick={() => setShowDetailModal(false)}>
                Close
              </button>
              <button type="button" className="btn btn-primary" onClick={() => {
                setShowDetailModal(false);
                if (supplierDetail) handleEdit(supplierDetail);
              }}>
                <Edit2 size={16} /> Edit
              </button>
            </div>
          </div>
        </div>
      )}

      <style>{`
        .detail-list {
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
          font-size: 0.9rem;
        }
      `}</style>
    </div>
  );
}
