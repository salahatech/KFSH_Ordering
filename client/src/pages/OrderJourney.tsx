import { useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../lib/api';
import { format } from 'date-fns';
import {
  ArrowLeft,
  CheckCircle,
  Circle,
  Clock,
  AlertCircle,
  ArrowRight,
  User,
  Package,
  Truck,
  FileCheck,
  FlaskConical,
  Shield,
  Calendar,
  Building2,
  Activity,
  ChevronDown,
  ChevronUp,
  FileText,
  Printer,
} from 'lucide-react';
import { useToast } from '../components/ui/Toast';
import { parseApiError } from '../components/ui/FormErrors';
import { useAuthStore } from '../store/authStore';

const statusSteps = [
  { key: 'SUBMITTED', label: 'Submitted', icon: FileText },
  { key: 'VALIDATED', label: 'Validated', icon: CheckCircle },
  { key: 'SCHEDULED', label: 'Scheduled', icon: Calendar },
  { key: 'IN_PRODUCTION', label: 'Production', icon: FlaskConical },
  { key: 'QC_PENDING', label: 'QC', icon: FileCheck },
  { key: 'RELEASED', label: 'Released', icon: Shield },
  { key: 'DISPATCHED', label: 'Dispatched', icon: Truck },
  { key: 'DELIVERED', label: 'Delivered', icon: Package },
];

const statusConfig: Record<string, { color: string; badge: string; description: string }> = {
  DRAFT: { color: '#94a3b8', badge: 'default', description: 'Order created, awaiting submission' },
  SUBMITTED: { color: '#3b82f6', badge: 'info', description: 'Order submitted for validation' },
  VALIDATED: { color: '#06b6d4', badge: 'info', description: 'Order validated and approved' },
  SCHEDULED: { color: '#8b5cf6', badge: 'info', description: 'Scheduled for production' },
  IN_PRODUCTION: { color: '#f59e0b', badge: 'warning', description: 'Radiopharmaceutical being manufactured' },
  QC_PENDING: { color: '#f59e0b', badge: 'warning', description: 'Quality control in progress' },
  RELEASED: { color: '#22c55e', badge: 'success', description: 'Released by Qualified Person' },
  DISPATCHED: { color: '#3b82f6', badge: 'info', description: 'Shipped to customer' },
  DELIVERED: { color: '#22c55e', badge: 'success', description: 'Delivered successfully' },
  CANCELLED: { color: '#ef4444', badge: 'danger', description: 'Order cancelled' },
  REJECTED: { color: '#ef4444', badge: 'danger', description: 'Order rejected during validation' },
  FAILED_QC: { color: '#ef4444', badge: 'danger', description: 'Quality control failed' },
  REWORK: { color: '#f59e0b', badge: 'warning', description: 'Order being reworked' },
};

const nextStepInfo: Record<string, { action: string; role: string; description: string; link?: string }> = {
  DRAFT: { action: 'Submit Order', role: 'Sales / Customer', description: 'Review order details and submit for processing', link: '/orders' },
  SUBMITTED: { action: 'Validate Order', role: 'Sales Team', description: 'Verify customer license, product permissions, and feasibility', link: '/orders' },
  VALIDATED: { action: 'Schedule Production', role: 'Production Planner', description: 'Assign to production batch and schedule manufacturing', link: '/planner' },
  SCHEDULED: { action: 'Start Production', role: 'Production Team', description: 'Begin radiopharmaceutical synthesis', link: '/batches' },
  IN_PRODUCTION: { action: 'Complete Production', role: 'Production Team', description: 'Finish manufacturing and send to QC', link: '/batches' },
  QC_PENDING: { action: 'Complete QC Testing', role: 'QC Analyst', description: 'Perform quality control tests on batch', link: '/qc' },
  RELEASED: { action: 'Dispatch Shipment', role: 'Logistics', description: 'Create shipment and dispatch to customer', link: '/shipments' },
  DISPATCHED: { action: 'Confirm Delivery', role: 'Logistics / Customer', description: 'Confirm order was received by customer', link: '/shipments' },
  DELIVERED: { action: 'Complete', role: '-', description: 'Order successfully completed' },
};

function safeFormat(date: any, formatStr: string): string {
  try {
    if (!date) return '-';
    const d = new Date(date);
    if (isNaN(d.getTime())) return '-';
    return format(d, formatStr);
  } catch {
    return '-';
  }
}

export default function OrderJourney() {
  const { id } = useParams();
  const navigate = useNavigate();
  const toast = useToast();
  const queryClient = useQueryClient();
  const { user } = useAuthStore();
  const [showFullTimeline, setShowFullTimeline] = useState(false);

  const { data: order, isLoading } = useQuery({
    queryKey: ['order', id],
    queryFn: async () => {
      const { data } = await api.get(`/orders/${id}`);
      return data;
    },
    enabled: !!id,
  });

  const { data: events } = useQuery({
    queryKey: ['order-events', id],
    queryFn: async () => {
      const { data } = await api.get(`/orders/${id}/events`);
      return data;
    },
    enabled: !!id,
  });

  const transitionMutation = useMutation({
    mutationFn: async ({ status, comment }: { status: string; comment?: string }) => {
      return api.post(`/orders/${id}/transition`, { status, comment });
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['order', id] });
      queryClient.invalidateQueries({ queryKey: ['order-events', id] });
      toast.success('Status Updated', `Order moved to ${variables.status.replace('_', ' ')}`);
    },
    onError: (error: any) => {
      const apiError = parseApiError(error);
      toast.error('Update Failed', apiError?.userMessage || 'Failed to update order status');
    },
  });

  if (isLoading) {
    return (
      <div className="loading-overlay">
        <div className="spinner" />
      </div>
    );
  }

  if (!order) {
    return (
      <div>
        <button onClick={() => navigate('/orders')} className="btn btn-secondary" style={{ marginBottom: '1rem' }}>
          <ArrowLeft size={18} /> Back to Orders
        </button>
        <div className="card" style={{ padding: '2rem', textAlign: 'center' }}>
          <AlertCircle size={48} style={{ color: 'var(--danger)', marginBottom: '1rem' }} />
          <h3>Order Not Found</h3>
        </div>
      </div>
    );
  }

  const currentStepIndex = statusSteps.findIndex(s => s.key === order.status);
  const isTerminalStatus = ['CANCELLED', 'REJECTED', 'FAILED_QC', 'DELIVERED'].includes(order.status);
  const nextStep = nextStepInfo[order.status];
  const config = statusConfig[order.status] || statusConfig.DRAFT;

  const getStepStatus = (stepKey: string, index: number) => {
    if (isTerminalStatus && order.status !== 'DELIVERED') return 'skipped';
    if (order.status === stepKey) return 'current';
    if (currentStepIndex >= 0 && index < currentStepIndex) return 'completed';
    if (order.status === 'DRAFT' && index === 0) return 'pending';
    if (currentStepIndex >= 0 && index > currentStepIndex) return 'pending';
    return 'pending';
  };

  const getEventIcon = (event: any) => {
    if (event.toStatus === 'DELIVERED') return <Package size={16} />;
    if (event.toStatus === 'DISPATCHED') return <Truck size={16} />;
    if (event.toStatus === 'RELEASED') return <Shield size={16} />;
    if (event.toStatus?.includes('QC')) return <FileCheck size={16} />;
    if (event.toStatus === 'IN_PRODUCTION') return <FlaskConical size={16} />;
    if (event.toStatus === 'SCHEDULED') return <Calendar size={16} />;
    return <Clock size={16} />;
  };

  const displayedEvents = showFullTimeline ? events : events?.slice(0, 5);

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem' }}>
        <button onClick={() => navigate('/orders')} className="btn btn-secondary">
          <ArrowLeft size={18} /> Back to Orders
        </button>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <Link to={`/orders/${id}`} className="btn btn-secondary">
            <FileText size={18} /> Edit Order
          </Link>
          <button className="btn btn-secondary" onClick={() => window.print()}>
            <Printer size={18} /> Print
          </button>
        </div>
      </div>

      <div className="card" style={{ marginBottom: '1.5rem' }}>
        <div style={{ padding: '1.5rem', borderBottom: '1px solid var(--border)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem' }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.5rem' }}>
                <h2 style={{ fontSize: '1.5rem', fontWeight: 600, margin: 0 }}>{order.orderNumber}</h2>
                <span className={`badge badge-${config.badge}`} style={{ fontSize: '0.875rem' }}>
                  {order.status.replace('_', ' ')}
                </span>
              </div>
              <p style={{ color: 'var(--text-muted)', margin: 0 }}>{config.description}</p>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>Delivery</div>
              <div style={{ fontWeight: 600 }}>{safeFormat(order.deliveryDate, 'MMM dd, yyyy')}</div>
              <div style={{ fontSize: '0.875rem' }}>
                {safeFormat(order.deliveryTimeStart, 'HH:mm')} - {safeFormat(order.deliveryTimeEnd, 'HH:mm')}
              </div>
            </div>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', padding: '1rem 1.5rem', backgroundColor: 'var(--bg-secondary)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <Building2 size={20} style={{ color: 'var(--primary)' }} />
            <div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Customer</div>
              <div style={{ fontWeight: 500 }}>{order.customer?.name}</div>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <Package size={20} style={{ color: 'var(--primary)' }} />
            <div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Product</div>
              <div style={{ fontWeight: 500 }}>{order.product?.name}</div>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <Activity size={20} style={{ color: 'var(--primary)' }} />
            <div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Activity</div>
              <div style={{ fontWeight: 500 }}>{order.requestedActivity} {order.activityUnit}</div>
            </div>
          </div>
          {order.numberOfDoses && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <FlaskConical size={20} style={{ color: 'var(--primary)' }} />
              <div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Doses</div>
                <div style={{ fontWeight: 500 }}>{order.numberOfDoses}</div>
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="card" style={{ marginBottom: '1.5rem', padding: '1.5rem' }}>
        <h3 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '1.5rem' }}>Order Journey</h3>
        <div style={{ display: 'flex', justifyContent: 'space-between', position: 'relative', marginBottom: '1rem' }}>
          <div style={{ position: 'absolute', top: '20px', left: '40px', right: '40px', height: '2px', backgroundColor: 'var(--border)', zIndex: 0 }} />
          {statusSteps.map((step, index) => {
            const status = getStepStatus(step.key, index);
            const StepIcon = step.icon;
            const eventForStep = events?.find((e: any) => e.toStatus === step.key);
            
            return (
              <div key={step.key} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', zIndex: 1, flex: 1 }}>
                <div style={{
                  width: '40px',
                  height: '40px',
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  backgroundColor: status === 'completed' ? 'var(--success)' : status === 'current' ? 'var(--primary)' : 'var(--bg-tertiary)',
                  color: status === 'completed' || status === 'current' ? 'white' : 'var(--text-muted)',
                  border: status === 'current' ? '3px solid rgba(37, 99, 235, 0.3)' : 'none',
                  transition: 'all 0.2s',
                }}>
                  {status === 'completed' ? <CheckCircle size={20} /> : <StepIcon size={20} />}
                </div>
                <div style={{ marginTop: '0.5rem', fontSize: '0.75rem', fontWeight: status === 'current' ? 600 : 400, color: status === 'pending' ? 'var(--text-muted)' : 'var(--text-primary)', textAlign: 'center' }}>
                  {step.label}
                </div>
                {eventForStep && (
                  <div style={{ fontSize: '0.625rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
                    {safeFormat(eventForStep.createdAt, 'MMM dd HH:mm')}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {nextStep && !isTerminalStatus && (
        <div className="card" style={{ marginBottom: '1.5rem', padding: '1.25rem', borderLeft: '4px solid var(--primary)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
            <div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '0.25rem' }}>WHAT HAPPENS NEXT</div>
              <div style={{ fontSize: '1.125rem', fontWeight: 600, marginBottom: '0.25rem' }}>{nextStep.action}</div>
              <div style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>{nextStep.description}</div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.5rem' }}>
                <User size={12} style={{ display: 'inline', marginRight: '0.25rem' }} />
                Responsible: <strong>{nextStep.role}</strong>
              </div>
            </div>
            {nextStep.link && order.status !== 'DELIVERED' && (
              <Link to={nextStep.link} className="btn btn-primary">
                Go to {nextStep.action.split(' ')[0]} <ArrowRight size={16} />
              </Link>
            )}
          </div>
        </div>
      )}

      <div className="card" style={{ marginBottom: '1.5rem' }}>
        <div style={{ padding: '1rem 1.5rem', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h3 style={{ fontSize: '1rem', fontWeight: 600, margin: 0 }}>Timeline</h3>
          {events?.length > 5 && (
            <button className="btn btn-secondary btn-sm" onClick={() => setShowFullTimeline(!showFullTimeline)}>
              {showFullTimeline ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
              {showFullTimeline ? 'Show Less' : `Show All (${events.length})`}
            </button>
          )}
        </div>
        <div style={{ padding: '1rem 1.5rem' }}>
          {displayedEvents?.length > 0 ? (
            <div style={{ position: 'relative', paddingLeft: '2rem' }}>
              <div style={{ position: 'absolute', left: '11px', top: '8px', bottom: '8px', width: '2px', backgroundColor: 'var(--border)' }} />
              {displayedEvents.map((event: any, index: number) => (
                <div key={event.id} style={{ position: 'relative', paddingBottom: index < displayedEvents.length - 1 ? '1.25rem' : 0 }}>
                  <div style={{
                    position: 'absolute',
                    left: '-2rem',
                    top: '4px',
                    width: '24px',
                    height: '24px',
                    borderRadius: '50%',
                    backgroundColor: index === 0 ? 'var(--primary)' : 'var(--bg-tertiary)',
                    color: index === 0 ? 'white' : 'var(--text-muted)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    border: '2px solid var(--bg-primary)',
                  }}>
                    {getEventIcon(event)}
                  </div>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
                      <span style={{ fontWeight: 500 }}>
                        {event.fromStatus ? `${event.fromStatus.replace('_', ' ')} → ` : ''}
                        {event.toStatus.replace('_', ' ')}
                      </span>
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                        {safeFormat(event.createdAt, 'MMM dd, yyyy HH:mm')}
                      </span>
                    </div>
                    {event.changedByUser && (
                      <div style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)' }}>
                        by {event.changedByUser.firstName} {event.changedByUser.lastName}
                        {event.role && <span style={{ color: 'var(--text-muted)' }}> ({event.role})</span>}
                      </div>
                    )}
                    {event.changeNotes && (
                      <div style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)', marginTop: '0.25rem', fontStyle: 'italic' }}>
                        "{event.changeNotes}"
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '1rem' }}>
              No timeline events yet
            </div>
          )}
        </div>
      </div>

      {order.batch && (
        <div className="card" style={{ marginBottom: '1.5rem' }}>
          <div style={{ padding: '1rem 1.5rem', borderBottom: '1px solid var(--border)' }}>
            <h3 style={{ fontSize: '1rem', fontWeight: 600, margin: 0 }}>Production & QC</h3>
          </div>
          <div style={{ padding: '1rem 1.5rem' }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '1rem' }}>
              <div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Batch Number</div>
                <div style={{ fontWeight: 500 }}>{order.batch.batchNumber}</div>
              </div>
              <div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Batch Status</div>
                <span className={`badge badge-${order.batch.status === 'RELEASED' ? 'success' : 'info'}`}>
                  {order.batch.status.replace('_', ' ')}
                </span>
              </div>
              {order.batch.qcResults?.length > 0 && (
                <div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>QC Tests</div>
                  <div style={{ fontWeight: 500 }}>
                    {order.batch.qcResults.filter((r: any) => r.status === 'PASSED').length} / {order.batch.qcResults.length} Passed
                  </div>
                </div>
              )}
            </div>
            <div style={{ marginTop: '1rem' }}>
              <Link to="/batches" className="btn btn-secondary btn-sm">
                View Batch Details <ArrowRight size={14} />
              </Link>
            </div>
          </div>
        </div>
      )}

      {order.shipment && (
        <div className="card" style={{ marginBottom: '1.5rem' }}>
          <div style={{ padding: '1rem 1.5rem', borderBottom: '1px solid var(--border)' }}>
            <h3 style={{ fontSize: '1rem', fontWeight: 600, margin: 0 }}>Shipment</h3>
          </div>
          <div style={{ padding: '1rem 1.5rem' }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '1rem' }}>
              <div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Shipment Number</div>
                <div style={{ fontWeight: 500 }}>{order.shipment.shipmentNumber}</div>
              </div>
              <div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Status</div>
                <span className={`badge badge-${order.shipment.status === 'DELIVERED' ? 'success' : 'info'}`}>
                  {order.shipment.status}
                </span>
              </div>
              {order.shipment.dispatchedAt && (
                <div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Dispatched At</div>
                  <div style={{ fontWeight: 500 }}>{safeFormat(order.shipment.dispatchedAt, 'MMM dd HH:mm')}</div>
                </div>
              )}
            </div>
            <div style={{ marginTop: '1rem' }}>
              <Link to="/shipments" className="btn btn-secondary btn-sm">
                View Shipment Details <ArrowRight size={14} />
              </Link>
            </div>
          </div>
        </div>
      )}

      {user?.role === 'Admin' && (
        <div className="card" style={{ marginBottom: '1.5rem', backgroundColor: 'var(--bg-tertiary)' }}>
          <div style={{ padding: '1rem 1.5rem' }}>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '0.5rem' }}>ADMIN INFO</div>
            <div style={{ fontSize: '0.8125rem' }}>
              <strong>Order ID:</strong> {order.id}
            </div>
            <div style={{ fontSize: '0.8125rem', marginTop: '0.25rem' }}>
              <strong>Created:</strong> {safeFormat(order.createdAt, 'MMM dd, yyyy HH:mm:ss')}
            </div>
            <div style={{ marginTop: '0.5rem' }}>
              <Link to="/audit" className="btn btn-secondary btn-sm">View Audit Log</Link>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
