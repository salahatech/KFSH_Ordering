import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link, useNavigate } from 'react-router-dom';
import api from '../../lib/api';
import { format } from 'date-fns';
import { 
  Ticket, Search, Filter, Users, AlertTriangle, Clock, CheckCircle, 
  User, MessageCircle, ListTodo, Calendar, ChevronDown
} from 'lucide-react';
import { KpiCard, StatusBadge, EmptyState } from '../../components/shared';

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

const TEAMS = [
  { value: '', label: 'All Teams' },
  { value: 'SUPPORT', label: 'Support' },
  { value: 'FINANCE', label: 'Finance' },
  { value: 'LOGISTICS', label: 'Logistics' },
  { value: 'QC', label: 'QC' },
  { value: 'IT', label: 'IT' },
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
  CRITICAL: { color: '#dc2626', label: 'Critical' },
};

export default function AdminHelpdesk() {
  const navigate = useNavigate();
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState('');
  const [priority, setPriority] = useState('');
  const [team, setTeam] = useState('');
  const [assignedTo, setAssignedTo] = useState('');
  const [search, setSearch] = useState('');
  const [slaBreached, setSlaBreached] = useState(false);
  const limit = 15;

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['admin-tickets', page, status, priority, team, assignedTo, search, slaBreached],
    queryFn: async () => {
      const params: any = { page, limit };
      if (status) params.status = status;
      if (priority) params.priority = priority;
      if (team) params.team = team;
      if (assignedTo) params.assignedTo = assignedTo;
      if (search) params.search = search;
      if (slaBreached) params.slaBreached = 'true';
      const { data } = await api.get('/helpdesk/admin/tickets', { params });
      return data;
    },
  });

  const { data: supportUsers } = useQuery({
    queryKey: ['support-users'],
    queryFn: async () => {
      const { data } = await api.get('/helpdesk/admin/support-users');
      return data;
    },
  });

  const tickets = data?.tickets || [];
  const stats = data?.stats || { new: 0, open: 0, slaBreached: 0, unassigned: 0 };
  const pagination = data?.pagination || { page: 1, pages: 1, total: 0 };

  return (
    <div style={{ padding: '1.5rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <div>
          <h1 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', margin: 0 }}>
            <Ticket size={28} />
            Support Tickets
          </h1>
          <p style={{ color: 'var(--text-muted)', marginTop: '0.25rem' }}>
            Manage customer support requests
          </p>
        </div>
        <Link to="/admin/helpdesk/tasks" className="btn" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <ListTodo size={18} />
          View Tasks
        </Link>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
        <KpiCard 
          title="New Tickets" 
          value={stats.new}
          icon={<Ticket size={20} />}
          color="info"
          onClick={() => { setStatus('NEW'); setPage(1); }}
          selected={status === 'NEW'}
        />
        <KpiCard 
          title="Open Tickets" 
          value={stats.open}
          icon={<Clock size={20} />}
          color="warning"
          onClick={() => { setStatus(''); setPriority(''); setPage(1); }}
          selected={!status && !priority}
        />
        <KpiCard 
          title="SLA Breached" 
          value={stats.slaBreached}
          icon={<AlertTriangle size={20} />}
          color="danger"
          onClick={() => { setSlaBreached(true); setPage(1); }}
          selected={slaBreached}
        />
        <KpiCard 
          title="Unassigned" 
          value={stats.unassigned}
          icon={<User size={20} />}
          color="primary"
          onClick={() => { setAssignedTo('unassigned'); setPage(1); }}
          selected={assignedTo === 'unassigned'}
        />
      </div>

      <div className="card" style={{ marginBottom: '1rem' }}>
        <div style={{ padding: '1rem', display: 'flex', gap: '0.75rem', flexWrap: 'wrap', alignItems: 'center' }}>
          <div style={{ position: 'relative', flex: '1', minWidth: '200px' }}>
            <Search size={16} style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
            <input
              type="text"
              placeholder="Search tickets, emails..."
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
            style={{ minWidth: '130px' }}
          >
            {TICKET_STATUSES.map(opt => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
          <select
            className="form-input"
            value={priority}
            onChange={(e) => { setPriority(e.target.value); setPage(1); }}
            style={{ minWidth: '120px' }}
          >
            {PRIORITIES.map(opt => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
          <select
            className="form-input"
            value={team}
            onChange={(e) => { setTeam(e.target.value); setPage(1); }}
            style={{ minWidth: '120px' }}
          >
            {TEAMS.map(opt => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
          <select
            className="form-input"
            value={assignedTo}
            onChange={(e) => { setAssignedTo(e.target.value); setPage(1); }}
            style={{ minWidth: '140px' }}
          >
            <option value="">All Assignees</option>
            <option value="unassigned">Unassigned</option>
            {supportUsers?.map((user: any) => (
              <option key={user.id} value={user.id}>{user.firstName} {user.lastName}</option>
            ))}
          </select>
          <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', whiteSpace: 'nowrap' }}>
            <input
              type="checkbox"
              checked={slaBreached}
              onChange={(e) => { setSlaBreached(e.target.checked); setPage(1); }}
            />
            SLA Breached
          </label>
        </div>
      </div>

      <div className="card">
        {isLoading ? (
          <div style={{ padding: '3rem', textAlign: 'center' }}>Loading...</div>
        ) : tickets.length === 0 ? (
          <EmptyState
            icon="file"
            title="No tickets found"
            message="Try adjusting your filters or wait for new support requests"
          />
        ) : (
          <>
            <table className="data-table">
              <thead>
                <tr>
                  <th>Ticket</th>
                  <th>Requester</th>
                  <th>Subject</th>
                  <th>Category</th>
                  <th>Priority</th>
                  <th>Status</th>
                  <th>Assigned To</th>
                  <th>Last Update</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {tickets.map((ticket: any) => {
                  const isSlaBreached = (ticket.slaResponseDueAt && new Date(ticket.slaResponseDueAt) < new Date() && !ticket.slaResponseMet) ||
                    (ticket.slaResolveDueAt && new Date(ticket.slaResolveDueAt) < new Date() && !ticket.slaResolveMet && !['RESOLVED', 'CLOSED', 'CANCELLED'].includes(ticket.status));
                  
                  return (
                    <tr 
                      key={ticket.id} 
                      onClick={() => navigate(`/admin/helpdesk/tickets/${ticket.id}`)} 
                      style={{ cursor: 'pointer', background: isSlaBreached ? 'rgba(220, 38, 38, 0.05)' : undefined }}
                    >
                      <td>
                        <code style={{ fontSize: '0.85rem', fontWeight: 500 }}>{ticket.ticketNo}</code>
                        {isSlaBreached && (
                          <span title="SLA Breached">
                            <AlertTriangle size={14} style={{ color: 'var(--danger)', marginLeft: '0.5rem' }} />
                          </span>
                        )}
                      </td>
                      <td>
                        <div style={{ fontWeight: 500 }}>{ticket.requesterUser?.firstName} {ticket.requesterUser?.lastName}</div>
                        <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{ticket.requesterUser?.email}</div>
                      </td>
                      <td>
                        <div style={{ maxWidth: '250px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {ticket.subject}
                        </div>
                        <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                          <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                            <MessageCircle size={12} /> {ticket._count?.messages || 0}
                          </span>
                          <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                            <ListTodo size={12} /> {ticket._count?.tasks || 0}
                          </span>
                        </div>
                      </td>
                      <td>
                        <span className="badge" style={{ background: 'var(--bg-secondary)', color: 'var(--text-secondary)' }}>
                          {ticket.category}
                        </span>
                      </td>
                      <td>
                        <span style={{ 
                          color: priorityStyles[ticket.priority]?.color || 'inherit', 
                          fontWeight: ticket.priority === 'CRITICAL' ? 700 : 500 
                        }}>
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
                      <td>
                        {ticket.assignedToUser ? (
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <div style={{ 
                              width: '24px', 
                              height: '24px', 
                              borderRadius: '50%', 
                              background: 'var(--primary)', 
                              color: 'white', 
                              display: 'flex', 
                              alignItems: 'center', 
                              justifyContent: 'center', 
                              fontSize: '0.7rem', 
                              fontWeight: 600 
                            }}>
                              {ticket.assignedToUser.firstName?.[0]}{ticket.assignedToUser.lastName?.[0]}
                            </div>
                            <span style={{ fontSize: '0.85rem' }}>
                              {ticket.assignedToUser.firstName}
                            </span>
                          </div>
                        ) : (
                          <span style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>Unassigned</span>
                        )}
                      </td>
                      <td style={{ color: 'var(--text-muted)', fontSize: '0.85rem', whiteSpace: 'nowrap' }}>
                        {format(new Date(ticket.lastActivityAt), 'MMM d, h:mm a')}
                      </td>
                      <td>
                        <Link 
                          to={`/admin/helpdesk/tickets/${ticket.id}`} 
                          className="btn btn-sm"
                          onClick={(e) => e.stopPropagation()}
                        >
                          View
                        </Link>
                      </td>
                    </tr>
                  );
                })}
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
                  Page {page} of {pagination.pages} ({pagination.total} tickets)
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
