import { useState, useEffect } from 'react';
import { Warehouse, Plus, Search, MapPin, Thermometer, Package, Edit, Trash2, Eye, ChevronDown, ChevronUp, CheckCircle, Wrench, Grid } from 'lucide-react';
import api from '../lib/api';
import { KpiCard } from '../components/shared';

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
  { value: 'RAW_MATERIALS', label: 'Raw Materials' },
  { value: 'QUARANTINE', label: 'Quarantine' },
  { value: 'PRODUCTION', label: 'Production' },
  { value: 'FINISHED_GOODS', label: 'Finished Goods' },
  { value: 'COLD_STORAGE', label: 'Cold Storage' },
  { value: 'RADIOACTIVE', label: 'Radioactive' },
  { value: 'WASTE', label: 'Waste' },
];

const WAREHOUSE_STATUSES = [
  { value: 'ACTIVE', label: 'Active', color: '#22c55e' },
  { value: 'INACTIVE', label: 'Inactive', color: '#94a3b8' },
  { value: 'MAINTENANCE', label: 'Maintenance', color: '#f59e0b' },
];

export default function Warehouses() {
  const [warehouses, setWarehouses] = useState<WarehouseData[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedWarehouse, setSelectedWarehouse] = useState<WarehouseData | null>(null);
  const [expandedWarehouse, setExpandedWarehouse] = useState<string | null>(null);
  const [showLocationModal, setShowLocationModal] = useState(false);
  const [selectedLocation, setSelectedLocation] = useState<WarehouseLocation | null>(null);
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

  useEffect(() => {
    fetchData();
  }, [statusFilter, typeFilter, search]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (statusFilter) params.append('status', statusFilter);
      if (typeFilter) params.append('type', typeFilter);
      if (search) params.append('search', search);
      
      const [warehouseRes, statsRes] = await Promise.all([
        api.get(`/warehouses?${params}`),
        api.get('/warehouses/stats'),
      ]);
      
      setWarehouses(warehouseRes.data);
      setStats(statsRes.data);
    } catch (error) {
      console.error('Error fetching warehouses:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (selectedWarehouse) {
        await api.put(`/warehouses/${selectedWarehouse.id}`, formData);
      } else {
        await api.post('/warehouses', formData);
      }
      setShowModal(false);
      resetForm();
      fetchData();
    } catch (error) {
      console.error('Error saving warehouse:', error);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this warehouse?')) return;
    try {
      await api.delete(`/warehouses/${id}`);
      fetchData();
    } catch (error: any) {
      alert(error.response?.data?.error || 'Failed to delete warehouse');
    }
  };

  const handleEdit = (warehouse: WarehouseData) => {
    setSelectedWarehouse(warehouse);
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

  const handleViewDetail = async (warehouse: WarehouseData) => {
    try {
      const res = await api.get(`/warehouses/${warehouse.id}`);
      setSelectedWarehouse(res.data);
      setShowDetailModal(true);
    } catch (error) {
      console.error('Error fetching warehouse details:', error);
    }
  };

  const resetForm = () => {
    setSelectedWarehouse(null);
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

  const handleAddLocation = (warehouse: WarehouseData) => {
    setSelectedWarehouse(warehouse);
    setSelectedLocation(null);
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

  const handleEditLocation = (warehouse: WarehouseData, location: WarehouseLocation) => {
    setSelectedWarehouse(warehouse);
    setSelectedLocation(location);
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

  const handleLocationSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedWarehouse) return;
    
    try {
      if (selectedLocation) {
        await api.put(`/warehouses/${selectedWarehouse.id}/locations/${selectedLocation.id}`, locationFormData);
      } else {
        await api.post(`/warehouses/${selectedWarehouse.id}/locations`, locationFormData);
      }
      setShowLocationModal(false);
      fetchData();
      if (showDetailModal) {
        const res = await api.get(`/warehouses/${selectedWarehouse.id}`);
        setSelectedWarehouse(res.data);
      }
    } catch (error) {
      console.error('Error saving location:', error);
    }
  };

  const handleDeleteLocation = async (warehouseId: string, locationId: string) => {
    if (!confirm('Are you sure you want to delete this location?')) return;
    try {
      await api.delete(`/warehouses/${warehouseId}/locations/${locationId}`);
      fetchData();
      if (showDetailModal && selectedWarehouse) {
        const res = await api.get(`/warehouses/${selectedWarehouse.id}`);
        setSelectedWarehouse(res.data);
      }
    } catch (error: any) {
      alert(error.response?.data?.error || 'Failed to delete location');
    }
  };

  const getStatusStyle = (status: string) => {
    const s = WAREHOUSE_STATUSES.find(st => st.value === status);
    return { backgroundColor: `${s?.color}20`, color: s?.color };
  };

  const getTypeLabel = (type: string) => {
    return WAREHOUSE_TYPES.find(t => t.value === type)?.label || type;
  };

  return (
    <div className="page-container">
      <div className="page-header">
        <div>
          <h1>Warehouses</h1>
          <p style={{ color: 'var(--text-muted)', marginTop: '0.25rem' }}>
            Manage warehouse locations and storage areas
          </p>
        </div>
        <button className="btn btn-primary" onClick={() => { resetForm(); setShowModal(true); }}>
          <Plus size={18} /> Add Warehouse
        </button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
        <KpiCard 
          title="Total Warehouses" 
          value={stats?.total || 0} 
          icon={<Warehouse size={24} />}
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

      <div className="card">
        <div style={{ display: 'flex', gap: '1rem', marginBottom: '1rem', flexWrap: 'wrap' }}>
          <div style={{ position: 'relative', flex: 1, minWidth: '200px' }}>
            <Search size={18} style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
            <input
              type="text"
              placeholder="Search warehouses..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="form-input"
              style={{ paddingLeft: '2.5rem' }}
            />
          </div>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="form-select"
            style={{ minWidth: '150px' }}
          >
            <option value="">All Statuses</option>
            {WAREHOUSE_STATUSES.map(s => (
              <option key={s.value} value={s.value}>{s.label}</option>
            ))}
          </select>
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="form-select"
            style={{ minWidth: '150px' }}
          >
            <option value="">All Types</option>
            {WAREHOUSE_TYPES.map(t => (
              <option key={t.value} value={t.value}>{t.label}</option>
            ))}
          </select>
        </div>

        {loading ? (
          <div style={{ textAlign: 'center', padding: '3rem' }}>Loading...</div>
        ) : warehouses.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
            <Warehouse size={48} style={{ marginBottom: '1rem', opacity: 0.5 }} />
            <p>No warehouses found</p>
          </div>
        ) : (
          <div className="table-container">
            <table className="data-table">
              <thead>
                <tr>
                  <th style={{ width: '40px' }}></th>
                  <th>Code</th>
                  <th>Name</th>
                  <th>Type</th>
                  <th>Status</th>
                  <th>Locations</th>
                  <th>Stock Items</th>
                  <th>Temperature</th>
                  <th style={{ width: '120px' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {warehouses.map((wh) => (
                  <>
                    <tr key={wh.id}>
                      <td>
                        <button
                          className="btn btn-ghost btn-sm"
                          onClick={() => setExpandedWarehouse(expandedWarehouse === wh.id ? null : wh.id)}
                        >
                          {expandedWarehouse === wh.id ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                        </button>
                      </td>
                      <td><strong>{wh.code}</strong></td>
                      <td>
                        <div>{wh.name}</div>
                        {wh.nameAr && <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{wh.nameAr}</div>}
                      </td>
                      <td>{getTypeLabel(wh.type)}</td>
                      <td>
                        <span className="badge" style={getStatusStyle(wh.status)}>
                          {WAREHOUSE_STATUSES.find(s => s.value === wh.status)?.label}
                        </span>
                      </td>
                      <td>{wh._count.locations}</td>
                      <td>{wh._count.stockItems}</td>
                      <td>
                        {wh.temperatureMin !== null && wh.temperatureMax !== null ? (
                          <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                            <Thermometer size={14} />
                            {wh.temperatureMin}°C - {wh.temperatureMax}°C
                          </span>
                        ) : '-'}
                      </td>
                      <td>
                        <div style={{ display: 'flex', gap: '0.25rem' }}>
                          <button className="btn btn-ghost btn-sm" onClick={() => handleViewDetail(wh)} title="View">
                            <Eye size={16} />
                          </button>
                          <button className="btn btn-ghost btn-sm" onClick={() => handleEdit(wh)} title="Edit">
                            <Edit size={16} />
                          </button>
                          <button className="btn btn-ghost btn-sm" onClick={() => handleDelete(wh.id)} title="Delete">
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </td>
                    </tr>
                    {expandedWarehouse === wh.id && (
                      <tr>
                        <td colSpan={9} style={{ padding: '1rem', backgroundColor: 'var(--bg-secondary)' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                            <strong>Locations ({wh._count.locations})</strong>
                            <button className="btn btn-sm" onClick={() => handleAddLocation(wh)}>
                              <Plus size={14} /> Add Location
                            </button>
                          </div>
                          {wh.locations && wh.locations.length > 0 ? (
                            <table className="data-table" style={{ fontSize: '0.875rem' }}>
                              <thead>
                                <tr>
                                  <th>Code</th>
                                  <th>Name</th>
                                  <th>Zone</th>
                                  <th>Aisle/Rack/Shelf</th>
                                  <th>Status</th>
                                  <th>Actions</th>
                                </tr>
                              </thead>
                              <tbody>
                                {wh.locations.map(loc => (
                                  <tr key={loc.id}>
                                    <td>{loc.code}</td>
                                    <td>{loc.name}</td>
                                    <td>{loc.zone || '-'}</td>
                                    <td>{[loc.aisle, loc.rack, loc.shelf].filter(Boolean).join(' / ') || '-'}</td>
                                    <td>
                                      <span className="badge" style={{ backgroundColor: loc.isActive ? '#dcfce7' : '#fee2e2', color: loc.isActive ? '#166534' : '#991b1b' }}>
                                        {loc.isActive ? 'Active' : 'Inactive'}
                                      </span>
                                    </td>
                                    <td>
                                      <button className="btn btn-ghost btn-sm" onClick={() => handleEditLocation(wh, loc)}>
                                        <Edit size={14} />
                                      </button>
                                      <button className="btn btn-ghost btn-sm" onClick={() => handleDeleteLocation(wh.id, loc.id)}>
                                        <Trash2 size={14} />
                                      </button>
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          ) : (
                            <p style={{ color: 'var(--text-muted)', textAlign: 'center', padding: '1rem' }}>No locations defined</p>
                          )}
                        </td>
                      </tr>
                    )}
                  </>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '600px' }}>
            <div className="modal-header">
              <h2>{selectedWarehouse ? 'Edit Warehouse' : 'Add Warehouse'}</h2>
              <button className="btn btn-ghost" onClick={() => setShowModal(false)}>&times;</button>
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
                      disabled={!!selectedWarehouse}
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
                <button type="button" className="btn" onClick={() => setShowModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary">
                  {selectedWarehouse ? 'Update' : 'Create'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showDetailModal && selectedWarehouse && (
        <div className="modal-overlay" onClick={() => setShowDetailModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '800px' }}>
            <div className="modal-header">
              <h2>Warehouse Details - {selectedWarehouse.code}</h2>
              <button className="btn btn-ghost" onClick={() => setShowDetailModal(false)}>&times;</button>
            </div>
            <div className="modal-body">
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1.5rem' }}>
                <div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Name</div>
                  <div>{selectedWarehouse.name}</div>
                  {selectedWarehouse.nameAr && <div style={{ color: 'var(--text-muted)' }}>{selectedWarehouse.nameAr}</div>}
                </div>
                <div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Type</div>
                  <div>{getTypeLabel(selectedWarehouse.type)}</div>
                </div>
                <div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Status</div>
                  <span className="badge" style={getStatusStyle(selectedWarehouse.status)}>
                    {WAREHOUSE_STATUSES.find(s => s.value === selectedWarehouse.status)?.label}
                  </span>
                </div>
                <div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Address</div>
                  <div>{selectedWarehouse.address || '-'}</div>
                </div>
                <div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Temperature Range</div>
                  <div>
                    {selectedWarehouse.temperatureMin !== null && selectedWarehouse.temperatureMax !== null
                      ? `${selectedWarehouse.temperatureMin}°C - ${selectedWarehouse.temperatureMax}°C`
                      : 'Not specified'}
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Humidity Range</div>
                  <div>
                    {selectedWarehouse.humidityMin !== null && selectedWarehouse.humidityMax !== null
                      ? `${selectedWarehouse.humidityMin}% - ${selectedWarehouse.humidityMax}%`
                      : 'Not specified'}
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                <h3>Locations ({selectedWarehouse.locations?.length || 0})</h3>
                <button className="btn btn-sm" onClick={() => handleAddLocation(selectedWarehouse)}>
                  <Plus size={14} /> Add Location
                </button>
              </div>

              {selectedWarehouse.locations && selectedWarehouse.locations.length > 0 ? (
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Code</th>
                      <th>Name</th>
                      <th>Zone</th>
                      <th>Aisle</th>
                      <th>Rack</th>
                      <th>Shelf</th>
                      <th>Status</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {selectedWarehouse.locations.map(loc => (
                      <tr key={loc.id}>
                        <td>{loc.code}</td>
                        <td>{loc.name}</td>
                        <td>{loc.zone || '-'}</td>
                        <td>{loc.aisle || '-'}</td>
                        <td>{loc.rack || '-'}</td>
                        <td>{loc.shelf || '-'}</td>
                        <td>
                          <span className="badge" style={{ backgroundColor: loc.isActive ? '#dcfce7' : '#fee2e2', color: loc.isActive ? '#166534' : '#991b1b' }}>
                            {loc.isActive ? 'Active' : 'Inactive'}
                          </span>
                        </td>
                        <td>
                          <button className="btn btn-ghost btn-sm" onClick={() => handleEditLocation(selectedWarehouse, loc)}>
                            <Edit size={14} />
                          </button>
                          <button className="btn btn-ghost btn-sm" onClick={() => handleDeleteLocation(selectedWarehouse.id, loc.id)}>
                            <Trash2 size={14} />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <p style={{ color: 'var(--text-muted)', textAlign: 'center', padding: '2rem' }}>No locations defined</p>
              )}
            </div>
            <div className="modal-footer">
              <button className="btn" onClick={() => setShowDetailModal(false)}>Close</button>
            </div>
          </div>
        </div>
      )}

      {showLocationModal && (
        <div className="modal-overlay" onClick={() => setShowLocationModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '500px' }}>
            <div className="modal-header">
              <h2>{selectedLocation ? 'Edit Location' : 'Add Location'}</h2>
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
                      disabled={!!selectedLocation}
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
                <button type="submit" className="btn btn-primary">
                  {selectedLocation ? 'Update' : 'Create'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
