import { useState, useEffect } from 'react';
import { Package, Search, ArrowLeftRight, TrendingUp, TrendingDown, AlertTriangle, Clock, Eye, Filter, CheckCircle, AlertOctagon } from 'lucide-react';
import api from '../lib/api';
import { KpiCard } from '../components/shared';

interface Material {
  id: string;
  code: string;
  name: string;
  unit: string;
  minStockLevel: number;
}

interface Warehouse {
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
  warehouse: Warehouse;
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

export default function Inventory() {
  const [stockItems, setStockItems] = useState<StockItem[]>([]);
  const [movements, setMovements] = useState<StockMovement[]>([]);
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'stock' | 'movements'>('stock');
  const [search, setSearch] = useState('');
  const [warehouseFilter, setWarehouseFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [lowStockFilter, setLowStockFilter] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
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

  useEffect(() => {
    fetchData();
    fetchWarehouses();
  }, [warehouseFilter, statusFilter, search, lowStockFilter]);

  useEffect(() => {
    if (activeTab === 'movements') {
      fetchMovements();
    }
  }, [activeTab, warehouseFilter]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (warehouseFilter) params.append('warehouseId', warehouseFilter);
      if (statusFilter) params.append('status', statusFilter);
      if (search) params.append('search', search);
      if (lowStockFilter) params.append('lowStock', 'true');
      
      const [stockRes, statsRes] = await Promise.all([
        api.get(`/stock?${params}`),
        api.get('/stock/stats'),
      ]);
      
      setStockItems(stockRes.data);
      setStats(statsRes.data);
    } catch (error) {
      console.error('Error fetching stock:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchMovements = async () => {
    try {
      const params = new URLSearchParams();
      if (warehouseFilter) params.append('warehouseId', warehouseFilter);
      
      const res = await api.get(`/stock/movements?${params}`);
      setMovements(res.data);
    } catch (error) {
      console.error('Error fetching movements:', error);
    }
  };

  const fetchWarehouses = async () => {
    try {
      const res = await api.get('/warehouses?status=ACTIVE');
      setWarehouses(res.data);
    } catch (error) {
      console.error('Error fetching warehouses:', error);
    }
  };

  const handleViewDetail = async (item: StockItem) => {
    try {
      const res = await api.get(`/stock/${item.id}`);
      setSelectedItem(res.data);
      setShowDetailModal(true);
    } catch (error) {
      console.error('Error fetching stock details:', error);
    }
  };

  const handleOpenAdjust = (item: StockItem) => {
    setSelectedItem(item);
    setAdjustFormData({ adjustmentQty: 0, reason: '', notes: '' });
    setShowAdjustModal(true);
  };

  const handleAdjustSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedItem) return;
    
    try {
      await api.post('/stock/adjust', {
        stockItemId: selectedItem.id,
        ...adjustFormData,
      });
      setShowAdjustModal(false);
      fetchData();
    } catch (error: any) {
      alert(error.response?.data?.error || 'Failed to adjust stock');
    }
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

  const handleTransferSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedItem) return;
    
    try {
      await api.post('/stock/transfer', {
        stockItemId: selectedItem.id,
        ...transferFormData,
      });
      setShowTransferModal(false);
      fetchData();
    } catch (error: any) {
      alert(error.response?.data?.error || 'Failed to transfer stock');
    }
  };

  const handleStatusChange = async (item: StockItem, newStatus: string) => {
    const reason = prompt('Enter reason for status change:');
    if (!reason) return;
    
    try {
      await api.put(`/stock/${item.id}/status`, { status: newStatus, reason });
      fetchData();
    } catch (error: any) {
      alert(error.response?.data?.error || 'Failed to update status');
    }
  };

  const getStatusStyle = (status: string) => {
    const s = STOCK_STATUSES.find(st => st.value === status);
    return { backgroundColor: `${s?.color}20`, color: s?.color };
  };

  const getMovementStyle = (type: string) => {
    const m = MOVEMENT_TYPES.find(mt => mt.value === type);
    return { backgroundColor: `${m?.color}20`, color: m?.color };
  };

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

  return (
    <div className="page-container">
      <div className="page-header">
        <div>
          <h1>Inventory</h1>
          <p style={{ color: 'var(--text-muted)', marginTop: '0.25rem' }}>
            Track stock levels and movements
          </p>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
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

      <div className="card">
        <div style={{ display: 'flex', gap: '1rem', marginBottom: '1rem', borderBottom: '1px solid var(--border)', paddingBottom: '1rem' }}>
          <button
            className={`btn ${activeTab === 'stock' ? 'btn-primary' : ''}`}
            onClick={() => setActiveTab('stock')}
          >
            <Package size={16} /> Stock Items
          </button>
          <button
            className={`btn ${activeTab === 'movements' ? 'btn-primary' : ''}`}
            onClick={() => setActiveTab('movements')}
          >
            <ArrowLeftRight size={16} /> Movements
          </button>
        </div>

        <div style={{ display: 'flex', gap: '1rem', marginBottom: '1rem', flexWrap: 'wrap' }}>
          <div style={{ position: 'relative', flex: 1, minWidth: '200px' }}>
            <Search size={18} style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
            <input
              type="text"
              placeholder="Search by material, lot, or batch..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="form-input"
              style={{ paddingLeft: '2.5rem' }}
            />
          </div>
          <select
            value={warehouseFilter}
            onChange={(e) => setWarehouseFilter(e.target.value)}
            className="form-select"
            style={{ minWidth: '150px' }}
          >
            <option value="">All Warehouses</option>
            {warehouses.map(wh => (
              <option key={wh.id} value={wh.id}>{wh.code} - {wh.name}</option>
            ))}
          </select>
          {activeTab === 'stock' && (
            <>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="form-select"
                style={{ minWidth: '150px' }}
              >
                <option value="">All Statuses</option>
                {STOCK_STATUSES.map(s => (
                  <option key={s.value} value={s.value}>{s.label}</option>
                ))}
              </select>
              <button
                className={`btn ${lowStockFilter ? 'btn-warning' : ''}`}
                onClick={() => setLowStockFilter(!lowStockFilter)}
              >
                <AlertTriangle size={16} /> Low Stock
              </button>
            </>
          )}
        </div>

        {activeTab === 'stock' && (
          loading ? (
            <div style={{ textAlign: 'center', padding: '3rem' }}>Loading...</div>
          ) : stockItems.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
              <Package size={48} style={{ marginBottom: '1rem', opacity: 0.5 }} />
              <p>No stock items found</p>
            </div>
          ) : (
            <div className="table-container">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Material</th>
                    <th>Warehouse</th>
                    <th>Lot/Batch</th>
                    <th>Quantity</th>
                    <th>Reserved</th>
                    <th>Available</th>
                    <th>Expiry</th>
                    <th>Status</th>
                    <th style={{ width: '120px' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {stockItems.map((item) => (
                    <tr key={item.id} style={{ backgroundColor: isLowStock(item) ? '#fef2f2' : undefined }}>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                          <div>
                            <strong>{item.material.code}</strong>
                            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{item.material.name}</div>
                          </div>
                          {isLowStock(item) && <AlertTriangle size={14} color="#ef4444" />}
                        </div>
                      </td>
                      <td>
                        <div>{item.warehouse.code}</div>
                        {item.location && <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{item.location.code}</div>}
                      </td>
                      <td>
                        <div>{item.lotNumber || '-'}</div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{item.batchNumber || ''}</div>
                      </td>
                      <td>{item.quantity} {item.unit}</td>
                      <td style={{ color: '#3b82f6' }}>{item.reservedQty}</td>
                      <td style={{ color: '#22c55e', fontWeight: 600 }}>{item.availableQty}</td>
                      <td>
                        {item.expiryDate ? (
                          <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', color: isExpiringSoon(item) ? '#f59e0b' : undefined }}>
                            {isExpiringSoon(item) && <Clock size={14} />}
                            {new Date(item.expiryDate).toLocaleDateString()}
                          </span>
                        ) : '-'}
                      </td>
                      <td>
                        <span className="badge" style={getStatusStyle(item.status)}>
                          {STOCK_STATUSES.find(s => s.value === item.status)?.label}
                        </span>
                      </td>
                      <td>
                        <div style={{ display: 'flex', gap: '0.25rem' }}>
                          <button className="btn btn-ghost btn-sm" onClick={() => handleViewDetail(item)} title="View">
                            <Eye size={16} />
                          </button>
                          <button className="btn btn-ghost btn-sm" onClick={() => handleOpenAdjust(item)} title="Adjust">
                            <TrendingUp size={16} />
                          </button>
                          {item.availableQty > 0 && (
                            <button className="btn btn-ghost btn-sm" onClick={() => handleOpenTransfer(item)} title="Transfer">
                              <ArrowLeftRight size={16} />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )
        )}

        {activeTab === 'movements' && (
          movements.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
              <ArrowLeftRight size={48} style={{ marginBottom: '1rem', opacity: 0.5 }} />
              <p>No stock movements found</p>
            </div>
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
                      <td style={{ fontWeight: 600, color: mov.type.includes('IN') || mov.type === 'RECEIPT' ? '#22c55e' : '#ef4444' }}>
                        {mov.type.includes('IN') || mov.type === 'RECEIPT' ? '+' : '-'}{mov.quantity} {mov.unit}
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
          )
        )}
      </div>

      {showDetailModal && selectedItem && (
        <div className="modal-overlay" onClick={() => setShowDetailModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '700px' }}>
            <div className="modal-header">
              <h2>Stock Item Details</h2>
              <button className="btn btn-ghost" onClick={() => setShowDetailModal(false)}>&times;</button>
            </div>
            <div className="modal-body">
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Material</div>
                  <div><strong>{selectedItem.material.code}</strong> - {selectedItem.material.name}</div>
                </div>
                <div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Warehouse</div>
                  <div>{selectedItem.warehouse.code} - {selectedItem.warehouse.name}</div>
                </div>
                <div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Lot Number</div>
                  <div>{selectedItem.lotNumber || '-'}</div>
                </div>
                <div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Batch Number</div>
                  <div>{selectedItem.batchNumber || '-'}</div>
                </div>
                <div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Total Quantity</div>
                  <div style={{ fontSize: '1.25rem', fontWeight: 700 }}>{selectedItem.quantity} {selectedItem.unit}</div>
                </div>
                <div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Available</div>
                  <div style={{ fontSize: '1.25rem', fontWeight: 700, color: '#22c55e' }}>{selectedItem.availableQty} {selectedItem.unit}</div>
                </div>
                <div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Reserved</div>
                  <div>{selectedItem.reservedQty} {selectedItem.unit}</div>
                </div>
                <div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Status</div>
                  <span className="badge" style={getStatusStyle(selectedItem.status)}>
                    {STOCK_STATUSES.find(s => s.value === selectedItem.status)?.label}
                  </span>
                </div>
                <div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Manufacturing Date</div>
                  <div>{selectedItem.manufacturingDate ? new Date(selectedItem.manufacturingDate).toLocaleDateString() : '-'}</div>
                </div>
                <div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Expiry Date</div>
                  <div>{selectedItem.expiryDate ? new Date(selectedItem.expiryDate).toLocaleDateString() : '-'}</div>
                </div>
                <div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Received Date</div>
                  <div>{selectedItem.receivedDate ? new Date(selectedItem.receivedDate).toLocaleDateString() : '-'}</div>
                </div>
                <div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Unit Cost</div>
                  <div>{selectedItem.unitCost ? `SAR ${selectedItem.unitCost.toFixed(2)}` : '-'}</div>
                </div>
              </div>

              {(selectedItem as any).movements && (selectedItem as any).movements.length > 0 && (
                <>
                  <h4 style={{ marginTop: '1.5rem', marginBottom: '0.5rem' }}>Recent Movements</h4>
                  <table className="data-table" style={{ fontSize: '0.875rem' }}>
                    <thead>
                      <tr>
                        <th>Date</th>
                        <th>Type</th>
                        <th>Qty</th>
                        <th>Reason</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(selectedItem as any).movements.slice(0, 10).map((mov: any) => (
                        <tr key={mov.id}>
                          <td>{new Date(mov.performedAt).toLocaleString()}</td>
                          <td>
                            <span className="badge" style={getMovementStyle(mov.type)}>
                              {MOVEMENT_TYPES.find(m => m.value === mov.type)?.label}
                            </span>
                          </td>
                          <td>{mov.quantity} {mov.unit}</td>
                          <td>{mov.reason || '-'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </>
              )}
            </div>
            <div className="modal-footer">
              <button className="btn" onClick={() => setShowDetailModal(false)}>Close</button>
            </div>
          </div>
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
                <button type="submit" className="btn btn-primary" disabled={adjustFormData.adjustmentQty === 0}>
                  Adjust Stock
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
                  disabled={!transferFormData.toWarehouseId || transferFormData.quantity <= 0}
                >
                  Transfer
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
