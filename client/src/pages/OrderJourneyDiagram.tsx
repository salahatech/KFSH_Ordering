import { useState } from 'react';
import { 
  ShoppingCart, ClipboardCheck, Calendar, Factory, FlaskConical, 
  Syringe, Truck, Receipt, CheckCircle2, ChevronDown, ChevronRight,
  Clock, Users, FileText, Package, MapPin, CreditCard, BarChart3
} from 'lucide-react';

interface JourneyStep {
  id: string;
  title: string;
  description: string;
  icon: any;
  color: string;
  status?: string;
  substeps?: { title: string; description?: string }[];
}

const journeySteps: JourneyStep[] = [
  {
    id: 'creation',
    title: 'Order Creation',
    description: 'Customer places order through portal or internal order desk',
    icon: ShoppingCart,
    color: '#3b82f6',
    status: 'DRAFT',
    substeps: [
      { title: 'Customer Portal', description: 'Book capacity and submit order request' },
      { title: 'Order Desk', description: 'Create order manually for walk-in customers' },
      { title: 'Capacity Reservation', description: 'Reserve delivery window slot' },
    ]
  },
  {
    id: 'approval',
    title: 'Order Approval',
    description: 'Multi-level approval workflow for order validation',
    icon: ClipboardCheck,
    color: '#8b5cf6',
    status: 'PENDING_APPROVAL → APPROVED',
    substeps: [
      { title: 'Order Desk Review', description: 'Validate order details and availability' },
      { title: 'Manager Approval', description: 'Approve high-value or special orders' },
      { title: 'Customer Notification', description: 'Notify customer of approval status' },
    ]
  },
  {
    id: 'planning',
    title: 'Production Planning',
    description: 'Schedule production based on delivery time and product half-life',
    icon: Calendar,
    color: '#06b6d4',
    status: 'SCHEDULED',
    substeps: [
      { title: 'Backward Scheduling', description: 'Calculate production start based on decay' },
      { title: 'Batch Creation', description: 'Create batch with recipe/BOM assignment' },
      { title: 'Equipment Allocation', description: 'Reserve equipment and resources' },
      { title: 'eBR Generation', description: 'Generate electronic batch record' },
    ]
  },
  {
    id: 'manufacturing',
    title: 'Manufacturing',
    description: 'Execute production following GMP-compliant batch record',
    icon: Factory,
    color: '#f59e0b',
    status: 'IN_PRODUCTION',
    substeps: [
      { title: 'Material Consumption', description: 'Consume raw materials from inventory' },
      { title: 'Step Execution', description: 'Follow eBR steps with electronic signatures' },
      { title: 'Deviation Recording', description: 'Document any process deviations' },
      { title: 'Production Complete', description: 'Mark batch ready for QC' },
    ]
  },
  {
    id: 'quality',
    title: 'Quality Control',
    description: 'Test product quality and obtain QP release',
    icon: FlaskConical,
    color: '#10b981',
    status: 'QC_PENDING → QC_PASSED → RELEASED',
    substeps: [
      { title: 'QC Testing', description: 'Run product-specific quality tests' },
      { title: 'Auto-Evaluation', description: 'Automatic pass/fail determination' },
      { title: 'OOS Investigation', description: 'Investigate out-of-spec results' },
      { title: 'QP Release', description: 'Qualified Person batch release' },
    ]
  },
  {
    id: 'dispensing',
    title: 'Dose Dispensing',
    description: 'Dispense individual doses with decay-corrected activity',
    icon: Syringe,
    color: '#ec4899',
    status: 'DISPENSED',
    substeps: [
      { title: 'Activity Calculation', description: 'Calculate decay-corrected activity' },
      { title: 'Dose Dispensing', description: 'Dispense patient-specific doses' },
      { title: 'Label Printing', description: 'Print dose labels with QR codes' },
      { title: 'Packaging', description: 'Package doses for delivery' },
    ]
  },
  {
    id: 'logistics',
    title: 'Logistics & Delivery',
    description: 'Ship doses to customer with real-time tracking',
    icon: Truck,
    color: '#6366f1',
    status: 'SHIPPED → DELIVERED',
    substeps: [
      { title: 'Shipment Creation', description: 'Create shipment with assigned driver' },
      { title: 'Driver Pickup', description: 'Driver collects package from facility' },
      { title: 'In Transit', description: 'Real-time GPS tracking' },
      { title: 'Delivery Confirmation', description: 'Customer signature and POD' },
    ]
  },
  {
    id: 'invoicing',
    title: 'Invoicing & Payment',
    description: 'Generate ZATCA-compliant invoice and process payment',
    icon: Receipt,
    color: '#f97316',
    status: 'INVOICED → PAID',
    substeps: [
      { title: 'Invoice Generation', description: 'Apply contract pricing and generate invoice' },
      { title: 'ZATCA QR Code', description: 'Generate compliant QR code' },
      { title: 'Payment Submission', description: 'Customer submits payment with proof' },
      { title: 'Payment Confirmation', description: 'Finance confirms and generates receipt' },
    ]
  },
  {
    id: 'complete',
    title: 'Order Complete',
    description: 'Full audit trail and analytics updated',
    icon: CheckCircle2,
    color: '#22c55e',
    status: 'COMPLETED',
    substeps: [
      { title: 'Audit Trail', description: 'Complete history of all actions' },
      { title: 'Reports Update', description: 'Analytics and KPIs updated' },
      { title: 'Customer Feedback', description: 'Optional satisfaction survey' },
    ]
  },
];

export default function OrderJourneyDiagram() {
  const [expandedSteps, setExpandedSteps] = useState<string[]>(['creation']);

  const toggleStep = (id: string) => {
    setExpandedSteps(prev => 
      prev.includes(id) ? prev.filter(s => s !== id) : [...prev, id]
    );
  };

  const expandAll = () => setExpandedSteps(journeySteps.map(s => s.id));
  const collapseAll = () => setExpandedSteps([]);

  return (
    <div className="page-container">
      <div className="page-header" style={{ marginBottom: '1.5rem' }}>
        <div>
          <h1 className="page-title">Order Journey</h1>
          <p style={{ color: 'var(--text-muted)', margin: 0 }}>
            Complete lifecycle of an order from creation to completion
          </p>
        </div>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <button className="btn btn-outline btn-sm" onClick={expandAll}>
            Expand All
          </button>
          <button className="btn btn-outline btn-sm" onClick={collapseAll}>
            Collapse All
          </button>
        </div>
      </div>

      <div className="card" style={{ padding: '2rem' }}>
        <div style={{ position: 'relative' }}>
          {journeySteps.map((step, index) => {
            const isExpanded = expandedSteps.includes(step.id);
            const Icon = step.icon;
            const isLast = index === journeySteps.length - 1;

            return (
              <div key={step.id} style={{ position: 'relative' }}>
                {!isLast && (
                  <div style={{
                    position: 'absolute',
                    left: '24px',
                    top: '48px',
                    bottom: isExpanded ? '0' : '-24px',
                    width: '2px',
                    backgroundColor: 'var(--border)',
                    zIndex: 0
                  }} />
                )}

                <div 
                  onClick={() => toggleStep(step.id)}
                  style={{ 
                    display: 'flex', 
                    alignItems: 'flex-start', 
                    gap: '1rem',
                    cursor: 'pointer',
                    padding: '0.75rem',
                    borderRadius: '0.5rem',
                    transition: 'background-color 0.2s',
                    position: 'relative',
                    zIndex: 1
                  }}
                  className="hover-bg"
                >
                  <div style={{
                    width: '48px',
                    height: '48px',
                    borderRadius: '12px',
                    backgroundColor: step.color,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0
                  }}>
                    <Icon size={24} color="white" />
                  </div>

                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <h3 style={{ margin: 0, fontSize: '1.125rem', fontWeight: 600 }}>
                        {index + 1}. {step.title}
                      </h3>
                      {isExpanded ? <ChevronDown size={18} /> : <ChevronRight size={18} />}
                    </div>
                    <p style={{ margin: '0.25rem 0 0', color: 'var(--text-muted)', fontSize: '0.875rem' }}>
                      {step.description}
                    </p>
                    {step.status && (
                      <div style={{ 
                        marginTop: '0.5rem',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '0.25rem',
                        padding: '0.25rem 0.5rem',
                        backgroundColor: `${step.color}15`,
                        borderRadius: '0.25rem',
                        fontSize: '0.75rem',
                        fontFamily: 'monospace',
                        color: step.color
                      }}>
                        <Clock size={12} />
                        {step.status}
                      </div>
                    )}
                  </div>
                </div>

                {isExpanded && step.substeps && (
                  <div style={{ 
                    marginLeft: '72px', 
                    marginTop: '0.5rem',
                    marginBottom: '1.5rem',
                    paddingLeft: '1rem',
                    borderLeft: `2px solid ${step.color}40`
                  }}>
                    {step.substeps.map((substep, subIndex) => (
                      <div 
                        key={subIndex}
                        style={{
                          display: 'flex',
                          alignItems: 'flex-start',
                          gap: '0.75rem',
                          padding: '0.5rem 0'
                        }}
                      >
                        <div style={{
                          width: '24px',
                          height: '24px',
                          borderRadius: '50%',
                          backgroundColor: `${step.color}20`,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: '0.75rem',
                          fontWeight: 600,
                          color: step.color,
                          flexShrink: 0
                        }}>
                          {String.fromCharCode(97 + subIndex)}
                        </div>
                        <div>
                          <div style={{ fontWeight: 500, fontSize: '0.875rem' }}>
                            {substep.title}
                          </div>
                          {substep.description && (
                            <div style={{ fontSize: '0.8125rem', color: 'var(--text-muted)' }}>
                              {substep.description}
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {!isLast && !isExpanded && <div style={{ height: '1rem' }} />}
              </div>
            );
          })}
        </div>

        <div style={{ 
          marginTop: '2rem', 
          padding: '1.5rem', 
          backgroundColor: 'var(--background-secondary)', 
          borderRadius: '0.75rem' 
        }}>
          <h4 style={{ margin: '0 0 1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <BarChart3 size={20} />
            Status Flow Summary
          </h4>
          <div style={{ 
            display: 'flex', 
            flexWrap: 'wrap', 
            gap: '0.5rem', 
            alignItems: 'center',
            fontSize: '0.8125rem',
            fontFamily: 'monospace'
          }}>
            {[
              'DRAFT', 'PENDING_APPROVAL', 'APPROVED', 'SCHEDULED', 'IN_PRODUCTION',
              'QC_PENDING', 'QC_PASSED', 'RELEASED', 'DISPENSED', 'SHIPPED',
              'DELIVERED', 'INVOICED', 'PAID', 'COMPLETED'
            ].map((status, index, arr) => (
              <span key={status} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <span style={{
                  padding: '0.25rem 0.5rem',
                  backgroundColor: 'var(--background)',
                  borderRadius: '0.25rem',
                  border: '1px solid var(--border)'
                }}>
                  {status}
                </span>
                {index < arr.length - 1 && <span style={{ color: 'var(--text-muted)' }}>→</span>}
              </span>
            ))}
          </div>
        </div>

        <div style={{ 
          marginTop: '1.5rem', 
          display: 'grid', 
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', 
          gap: '1rem' 
        }}>
          <div style={{ 
            padding: '1rem', 
            backgroundColor: 'rgba(59, 130, 246, 0.1)', 
            borderRadius: '0.5rem',
            border: '1px solid rgba(59, 130, 246, 0.2)'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
              <Users size={18} color="#3b82f6" />
              <span style={{ fontWeight: 600, color: '#3b82f6' }}>Key Roles</span>
            </div>
            <div style={{ fontSize: '0.8125rem', color: 'var(--text-muted)' }}>
              Customer, Order Desk, Planner, Production, QC, QP, Logistics, Driver, Finance
            </div>
          </div>

          <div style={{ 
            padding: '1rem', 
            backgroundColor: 'rgba(16, 185, 129, 0.1)', 
            borderRadius: '0.5rem',
            border: '1px solid rgba(16, 185, 129, 0.2)'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
              <FileText size={18} color="#10b981" />
              <span style={{ fontWeight: 600, color: '#10b981' }}>Documents</span>
            </div>
            <div style={{ fontSize: '0.8125rem', color: 'var(--text-muted)' }}>
              Order Form, eBR, QC Report, Release Certificate, Invoice, Receipt
            </div>
          </div>

          <div style={{ 
            padding: '1rem', 
            backgroundColor: 'rgba(245, 158, 11, 0.1)', 
            borderRadius: '0.5rem',
            border: '1px solid rgba(245, 158, 11, 0.2)'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
              <Clock size={18} color="#f59e0b" />
              <span style={{ fontWeight: 600, color: '#f59e0b' }}>Time-Critical</span>
            </div>
            <div style={{ fontSize: '0.8125rem', color: 'var(--text-muted)' }}>
              Radioactive decay requires precise scheduling and delivery timing
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
