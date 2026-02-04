import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link, useNavigate } from 'react-router-dom';
import api from '../../lib/api';
import { format } from 'date-fns';
import { 
  Ticket, Search, Filter, Users, AlertTriangle, Clock, CheckCircle, 
  User, MessageCircle, ListTodo, Edit2
} from 'lucide-react';
import { KpiCard, EmptyState } from '../../components/shared';

const TICKET_STATUSES = [
  { value: '', label: 'All Statuses' },
  { value: 'NEW', label: 'New' },
  { value: 'OPEN', label: 'Open' },
  { value: 'IN_PROGRESS', label: 'In Progress' },
  { value: 'WAITING_FOR_USER', label: 'Waiting for User' },
  { value: 'WAITING_FOR_ADMIN', label: 'Waiting for Admin' },
  { value: 'RESOLVED', label: 'Resolved' },
  { value: 'CLOSED', label: 'Closed' },
];

const PRIORITIES = [
  { value: '', label: 'All Priorities' },
  { value: 'LOW', label: 'Low' },
  { value: 'MEDIUM', label: 'Medium' },
  { value: 'HIGH', label: 'High' },
  { value: 'CRITICAL', label: 'Critical' },
];

const CATEGORIES = [
  { value: '', label: 'All Categories' },
  { value: 'ACCOUNT', label: 'Account' },
  { value: 'ORDER', label: 'Order' },
  { value: 'DELIVERY', label: 'Delivery' },
  { value: 'INVOICE', label: 'Invoice' },
  { value: 'PAYMENT', label: 'Payment' },
  { value: 'QC', label: 'QC' },
  { value: 'SYSTEM', label: 'System' },
  { value: 'OTHER', label: 'Other' },
];

const statusStyles: Record<string, { color: string; bg: string; label: string }> = {
  NEW: { color: 'var(--info)', bg: 'var(--info-bg)', label: 'New' },
  OPEN: { color: 'var(--primary)', bg: 'var(--primary-bg)', label: 'Open' },
  IN_PROGRESS: { color: 'var(--warning)', bg: 'var(--warning-bg)', label: 'In Progress' },
  WAITING_FOR_USER: { color: 'var(--danger)', bg: 'var(--danger-bg)', label: 'Waiting' },
  WAITING_FOR_ADMIN: { color: 'var(--info)', bg: 'var(--info-bg)', label: 'Pending' },
  RESOLVED: { color: 'var(--success)', bg: 'var(--success-bg)', label: 'Resolved' },
  CLOSED: { color: 'var(--text-muted)', bg: 'var(--bg-secondary)', label: 'Closed' },
  CANCELLED: { color: 'var(--text-muted)', bg: 'var(--bg-secondary)', label: 'Cancelled' },
};

const priorityStyles: Record<string, { color: string; bg: string }> = {
  LOW: { color: 'var(--text-muted)', bg: 'var(--bg-secondary)' },
  MEDIUM: { color: 'var(--warning)', bg: 'var(--warning-bg)' },
  HIGH: { color: 'var(--danger)', bg: 'var(--danger-bg)' },
  CRITICAL: { color: 'white', bg: 'var(--danger)' },
};

const categoryColors: Record<string, { color: string; bg: string }> = {
  ACCOUNT: { color: 'var(--primary)', bg: 'rgba(59, 130, 246, 0.1)' },
  ORDER: { color: 'var(--success)', bg: 'rgba(34, 197, 94, 0.1)' },
  DELIVERY: { color: 'var(--warning)', bg: 'rgba(234, 179, 8, 0.1)' },
  INVOICE: { color: 'var(--info)', bg: 'rgba(6, 182, 212, 0.1)' },
  PAYMENT: { color: '#8b5cf6', bg: 'rgba(139, 92, 246, 0.1)' },
  QC: { color: '#ec4899', bg: 'rgba(236, 72, 153, 0.1)' },
  SYSTEM: { color: 'var(--text-muted)', bg: 'var(--bg-secondary)' },
  OTHER: { color: 'var(--text-muted)', bg: 'var(--bg-secondary)' },
};

export default function AdminHelpdesk() {
  const navigate = useNavigate();
  const [status, setStatus] = useState('');
  const [priority, setPriority] = useState('');
  const [category, setCategory] = useState('');
  const [search, setSearch] = useState('');
  const [selectedTicket, setSelectedTicket] = useState<any>(null);

  const { data, isLoading } = useQuery({
    queryKey: ['admin-tickets', status, priority, category, search],
    queryFn: async () => {
      const params: any = { limit: 100 };
      if (status) params.status = status;
      if (priority) params.priority = priority;
      if (category) params.category = category;
      if (search) params.search = search;
      const { data } = await api.get('/helpdesk/admin/tickets', { params });
      return data;
    },
  });

  const tickets = data?.tickets || [];
  const stats = data?.stats || { new: 0, open: 0, slaBreached: 0, unassigned: 0 };

  const filteredTickets = tickets;

  const getCategoryStyle = (cat: string) => categoryColors[cat] || categoryColors.OTHER;
  const getStatusStyle = (s: string) => statusStyles[s] || statusStyles.NEW;
  const getPriorityStyle = (p: string) => priorityStyles[p] || priorityStyles.MEDIUM;

  if (isLoading) {
    return (
      <div className="loading-overlay">
        <div className="spinner" />
      </div>
    );
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.5rem' }}>
        <div>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 600, marginBottom: '0.25rem' }}>Support Tickets</h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', margin: 0 }}>
            Manage customer support requests and inquiries
          </p>
        </div>
        <Link to="/admin/helpdesk/tasks" className="btn">
          <ListTodo size={16} /> View Tasks
        </Link>
      </div>

      <div className="grid" style={{ gridTemplateColumns: 'repeat(4, 1fr)', gap: '1rem', marginBottom: '1.5rem' }}>
        <KpiCard 
          title="New Tickets" 
          value={stats.new}
          icon={<Ticket size={20} />}
          color="info"
          onClick={() => { setStatus('NEW'); }}
          selected={status === 'NEW'}
        />
        <KpiCard 
          title="Open Tickets" 
          value={stats.open}
          icon={<Clock size={20} />}
          color="warning"
          onClick={() => { setStatus(''); setPriority(''); }}
          selected={!status && !priority}
        />
        <KpiCard 
          title="SLA Breached" 
          value={stats.slaBreached}
          icon={<AlertTriangle size={20} />}
          color="danger"
        />
        <KpiCard 
          title="Unassigned" 
          value={stats.unassigned}
          icon={<User size={20} />}
          color="primary"
        />
      </div>

      <div style={{ 
        display: 'flex', 
        alignItems: 'center', 
        gap: '1rem', 
        marginBottom: '1.5rem',
        padding: '0.75rem 1rem',
        background: 'var(--bg-primary)',
        borderRadius: 'var(--radius)',
        border: '1px solid var(--border)',
      }}>
        <Filter size={16} style={{ color: 'var(--text-muted)' }} />
        <span style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>Filters:</span>
        <div style={{ position: 'relative', flex: '1', maxWidth: '280px' }}>
          <Search size={14} style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
          <input
            type="text"
            placeholder="Search by subject, ticket number..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="form-input"
            style={{ paddingLeft: '2rem', fontSize: '0.875rem', height: '36px' }}
          />
        </div>
        <select
          className="form-input"
          value={status}
          onChange={(e) => setStatus(e.target.value)}
          style={{ width: 'auto', fontSize: '0.875rem', height: '36px' }}
        >
          {TICKET_STATUSES.map(opt => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
        </select>
        <select
          className="form-input"
          value={priority}
          onChange={(e) => setPriority(e.target.value)}
          style={{ width: 'auto', fontSize: '0.875rem', height: '36px' }}
        >
          {PRIORITIES.map(opt => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
        </select>
        <select
          className="form-input"
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          style={{ width: 'auto', fontSize: '0.875rem', height: '36px' }}
        >
          {CATEGORIES.map(opt => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
        </select>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: selectedTicket ? '1fr 340px' : '1fr', gap: '1.5rem' }}>
        <div>
          {filteredTickets.length === 0 ? (
            <div className="card" style={{ padding: '2rem' }}>
              <EmptyState
                icon="file"
                title="No tickets found"
                message="Try adjusting your filters or wait for new support requests"
              />
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '1rem' }}>
              {filteredTickets.map((ticket: any) => {
                const catStyle = getCategoryStyle(ticket.category);
                const statusStyle = getStatusStyle(ticket.status);
                const prioStyle = getPriorityStyle(ticket.priority);
                const isSlaBreached = (ticket.slaResponseDueAt && new Date(ticket.slaResponseDueAt) < new Date() && !ticket.slaResponseMet) ||
                  (ticket.slaResolveDueAt && new Date(ticket.slaResolveDueAt) < new Date() && !ticket.slaResolveMet && !['RESOLVED', 'CLOSED', 'CANCELLED'].includes(ticket.status));

                return (
                  <div
                    key={ticket.id}
                    className="card"
                    onClick={() => setSelectedTicket(ticket)}
                    style={{ 
                      padding: '1rem', 
                      cursor: 'pointer',
                      border: selectedTicket?.id === ticket.id ? '2px solid var(--primary)' : '1px solid var(--border)',
                      transition: 'all 0.15s ease',
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.75rem' }}>
                      <span 
                        className="badge"
                        style={{ background: catStyle.bg, color: catStyle.color, fontWeight: 600 }}
                      >
                        {ticket.category}
                      </span>
                      <button
                        className="btn btn-secondary btn-sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          navigate(`/admin/helpdesk/tickets/${ticket.id}`);
                        }}
                        style={{ padding: '0.25rem 0.5rem' }}
                      >
                        <Edit2 size={14} />
                      </button>
                    </div>

                    <h3 style={{ fontWeight: 600, marginBottom: '0.25rem', fontSize: '0.9375rem' }}>{ticket.subject}</h3>
                    <p style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', marginBottom: '0.75rem' }}>
                      <span style={{ fontFamily: 'monospace' }}>{ticket.ticketNo}</span>
                      {' • '}
                      {ticket.requesterUser?.firstName} {ticket.requesterUser?.lastName}
                    </p>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem', fontSize: '0.8125rem', marginBottom: '0.75rem' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
                        <MessageCircle size={14} style={{ color: 'var(--text-muted)' }} />
                        <span>Messages: {ticket._count?.messages || 0}</span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
                        <ListTodo size={14} style={{ color: 'var(--text-muted)' }} />
                        <span>Tasks: {ticket._count?.tasks || 0}</span>
                      </div>
                    </div>

                    <div style={{ 
                      marginTop: '0.5rem', 
                      paddingTop: '0.75rem', 
                      borderTop: '1px solid var(--border)', 
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                    }}>
                      <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                        <span className="badge" style={{ background: statusStyle.bg, color: statusStyle.color, fontSize: '0.6875rem' }}>
                          {statusStyle.label}
                        </span>
                        <span className="badge" style={{ background: prioStyle.bg, color: prioStyle.color, fontSize: '0.6875rem' }}>
                          {ticket.priority}
                        </span>
                        {isSlaBreached && (
                          <span title="SLA Breached">
                            <AlertTriangle size={14} style={{ color: 'var(--danger)' }} />
                          </span>
                        )}
                      </div>
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                        {format(new Date(ticket.lastActivityAt), 'MMM d')}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {selectedTicket && (
          <div className="card" style={{ padding: 0, height: 'fit-content', position: 'sticky', top: '1rem' }}>
            <div style={{ 
              padding: '1rem', 
              borderBottom: '1px solid var(--border)',
              background: getCategoryStyle(selectedTicket.category).bg,
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                  <span 
                    className="badge"
                    style={{ 
                      background: getCategoryStyle(selectedTicket.category).color, 
                      color: 'white',
                      marginBottom: '0.5rem',
                    }}
                  >
                    {selectedTicket.category}
                  </span>
                  <h3 style={{ fontWeight: 600, fontSize: '1rem', margin: '0.5rem 0 0.25rem' }}>{selectedTicket.subject}</h3>
                  <p style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', margin: 0 }}>
                    {selectedTicket.ticketNo}
                  </p>
                </div>
                <button
                  className="btn btn-sm btn-secondary"
                  onClick={() => setSelectedTicket(null)}
                  style={{ borderRadius: '50%', width: '28px', height: '28px', padding: 0 }}
                >
                  ×
                </button>
              </div>
            </div>

            <div style={{ padding: '1rem' }}>
              <div style={{ marginBottom: '1rem' }}>
                <div style={{ fontSize: '0.6875rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.75rem' }}>
                  Requester
                </div>
                <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
                  <div style={{ 
                    width: '40px', 
                    height: '40px', 
                    borderRadius: '50%', 
                    background: 'var(--primary-light)', 
                    display: 'flex', 
                    alignItems: 'center', 
                    justifyContent: 'center',
                    color: 'var(--primary)',
                    fontWeight: 600,
                  }}>
                    {selectedTicket.requesterUser?.firstName?.[0]}{selectedTicket.requesterUser?.lastName?.[0]}
                  </div>
                  <div>
                    <div style={{ fontWeight: 600, fontSize: '0.875rem' }}>
                      {selectedTicket.requesterUser?.firstName} {selectedTicket.requesterUser?.lastName}
                    </div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                      {selectedTicket.requesterUser?.email}
                    </div>
                  </div>
                </div>
              </div>

              <div style={{ marginBottom: '1rem' }}>
                <div style={{ fontSize: '0.6875rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.75rem' }}>
                  Ticket Info
                </div>
                <div className="grid" style={{ gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
                  <div style={{ padding: '0.625rem', background: 'var(--bg-secondary)', borderRadius: 'var(--radius)' }}>
                    <div style={{ fontSize: '0.6875rem', color: 'var(--text-muted)', marginBottom: '0.125rem' }}>Status</div>
                    <div style={{ fontWeight: 600, fontSize: '0.8125rem', color: getStatusStyle(selectedTicket.status).color }}>
                      {getStatusStyle(selectedTicket.status).label}
                    </div>
                  </div>
                  <div style={{ padding: '0.625rem', background: 'var(--bg-secondary)', borderRadius: 'var(--radius)' }}>
                    <div style={{ fontSize: '0.6875rem', color: 'var(--text-muted)', marginBottom: '0.125rem' }}>Priority</div>
                    <div style={{ fontWeight: 600, fontSize: '0.8125rem' }}>{selectedTicket.priority}</div>
                  </div>
                  <div style={{ padding: '0.625rem', background: 'var(--bg-secondary)', borderRadius: 'var(--radius)' }}>
                    <div style={{ fontSize: '0.6875rem', color: 'var(--text-muted)', marginBottom: '0.125rem' }}>Team</div>
                    <div style={{ fontWeight: 600, fontSize: '0.8125rem' }}>{selectedTicket.assignedTeam || 'Unassigned'}</div>
                  </div>
                  <div style={{ padding: '0.625rem', background: 'var(--bg-secondary)', borderRadius: 'var(--radius)' }}>
                    <div style={{ fontSize: '0.6875rem', color: 'var(--text-muted)', marginBottom: '0.125rem' }}>Assignee</div>
                    <div style={{ fontWeight: 600, fontSize: '0.8125rem' }}>
                      {selectedTicket.assignedToUser ? selectedTicket.assignedToUser.firstName : 'Unassigned'}
                    </div>
                  </div>
                </div>
              </div>

              <div style={{ marginBottom: '1rem' }}>
                <div style={{ fontSize: '0.6875rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.75rem' }}>
                  Activity
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', fontSize: '0.8125rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: 'var(--text-muted)' }}>Created</span>
                    <span>{format(new Date(selectedTicket.createdAt), 'MMM d, yyyy')}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: 'var(--text-muted)' }}>Last Activity</span>
                    <span>{format(new Date(selectedTicket.lastActivityAt), 'MMM d, h:mm a')}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: 'var(--text-muted)' }}>Messages</span>
                    <span>{selectedTicket._count?.messages || 0}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: 'var(--text-muted)' }}>Tasks</span>
                    <span>{selectedTicket._count?.tasks || 0}</span>
                  </div>
                </div>
              </div>

              <Link 
                to={`/admin/helpdesk/tickets/${selectedTicket.id}`}
                className="btn btn-primary"
                style={{ width: '100%', justifyContent: 'center' }}
              >
                Open Ticket
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
