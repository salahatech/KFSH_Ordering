import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { 
  Warehouse as WarehouseIcon, Plus, Search, MapPin, Thermometer, Package, Edit2, Trash2, 
  X, CheckCircle, Wrench, Grid, Filter, Droplets, AlertTriangle, Atom, FlaskConical
} from 'lucide-react';
import api from '../lib/api';
import { KpiCard, EmptyState } from '../components/shared';
import { useToast } from '../components/ui/Toast';
import AttachmentPanel from '../components/AttachmentPanel';

interface WarehouseLocation {
  id: string;
  code: string;
  name: string;
  zone?: string;
  aisle?: string;
  rack?: string;
  shelf?: string;
  bin?: string;
  capacity?: number;
  capacityUnit?: string;
  isActive: boolean;
}

interface WarehouseData {
  id: string;
  code: string;
  name: string;
  nameAr?: string;
  type: string;
  status: string;
  description?: string;
  address?: string;
  temperatureMin?: number;
  temperatureMax?: number;
  humidityMin?: number;
  humidityMax?: number;
  isRadioactive: boolean;
  requiresQC: boolean;
  locations: WarehouseLocation[];
  _count: {
    locations: number;
    stockItems: number;
  };
}

interface Stats {
  total: number;
  active: number;
  inactive: number;
  maintenance: number;
  totalLocations: number;
  totalStockItems: number;
}

const WAREHOUSE_TYPES = [
  { value: 'RAW_MATERIALS', label: 'Raw Materials', color: '#3b82f6' },
  { value: 'QUARANTINE', label: 'Quarantine', color: '#f59e0b' },
  { value: 'PRODUCTION', label: 'Production', color: '#8b5cf6' },
  { value: 'FINISHED_GOODS', label: 'Finished Goods', color: '#22c55e' },
  { value: 'COLD_STORAGE', label: 'Cold Storage', color: '#06b6d4' },
  { value: 'RADIOACTIVE', label: 'Radioactive', color: '#ef4444' },
  { value: 'WASTE', label: 'Waste', color: '#6b7280' },
];

const WAREHOUSE_STATUSES = [
  { value: 'ACTIVE', label: 'Active', color: '#22c55e' },
  { value: 'INACTIVE', label: 'Inactive', color: '#94a3b8' },
  { value: 'MAINTENANCE', label: 'Maintenance', color: '#f59e0b' },
];

const getTypeStyle = (type: string) => {
  const t = WAREHOUSE_TYPES.find(wt => wt.value === type);
  return { bg: `${t?.color}15`, color: t?.color || '#6b7280' };
};

const getStatusStyle = (status: string) => {
  const s = WAREHOUSE_STATUSES.find(st => st.value === status);
  return { bg: `${s?.color}20`, color: s?.color || '#6b7280' };
};

export default function Warehouses() {
  const queryClient = useQueryClient();
  const toast = useToast();

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingWarehouse, setEditingWarehouse] = useState<WarehouseData | null>(null);
  const [detailWarehouse, setDetailWarehouse] = useState<WarehouseData | null>(null);
  const [showLocationModal, setShowLocationModal] = useState(false);
  const [editingLocation, setEditingLocation] = useState<WarehouseLocation | null>(null);

  const [formData, setFormData] = useState({
    code: '',
    name: '',
    nameAr: '',
    type: 'RAW_MATERIALS',
    status: 'ACTIVE',
    description: '',
    address: '',
    temperatureMin: '',
    temperatureMax: '',
    humidityMin: '',
    humidityMax: '',
    isRadioactive: false,
    requiresQC: true,
  });

  const [locationFormData, setLocationFormData] = useState({
    code: '',
    name: '',
    zone: '',
    aisle: '',
    rack: '',
    shelf: '',
    bin: '',
    capacity: '',
    capacityUnit: '',
    isActive: true,
  });

  const { data: stats } = useQuery<Stats>({
    queryKey: ['warehouse-stats'],
    queryFn: async () => {
      const { data } = await api.get('/warehouses/stats');
      return data;
    },
  });

  const { data: warehouses = [], isLoading } = useQuery<WarehouseData[]>({
    queryKey: ['warehouses', search, statusFilter, typeFilter],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (statusFilter) params.append('status', statusFilter);
      if (typeFilter) params.append('type', typeFilter);
      if (search) params.append('search', search);
      const { data } = await api.get(`/warehouses?${params}`);
      return data;
    },
  });

  const { data: warehouseDetail } = useQuery<WarehouseData>({
    queryKey: ['warehouse', detailWarehouse?.id],
    queryFn: async () => {
      const { data } = await api.get(`/warehouses/${detailWarehouse?.id}`);
      return data;
    },
    enabled: !!detailWarehouse?.id,
  });

  const saveMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      if (editingWarehouse) {
        return api.put(`/warehouses/${editingWarehouse.id}`, data);
      }
      return api.post('/warehouses', data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['warehouses'] });
      queryClient.invalidateQueries({ queryKey: ['warehouse-stats'] });
      toast.success(editingWarehouse ? 'Warehouse updated' : 'Warehouse created');
      handleCloseModal();
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.error || 'Failed to save warehouse');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => api.delete(`/warehouses/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['warehouses'] });
      queryClient.invalidateQueries({ queryKey: ['warehouse-stats'] });
      toast.success('Warehouse deleted');
      if (detailWarehouse) setDetailWarehouse(null);
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.error || 'Failed to delete warehouse');
    },
  });

  const locationMutation = useMutation({
    mutationFn: async (data: typeof locationFormData) => {
      if (editingLocation) {
        return api.put(`/warehouses/${detailWarehouse?.id}/locations/${editingLocation.id}`, data);
      }
      return api.post(`/warehouses/${detailWarehouse?.id}/locations`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['warehouse', detailWarehouse?.id] });
      queryClient.invalidateQueries({ queryKey: ['warehouses'] });
      queryClient.invalidateQueries({ queryKey: ['warehouse-stats'] });
      toast.success(editingLocation ? 'Location updated' : 'Location added');
      setShowLocationModal(false);
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.error || 'Failed to save location');
    },
  });

  const deleteLocationMutation = useMutation({
    mutationFn: async (locationId: string) => api.delete(`/warehouses/${detailWarehouse?.id}/locations/${locationId}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['warehouse', detailWarehouse?.id] });
      queryClient.invalidateQueries({ queryKey: ['warehouses'] });
      queryClient.invalidateQueries({ queryKey: ['warehouse-stats'] });
      toast.success('Location deleted');
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.error || 'Failed to delete location');
    },
  });

  const handleCloseModal = () => {
    setShowModal(false);
    setEditingWarehouse(null);
    setFormData({
      code: '',
      name: '',
      nameAr: '',
      type: 'RAW_MATERIALS',
      status: 'ACTIVE',
      description: '',
      address: '',
      temperatureMin: '',
      temperatureMax: '',
      humidityMin: '',
      humidityMax: '',
      isRadioactive: false,
      requiresQC: true,
    });
  };

  const handleEdit = (warehouse: WarehouseData) => {
    setEditingWarehouse(warehouse);
    setFormData({
      code: warehouse.code,
      name: warehouse.name,
      nameAr: warehouse.nameAr || '',
      type: warehouse.type,
      status: warehouse.status,
      description: warehouse.description || '',
      address: warehouse.address || '',
      temperatureMin: warehouse.temperatureMin?.toString() || '',
      temperatureMax: warehouse.temperatureMax?.toString() || '',
      humidityMin: warehouse.humidityMin?.toString() || '',
      humidityMax: warehouse.humidityMax?.toString() || '',
      isRadioactive: warehouse.isRadioactive,
      requiresQC: warehouse.requiresQC,
    });
    setShowModal(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    saveMutation.mutate(formData);
  };

  const handleAddLocation = () => {
    setEditingLocation(null);
    setLocationFormData({
      code: '',
      name: '',
      zone: '',
      aisle: '',
      rack: '',
      shelf: '',
      bin: '',
      capacity: '',
      capacityUnit: '',
      isActive: true,
    });
    setShowLocationModal(true);
  };

  const handleEditLocation = (location: WarehouseLocation) => {
    setEditingLocation(location);
    setLocationFormData({
      code: location.code,
      name: location.name,
      zone: location.zone || '',
      aisle: location.aisle || '',
      rack: location.rack || '',
      shelf: location.shelf || '',
      bin: location.bin || '',
      capacity: location.capacity?.toString() || '',
      capacityUnit: location.capacityUnit || '',
      isActive: location.isActive,
    });
    setShowLocationModal(true);
  };

  const handleLocationSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    locationMutation.mutate(locationFormData);
  };

  const displayWarehouse = warehouseDetail || detailWarehouse;

  if (isLoading) {
    return (
      <div className="loading-overlay">
        <div className="spinner" />
      </div>
    );
  }

  return (
    <div style={{ padding: '1.5rem' }}>
      <div className="page-header">
        <div>
          <h1>Warehouses</h1>
          <p style={{ color: 'var(--text-muted)', marginTop: '0.25rem' }}>
            Manage warehouse locations and storage areas
          </p>
        </div>
        <button className="btn btn-primary" onClick={() => { handleCloseModal(); setShowModal(true); }}>
          <Plus size={16} /> Add Warehouse
        </button>
      </div>

      <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
        <KpiCard 
          title="Total Warehouses" 
          value={stats?.total || 0} 
          icon={<WarehouseIcon size={24} />}
          color="primary"
        />
        <KpiCard 
          title="Active" 
          value={stats?.active || 0} 
          icon={<CheckCircle size={24} />}
          color="success"
        />
        <KpiCard 
          title="Maintenance" 
          value={stats?.maintenance || 0} 
          icon={<Wrench size={24} />}
          color="warning"
        />
        <KpiCard 
          title="Locations" 
          value={stats?.totalLocations || 0} 
          icon={<Grid size={24} />}
          color="info"
        />
        <KpiCard 
          title="Stock Items" 
          value={stats?.totalStockItems || 0} 
          icon={<Package size={24} />}
          color="default"
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
              placeholder="Search by name or code..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{ paddingLeft: '2.25rem' }}
            />
          </div>
          <select 
            className="form-select"
            style={{ width: 'auto', minWidth: '140px' }}
            value={typeFilter} 
            onChange={(e) => setTypeFilter(e.target.value)}
          >
            <option value="">All Types</option>
            {WAREHOUSE_TYPES.map(t => (
              <option key={t.value} value={t.value}>{t.label}</option>
            ))}
          </select>
          <select 
            className="form-select"
            style={{ width: 'auto', minWidth: '130px' }}
            value={statusFilter} 
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="">All Statuses</option>
            {WAREHOUSE_STATUSES.map(s => (
              <option key={s.value} value={s.value}>{s.label}</option>
            ))}
          </select>
          {(statusFilter || typeFilter || search) && (
            <button
              className="btn btn-sm btn-secondary"
              onClick={() => {
                setStatusFilter('');
                setTypeFilter('');
                setSearch('');
              }}
            >
              <X size={14} /> Clear
            </button>
          )}
        </div>
      </div>

      <div className="grid" style={{ gridTemplateColumns: detailWarehouse ? '1fr 420px' : '1fr', gap: '1.5rem' }}>
        <div>
          <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '1rem' }}>
            {warehouses.map((wh) => {
              const typeStyle = getTypeStyle(wh.type);
              const statusStyle = getStatusStyle(wh.status);
              const isSelected = detailWarehouse?.id === wh.id;
              return (
                <div 
                  key={wh.id} 
                  className="card" 
                  style={{ 
                    padding: '1.25rem', 
                    cursor: 'pointer',
                    border: isSelected ? '2px solid var(--primary)' : '1px solid var(--border)',
                    transition: 'all 0.2s',
                  }}
                  onClick={() => setDetailWarehouse(wh)}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.75rem' }}>
                    <span 
                      className="badge"
                      style={{ 
                        background: typeStyle.bg, 
                        color: typeStyle.color,
                        fontWeight: 600,
                      }}
                    >
                      {WAREHOUSE_TYPES.find(t => t.value === wh.type)?.label || wh.type}
                    </span>
                    <button
                      className="btn btn-secondary btn-sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleEdit(wh);
                      }}
                    >
                      <Edit2 size={14} />
                    </button>
                  </div>
                  
                  <h3 style={{ fontWeight: 600, marginBottom: '0.25rem', fontSize: '1rem' }}>{wh.name}</h3>
                  {wh.nameAr && (
                    <p style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', marginBottom: '0.25rem', direction: 'rtl' }}>
                      {wh.nameAr}
                    </p>
                  )}
                  <p style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', marginBottom: '1rem' }}>
                    <span style={{ fontFamily: 'monospace' }}>{wh.code}</span>
                  </p>
                  
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem', fontSize: '0.8125rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
                      <Grid size={14} style={{ color: 'var(--text-muted)' }} />
                      <span>{wh._count.locations} locations</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
                      <Package size={14} style={{ color: 'var(--text-muted)' }} />
                      <span>{wh._count.stockItems} items</span>
                    </div>
                    {(wh.temperatureMin !== null && wh.temperatureMax !== null) && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', gridColumn: 'span 2' }}>
                        <Thermometer size={14} style={{ color: 'var(--info)' }} />
                        <span>{wh.temperatureMin}°C - {wh.temperatureMax}°C</span>
                      </div>
                    )}
                  </div>

                  <div style={{ 
                    marginTop: '0.75rem', 
                    paddingTop: '0.75rem', 
                    borderTop: '1px solid var(--border)', 
                    fontSize: '0.75rem', 
                    display: 'flex',
                    gap: '0.5rem',
                    flexWrap: 'wrap',
                    alignItems: 'center',
                  }}>
                    <span 
                      className="badge" 
                      style={{ 
                        fontSize: '0.6875rem',
                        background: statusStyle.bg,
                        color: statusStyle.color,
                      }}
                    >
                      {WAREHOUSE_STATUSES.find(s => s.value === wh.status)?.label || wh.status}
                    </span>
                    {wh.isRadioactive && (
                      <span className="badge" style={{ fontSize: '0.6875rem', background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444' }}>
                        <Atom size={10} style={{ marginRight: '0.25rem' }} /> Radioactive
                      </span>
                    )}
                    {wh.requiresQC && (
                      <span className="badge" style={{ fontSize: '0.6875rem', background: 'rgba(139, 92, 246, 0.1)', color: '#8b5cf6' }}>
                        <FlaskConical size={10} style={{ marginRight: '0.25rem' }} /> QC Required
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {warehouses.length === 0 && (
            <div className="card" style={{ padding: '2rem' }}>
              <EmptyState 
                title="No warehouses found"
                message={search || statusFilter || typeFilter ? 'Try adjusting your filters' : 'Add your first warehouse to get started'}
                icon="package"
              />
            </div>
          )}
        </div>

        {detailWarehouse && displayWarehouse && (
          <div className="card" style={{ padding: 0, height: 'fit-content', position: 'sticky', top: '1rem' }}>
            <div style={{ 
              padding: '1.25rem', 
              borderBottom: '1px solid var(--border)',
              background: getTypeStyle(displayWarehouse.type).bg,
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                  <span 
                    className="badge"
                    style={{ 
                      background: getTypeStyle(displayWarehouse.type).color, 
                      color: 'white',
                      marginBottom: '0.5rem',
                    }}
                  >
                    {WAREHOUSE_TYPES.find(t => t.value === displayWarehouse.type)?.label || displayWarehouse.type}
                  </span>
                  <h3 style={{ fontWeight: 600, fontSize: '1.125rem', margin: '0.5rem 0 0.25rem' }}>{displayWarehouse.name}</h3>
                  {displayWarehouse.nameAr && (
                    <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)', margin: 0, direction: 'rtl' }}>
                      {displayWarehouse.nameAr}
                    </p>
                  )}
                  <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)', margin: '0.25rem 0 0' }}>
                    {displayWarehouse.code}
                  </p>
                </div>
                <button
                  className="btn btn-sm btn-secondary"
                  onClick={() => setDetailWarehouse(null)}
                  style={{ borderRadius: '50%', width: '28px', height: '28px', padding: 0 }}
                >
                  <X size={14} />
                </button>
              </div>
            </div>

            <div style={{ padding: '1.25rem', maxHeight: 'calc(100vh - 200px)', overflowY: 'auto' }}>
              <div style={{ marginBottom: '1.25rem' }}>
                <div style={{ fontSize: '0.6875rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.75rem' }}>
                  Status & Attributes
                </div>
                <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                  <span className="badge" style={{ ...getStatusStyle(displayWarehouse.status) }}>
                    {WAREHOUSE_STATUSES.find(s => s.value === displayWarehouse.status)?.label}
                  </span>
                  {displayWarehouse.isRadioactive && (
                    <span className="badge" style={{ background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444' }}>
                      <Atom size={12} /> Radioactive
                    </span>
                  )}
                  {displayWarehouse.requiresQC && (
                    <span className="badge" style={{ background: 'rgba(139, 92, 246, 0.1)', color: '#8b5cf6' }}>
                      <FlaskConical size={12} /> QC Required
                    </span>
                  )}
                </div>
              </div>

              <div style={{ marginBottom: '1.25rem' }}>
                <div style={{ fontSize: '0.6875rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.75rem' }}>
                  Capacity Overview
                </div>
                <div className="grid" style={{ gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
                  <div style={{ padding: '0.75rem', background: 'var(--bg-secondary)', borderRadius: 'var(--radius)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', marginBottom: '0.25rem' }}>
                      <Grid size={14} style={{ color: 'var(--primary)' }} />
                      <span style={{ fontSize: '0.6875rem', color: 'var(--text-muted)' }}>Locations</span>
                    </div>
                    <div style={{ fontWeight: 600, fontSize: '1.25rem' }}>{displayWarehouse._count.locations}</div>
                  </div>
                  <div style={{ padding: '0.75rem', background: 'var(--bg-secondary)', borderRadius: 'var(--radius)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', marginBottom: '0.25rem' }}>
                      <Package size={14} style={{ color: 'var(--success)' }} />
                      <span style={{ fontSize: '0.6875rem', color: 'var(--text-muted)' }}>Stock Items</span>
                    </div>
                    <div style={{ fontWeight: 600, fontSize: '1.25rem' }}>{displayWarehouse._count.stockItems}</div>
                  </div>
                </div>
              </div>

              {(displayWarehouse.temperatureMin !== null || displayWarehouse.humidityMin !== null) && (
                <div style={{ marginBottom: '1.25rem' }}>
                  <div style={{ fontSize: '0.6875rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.75rem' }}>
                    Environmental Conditions
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    {displayWarehouse.temperatureMin !== null && displayWarehouse.temperatureMax !== null && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.5rem', background: 'var(--bg-secondary)', borderRadius: 'var(--radius)' }}>
                        <Thermometer size={16} style={{ color: 'var(--info)' }} />
                        <span style={{ fontSize: '0.875rem' }}>Temperature: {displayWarehouse.temperatureMin}°C - {displayWarehouse.temperatureMax}°C</span>
                      </div>
                    )}
                    {displayWarehouse.humidityMin !== null && displayWarehouse.humidityMax !== null && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.5rem', background: 'var(--bg-secondary)', borderRadius: 'var(--radius)' }}>
                        <Droplets size={16} style={{ color: 'var(--primary)' }} />
                        <span style={{ fontSize: '0.875rem' }}>Humidity: {displayWarehouse.humidityMin}% - {displayWarehouse.humidityMax}%</span>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {displayWarehouse.address && (
                <div style={{ marginBottom: '1.25rem' }}>
                  <div style={{ fontSize: '0.6875rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.5rem' }}>
                    Address
                  </div>
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.5rem', padding: '0.75rem', background: 'var(--bg-secondary)', borderRadius: 'var(--radius)' }}>
                    <MapPin size={16} style={{ color: 'var(--primary)', marginTop: '0.125rem' }} />
                    <span style={{ fontSize: '0.875rem' }}>{displayWarehouse.address}</span>
                  </div>
                </div>
              )}

              {displayWarehouse.description && (
                <div style={{ marginBottom: '1.25rem' }}>
                  <div style={{ fontSize: '0.6875rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.5rem' }}>
                    Description
                  </div>
                  <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', margin: 0 }}>
                    {displayWarehouse.description}
                  </p>
                </div>
              )}

              <div style={{ marginBottom: '1.25rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                  <div style={{ fontSize: '0.6875rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    Locations ({displayWarehouse.locations?.length || 0})
                  </div>
                  <button className="btn btn-sm btn-secondary" onClick={handleAddLocation}>
                    <Plus size={14} /> Add
                  </button>
                </div>
                {displayWarehouse.locations && displayWarehouse.locations.length > 0 ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    {displayWarehouse.locations.map((loc) => (
                      <div key={loc.id} style={{ padding: '0.75rem', border: '1px solid var(--border)', borderRadius: 'var(--radius)' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <div>
                            <span style={{ fontWeight: 500 }}>{loc.name}</span>
                            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginLeft: '0.5rem' }}>({loc.code})</span>
                          </div>
                          <div style={{ display: 'flex', gap: '0.25rem' }}>
                            <button className="btn btn-ghost btn-sm" onClick={() => handleEditLocation(loc)}>
                              <Edit2 size={12} />
                            </button>
                            <button 
                              className="btn btn-ghost btn-sm" 
                              style={{ color: 'var(--error)' }}
                              onClick={() => {
                                if (confirm('Delete this location?')) {
                                  deleteLocationMutation.mutate(loc.id);
                                }
                              }}
                            >
                              <Trash2 size={12} />
                            </button>
                          </div>
                        </div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
                          {[loc.zone, loc.aisle, loc.rack, loc.shelf].filter(Boolean).join(' / ') || 'No hierarchy defined'}
                        </div>
                        <span 
                          className="badge" 
                          style={{ 
                            fontSize: '0.625rem', 
                            marginTop: '0.375rem',
                            background: loc.isActive ? 'rgba(34, 197, 94, 0.1)' : 'rgba(239, 68, 68, 0.1)',
                            color: loc.isActive ? '#22c55e' : '#ef4444',
                          }}
                        >
                          {loc.isActive ? 'Active' : 'Inactive'}
                        </span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div style={{ textAlign: 'center', padding: '1rem', color: 'var(--text-muted)', fontSize: '0.875rem' }}>
                    No locations defined
                  </div>
                )}
              </div>

              <div style={{ marginBottom: '1.25rem' }}>
                <AttachmentPanel
                  entityType="Warehouse"
                  entityId={displayWarehouse.id}
                  title="Warehouse Documents"
                />
              </div>

              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <button
                  className="btn btn-primary"
                  style={{ flex: 1 }}
                  onClick={() => handleEdit(displayWarehouse)}
                >
                  <Edit2 size={16} /> Edit Warehouse
                </button>
                {displayWarehouse._count.stockItems === 0 && displayWarehouse._count.locations === 0 && (
                  <button
                    className="btn btn-secondary"
                    style={{ color: 'var(--error)' }}
                    onClick={() => {
                      if (confirm('Are you sure you want to delete this warehouse?')) {
                        deleteMutation.mutate(displayWarehouse.id);
                      }
                    }}
                  >
                    <Trash2 size={16} />
                  </button>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {showModal && (
        <div className="modal-overlay" onClick={handleCloseModal}>
          <div className="modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '600px', maxHeight: '90vh', overflow: 'auto' }}>
            <div className="modal-header">
              <h2>{editingWarehouse ? 'Edit Warehouse' : 'Add Warehouse'}</h2>
              <button className="btn btn-ghost" onClick={handleCloseModal}>&times;</button>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="modal-body">
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                  <div className="form-group">
                    <label>Code *</label>
                    <input
                      type="text"
                      className="form-input"
                      value={formData.code}
                      onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                      required
                      disabled={!!editingWarehouse}
                    />
                  </div>
                  <div className="form-group">
                    <label>Status</label>
                    <select
                      className="form-select"
                      value={formData.status}
                      onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                    >
                      {WAREHOUSE_STATUSES.map(s => (
                        <option key={s.value} value={s.value}>{s.label}</option>
                      ))}
                    </select>
                  </div>
                  <div className="form-group">
                    <label>Name *</label>
                    <input
                      type="text"
                      className="form-input"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label>Name (Arabic)</label>
                    <input
                      type="text"
                      className="form-input"
                      value={formData.nameAr}
                      onChange={(e) => setFormData({ ...formData, nameAr: e.target.value })}
                      dir="rtl"
                    />
                  </div>
                  <div className="form-group" style={{ gridColumn: 'span 2' }}>
                    <label>Type</label>
                    <select
                      className="form-select"
                      value={formData.type}
                      onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                    >
                      {WAREHOUSE_TYPES.map(t => (
                        <option key={t.value} value={t.value}>{t.label}</option>
                      ))}
                    </select>
                  </div>
                  <div className="form-group" style={{ gridColumn: 'span 2' }}>
                    <label>Description</label>
                    <textarea
                      className="form-input"
                      value={formData.description}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                      rows={2}
                    />
                  </div>
                  <div className="form-group" style={{ gridColumn: 'span 2' }}>
                    <label>Address</label>
                    <input
                      type="text"
                      className="form-input"
                      value={formData.address}
                      onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                    />
                  </div>
                  <div className="form-group">
                    <label>Temperature Min (°C)</label>
                    <input
                      type="number"
                      className="form-input"
                      value={formData.temperatureMin}
                      onChange={(e) => setFormData({ ...formData, temperatureMin: e.target.value })}
                      step="0.1"
                    />
                  </div>
                  <div className="form-group">
                    <label>Temperature Max (°C)</label>
                    <input
                      type="number"
                      className="form-input"
                      value={formData.temperatureMax}
                      onChange={(e) => setFormData({ ...formData, temperatureMax: e.target.value })}
                      step="0.1"
                    />
                  </div>
                  <div className="form-group">
                    <label>Humidity Min (%)</label>
                    <input
                      type="number"
                      className="form-input"
                      value={formData.humidityMin}
                      onChange={(e) => setFormData({ ...formData, humidityMin: e.target.value })}
                    />
                  </div>
                  <div className="form-group">
                    <label>Humidity Max (%)</label>
                    <input
                      type="number"
                      className="form-input"
                      value={formData.humidityMax}
                      onChange={(e) => setFormData({ ...formData, humidityMax: e.target.value })}
                    />
                  </div>
                  <div className="form-group">
                    <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <input
                        type="checkbox"
                        checked={formData.isRadioactive}
                        onChange={(e) => setFormData({ ...formData, isRadioactive: e.target.checked })}
                      />
                      Radioactive Storage
                    </label>
                  </div>
                  <div className="form-group">
                    <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <input
                        type="checkbox"
                        checked={formData.requiresQC}
                        onChange={(e) => setFormData({ ...formData, requiresQC: e.target.checked })}
                      />
                      Requires QC
                    </label>
                  </div>
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn" onClick={handleCloseModal}>Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={saveMutation.isPending}>
                  {saveMutation.isPending ? 'Saving...' : (editingWarehouse ? 'Update' : 'Create')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showLocationModal && (
        <div className="modal-overlay" onClick={() => setShowLocationModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '500px' }}>
            <div className="modal-header">
              <h2>{editingLocation ? 'Edit Location' : 'Add Location'}</h2>
              <button className="btn btn-ghost" onClick={() => setShowLocationModal(false)}>&times;</button>
            </div>
            <form onSubmit={handleLocationSubmit}>
              <div className="modal-body">
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                  <div className="form-group">
                    <label>Code *</label>
                    <input
                      type="text"
                      className="form-input"
                      value={locationFormData.code}
                      onChange={(e) => setLocationFormData({ ...locationFormData, code: e.target.value })}
                      required
                      disabled={!!editingLocation}
                    />
                  </div>
                  <div className="form-group">
                    <label>Name *</label>
                    <input
                      type="text"
                      className="form-input"
                      value={locationFormData.name}
                      onChange={(e) => setLocationFormData({ ...locationFormData, name: e.target.value })}
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label>Zone</label>
                    <input
                      type="text"
                      className="form-input"
                      value={locationFormData.zone}
                      onChange={(e) => setLocationFormData({ ...locationFormData, zone: e.target.value })}
                    />
                  </div>
                  <div className="form-group">
                    <label>Aisle</label>
                    <input
                      type="text"
                      className="form-input"
                      value={locationFormData.aisle}
                      onChange={(e) => setLocationFormData({ ...locationFormData, aisle: e.target.value })}
                    />
                  </div>
                  <div className="form-group">
                    <label>Rack</label>
                    <input
                      type="text"
                      className="form-input"
                      value={locationFormData.rack}
                      onChange={(e) => setLocationFormData({ ...locationFormData, rack: e.target.value })}
                    />
                  </div>
                  <div className="form-group">
                    <label>Shelf</label>
                    <input
                      type="text"
                      className="form-input"
                      value={locationFormData.shelf}
                      onChange={(e) => setLocationFormData({ ...locationFormData, shelf: e.target.value })}
                    />
                  </div>
                  <div className="form-group">
                    <label>Bin</label>
                    <input
                      type="text"
                      className="form-input"
                      value={locationFormData.bin}
                      onChange={(e) => setLocationFormData({ ...locationFormData, bin: e.target.value })}
                    />
                  </div>
                  <div className="form-group">
                    <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '1.5rem' }}>
                      <input
                        type="checkbox"
                        checked={locationFormData.isActive}
                        onChange={(e) => setLocationFormData({ ...locationFormData, isActive: e.target.checked })}
                      />
                      Active
                    </label>
                  </div>
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn" onClick={() => setShowLocationModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={locationMutation.isPending}>
                  {locationMutation.isPending ? 'Saving...' : (editingLocation ? 'Update' : 'Create')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
