import { useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../lib/api';
import { format } from 'date-fns';
import AttachmentPanel from '../components/AttachmentPanel';
import {
  ArrowLeft,
  CheckCircle,
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
  Activity,
  ChevronDown,
  ChevronUp,
  FileText,
  Printer,
  Beaker,
  ClipboardList,
  Pill,
  Box,
  Send,
  Lock,
  AlertTriangle,
  Play,
} from 'lucide-react';
import { useToast } from '../components/ui/Toast';
import { parseApiError } from '../components/ui/FormErrors';
import { useAuthStore } from '../store/authStore';

const statusSteps = [
  { key: 'PLANNED', label: 'Planned', icon: Calendar, includes: ['PLANNED', 'SCHEDULED'] },
  { key: 'IN_PRODUCTION', label: 'Production', icon: FlaskConical, includes: ['IN_PRODUCTION', 'PRODUCTION_COMPLETE'] },
  { key: 'QC_PENDING', label: 'QC', icon: Beaker, includes: ['QC_PENDING', 'QC_IN_PROGRESS', 'QC_PASSED'] },
  { key: 'QP_REVIEW', label: 'QP Review', icon: Shield, includes: ['QP_REVIEW'] },
  { key: 'RELEASED', label: 'Released', icon: CheckCircle, includes: ['RELEASED'] },
  { key: 'DISPENSING_IN_PROGRESS', label: 'Dispensing', icon: Pill, includes: ['DISPENSING_IN_PROGRESS', 'DISPENSED'] },
  { key: 'PACKED', label: 'Packed', icon: Box, includes: ['PACKED'] },
  { key: 'DISPATCHED', label: 'Dispatched', icon: Truck, includes: ['DISPATCHED', 'CLOSED'] },
];

const statusOrder = [
  'PLANNED', 'SCHEDULED', 'IN_PRODUCTION', 'PRODUCTION_COMPLETE',
  'QC_PENDING', 'QC_IN_PROGRESS', 'QC_PASSED', 'QP_REVIEW',
  'RELEASED', 'DISPENSING_IN_PROGRESS', 'DISPENSED', 'PACKED', 'DISPATCHED', 'CLOSED'
];

const statusConfig: Record<string, { color: string; badge: string; description: string }> = {
  // Planning stage - gray (not started)
  PLANNED: { color: '#94a3b8', badge: 'default', description: 'Batch is planned and awaiting production start' },
  SCHEDULED: { color: '#64748b', badge: 'secondary', description: 'Batch is scheduled for production' },
  // Production stage - blue (active work)
  IN_PRODUCTION: { color: '#3b82f6', badge: 'info', description: 'Radiopharmaceutical synthesis in progress' },
  PRODUCTION_COMPLETE: { color: '#3b82f6', badge: 'info', description: 'Production completed, ready for QC' },
  // QC stage - orange (testing)
  QC_PENDING: { color: '#f59e0b', badge: 'warning', description: 'Awaiting quality control testing' },
  QC_IN_PROGRESS: { color: '#f59e0b', badge: 'warning', description: 'Quality control tests in progress' },
  QC_PASSED: { color: '#eab308', badge: 'qc-passed', description: 'All QC tests passed' },
  // Release stage
  QP_REVIEW: { color: '#f97316', badge: 'qp-passed', description: 'Awaiting Qualified Person review' },
  RELEASED: { color: '#22c55e', badge: 'released', description: 'Released by QP for dispensing' },
  // Dispensing stage - teal (fulfillment)
  DISPENSING_IN_PROGRESS: { color: '#14b8a6', badge: 'teal', description: 'Dose units being dispensed' },
  DISPENSED: { color: '#14b8a6', badge: 'teal', description: 'All doses dispensed' },
  // Logistics stage - blue (shipping)
  PACKED: { color: '#3b82f6', badge: 'info', description: 'Packaged and ready for dispatch' },
  DISPATCHED: { color: '#3b82f6', badge: 'info', description: 'Shipped to customer' },
  // Completed - red (terminal state)
  CLOSED: { color: '#dc2626', badge: 'closed', description: 'Batch completed' },
  // Exceptions - red/orange
  ON_HOLD: { color: '#f59e0b', badge: 'warning', description: 'Batch on hold - requires investigation' },
  REJECTED: { color: '#ef4444', badge: 'danger', description: 'Batch rejected by QP' },
  FAILED_QC: { color: '#ef4444', badge: 'danger', description: 'Quality control failed' },
  CANCELLED: { color: '#ef4444', badge: 'danger', description: 'Batch cancelled' },
  DEVIATION_OPEN: { color: '#f59e0b', badge: 'warning', description: 'Deviation investigation in progress' },
};

const nextStepInfo: Record<string, { action: string; role: string; description: string; nextStatus?: string }> = {
  PLANNED: { action: 'Start Production', role: 'Production', description: 'Begin radiopharmaceutical synthesis', nextStatus: 'IN_PRODUCTION' },
  SCHEDULED: { action: 'Start Production', role: 'Production', description: 'Begin radiopharmaceutical synthesis', nextStatus: 'IN_PRODUCTION' },
  IN_PRODUCTION: { action: 'Complete Production', role: 'Production', description: 'Mark synthesis as complete', nextStatus: 'PRODUCTION_COMPLETE' },
  PRODUCTION_COMPLETE: { action: 'Start QC', role: 'QC Analyst', description: 'Begin quality control testing', nextStatus: 'QC_PENDING' },
  QC_PENDING: { action: 'Enter QC Results', role: 'QC Analyst', description: 'Perform and record QC test results', nextStatus: 'QC_IN_PROGRESS' },
  QC_IN_PROGRESS: { action: 'Complete QC', role: 'QC Analyst', description: 'Finalize QC testing', nextStatus: 'QC_PASSED' },
  QC_PASSED: { action: 'Submit for QP Review', role: 'QC Analyst', description: 'Send batch for QP approval', nextStatus: 'QP_REVIEW' },
  QP_REVIEW: { action: 'Release Batch', role: 'Qualified Person', description: 'Review and release batch with e-signature', nextStatus: 'RELEASED' },
  RELEASED: { action: 'Start Dispensing', role: 'Dispensing', description: 'Begin creating dose units', nextStatus: 'DISPENSING_IN_PROGRESS' },
  DISPENSING_IN_PROGRESS: { action: 'Complete Dispensing', role: 'Dispensing', description: 'Finish dispensing all doses', nextStatus: 'DISPENSED' },
  DISPENSED: { action: 'Pack for Shipment', role: 'Logistics', description: 'Package doses for transport', nextStatus: 'PACKED' },
  PACKED: { action: 'Dispatch', role: 'Logistics', description: 'Ship batch to customer', nextStatus: 'DISPATCHED' },
  DISPATCHED: { action: 'Close Batch', role: 'Admin', description: 'Close batch after delivery confirmation', nextStatus: 'CLOSED' },
  CLOSED: { action: 'Complete', role: '-', description: 'Batch lifecycle complete' },
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

export default function BatchJourney() {
  const { id } = useParams();
  const navigate = useNavigate();
  const toast = useToast();
  const queryClient = useQueryClient();
  const { user } = useAuthStore();
  const [showFullTimeline, setShowFullTimeline] = useState(false);
  const [activeTab, setActiveTab] = useState('overview');

  const { data: batch, isLoading } = useQuery({
    queryKey: ['batch', id],
    queryFn: async () => {
      const { data } = await api.get(`/batches/${id}`);
      return data;
    },
    enabled: !!id,
  });

  const { data: events } = useQuery({
    queryKey: ['batch-events', id],
    queryFn: async () => {
      const { data } = await api.get(`/batches/${id}/events`);
      return data;
    },
    enabled: !!id,
  });

  const transitionMutation = useMutation({
    mutationFn: async ({ status, note }: { status: string; note?: string }) => {
      return api.post(`/batches/${id}/transition`, { status, note });
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['batch', id] });
      queryClient.invalidateQueries({ queryKey: ['batch-events', id] });
      toast.success('Status Updated', `Batch moved to ${variables.status.replace(/_/g, ' ')}`);
    },
    onError: (error: any) => {
      const apiError = parseApiError(error);
      toast.error('Update Failed', apiError?.userMessage || 'Failed to update batch status');
    },
  });

  if (isLoading) {
    return (
      <div className="loading-overlay">
        <div className="spinner" />
      </div>
    );
  }

  if (!batch) {
    return (
      <div>
        <button onClick={() => navigate('/batches')} className="btn btn-secondary" style={{ marginBottom: '1rem' }}>
          <ArrowLeft size={18} /> Back to Batches
        </button>
        <div className="card" style={{ padding: '2rem', textAlign: 'center' }}>
          <AlertCircle size={48} style={{ color: 'var(--danger)', marginBottom: '1rem' }} />
          <h3>Batch Not Found</h3>
        </div>
      </div>
    );
  }

  const currentStepIndex = statusSteps.findIndex(s => s.includes?.includes(batch.status) || s.key === batch.status);
  const currentStatusOrder = statusOrder.indexOf(batch.status);
  const isExceptionStatus = ['ON_HOLD', 'REJECTED', 'FAILED_QC', 'CANCELLED', 'DEVIATION_OPEN'].includes(batch.status);
  const isTerminalStatus = ['CLOSED', 'CANCELLED'].includes(batch.status);
  const nextStep = nextStepInfo[batch.status];
  const config = statusConfig[batch.status] || statusConfig.PLANNED;

  const getStepStatus = (step: typeof statusSteps[0], index: number) => {
    if (isExceptionStatus) return index <= currentStepIndex ? 'completed' : 'skipped';
    if (step.includes?.includes(batch.status)) return 'current';
    if (batch.status === 'CLOSED' && step.key === 'DISPATCHED') return 'completed';
    if (currentStepIndex >= 0 && index < currentStepIndex) return 'completed';
    if (currentStepIndex >= 0 && index > currentStepIndex) return 'pending';
    return 'pending';
  };

  const getEventIcon = (event: any) => {
    if (event.toStatus === 'DISPATCHED') return <Truck size={16} />;
    if (event.toStatus === 'RELEASED') return <Shield size={16} />;
    if (event.toStatus?.includes('QC') || event.toStatus?.includes('QP')) return <Beaker size={16} />;
    if (event.toStatus === 'IN_PRODUCTION') return <FlaskConical size={16} />;
    if (event.toStatus?.includes('DISPENS')) return <Pill size={16} />;
    if (event.toStatus === 'PACKED') return <Box size={16} />;
    if (event.eventType === 'MATERIAL_ADDED') return <Package size={16} />;
    return <Clock size={16} />;
  };

  const displayedEvents = showFullTimeline ? events : events?.slice(0, 5);
  const doseUnitsCount = batch.doseUnits?.length || 0;
  const dispensedCount = batch.doseUnits?.filter((d: any) => d.status === 'DISPENSED').length || 0;

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem' }}>
        <button onClick={() => navigate('/batches')} className="btn btn-secondary">
          <ArrowLeft size={18} /> Back to Batches
        </button>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
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
                <h2 style={{ fontSize: '1.5rem', fontWeight: 600, margin: 0 }}>{batch.batchNumber}</h2>
                <span className={`badge badge-${config.badge}`} style={{ fontSize: '0.875rem' }}>
                  {batch.status.replace(/_/g, ' ')}
                </span>
                {isExceptionStatus && (
                  <span className="badge badge-danger" style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                    <AlertTriangle size={12} /> Exception
                  </span>
                )}
              </div>
              <p style={{ color: 'var(--text-muted)', margin: 0 }}>{config.description}</p>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>Planned Start</div>
              <div style={{ fontWeight: 600 }}>{safeFormat(batch.plannedStartTime, 'MMM dd, yyyy HH:mm')}</div>
            </div>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '1rem', padding: '1rem 1.5rem', backgroundColor: 'var(--bg-secondary)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <Package size={20} style={{ color: 'var(--primary)' }} />
            <div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Product</div>
              <div style={{ fontWeight: 500 }}>{batch.product?.name}</div>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <Activity size={20} style={{ color: 'var(--primary)' }} />
            <div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Target Activity</div>
              <div style={{ fontWeight: 500 }}>{batch.targetActivity} {batch.activityUnit}</div>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <ClipboardList size={20} style={{ color: 'var(--primary)' }} />
            <div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Orders</div>
              <div style={{ fontWeight: 500 }}>{batch.orders?.length || 0}</div>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <Pill size={20} style={{ color: 'var(--primary)' }} />
            <div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Doses</div>
              <div style={{ fontWeight: 500 }}>{dispensedCount} / {doseUnitsCount}</div>
            </div>
          </div>
        </div>
      </div>

      <div className="card" style={{ marginBottom: '1.5rem' }}>
        <div style={{ display: 'flex', borderBottom: '1px solid var(--border)' }}>
          {['overview', 'orders', 'doses', 'qc', 'release', 'logistics'].map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className="btn"
              style={{
                borderRadius: 0,
                borderBottom: activeTab === tab ? '2px solid var(--primary)' : '2px solid transparent',
                fontWeight: activeTab === tab ? 600 : 400,
                padding: '0.75rem 1rem',
                background: 'transparent',
              }}
            >
              {tab.charAt(0).toUpperCase() + tab.slice(1)}
            </button>
          ))}
        </div>

        {activeTab === 'overview' && (
          <div style={{ padding: '1.5rem' }}>
            <h3 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '1.5rem' }}>Batch Journey</h3>
            <div style={{ display: 'flex', justifyContent: 'space-between', position: 'relative', marginBottom: '2rem' }}>
              <div style={{ position: 'absolute', top: '20px', left: '40px', right: '40px', height: '2px', backgroundColor: 'var(--border)', zIndex: 0 }} />
              {statusSteps.map((step, index) => {
                const status = getStepStatus(step, index);
                const StepIcon = step.icon;
                const eventForStep = events?.find((e: any) => step.includes?.includes(e.toStatus) || e.toStatus === step.key);
                
                return (
                  <div key={step.key} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', zIndex: 1, flex: 1 }}>
                    <div style={{
                      width: '40px',
                      height: '40px',
                      borderRadius: '50%',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      backgroundColor: status === 'completed' ? 'var(--success)' : status === 'current' ? 'var(--primary)' : status === 'skipped' ? 'var(--danger-light, #fecaca)' : 'var(--bg-tertiary)',
                      color: status === 'completed' || status === 'current' ? 'white' : status === 'skipped' ? 'var(--danger)' : 'var(--text-muted)',
                      border: status === 'current' ? '3px solid rgba(37, 99, 235, 0.3)' : 'none',
                      transition: 'all 0.2s',
                    }}>
                      {status === 'completed' ? <CheckCircle size={20} /> : status === 'skipped' ? <Lock size={16} /> : <StepIcon size={20} />}
                    </div>
                    <div style={{ marginTop: '0.5rem', fontSize: '0.75rem', fontWeight: status === 'current' ? 600 : 400, color: status === 'pending' || status === 'skipped' ? 'var(--text-muted)' : 'var(--text-primary)', textAlign: 'center' }}>
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

            {nextStep && !isTerminalStatus && (
              <div className="card" style={{ marginBottom: '1.5rem', padding: '1.25rem', borderLeft: `4px solid ${isExceptionStatus ? 'var(--danger)' : 'var(--primary)'}`, background: 'var(--bg-secondary)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
                  <div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '0.25rem' }}>
                      {isExceptionStatus ? 'BATCH BLOCKED' : 'WHAT HAPPENS NEXT'}
                    </div>
                    <div style={{ fontSize: '1.125rem', fontWeight: 600, marginBottom: '0.25rem' }}>{nextStep.action}</div>
                    <div style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>{nextStep.description}</div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.5rem' }}>
                      <User size={12} style={{ display: 'inline', marginRight: '0.25rem' }} />
                      Responsible: <strong>{nextStep.role}</strong>
                    </div>
                  </div>
                  {nextStep.nextStatus && !isExceptionStatus && (
                    <button 
                      className="btn btn-primary"
                      onClick={() => transitionMutation.mutate({ status: nextStep.nextStatus! })}
                      disabled={transitionMutation.isPending}
                    >
                      <Play size={16} /> {nextStep.action}
                    </button>
                  )}
                </div>
              </div>
            )}

            <h4 style={{ fontSize: '0.875rem', fontWeight: 600, marginBottom: '1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              Timeline
              {events?.length > 5 && (
                <button className="btn btn-secondary btn-sm" onClick={() => setShowFullTimeline(!showFullTimeline)}>
                  {showFullTimeline ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                  {showFullTimeline ? 'Show Less' : `Show All (${events.length})`}
                </button>
              )}
            </h4>
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
                          {event.fromStatus ? `${event.fromStatus.replace(/_/g, ' ')} → ` : ''}
                          {event.toStatus?.replace(/_/g, ' ') || event.eventType.replace(/_/g, ' ')}
                        </span>
                        <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                          {safeFormat(event.createdAt, 'MMM dd, yyyy HH:mm')}
                        </span>
                      </div>
                      {event.actor && (
                        <div style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)' }}>
                          by {event.actor.firstName} {event.actor.lastName}
                          {event.actorRole && <span style={{ color: 'var(--text-muted)' }}> ({event.actorRole})</span>}
                        </div>
                      )}
                      {event.note && (
                        <div style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)', marginTop: '0.25rem', fontStyle: 'italic' }}>
                          "{event.note}"
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
        )}

        {activeTab === 'orders' && (
          <div style={{ padding: '1.5rem' }}>
            <h3 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '1rem' }}>Linked Orders</h3>
            {batch.orders?.length > 0 ? (
              <table className="table">
                <thead>
                  <tr>
                    <th>Order No</th>
                    <th>Customer</th>
                    <th>Activity</th>
                    <th>Delivery</th>
                    <th>Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {batch.orders.map((order: any) => (
                    <tr key={order.id}>
                      <td><strong>{order.orderNumber}</strong></td>
                      <td>{order.customer?.name}</td>
                      <td>{order.requestedActivity} {order.activityUnit}</td>
                      <td>{safeFormat(order.deliveryDate, 'MMM dd')}</td>
                      <td><span className="badge badge-info">{order.status}</span></td>
                      <td>
                        <Link to={`/orders/${order.id}/journey`} className="btn btn-secondary btn-sm">
                          View Journey
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <div style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '2rem' }}>
                No orders linked to this batch
              </div>
            )}
          </div>
        )}

        {activeTab === 'doses' && (
          <div style={{ padding: '1.5rem' }}>
            <h3 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '1rem' }}>Dose Units</h3>
            {batch.doseUnits?.length > 0 ? (
              <table className="table">
                <thead>
                  <tr>
                    <th>Dose ID</th>
                    <th>Activity</th>
                    <th>Status</th>
                    <th>Patient Ref</th>
                    <th>Dispensed At</th>
                  </tr>
                </thead>
                <tbody>
                  {batch.doseUnits.map((dose: any) => (
                    <tr key={dose.id}>
                      <td><strong>{dose.doseNumber || dose.id.slice(0, 8)}</strong></td>
                      <td>{dose.activity} {dose.activityUnit}</td>
                      <td><span className={`badge badge-${dose.status === 'DISPENSED' ? 'success' : 'default'}`}>{dose.status}</span></td>
                      <td>{dose.patientReference || '-'}</td>
                      <td>{dose.dispensedAt ? safeFormat(dose.dispensedAt, 'MMM dd HH:mm') : '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <div style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '2rem' }}>
                <Pill size={32} style={{ marginBottom: '0.5rem', opacity: 0.5 }} />
                <p>No dose units created yet</p>
                {batch.status === 'RELEASED' && (
                  <Link to="/dispensing" className="btn btn-primary">
                    Create Dose Units
                  </Link>
                )}
              </div>
            )}
          </div>
        )}

        {activeTab === 'qc' && (
          <div style={{ padding: '1.5rem' }}>
            <h3 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '1rem' }}>QC Results</h3>
            {batch.qcResults?.length > 0 ? (
              <table className="table">
                <thead>
                  <tr>
                    <th>Test</th>
                    <th>Result</th>
                    <th>Status</th>
                    <th>Tested By</th>
                    <th>Tested At</th>
                  </tr>
                </thead>
                <tbody>
                  {batch.qcResults.map((qc: any) => (
                    <tr key={qc.id}>
                      <td><strong>{qc.template?.testName}</strong></td>
                      <td>{qc.numericResult || qc.textResult || '-'}</td>
                      <td>
                        <span className={`badge badge-${qc.passed ? 'success' : qc.passed === false ? 'danger' : 'default'}`}>
                          {qc.passed ? 'PASSED' : qc.passed === false ? 'FAILED' : 'PENDING'}
                        </span>
                      </td>
                      <td>{qc.testedBy ? `${qc.testedBy.firstName} ${qc.testedBy.lastName}` : '-'}</td>
                      <td>{qc.testedAt ? safeFormat(qc.testedAt, 'MMM dd HH:mm') : '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <div style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '2rem' }}>
                <Beaker size={32} style={{ marginBottom: '0.5rem', opacity: 0.5 }} />
                <p>No QC results yet</p>
                {['QC_PENDING', 'QC_IN_PROGRESS'].includes(batch.status) && (
                  <Link to="/qc" className="btn btn-primary">
                    Enter QC Results
                  </Link>
                )}
              </div>
            )}
          </div>
        )}

        {activeTab === 'release' && (
          <div style={{ padding: '1.5rem' }}>
            <h3 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '1rem' }}>QP Release</h3>
            {batch.batchReleases?.length > 0 ? (
              <div>
                {batch.batchReleases.map((release: any) => (
                  <div key={release.id} className="card" style={{ padding: '1rem', marginBottom: '1rem', borderLeft: '4px solid var(--success)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div>
                        <div style={{ fontWeight: 600 }}>Released by {release.releasedBy?.firstName} {release.releasedBy?.lastName}</div>
                        <div style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>
                          {safeFormat(release.signatureTimestamp, 'MMM dd, yyyy HH:mm:ss')}
                        </div>
                        {release.reason && (
                          <div style={{ fontSize: '0.875rem', marginTop: '0.5rem' }}>{release.reason}</div>
                        )}
                      </div>
                      <div>
                        <span className="badge badge-success">{release.releaseType}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '2rem' }}>
                <Shield size={32} style={{ marginBottom: '0.5rem', opacity: 0.5 }} />
                <p>Batch not yet released</p>
                {batch.status === 'QP_REVIEW' && (
                  <Link to="/release" className="btn btn-primary">
                    Go to QP Release
                  </Link>
                )}
              </div>
            )}
          </div>
        )}

        {activeTab === 'logistics' && (
          <div style={{ padding: '1.5rem' }}>
            <h3 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '1rem' }}>Logistics & Shipment</h3>
            {batch.orders?.some((o: any) => o.shipmentId) ? (
              <div>
                {batch.orders.filter((o: any) => o.shipmentId).map((order: any) => (
                  <div key={order.id} className="card" style={{ padding: '1rem', marginBottom: '1rem' }}>
                    <div style={{ fontWeight: 600 }}>Order: {order.orderNumber}</div>
                    <div style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>
                      Shipment ID: {order.shipmentId}
                    </div>
                    <Link to="/shipments" className="btn btn-secondary btn-sm" style={{ marginTop: '0.5rem' }}>
                      View Shipment
                    </Link>
                  </div>
                ))}
              </div>
            ) : (
              <div style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '2rem' }}>
                <Truck size={32} style={{ marginBottom: '0.5rem', opacity: 0.5 }} />
                <p>No shipments created yet</p>
                {['DISPENSED', 'PACKED'].includes(batch.status) && (
                  <Link to="/shipments" className="btn btn-primary">
                    Create Shipment
                  </Link>
                )}
              </div>
            )}
          </div>
        )}

        {id && (
          <AttachmentPanel entityType="BATCH" entityId={id} title="Batch Attachments" />
        )}
      </div>
    </div>
  );
}
