import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Play, Package, Truck, CreditCard, CheckCircle, Archive, RefreshCw, Zap } from 'lucide-react';
import api from '../lib/api';

interface DemoStatus {
  demoMode: string;
  mainJourney: {
    order: { number: string; status: string } | null;
    shipment: { number: string; status: string } | null;
    invoice: { number: string; status: string; paidAmount: number; remainingAmount: number } | null;
  };
  availableActions: string[];
}

export default function AdminDemo() {
  const queryClient = useQueryClient();
  const [actionResult, setActionResult] = useState<{ success: boolean; message: string } | null>(null);

  const { data: status, isLoading, refetch } = useQuery<DemoStatus>({
    queryKey: ['demo-status'],
    queryFn: async () => {
      const { data } = await api.get('/admin/demo/status');
      return data;
    },
  });

  const actionMutation = useMutation({
    mutationFn: async ({ action, payload }: { action: string; payload?: any }) => {
      const { data } = await api.post(`/admin/demo/actions/${action}`, payload || {});
      return data;
    },
    onSuccess: (data) => {
      setActionResult({ success: true, message: data.message });
      queryClient.invalidateQueries({ queryKey: ['demo-status'] });
      setTimeout(() => setActionResult(null), 5000);
    },
    onError: (error: any) => {
      setActionResult({ success: false, message: error.response?.data?.error || 'Action failed' });
      setTimeout(() => setActionResult(null), 5000);
    },
  });

  const seedMutation = useMutation({
    mutationFn: async (mode: string) => {
      const { data } = await api.post('/admin/demo/seed', { mode });
      return data;
    },
    onSuccess: (data) => {
      setActionResult({ success: true, message: data.message });
      queryClient.invalidateQueries({ queryKey: ['demo-status'] });
    },
    onError: (error: any) => {
      setActionResult({ success: false, message: error.response?.data?.error || 'Seed failed' });
    },
  });

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      DELIVERED: '#22c55e',
      PAID: '#22c55e',
      CLOSED_ARCHIVED: '#6b7280',
      IN_TRANSIT: '#3b82f6',
      ISSUED_POSTED: '#f59e0b',
      PARTIALLY_PAID: '#f59e0b',
      DISPATCHED: '#8b5cf6',
    };
    return colors[status] || '#6b7280';
  };

  if (isLoading) {
    return (
      <div className="page-container">
        <div className="card" style={{ textAlign: 'center', padding: '3rem' }}>
          <RefreshCw size={24} className="spin" style={{ margin: '0 auto 1rem' }} />
          <p>Loading demo status...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="page-container">
      <div className="page-header">
        <div>
          <h1 className="page-title">Demo Actions Panel</h1>
          <p className="page-subtitle">Quick actions for live demonstrations</p>
        </div>
        <button className="btn btn-secondary" onClick={() => refetch()}>
          <RefreshCw size={16} />
          Refresh Status
        </button>
      </div>

      {actionResult && (
        <div className={`alert ${actionResult.success ? 'alert-success' : 'alert-error'}`} style={{ marginBottom: '1.5rem' }}>
          {actionResult.message}
        </div>
      )}

      <div className="grid" style={{ gridTemplateColumns: '1fr 1fr', gap: '1.5rem', marginBottom: '2rem' }}>
        <div className="card">
          <h3 style={{ marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Zap size={20} style={{ color: '#f59e0b' }} />
            Demo Mode
          </h3>
          <div style={{ 
            padding: '1rem', 
            background: status?.demoMode === 'LIVE_DEMO' ? '#fef3c7' : '#d1fae5',
            borderRadius: '0.5rem',
            textAlign: 'center',
            fontWeight: 600,
            fontSize: '1.25rem',
          }}>
            {status?.demoMode || 'Unknown'}
          </div>
          <div style={{ marginTop: '1rem', display: 'flex', gap: '0.5rem' }}>
            <button 
              className="btn btn-primary" 
              style={{ flex: 1 }}
              onClick={() => seedMutation.mutate('LIVE_DEMO')}
              disabled={seedMutation.isPending}
            >
              Seed Live Demo
            </button>
            <button 
              className="btn btn-secondary" 
              style={{ flex: 1 }}
              onClick={() => seedMutation.mutate('FULLY_COMPLETED')}
              disabled={seedMutation.isPending}
            >
              Seed Completed
            </button>
          </div>
        </div>

        <div className="card">
          <h3 style={{ marginBottom: '1rem' }}>Current Journey Status</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span>Order {status?.mainJourney.order?.number || '-'}</span>
              <span className="badge" style={{ 
                background: getStatusColor(status?.mainJourney.order?.status || ''),
                color: 'white',
              }}>
                {status?.mainJourney.order?.status || 'N/A'}
              </span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span>Shipment {status?.mainJourney.shipment?.number || '-'}</span>
              <span className="badge" style={{ 
                background: getStatusColor(status?.mainJourney.shipment?.status || ''),
                color: 'white',
              }}>
                {status?.mainJourney.shipment?.status || 'N/A'}
              </span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span>Invoice {status?.mainJourney.invoice?.number || '-'}</span>
              <span className="badge" style={{ 
                background: getStatusColor(status?.mainJourney.invoice?.status || ''),
                color: 'white',
              }}>
                {status?.mainJourney.invoice?.status || 'N/A'}
              </span>
            </div>
            {status?.mainJourney.invoice && (
              <div style={{ fontSize: '0.875rem', color: '#6b7280', marginTop: '0.5rem' }}>
                Paid: SAR {status.mainJourney.invoice.paidAmount.toLocaleString()} / 
                Remaining: SAR {status.mainJourney.invoice.remainingAmount.toLocaleString()}
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="card">
        <h3 style={{ marginBottom: '1.5rem' }}>Quick Demo Actions</h3>
        <div className="grid" style={{ gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem' }}>
          <button
            className="btn"
            style={{ 
              padding: '1.5rem', 
              display: 'flex', 
              flexDirection: 'column', 
              alignItems: 'center', 
              gap: '0.75rem',
              background: status?.availableActions.includes('mark-arrived') ? '#3b82f6' : '#e5e7eb',
              color: status?.availableActions.includes('mark-arrived') ? 'white' : '#9ca3af',
              cursor: status?.availableActions.includes('mark-arrived') ? 'pointer' : 'not-allowed',
            }}
            disabled={!status?.availableActions.includes('mark-arrived') || actionMutation.isPending}
            onClick={() => actionMutation.mutate({ action: 'mark-arrived' })}
          >
            <Package size={32} />
            <span style={{ fontWeight: 600 }}>Mark Arrived</span>
            <span style={{ fontSize: '0.75rem', opacity: 0.8 }}>Shipment arrives at destination</span>
          </button>

          <button
            className="btn"
            style={{ 
              padding: '1.5rem', 
              display: 'flex', 
              flexDirection: 'column', 
              alignItems: 'center', 
              gap: '0.75rem',
              background: status?.availableActions.includes('mark-delivered') ? '#22c55e' : '#e5e7eb',
              color: status?.availableActions.includes('mark-delivered') ? 'white' : '#9ca3af',
              cursor: status?.availableActions.includes('mark-delivered') ? 'pointer' : 'not-allowed',
            }}
            disabled={!status?.availableActions.includes('mark-delivered') || actionMutation.isPending}
            onClick={() => actionMutation.mutate({ action: 'mark-delivered' })}
          >
            <Truck size={32} />
            <span style={{ fontWeight: 600 }}>Mark Delivered</span>
            <span style={{ fontSize: '0.75rem', opacity: 0.8 }}>Complete delivery with POD</span>
          </button>

          <button
            className="btn"
            style={{ 
              padding: '1.5rem', 
              display: 'flex', 
              flexDirection: 'column', 
              alignItems: 'center', 
              gap: '0.75rem',
              background: status?.availableActions.includes('create-payment-request') ? '#f59e0b' : '#e5e7eb',
              color: status?.availableActions.includes('create-payment-request') ? 'white' : '#9ca3af',
              cursor: status?.availableActions.includes('create-payment-request') ? 'pointer' : 'not-allowed',
            }}
            disabled={!status?.availableActions.includes('create-payment-request') || actionMutation.isPending}
            onClick={() => actionMutation.mutate({ action: 'create-payment-request', payload: { isPartial: true } })}
          >
            <CreditCard size={32} />
            <span style={{ fontWeight: 600 }}>Submit Payment</span>
            <span style={{ fontSize: '0.75rem', opacity: 0.8 }}>Create partial payment request</span>
          </button>

          <button
            className="btn"
            style={{ 
              padding: '1.5rem', 
              display: 'flex', 
              flexDirection: 'column', 
              alignItems: 'center', 
              gap: '0.75rem',
              background: status?.availableActions.includes('confirm-payment') ? '#8b5cf6' : '#e5e7eb',
              color: status?.availableActions.includes('confirm-payment') ? 'white' : '#9ca3af',
              cursor: status?.availableActions.includes('confirm-payment') ? 'pointer' : 'not-allowed',
            }}
            disabled={!status?.availableActions.includes('confirm-payment') || actionMutation.isPending}
            onClick={() => actionMutation.mutate({ action: 'confirm-payment' })}
          >
            <CheckCircle size={32} />
            <span style={{ fontWeight: 600 }}>Confirm Payment</span>
            <span style={{ fontSize: '0.75rem', opacity: 0.8 }}>Finance confirms & generates receipt</span>
          </button>

          <button
            className="btn"
            style={{ 
              padding: '1.5rem', 
              display: 'flex', 
              flexDirection: 'column', 
              alignItems: 'center', 
              gap: '0.75rem',
              background: status?.availableActions.includes('close-invoice') ? '#6b7280' : '#e5e7eb',
              color: status?.availableActions.includes('close-invoice') ? 'white' : '#9ca3af',
              cursor: status?.availableActions.includes('close-invoice') ? 'pointer' : 'not-allowed',
            }}
            disabled={!status?.availableActions.includes('close-invoice') || actionMutation.isPending}
            onClick={() => actionMutation.mutate({ action: 'close-invoice' })}
          >
            <Archive size={32} />
            <span style={{ fontWeight: 600 }}>Close Invoice</span>
            <span style={{ fontSize: '0.75rem', opacity: 0.8 }}>Archive paid invoice</span>
          </button>

        </div>
      </div>

      <div className="card" style={{ marginTop: '1.5rem' }}>
        <h3 style={{ marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Truck size={20} style={{ color: '#3b82f6' }} />
          Logistics Demo Data
        </h3>
        <p style={{ marginBottom: '1rem', color: '#6b7280', fontSize: '0.875rem' }}>
          Create shipments ready for driver assignment to test the logistics workflow.
        </p>
        <button
          className="btn btn-primary"
          style={{ 
            padding: '1rem 2rem', 
            display: 'flex', 
            alignItems: 'center', 
            gap: '0.75rem',
          }}
          disabled={actionMutation.isPending}
          onClick={() => actionMutation.mutate({ action: 'create-logistics-shipments' })}
        >
          <Package size={20} />
          <span style={{ fontWeight: 600 }}>Create Shipments for Driver Assignment</span>
        </button>
        <div style={{ marginTop: '1rem', padding: '1rem', background: '#eff6ff', borderRadius: '0.5rem', fontSize: '0.875rem' }}>
          <strong>This will create:</strong>
          <ul style={{ marginTop: '0.5rem', paddingLeft: '1.25rem', lineHeight: 1.8 }}>
            <li>3 shipments with PACKED status (ready for driver assignment)</li>
            <li>Each with an associated order and realistic delivery address</li>
            <li>One marked as URGENT priority</li>
          </ul>
          <div style={{ marginTop: '0.75rem', color: '#1d4ed8' }}>
            After creation, go to <strong>Logistics → Shipments</strong> to assign drivers.
          </div>
        </div>
      </div>

      <div className="card" style={{ marginTop: '1.5rem' }}>
        <h3 style={{ marginBottom: '1rem' }}>Demo Credentials</h3>
        <div className="grid" style={{ gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
          <div>
            <h4 style={{ marginBottom: '0.75rem', color: '#374151' }}>Internal Users</h4>
            <div style={{ fontSize: '0.875rem', lineHeight: '1.75' }}>
              <div><strong>admin@demo.com</strong> - Admin</div>
              <div><strong>orderdesk@demo.com</strong> - Order Desk</div>
              <div><strong>planner@demo.com</strong> - Planner</div>
              <div><strong>qc@demo.com</strong> - QC Analyst</div>
              <div><strong>qp@demo.com</strong> - QP</div>
              <div><strong>logistics@demo.com</strong> - Logistics</div>
              <div><strong>finance@demo.com</strong> - Finance</div>
              <div><strong>driver1@demo.com</strong> - Driver</div>
            </div>
          </div>
          <div>
            <h4 style={{ marginBottom: '0.75rem', color: '#374151' }}>Customer Portal</h4>
            <div style={{ fontSize: '0.875rem', lineHeight: '1.75' }}>
              <div><strong>portal1@hospitaldemo.com</strong> - Al Noor Hospital</div>
              <div><strong>portal2@hospitaldemo.com</strong> - Al Noor Hospital (Billing)</div>
            </div>
            <div style={{ marginTop: '1rem', padding: '0.75rem', background: '#fef3c7', borderRadius: '0.5rem', fontSize: '0.875rem' }}>
              <strong>Password for all:</strong> demo123
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
