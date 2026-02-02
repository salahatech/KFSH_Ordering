import { useState, useRef } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../../lib/api';
import { format } from 'date-fns';
import { 
  ArrowLeft, Truck, Package, MapPin, Clock, Phone, 
  CheckCircle, AlertTriangle, Camera, Send, Navigation
} from 'lucide-react';
import { useToast } from '../../components/ui/Toast';
import { parseApiError } from '../../components/ui/FormErrors';
import { StatusBadge } from '../../components/shared';

const SHIPMENT_STEPS = [
  { status: 'ASSIGNED_TO_DRIVER', label: 'Assigned' },
  { status: 'ACCEPTED_BY_DRIVER', label: 'Accepted' },
  { status: 'PICKED_UP', label: 'Picked Up' },
  { status: 'IN_TRANSIT', label: 'In Transit' },
  { status: 'ARRIVED', label: 'Arrived' },
  { status: 'DELIVERED', label: 'Delivered' },
];

export default function DriverShipmentDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [showDeliverModal, setShowDeliverModal] = useState(false);
  const [showFailModal, setShowFailModal] = useState(false);
  const [gpsLocation, setGpsLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [gettingLocation, setGettingLocation] = useState(false);
  const photoInputRef = useRef<HTMLInputElement>(null);
  const signatureInputRef = useRef<HTMLInputElement>(null);
  const queryClient = useQueryClient();
  const toast = useToast();

  const { data: shipment, isLoading } = useQuery({
    queryKey: ['driver-shipment', id],
    queryFn: async () => {
      const { data } = await api.get(`/driver/shipments/${id}`);
      return data;
    },
    enabled: !!id,
  });

  const acceptMutation = useMutation({
    mutationFn: async () => api.post(`/driver/shipments/${id}/accept`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['driver-shipment', id] });
      toast.success('Accepted', 'Shipment accepted');
    },
    onError: (error: any) => {
      const apiError = parseApiError(error);
      toast.error('Failed', apiError?.userMessage || 'Failed to accept');
    },
  });

  const pickupMutation = useMutation({
    mutationFn: async () => api.post(`/driver/shipments/${id}/pickup`, { latitude: gpsLocation?.lat, longitude: gpsLocation?.lng }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['driver-shipment', id] });
      toast.success('Picked Up', 'Shipment picked up');
    },
    onError: (error: any) => {
      const apiError = parseApiError(error);
      toast.error('Failed', apiError?.userMessage || 'Failed to confirm pickup');
    },
  });

  const transitMutation = useMutation({
    mutationFn: async () => api.post(`/driver/shipments/${id}/transit`, { latitude: gpsLocation?.lat, longitude: gpsLocation?.lng }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['driver-shipment', id] });
      toast.success('In Transit', 'Started transit');
    },
    onError: (error: any) => {
      const apiError = parseApiError(error);
      toast.error('Failed', apiError?.userMessage || 'Failed to start transit');
    },
  });

  const arrivedMutation = useMutation({
    mutationFn: async () => api.post(`/driver/shipments/${id}/arrived`, { latitude: gpsLocation?.lat, longitude: gpsLocation?.lng }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['driver-shipment', id] });
      toast.success('Arrived', 'Marked as arrived');
    },
    onError: (error: any) => {
      const apiError = parseApiError(error);
      toast.error('Failed', apiError?.userMessage || 'Failed to mark arrived');
    },
  });

  const deliverMutation = useMutation({
    mutationFn: async (formData: FormData) => {
      return api.post(`/driver/shipments/${id}/deliver`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['driver-shipment', id] });
      setShowDeliverModal(false);
      toast.success('Delivered', 'Delivery confirmed with proof');
      navigate('/driver/shipments');
    },
    onError: (error: any) => {
      const apiError = parseApiError(error);
      toast.error('Failed', apiError?.userMessage || 'Failed to confirm delivery');
    },
  });

  const failMutation = useMutation({
    mutationFn: async (data: any) => api.post(`/driver/shipments/${id}/fail`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['driver-shipment', id] });
      setShowFailModal(false);
      toast.success('Reported', 'Delivery failure reported');
    },
    onError: (error: any) => {
      const apiError = parseApiError(error);
      toast.error('Failed', apiError?.userMessage || 'Failed to report');
    },
  });

  const getLocation = () => {
    if (!navigator.geolocation) {
      toast.error('Error', 'Geolocation is not supported');
      return;
    }
    setGettingLocation(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setGpsLocation({ lat: position.coords.latitude, lng: position.coords.longitude });
        setGettingLocation(false);
        toast.success('Location', 'GPS location captured');
      },
      (error) => {
        setGettingLocation(false);
        toast.error('Error', 'Failed to get location: ' + error.message);
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  const handleDeliver = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    
    const receiverName = formData.get('receiverName') as string;
    if (!receiverName?.trim()) {
      toast.error('Required', 'Receiver name is required');
      return;
    }
    
    if (!gpsLocation) {
      toast.error('Required', 'Please capture GPS location before confirming delivery');
      return;
    }
    
    formData.append('latitude', gpsLocation.lat.toString());
    formData.append('longitude', gpsLocation.lng.toString());
    
    const photoFiles = photoInputRef.current?.files;
    if (!photoFiles || photoFiles.length === 0) {
      toast.error('Required', 'Please upload at least one delivery photo');
      return;
    }
    
    for (let i = 0; i < photoFiles.length; i++) {
      formData.append('photos', photoFiles[i]);
    }
    
    const signatureFile = signatureInputRef.current?.files?.[0];
    if (signatureFile) {
      formData.append('signature', signatureFile);
    }
    
    deliverMutation.mutate(formData);
  };

  const handleFail = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    failMutation.mutate({
      reasonCode: formData.get('reasonCode'),
      notes: formData.get('notes'),
      latitude: gpsLocation?.lat,
      longitude: gpsLocation?.lng,
    });
  };

  const getCurrentStepIndex = () => {
    if (!shipment) return -1;
    return SHIPMENT_STEPS.findIndex(s => s.status === shipment.status);
  };

  if (isLoading) {
    return (
      <div className="loading-overlay">
        <div className="spinner" />
      </div>
    );
  }

  if (!shipment) {
    return (
      <div style={{ padding: '2rem', textAlign: 'center' }}>
        <h3>Shipment not found</h3>
        <Link to="/driver/shipments" className="btn btn-primary" style={{ marginTop: '1rem' }}>
          Back to Shipments
        </Link>
      </div>
    );
  }

  const currentStepIndex = getCurrentStepIndex();
  const isTerminal = ['DELIVERED', 'DELIVERY_FAILED', 'CANCELLED', 'RETURNED'].includes(shipment.status);

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1.5rem' }}>
        <Link to="/driver/shipments" className="btn btn-secondary btn-sm">
          <ArrowLeft size={16} />
        </Link>
        <div style={{ flex: 1 }}>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 600, margin: 0 }}>
            {shipment.shipmentNumber}
          </h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', margin: 0 }}>
            {shipment.customer?.nameEn || shipment.customer?.name}
          </p>
        </div>
        <StatusBadge status={shipment.status} size="md" />
      </div>

      <div className="card" style={{ marginBottom: '1.5rem', padding: '1.5rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', position: 'relative', marginBottom: '1rem' }}>
          <div style={{
            position: 'absolute',
            top: '15px',
            left: '30px',
            right: '30px',
            height: '2px',
            backgroundColor: 'var(--border)',
            zIndex: 0,
          }} />
          <div style={{
            position: 'absolute',
            top: '15px',
            left: '30px',
            width: currentStepIndex >= 0 ? `${(currentStepIndex / (SHIPMENT_STEPS.length - 1)) * 100}%` : '0%',
            maxWidth: 'calc(100% - 60px)',
            height: '2px',
            backgroundColor: 'var(--primary)',
            zIndex: 1,
          }} />
          
          {SHIPMENT_STEPS.map((step, index) => {
            const isCompleted = currentStepIndex >= index;
            const isCurrent = currentStepIndex === index;
            
            return (
              <div key={step.status} style={{ 
                display: 'flex', 
                flexDirection: 'column', 
                alignItems: 'center',
                zIndex: 2,
                flex: 1,
              }}>
                <div style={{
                  width: '32px',
                  height: '32px',
                  borderRadius: '50%',
                  backgroundColor: isCompleted ? 'var(--primary)' : 'var(--bg-secondary)',
                  border: isCurrent ? '3px solid var(--primary)' : '2px solid var(--border)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: isCompleted ? 'white' : 'var(--text-muted)',
                  fontSize: '0.75rem',
                  fontWeight: 600,
                }}>
                  {isCompleted ? <CheckCircle size={14} /> : index + 1}
                </div>
                <div style={{
                  marginTop: '0.5rem',
                  fontSize: '0.625rem',
                  fontWeight: isCurrent ? 600 : 400,
                  color: isCompleted ? 'var(--text-primary)' : 'var(--text-muted)',
                  textAlign: 'center',
                }}>
                  {step.label}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="grid" style={{ gridTemplateColumns: '1fr 1fr', gap: '1.5rem', marginBottom: '1.5rem' }}>
        <div className="card" style={{ padding: '1.5rem' }}>
          <h3 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '1rem' }}>Delivery Information</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.75rem' }}>
              <MapPin size={18} style={{ marginTop: '2px', color: 'var(--primary)' }} />
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Delivery Address</div>
                <div style={{ fontWeight: 500 }}>{shipment.deliveryAddress || shipment.customer?.address || 'Not specified'}</div>
                {shipment.customer?.city && (
                  <div style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>{shipment.customer.city}</div>
                )}
                {shipment.deliveryLat && (
                  <a
                    href={`https://www.google.com/maps?q=${shipment.deliveryLat},${shipment.deliveryLng}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="btn btn-sm btn-outline"
                    style={{ marginTop: '0.5rem' }}
                  >
                    <Navigation size={14} />
                    Navigate
                  </a>
                )}
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.75rem' }}>
              <Phone size={18} style={{ marginTop: '2px', color: 'var(--primary)' }} />
              <div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Contact</div>
                <a href={`tel:${shipment.customer?.mobile || shipment.customer?.phone}`} style={{ fontWeight: 500 }}>
                  {shipment.customer?.mobile || shipment.customer?.phone || 'N/A'}
                </a>
              </div>
            </div>
            {shipment.scheduledDeliveryAt && (
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.75rem' }}>
                <Clock size={18} style={{ marginTop: '2px', color: 'var(--primary)' }} />
                <div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Deliver By</div>
                  <div style={{ fontWeight: 500 }}>{format(new Date(shipment.scheduledDeliveryAt), 'MMM dd, HH:mm')}</div>
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="card" style={{ padding: '1.5rem' }}>
          <h3 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '1rem' }}>Orders ({shipment.orders?.length || 0})</h3>
          {shipment.orders?.map((order: any) => (
            <div key={order.id} style={{ 
              padding: '0.75rem', 
              backgroundColor: 'var(--bg-secondary)', 
              borderRadius: 'var(--radius)',
              marginBottom: '0.5rem',
            }}>
              <div style={{ fontWeight: 500 }}>{order.orderNumber}</div>
              <div style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>
                {order.product?.name}
              </div>
            </div>
          ))}
          {shipment.driverNotes && (
            <div style={{ marginTop: '1rem', padding: '0.75rem', backgroundColor: 'var(--warning-light)', borderRadius: 'var(--radius)' }}>
              <div style={{ fontSize: '0.75rem', color: 'var(--warning)', fontWeight: 600 }}>Instructions</div>
              <div style={{ fontSize: '0.875rem' }}>{shipment.driverNotes}</div>
            </div>
          )}
        </div>
      </div>

      {!isTerminal && (
        <div className="card" style={{ padding: '1.5rem', marginBottom: '1.5rem' }}>
          <h3 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '1rem' }}>Actions</h3>
          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '1rem' }}>
            <button
              className="btn btn-secondary"
              onClick={getLocation}
              disabled={gettingLocation}
            >
              <MapPin size={16} />
              {gettingLocation ? 'Getting Location...' : gpsLocation ? 'Location Captured' : 'Capture Location'}
            </button>
            {gpsLocation && (
              <span style={{ display: 'flex', alignItems: 'center', fontSize: '0.75rem', color: 'var(--success)' }}>
                <CheckCircle size={14} style={{ marginRight: '0.25rem' }} />
                {gpsLocation.lat.toFixed(4)}, {gpsLocation.lng.toFixed(4)}
              </span>
            )}
          </div>
          <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
            {shipment.status === 'ASSIGNED_TO_DRIVER' && (
              <button
                className="btn btn-success"
                onClick={() => acceptMutation.mutate()}
                disabled={acceptMutation.isPending}
              >
                <CheckCircle size={16} />
                Accept Shipment
              </button>
            )}
            {shipment.status === 'ACCEPTED_BY_DRIVER' && (
              <button
                className="btn btn-primary"
                onClick={() => pickupMutation.mutate()}
                disabled={pickupMutation.isPending}
              >
                <Package size={16} />
                Confirm Pickup
              </button>
            )}
            {shipment.status === 'PICKED_UP' && (
              <button
                className="btn btn-primary"
                onClick={() => transitMutation.mutate()}
                disabled={transitMutation.isPending}
              >
                <Truck size={16} />
                Start Transit
              </button>
            )}
            {shipment.status === 'IN_TRANSIT' && (
              <button
                className="btn btn-primary"
                onClick={() => arrivedMutation.mutate()}
                disabled={arrivedMutation.isPending}
              >
                <MapPin size={16} />
                Mark Arrived
              </button>
            )}
            {['ARRIVED', 'IN_TRANSIT'].includes(shipment.status) && (
              <>
                <button
                  className="btn btn-success"
                  onClick={() => setShowDeliverModal(true)}
                >
                  <CheckCircle size={16} />
                  Complete Delivery
                </button>
                <button
                  className="btn btn-danger"
                  onClick={() => setShowFailModal(true)}
                >
                  <AlertTriangle size={16} />
                  Report Failed
                </button>
              </>
            )}
          </div>
        </div>
      )}

      {shipment.proofOfDelivery && (
        <div className="card" style={{ padding: '1.5rem' }}>
          <h3 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '1rem' }}>Proof of Delivery</h3>
          <div className="grid" style={{ gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem' }}>
            <div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Receiver</div>
              <div style={{ fontWeight: 500 }}>{shipment.proofOfDelivery.receiverName}</div>
            </div>
            <div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Delivered At</div>
              <div>{format(new Date(shipment.proofOfDelivery.deliveredAt), 'MMM dd, HH:mm')}</div>
            </div>
            <div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>GPS</div>
              <div>{shipment.proofOfDelivery.gpsLat?.toFixed(4)}, {shipment.proofOfDelivery.gpsLng?.toFixed(4)}</div>
            </div>
          </div>
        </div>
      )}

      {showDeliverModal && (
        <div className="modal-overlay">
          <div className="modal" style={{ maxWidth: '500px' }}>
            <div className="modal-header">
              <h3>Confirm Delivery</h3>
              <button className="btn btn-secondary btn-sm" onClick={() => setShowDeliverModal(false)}>×</button>
            </div>
            <form onSubmit={handleDeliver}>
              <div className="modal-body">
                <div className="form-group">
                  <label className="form-label">Receiver Name *</label>
                  <input type="text" name="receiverName" className="form-input" required />
                </div>
                <div className="form-group">
                  <label className="form-label">Receiver Mobile</label>
                  <input type="tel" name="receiverMobile" className="form-input" />
                </div>
                <div className="form-group">
                  <label className="form-label">Delivery Photos *</label>
                  <input type="file" ref={photoInputRef} accept="image/*" multiple className="form-input" />
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
                    At least one photo required
                  </div>
                </div>
                <div className="form-group">
                  <label className="form-label">Signature Image</label>
                  <input type="file" ref={signatureInputRef} accept="image/*" className="form-input" />
                </div>
                <div className="form-group">
                  <label className="form-label">Notes</label>
                  <textarea name="notes" className="form-textarea" rows={2} />
                </div>
                <div className="form-group">
                  <label className="form-label">GPS Location *</label>
                  {gpsLocation ? (
                    <div style={{ fontSize: '0.875rem', color: 'var(--success)', display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.5rem', backgroundColor: 'var(--success-light)', borderRadius: 'var(--radius)' }}>
                      <CheckCircle size={14} />
                      {gpsLocation.lat.toFixed(4)}, {gpsLocation.lng.toFixed(4)}
                    </div>
                  ) : (
                    <div style={{ fontSize: '0.875rem', color: 'var(--danger)', display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.5rem', backgroundColor: 'var(--danger-light)', borderRadius: 'var(--radius)' }}>
                      <AlertTriangle size={14} />
                      GPS not captured - use "Capture Location" button first
                    </div>
                  )}
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setShowDeliverModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-success" disabled={deliverMutation.isPending}>
                  {deliverMutation.isPending ? 'Confirming...' : 'Confirm Delivery'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showFailModal && (
        <div className="modal-overlay">
          <div className="modal" style={{ maxWidth: '500px' }}>
            <div className="modal-header">
              <h3>Report Delivery Failed</h3>
              <button className="btn btn-secondary btn-sm" onClick={() => setShowFailModal(false)}>×</button>
            </div>
            <form onSubmit={handleFail}>
              <div className="modal-body">
                <div className="form-group">
                  <label className="form-label">Reason *</label>
                  <select name="reasonCode" className="form-select" required>
                    <option value="">Select Reason</option>
                    <option value="CUSTOMER_NOT_AVAILABLE">Customer not available</option>
                    <option value="WRONG_ADDRESS">Wrong address</option>
                    <option value="CUSTOMER_REFUSED">Customer refused</option>
                    <option value="ACCESS_ISSUE">Access issue</option>
                    <option value="OTHER">Other</option>
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Notes</label>
                  <textarea name="notes" className="form-textarea" rows={3} placeholder="Additional details..." />
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setShowFailModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-danger" disabled={failMutation.isPending}>
                  {failMutation.isPending ? 'Reporting...' : 'Report Failed'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
