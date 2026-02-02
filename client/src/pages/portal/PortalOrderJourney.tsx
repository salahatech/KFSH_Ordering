import { useParams, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import api from '../../lib/api';
import { format } from 'date-fns';
import { ArrowLeft, Package, Truck, CheckCircle, Clock, Activity, MapPin, Calendar, Info, AlertCircle } from 'lucide-react';
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
          <div className="card">
            <div style={{ padding: '1rem 1.5rem', borderBottom: '1px solid var(--border)' }}>
              <h3 style={{ fontWeight: 600, fontSize: '1rem', margin: 0 }}>Order Details</h3>
            </div>
            <div style={{ padding: '1rem 1.5rem' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  <Package size={18} style={{ color: 'var(--text-muted)' }} />
                  <div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Product</div>
                    <div style={{ fontWeight: 500 }}>{order.product}</div>
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  <Activity size={18} style={{ color: 'var(--text-muted)' }} />
                  <div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Requested Activity</div>
                    <div style={{ fontWeight: 500 }}>{order.activity || 'N/A'}</div>
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  <Calendar size={18} style={{ color: 'var(--text-muted)' }} />
                  <div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Delivery Date</div>
                    <div style={{ fontWeight: 500 }}>
                      {order.deliveryTime ? format(new Date(order.deliveryTime), 'MMM d, yyyy HH:mm') : 'N/A'}
                    </div>
                  </div>
                </div>
              </div>
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

          <div className="card" style={{ 
            backgroundColor: 'rgba(13, 148, 136, 0.05)',
            border: '1px solid rgba(13, 148, 136, 0.2)'
          }}>
            <div style={{ padding: '1rem 1.5rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                <Info size={18} style={{ color: '#0d9488' }} />
                <h4 style={{ fontWeight: 600, fontSize: '0.875rem', margin: 0, color: '#0d9488' }}>Need Help?</h4>
              </div>
              <p style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)', margin: 0 }}>
                If you have questions about your order, please contact our support team.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
