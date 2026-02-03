import { useState, useEffect } from 'react';
import { Package, Plus, Search, Eye, Check, X, Send, FileText, ClipboardCheck } from 'lucide-react';
import api from '../api';

interface POItem {
  id: string;
  itemCode: string;
  itemName: string;
  orderedQty: number;
  receivedQty: number;
  unit: string;
  unitPrice: number;
}

interface PurchaseOrder {
  id: string;
  poNumber: string;
  status: string;
  supplier: { id: string; code: string; name: string };
  items: POItem[];
}

interface GRNItem {
  id: string;
  poItemId: string;
  poItem?: POItem;
  receivedQty: number;
  acceptedQty: number;
  rejectedQty: number;
  unit: string;
  lotNumber?: string;
  batchNumber?: string;
  expiryDate?: string;
  manufacturingDate?: string;
  warehouseId?: string;
  binLocation?: string;
  status: string;
  notes?: string;
  rejectionReason?: string;
}

interface GRN {
  id: string;
  grnNumber: string;
  poId: string;
  purchaseOrder?: PurchaseOrder;
  supplierId: string;
  supplier?: { id: string; code: string; name: string };
  receivedDate: string;
  deliveryNoteNumber?: string;
  status: string;
  notes?: string;
  items: GRNItem[];
  _count?: { items: number };
}

interface Warehouse {
  id: string;
  code: string;
  name: string;
}

interface Stats {
  total: number;
  draft: number;
  pendingQC: number;
  approved: number;
  partiallyApproved: number;
  rejected: number;
  receivedToday: number;
}

const GRN_STATUSES = [
  { value: 'DRAFT', label: 'Draft', color: '#94a3b8' },
  { value: 'PENDING_QC', label: 'Pending QC', color: '#f59e0b' },
  { value: 'APPROVED', label: 'Approved', color: '#22c55e' },
  { value: 'PARTIALLY_APPROVED', label: 'Partial', color: '#3b82f6' },
  { value: 'REJECTED', label: 'Rejected', color: '#ef4444' },
];

export default function GoodsReceiving() {
  const [grns, setGrns] = useState<GRN[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [pendingPOs, setPendingPOs] = useState<PurchaseOrder[]>([]);
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showQCModal, setShowQCModal] = useState(false);
  const [selectedGRN, setSelectedGRN] = useState<GRN | null>(null);
  const [selectedPO, setSelectedPO] = useState<PurchaseOrder | null>(null);
  const [selectedItem, setSelectedItem] = useState<GRNItem | null>(null);
  const [formData, setFormData] = useState({
    poId: '',
    deliveryNoteNumber: '',
    notes: '',
    items: [] as any[],
  });
  const [qcFormData, setQcFormData] = useState({
    acceptedQty: 0,
    rejectedQty: 0,
    rejectionReason: '',
    warehouseId: '',
    binLocation: '',
  });

  useEffect(() => {
    fetchData();
    fetchWarehouses();
  }, [statusFilter, search]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (statusFilter) params.append('status', statusFilter);
      if (search) params.append('search', search);
      
      const [grnRes, statsRes, poRes] = await Promise.all([
        api.get(`/grn?${params}`),
        api.get('/grn/stats'),
        api.get('/grn/pending-pos'),
      ]);
      
      setGrns(grnRes.data);
      setStats(statsRes.data);
      setPendingPOs(poRes.data);
    } catch (error) {
      console.error('Error fetching GRNs:', error);
    } finally {
      setLoading(false);
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

  const handlePOSelect = (po: PurchaseOrder) => {
    setSelectedPO(po);
    setFormData({
      poId: po.id,
      deliveryNoteNumber: '',
      notes: '',
      items: po.items.map(item => ({
        poItemId: item.id,
        itemCode: item.itemCode,
        itemName: item.itemName,
        orderedQty: item.orderedQty,
        alreadyReceived: item.receivedQty,
        receivedQty: item.orderedQty - item.receivedQty,
        unit: item.unit,
        lotNumber: '',
        batchNumber: '',
        expiryDate: '',
        manufacturingDate: '',
        warehouseId: '',
        binLocation: '',
        notes: '',
      })),
    });
  };

  const handleCreateGRN = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const payload = {
        poId: formData.poId,
        deliveryNoteNumber: formData.deliveryNoteNumber,
        notes: formData.notes,
        items: formData.items.filter(i => i.receivedQty > 0).map(i => ({
          poItemId: i.poItemId,
          receivedQty: i.receivedQty,
          unit: i.unit,
          lotNumber: i.lotNumber,
          batchNumber: i.batchNumber,
          expiryDate: i.expiryDate || null,
          manufacturingDate: i.manufacturingDate || null,
          warehouseId: i.warehouseId || null,
          binLocation: i.binLocation,
          notes: i.notes,
        })),
      };
      
      await api.post('/grn', payload);
      setShowCreateModal(false);
      setSelectedPO(null);
      fetchData();
    } catch (error: any) {
      alert(error.response?.data?.error || 'Failed to create GRN');
    }
  };

  const handleViewDetail = async (grn: GRN) => {
    try {
      const res = await api.get(`/grn/${grn.id}`);
      setSelectedGRN(res.data);
      setShowDetailModal(true);
    } catch (error) {
      console.error('Error fetching GRN details:', error);
    }
  };

  const handleSubmitForQC = async (grn: GRN) => {
    try {
      await api.post(`/grn/${grn.id}/submit`);
      fetchData();
      if (showDetailModal) {
        const res = await api.get(`/grn/${grn.id}`);
        setSelectedGRN(res.data);
      }
    } catch (error: any) {
      alert(error.response?.data?.error || 'Failed to submit GRN');
    }
  };

  const handleOpenQC = (item: GRNItem) => {
    setSelectedItem(item);
    setQcFormData({
      acceptedQty: item.receivedQty,
      rejectedQty: 0,
      rejectionReason: '',
      warehouseId: item.warehouseId || '',
      binLocation: item.binLocation || '',
    });
    setShowQCModal(true);
  };

  const handleQCSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedGRN || !selectedItem) return;
    
    try {
      await api.post(`/grn/${selectedGRN.id}/approve-item/${selectedItem.id}`, qcFormData);
      setShowQCModal(false);
      const res = await api.get(`/grn/${selectedGRN.id}`);
      setSelectedGRN(res.data);
      fetchData();
    } catch (error: any) {
      alert(error.response?.data?.error || 'Failed to complete QC');
    }
  };

  const handleCompleteGRN = async () => {
    if (!selectedGRN) return;
    try {
      await api.post(`/grn/${selectedGRN.id}/complete`);
      const res = await api.get(`/grn/${selectedGRN.id}`);
      setSelectedGRN(res.data);
      fetchData();
    } catch (error: any) {
      alert(error.response?.data?.error || 'Failed to complete GRN');
    }
  };

  const handlePostToStock = async () => {
    if (!selectedGRN) return;
    try {
      await api.post(`/grn/${selectedGRN.id}/post-to-stock`);
      alert('GRN posted to stock successfully');
      fetchData();
    } catch (error: any) {
      alert(error.response?.data?.error || 'Failed to post to stock');
    }
  };

  const handleDeleteGRN = async (id: string) => {
    if (!confirm('Are you sure you want to delete this GRN?')) return;
    try {
      await api.delete(`/grn/${id}`);
      fetchData();
    } catch (error: any) {
      alert(error.response?.data?.error || 'Failed to delete GRN');
    }
  };

  const getStatusStyle = (status: string) => {
    const s = GRN_STATUSES.find(st => st.value === status);
    return { backgroundColor: `${s?.color}20`, color: s?.color };
  };

  const getItemStatusStyle = (status: string) => {
    const colors: Record<string, { bg: string; color: string }> = {
      QUARANTINE: { bg: '#fef3c7', color: '#92400e' },
      RELEASED: { bg: '#dcfce7', color: '#166534' },
      REJECTED: { bg: '#fee2e2', color: '#991b1b' },
    };
    return colors[status] || { bg: '#f1f5f9', color: '#475569' };
  };

  return (
    <div className="page-container">
      <div className="page-header">
        <div>
          <h1>Goods Receiving</h1>
          <p style={{ color: 'var(--text-muted)', marginTop: '0.25rem' }}>
            Receive goods from purchase orders
          </p>
        </div>
        <button className="btn btn-primary" onClick={() => setShowCreateModal(true)}>
          <Plus size={18} /> Receive Goods
        </button>
      </div>

      {stats && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
          <div className="card" style={{ padding: '1rem', textAlign: 'center' }}>
            <div style={{ fontSize: '2rem', fontWeight: 700, color: 'var(--primary)' }}>{stats.total}</div>
            <div style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>Total</div>
          </div>
          <div className="card" style={{ padding: '1rem', textAlign: 'center' }}>
            <div style={{ fontSize: '2rem', fontWeight: 700, color: '#94a3b8' }}>{stats.draft}</div>
            <div style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>Draft</div>
          </div>
          <div className="card" style={{ padding: '1rem', textAlign: 'center' }}>
            <div style={{ fontSize: '2rem', fontWeight: 700, color: '#f59e0b' }}>{stats.pendingQC}</div>
            <div style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>Pending QC</div>
          </div>
          <div className="card" style={{ padding: '1rem', textAlign: 'center' }}>
            <div style={{ fontSize: '2rem', fontWeight: 700, color: '#22c55e' }}>{stats.approved}</div>
            <div style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>Approved</div>
          </div>
          <div className="card" style={{ padding: '1rem', textAlign: 'center' }}>
            <div style={{ fontSize: '2rem', fontWeight: 700, color: '#0ea5e9' }}>{stats.receivedToday}</div>
            <div style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>Today</div>
          </div>
        </div>
      )}

      <div className="card">
        <div style={{ display: 'flex', gap: '1rem', marginBottom: '1rem', flexWrap: 'wrap' }}>
          <div style={{ position: 'relative', flex: 1, minWidth: '200px' }}>
            <Search size={18} style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
            <input
              type="text"
              placeholder="Search GRN or PO number..."
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
            {GRN_STATUSES.map(s => (
              <option key={s.value} value={s.value}>{s.label}</option>
            ))}
          </select>
        </div>

        {loading ? (
          <div style={{ textAlign: 'center', padding: '3rem' }}>Loading...</div>
        ) : grns.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
            <Package size={48} style={{ marginBottom: '1rem', opacity: 0.5 }} />
            <p>No goods receiving notes found</p>
          </div>
        ) : (
          <div className="table-container">
            <table className="data-table">
              <thead>
                <tr>
                  <th>GRN #</th>
                  <th>PO #</th>
                  <th>Supplier</th>
                  <th>Received Date</th>
                  <th>Delivery Note</th>
                  <th>Items</th>
                  <th>Status</th>
                  <th style={{ width: '100px' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {grns.map((grn) => (
                  <tr key={grn.id}>
                    <td><strong>{grn.grnNumber}</strong></td>
                    <td>{grn.purchaseOrder?.poNumber || '-'}</td>
                    <td>{grn.supplier?.name || '-'}</td>
                    <td>{new Date(grn.receivedDate).toLocaleDateString()}</td>
                    <td>{grn.deliveryNoteNumber || '-'}</td>
                    <td>{grn._count?.items || 0}</td>
                    <td>
                      <span className="badge" style={getStatusStyle(grn.status)}>
                        {GRN_STATUSES.find(s => s.value === grn.status)?.label}
                      </span>
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: '0.25rem' }}>
                        <button className="btn btn-ghost btn-sm" onClick={() => handleViewDetail(grn)} title="View">
                          <Eye size={16} />
                        </button>
                        {grn.status === 'DRAFT' && (
                          <button className="btn btn-ghost btn-sm" onClick={() => handleSubmitForQC(grn)} title="Submit for QC">
                            <Send size={16} />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {showCreateModal && (
        <div className="modal-overlay" onClick={() => setShowCreateModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '900px', maxHeight: '90vh', overflow: 'auto' }}>
            <div className="modal-header">
              <h2>Receive Goods</h2>
              <button className="btn btn-ghost" onClick={() => setShowCreateModal(false)}>&times;</button>
            </div>
            {!selectedPO ? (
              <div className="modal-body">
                <h3 style={{ marginBottom: '1rem' }}>Select Purchase Order</h3>
                {pendingPOs.length === 0 ? (
                  <p style={{ color: 'var(--text-muted)', textAlign: 'center', padding: '2rem' }}>
                    No pending purchase orders available for receiving
                  </p>
                ) : (
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th>PO #</th>
                        <th>Supplier</th>
                        <th>Status</th>
                        <th>Items</th>
                        <th>Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {pendingPOs.map(po => (
                        <tr key={po.id}>
                          <td><strong>{po.poNumber}</strong></td>
                          <td>{po.supplier.name}</td>
                          <td>{po.status}</td>
                          <td>{po.items.length}</td>
                          <td>
                            <button className="btn btn-sm btn-primary" onClick={() => handlePOSelect(po)}>
                              Select
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            ) : (
              <form onSubmit={handleCreateGRN}>
                <div className="modal-body">
                  <div style={{ marginBottom: '1rem', padding: '1rem', backgroundColor: 'var(--bg-secondary)', borderRadius: '8px' }}>
                    <strong>PO: {selectedPO.poNumber}</strong> - {selectedPO.supplier.name}
                    <button
                      type="button"
                      className="btn btn-ghost btn-sm"
                      style={{ marginLeft: '1rem' }}
                      onClick={() => setSelectedPO(null)}
                    >
                      Change
                    </button>
                  </div>
                  
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1.5rem' }}>
                    <div className="form-group">
                      <label>Delivery Note Number</label>
                      <input
                        type="text"
                        className="form-input"
                        value={formData.deliveryNoteNumber}
                        onChange={(e) => setFormData({ ...formData, deliveryNoteNumber: e.target.value })}
                      />
                    </div>
                    <div className="form-group">
                      <label>Notes</label>
                      <input
                        type="text"
                        className="form-input"
                        value={formData.notes}
                        onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                      />
                    </div>
                  </div>

                  <h4 style={{ marginBottom: '0.5rem' }}>Items to Receive</h4>
                  <div style={{ overflowX: 'auto' }}>
                    <table className="data-table" style={{ fontSize: '0.875rem' }}>
                      <thead>
                        <tr>
                          <th>Item</th>
                          <th>Ordered</th>
                          <th>Already Recv</th>
                          <th>Receiving Qty</th>
                          <th>Lot #</th>
                          <th>Batch #</th>
                          <th>Expiry</th>
                          <th>Warehouse</th>
                        </tr>
                      </thead>
                      <tbody>
                        {formData.items.map((item, idx) => (
                          <tr key={item.poItemId}>
                            <td>
                              <div><strong>{item.itemCode}</strong></div>
                              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{item.itemName}</div>
                            </td>
                            <td>{item.orderedQty} {item.unit}</td>
                            <td>{item.alreadyReceived}</td>
                            <td>
                              <input
                                type="number"
                                className="form-input"
                                style={{ width: '80px' }}
                                value={item.receivedQty}
                                onChange={(e) => {
                                  const items = [...formData.items];
                                  items[idx].receivedQty = parseFloat(e.target.value) || 0;
                                  setFormData({ ...formData, items });
                                }}
                                min={0}
                                max={item.orderedQty - item.alreadyReceived}
                              />
                            </td>
                            <td>
                              <input
                                type="text"
                                className="form-input"
                                style={{ width: '100px' }}
                                value={item.lotNumber}
                                onChange={(e) => {
                                  const items = [...formData.items];
                                  items[idx].lotNumber = e.target.value;
                                  setFormData({ ...formData, items });
                                }}
                              />
                            </td>
                            <td>
                              <input
                                type="text"
                                className="form-input"
                                style={{ width: '100px' }}
                                value={item.batchNumber}
                                onChange={(e) => {
                                  const items = [...formData.items];
                                  items[idx].batchNumber = e.target.value;
                                  setFormData({ ...formData, items });
                                }}
                              />
                            </td>
                            <td>
                              <input
                                type="date"
                                className="form-input"
                                style={{ width: '130px' }}
                                value={item.expiryDate}
                                onChange={(e) => {
                                  const items = [...formData.items];
                                  items[idx].expiryDate = e.target.value;
                                  setFormData({ ...formData, items });
                                }}
                              />
                            </td>
                            <td>
                              <select
                                className="form-select"
                                style={{ width: '150px' }}
                                value={item.warehouseId}
                                onChange={(e) => {
                                  const items = [...formData.items];
                                  items[idx].warehouseId = e.target.value;
                                  setFormData({ ...formData, items });
                                }}
                              >
                                <option value="">Select...</option>
                                {warehouses.map(wh => (
                                  <option key={wh.id} value={wh.id}>{wh.code} - {wh.name}</option>
                                ))}
                              </select>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
                <div className="modal-footer">
                  <button type="button" className="btn" onClick={() => setShowCreateModal(false)}>Cancel</button>
                  <button type="submit" className="btn btn-primary">Create GRN</button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {showDetailModal && selectedGRN && (
        <div className="modal-overlay" onClick={() => setShowDetailModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '900px', maxHeight: '90vh', overflow: 'auto' }}>
            <div className="modal-header">
              <h2>GRN Details - {selectedGRN.grnNumber}</h2>
              <button className="btn btn-ghost" onClick={() => setShowDetailModal(false)}>&times;</button>
            </div>
            <div className="modal-body">
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem', marginBottom: '1.5rem' }}>
                <div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>PO Number</div>
                  <div>{selectedGRN.purchaseOrder?.poNumber}</div>
                </div>
                <div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Supplier</div>
                  <div>{selectedGRN.supplier?.name}</div>
                </div>
                <div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Status</div>
                  <span className="badge" style={getStatusStyle(selectedGRN.status)}>
                    {GRN_STATUSES.find(s => s.value === selectedGRN.status)?.label}
                  </span>
                </div>
                <div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Received Date</div>
                  <div>{new Date(selectedGRN.receivedDate).toLocaleDateString()}</div>
                </div>
                <div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Delivery Note</div>
                  <div>{selectedGRN.deliveryNoteNumber || '-'}</div>
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                <h3>Items ({selectedGRN.items.length})</h3>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  {selectedGRN.status === 'DRAFT' && (
                    <button className="btn btn-primary btn-sm" onClick={() => handleSubmitForQC(selectedGRN)}>
                      <Send size={14} /> Submit for QC
                    </button>
                  )}
                  {selectedGRN.status === 'PENDING_QC' && selectedGRN.items.every(i => i.status !== 'QUARANTINE') && (
                    <button className="btn btn-primary btn-sm" onClick={handleCompleteGRN}>
                      <ClipboardCheck size={14} /> Complete GRN
                    </button>
                  )}
                  {['APPROVED', 'PARTIALLY_APPROVED'].includes(selectedGRN.status) && (
                    <button className="btn btn-success btn-sm" onClick={handlePostToStock}>
                      <Package size={14} /> Post to Stock
                    </button>
                  )}
                </div>
              </div>

              <table className="data-table">
                <thead>
                  <tr>
                    <th>Item</th>
                    <th>Received</th>
                    <th>Accepted</th>
                    <th>Rejected</th>
                    <th>Lot/Batch</th>
                    <th>Expiry</th>
                    <th>Status</th>
                    {selectedGRN.status === 'PENDING_QC' && <th>QC</th>}
                  </tr>
                </thead>
                <tbody>
                  {selectedGRN.items.map(item => (
                    <tr key={item.id}>
                      <td>
                        <div><strong>{item.poItem?.itemCode}</strong></div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{item.poItem?.itemName}</div>
                      </td>
                      <td>{item.receivedQty} {item.unit}</td>
                      <td style={{ color: '#22c55e' }}>{item.acceptedQty}</td>
                      <td style={{ color: '#ef4444' }}>{item.rejectedQty}</td>
                      <td>
                        <div>{item.lotNumber || '-'}</div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{item.batchNumber}</div>
                      </td>
                      <td>{item.expiryDate ? new Date(item.expiryDate).toLocaleDateString() : '-'}</td>
                      <td>
                        <span className="badge" style={getItemStatusStyle(item.status)}>
                          {item.status}
                        </span>
                      </td>
                      {selectedGRN.status === 'PENDING_QC' && (
                        <td>
                          {item.status === 'QUARANTINE' && (
                            <button className="btn btn-sm btn-primary" onClick={() => handleOpenQC(item)}>
                              QC
                            </button>
                          )}
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="modal-footer">
              <button className="btn" onClick={() => setShowDetailModal(false)}>Close</button>
            </div>
          </div>
        </div>
      )}

      {showQCModal && selectedItem && (
        <div className="modal-overlay" onClick={() => setShowQCModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '500px' }}>
            <div className="modal-header">
              <h2>QC Review</h2>
              <button className="btn btn-ghost" onClick={() => setShowQCModal(false)}>&times;</button>
            </div>
            <form onSubmit={handleQCSubmit}>
              <div className="modal-body">
                <div style={{ padding: '1rem', backgroundColor: 'var(--bg-secondary)', borderRadius: '8px', marginBottom: '1rem' }}>
                  <strong>{selectedItem.poItem?.itemCode}</strong> - {selectedItem.poItem?.itemName}
                  <div style={{ marginTop: '0.5rem', color: 'var(--text-muted)' }}>
                    Received Qty: {selectedItem.receivedQty} {selectedItem.unit}
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                  <div className="form-group">
                    <label>Accepted Qty</label>
                    <input
                      type="number"
                      className="form-input"
                      value={qcFormData.acceptedQty}
                      onChange={(e) => {
                        const accepted = parseFloat(e.target.value) || 0;
                        setQcFormData({
                          ...qcFormData,
                          acceptedQty: accepted,
                          rejectedQty: selectedItem.receivedQty - accepted,
                        });
                      }}
                      min={0}
                      max={selectedItem.receivedQty}
                    />
                  </div>
                  <div className="form-group">
                    <label>Rejected Qty</label>
                    <input
                      type="number"
                      className="form-input"
                      value={qcFormData.rejectedQty}
                      onChange={(e) => {
                        const rejected = parseFloat(e.target.value) || 0;
                        setQcFormData({
                          ...qcFormData,
                          rejectedQty: rejected,
                          acceptedQty: selectedItem.receivedQty - rejected,
                        });
                      }}
                      min={0}
                      max={selectedItem.receivedQty}
                    />
                  </div>
                </div>

                {qcFormData.rejectedQty > 0 && (
                  <div className="form-group">
                    <label>Rejection Reason *</label>
                    <textarea
                      className="form-input"
                      value={qcFormData.rejectionReason}
                      onChange={(e) => setQcFormData({ ...qcFormData, rejectionReason: e.target.value })}
                      required={qcFormData.rejectedQty > 0}
                      rows={2}
                    />
                  </div>
                )}

                <div className="form-group">
                  <label>Warehouse</label>
                  <select
                    className="form-select"
                    value={qcFormData.warehouseId}
                    onChange={(e) => setQcFormData({ ...qcFormData, warehouseId: e.target.value })}
                  >
                    <option value="">Select warehouse...</option>
                    {warehouses.map(wh => (
                      <option key={wh.id} value={wh.id}>{wh.code} - {wh.name}</option>
                    ))}
                  </select>
                </div>

                <div className="form-group">
                  <label>Bin Location</label>
                  <input
                    type="text"
                    className="form-input"
                    value={qcFormData.binLocation}
                    onChange={(e) => setQcFormData({ ...qcFormData, binLocation: e.target.value })}
                  />
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn" onClick={() => setShowQCModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary">Complete QC</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
