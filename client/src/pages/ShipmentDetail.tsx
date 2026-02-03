import { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../lib/api';
import { format } from 'date-fns';
import { 
  ArrowLeft, Truck, Package, User, Phone, MapPin, Clock, 
  CheckCircle, AlertTriangle, FileText, Camera, Calendar,
  UserPlus, Send, X, ExternalLink
} from 'lucide-react';
import { useToast } from '../components/ui/Toast';
import { parseApiError } from '../components/ui/FormErrors';
import { StatusBadge } from '../components/shared';
import AttachmentPanel from '../components/AttachmentPanel';

const SHIPMENT_STEPS = [
  { status: 'PACKED', label: 'Packed', icon: Package },
  { status: 'ASSIGNED_TO_DRIVER', label: 'Assigned', icon: UserPlus },
  { status: 'ACCEPTED_BY_DRIVER', label: 'Accepted', icon: CheckCircle },
  { status: 'PICKED_UP', label: 'Picked Up', icon: Truck },
  { status: 'IN_TRANSIT', label: 'In Transit', icon: Send },
  { status: 'ARRIVED', label: 'Arrived', icon: MapPin },
  { status: 'DELIVERED', label: 'Delivered', icon: CheckCircle },
];

const STATUS_ORDER = SHIPMENT_STEPS.map(s => s.status);

export default function ShipmentDetail() {
  const { id } = useParams<{ id: string }>();
  const [showAssignModal, setShowAssignModal] = useState(false);
  const queryClient = useQueryClient();
  const toast = useToast();

  const { data: shipment, isLoading } = useQuery({
    queryKey: ['shipment', id],
    queryFn: async () => {
      const { data } = await api.get(`/shipments/${id}`);
      return data;
    },
    enabled: !!id,
  });

  const { data: drivers } = useQuery({
    queryKey: ['drivers'],
    queryFn: async () => {
      const { data } = await api.get('/drivers');
      return data;
    },
  });

  const assignDriverMutation = useMutation({
    mutationFn: async (data: any) => {
      return api.post(`/shipments/${id}/assign-driver`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['shipment', id] });
      setShowAssignModal(false);
      toast.success('Driver Assigned', 'Driver has been assigned to the shipment');
    },
    onError: (error: any) => {
      const apiError = parseApiError(error);
      toast.error('Assignment Failed', apiError?.userMessage || 'Failed to assign driver');
    },
  });

  const handleAssignDriver = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    assignDriverMutation.mutate({
      driverId: formData.get('driverId'),
      scheduledPickupAt: formData.get('scheduledPickupAt'),
      scheduledDeliveryAt: formData.get('scheduledDeliveryAt'),
      driverNotes: formData.get('driverNotes'),
    });
  };

  const getCurrentStepIndex = () => {
    if (!shipment) return -1;
    if (['DELIVERY_FAILED', 'RETURNED', 'CANCELLED', 'DELAYED'].includes(shipment.status)) {
      return -1;
    }
    return STATUS_ORDER.indexOf(shipment.status);
  };

  const getEventIcon = (eventType: string) => {
    const icons: Record<string, any> = {
      PACKED: Package,
      ASSIGNED_TO_DRIVER: UserPlus,
      ACCEPTED: CheckCircle,
      PICKED_UP: Truck,
      IN_TRANSIT: Send,
      ARRIVED: MapPin,
      DELIVERED: CheckCircle,
      DELIVERY_FAILED: AlertTriangle,
      CHECKPOINT: MapPin,
      SCHEDULED: Calendar,
      STATUS_CHANGE: Clock,
    };
    return icons[eventType] || Clock;
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
        <Link to="/shipments" className="btn btn-primary" style={{ marginTop: '1rem' }}>
          Back to Shipments
        </Link>
      </div>
    );
  }

  const currentStepIndex = getCurrentStepIndex();

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1.5rem' }}>
        <Link to="/shipments" className="btn btn-secondary btn-sm">
          <ArrowLeft size={16} />
        </Link>
        <div style={{ flex: 1 }}>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 600, margin: 0 }}>
            Shipment {shipment.shipmentNumber}
          </h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', margin: 0 }}>
            {shipment.customer?.nameEn || shipment.customer?.name}
          </p>
        </div>
        <StatusBadge status={shipment.status} size="md" />
        {shipment.priority === 'URGENT' && (
          <span className="badge badge-danger">Urgent</span>
        )}
      </div>

      <div className="card" style={{ marginBottom: '1.5rem', padding: '1.5rem' }}>
        <h3 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '1.5rem' }}>Shipment Journey</h3>
        
        {['DELIVERY_FAILED', 'CANCELLED', 'DELAYED'].includes(shipment.status) && (
          <div style={{ 
            backgroundColor: shipment.status === 'CANCELLED' ? 'var(--bg-secondary)' : 'var(--danger-light)', 
            padding: '1rem', 
            borderRadius: 'var(--radius)', 
            marginBottom: '1.5rem',
            display: 'flex',
            alignItems: 'center',
            gap: '0.75rem',
          }}>
            <AlertTriangle size={20} color={shipment.status === 'CANCELLED' ? 'var(--text-muted)' : 'var(--danger)'} />
            <div>
              <div style={{ fontWeight: 500, color: shipment.status === 'CANCELLED' ? 'var(--text-muted)' : 'var(--danger)' }}>
                {shipment.status === 'DELIVERY_FAILED' && 'Delivery Failed'}
                {shipment.status === 'CANCELLED' && 'Shipment Cancelled'}
                {shipment.status === 'DELAYED' && 'Shipment Delayed'}
              </div>
              {shipment.driverNotes && (
                <div style={{ fontSize: '0.875rem', marginTop: '0.25rem' }}>{shipment.driverNotes}</div>
              )}
            </div>
          </div>
        )}

        <div style={{ display: 'flex', justifyContent: 'space-between', position: 'relative', marginBottom: '1rem' }}>
          <div style={{
            position: 'absolute',
            top: '20px',
            left: '40px',
            right: '40px',
            height: '2px',
            backgroundColor: 'var(--border)',
            zIndex: 0,
          }} />
          <div style={{
            position: 'absolute',
            top: '20px',
            left: '40px',
            width: currentStepIndex >= 0 ? `${(currentStepIndex / (SHIPMENT_STEPS.length - 1)) * 100}%` : '0%',
            maxWidth: 'calc(100% - 80px)',
            height: '2px',
            backgroundColor: 'var(--primary)',
            zIndex: 1,
            transition: 'width 0.3s ease',
          }} />
          
          {SHIPMENT_STEPS.map((step, index) => {
            const isCompleted = currentStepIndex >= index;
            const isCurrent = currentStepIndex === index;
            const Icon = step.icon;
            
            return (
              <div key={step.status} style={{ 
                display: 'flex', 
                flexDirection: 'column', 
                alignItems: 'center',
                zIndex: 2,
                flex: 1,
              }}>
                <div style={{
                  width: '40px',
                  height: '40px',
                  borderRadius: '50%',
                  backgroundColor: isCompleted ? 'var(--primary)' : 'var(--bg-secondary)',
                  border: isCurrent ? '3px solid var(--primary)' : '2px solid var(--border)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: isCompleted ? 'white' : 'var(--text-muted)',
                  transition: 'all 0.3s ease',
                }}>
                  <Icon size={18} />
                </div>
                <div style={{
                  marginTop: '0.5rem',
                  fontSize: '0.75rem',
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
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <h3 style={{ fontSize: '1rem', fontWeight: 600, margin: 0 }}>Driver</h3>
            {['PACKED', 'ASSIGNED_TO_DRIVER', 'DELIVERY_FAILED'].includes(shipment.status) && (
              <button className="btn btn-sm btn-outline" onClick={() => setShowAssignModal(true)}>
                <UserPlus size={14} />
                {shipment.driver ? 'Reassign' : 'Assign'}
              </button>
            )}
          </div>
          
          {shipment.driver ? (
            <div style={{ display: 'flex', gap: '1rem' }}>
              <div style={{
                width: '56px',
                height: '56px',
                borderRadius: '50%',
                backgroundColor: 'var(--primary-light)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'var(--primary)',
                fontWeight: 600,
                fontSize: '1.25rem',
              }}>
                {shipment.driver.fullName.charAt(0).toUpperCase()}
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 600, marginBottom: '0.25rem' }}>{shipment.driver.fullName}</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.875rem', color: 'var(--text-muted)', marginBottom: '0.25rem' }}>
                  <Phone size={14} />
                  <a href={`tel:${shipment.driver.mobile}`}>{shipment.driver.mobile}</a>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.875rem', color: 'var(--text-muted)' }}>
                  <Truck size={14} />
                  {shipment.driver.vehicleType} • {shipment.driver.vehiclePlateNo}
                </div>
              </div>
            </div>
          ) : (
            <div style={{ color: 'var(--text-muted)', textAlign: 'center', padding: '1rem' }}>
              No driver assigned yet
            </div>
          )}
        </div>

        <div className="card" style={{ padding: '1.5rem' }}>
          <h3 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '1rem' }}>Delivery Details</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.75rem' }}>
              <User size={16} style={{ marginTop: '2px', color: 'var(--text-muted)' }} />
              <div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Customer</div>
                <div>{shipment.customer?.nameEn || shipment.customer?.name}</div>
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.75rem' }}>
              <MapPin size={16} style={{ marginTop: '2px', color: 'var(--text-muted)' }} />
              <div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Delivery Address</div>
                <div>{shipment.deliveryAddress || shipment.customer?.address || 'Not specified'}</div>
                {shipment.customer?.city && <div style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>{shipment.customer.city}</div>}
              </div>
            </div>
            {(shipment.scheduledPickupAt || shipment.scheduledDeliveryAt) && (
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.75rem' }}>
                <Calendar size={16} style={{ marginTop: '2px', color: 'var(--text-muted)' }} />
                <div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Schedule</div>
                  {shipment.scheduledPickupAt && (
                    <div>Pickup: {format(new Date(shipment.scheduledPickupAt), 'MMM dd, HH:mm')}</div>
                  )}
                  {shipment.scheduledDeliveryAt && (
                    <div>Delivery: {format(new Date(shipment.scheduledDeliveryAt), 'MMM dd, HH:mm')}</div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="grid" style={{ gridTemplateColumns: '2fr 1fr', gap: '1.5rem', marginBottom: '1.5rem' }}>
        <div className="card" style={{ padding: '1.5rem' }}>
          <h3 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '1rem' }}>Timeline</h3>
          {shipment.events?.length > 0 ? (
            <div style={{ position: 'relative' }}>
              <div style={{
                position: 'absolute',
                left: '15px',
                top: '24px',
                bottom: '24px',
                width: '2px',
                backgroundColor: 'var(--border)',
              }} />
              {shipment.events.map((event: any, index: number) => {
                const Icon = getEventIcon(event.eventType);
                return (
                  <div key={event.id} style={{ 
                    display: 'flex', 
                    gap: '1rem', 
                    marginBottom: index < shipment.events.length - 1 ? '1.5rem' : 0,
                    position: 'relative',
                  }}>
                    <div style={{
                      width: '32px',
                      height: '32px',
                      borderRadius: '50%',
                      backgroundColor: 'var(--bg-primary)',
                      border: '2px solid var(--primary)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      zIndex: 1,
                    }}>
                      <Icon size={14} color="var(--primary)" />
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 500 }}>
                        {event.eventType.replace(/_/g, ' ')}
                      </div>
                      {event.notes && (
                        <div style={{ fontSize: '0.875rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
                          {event.notes}
                        </div>
                      )}
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
                        {format(new Date(event.createdAt), 'MMM dd, yyyy HH:mm')}
                        {event.driver && ` • by ${event.driver.fullName}`}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div style={{ color: 'var(--text-muted)', textAlign: 'center', padding: '1rem' }}>
              No events recorded yet
            </div>
          )}
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
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <Link to={`/orders/${order.id}`} style={{ fontWeight: 500, color: 'var(--primary)', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                    {order.orderNumber}
                    <ExternalLink size={12} />
                  </Link>
                  <div style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>
                    {order.product?.name}
                  </div>
                </div>
                <StatusBadge status={order.status} size="sm" />
              </div>
            </div>
          ))}
        </div>

        {id && (
          <AttachmentPanel 
            entityType="SHIPMENT" 
            entityId={id} 
            title="Shipment Attachments"
          />
        )}
      </div>

      {shipment.proofOfDelivery && (
        <div className="card" style={{ padding: '1.5rem', marginBottom: '1.5rem' }}>
          <h3 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '1rem' }}>Proof of Delivery</h3>
          <div className="grid" style={{ gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem' }}>
            <div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '0.25rem' }}>Receiver</div>
              <div style={{ fontWeight: 500 }}>{shipment.proofOfDelivery.receiverName}</div>
              {shipment.proofOfDelivery.receiverMobile && (
                <div style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>{shipment.proofOfDelivery.receiverMobile}</div>
              )}
            </div>
            <div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '0.25rem' }}>Delivered At</div>
              <div>{format(new Date(shipment.proofOfDelivery.deliveredAt), 'MMM dd, yyyy HH:mm')}</div>
            </div>
            {shipment.proofOfDelivery.gpsLat && (
              <div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '0.25rem' }}>GPS Location</div>
                <div>{shipment.proofOfDelivery.gpsLat.toFixed(6)}, {shipment.proofOfDelivery.gpsLng.toFixed(6)}</div>
              </div>
            )}
          </div>
          
          {(shipment.proofOfDelivery.signatureFileUrl || shipment.proofOfDelivery.photos?.length > 0) && (
            <div style={{ marginTop: '1rem', display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
              {shipment.proofOfDelivery.signatureFileUrl && (
                <div style={{ 
                  border: '1px solid var(--border)', 
                  borderRadius: 'var(--radius)', 
                  padding: '0.5rem',
                  textAlign: 'center',
                }}>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '0.25rem' }}>Signature</div>
                  <img 
                    src={shipment.proofOfDelivery.signatureFileUrl} 
                    alt="Signature" 
                    style={{ maxWidth: '150px', maxHeight: '80px' }}
                  />
                </div>
              )}
              {shipment.proofOfDelivery.photos?.map((photo: any, index: number) => (
                <div key={photo.id} style={{ 
                  border: '1px solid var(--border)', 
                  borderRadius: 'var(--radius)', 
                  padding: '0.5rem',
                  textAlign: 'center',
                }}>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '0.25rem' }}>
                    <Camera size={12} style={{ display: 'inline', marginRight: '0.25rem' }} />
                    Photo {index + 1}
                  </div>
                  <img 
                    src={photo.fileUrl} 
                    alt={`Delivery photo ${index + 1}`} 
                    style={{ maxWidth: '150px', maxHeight: '100px', objectFit: 'cover' }}
                  />
                </div>
              ))}
            </div>
          )}
          
          {shipment.proofOfDelivery.notes && (
            <div style={{ marginTop: '1rem' }}>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '0.25rem' }}>Notes</div>
              <div>{shipment.proofOfDelivery.notes}</div>
            </div>
          )}
        </div>
      )}

      {showAssignModal && (
        <div className="modal-overlay">
          <div className="modal" style={{ maxWidth: '500px' }}>
            <div className="modal-header">
              <h3>Assign Driver</h3>
              <button className="btn btn-secondary btn-sm" onClick={() => setShowAssignModal(false)}>×</button>
            </div>
            <form onSubmit={handleAssignDriver}>
              <div className="modal-body">
                <div className="form-group">
                  <label className="form-label">Driver *</label>
                  <select name="driverId" className="form-select" required defaultValue={shipment.driver?.id || ''}>
                    <option value="">Select Driver</option>
                    {drivers?.filter((d: any) => d.status === 'ACTIVE').map((driver: any) => (
                      <option key={driver.id} value={driver.id}>
                        {driver.fullName} - {driver.vehicleType} ({driver.vehiclePlateNo})
                      </option>
                    ))}
                  </select>
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">Pickup Time</label>
                    <input 
                      type="datetime-local" 
                      name="scheduledPickupAt" 
                      className="form-input" 
                      defaultValue={shipment.scheduledPickupAt ? format(new Date(shipment.scheduledPickupAt), "yyyy-MM-dd'T'HH:mm") : ''}
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Delivery Time</label>
                    <input 
                      type="datetime-local" 
                      name="scheduledDeliveryAt" 
                      className="form-input" 
                      defaultValue={shipment.scheduledDeliveryAt ? format(new Date(shipment.scheduledDeliveryAt), "yyyy-MM-dd'T'HH:mm") : ''}
                    />
                  </div>
                </div>
                <div className="form-group">
                  <label className="form-label">Notes for Driver</label>
                  <textarea 
                    name="driverNotes" 
                    className="form-textarea" 
                    rows={2} 
                    placeholder="Special instructions..."
                    defaultValue={shipment.driverNotes || ''}
                  />
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setShowAssignModal(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary" disabled={assignDriverMutation.isPending}>
                  {assignDriverMutation.isPending ? 'Assigning...' : 'Assign Driver'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
