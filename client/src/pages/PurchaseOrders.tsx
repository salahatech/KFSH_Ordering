import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../lib/api';
import {
  Plus, Search, Edit2, Eye, X, Check, Send,
  Clipboard, Truck, Trash2, FileText, DollarSign
} from 'lucide-react';
import { useToast } from '../components/ui/Toast';
import ESignatureModal from '../components/ESignatureModal';

const STATUSES = [
  { value: 'DRAFT', label: 'Draft', color: 'var(--text-muted)' },
  { value: 'PENDING_APPROVAL', label: 'Pending Approval', color: 'var(--warning)' },
  { value: 'APPROVED', label: 'Approved', color: 'var(--info)' },
  { value: 'SENT', label: 'Sent', color: 'var(--primary)' },
  { value: 'ACKNOWLEDGED', label: 'Acknowledged', color: 'var(--primary)' },
  { value: 'PARTIALLY_RECEIVED', label: 'Partially Received', color: 'var(--warning)' },
  { value: 'RECEIVED', label: 'Received', color: 'var(--success)' },
  { value: 'CLOSED', label: 'Closed', color: 'var(--text-muted)' },
  { value: 'CANCELLED', label: 'Cancelled', color: 'var(--error)' },
];

interface POItem {
  id?: string;
  lineNumber: number;
  itemCode: string;
  itemName: string;
  description?: string;
  orderedQty: number;
  receivedQty?: number;
  unit: string;
  unitPrice: number;
  totalPrice?: number;
}

interface PurchaseOrder {
  id: string;
  poNumber: string;
  supplierId: string;
  supplier: { id: string; code: string; name: string };
  orderDate: string;
  expectedDate?: string;
  status: string;
  subtotal: number;
  taxAmount: number;
  totalAmount: number;
  currencyCode: string;
  paymentTermsDays: number;
  deliveryTerms?: string;
  shippingAddress?: string;
  notes?: string;
  items: POItem[];
  createdBy?: { id: string; name: string };
  approvedBy?: { id: string; name: string };
  approvedAt?: string;
  sentAt?: string;
  _count?: { items: number; grns: number };
}

interface Supplier {
  id: string;
  code: string;
  name: string;
}

interface POStats {
  total: number;
  draft: number;
  pendingApproval: number;
  approved: number;
  sent: number;
  received: number;
  totalValue: number;
}

export default function PurchaseOrders() {
  const queryClient = useQueryClient();
  const toast = useToast();

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [supplierFilter, setSupplierFilter] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showESignModal, setShowESignModal] = useState(false);
  const [editingPO, setEditingPO] = useState<PurchaseOrder | null>(null);
  const [selectedPO, setSelectedPO] = useState<PurchaseOrder | null>(null);

  const [formData, setFormData] = useState({
    poNumber: '',
    supplierId: '',
    expectedDate: '',
    paymentTermsDays: 30,
    deliveryTerms: '',
    shippingAddress: '',
    notes: '',
  });

  const [items, setItems] = useState<POItem[]>([
    { lineNumber: 1, itemCode: '', itemName: '', orderedQty: 1, unit: 'EA', unitPrice: 0 }
  ]);

  const { data: stats } = useQuery<POStats>({
    queryKey: ['po-stats'],
    queryFn: async () => {
      const { data } = await api.get('/purchase-orders/stats');
      return data;
    },
  });

  const { data: purchaseOrders = [], isLoading } = useQuery<PurchaseOrder[]>({
    queryKey: ['purchase-orders', search, statusFilter, supplierFilter],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (search) params.append('search', search);
      if (statusFilter) params.append('status', statusFilter);
      if (supplierFilter) params.append('supplierId', supplierFilter);
      const { data } = await api.get(`/purchase-orders?${params}`);
      return data;
    },
  });

  const { data: suppliers = [] } = useQuery<Supplier[]>({
    queryKey: ['suppliers-list'],
    queryFn: async () => {
      const { data } = await api.get('/suppliers?status=ACTIVE');
      return data;
    },
  });

  const { data: poDetail } = useQuery<PurchaseOrder>({
    queryKey: ['purchase-order', selectedPO?.id],
    queryFn: async () => {
      const { data } = await api.get(`/purchase-orders/${selectedPO?.id}`);
      return data;
    },
    enabled: !!selectedPO?.id,
  });

  const { data: nextNumber } = useQuery<{ poNumber: string }>({
    queryKey: ['po-next-number'],
    queryFn: async () => {
      const { data } = await api.get('/purchase-orders/next-number');
      return data;
    },
    enabled: showModal && !editingPO,
  });

  const createMutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await api.post('/purchase-orders', data);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['purchase-orders'] });
      queryClient.invalidateQueries({ queryKey: ['po-stats'] });
      queryClient.invalidateQueries({ queryKey: ['po-next-number'] });
      toast.success('Purchase order created successfully');
      handleCloseModal();
    },
    onError: (err: Error) => {
      toast.error(err.message);
    },
  });

  const updateMutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await api.put(`/purchase-orders/${editingPO?.id}`, data);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['purchase-orders'] });
      queryClient.invalidateQueries({ queryKey: ['po-stats'] });
      toast.success('Purchase order updated successfully');
      handleCloseModal();
    },
    onError: (err: Error) => {
      toast.error(err.message);
    },
  });

  const actionMutation = useMutation({
    mutationFn: async ({ id, action, data }: { id: string; action: string; data?: any }) => {
      const response = await api.post(`/purchase-orders/${id}/${action}`, data || {});
      return response.data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['purchase-orders'] });
      queryClient.invalidateQueries({ queryKey: ['po-stats'] });
      queryClient.invalidateQueries({ queryKey: ['purchase-order', variables.id] });
      toast.success(`Purchase order ${variables.action} successfully`);
    },
    onError: (err: Error) => {
      toast.error(err.message);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await api.delete(`/purchase-orders/${id}`);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['purchase-orders'] });
      queryClient.invalidateQueries({ queryKey: ['po-stats'] });
      toast.success('Purchase order deleted successfully');
    },
    onError: (err: Error) => {
      toast.error(err.message);
    },
  });

  const handleCloseModal = () => {
    setShowModal(false);
    setEditingPO(null);
    setFormData({
      poNumber: '',
      supplierId: '',
      expectedDate: '',
      paymentTermsDays: 30,
      deliveryTerms: '',
      shippingAddress: '',
      notes: '',
    });
    setItems([{ lineNumber: 1, itemCode: '', itemName: '', orderedQty: 1, unit: 'EA', unitPrice: 0 }]);
  };

  const handleEdit = (po: PurchaseOrder) => {
    setEditingPO(po);
    setFormData({
      poNumber: po.poNumber,
      supplierId: po.supplierId,
      expectedDate: po.expectedDate ? po.expectedDate.split('T')[0] : '',
      paymentTermsDays: po.paymentTermsDays,
      deliveryTerms: po.deliveryTerms || '',
      shippingAddress: po.shippingAddress || '',
      notes: po.notes || '',
    });
    setItems(po.items.map((item, idx) => ({
      ...item,
      lineNumber: idx + 1,
    })));
    setShowModal(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const validItems = items.filter(i => i.itemCode && i.itemName && i.orderedQty > 0);
    if (validItems.length === 0) {
      toast.error('Please add at least one valid item');
      return;
    }

    const payload = {
      ...formData,
      poNumber: formData.poNumber || nextNumber?.poNumber,
      items: validItems,
    };

    if (editingPO) {
      updateMutation.mutate(payload);
    } else {
      createMutation.mutate(payload);
    }
  };

  const addItem = () => {
    setItems([...items, {
      lineNumber: items.length + 1,
      itemCode: '',
      itemName: '',
      orderedQty: 1,
      unit: 'EA',
      unitPrice: 0,
    }]);
  };

  const removeItem = (index: number) => {
    if (items.length > 1) {
      setItems(items.filter((_, i) => i !== index).map((item, idx) => ({
        ...item,
        lineNumber: idx + 1,
      })));
    }
  };

  const updateItem = (index: number, field: keyof POItem, value: any) => {
    const newItems = [...items];
    (newItems[index] as any)[field] = value;
    setItems(newItems);
  };

  const getStatusColor = (status: string) => {
    const s = STATUSES.find(st => st.value === status);
    return s?.color || 'var(--text-muted)';
  };

  const formatCurrency = (amount: number, currency = 'SAR') => {
    return new Intl.NumberFormat('en-SA', { style: 'currency', currency }).format(amount);
  };

  const calculateTotal = () => {
    const subtotal = items.reduce((sum, item) => sum + (item.orderedQty * item.unitPrice), 0);
    const tax = subtotal * 0.15;
    return { subtotal, tax, total: subtotal + tax };
  };

  const handleApprove = async (signature: any) => {
    if (selectedPO) {
      await actionMutation.mutateAsync({ id: selectedPO.id, action: 'approve', data: { signatureId: signature.id } });
      setShowESignModal(false);
    }
  };

  return (
    <div className="page-container">
      <div className="page-header">
        <div>
          <h1 className="page-title">Purchase Orders</h1>
          <p className="page-subtitle">Manage procurement and supplier orders</p>
        </div>
        <button className="btn btn-primary" onClick={() => setShowModal(true)}>
          <Plus size={16} /> Create PO
        </button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1rem', marginBottom: '1.5rem' }}>
        <div className="card" style={{ padding: '1rem', textAlign: 'center' }}>
          <div style={{ color: 'var(--primary)', fontSize: '1.5rem', marginBottom: '0.5rem' }}><FileText size={16} /></div>
          <div style={{ fontSize: '1.5rem', fontWeight: 600 }}>{stats?.total || 0}</div>
          <div style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>Total POs</div>
        </div>
        <div className="card" style={{ padding: '1rem', textAlign: 'center' }}>
          <div style={{ color: 'var(--warning)', fontSize: '1.5rem', marginBottom: '0.5rem' }}><Clipboard size={16} /></div>
          <div style={{ fontSize: '1.5rem', fontWeight: 600 }}>{stats?.pendingApproval || 0}</div>
          <div style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>Pending Approval</div>
        </div>
        <div className="card" style={{ padding: '1rem', textAlign: 'center' }}>
          <div style={{ color: 'var(--info)', fontSize: '1.5rem', marginBottom: '0.5rem' }}><Send size={16} /></div>
          <div style={{ fontSize: '1.5rem', fontWeight: 600 }}>{stats?.sent || 0}</div>
          <div style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>Sent to Suppliers</div>
        </div>
        <div className="card" style={{ padding: '1rem', textAlign: 'center' }}>
          <div style={{ color: 'var(--success)', fontSize: '1.5rem', marginBottom: '0.5rem' }}><DollarSign size={16} /></div>
          <div style={{ fontSize: '1.5rem', fontWeight: 600 }}>{formatCurrency(Number(stats?.totalValue) || 0)}</div>
          <div style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>Total Value</div>
        </div>
      </div>

      <div className="card">
        <div className="filter-bar">
          <div className="search-box">
            <Search className="search-icon" />
            <input
              type="text"
              placeholder="Search PO number or supplier..."
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
          <select
            value={supplierFilter}
            onChange={(e) => setSupplierFilter(e.target.value)}
            className="filter-select"
          >
            <option value="">All Suppliers</option>
            {suppliers.map(s => (
              <option key={s.id} value={s.id}>{s.name}</option>
            ))}
          </select>
        </div>

        {isLoading ? (
          <div className="loading-spinner">Loading...</div>
        ) : purchaseOrders.length === 0 ? (
          <div style={{ padding: '3rem', textAlign: 'center' }}>
            <FileText style={{ fontSize: '3rem', color: 'var(--text-muted)', marginBottom: '1rem' }} />
            <h3 style={{ marginBottom: '0.5rem' }}>No purchase orders found</h3>
            <p style={{ color: 'var(--text-muted)', marginBottom: '1rem' }}>Create your first purchase order</p>
            <button className="btn btn-primary" onClick={() => setShowModal(true)}>
              <Plus size={16} /> Create PO
            </button>
          </div>
        ) : (
          <div className="table-container">
            <table className="data-table">
              <thead>
                <tr>
                  <th>PO Number</th>
                  <th>Supplier</th>
                  <th>Order Date</th>
                  <th>Expected</th>
                  <th>Items</th>
                  <th>Total</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {purchaseOrders.map((po) => (
                  <tr key={po.id}>
                    <td><strong>{po.poNumber}</strong></td>
                    <td>
                      <div>{po.supplier?.name}</div>
                      <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                        {po.supplier?.code}
                      </div>
                    </td>
                    <td>{new Date(po.orderDate).toLocaleDateString()}</td>
                    <td>{po.expectedDate ? new Date(po.expectedDate).toLocaleDateString() : '-'}</td>
                    <td>{po._count?.items || 0}</td>
                    <td>{formatCurrency(Number(po.totalAmount), po.currencyCode)}</td>
                    <td>
                      <span
                        className="status-badge"
                        style={{ backgroundColor: getStatusColor(po.status) + '20', color: getStatusColor(po.status) }}
                      >
                        {STATUSES.find(s => s.value === po.status)?.label || po.status}
                      </span>
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: '0.5rem' }}>
                        <button
                          className="icon-button"
                          onClick={() => {
                            setSelectedPO(po);
                            setShowDetailModal(true);
                          }}
                          title="View Details"
                        >
                          <Eye size={16} />
                        </button>
                        {['DRAFT', 'PENDING_APPROVAL'].includes(po.status) && (
                          <button
                            className="icon-button"
                            onClick={() => handleEdit(po)}
                            title="Edit"
                          >
                            <Edit2 size={16} />
                          </button>
                        )}
                        {po.status === 'DRAFT' && (
                          <>
                            <button
                              className="icon-button"
                              onClick={() => actionMutation.mutate({ id: po.id, action: 'submit' })}
                              title="Submit for Approval"
                            >
                              <Send size={16} />
                            </button>
                            <button
                              className="icon-button"
                              onClick={() => {
                                if (confirm('Delete this purchase order?')) {
                                  deleteMutation.mutate(po.id);
                                }
                              }}
                              title="Delete"
                            >
                              <Trash2 size={16} />
                            </button>
                          </>
                        )}
                        {po.status === 'PENDING_APPROVAL' && (
                          <button
                            className="icon-button"
                            onClick={() => {
                              setSelectedPO(po);
                              setShowESignModal(true);
                            }}
                            title="Approve"
                            style={{ color: 'var(--success)' }}
                          >
                            <Check size={16} />
                          </button>
                        )}
                        {po.status === 'APPROVED' && (
                          <button
                            className="icon-button"
                            onClick={() => actionMutation.mutate({ id: po.id, action: 'send' })}
                            title="Send to Supplier"
                          >
                            <Truck size={16} />
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

      {showModal && (
        <div className="modal-overlay" onClick={handleCloseModal}>
          <div className="modal" style={{ maxWidth: '60rem' }} onClick={(e) => e.stopPropagation()}>
            <form onSubmit={handleSubmit}>
              <div className="modal-header">
                <h3 style={{ fontWeight: 600, margin: 0 }}>{editingPO ? 'Edit Purchase Order' : 'Create Purchase Order'}</h3>
                <button type="button" onClick={handleCloseModal} style={{ background: 'var(--bg-secondary)', border: 'none', borderRadius: 'var(--radius)', padding: '0.375rem', cursor: 'pointer', fontSize: '1.25rem', lineHeight: 1 }}>&times;</button>
              </div>
              <div className="modal-body">
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1rem', marginBottom: '1.5rem' }}>
              <div className="form-group">
                <label>PO Number</label>
                <input
                  type="text"
                  value={formData.poNumber || nextNumber?.poNumber || ''}
                  onChange={(e) => setFormData({ ...formData, poNumber: e.target.value })}
                  disabled={!!editingPO}
                  placeholder="Auto-generated"
                />
              </div>
              <div className="form-group">
                <label>Supplier *</label>
                <select
                  value={formData.supplierId}
                  onChange={(e) => setFormData({ ...formData, supplierId: e.target.value })}
                  required
                >
                  <option value="">Select Supplier</option>
                  {suppliers.map(s => (
                    <option key={s.id} value={s.id}>{s.name} ({s.code})</option>
                  ))}
                </select>
              </div>
              <div className="form-group">
                <label>Expected Delivery</label>
                <input
                  type="date"
                  value={formData.expectedDate}
                  onChange={(e) => setFormData({ ...formData, expectedDate: e.target.value })}
                />
              </div>
              <div className="form-group">
                <label>Payment Terms (Days)</label>
                <input
                  type="number"
                  value={formData.paymentTermsDays}
                  onChange={(e) => setFormData({ ...formData, paymentTermsDays: parseInt(e.target.value) || 30 })}
                  min={0}
                />
              </div>
              <div className="form-group">
                <label>Delivery Terms</label>
                <input
                  type="text"
                  value={formData.deliveryTerms}
                  onChange={(e) => setFormData({ ...formData, deliveryTerms: e.target.value })}
                  placeholder="e.g., FOB, CIF"
                />
              </div>
              <div className="form-group">
                <label>Shipping Address</label>
                <input
                  type="text"
                  value={formData.shippingAddress}
                  onChange={(e) => setFormData({ ...formData, shippingAddress: e.target.value })}
                />
              </div>
            </div>

            <h4 style={{ marginBottom: '0.75rem' }}>Line Items</h4>
            <div className="table-container" style={{ marginBottom: '1rem' }}>
              <table className="data-table">
                <thead>
                  <tr>
                    <th style={{ width: '40px' }}>#</th>
                    <th>Item Code *</th>
                    <th>Item Name *</th>
                    <th style={{ width: '80px' }}>Qty *</th>
                    <th style={{ width: '80px' }}>Unit</th>
                    <th style={{ width: '120px' }}>Unit Price *</th>
                    <th style={{ width: '120px' }}>Total</th>
                    <th style={{ width: '40px' }}></th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((item, idx) => (
                    <tr key={idx}>
                      <td>{item.lineNumber}</td>
                      <td>
                        <input
                          type="text"
                          value={item.itemCode}
                          onChange={(e) => updateItem(idx, 'itemCode', e.target.value)}
                          style={{ width: '100%' }}
                        />
                      </td>
                      <td>
                        <input
                          type="text"
                          value={item.itemName}
                          onChange={(e) => updateItem(idx, 'itemName', e.target.value)}
                          style={{ width: '100%' }}
                        />
                      </td>
                      <td>
                        <input
                          type="number"
                          value={item.orderedQty}
                          onChange={(e) => updateItem(idx, 'orderedQty', parseFloat(e.target.value) || 0)}
                          min={0}
                          step="0.01"
                          style={{ width: '100%' }}
                        />
                      </td>
                      <td>
                        <input
                          type="text"
                          value={item.unit}
                          onChange={(e) => updateItem(idx, 'unit', e.target.value)}
                          style={{ width: '100%' }}
                        />
                      </td>
                      <td>
                        <input
                          type="number"
                          value={item.unitPrice}
                          onChange={(e) => updateItem(idx, 'unitPrice', parseFloat(e.target.value) || 0)}
                          min={0}
                          step="0.01"
                          style={{ width: '100%' }}
                        />
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        {formatCurrency(item.orderedQty * item.unitPrice)}
                      </td>
                      <td>
                        <button
                          type="button"
                          className="icon-button"
                          onClick={() => removeItem(idx)}
                          disabled={items.length === 1}
                        >
                          <X size={16} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr>
                    <td colSpan={6} style={{ textAlign: 'right' }}><strong>Subtotal:</strong></td>
                    <td style={{ textAlign: 'right' }}>{formatCurrency(calculateTotal().subtotal)}</td>
                    <td></td>
                  </tr>
                  <tr>
                    <td colSpan={6} style={{ textAlign: 'right' }}><strong>VAT (15%):</strong></td>
                    <td style={{ textAlign: 'right' }}>{formatCurrency(calculateTotal().tax)}</td>
                    <td></td>
                  </tr>
                  <tr>
                    <td colSpan={6} style={{ textAlign: 'right' }}><strong>Total:</strong></td>
                    <td style={{ textAlign: 'right', fontWeight: 'bold' }}>{formatCurrency(calculateTotal().total)}</td>
                    <td></td>
                  </tr>
                </tfoot>
              </table>
            </div>
            <button type="button" className="btn btn-secondary" onClick={addItem}>
              <Plus size={16} /> Add Item
            </button>

            <div className="form-group" style={{ marginTop: '1rem' }}>
              <label>Notes</label>
              <textarea
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                rows={3}
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
                  {(createMutation.isPending || updateMutation.isPending) ? 'Saving...' : (editingPO ? 'Update' : 'Create')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showDetailModal && poDetail && (
        <div className="modal-overlay" onClick={() => setShowDetailModal(false)}>
          <div className="modal" style={{ maxWidth: '60rem' }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3 style={{ fontWeight: 600, margin: 0 }}>Purchase Order Details</h3>
              <button type="button" onClick={() => setShowDetailModal(false)} style={{ background: 'var(--bg-secondary)', border: 'none', borderRadius: 'var(--radius)', padding: '0.375rem', cursor: 'pointer', fontSize: '1.25rem', lineHeight: 1 }}>&times;</button>
            </div>
            <div className="modal-body">
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1.5rem', marginBottom: '1.5rem' }}>
                <div>
                  <h4 style={{ marginBottom: '0.5rem' }}>PO Information</h4>
                  <div><strong>PO Number:</strong> {poDetail.poNumber}</div>
                  <div><strong>Order Date:</strong> {new Date(poDetail.orderDate).toLocaleDateString()}</div>
                  <div><strong>Expected:</strong> {poDetail.expectedDate ? new Date(poDetail.expectedDate).toLocaleDateString() : '-'}</div>
                  <div>
                    <strong>Status:</strong>{' '}
                    <span
                      className="status-badge"
                      style={{ backgroundColor: getStatusColor(poDetail.status) + '20', color: getStatusColor(poDetail.status) }}
                    >
                      {STATUSES.find(s => s.value === poDetail.status)?.label}
                    </span>
                  </div>
                </div>
                <div>
                  <h4 style={{ marginBottom: '0.5rem' }}>Supplier</h4>
                  <div><strong>Name:</strong> {poDetail.supplier?.name}</div>
                  <div><strong>Code:</strong> {poDetail.supplier?.code}</div>
                </div>
                <div>
                  <h4 style={{ marginBottom: '0.5rem' }}>Totals</h4>
                  <div><strong>Subtotal:</strong> {formatCurrency(Number(poDetail.subtotal))}</div>
                  <div><strong>Tax:</strong> {formatCurrency(Number(poDetail.taxAmount))}</div>
                  <div><strong>Total:</strong> {formatCurrency(Number(poDetail.totalAmount))}</div>
                </div>
              </div>

              <h4 style={{ marginBottom: '0.75rem' }}>Line Items</h4>
              <table className="data-table">
                <thead>
                  <tr>
                    <th>#</th>
                    <th>Item Code</th>
                    <th>Item Name</th>
                    <th>Ordered</th>
                    <th>Received</th>
                    <th>Unit</th>
                    <th>Unit Price</th>
                    <th>Total</th>
                  </tr>
                </thead>
                <tbody>
                  {poDetail.items?.map((item) => (
                    <tr key={item.id}>
                      <td>{item.lineNumber}</td>
                      <td>{item.itemCode}</td>
                      <td>{item.itemName}</td>
                      <td>{item.orderedQty}</td>
                      <td>{item.receivedQty || 0}</td>
                      <td>{item.unit}</td>
                      <td>{formatCurrency(Number(item.unitPrice))}</td>
                      <td>{formatCurrency(Number(item.totalPrice))}</td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {poDetail.notes && (
                <div style={{ marginTop: '1rem' }}>
                  <h4>Notes</h4>
                  <p style={{ whiteSpace: 'pre-wrap' }}>{poDetail.notes}</p>
                </div>
              )}
            </div>
            <div className="modal-footer">
              <button type="button" className="btn btn-secondary" onClick={() => setShowDetailModal(false)}>
                Close
              </button>
              {['DRAFT', 'PENDING_APPROVAL'].includes(poDetail.status) && (
                <button type="button" className="btn btn-primary" onClick={() => {
                  setShowDetailModal(false);
                  handleEdit(poDetail);
                }}>
                  <Edit2 size={16} /> Edit
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {showESignModal && selectedPO && (
        <ESignatureModal
          isOpen={showESignModal}
          onClose={() => setShowESignModal(false)}
          scope="PO_APPROVAL"
          entityType="PURCHASE_ORDER"
          entityId={selectedPO.id}
          title={`Approve Purchase Order ${selectedPO.poNumber}`}
          description={`I approve this purchase order for ${formatCurrency(Number(selectedPO.totalAmount))}`}
          onSuccess={handleApprove}
        />
      )}
    </div>
  );
}
