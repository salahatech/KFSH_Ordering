import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../lib/api';
import { useNavigate } from 'react-router-dom';
import {
  Settings as SettingsIcon,
  Globe,
  MapPin,
  Map,
  Tag,
  Truck,
  Car,
  Activity,
  Package,
  Factory,
  DollarSign,
  Paperclip,
  Plus,
  Pencil,
  Trash2,
  X,
  ExternalLink,
  Bell,
  Languages,
  Clock,
  FileCheck,
  Mail,
  Megaphone,
} from 'lucide-react';

const tabs = [
  { id: 'countries', label: 'Countries', icon: Globe },
  { id: 'cities', label: 'Cities', icon: MapPin },
  { id: 'regions', label: 'Regions', icon: Map },
  { id: 'categories', label: 'Categories', icon: Tag },
  { id: 'couriers', label: 'Couriers', icon: Truck },
  { id: 'vehicles', label: 'Vehicles', icon: Car },
  { id: 'dose-units', label: 'Dose Units', icon: Activity },
  { id: 'product-types', label: 'Product Types', icon: Package },
  { id: 'production-methods', label: 'Production Methods', icon: Factory },
  { id: 'currencies', label: 'Currencies', icon: DollarSign },
  { id: 'attachments', label: 'Attachment Types', icon: Paperclip },
  { id: 'notifications', label: 'Notification Routing', icon: Bell, link: '/settings/notifications' },
  { id: 'channels', label: 'Notification Channels', icon: Mail, link: '/admin/notification-channels' },
  { id: 'announcements', label: 'Announcements', icon: Megaphone, link: '/admin/announcements' },
  { id: 'languages', label: 'Languages', icon: Languages, link: '/admin/languages' },
  { id: 'exchange-rates', label: 'Exchange Rates', icon: DollarSign, link: '/admin/exchange-rates' },
  { id: 'localization', label: 'Localization', icon: Clock, link: '/admin/localization' },
  { id: 'translations', label: 'Translations', icon: Globe, link: '/admin/translations' },
  { id: 'zatca', label: 'ZATCA Integration', icon: FileCheck, link: '/admin/zatca' },
];

export default function Settings() {
  const [activeTab, setActiveTab] = useState('countries');
  const [showModal, setShowModal] = useState(false);
  const [editItem, setEditItem] = useState<any>(null);
  const [formData, setFormData] = useState<any>({});
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  const { data: countries } = useQuery({
    queryKey: ['settings', 'countries'],
    queryFn: async () => {
      const { data } = await api.get('/settings/countries');
      return data;
    },
  });

  const { data: cities } = useQuery({
    queryKey: ['settings', 'cities'],
    queryFn: async () => {
      const { data } = await api.get('/settings/cities');
      return data;
    },
  });

  const { data: regions } = useQuery({
    queryKey: ['settings', 'regions'],
    queryFn: async () => {
      const { data } = await api.get('/settings/regions');
      return data;
    },
  });

  const { data: categories } = useQuery({
    queryKey: ['settings', 'categories'],
    queryFn: async () => {
      const { data } = await api.get('/settings/categories');
      return data;
    },
  });

  const { data: couriers } = useQuery({
    queryKey: ['settings', 'couriers'],
    queryFn: async () => {
      const { data } = await api.get('/settings/couriers');
      return data;
    },
  });

  const { data: vehicles } = useQuery({
    queryKey: ['settings', 'vehicles'],
    queryFn: async () => {
      const { data } = await api.get('/settings/vehicles');
      return data;
    },
  });

  const { data: doseUnits } = useQuery({
    queryKey: ['settings', 'dose-units'],
    queryFn: async () => {
      const { data } = await api.get('/settings/dose-units');
      return data;
    },
  });

  const { data: productTypes } = useQuery({
    queryKey: ['settings', 'product-types'],
    queryFn: async () => {
      const { data } = await api.get('/settings/product-types');
      return data;
    },
  });

  const { data: productionMethods } = useQuery({
    queryKey: ['settings', 'production-methods'],
    queryFn: async () => {
      const { data } = await api.get('/settings/production-methods');
      return data;
    },
  });

  const { data: currencies } = useQuery({
    queryKey: ['settings', 'currencies'],
    queryFn: async () => {
      const { data } = await api.get('/settings/currencies');
      return data;
    },
  });

  const createMutation = useMutation({
    mutationFn: async ({ endpoint, data }: { endpoint: string; data: any }) => {
      return api.post(`/settings/${endpoint}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['settings', activeTab] });
      setShowModal(false);
      setFormData({});
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ endpoint, id, data }: { endpoint: string; id: string; data: any }) => {
      return api.put(`/settings/${endpoint}/${id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['settings', activeTab] });
      setShowModal(false);
      setEditItem(null);
      setFormData({});
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async ({ endpoint, id }: { endpoint: string; id: string }) => {
      return api.delete(`/settings/${endpoint}/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['settings', activeTab] });
    },
  });

  const handleAdd = () => {
    setEditItem(null);
    setFormData({});
    setShowModal(true);
  };

  const handleEdit = (item: any) => {
    setEditItem(item);
    setFormData(item);
    setShowModal(true);
  };

  const handleDelete = async (id: string) => {
    if (confirm('Are you sure you want to delete this item?')) {
      deleteMutation.mutate({ endpoint: activeTab, id });
    }
  };

  const handleSave = () => {
    if (editItem) {
      updateMutation.mutate({ endpoint: activeTab, id: editItem.id, data: formData });
    } else {
      createMutation.mutate({ endpoint: activeTab, data: formData });
    }
  };

  const getDataForTab = () => {
    switch (activeTab) {
      case 'countries': return countries || [];
      case 'cities': return cities || [];
      case 'regions': return regions || [];
      case 'categories': return categories || [];
      case 'couriers': return couriers || [];
      case 'vehicles': return vehicles || [];
      case 'dose-units': return doseUnits || [];
      case 'product-types': return productTypes || [];
      case 'production-methods': return productionMethods || [];
      case 'currencies': return currencies || [];
      default: return [];
    }
  };

  const renderTable = () => {
    const data = getDataForTab();

    switch (activeTab) {
      case 'countries':
        return (
          <table className="table">
            <thead>
              <tr>
                <th>Code</th>
                <th>Name</th>
                <th>Name (Arabic)</th>
                <th>Status</th>
                <th style={{ width: '100px' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {data.map((item: any) => (
                <tr key={item.id}>
                  <td style={{ fontFamily: 'monospace', fontWeight: 500 }}>{item.code}</td>
                  <td>{item.name}</td>
                  <td dir="rtl">{item.nameAr || '-'}</td>
                  <td>
                    <span className={`badge badge-${item.isActive ? 'success' : 'default'}`}>
                      {item.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td>
                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                      <button className="btn btn-sm btn-secondary" onClick={() => handleEdit(item)} title="Edit">
                        <Pencil size={14} />
                      </button>
                      <button className="btn btn-sm btn-secondary" onClick={() => handleDelete(item.id)} title="Delete">
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {data.length === 0 && (
                <tr>
                  <td colSpan={5} style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '2rem' }}>
                    No records found
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        );

      case 'cities':
        return (
          <table className="table">
            <thead>
              <tr>
                <th>Code</th>
                <th>Name</th>
                <th>Name (Arabic)</th>
                <th>Region</th>
                <th>Country</th>
                <th>Status</th>
                <th style={{ width: '100px' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {data.map((item: any) => (
                <tr key={item.id}>
                  <td style={{ fontFamily: 'monospace', fontWeight: 500 }}>{item.code}</td>
                  <td>{item.name}</td>
                  <td dir="rtl">{item.nameAr || '-'}</td>
                  <td>{item.region?.name || '-'}</td>
                  <td>{item.country?.name || '-'}</td>
                  <td>
                    <span className={`badge badge-${item.isActive ? 'success' : 'default'}`}>
                      {item.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td>
                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                      <button className="btn btn-sm btn-secondary" onClick={() => handleEdit(item)} title="Edit">
                        <Pencil size={14} />
                      </button>
                      <button className="btn btn-sm btn-secondary" onClick={() => handleDelete(item.id)} title="Delete">
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {data.length === 0 && (
                <tr>
                  <td colSpan={7} style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '2rem' }}>
                    No records found
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        );

      case 'regions':
        return (
          <table className="table">
            <thead>
              <tr>
                <th>Code</th>
                <th>Name</th>
                <th>Name (Arabic)</th>
                <th>Country</th>
                <th>Status</th>
                <th style={{ width: '100px' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {data.map((item: any) => (
                <tr key={item.id}>
                  <td style={{ fontFamily: 'monospace', fontWeight: 500 }}>{item.code}</td>
                  <td>{item.name}</td>
                  <td dir="rtl">{item.nameAr || '-'}</td>
                  <td>{item.country?.name || '-'}</td>
                  <td>
                    <span className={`badge badge-${item.isActive ? 'success' : 'default'}`}>
                      {item.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td>
                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                      <button className="btn btn-sm btn-secondary" onClick={() => handleEdit(item)} title="Edit">
                        <Pencil size={14} />
                      </button>
                      <button className="btn btn-sm btn-secondary" onClick={() => handleDelete(item.id)} title="Delete">
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {data.length === 0 && (
                <tr>
                  <td colSpan={6} style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '2rem' }}>
                    No records found
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        );

      case 'couriers':
        return (
          <table className="table">
            <thead>
              <tr>
                <th>Code</th>
                <th>Name</th>
                <th>Phone</th>
                <th>Email</th>
                <th>Vehicles</th>
                <th>Status</th>
                <th style={{ width: '100px' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {data.map((item: any) => (
                <tr key={item.id}>
                  <td style={{ fontFamily: 'monospace', fontWeight: 500 }}>{item.code}</td>
                  <td>{item.name}</td>
                  <td>{item.phone || '-'}</td>
                  <td>{item.email || '-'}</td>
                  <td>{item.vehicles?.length || 0}</td>
                  <td>
                    <span className={`badge badge-${item.isActive ? 'success' : 'default'}`}>
                      {item.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td>
                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                      <button className="btn btn-sm btn-secondary" onClick={() => handleEdit(item)} title="Edit">
                        <Pencil size={14} />
                      </button>
                      <button className="btn btn-sm btn-secondary" onClick={() => handleDelete(item.id)} title="Delete">
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {data.length === 0 && (
                <tr>
                  <td colSpan={7} style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '2rem' }}>
                    No records found
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        );

      case 'vehicles':
        return (
          <table className="table">
            <thead>
              <tr>
                <th>Plate Number</th>
                <th>Type</th>
                <th>Model</th>
                <th>Capacity</th>
                <th>Courier</th>
                <th>Status</th>
                <th style={{ width: '100px' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {data.map((item: any) => (
                <tr key={item.id}>
                  <td style={{ fontFamily: 'monospace', fontWeight: 500 }}>{item.plateNumber}</td>
                  <td>{item.vehicleType}</td>
                  <td>{item.model || '-'}</td>
                  <td>{item.capacity || '-'}</td>
                  <td>{item.courier?.name || '-'}</td>
                  <td>
                    <span className={`badge badge-${item.isActive ? 'success' : 'default'}`}>
                      {item.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td>
                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                      <button className="btn btn-sm btn-secondary" onClick={() => handleEdit(item)} title="Edit">
                        <Pencil size={14} />
                      </button>
                      <button className="btn btn-sm btn-secondary" onClick={() => handleDelete(item.id)} title="Delete">
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {data.length === 0 && (
                <tr>
                  <td colSpan={7} style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '2rem' }}>
                    No records found
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        );

      case 'currencies':
        return (
          <table className="table">
            <thead>
              <tr>
                <th>Code</th>
                <th>Name</th>
                <th>Symbol</th>
                <th>Exchange Rate</th>
                <th>Default</th>
                <th>Status</th>
                <th style={{ width: '100px' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {data.map((item: any) => (
                <tr key={item.id}>
                  <td style={{ fontFamily: 'monospace', fontWeight: 600 }}>{item.code}</td>
                  <td>{item.name}</td>
                  <td style={{ fontSize: '1.125rem' }}>{item.symbol}</td>
                  <td>{item.exchangeRate.toFixed(4)}</td>
                  <td>
                    {item.isDefault && (
                      <span className="badge badge-info">Default</span>
                    )}
                  </td>
                  <td>
                    <span className={`badge badge-${item.isActive ? 'success' : 'default'}`}>
                      {item.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td>
                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                      <button className="btn btn-sm btn-secondary" onClick={() => handleEdit(item)} title="Edit">
                        <Pencil size={14} />
                      </button>
                      {!item.isDefault && (
                        <button className="btn btn-sm btn-secondary" onClick={() => handleDelete(item.id)} title="Delete">
                          <Trash2 size={14} />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
              {data.length === 0 && (
                <tr>
                  <td colSpan={7} style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '2rem' }}>
                    No records found
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        );

      case 'attachments':
        return (
          <div style={{
            padding: '3rem',
            textAlign: 'center',
            background: 'var(--bg-secondary)',
            borderRadius: '8px'
          }}>
            <Paperclip size={48} style={{ color: 'var(--primary)', marginBottom: '1rem' }} />
            <h3 style={{ margin: '0 0 0.5rem' }}>Attachment Type Settings</h3>
            <p style={{ color: 'var(--text-muted)', marginBottom: '1.5rem' }}>
              Configure allowed file types, extensions, and size limits for attachments.
            </p>
            <button
              className="btn btn-primary"
              onClick={() => navigate('/settings/attachments')}
              style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem' }}
            >
              Manage Attachment Types
              <ExternalLink size={16} />
            </button>
          </div>
        );

      default:
        return (
          <table className="table">
            <thead>
              <tr>
                <th>Code</th>
                <th>Name</th>
                <th>Description</th>
                <th>Status</th>
                <th style={{ width: '100px' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {data.map((item: any) => (
                <tr key={item.id}>
                  <td style={{ fontFamily: 'monospace', fontWeight: 500 }}>{item.code}</td>
                  <td>{item.name}</td>
                  <td>{item.description || item.symbol || '-'}</td>
                  <td>
                    <span className={`badge badge-${item.isActive ? 'success' : 'default'}`}>
                      {item.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td>
                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                      <button className="btn btn-sm btn-secondary" onClick={() => handleEdit(item)} title="Edit">
                        <Pencil size={14} />
                      </button>
                      <button className="btn btn-sm btn-secondary" onClick={() => handleDelete(item.id)} title="Delete">
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {data.length === 0 && (
                <tr>
                  <td colSpan={5} style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '2rem' }}>
                    No records found
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        );
    }
  };

  const renderForm = () => {
    switch (activeTab) {
      case 'countries':
        return (
          <>
            <div className="form-group">
              <label className="form-label">Code *</label>
              <input
                type="text"
                className="form-input"
                value={formData.code || ''}
                onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                placeholder="e.g., SA, AE, US"
                maxLength={3}
              />
            </div>
            <div className="form-group">
              <label className="form-label">Name *</label>
              <input
                type="text"
                className="form-input"
                value={formData.name || ''}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="e.g., Saudi Arabia"
              />
            </div>
            <div className="form-group">
              <label className="form-label">Name (Arabic)</label>
              <input
                type="text"
                className="form-input"
                dir="rtl"
                value={formData.nameAr || ''}
                onChange={(e) => setFormData({ ...formData, nameAr: e.target.value })}
                placeholder="e.g., المملكة العربية السعودية"
              />
            </div>
          </>
        );

      case 'cities':
        return (
          <>
            <div className="form-group">
              <label className="form-label">Country *</label>
              <select
                className="form-select"
                value={formData.countryId || ''}
                onChange={(e) => setFormData({ ...formData, countryId: e.target.value, regionId: '' })}
              >
                <option value="">Select Country</option>
                {countries?.map((c: any) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Region *</label>
              <select
                className="form-select"
                value={formData.regionId || ''}
                onChange={(e) => setFormData({ ...formData, regionId: e.target.value })}
              >
                <option value="">Select Region</option>
                {regions?.filter((r: any) => r.countryId === formData.countryId).map((r: any) => (
                  <option key={r.id} value={r.id}>{r.name}</option>
                ))}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Code *</label>
              <input
                type="text"
                className="form-input"
                value={formData.code || ''}
                onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                placeholder="e.g., JED, RUH"
              />
            </div>
            <div className="form-group">
              <label className="form-label">Name *</label>
              <input
                type="text"
                className="form-input"
                value={formData.name || ''}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="e.g., Jeddah"
              />
            </div>
            <div className="form-group">
              <label className="form-label">Name (Arabic)</label>
              <input
                type="text"
                className="form-input"
                dir="rtl"
                value={formData.nameAr || ''}
                onChange={(e) => setFormData({ ...formData, nameAr: e.target.value })}
                placeholder="e.g., جدة"
              />
            </div>
          </>
        );

      case 'regions':
        return (
          <>
            <div className="form-group">
              <label className="form-label">Country *</label>
              <select
                className="form-select"
                value={formData.countryId || ''}
                onChange={(e) => setFormData({ ...formData, countryId: e.target.value })}
              >
                <option value="">Select Country</option>
                {countries?.map((c: any) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Code *</label>
              <input
                type="text"
                className="form-input"
                value={formData.code || ''}
                onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                placeholder="e.g., WEST, CENT"
              />
            </div>
            <div className="form-group">
              <label className="form-label">Name *</label>
              <input
                type="text"
                className="form-input"
                value={formData.name || ''}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="e.g., Western Region"
              />
            </div>
            <div className="form-group">
              <label className="form-label">Name (Arabic)</label>
              <input
                type="text"
                className="form-input"
                dir="rtl"
                value={formData.nameAr || ''}
                onChange={(e) => setFormData({ ...formData, nameAr: e.target.value })}
                placeholder="e.g., المنطقة الغربية"
              />
            </div>
          </>
        );

      case 'couriers':
        return (
          <>
            <div className="form-group">
              <label className="form-label">Code *</label>
              <input
                type="text"
                className="form-input"
                value={formData.code || ''}
                onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                placeholder="e.g., COR001"
              />
            </div>
            <div className="form-group">
              <label className="form-label">Name *</label>
              <input
                type="text"
                className="form-input"
                value={formData.name || ''}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="e.g., Express Medical Courier"
              />
            </div>
            <div className="form-group">
              <label className="form-label">Phone</label>
              <input
                type="text"
                className="form-input"
                value={formData.phone || ''}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                placeholder="e.g., +966 12 345 6789"
              />
            </div>
            <div className="form-group">
              <label className="form-label">Email</label>
              <input
                type="email"
                className="form-input"
                value={formData.email || ''}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                placeholder="e.g., courier@example.com"
              />
            </div>
          </>
        );

      case 'vehicles':
        return (
          <>
            <div className="form-group">
              <label className="form-label">Courier</label>
              <select
                className="form-select"
                value={formData.courierId || ''}
                onChange={(e) => setFormData({ ...formData, courierId: e.target.value || null })}
              >
                <option value="">No Courier</option>
                {couriers?.map((c: any) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Plate Number *</label>
              <input
                type="text"
                className="form-input"
                value={formData.plateNumber || ''}
                onChange={(e) => setFormData({ ...formData, plateNumber: e.target.value.toUpperCase() })}
                placeholder="e.g., ABC 1234"
              />
            </div>
            <div className="form-group">
              <label className="form-label">Vehicle Type *</label>
              <select
                className="form-select"
                value={formData.vehicleType || ''}
                onChange={(e) => setFormData({ ...formData, vehicleType: e.target.value })}
              >
                <option value="">Select Type</option>
                <option value="Van">Van</option>
                <option value="Car">Car</option>
                <option value="Truck">Truck</option>
                <option value="Motorcycle">Motorcycle</option>
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Model</label>
              <input
                type="text"
                className="form-input"
                value={formData.model || ''}
                onChange={(e) => setFormData({ ...formData, model: e.target.value })}
                placeholder="e.g., Toyota Hiace 2024"
              />
            </div>
            <div className="form-group">
              <label className="form-label">Capacity</label>
              <input
                type="text"
                className="form-input"
                value={formData.capacity || ''}
                onChange={(e) => setFormData({ ...formData, capacity: e.target.value })}
                placeholder="e.g., 50 packages"
              />
            </div>
          </>
        );

      case 'currencies':
        return (
          <>
            <div className="form-group">
              <label className="form-label">Code *</label>
              <input
                type="text"
                className="form-input"
                value={formData.code || ''}
                onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                placeholder="e.g., SAR, USD, EUR"
                maxLength={3}
              />
            </div>
            <div className="form-group">
              <label className="form-label">Name *</label>
              <input
                type="text"
                className="form-input"
                value={formData.name || ''}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="e.g., Saudi Riyal"
              />
            </div>
            <div className="form-group">
              <label className="form-label">Symbol *</label>
              <input
                type="text"
                className="form-input"
                value={formData.symbol || ''}
                onChange={(e) => setFormData({ ...formData, symbol: e.target.value })}
                placeholder="e.g., ر.س, $, €"
                maxLength={5}
              />
            </div>
            <div className="form-group">
              <label className="form-label">Exchange Rate (to SAR) *</label>
              <input
                type="number"
                className="form-input"
                value={formData.exchangeRate || 1}
                onChange={(e) => setFormData({ ...formData, exchangeRate: parseFloat(e.target.value) })}
                step="0.0001"
                min="0"
              />
              <small style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>Rate relative to SAR (SAR = 1.0000)</small>
            </div>
            <div className="form-group">
              <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={formData.isDefault || false}
                  onChange={(e) => setFormData({ ...formData, isDefault: e.target.checked })}
                />
                <span className="form-label" style={{ marginBottom: 0 }}>Set as default currency</span>
              </label>
            </div>
          </>
        );

      case 'dose-units':
        return (
          <>
            <div className="form-group">
              <label className="form-label">Code *</label>
              <input
                type="text"
                className="form-input"
                value={formData.code || ''}
                onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                placeholder="e.g., mCi, MBq, GBq"
              />
            </div>
            <div className="form-group">
              <label className="form-label">Name *</label>
              <input
                type="text"
                className="form-input"
                value={formData.name || ''}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="e.g., Millicurie"
              />
            </div>
            <div className="form-group">
              <label className="form-label">Symbol *</label>
              <input
                type="text"
                className="form-input"
                value={formData.symbol || ''}
                onChange={(e) => setFormData({ ...formData, symbol: e.target.value })}
                placeholder="e.g., mCi"
              />
            </div>
            <div className="form-group">
              <label className="form-label">Description</label>
              <input
                type="text"
                className="form-input"
                value={formData.description || ''}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="e.g., Unit of radioactivity"
              />
            </div>
          </>
        );

      default:
        return (
          <>
            <div className="form-group">
              <label className="form-label">Code *</label>
              <input
                type="text"
                className="form-input"
                value={formData.code || ''}
                onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                placeholder="Enter code"
              />
            </div>
            <div className="form-group">
              <label className="form-label">Name *</label>
              <input
                type="text"
                className="form-input"
                value={formData.name || ''}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Enter name"
              />
            </div>
            <div className="form-group">
              <label className="form-label">Name (Arabic)</label>
              <input
                type="text"
                className="form-input"
                dir="rtl"
                value={formData.nameAr || ''}
                onChange={(e) => setFormData({ ...formData, nameAr: e.target.value })}
                placeholder="Enter Arabic name"
              />
            </div>
            <div className="form-group">
              <label className="form-label">Description</label>
              <textarea
                className="form-input"
                value={formData.description || ''}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Enter description"
                rows={2}
              />
            </div>
          </>
        );
    }
  };

  const activeTabInfo = tabs.find(t => t.id === activeTab);
  const ActiveIcon = activeTabInfo?.icon || SettingsIcon;

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.5rem' }}>
        <div>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 600, marginBottom: '0.25rem' }}>Settings</h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', margin: 0 }}>
            Configure lookup tables and system master data
          </p>
        </div>
      </div>

      <div style={{ display: 'flex', gap: '1.5rem' }}>
        <div className="card" style={{ width: '220px', padding: '0.5rem', flexShrink: 0 }}>
          <nav style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
            {tabs.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              const tabWithLink = tab as typeof tab & { link?: string };
              return (
                <button
                  key={tab.id}
                  onClick={() => {
                    if (tabWithLink.link) {
                      navigate(tabWithLink.link);
                    } else {
                      setActiveTab(tab.id);
                    }
                  }}
                  className={isActive ? 'btn btn-primary' : 'btn btn-secondary'}
                  style={{
                    justifyContent: 'flex-start',
                    width: '100%',
                    fontWeight: isActive ? 600 : 400,
                  }}
                >
                  <Icon size={16} />
                  {tab.label}
                  {tabWithLink.link && <ExternalLink size={12} style={{ marginLeft: 'auto' }} />}
                </button>
              );
            })}
          </nav>
        </div>

        <div className="card" style={{ flex: 1 }}>
          <div style={{ 
            display: 'flex', 
            justifyContent: 'space-between', 
            alignItems: 'center', 
            padding: '1rem 1.5rem',
            borderBottom: '1px solid var(--border)'
          }}>
            <h3 style={{ fontSize: '1rem', fontWeight: 600, margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <ActiveIcon size={18} />
              {activeTabInfo?.label}
            </h3>
            <button className="btn btn-primary" onClick={handleAdd}>
              <Plus size={18} />
              Add New
            </button>
          </div>
          <div style={{ overflow: 'auto' }}>
            {renderTable()}
          </div>
        </div>
      </div>

      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '500px', width: '95%' }}>
            <div className="modal-header">
              <h3 style={{ fontWeight: 600, margin: 0, fontSize: '1.125rem' }}>
                {editItem ? 'Edit' : 'Add New'} {activeTabInfo?.label.replace(/ies$/, 'y').replace(/s$/, '')}
              </h3>
              <button 
                className="btn btn-sm" 
                onClick={() => setShowModal(false)}
                style={{ padding: '0.375rem', background: 'var(--bg-secondary)', borderRadius: 'var(--radius)' }}
              >
                <X size={18} />
              </button>
            </div>

            <div className="modal-body">
              {renderForm()}

              {editItem && (
                <div className="form-group" style={{ marginTop: '1.25rem', paddingTop: '1rem', borderTop: '1px solid var(--border)' }}>
                  <label style={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    gap: '0.75rem', 
                    cursor: 'pointer',
                    padding: '0.75rem 1rem',
                    background: formData.isActive !== false ? 'rgba(34, 197, 94, 0.08)' : 'rgba(239, 68, 68, 0.08)',
                    borderRadius: 'var(--radius)',
                    border: `1px solid ${formData.isActive !== false ? 'rgba(34, 197, 94, 0.3)' : 'rgba(239, 68, 68, 0.3)'}`
                  }}>
                    <input
                      type="checkbox"
                      checked={formData.isActive !== false}
                      onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                      style={{ width: '18px', height: '18px', cursor: 'pointer' }}
                    />
                    <span style={{ fontWeight: 500, color: formData.isActive !== false ? 'var(--success)' : 'var(--danger)' }}>
                      {formData.isActive !== false ? 'Active' : 'Inactive'}
                    </span>
                  </label>
                </div>
              )}
            </div>

            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setShowModal(false)}>
                Cancel
              </button>
              <button 
                className="btn btn-primary" 
                onClick={handleSave}
                disabled={createMutation.isPending || updateMutation.isPending}
              >
                {createMutation.isPending || updateMutation.isPending ? 'Saving...' : 'Save'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
