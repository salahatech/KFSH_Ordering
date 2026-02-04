import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link, useNavigate } from 'react-router-dom';
import api from '../../lib/api';
import { format } from 'date-fns';
import { Ticket, Plus, Search, Filter, MessageCircle, Paperclip, Clock, AlertCircle, CheckCircle, XCircle } from 'lucide-react';
import { StatusBadge, EmptyState, KpiCard } from '../../components/shared';

const TICKET_STATUSES = [
  { value: '', label: 'All Statuses' },
  { value: 'NEW', label: 'New' },
  { value: 'OPEN', label: 'Open' },
  { value: 'IN_PROGRESS', label: 'In Progress' },
  { value: 'WAITING_FOR_USER', label: 'Waiting for You' },
  { value: 'WAITING_FOR_ADMIN', label: 'Waiting for Support' },
  { value: 'RESOLVED', label: 'Resolved' },
  { value: 'CLOSED', label: 'Closed' },
];

const TICKET_CATEGORIES = [
  { value: '', label: 'All Categories' },
  { value: 'ACCOUNT', label: 'Account' },
  { value: 'ORDER', label: 'Order' },
  { value: 'DELIVERY', label: 'Delivery' },
  { value: 'INVOICE', label: 'Invoice' },
  { value: 'PAYMENT', label: 'Payment' },
  { value: 'QC', label: 'Quality' },
  { value: 'SYSTEM', label: 'System' },
  { value: 'OTHER', label: 'Other' },
];

const statusStyles: Record<string, { color: string; bg: string }> = {
  NEW: { color: 'var(--info)', bg: 'var(--info-bg)' },
  OPEN: { color: 'var(--primary)', bg: 'var(--primary-bg)' },
  IN_PROGRESS: { color: 'var(--warning)', bg: 'var(--warning-bg)' },
  WAITING_FOR_USER: { color: 'var(--danger)', bg: 'var(--danger-bg)' },
  WAITING_FOR_ADMIN: { color: 'var(--info)', bg: 'var(--info-bg)' },
  RESOLVED: { color: 'var(--success)', bg: 'var(--success-bg)' },
  CLOSED: { color: 'var(--text-muted)', bg: 'var(--bg-secondary)' },
  CANCELLED: { color: 'var(--text-muted)', bg: 'var(--bg-secondary)' },
};

const priorityStyles: Record<string, { color: string; label: string }> = {
  LOW: { color: 'var(--text-muted)', label: 'Low' },
  MEDIUM: { color: 'var(--warning)', label: 'Medium' },
  HIGH: { color: 'var(--danger)', label: 'High' },
  CRITICAL: { color: 'var(--danger)', label: 'Critical' },
};

export default function PortalHelpdesk() {
  const navigate = useNavigate();
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState('');
  const [category, setCategory] = useState('');
  const [search, setSearch] = useState('');
  const limit = 10;

  const { data, isLoading } = useQuery({
    queryKey: ['portal-tickets', page, status, category, search],
    queryFn: async () => {
      const params: any = { page, limit };
      if (status) params.status = status;
      if (category) params.category = category;
      if (search) params.search = search;
      const { data } = await api.get('/helpdesk/tickets', { params });
      return data;
    },
  });

  const tickets = data?.tickets || [];
  const pagination = data?.pagination || { page: 1, pages: 1, total: 0 };

  const stats = {
    total: pagination.total,
    waitingForYou: tickets.filter((t: any) => t.status === 'WAITING_FOR_USER').length,
    open: tickets.filter((t: any) => ['NEW', 'OPEN', 'IN_PROGRESS', 'WAITING_FOR_ADMIN'].includes(t.status)).length,
    resolved: tickets.filter((t: any) => ['RESOLVED', 'CLOSED'].includes(t.status)).length,
  };

  return (
    <div style={{ padding: '1.5rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <div>
          <h1 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', margin: 0 }}>
            <Ticket size={28} />
            My Support Tickets
          </h1>
          <p style={{ color: 'var(--text-muted)', marginTop: '0.25rem' }}>
            View and manage your support requests
          </p>
        </div>
        <Link to="/portal/helpdesk/new" className="btn btn-primary" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Plus size={18} />
          New Ticket
        </Link>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
        <KpiCard 
          title="Total Tickets" 
          value={stats.total}
          icon={<Ticket size={20} />}
          color="primary"
        />
        <KpiCard 
          title="Needs Your Response" 
          value={stats.waitingForYou}
          icon={<AlertCircle size={20} />}
          color="danger"
        />
        <KpiCard 
          title="Open" 
          value={stats.open}
          icon={<Clock size={20} />}
          color="warning"
        />
        <KpiCard 
          title="Resolved" 
          value={stats.resolved}
          icon={<CheckCircle size={20} />}
          color="success"
        />
      </div>

      <div className="card" style={{ marginBottom: '1rem' }}>
        <div style={{ padding: '1rem', display: 'flex', gap: '1rem', flexWrap: 'wrap', alignItems: 'center' }}>
          <div style={{ position: 'relative', flex: '1', minWidth: '200px' }}>
            <Search size={16} style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
            <input
              type="text"
              placeholder="Search tickets..."
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              className="form-input"
              style={{ paddingLeft: '2.25rem', width: '100%' }}
            />
          </div>
          <select
            className="form-input"
            value={status}
            onChange={(e) => { setStatus(e.target.value); setPage(1); }}
            style={{ minWidth: '150px' }}
          >
            {TICKET_STATUSES.map(opt => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
          <select
            className="form-input"
            value={category}
            onChange={(e) => { setCategory(e.target.value); setPage(1); }}
            style={{ minWidth: '150px' }}
          >
            {TICKET_CATEGORIES.map(opt => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="card">
        {isLoading ? (
          <div style={{ padding: '3rem', textAlign: 'center' }}>Loading...</div>
        ) : tickets.length === 0 ? (
          <EmptyState
            icon="file"
            title="No tickets found"
            message={search || status || category ? 'Try adjusting your filters' : 'Create your first support ticket to get help'}
          />
        ) : (
          <>
            <table className="data-table">
              <thead>
                <tr>
                  <th>Ticket</th>
                  <th>Subject</th>
                  <th>Category</th>
                  <th>Priority</th>
                  <th>Status</th>
                  <th>Last Update</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {tickets.map((ticket: any) => (
                  <tr key={ticket.id} onClick={() => navigate(`/portal/helpdesk/${ticket.id}`)} style={{ cursor: 'pointer' }}>
                    <td>
                      <code style={{ fontSize: '0.85rem', fontWeight: 500 }}>{ticket.ticketNo}</code>
                    </td>
                    <td>
                      <div style={{ fontWeight: 500 }}>{ticket.subject}</div>
                      <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '0.75rem', marginTop: '0.25rem' }}>
                        <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                          <MessageCircle size={12} /> {ticket._count?.messages || 0}
                        </span>
                        <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                          <Paperclip size={12} /> {ticket._count?.attachments || 0}
                        </span>
                      </div>
                    </td>
                    <td>
                      <span className="badge" style={{ background: 'var(--bg-secondary)', color: 'var(--text-secondary)' }}>
                        {ticket.category}
                      </span>
                    </td>
                    <td>
                      <span style={{ color: priorityStyles[ticket.priority]?.color || 'inherit', fontWeight: 500 }}>
                        {priorityStyles[ticket.priority]?.label || ticket.priority}
                      </span>
                    </td>
                    <td>
                      <span 
                        className="badge" 
                        style={{ 
                          background: statusStyles[ticket.status]?.bg || 'var(--bg-secondary)',
                          color: statusStyles[ticket.status]?.color || 'var(--text-secondary)'
                        }}
                      >
                        {ticket.status.replace(/_/g, ' ')}
                      </span>
                    </td>
                    <td style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                      {format(new Date(ticket.lastActivityAt), 'MMM d, h:mm a')}
                    </td>
                    <td>
                      <Link 
                        to={`/portal/helpdesk/${ticket.id}`} 
                        className="btn btn-sm"
                        onClick={(e) => e.stopPropagation()}
                      >
                        View
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {pagination.pages > 1 && (
              <div style={{ padding: '1rem', display: 'flex', justifyContent: 'center', gap: '0.5rem' }}>
                <button 
                  className="btn btn-sm" 
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  disabled={page === 1}
                >
                  Previous
                </button>
                <span style={{ padding: '0.5rem 1rem', color: 'var(--text-muted)' }}>
                  Page {page} of {pagination.pages}
                </span>
                <button 
                  className="btn btn-sm" 
                  onClick={() => setPage(p => Math.min(pagination.pages, p + 1))}
                  disabled={page === pagination.pages}
                >
                  Next
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
