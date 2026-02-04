import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import api from '../../lib/api';
import { 
  ArrowLeft, Mail, Phone, MessageSquare, Bell,
  CheckCircle, XCircle, Clock, Ban, Download, Filter
} from 'lucide-react';
import { useLocalization } from '../../hooks/useLocalization';
import { Pagination } from '../../components/shared';

interface DeliveryAttempt {
  id: string;
  notificationId: string | null;
  channel: string;
  recipientAddress: string;
  status: string;
  providerMessageId: string | null;
  errorMessage: string | null;
  metadata: any;
  attemptedAt: string;
  notification?: {
    title: string;
    type: string;
    user?: { firstName: string; lastName: string; email: string };
  };
}

interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

const channelIcons: Record<string, any> = {
  EMAIL: Mail,
  SMS: Phone,
  WHATSAPP: MessageSquare,
  IN_APP: Bell
};

const statusStyles: Record<string, { color: string; bg: string; icon: any }> = {
  SENT: { color: 'var(--success)', bg: 'var(--success-bg)', icon: CheckCircle },
  FAILED: { color: 'var(--danger)', bg: 'var(--danger-bg)', icon: XCircle },
  PENDING: { color: 'var(--warning)', bg: 'var(--warning-bg)', icon: Clock },
  SKIPPED: { color: 'var(--text-muted)', bg: 'var(--bg-secondary)', icon: Ban }
};

export default function NotificationDeliveryLogs() {
  const { formatDateTime } = useLocalization();
  const [filters, setFilters] = useState({
    channel: 'all',
    status: 'all',
    startDate: '',
    endDate: '',
    search: ''
  });
  const [page, setPage] = useState(1);
  const limit = 25;

  const { data, isLoading } = useQuery({
    queryKey: ['delivery-attempts', filters, page],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (filters.channel !== 'all') params.append('channel', filters.channel);
      if (filters.status !== 'all') params.append('status', filters.status);
      if (filters.startDate) params.append('startDate', filters.startDate);
      if (filters.endDate) params.append('endDate', filters.endDate);
      if (filters.search) params.append('search', filters.search);
      params.append('page', page.toString());
      params.append('limit', limit.toString());
      
      const { data } = await api.get(`/notification-channels/delivery-attempts?${params}`);
      return data as { data: DeliveryAttempt[]; pagination: Pagination };
    }
  });

  const handleExport = async () => {
    const params = new URLSearchParams();
    if (filters.channel !== 'all') params.append('channel', filters.channel);
    if (filters.status !== 'all') params.append('status', filters.status);
    if (filters.startDate) params.append('startDate', filters.startDate);
    if (filters.endDate) params.append('endDate', filters.endDate);
    params.append('limit', '10000');
    
    try {
      const { data: exportData } = await api.get(`/notification-channels/delivery-attempts?${params}`);
      const csvRows = [
        ['Date', 'Channel', 'Status', 'Recipient', 'Notification', 'Provider ID', 'Error'].join(','),
        ...exportData.data.map((row: DeliveryAttempt) => [
          new Date(row.attemptedAt).toISOString(),
          row.channel,
          row.status,
          `"${row.recipientAddress}"`,
          `"${row.notification?.title || 'N/A'}"`,
          row.providerMessageId || '',
          `"${row.errorMessage || ''}"`
        ].join(','))
      ];
      
      const blob = new Blob([csvRows.join('\n')], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `notification-logs-${new Date().toISOString().split('T')[0]}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      console.error('Export failed', e);
    }
  };

  const renderStatusBadge = (status: string) => {
    const style = statusStyles[status] || statusStyles.PENDING;
    const Icon = style.icon;
    return (
      <span 
        style={{ 
          display: 'inline-flex', 
          alignItems: 'center', 
          gap: '0.25rem',
          padding: '0.25rem 0.5rem',
          borderRadius: '4px',
          fontSize: '0.75rem',
          fontWeight: 500,
          color: style.color,
          background: style.bg
        }}
      >
        <Icon size={12} />
        {status}
      </span>
    );
  };

  const renderChannelIcon = (channel: string) => {
    const Icon = channelIcons[channel] || Bell;
    return <Icon size={16} style={{ color: 'var(--text-muted)' }} />;
  };

  return (
    <div style={{ padding: '1.5rem' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <Link to="/admin/notification-channels" className="btn btn-outline btn-sm">
            <ArrowLeft size={16} />
          </Link>
          <div>
            <h1 style={{ margin: 0, fontSize: '1.5rem' }}>Notification Delivery Logs</h1>
            <p style={{ margin: 0, color: 'var(--text-muted)', fontSize: '0.875rem' }}>
              View all notification delivery attempts across channels
            </p>
          </div>
        </div>
        <button className="btn btn-outline" onClick={handleExport}>
          <Download size={16} />
          Export CSV
        </button>
      </div>

      <div className="card" style={{ padding: '1rem', marginBottom: '1rem' }}>
        <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', alignItems: 'flex-end' }}>
          <div>
            <label style={{ fontSize: '0.75rem', fontWeight: 500, display: 'block', marginBottom: '0.25rem' }}>Channel</label>
            <select
              className="form-control"
              value={filters.channel}
              onChange={(e) => { setFilters({ ...filters, channel: e.target.value }); setPage(1); }}
              style={{ minWidth: '120px' }}
            >
              <option value="all">All Channels</option>
              <option value="EMAIL">Email</option>
              <option value="SMS">SMS</option>
              <option value="WHATSAPP">WhatsApp</option>
            </select>
          </div>
          <div>
            <label style={{ fontSize: '0.75rem', fontWeight: 500, display: 'block', marginBottom: '0.25rem' }}>Status</label>
            <select
              className="form-control"
              value={filters.status}
              onChange={(e) => { setFilters({ ...filters, status: e.target.value }); setPage(1); }}
              style={{ minWidth: '120px' }}
            >
              <option value="all">All Statuses</option>
              <option value="SENT">Sent</option>
              <option value="FAILED">Failed</option>
              <option value="PENDING">Pending</option>
              <option value="SKIPPED">Skipped</option>
            </select>
          </div>
          <div>
            <label style={{ fontSize: '0.75rem', fontWeight: 500, display: 'block', marginBottom: '0.25rem' }}>From Date</label>
            <input
              type="date"
              className="form-control"
              value={filters.startDate}
              onChange={(e) => { setFilters({ ...filters, startDate: e.target.value }); setPage(1); }}
            />
          </div>
          <div>
            <label style={{ fontSize: '0.75rem', fontWeight: 500, display: 'block', marginBottom: '0.25rem' }}>To Date</label>
            <input
              type="date"
              className="form-control"
              value={filters.endDate}
              onChange={(e) => { setFilters({ ...filters, endDate: e.target.value }); setPage(1); }}
            />
          </div>
          <div style={{ flex: 1, minWidth: '200px' }}>
            <label style={{ fontSize: '0.75rem', fontWeight: 500, display: 'block', marginBottom: '0.25rem' }}>Search Recipient</label>
            <input
              type="text"
              className="form-control"
              placeholder="Search by email or phone..."
              value={filters.search}
              onChange={(e) => { setFilters({ ...filters, search: e.target.value }); setPage(1); }}
            />
          </div>
          <button 
            className="btn btn-outline btn-sm"
            onClick={() => { setFilters({ channel: 'all', status: 'all', startDate: '', endDate: '', search: '' }); setPage(1); }}
          >
            <Filter size={14} />
            Clear
          </button>
        </div>
      </div>

      {isLoading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: '3rem' }}>
          <div className="spinner" />
        </div>
      ) : (
        <>
          <div className="card" style={{ overflow: 'hidden' }}>
            <table className="table">
              <thead>
                <tr>
                  <th>Date/Time</th>
                  <th>Channel</th>
                  <th>Status</th>
                  <th>Recipient</th>
                  <th>Notification</th>
                  <th>Provider ID</th>
                  <th>Error</th>
                </tr>
              </thead>
              <tbody>
                {data?.data.length === 0 ? (
                  <tr>
                    <td colSpan={7} style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>
                      No delivery attempts found matching your filters
                    </td>
                  </tr>
                ) : (
                  data?.data.map((attempt) => (
                    <tr key={attempt.id}>
                      <td style={{ whiteSpace: 'nowrap' }}>
                        {formatDateTime(attempt.attemptedAt)}
                      </td>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                          {renderChannelIcon(attempt.channel)}
                          <span>{attempt.channel}</span>
                        </div>
                      </td>
                      <td>{renderStatusBadge(attempt.status)}</td>
                      <td style={{ maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {attempt.recipientAddress}
                      </td>
                      <td style={{ maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {attempt.notification?.title || '-'}
                      </td>
                      <td style={{ fontSize: '0.75rem', fontFamily: 'monospace', color: 'var(--text-muted)' }}>
                        {attempt.providerMessageId ? attempt.providerMessageId.substring(0, 20) + '...' : '-'}
                      </td>
                      <td style={{ maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis', color: 'var(--danger)' }}>
                        {attempt.errorMessage || '-'}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {data?.pagination && data.pagination.total > 0 && (
            <div style={{ marginTop: '1rem', borderRadius: '8px', overflow: 'hidden' }}>
              <Pagination
                page={page}
                pageSize={limit}
                totalCount={data.pagination.total}
                onPageChange={setPage}
              />
            </div>
          )}
        </>
      )}
    </div>
  );
}
