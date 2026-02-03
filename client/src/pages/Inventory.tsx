import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { 
  Package, Search, ArrowLeftRight, TrendingUp, TrendingDown, AlertTriangle, Clock, 
  Filter, CheckCircle, AlertOctagon, X, Warehouse, MapPin, Calendar, DollarSign,
  Layers, Hash
} from 'lucide-react';
import api from '../lib/api';
import { KpiCard, EmptyState } from '../components/shared';
import { useToast } from '../components/ui/Toast';

interface Material {
  id: string;
  code: string;
  name: string;
  unit: string;
  minStockLevel: number;
}

interface WarehouseData {
  id: string;
  code: string;
  name: string;
}

interface Location {
  id: string;
  code: string;
  name: string;
}

interface StockItem {
  id: string;
  materialId: string;
  material: Material;
  warehouseId: string;
  warehouse: WarehouseData;
  locationId?: string;
  location?: Location;
  quantity: number;
  reservedQty: number;
  availableQty: number;
  unit: string;
  lotNumber?: string;
  batchNumber?: string;
  expiryDate?: string;
  manufacturingDate?: string;
  receivedDate?: string;
  status: string;
  unitCost?: number;
  totalValue?: number;
  movements?: any[];
}

interface StockMovement {
  id: string;
  movementNumber: string;
  stockItem: {
    material: { code: string; name: string };
  };
  warehouse: { code: string; name: string };
  type: string;
  quantity: number;
  unit: string;
  referenceType?: string;
  referenceNumber?: string;
  reason?: string;
  performedAt: string;
}

interface Stats {
  totalItems: number;
  available: number;
  quarantine: number;
  reserved: number;
  onHold: number;
  expired: number;
  lowStockCount: number;
  expiringSoon: number;
  totalValue: number;
}

const STOCK_STATUSES = [
  { value: 'AVAILABLE', label: 'Available', color: '#22c55e' },
  { value: 'QUARANTINE', label: 'Quarantine', color: '#f59e0b' },
  { value: 'RESERVED', label: 'Reserved', color: '#3b82f6' },
  { value: 'ON_HOLD', label: 'On Hold', color: '#94a3b8' },
  { value: 'EXPIRED', label: 'Expired', color: '#ef4444' },
  { value: 'REJECTED', label: 'Rejected', color: '#dc2626' },
];

const MOVEMENT_TYPES = [
  { value: 'RECEIPT', label: 'Receipt', color: '#22c55e' },
  { value: 'ISSUE', label: 'Issue', color: '#ef4444' },
  { value: 'TRANSFER_IN', label: 'Transfer In', color: '#3b82f6' },
  { value: 'TRANSFER_OUT', label: 'Transfer Out', color: '#f59e0b' },
  { value: 'ADJUSTMENT_IN', label: 'Adjustment +', color: '#22c55e' },
  { value: 'ADJUSTMENT_OUT', label: 'Adjustment -', color: '#ef4444' },
  { value: 'RETURN', label: 'Return', color: '#8b5cf6' },
  { value: 'SCRAP', label: 'Scrap', color: '#dc2626' },
];

const getStatusStyle = (status: string) => {
  const s = STOCK_STATUSES.find(st => st.value === status);
  return { bg: `${s?.color}20`, color: s?.color || '#6b7280' };
};

const getMovementStyle = (type: string) => {
  const m = MOVEMENT_TYPES.find(mt => mt.value === type);
  return { backgroundColor: `${m?.color}20`, color: m?.color };
};

export default function Inventory() {
  const queryClient = useQueryClient();
  const toast = useToast();

  const [activeTab, setActiveTab] = useState<'stock' | 'movements'>('stock');
  const [search, setSearch] = useState('');
  const [warehouseFilter, setWarehouseFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [lowStockFilter, setLowStockFilter] = useState(false);
  const [detailItem, setDetailItem] = useState<StockItem | null>(null);
  const [showAdjustModal, setShowAdjustModal] = useState(false);
  const [showTransferModal, setShowTransferModal] = useState(false);
  const [selectedItem, setSelectedItem] = useState<StockItem | null>(null);

  const [adjustFormData, setAdjustFormData] = useState({
    adjustmentQty: 0,
    reason: '',
    notes: '',
  });

  const [transferFormData, setTransferFormData] = useState({
    toWarehouseId: '',
    toLocationId: '',
    quantity: 0,
    reason: '',
    notes: '',
  });

  const { data: stats } = useQuery<Stats>({
    queryKey: ['stock-stats'],
    queryFn: async () => {
      const { data } = await api.get('/stock/stats');
      return data;
    },
  });

  const { data: stockItems = [], isLoading } = useQuery<StockItem[]>({
    queryKey: ['stock', search, warehouseFilter, statusFilter, lowStockFilter],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (warehouseFilter) params.append('warehouseId', warehouseFilter);
      if (statusFilter) params.append('status', statusFilter);
      if (search) params.append('search', search);
      if (lowStockFilter) params.append('lowStock', 'true');
      const { data } = await api.get(`/stock?${params}`);
      return data;
    },
    enabled: activeTab === 'stock',
  });

  const { data: movements = [] } = useQuery<StockMovement[]>({
    queryKey: ['stock-movements', warehouseFilter],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (warehouseFilter) params.append('warehouseId', warehouseFilter);
      const { data } = await api.get(`/stock/movements?${params}`);
      return data;
    },
    enabled: activeTab === 'movements',
  });

  const { data: warehouses = [] } = useQuery<WarehouseData[]>({
    queryKey: ['warehouses-active'],
    queryFn: async () => {
      const { data } = await api.get('/warehouses?status=ACTIVE');
      return data;
    },
  });

  const { data: itemDetail } = useQuery<StockItem>({
    queryKey: ['stock-item', detailItem?.id],
    queryFn: async () => {
      const { data } = await api.get(`/stock/${detailItem?.id}`);
      return data;
    },
    enabled: !!detailItem?.id,
  });

  const adjustMutation = useMutation({
    mutationFn: async (data: typeof adjustFormData & { stockItemId: string }) => {
      return api.post('/stock/adjust', data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['stock'] });
      queryClient.invalidateQueries({ queryKey: ['stock-stats'] });
      queryClient.invalidateQueries({ queryKey: ['stock-item', detailItem?.id] });
      toast.success('Stock adjusted successfully');
      setShowAdjustModal(false);
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.error || 'Failed to adjust stock');
    },
  });

  const transferMutation = useMutation({
    mutationFn: async (data: typeof transferFormData & { stockItemId: string }) => {
      return api.post('/stock/transfer', data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['stock'] });
      queryClient.invalidateQueries({ queryKey: ['stock-stats'] });
      queryClient.invalidateQueries({ queryKey: ['stock-item', detailItem?.id] });
      toast.success('Stock transferred successfully');
      setShowTransferModal(false);
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.error || 'Failed to transfer stock');
    },
  });

  const isLowStock = (item: StockItem) => {
    return item.material.minStockLevel > 0 && item.availableQty < item.material.minStockLevel;
  };

  const isExpiringSoon = (item: StockItem) => {
    if (!item.expiryDate) return false;
    const expiry = new Date(item.expiryDate);
    const thirtyDaysFromNow = new Date();
    thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);
    return expiry <= thirtyDaysFromNow && expiry > new Date();
  };

  const handleOpenAdjust = (item: StockItem) => {
    setSelectedItem(item);
    setAdjustFormData({ adjustmentQty: 0, reason: '', notes: '' });
    setShowAdjustModal(true);
  };

  const handleOpenTransfer = (item: StockItem) => {
    setSelectedItem(item);
    setTransferFormData({
      toWarehouseId: '',
      toLocationId: '',
      quantity: item.availableQty,
      reason: '',
      notes: '',
    });
    setShowTransferModal(true);
  };

  const handleAdjustSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedItem) return;
    adjustMutation.mutate({ stockItemId: selectedItem.id, ...adjustFormData });
  };

  const handleTransferSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedItem) return;
    transferMutation.mutate({ stockItemId: selectedItem.id, ...transferFormData });
  };

  const displayItem = itemDetail || detailItem;

  if (isLoading && activeTab === 'stock') {
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
          <h1>Inventory</h1>
          <p style={{ color: 'var(--text-muted)', marginTop: '0.25rem' }}>
            Track stock levels and movements
          </p>
        </div>
      </div>

      <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
        <KpiCard 
          title="Total Items" 
          value={stats?.totalItems || 0} 
          icon={<Package size={24} />}
          color="primary"
        />
        <KpiCard 
          title="Available" 
          value={stats?.available || 0} 
          icon={<CheckCircle size={24} />}
          color="success"
        />
        <KpiCard 
          title="Quarantine" 
          value={stats?.quarantine || 0} 
          icon={<AlertOctagon size={24} />}
          color="warning"
        />
        <KpiCard 
          title="Low Stock" 
          value={stats?.lowStockCount || 0} 
          icon={<AlertTriangle size={24} />}
          color="danger"
        />
        <KpiCard 
          title="Expiring Soon" 
          value={stats?.expiringSoon || 0} 
          icon={<Clock size={24} />}
          color="info"
        />
      </div>

      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem' }}>
        <button
          className={`btn ${activeTab === 'stock' ? 'btn-primary' : 'btn-secondary'}`}
          onClick={() => setActiveTab('stock')}
        >
          <Package size={16} /> Stock Items
        </button>
        <button
          className={`btn ${activeTab === 'movements' ? 'btn-primary' : 'btn-secondary'}`}
          onClick={() => setActiveTab('movements')}
        >
          <ArrowLeftRight size={16} /> Movements
        </button>
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
              placeholder="Search material, lot, batch..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{ paddingLeft: '2.25rem' }}
            />
          </div>
          <select 
            className="form-select"
            style={{ width: 'auto', minWidth: '160px' }}
            value={warehouseFilter} 
            onChange={(e) => setWarehouseFilter(e.target.value)}
          >
            <option value="">All Warehouses</option>
            {warehouses.map(wh => (
              <option key={wh.id} value={wh.id}>{wh.code} - {wh.name}</option>
            ))}
          </select>
          {activeTab === 'stock' && (
            <>
              <select 
                className="form-select"
                style={{ width: 'auto', minWidth: '130px' }}
                value={statusFilter} 
                onChange={(e) => setStatusFilter(e.target.value)}
              >
                <option value="">All Statuses</option>
                {STOCK_STATUSES.map(s => (
                  <option key={s.value} value={s.value}>{s.label}</option>
                ))}
              </select>
              <button
                className={`btn btn-sm ${lowStockFilter ? 'btn-warning' : 'btn-secondary'}`}
                onClick={() => setLowStockFilter(!lowStockFilter)}
              >
                <AlertTriangle size={14} /> Low Stock
              </button>
            </>
          )}
          {(search || warehouseFilter || statusFilter || lowStockFilter) && (
            <button
              className="btn btn-sm btn-secondary"
              onClick={() => {
                setSearch('');
                setWarehouseFilter('');
                setStatusFilter('');
                setLowStockFilter(false);
              }}
            >
              <X size={14} /> Clear
            </button>
          )}
        </div>
      </div>

      {activeTab === 'stock' && (
        <div className="grid" style={{ gridTemplateColumns: detailItem ? '1fr 420px' : '1fr', gap: '1.5rem' }}>
          <div>
            <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '1rem' }}>
              {stockItems.map((item) => {
                const statusStyle = getStatusStyle(item.status);
                const isSelected = detailItem?.id === item.id;
                const lowStock = isLowStock(item);
                const expiring = isExpiringSoon(item);
                return (
                  <div 
                    key={item.id} 
                    className="card" 
                    style={{ 
                      padding: '1.25rem', 
                      cursor: 'pointer',
                      border: isSelected ? '2px solid var(--primary)' : lowStock ? '2px solid var(--error)' : '1px solid var(--border)',
                      transition: 'all 0.2s',
                      background: lowStock ? 'rgba(239, 68, 68, 0.03)' : undefined,
                    }}
                    onClick={() => setDetailItem(item)}
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
                        {STOCK_STATUSES.find(s => s.value === item.status)?.label || item.status}
                      </span>
                      <div style={{ display: 'flex', gap: '0.25rem' }}>
                        {lowStock && (
                          <span className="badge" style={{ fontSize: '0.625rem', background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444' }}>
                            <AlertTriangle size={10} /> Low
                          </span>
                        )}
                        {expiring && (
                          <span className="badge" style={{ fontSize: '0.625rem', background: 'rgba(245, 158, 11, 0.1)', color: '#f59e0b' }}>
                            <Clock size={10} /> Expiring
                          </span>
                        )}
                      </div>
                    </div>
                    
                    <h3 style={{ fontWeight: 600, marginBottom: '0.25rem', fontSize: '1rem' }}>{item.material.name}</h3>
                    <p style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', marginBottom: '0.75rem' }}>
                      <span style={{ fontFamily: 'monospace' }}>{item.material.code}</span>
                    </p>
                    
                    <div className="grid" style={{ gridTemplateColumns: '1fr 1fr 1fr', gap: '0.5rem', marginBottom: '0.75rem' }}>
                      <div style={{ textAlign: 'center', padding: '0.5rem', background: 'var(--bg-secondary)', borderRadius: 'var(--radius)' }}>
                        <div style={{ fontSize: '0.625rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Total</div>
                        <div style={{ fontWeight: 600 }}>{item.quantity}</div>
                      </div>
                      <div style={{ textAlign: 'center', padding: '0.5rem', background: 'rgba(59, 130, 246, 0.1)', borderRadius: 'var(--radius)' }}>
                        <div style={{ fontSize: '0.625rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Reserved</div>
                        <div style={{ fontWeight: 600, color: '#3b82f6' }}>{item.reservedQty}</div>
                      </div>
                      <div style={{ textAlign: 'center', padding: '0.5rem', background: 'rgba(34, 197, 94, 0.1)', borderRadius: 'var(--radius)' }}>
                        <div style={{ fontSize: '0.625rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Available</div>
                        <div style={{ fontWeight: 600, color: '#22c55e' }}>{item.availableQty}</div>
                      </div>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.375rem', fontSize: '0.8125rem' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
                        <Warehouse size={14} style={{ color: 'var(--text-muted)' }} />
                        <span>{item.warehouse.code}</span>
                        {item.location && <span style={{ color: 'var(--text-muted)' }}>/ {item.location.code}</span>}
                      </div>
                      {item.lotNumber && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
                          <Hash size={14} style={{ color: 'var(--text-muted)' }} />
                          <span>Lot: {item.lotNumber}</span>
                        </div>
                      )}
                    </div>

                    {item.expiryDate && (
                      <div style={{ 
                        marginTop: '0.75rem', 
                        paddingTop: '0.75rem', 
                        borderTop: '1px solid var(--border)', 
                        fontSize: '0.75rem',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.375rem',
                        color: expiring ? '#f59e0b' : 'var(--text-muted)',
                      }}>
                        <Calendar size={12} />
                        Expires: {new Date(item.expiryDate).toLocaleDateString()}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {stockItems.length === 0 && (
              <div className="card" style={{ padding: '2rem' }}>
                <EmptyState 
                  title="No stock items found"
                  message={search || warehouseFilter || statusFilter ? 'Try adjusting your filters' : 'No stock items available'}
                  icon="package"
                />
              </div>
            )}
          </div>

          {detailItem && displayItem && (
            <div className="card" style={{ padding: 0, height: 'fit-content', position: 'sticky', top: '1rem' }}>
              <div style={{ 
                padding: '1.25rem', 
                borderBottom: '1px solid var(--border)',
                background: getStatusStyle(displayItem.status).bg,
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div>
                    <span 
                      className="badge"
                      style={{ 
                        background: getStatusStyle(displayItem.status).color, 
                        color: 'white',
                        marginBottom: '0.5rem',
                      }}
                    >
                      {STOCK_STATUSES.find(s => s.value === displayItem.status)?.label || displayItem.status}
                    </span>
                    <h3 style={{ fontWeight: 600, fontSize: '1.125rem', margin: '0.5rem 0 0.25rem' }}>{displayItem.material.name}</h3>
                    <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)', margin: 0 }}>
                      {displayItem.material.code}
                    </p>
                  </div>
                  <button
                    className="btn btn-sm btn-secondary"
                    onClick={() => setDetailItem(null)}
                    style={{ borderRadius: '50%', width: '28px', height: '28px', padding: 0 }}
                  >
                    <X size={14} />
                  </button>
                </div>
              </div>

              <div style={{ padding: '1.25rem', maxHeight: 'calc(100vh - 200px)', overflowY: 'auto' }}>
                <div style={{ marginBottom: '1.25rem' }}>
                  <div style={{ fontSize: '0.6875rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.75rem' }}>
                    Quantity Summary
                  </div>
                  <div className="grid" style={{ gridTemplateColumns: '1fr 1fr 1fr', gap: '0.5rem' }}>
                    <div style={{ padding: '0.75rem', background: 'var(--bg-secondary)', borderRadius: 'var(--radius)', textAlign: 'center' }}>
                      <div style={{ fontSize: '0.6875rem', color: 'var(--text-muted)' }}>Total</div>
                      <div style={{ fontWeight: 700, fontSize: '1.25rem' }}>{displayItem.quantity}</div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{displayItem.unit}</div>
                    </div>
                    <div style={{ padding: '0.75rem', background: 'rgba(59, 130, 246, 0.1)', borderRadius: 'var(--radius)', textAlign: 'center' }}>
                      <div style={{ fontSize: '0.6875rem', color: 'var(--text-muted)' }}>Reserved</div>
                      <div style={{ fontWeight: 700, fontSize: '1.25rem', color: '#3b82f6' }}>{displayItem.reservedQty}</div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{displayItem.unit}</div>
                    </div>
                    <div style={{ padding: '0.75rem', background: 'rgba(34, 197, 94, 0.1)', borderRadius: 'var(--radius)', textAlign: 'center' }}>
                      <div style={{ fontSize: '0.6875rem', color: 'var(--text-muted)' }}>Available</div>
                      <div style={{ fontWeight: 700, fontSize: '1.25rem', color: '#22c55e' }}>{displayItem.availableQty}</div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{displayItem.unit}</div>
                    </div>
                  </div>
                </div>

                <div style={{ marginBottom: '1.25rem' }}>
                  <div style={{ fontSize: '0.6875rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.75rem' }}>
                    Location Details
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.5rem', background: 'var(--bg-secondary)', borderRadius: 'var(--radius)' }}>
                      <Warehouse size={16} style={{ color: 'var(--primary)' }} />
                      <div>
                        <div style={{ fontSize: '0.875rem', fontWeight: 500 }}>{displayItem.warehouse.code} - {displayItem.warehouse.name}</div>
                        {displayItem.location && (
                          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Location: {displayItem.location.code}</div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                <div style={{ marginBottom: '1.25rem' }}>
                  <div style={{ fontSize: '0.6875rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.5rem' }}>
                    Batch Information
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.375rem', fontSize: '0.875rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.5rem', border: '1px solid var(--border)', borderRadius: 'var(--radius)' }}>
                      <span style={{ color: 'var(--text-muted)' }}>Lot Number</span>
                      <span style={{ fontWeight: 500 }}>{displayItem.lotNumber || '-'}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.5rem', border: '1px solid var(--border)', borderRadius: 'var(--radius)' }}>
                      <span style={{ color: 'var(--text-muted)' }}>Batch Number</span>
                      <span style={{ fontWeight: 500 }}>{displayItem.batchNumber || '-'}</span>
                    </div>
                  </div>
                </div>

                <div style={{ marginBottom: '1.25rem' }}>
                  <div style={{ fontSize: '0.6875rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.5rem' }}>
                    Dates
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.375rem', fontSize: '0.875rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.5rem', border: '1px solid var(--border)', borderRadius: 'var(--radius)' }}>
                      <span style={{ color: 'var(--text-muted)' }}>Manufacturing Date</span>
                      <span style={{ fontWeight: 500 }}>{displayItem.manufacturingDate ? new Date(displayItem.manufacturingDate).toLocaleDateString() : '-'}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.5rem', border: '1px solid var(--border)', borderRadius: 'var(--radius)' }}>
                      <span style={{ color: 'var(--text-muted)' }}>Received Date</span>
                      <span style={{ fontWeight: 500 }}>{displayItem.receivedDate ? new Date(displayItem.receivedDate).toLocaleDateString() : '-'}</span>
                    </div>
                    <div style={{ 
                      display: 'flex', 
                      justifyContent: 'space-between', 
                      padding: '0.5rem', 
                      border: '1px solid var(--border)', 
                      borderRadius: 'var(--radius)',
                      background: isExpiringSoon(displayItem) ? 'rgba(245, 158, 11, 0.1)' : undefined,
                    }}>
                      <span style={{ color: isExpiringSoon(displayItem) ? '#f59e0b' : 'var(--text-muted)' }}>Expiry Date</span>
                      <span style={{ fontWeight: 500, color: isExpiringSoon(displayItem) ? '#f59e0b' : undefined }}>
                        {displayItem.expiryDate ? new Date(displayItem.expiryDate).toLocaleDateString() : '-'}
                      </span>
                    </div>
                  </div>
                </div>

                {displayItem.unitCost && (
                  <div style={{ marginBottom: '1.25rem' }}>
                    <div style={{ fontSize: '0.6875rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.5rem' }}>
                      Cost Information
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.75rem', background: 'var(--bg-secondary)', borderRadius: 'var(--radius)' }}>
                      <DollarSign size={16} style={{ color: 'var(--success)' }} />
                      <div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Unit Cost</div>
                        <div style={{ fontWeight: 600 }}>SAR {displayItem.unitCost.toFixed(2)}</div>
                      </div>
                    </div>
                  </div>
                )}

                {displayItem.movements && displayItem.movements.length > 0 && (
                  <div style={{ marginBottom: '1.25rem' }}>
                    <div style={{ fontSize: '0.6875rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.5rem' }}>
                      Recent Movements
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.375rem' }}>
                      {displayItem.movements.slice(0, 5).map((mov: any) => (
                        <div key={mov.id} style={{ padding: '0.5rem', border: '1px solid var(--border)', borderRadius: 'var(--radius)', fontSize: '0.8125rem' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <span className="badge" style={getMovementStyle(mov.type)}>
                              {MOVEMENT_TYPES.find(m => m.value === mov.type)?.label}
                            </span>
                            <span style={{ fontWeight: 500 }}>{mov.quantity} {mov.unit}</span>
                          </div>
                          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
                            {new Date(mov.performedAt).toLocaleString()}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <button
                    className="btn btn-secondary"
                    style={{ flex: 1 }}
                    onClick={() => handleOpenAdjust(displayItem)}
                  >
                    <TrendingUp size={16} /> Adjust
                  </button>
                  {displayItem.availableQty > 0 && (
                    <button
                      className="btn btn-primary"
                      style={{ flex: 1 }}
                      onClick={() => handleOpenTransfer(displayItem)}
                    >
                      <ArrowLeftRight size={16} /> Transfer
                    </button>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {activeTab === 'movements' && (
        <div className="card" style={{ padding: '1rem' }}>
          {movements.length === 0 ? (
            <EmptyState 
              title="No movements found"
              message="Stock movements will appear here"
              icon="package"
            />
          ) : (
            <div className="table-container">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Movement #</th>
                    <th>Date</th>
                    <th>Type</th>
                    <th>Material</th>
                    <th>Warehouse</th>
                    <th>Quantity</th>
                    <th>Reference</th>
                    <th>Reason</th>
                  </tr>
                </thead>
                <tbody>
                  {movements.map((mov) => (
                    <tr key={mov.id}>
                      <td><strong>{mov.movementNumber}</strong></td>
                      <td>{new Date(mov.performedAt).toLocaleString()}</td>
                      <td>
                        <span className="badge" style={getMovementStyle(mov.type)}>
                          {MOVEMENT_TYPES.find(m => m.value === mov.type)?.label}
                        </span>
                      </td>
                      <td>
                        <div>{mov.stockItem.material.code}</div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{mov.stockItem.material.name}</div>
                      </td>
                      <td>{mov.warehouse.code}</td>
                      <td style={{ fontWeight: 600, color: mov.type.includes('IN') || mov.type === 'RECEIPT' || mov.type === 'ADJUSTMENT_IN' || mov.type === 'RETURN' ? '#22c55e' : '#ef4444' }}>
                        {mov.type.includes('IN') || mov.type === 'RECEIPT' || mov.type === 'ADJUSTMENT_IN' || mov.type === 'RETURN' ? '+' : '-'}{mov.quantity} {mov.unit}
                      </td>
                      <td>
                        {mov.referenceType && mov.referenceNumber ? (
                          <span>{mov.referenceType}: {mov.referenceNumber}</span>
                        ) : '-'}
                      </td>
                      <td>{mov.reason || '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {showAdjustModal && selectedItem && (
        <div className="modal-overlay" onClick={() => setShowAdjustModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '400px' }}>
            <div className="modal-header">
              <h2>Adjust Stock</h2>
              <button className="btn btn-ghost" onClick={() => setShowAdjustModal(false)}>&times;</button>
            </div>
            <form onSubmit={handleAdjustSubmit}>
              <div className="modal-body">
                <div style={{ padding: '1rem', backgroundColor: 'var(--bg-secondary)', borderRadius: '8px', marginBottom: '1rem' }}>
                  <strong>{selectedItem.material.code}</strong> - {selectedItem.material.name}
                  <div style={{ marginTop: '0.5rem', color: 'var(--text-muted)' }}>
                    Current: {selectedItem.quantity} {selectedItem.unit} (Available: {selectedItem.availableQty})
                  </div>
                </div>

                <div className="form-group">
                  <label>Adjustment Quantity</label>
                  <input
                    type="number"
                    className="form-input"
                    value={adjustFormData.adjustmentQty}
                    onChange={(e) => setAdjustFormData({ ...adjustFormData, adjustmentQty: parseFloat(e.target.value) || 0 })}
                    step="0.01"
                  />
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
                    Positive for increase, negative for decrease
                  </div>
                </div>

                <div className="form-group">
                  <label>Reason *</label>
                  <select
                    className="form-select"
                    value={adjustFormData.reason}
                    onChange={(e) => setAdjustFormData({ ...adjustFormData, reason: e.target.value })}
                    required
                  >
                    <option value="">Select reason...</option>
                    <option value="Physical count correction">Physical count correction</option>
                    <option value="Damage/Scrap">Damage/Scrap</option>
                    <option value="Expired">Expired</option>
                    <option value="System error correction">System error correction</option>
                    <option value="Other">Other</option>
                  </select>
                </div>

                <div className="form-group">
                  <label>Notes</label>
                  <textarea
                    className="form-input"
                    value={adjustFormData.notes}
                    onChange={(e) => setAdjustFormData({ ...adjustFormData, notes: e.target.value })}
                    rows={2}
                  />
                </div>

                <div style={{ padding: '0.75rem', backgroundColor: adjustFormData.adjustmentQty >= 0 ? '#dcfce7' : '#fee2e2', borderRadius: '8px' }}>
                  <strong>New Quantity: </strong>
                  {selectedItem.quantity + adjustFormData.adjustmentQty} {selectedItem.unit}
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn" onClick={() => setShowAdjustModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={adjustFormData.adjustmentQty === 0 || adjustMutation.isPending}>
                  {adjustMutation.isPending ? 'Adjusting...' : 'Adjust Stock'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showTransferModal && selectedItem && (
        <div className="modal-overlay" onClick={() => setShowTransferModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '450px' }}>
            <div className="modal-header">
              <h2>Transfer Stock</h2>
              <button className="btn btn-ghost" onClick={() => setShowTransferModal(false)}>&times;</button>
            </div>
            <form onSubmit={handleTransferSubmit}>
              <div className="modal-body">
                <div style={{ padding: '1rem', backgroundColor: 'var(--bg-secondary)', borderRadius: '8px', marginBottom: '1rem' }}>
                  <strong>{selectedItem.material.code}</strong> - {selectedItem.material.name}
                  <div style={{ marginTop: '0.5rem', color: 'var(--text-muted)' }}>
                    From: {selectedItem.warehouse.code} - {selectedItem.warehouse.name}
                  </div>
                  <div style={{ color: 'var(--text-muted)' }}>
                    Available: {selectedItem.availableQty} {selectedItem.unit}
                  </div>
                </div>

                <div className="form-group">
                  <label>To Warehouse *</label>
                  <select
                    className="form-select"
                    value={transferFormData.toWarehouseId}
                    onChange={(e) => setTransferFormData({ ...transferFormData, toWarehouseId: e.target.value })}
                    required
                  >
                    <option value="">Select warehouse...</option>
                    {warehouses.filter(wh => wh.id !== selectedItem.warehouseId).map(wh => (
                      <option key={wh.id} value={wh.id}>{wh.code} - {wh.name}</option>
                    ))}
                  </select>
                </div>

                <div className="form-group">
                  <label>Quantity *</label>
                  <input
                    type="number"
                    className="form-input"
                    value={transferFormData.quantity}
                    onChange={(e) => setTransferFormData({ ...transferFormData, quantity: parseFloat(e.target.value) || 0 })}
                    min={0.01}
                    max={selectedItem.availableQty}
                    step="0.01"
                    required
                  />
                </div>

                <div className="form-group">
                  <label>Reason</label>
                  <input
                    type="text"
                    className="form-input"
                    value={transferFormData.reason}
                    onChange={(e) => setTransferFormData({ ...transferFormData, reason: e.target.value })}
                    placeholder="e.g., Production requirement"
                  />
                </div>

                <div className="form-group">
                  <label>Notes</label>
                  <textarea
                    className="form-input"
                    value={transferFormData.notes}
                    onChange={(e) => setTransferFormData({ ...transferFormData, notes: e.target.value })}
                    rows={2}
                  />
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn" onClick={() => setShowTransferModal(false)}>Cancel</button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={!transferFormData.toWarehouseId || transferFormData.quantity <= 0 || transferMutation.isPending}
                >
                  {transferMutation.isPending ? 'Transferring...' : 'Transfer'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
