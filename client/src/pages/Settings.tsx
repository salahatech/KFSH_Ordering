import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../lib/api';
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
  Plus,
  Pencil,
  Trash2,
  X,
  Check,
  AlertCircle,
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
];

export default function Settings() {
  const [activeTab, setActiveTab] = useState('countries');
  const [showModal, setShowModal] = useState(false);
  const [editItem, setEditItem] = useState<any>(null);
  const [formData, setFormData] = useState<any>({});
  const queryClient = useQueryClient();

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
                  <td style={{ fontFamily: 'monospace' }}>{item.code}</td>
                  <td>{item.name}</td>
                  <td dir="rtl">{item.nameAr || '-'}</td>
                  <td>
                    <span className={`badge badge-${item.isActive ? 'success' : 'default'}`}>
                      {item.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td>
                    <div style={{ display: 'flex', gap: '0.25rem' }}>
                      <button className="btn btn-sm btn-outline" onClick={() => handleEdit(item)}>
                        <Pencil size={14} />
                      </button>
                      <button className="btn btn-sm btn-outline" onClick={() => handleDelete(item.id)}>
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        );

      case 'cities':
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
                  <td style={{ fontFamily: 'monospace' }}>{item.code}</td>
                  <td>{item.name}</td>
                  <td dir="rtl">{item.nameAr || '-'}</td>
                  <td>{item.country?.name}</td>
                  <td>
                    <span className={`badge badge-${item.isActive ? 'success' : 'default'}`}>
                      {item.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td>
                    <div style={{ display: 'flex', gap: '0.25rem' }}>
                      <button className="btn btn-sm btn-outline" onClick={() => handleEdit(item)}>
                        <Pencil size={14} />
                      </button>
                      <button className="btn btn-sm btn-outline" onClick={() => handleDelete(item.id)}>
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
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
                  <td style={{ fontFamily: 'monospace' }}>{item.code}</td>
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
                    <div style={{ display: 'flex', gap: '0.25rem' }}>
                      <button className="btn btn-sm btn-outline" onClick={() => handleEdit(item)}>
                        <Pencil size={14} />
                      </button>
                      <button className="btn btn-sm btn-outline" onClick={() => handleDelete(item.id)}>
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
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
                  <td style={{ fontFamily: 'monospace' }}>{item.plateNumber}</td>
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
                    <div style={{ display: 'flex', gap: '0.25rem' }}>
                      <button className="btn btn-sm btn-outline" onClick={() => handleEdit(item)}>
                        <Pencil size={14} />
                      </button>
                      <button className="btn btn-sm btn-outline" onClick={() => handleDelete(item.id)}>
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
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
                    <div style={{ display: 'flex', gap: '0.25rem' }}>
                      <button className="btn btn-sm btn-outline" onClick={() => handleEdit(item)}>
                        <Pencil size={14} />
                      </button>
                      {!item.isDefault && (
                        <button className="btn btn-sm btn-outline" onClick={() => handleDelete(item.id)}>
                          <Trash2 size={14} />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
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
                  <td style={{ fontFamily: 'monospace' }}>{item.code}</td>
                  <td>{item.name}</td>
                  <td>{item.description || item.symbol || '-'}</td>
                  <td>
                    <span className={`badge badge-${item.isActive ? 'success' : 'default'}`}>
                      {item.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td>
                    <div style={{ display: 'flex', gap: '0.25rem' }}>
                      <button className="btn btn-sm btn-outline" onClick={() => handleEdit(item)}>
                        <Pencil size={14} />
                      </button>
                      <button className="btn btn-sm btn-outline" onClick={() => handleDelete(item.id)}>
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
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
              <label>Code *</label>
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
              <label>Name *</label>
              <input
                type="text"
                className="form-input"
                value={formData.name || ''}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="e.g., Saudi Arabia"
              />
            </div>
            <div className="form-group">
              <label>Name (Arabic)</label>
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
      case 'regions':
        return (
          <>
            <div className="form-group">
              <label>Country *</label>
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
              <label>Code *</label>
              <input
                type="text"
                className="form-input"
                value={formData.code || ''}
                onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                placeholder={activeTab === 'cities' ? 'e.g., JED, RUH' : 'e.g., WEST, CENT'}
              />
            </div>
            <div className="form-group">
              <label>Name *</label>
              <input
                type="text"
                className="form-input"
                value={formData.name || ''}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder={activeTab === 'cities' ? 'e.g., Jeddah' : 'e.g., Western Region'}
              />
            </div>
            <div className="form-group">
              <label>Name (Arabic)</label>
              <input
                type="text"
                className="form-input"
                dir="rtl"
                value={formData.nameAr || ''}
                onChange={(e) => setFormData({ ...formData, nameAr: e.target.value })}
                placeholder={activeTab === 'cities' ? 'e.g., جدة' : 'e.g., المنطقة الغربية'}
              />
            </div>
          </>
        );

      case 'couriers':
        return (
          <>
            <div className="form-group">
              <label>Code *</label>
              <input
                type="text"
                className="form-input"
                value={formData.code || ''}
                onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                placeholder="e.g., COR001"
              />
            </div>
            <div className="form-group">
              <label>Name *</label>
              <input
                type="text"
                className="form-input"
                value={formData.name || ''}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="e.g., Express Medical Courier"
              />
            </div>
            <div className="form-group">
              <label>Phone</label>
              <input
                type="text"
                className="form-input"
                value={formData.phone || ''}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                placeholder="e.g., +966 12 345 6789"
              />
            </div>
            <div className="form-group">
              <label>Email</label>
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
              <label>Courier</label>
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
              <label>Plate Number *</label>
              <input
                type="text"
                className="form-input"
                value={formData.plateNumber || ''}
                onChange={(e) => setFormData({ ...formData, plateNumber: e.target.value.toUpperCase() })}
                placeholder="e.g., ABC 1234"
              />
            </div>
            <div className="form-group">
              <label>Vehicle Type *</label>
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
              <label>Model</label>
              <input
                type="text"
                className="form-input"
                value={formData.model || ''}
                onChange={(e) => setFormData({ ...formData, model: e.target.value })}
                placeholder="e.g., Toyota Hiace 2024"
              />
            </div>
            <div className="form-group">
              <label>Capacity</label>
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
              <label>Code *</label>
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
              <label>Name *</label>
              <input
                type="text"
                className="form-input"
                value={formData.name || ''}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="e.g., Saudi Riyal"
              />
            </div>
            <div className="form-group">
              <label>Symbol *</label>
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
              <label>Exchange Rate (to SAR) *</label>
              <input
                type="number"
                className="form-input"
                value={formData.exchangeRate || 1}
                onChange={(e) => setFormData({ ...formData, exchangeRate: parseFloat(e.target.value) })}
                step="0.0001"
                min="0"
              />
              <small style={{ color: 'var(--text-muted)' }}>Rate relative to SAR (SAR = 1.0000)</small>
            </div>
            <div className="form-group">
              <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <input
                  type="checkbox"
                  checked={formData.isDefault || false}
                  onChange={(e) => setFormData({ ...formData, isDefault: e.target.checked })}
                />
                Set as default currency
              </label>
            </div>
          </>
        );

      case 'dose-units':
        return (
          <>
            <div className="form-group">
              <label>Code *</label>
              <input
                type="text"
                className="form-input"
                value={formData.code || ''}
                onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                placeholder="e.g., mCi, MBq, GBq"
              />
            </div>
            <div className="form-group">
              <label>Name *</label>
              <input
                type="text"
                className="form-input"
                value={formData.name || ''}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="e.g., Millicurie"
              />
            </div>
            <div className="form-group">
              <label>Symbol *</label>
              <input
                type="text"
                className="form-input"
                value={formData.symbol || ''}
                onChange={(e) => setFormData({ ...formData, symbol: e.target.value })}
                placeholder="e.g., mCi"
              />
            </div>
            <div className="form-group">
              <label>Description</label>
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
              <label>Code *</label>
              <input
                type="text"
                className="form-input"
                value={formData.code || ''}
                onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                placeholder="Enter code"
              />
            </div>
            <div className="form-group">
              <label>Name *</label>
              <input
                type="text"
                className="form-input"
                value={formData.name || ''}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Enter name"
              />
            </div>
            <div className="form-group">
              <label>Name (Arabic)</label>
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
              <label>Description</label>
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

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.5rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <SettingsIcon size={28} style={{ color: 'var(--primary)' }} />
          <div>
            <h2 style={{ fontSize: '1.5rem', fontWeight: 600, margin: 0 }}>System Settings</h2>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', margin: 0 }}>
              Manage lookup tables and system configuration
            </p>
          </div>
        </div>
      </div>

      <div className="card" style={{ padding: 0 }}>
        <div style={{ display: 'flex', borderBottom: '1px solid var(--border)' }}>
          <div style={{ 
            width: '220px', 
            borderRight: '1px solid var(--border)', 
            padding: '0.5rem',
            backgroundColor: 'var(--background-secondary)'
          }}>
            {tabs.map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.75rem',
                    width: '100%',
                    padding: '0.75rem',
                    border: 'none',
                    borderRadius: '0.5rem',
                    backgroundColor: activeTab === tab.id ? 'white' : 'transparent',
                    color: activeTab === tab.id ? 'var(--primary)' : 'var(--text-secondary)',
                    fontWeight: activeTab === tab.id ? 600 : 400,
                    cursor: 'pointer',
                    textAlign: 'left',
                    marginBottom: '0.25rem',
                    boxShadow: activeTab === tab.id ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
                  }}
                >
                  <Icon size={18} />
                  {tab.label}
                </button>
              );
            })}
          </div>
          <div style={{ flex: 1, padding: '1rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <h3 style={{ fontWeight: 600, margin: 0 }}>
                {tabs.find(t => t.id === activeTab)?.label}
              </h3>
              <button className="btn btn-primary" onClick={handleAdd}>
                <Plus size={18} /> Add New
              </button>
            </div>
            {renderTable()}
          </div>
        </div>
      </div>

      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '500px' }}>
            <div style={{ 
              display: 'flex', 
              justifyContent: 'space-between', 
              alignItems: 'center',
              marginBottom: '1.5rem'
            }}>
              <h3 style={{ fontWeight: 600, margin: 0 }}>
                {editItem ? 'Edit' : 'Add'} {tabs.find(t => t.id === activeTab)?.label.slice(0, -1)}
              </h3>
              <button className="btn btn-sm btn-outline" onClick={() => setShowModal(false)}>
                <X size={18} />
              </button>
            </div>

            {renderForm()}

            {editItem && (
              <div className="form-group">
                <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <input
                    type="checkbox"
                    checked={formData.isActive !== false}
                    onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                  />
                  Active
                </label>
              </div>
            )}

            <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end', marginTop: '1.5rem' }}>
              <button className="btn btn-outline" onClick={() => setShowModal(false)}>
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
