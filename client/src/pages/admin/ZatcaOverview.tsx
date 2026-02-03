import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import api from '../../lib/api';
import { PageHeader, StatusBadge } from '../../components/shared';
import { 
  FileCheck, Settings, Activity, AlertTriangle, CheckCircle, 
  XCircle, Clock, Play, RefreshCw, Shield 
} from 'lucide-react';

export default function ZatcaOverview() {
  const navigate = useNavigate();

  const { data: status, isLoading, refetch } = useQuery({
    queryKey: ['zatca-status'],
    queryFn: async () => {
      const { data } = await api.get('/zatca/status');
      return data;
    },
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'ACCEPTED':
      case 'CLEARED':
      case 'REPORTED':
        return 'success';
      case 'PENDING':
        return 'warning';
      case 'REJECTED':
      case 'FAILED':
        return 'danger';
      default:
        return 'default';
    }
  };

  return (
    <div>
      <PageHeader
        title="ZATCA Integration"
        subtitle="Fatoora e-invoice integration status and management"
        actions={
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <button className="btn btn-secondary" onClick={() => refetch()}>
              <RefreshCw size={16} />
              Refresh
            </button>
            <button className="btn btn-secondary" onClick={() => navigate('/admin/zatca/config')}>
              <Settings size={16} />
              Configuration
            </button>
            <button className="btn btn-primary" onClick={() => navigate('/admin/zatca/onboarding')}>
              <Shield size={16} />
              Onboarding
            </button>
          </div>
        }
      />

      {isLoading ? (
        <div className="card" style={{ padding: '3rem', textAlign: 'center' }}>
          Loading ZATCA status...
        </div>
      ) : (
        <>
          <div className="grid grid-4" style={{ marginBottom: '1.5rem' }}>
            <div className="card stat-card">
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                <Activity size={20} style={{ color: 'var(--primary)' }} />
                <span className="stat-label">Total Submissions</span>
              </div>
              <div className="stat-value">{status?.stats?.total || 0}</div>
            </div>
            <div className="card stat-card">
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                <CheckCircle size={20} style={{ color: 'var(--success)' }} />
                <span className="stat-label">Accepted</span>
              </div>
              <div className="stat-value" style={{ color: 'var(--success)' }}>
                {status?.stats?.accepted || 0}
              </div>
            </div>
            <div className="card stat-card">
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                <Clock size={20} style={{ color: 'var(--warning)' }} />
                <span className="stat-label">Pending</span>
              </div>
              <div className="stat-value" style={{ color: 'var(--warning)' }}>
                {status?.stats?.pending || 0}
              </div>
            </div>
            <div className="card stat-card">
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                <XCircle size={20} style={{ color: 'var(--danger)' }} />
                <span className="stat-label">Rejected/Failed</span>
              </div>
              <div className="stat-value" style={{ color: 'var(--danger)' }}>
                {(status?.stats?.rejected || 0) + (status?.stats?.failed || 0)}
              </div>
            </div>
          </div>

          <div className="grid grid-2" style={{ gap: '1.5rem', marginBottom: '1.5rem' }}>
            <div className="card">
              <div style={{ padding: '1rem 1.25rem', borderBottom: '1px solid var(--border)' }}>
                <h3 style={{ margin: 0, fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <Settings size={18} /> Configuration Status
                </h3>
              </div>
              <div style={{ padding: '1.25rem' }}>
                {status?.config ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span>Environment</span>
                      <span className={`badge badge-${status.config.environment === 'PRODUCTION' ? 'danger' : 'info'}`}>
                        {status.config.environment}
                      </span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span>ZATCA Posting</span>
                      <span className={`badge badge-${status.config.enableZatcaPosting ? 'success' : 'default'}`}>
                        {status.config.enableZatcaPosting ? 'Enabled' : 'Disabled'}
                      </span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span>Seller Info</span>
                      <span className={`badge badge-${status.config.hasSellerInfo ? 'success' : 'warning'}`}>
                        {status.config.hasSellerInfo ? 'Configured' : 'Missing'}
                      </span>
                    </div>
                  </div>
                ) : (
                  <div style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '1rem' }}>
                    <AlertTriangle size={32} style={{ marginBottom: '0.5rem' }} />
                    <p>ZATCA not configured</p>
                    <button className="btn btn-primary btn-sm" onClick={() => navigate('/admin/zatca/config')}>
                      Configure Now
                    </button>
                  </div>
                )}
              </div>
            </div>

            <div className="card">
              <div style={{ padding: '1rem 1.25rem', borderBottom: '1px solid var(--border)' }}>
                <h3 style={{ margin: 0, fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <Shield size={18} /> Active Credential
                </h3>
              </div>
              <div style={{ padding: '1.25rem' }}>
                {status?.credential ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span>Device</span>
                      <span style={{ fontWeight: 500 }}>{status.credential.deviceName}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span>Status</span>
                      <span className="badge badge-success">{status.credential.status}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span>Environment</span>
                      <span className={`badge badge-${status.credential.environment === 'PRODUCTION' ? 'danger' : 'info'}`}>
                        {status.credential.environment}
                      </span>
                    </div>
                  </div>
                ) : (
                  <div style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '1rem' }}>
                    <Shield size={32} style={{ marginBottom: '0.5rem' }} />
                    <p>No active credential</p>
                    <button className="btn btn-primary btn-sm" onClick={() => navigate('/admin/zatca/onboarding')}>
                      Complete Onboarding
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="card">
            <div style={{ padding: '1rem 1.25rem', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ margin: 0, fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <FileCheck size={18} /> Recent Submissions
              </h3>
              <button className="btn btn-secondary btn-sm" onClick={() => navigate('/admin/zatca/logs')}>
                View All Logs
              </button>
            </div>
            {status?.recentSubmissions?.length > 0 ? (
              <table className="table">
                <thead>
                  <tr>
                    <th>Invoice</th>
                    <th>Customer</th>
                    <th>Amount</th>
                    <th>Status</th>
                    <th>Submitted</th>
                  </tr>
                </thead>
                <tbody>
                  {status.recentSubmissions.map((sub: any) => (
                    <tr key={sub.id}>
                      <td style={{ fontFamily: 'monospace', fontWeight: 600 }}>
                        {sub.invoice?.invoiceNumber || '-'}
                      </td>
                      <td>{sub.invoice?.customer?.name || '-'}</td>
                      <td>SAR {sub.invoice?.totalAmount?.toFixed(2) || '0.00'}</td>
                      <td>
                        <span className={`badge badge-${getStatusColor(sub.status)}`}>
                          {sub.status}
                        </span>
                      </td>
                      <td>
                        {sub.submittedAt ? format(new Date(sub.submittedAt), 'MMM dd, HH:mm') : '-'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                No submissions yet
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
