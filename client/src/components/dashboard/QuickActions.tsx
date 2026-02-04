import { useNavigate } from 'react-router-dom';
import { 
  Plus, 
  Play, 
  FlaskConical, 
  Shield, 
  Truck, 
  Package, 
  FileText, 
  ClipboardCheck,
  ArrowRight,
} from 'lucide-react';

interface QuickAction {
  id: string;
  label: string;
  description: string;
  icon: React.ReactNode;
  color: string;
  bgColor: string;
  onClick: () => void;
}

interface QuickActionsProps {
  permissions?: string[];
}

export function QuickActions({ permissions = [] }: QuickActionsProps) {
  const navigate = useNavigate();

  const allActions: QuickAction[] = [
    {
      id: 'create-order',
      label: 'New Order',
      description: 'Create customer order',
      icon: <Plus size={20} />,
      color: '#2563eb',
      bgColor: 'rgba(37, 99, 235, 0.1)',
      onClick: () => navigate('/orders?action=create'),
    },
    {
      id: 'start-batch',
      label: 'Start Batch',
      description: 'Begin production',
      icon: <Play size={20} />,
      color: '#059669',
      bgColor: 'rgba(5, 150, 105, 0.1)',
      onClick: () => navigate('/batches?status=PLANNED'),
    },
    {
      id: 'record-qc',
      label: 'Record QC',
      description: 'Enter QC results',
      icon: <FlaskConical size={20} />,
      color: '#d97706',
      bgColor: 'rgba(217, 119, 6, 0.1)',
      onClick: () => navigate('/qc?status=QC_PENDING'),
    },
    {
      id: 'qp-release',
      label: 'QP Release',
      description: 'Release batch',
      icon: <Shield size={20} />,
      color: '#7c3aed',
      bgColor: 'rgba(124, 58, 237, 0.1)',
      onClick: () => navigate('/release?status=QC_PASSED'),
    },
    {
      id: 'dispense',
      label: 'Dispense',
      description: 'Dispense doses',
      icon: <Package size={20} />,
      color: '#0891b2',
      bgColor: 'rgba(8, 145, 178, 0.1)',
      onClick: () => navigate('/dispensing?ready=true'),
    },
    {
      id: 'dispatch',
      label: 'Dispatch',
      description: 'Send shipment',
      icon: <Truck size={20} />,
      color: '#dc2626',
      bgColor: 'rgba(220, 38, 38, 0.1)',
      onClick: () => navigate('/shipments?status=ASSIGNED'),
    },
    {
      id: 'approve-po',
      label: 'Approve PO',
      description: 'Approve purchase',
      icon: <FileText size={20} />,
      color: '#ea580c',
      bgColor: 'rgba(234, 88, 12, 0.1)',
      onClick: () => navigate('/purchase-orders?status=PENDING_APPROVAL'),
    },
    {
      id: 'validate-order',
      label: 'Validate Order',
      description: 'Confirm order',
      icon: <ClipboardCheck size={20} />,
      color: '#0284c7',
      bgColor: 'rgba(2, 132, 199, 0.1)',
      onClick: () => navigate('/orders?status=SUBMITTED'),
    },
  ];

  return (
    <div className="card" style={{ padding: '1.25rem', marginBottom: '1.5rem' }}>
      <div style={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center',
        marginBottom: '1rem',
      }}>
        <h3 style={{ 
          fontSize: '0.875rem', 
          fontWeight: 600, 
          color: 'var(--text-secondary)',
          margin: 0,
        }}>
          Quick Actions
        </h3>
      </div>
      
      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', 
        gap: '0.75rem' 
      }}>
        {allActions.map(action => (
          <button
            key={action.id}
            onClick={action.onClick}
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              padding: '1rem',
              border: '1px solid var(--border)',
              borderRadius: '12px',
              background: 'var(--bg-primary)',
              cursor: 'pointer',
              transition: 'all 0.2s',
              gap: '0.5rem',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.borderColor = action.color;
              e.currentTarget.style.transform = 'translateY(-2px)';
              e.currentTarget.style.boxShadow = `0 4px 12px ${action.bgColor}`;
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = 'var(--border)';
              e.currentTarget.style.transform = 'translateY(0)';
              e.currentTarget.style.boxShadow = 'none';
            }}
          >
            <div style={{
              width: '40px',
              height: '40px',
              borderRadius: '10px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: action.bgColor,
              color: action.color,
            }}>
              {action.icon}
            </div>
            <span style={{ 
              fontSize: '0.8125rem', 
              fontWeight: 600, 
              color: 'var(--text-primary)',
            }}>
              {action.label}
            </span>
            <span style={{ 
              fontSize: '0.6875rem', 
              color: 'var(--text-muted)',
            }}>
              {action.description}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}
