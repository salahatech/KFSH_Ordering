import { useParams, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import api from '../../lib/api';
import { format } from 'date-fns';
import { ArrowLeft, Package, Truck, CheckCircle, Clock, Activity, MapPin, Calendar, Info, AlertCircle, Hash, FileText, Building2, MessageSquare, Send } from 'lucide-react';
import { Stepper, Timeline, StatusBadge } from '../../components/shared';

export default function PortalOrderJourney() {
  const { id } = useParams<{ id: string }>();

  const { data: journey, isLoading, error } = useQuery({
    queryKey: ['portal-order-journey', id],
    queryFn: async () => {
      const { data } = await api.get(`/journey/orders/${id}/journey`);
      return data;
    },
    enabled: !!id,
  });

  if (isLoading) {
    return (
      <div className="loading-overlay">
        <div className="spinner" />
      </div>
    );
  }

  if (error || !journey) {
    return (
      <div className="card" style={{ textAlign: 'center', padding: '3rem' }}>
        <AlertCircle size={48} style={{ color: 'var(--danger)', marginBottom: '1rem' }} />
        <h3 style={{ marginBottom: '0.5rem' }}>Order Not Found</h3>
        <p style={{ color: 'var(--text-muted)', marginBottom: '1rem' }}>
          The order you're looking for doesn't exist or you don't have access to it.
        </p>
        <Link to="/portal/orders" className="btn btn-primary">
          Back to Orders
        </Link>
      </div>
    );
  }

  const { order, events, milestones } = journey;

  const sanitizedEvents = events
    .filter((e: any) => !['QC_TEST_ENTERED', 'BATCH_ASSIGNED'].includes(e.type) && e.actorRole !== 'QC Analyst')
    .map((e: any) => ({
      ...e,
      actor: undefined,
      actorRole: undefined,
    }));

  const customerMilestones = milestones.filter((m: any) => 
    ['SUBMITTED', 'SCHEDULED', 'IN_PRODUCTION', 'RELEASED', 'DISPATCHED', 'DELIVERED'].includes(m.key)
  ).map((m: any) => ({
    ...m,
    label: m.key === 'IN_PRODUCTION' ? 'Processing' : m.label,
  }));

  const getStepperSteps = () => {
    return customerMilestones.map((m: any) => ({
      key: m.key,
      label: m.label,
      completed: m.completed,
    }));
  };

  const getCurrentStep = (): string => {
    const steps = getStepperSteps();
    for (let i = steps.length - 1; i >= 0; i--) {
      if (steps[i].completed) {
        return steps[i].key;
      }
    }
    return steps[0]?.key || 'SUBMITTED';
  };

  const getTimelineEvents = () => {
    return sanitizedEvents.map((event: any) => {
      let title = event.title;
      if (event.type === 'STATUS_CHANGE' && event.toStatus) {
        const statusLabels: Record<string, string> = {
          SUBMITTED: 'Order submitted',
          VALIDATED: 'Order validated',
          SCHEDULED: 'Production scheduled',
          IN_PRODUCTION: 'Processing started',
          QC_PENDING: 'Quality check in progress',
          QC_PASSED: 'Quality check passed',
          QP_REVIEW: 'Final review in progress',
          RELEASED: 'Order ready for dispatch',
          DISPATCHED: 'Order dispatched',
          IN_TRANSIT: 'In transit',
          DELIVERED: 'Delivered',
        };
        title = statusLabels[event.toStatus] || event.title;
      }
      
      return {
        id: event.id,
        type: event.type,
        title,
        description: event.type === 'CREATED' ? `Order ${order.orderNumber}` : undefined,
        timestamp: event.timestamp,
        severity: event.severity,
      };
    });
  };

  const getShipmentInfo = () => {
    const shipmentEvents = events.filter((e: any) => e.entityType === 'shipment');
    if (shipmentEvents.length === 0) return null;
    
    const dispatched = shipmentEvents.find((e: any) => e.type === 'DISPATCHED');
    const delivered = shipmentEvents.find((e: any) => e.type === 'DELIVERED');
    
    return { dispatched, delivered };
  };

  const shipmentInfo = getShipmentInfo();

  return (
    <div>
      <Link 
        to="/portal/orders" 
        style={{ 
          display: 'inline-flex', 
          alignItems: 'center', 
          gap: '0.5rem', 
          color: 'var(--text-muted)', 
          textDecoration: 'none',
          marginBottom: '1rem',
          fontSize: '0.875rem'
        }}
      >
        <ArrowLeft size={16} /> Back to Orders
      </Link>

      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
        <div>
          <h2 style={{ fontSize: '1.5rem', fontWeight: 600, marginBottom: '0.25rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            Order {order.orderNumber}
            <StatusBadge status={order.status} />
          </h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', margin: 0 }}>
            Track the progress of your order
          </p>
        </div>
      </div>

      <div className="card" style={{ marginBottom: '1.5rem', padding: '1.5rem' }}>
        <h3 style={{ fontWeight: 600, fontSize: '1rem', marginBottom: '1.25rem' }}>Order Progress</h3>
        <Stepper steps={getStepperSteps()} currentStep={getCurrentStep()} />
      </div>

      <div className="grid" style={{ gridTemplateColumns: '1fr 320px', gap: '1.5rem' }}>
        <div>
          <div className="card">
            <div style={{ padding: '1rem 1.5rem', borderBottom: '1px solid var(--border)' }}>
              <h3 style={{ fontWeight: 600, fontSize: '1rem', margin: 0 }}>Timeline</h3>
            </div>
            <div style={{ padding: '1.5rem' }}>
              <Timeline events={getTimelineEvents()} maxVisible={20} />
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div className="card" style={{ padding: 0 }}>
            <div style={{ padding: '0.875rem 1rem', borderBottom: '1px solid var(--border)' }}>
              <h3 style={{ fontWeight: 600, fontSize: '0.9375rem', margin: 0 }}>Order Details</h3>
            </div>
            <div style={{ padding: '1rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem', marginBottom: '1rem' }}>
                <div style={{ 
                  width: '40px', 
                  height: '40px', 
                  borderRadius: '10px', 
                  background: 'rgba(13, 148, 136, 0.1)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}>
                  <Package size={20} style={{ color: '#0d9488' }} />
                </div>
                <div>
                  <div style={{ fontSize: '0.6875rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                    {order.productCode || 'Product'}
                  </div>
                  <div style={{ fontSize: '0.9375rem', fontWeight: 600 }}>
                    {order.product}
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.375rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.375rem 0', borderBottom: '1px solid var(--border)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
                    <Hash size={12} style={{ color: 'var(--text-muted)' }} />
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Doses</span>
                  </div>
                  <span style={{ fontSize: '0.8125rem', fontWeight: 600 }}>{order.numberOfDoses || 1}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.375rem 0', borderBottom: '1px solid var(--border)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
                    <Activity size={12} style={{ color: '#0d9488' }} />
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Activity</span>
                  </div>
                  <span style={{ fontSize: '0.8125rem', fontWeight: 600, color: '#0d9488' }}>
                    {order.requestedActivity} {order.activityUnit || 'mCi'}
                  </span>
                </div>
                {order.hospitalOrderReference && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.375rem 0', borderBottom: '1px solid var(--border)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
                      <Building2 size={12} style={{ color: 'var(--text-muted)' }} />
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Reference</span>
                    </div>
                    <span style={{ fontSize: '0.8125rem' }}>{order.hospitalOrderReference}</span>
                  </div>
                )}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.375rem 0', borderBottom: '1px solid var(--border)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
                    <Calendar size={12} style={{ color: 'var(--text-muted)' }} />
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Delivery Window</span>
                  </div>
                  <span style={{ fontSize: '0.8125rem', fontWeight: 500 }}>
                    {order.deliveryTimeStart && order.deliveryTimeEnd 
                      ? `${format(new Date(order.deliveryTimeStart), 'HH:mm')} - ${format(new Date(order.deliveryTimeEnd), 'HH:mm')}`
                      : order.deliveryTime 
                        ? format(new Date(order.deliveryTime), 'HH:mm')
                        : 'N/A'
                    }
                  </span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.375rem 0', borderBottom: '1px solid var(--border)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
                    <Calendar size={12} style={{ color: 'var(--text-muted)' }} />
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Delivery Date</span>
                  </div>
                  <span style={{ fontSize: '0.8125rem', fontWeight: 500 }}>
                    {order.deliveryDate ? format(new Date(order.deliveryDate), 'MMM d, yyyy') : 'N/A'}
                  </span>
                </div>
                {order.estimatedDispatchTime && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.375rem 0', borderBottom: '1px solid var(--border)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
                      <Truck size={12} style={{ color: 'var(--text-muted)' }} />
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Est. Dispatch</span>
                    </div>
                    <span style={{ fontSize: '0.8125rem' }}>
                      {format(new Date(order.estimatedDispatchTime), 'MMM d, HH:mm')}
                    </span>
                  </div>
                )}
                {order.estimatedDeliveryTime && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.375rem 0' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
                      <MapPin size={12} style={{ color: 'var(--text-muted)' }} />
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Est. Arrival</span>
                    </div>
                    <span style={{ fontSize: '0.8125rem' }}>
                      {format(new Date(order.estimatedDeliveryTime), 'MMM d, HH:mm')}
                    </span>
                  </div>
                )}
              </div>

              {order.specialNotes && (
                <div style={{ marginTop: '0.75rem', padding: '0.625rem', background: 'var(--bg-secondary)', borderRadius: '6px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', marginBottom: '0.25rem' }}>
                    <FileText size={12} style={{ color: 'var(--text-muted)' }} />
                    <span style={{ fontSize: '0.6875rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Special Notes</span>
                  </div>
                  <p style={{ fontSize: '0.8125rem', margin: 0, color: 'var(--text-secondary)' }}>
                    {order.specialNotes}
                  </p>
                </div>
              )}
            </div>
          </div>

          {shipmentInfo && (
            <div className="card">
              <div style={{ padding: '1rem 1.5rem', borderBottom: '1px solid var(--border)' }}>
                <h3 style={{ fontWeight: 600, fontSize: '1rem', margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <Truck size={18} style={{ color: 'var(--primary)' }} />
                  Shipment Tracking
                </h3>
              </div>
              <div style={{ padding: '1rem 1.5rem' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                  {shipmentInfo.dispatched && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                      <CheckCircle size={18} style={{ color: 'var(--success)' }} />
                      <div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Dispatched</div>
                        <div style={{ fontWeight: 500 }}>
                          {format(new Date(shipmentInfo.dispatched.timestamp), 'MMM d, yyyy HH:mm')}
                        </div>
                      </div>
                    </div>
                  )}
                  {shipmentInfo.delivered ? (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                      <CheckCircle size={18} style={{ color: 'var(--success)' }} />
                      <div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Delivered</div>
                        <div style={{ fontWeight: 500 }}>
                          {format(new Date(shipmentInfo.delivered.timestamp), 'MMM d, yyyy HH:mm')}
                        </div>
                      </div>
                    </div>
                  ) : shipmentInfo.dispatched ? (
                    <div style={{ 
                      display: 'flex', 
                      alignItems: 'center', 
                      gap: '0.75rem',
                      padding: '0.75rem',
                      backgroundColor: 'rgba(234, 179, 8, 0.1)',
                      borderRadius: 'var(--radius)',
                    }}>
                      <Clock size={18} style={{ color: 'var(--warning)' }} />
                      <div style={{ fontWeight: 500, color: 'var(--warning)' }}>
                        In Transit
                      </div>
                    </div>
                  ) : null}
                </div>
              </div>
            </div>
          )}

          <div className="card" style={{ padding: 0 }}>
            <div style={{ padding: '0.875rem 1rem', borderBottom: '1px solid var(--border)' }}>
              <h3 style={{ fontWeight: 600, fontSize: '0.9375rem', margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <MessageSquare size={16} style={{ color: '#0d9488' }} />
                Communication
              </h3>
            </div>
            <div style={{ padding: '1rem' }}>
              <p style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', margin: '0 0 0.75rem 0' }}>
                Have questions about this order? Open a support ticket to communicate with our team.
              </p>
              <Link
                to={`/portal/helpdesk/new?subject=Order ${order.orderNumber}&orderId=${order.id}`}
                className="btn"
                style={{ 
                  width: '100%',
                  boxSizing: 'border-box',
                  background: '#0d9488',
                  borderColor: '#0d9488',
                  color: 'white',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '0.5rem',
                  padding: '0.625rem 1rem',
                  fontSize: '0.8125rem',
                  fontWeight: 600,
                  textDecoration: 'none'
                }}
              >
                <Send size={14} />
                Contact Support
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
