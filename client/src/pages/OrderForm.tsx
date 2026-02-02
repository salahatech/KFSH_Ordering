import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useQuery, useMutation } from '@tanstack/react-query';
import api from '../lib/api';
import { format, addHours } from 'date-fns';
import { ArrowLeft, Calculator, AlertCircle, RefreshCw } from 'lucide-react';
import ApprovalStatus from '../components/ApprovalStatus';
import { useToast } from '../components/ui/Toast';
import { parseApiError } from '../components/ui/FormErrors';

function safeFormatDate(date: any, formatStr: string, fallback: string = ''): string {
  try {
    if (!date) return fallback;
    const d = new Date(date);
    if (isNaN(d.getTime())) return fallback;
    return format(d, formatStr);
  } catch {
    return fallback;
  }
}

export default function OrderForm() {
  const { id } = useParams();
  const navigate = useNavigate();
  const toast = useToast();
  const [formData, setFormData] = useState({
    customerId: '',
    productId: '',
    deliveryDate: format(new Date(), 'yyyy-MM-dd'),
    deliveryTimeStart: '',
    deliveryTimeEnd: '',
    requestedActivity: '',
    activityUnit: 'mCi',
    numberOfDoses: '',
    injectionTime: '',
    patientCount: '',
    specialNotes: '',
  });
  const [error, setError] = useState('');
  const [calculations, setCalculations] = useState<any>(null);

  const { data: customers } = useQuery({
    queryKey: ['customers'],
    queryFn: async () => {
      const { data } = await api.get('/customers');
      return data;
    },
  });

  const { data: products } = useQuery({
    queryKey: ['products'],
    queryFn: async () => {
      const { data } = await api.get('/products');
      return data;
    },
  });

  const { data: order, isLoading: isLoadingOrder, error: orderError } = useQuery({
    queryKey: ['order', id],
    queryFn: async () => {
      const { data } = await api.get(`/orders/${id}`);
      return data;
    },
    enabled: !!id,
  });

  useEffect(() => {
    if (order) {
      try {
        setFormData({
          customerId: order.customerId || '',
          productId: order.productId || '',
          deliveryDate: safeFormatDate(order.deliveryDate, 'yyyy-MM-dd', format(new Date(), 'yyyy-MM-dd')),
          deliveryTimeStart: safeFormatDate(order.deliveryTimeStart, "yyyy-MM-dd'T'HH:mm"),
          deliveryTimeEnd: safeFormatDate(order.deliveryTimeEnd, "yyyy-MM-dd'T'HH:mm"),
          requestedActivity: order.requestedActivity?.toString() || '',
          activityUnit: order.activityUnit || 'mCi',
          numberOfDoses: order.numberOfDoses?.toString() || '',
          injectionTime: safeFormatDate(order.injectionTime, "yyyy-MM-dd'T'HH:mm"),
          patientCount: order.patientCount?.toString() || '',
          specialNotes: order.specialNotes || '',
        });
      } catch (err) {
        console.error('Error loading order data:', err);
        setError('Failed to load order data. Some fields may be missing.');
      }
    }
  }, [order]);

  const saveMutation = useMutation({
    mutationFn: async (data: any) => {
      if (id) {
        return api.put(`/orders/${id}`, data);
      }
      return api.post('/orders', data);
    },
    onSuccess: () => {
      navigate('/orders');
    },
    onError: (err: any) => {
      setError(err.response?.data?.error || 'Failed to save order');
    },
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = (e: React.FormEvent, status: string = 'DRAFT') => {
    e.preventDefault();
    setError('');

    const selectedProduct = products?.find((p: any) => p.id === formData.productId);
    
    saveMutation.mutate({
      customerId: formData.customerId,
      productId: formData.productId,
      deliveryDate: formData.deliveryDate,
      deliveryTimeStart: formData.deliveryTimeStart,
      deliveryTimeEnd: formData.deliveryTimeEnd,
      requestedActivity: parseFloat(formData.requestedActivity),
      activityUnit: formData.activityUnit,
      numberOfDoses: formData.numberOfDoses ? parseInt(formData.numberOfDoses) : null,
      injectionTime: formData.injectionTime || null,
      patientCount: formData.patientCount ? parseInt(formData.patientCount) : null,
      specialNotes: formData.specialNotes || null,
      status,
    });
  };

  const selectedCustomer = customers?.find((c: any) => c.id === formData.customerId);
  const selectedProduct = products?.find((p: any) => p.id === formData.productId);

  if (id && isLoadingOrder) {
    return (
      <div className="loading-overlay">
        <div className="spinner" />
      </div>
    );
  }

  if (orderError) {
    const apiError = parseApiError(orderError);
    return (
      <div>
        <button
          onClick={() => navigate('/orders')}
          className="btn btn-secondary"
          style={{ marginBottom: '1rem' }}
        >
          <ArrowLeft size={18} />
          Back to Orders
        </button>
        <div className="card" style={{ padding: '2rem', textAlign: 'center' }}>
          <AlertCircle size={48} style={{ color: 'var(--danger)', marginBottom: '1rem' }} />
          <h3 style={{ marginBottom: '0.5rem' }}>Failed to Load Order</h3>
          <p style={{ color: 'var(--text-muted)', marginBottom: '1rem' }}>
            {apiError?.userMessage || 'Unable to load order details. Please try again.'}
          </p>
          <button className="btn btn-primary" onClick={() => window.location.reload()}>
            <RefreshCw size={18} /> Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div>
      <button
        onClick={() => navigate('/orders')}
        className="btn btn-secondary"
        style={{ marginBottom: '1rem' }}
      >
        <ArrowLeft size={18} />
        Back to Orders
      </button>

      <div className="card" style={{ maxWidth: '50rem' }}>
        <div style={{ padding: '1.5rem', borderBottom: '1px solid var(--border)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <h2 style={{ fontWeight: 600, margin: 0 }}>{id ? 'Edit Order' : 'New Order'}</h2>
            {id && order && (
              <div style={{ marginLeft: '1rem' }}>
                <ApprovalStatus entityType="ORDER" entityId={id} compact />
              </div>
            )}
          </div>
        </div>

        {id && order && (
          <div style={{ padding: '1rem 1.5rem', borderBottom: '1px solid var(--border)' }}>
            <ApprovalStatus entityType="ORDER" entityId={id} />
          </div>
        )}

        {error && (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              padding: '1rem 1.5rem',
              background: '#fee2e2',
              color: '#991b1b',
            }}
          >
            <AlertCircle size={18} />
            {error}
          </div>
        )}

        <form onSubmit={(e) => handleSubmit(e)}>
          <div style={{ padding: '1.5rem' }}>
            <div className="grid grid-2">
              <div className="form-group">
                <label className="form-label">Customer *</label>
                <select
                  name="customerId"
                  className="form-select"
                  value={formData.customerId}
                  onChange={handleChange}
                  required
                >
                  <option value="">Select Customer</option>
                  {customers?.map((customer: any) => (
                    <option key={customer.id} value={customer.id}>
                      {customer.name} ({customer.code})
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">Product *</label>
                <select
                  name="productId"
                  className="form-select"
                  value={formData.productId}
                  onChange={handleChange}
                  required
                >
                  <option value="">Select Product</option>
                  {products?.map((product: any) => (
                    <option key={product.id} value={product.id}>
                      {product.name} ({product.radionuclide})
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">Delivery Date *</label>
                <input
                  type="date"
                  name="deliveryDate"
                  className="form-input"
                  value={formData.deliveryDate}
                  onChange={handleChange}
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">Delivery Window Start *</label>
                <input
                  type="datetime-local"
                  name="deliveryTimeStart"
                  className="form-input"
                  value={formData.deliveryTimeStart}
                  onChange={handleChange}
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">Delivery Window End *</label>
                <input
                  type="datetime-local"
                  name="deliveryTimeEnd"
                  className="form-input"
                  value={formData.deliveryTimeEnd}
                  onChange={handleChange}
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">Injection Time (if different)</label>
                <input
                  type="datetime-local"
                  name="injectionTime"
                  className="form-input"
                  value={formData.injectionTime}
                  onChange={handleChange}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Requested Activity *</label>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <input
                    type="number"
                    name="requestedActivity"
                    className="form-input"
                    value={formData.requestedActivity}
                    onChange={handleChange}
                    step="0.1"
                    required
                  />
                  <select
                    name="activityUnit"
                    className="form-select"
                    style={{ width: '6rem' }}
                    value={formData.activityUnit}
                    onChange={handleChange}
                  >
                    <option value="mCi">mCi</option>
                    <option value="GBq">GBq</option>
                    <option value="MBq">MBq</option>
                  </select>
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Number of Doses</label>
                <input
                  type="number"
                  name="numberOfDoses"
                  className="form-input"
                  value={formData.numberOfDoses}
                  onChange={handleChange}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Patient Count</label>
                <input
                  type="number"
                  name="patientCount"
                  className="form-input"
                  value={formData.patientCount}
                  onChange={handleChange}
                />
              </div>

              <div className="form-group" style={{ gridColumn: 'span 2' }}>
                <label className="form-label">Special Notes</label>
                <textarea
                  name="specialNotes"
                  className="form-input"
                  rows={3}
                  value={formData.specialNotes}
                  onChange={handleChange}
                />
              </div>
            </div>

            {selectedProduct && selectedCustomer && (
              <div
                style={{
                  marginTop: '1rem',
                  padding: '1rem',
                  background: 'var(--bg-secondary)',
                  borderRadius: 'var(--radius)',
                }}
              >
                <h4 style={{ fontWeight: 600, marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <Calculator size={18} />
                  Product & Delivery Info
                </h4>
                <div className="grid grid-3" style={{ fontSize: '0.875rem' }}>
                  <div>
                    <span style={{ color: 'var(--text-muted)' }}>Half-life: </span>
                    {selectedProduct.halfLifeMinutes} min
                  </div>
                  <div>
                    <span style={{ color: 'var(--text-muted)' }}>Shelf Life: </span>
                    {selectedProduct.shelfLifeMinutes} min
                  </div>
                  <div>
                    <span style={{ color: 'var(--text-muted)' }}>Travel Time: </span>
                    {selectedCustomer.travelTimeMinutes} min
                  </div>
                  <div>
                    <span style={{ color: 'var(--text-muted)' }}>Synthesis: </span>
                    {selectedProduct.synthesisTimeMinutes} min
                  </div>
                  <div>
                    <span style={{ color: 'var(--text-muted)' }}>QC Time: </span>
                    {selectedProduct.qcTimeMinutes} min
                  </div>
                  <div>
                    <span style={{ color: 'var(--text-muted)' }}>Overage: </span>
                    {selectedProduct.overagePercent}%
                  </div>
                </div>
              </div>
            )}
          </div>

          <div
            style={{
              padding: '1rem 1.5rem',
              borderTop: '1px solid var(--border)',
              display: 'flex',
              gap: '0.5rem',
              justifyContent: 'flex-end',
            }}
          >
            <button type="button" className="btn btn-secondary" onClick={() => navigate('/orders')}>
              Cancel
            </button>
            <button
              type="submit"
              className="btn btn-secondary"
              disabled={saveMutation.isPending}
            >
              Save as Draft
            </button>
            <button
              type="button"
              className="btn btn-primary"
              onClick={(e) => handleSubmit(e as any, 'SUBMITTED')}
              disabled={saveMutation.isPending}
            >
              Submit Order
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
