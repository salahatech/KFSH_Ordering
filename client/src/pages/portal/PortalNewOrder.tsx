import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import api from '../../lib/api';
import { format, addDays } from 'date-fns';
import { Package, Calendar, Clock, Activity, CheckCircle, AlertCircle, Building2 } from 'lucide-react';
import { useAuthStore } from '../../store/authStore';

export default function PortalNewOrder() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user } = useAuthStore();
  
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState({
    productId: '',
    requestedActivity: '',
    activityUnit: 'mCi',
    deliveryDate: format(addDays(new Date(), 2), 'yyyy-MM-dd'),
    deliveryTimeStart: '09:00',
    deliveryTimeEnd: '10:00',
    priority: 'NORMAL',
    notes: '',
  });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const { data: profile } = useQuery({
    queryKey: ['portal-profile'],
    queryFn: async () => {
      const { data } = await api.get('/portal/profile');
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

  const selectedProduct = products?.find((p: any) => p.id === formData.productId);

  const createOrderMutation = useMutation({
    mutationFn: async (data: any) => {
      return api.post('/orders', data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['portal-orders'] });
      setSuccess(true);
      setTimeout(() => {
        navigate('/portal/orders');
      }, 2000);
    },
    onError: (err: any) => {
      setError(err.response?.data?.error || 'Failed to create order');
    },
  });

  const handleSubmit = () => {
    if (!formData.productId || !formData.requestedActivity) {
      setError('Please fill in all required fields');
      return;
    }

    const deliveryDate = new Date(formData.deliveryDate);
    
    createOrderMutation.mutate({
      productId: formData.productId,
      requestedActivity: parseFloat(formData.requestedActivity),
      activityUnit: formData.activityUnit,
      deliveryDate: deliveryDate.toISOString(),
      deliveryTimeStart: new Date(`${formData.deliveryDate}T${formData.deliveryTimeStart}`).toISOString(),
      deliveryTimeEnd: new Date(`${formData.deliveryDate}T${formData.deliveryTimeEnd}`).toISOString(),
      priority: formData.priority,
      notes: formData.notes || undefined,
    });
  };

  if (success) {
    return (
      <div style={{ maxWidth: '600px', margin: '4rem auto', textAlign: 'center' }}>
        <div className="card" style={{ padding: '3rem' }}>
          <CheckCircle size={64} style={{ color: 'var(--success)', marginBottom: '1.5rem' }} />
          <h2 style={{ fontSize: '1.5rem', fontWeight: 600, marginBottom: '0.5rem' }}>Order Submitted!</h2>
          <p style={{ color: 'var(--text-muted)', marginBottom: '1rem' }}>
            Your order has been submitted successfully and is pending approval.
          </p>
          <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>
            Redirecting to your orders...
          </p>
        </div>
      </div>
    );
  }

  const customerName = profile?.nameEn || profile?.name || user?.customerName || 'Your Facility';

  return (
    <div style={{ maxWidth: '800px', margin: '0 auto' }}>
      <div style={{ marginBottom: '2rem' }}>
        <h2 style={{ fontSize: '1.5rem', fontWeight: 600, marginBottom: '0.25rem' }}>Place New Order</h2>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>
          Order radiopharmaceuticals for your facility
        </p>
      </div>

      <div style={{ 
        display: 'flex', 
        alignItems: 'center', 
        gap: '0.75rem',
        padding: '1rem 1.25rem', 
        backgroundColor: 'rgba(13, 148, 136, 0.1)', 
        borderRadius: '0.5rem',
        marginBottom: '1.5rem',
        border: '1px solid rgba(13, 148, 136, 0.2)'
      }}>
        <Building2 size={20} style={{ color: '#0d9488' }} />
        <div>
          <span style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>Ordering as: </span>
          <span style={{ fontWeight: 600, color: '#0d9488' }}>{customerName}</span>
        </div>
      </div>

      <div style={{ display: 'flex', marginBottom: '2rem', gap: '0.5rem' }}>
        {[1, 2, 3].map((s) => (
          <div
            key={s}
            style={{
              flex: 1,
              height: '4px',
              borderRadius: '2px',
              backgroundColor: step >= s ? '#0d9488' : 'var(--border)',
              transition: 'background-color 0.3s',
            }}
          />
        ))}
      </div>

      {error && (
        <div style={{ 
          display: 'flex', 
          alignItems: 'center', 
          gap: '0.5rem',
          padding: '1rem', 
          backgroundColor: 'rgba(239, 68, 68, 0.1)', 
          borderRadius: '0.5rem',
          marginBottom: '1.5rem',
          color: 'var(--danger)'
        }}>
          <AlertCircle size={20} />
          {error}
        </div>
      )}

      <div className="card" style={{ padding: '2rem' }}>
        {step === 1 && (
          <>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.5rem' }}>
              <Package size={24} style={{ color: '#0d9488' }} />
              <h3 style={{ fontWeight: 600, fontSize: '1.125rem' }}>Select Product</h3>
            </div>

            <div className="form-group" style={{ marginBottom: '1.5rem' }}>
              <label>Product *</label>
              <select
                className="form-select"
                value={formData.productId}
                onChange={(e) => setFormData({ ...formData, productId: e.target.value })}
                style={{ fontSize: '1rem', padding: '0.875rem' }}
              >
                <option value="">Choose a radiopharmaceutical...</option>
                {products?.map((product: any) => (
                  <option key={product.id} value={product.id}>
                    {product.name} ({product.radionuclide})
                  </option>
                ))}
              </select>
            </div>

            {selectedProduct && (
              <div style={{ 
                backgroundColor: 'var(--background-secondary)', 
                padding: '1rem', 
                borderRadius: '0.5rem',
                marginBottom: '1.5rem'
              }}>
                <div className="grid" style={{ gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem' }}>
                  <div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '0.25rem' }}>Type</div>
                    <div style={{ fontWeight: 500 }}>{selectedProduct.productType}</div>
                  </div>
                  <div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '0.25rem' }}>Half-Life</div>
                    <div style={{ fontWeight: 500 }}>{selectedProduct.halfLifeMinutes} min</div>
                  </div>
                  <div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '0.25rem' }}>Standard Dose</div>
                    <div style={{ fontWeight: 500 }}>{selectedProduct.standardDose} {selectedProduct.doseUnit}</div>
                  </div>
                </div>
              </div>
            )}

            <div className="grid" style={{ gridTemplateColumns: '2fr 1fr', gap: '1rem' }}>
              <div className="form-group">
                <label>Requested Activity *</label>
                <input
                  type="number"
                  className="form-input"
                  value={formData.requestedActivity}
                  onChange={(e) => setFormData({ ...formData, requestedActivity: e.target.value })}
                  placeholder="e.g., 10"
                  step="0.1"
                  style={{ fontSize: '1rem', padding: '0.875rem' }}
                />
              </div>
              <div className="form-group">
                <label>Unit</label>
                <select
                  className="form-select"
                  value={formData.activityUnit}
                  onChange={(e) => setFormData({ ...formData, activityUnit: e.target.value })}
                  style={{ fontSize: '1rem', padding: '0.875rem' }}
                >
                  <option value="mCi">mCi</option>
                  <option value="MBq">MBq</option>
                  <option value="GBq">GBq</option>
                </select>
              </div>
            </div>
          </>
        )}

        {step === 2 && (
          <>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.5rem' }}>
              <Calendar size={24} style={{ color: '#0d9488' }} />
              <h3 style={{ fontWeight: 600, fontSize: '1.125rem' }}>Delivery Schedule</h3>
            </div>

            <div className="form-group" style={{ marginBottom: '1.5rem' }}>
              <label>Delivery Date *</label>
              <input
                type="date"
                className="form-input"
                value={formData.deliveryDate}
                onChange={(e) => setFormData({ ...formData, deliveryDate: e.target.value })}
                min={format(addDays(new Date(), 1), 'yyyy-MM-dd')}
                style={{ fontSize: '1rem', padding: '0.875rem' }}
              />
            </div>

            <div className="grid" style={{ gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1.5rem' }}>
              <div className="form-group">
                <label>Delivery Window Start *</label>
                <input
                  type="time"
                  className="form-input"
                  value={formData.deliveryTimeStart}
                  onChange={(e) => setFormData({ ...formData, deliveryTimeStart: e.target.value })}
                  style={{ fontSize: '1rem', padding: '0.875rem' }}
                />
              </div>
              <div className="form-group">
                <label>Delivery Window End *</label>
                <input
                  type="time"
                  className="form-input"
                  value={formData.deliveryTimeEnd}
                  onChange={(e) => setFormData({ ...formData, deliveryTimeEnd: e.target.value })}
                  style={{ fontSize: '1rem', padding: '0.875rem' }}
                />
              </div>
            </div>

            <div className="form-group">
              <label>Priority</label>
              <select
                className="form-select"
                value={formData.priority}
                onChange={(e) => setFormData({ ...formData, priority: e.target.value })}
                style={{ fontSize: '1rem', padding: '0.875rem' }}
              >
                <option value="NORMAL">Normal</option>
                <option value="URGENT">Urgent</option>
                <option value="STAT">STAT (Emergency)</option>
              </select>
            </div>
          </>
        )}

        {step === 3 && (
          <>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.5rem' }}>
              <CheckCircle size={24} style={{ color: '#0d9488' }} />
              <h3 style={{ fontWeight: 600, fontSize: '1.125rem' }}>Review & Submit</h3>
            </div>

            <div style={{ 
              backgroundColor: 'var(--background-secondary)', 
              padding: '1.5rem', 
              borderRadius: '0.5rem',
              marginBottom: '1.5rem'
            }}>
              <h4 style={{ fontWeight: 600, marginBottom: '1rem' }}>Order Summary</h4>
              <div className="grid" style={{ gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '0.25rem' }}>Product</div>
                  <div style={{ fontWeight: 500 }}>{selectedProduct?.name}</div>
                </div>
                <div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '0.25rem' }}>Activity</div>
                  <div style={{ fontWeight: 500 }}>{formData.requestedActivity} {formData.activityUnit}</div>
                </div>
                <div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '0.25rem' }}>Delivery Date</div>
                  <div style={{ fontWeight: 500 }}>{format(new Date(formData.deliveryDate), 'MMMM d, yyyy')}</div>
                </div>
                <div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '0.25rem' }}>Delivery Time</div>
                  <div style={{ fontWeight: 500 }}>{formData.deliveryTimeStart} - {formData.deliveryTimeEnd}</div>
                </div>
                <div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '0.25rem' }}>Priority</div>
                  <div style={{ fontWeight: 500 }}>{formData.priority}</div>
                </div>
              </div>
            </div>

            <div className="form-group">
              <label>Special Instructions (Optional)</label>
              <textarea
                className="form-input"
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                rows={3}
                placeholder="Any special delivery instructions or patient-specific requirements..."
                style={{ fontSize: '1rem', padding: '0.875rem' }}
              />
            </div>
          </>
        )}

        <div style={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          marginTop: '2rem',
          paddingTop: '1.5rem',
          borderTop: '1px solid var(--border)'
        }}>
          {step > 1 ? (
            <button 
              className="btn btn-outline" 
              onClick={() => setStep(step - 1)}
              style={{ padding: '0.75rem 1.5rem' }}
            >
              Back
            </button>
          ) : (
            <button 
              className="btn btn-outline" 
              onClick={() => navigate('/portal/orders')}
              style={{ padding: '0.75rem 1.5rem' }}
            >
              Cancel
            </button>
          )}

          {step < 3 ? (
            <button 
              className="btn btn-primary" 
              onClick={() => {
                setError('');
                if (step === 1 && (!formData.productId || !formData.requestedActivity)) {
                  setError('Please select a product and enter activity');
                  return;
                }
                setStep(step + 1);
              }}
              style={{ padding: '0.75rem 1.5rem', backgroundColor: '#0d9488' }}
            >
              Continue
            </button>
          ) : (
            <button 
              className="btn btn-primary" 
              onClick={handleSubmit}
              disabled={createOrderMutation.isPending}
              style={{ padding: '0.75rem 1.5rem', backgroundColor: '#0d9488' }}
            >
              {createOrderMutation.isPending ? 'Submitting...' : 'Submit Order'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
