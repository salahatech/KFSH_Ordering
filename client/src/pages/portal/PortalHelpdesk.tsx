import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link, useNavigate } from 'react-router-dom';
import api from '../../lib/api';
import { format } from 'date-fns';
import { 
  Ticket, 
  Plus, 
  Search, 
  Filter, 
  MessageCircle, 
  Paperclip, 
  Clock, 
  AlertCircle, 
  CheckCircle, 
  X,
  Calendar,
  Tag,
  ChevronRight,
  ExternalLink
} from 'lucide-react';
import { EmptyState, KpiCard, Pagination } from '../../components/shared';

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
  NEW: { color: 'var(--info)', bg: 'rgba(59, 130, 246, 0.1)' },
  OPEN: { color: 'var(--primary)', bg: 'rgba(99, 102, 241, 0.1)' },
  IN_PROGRESS: { color: 'var(--warning)', bg: 'rgba(234, 179, 8, 0.1)' },
  WAITING_FOR_USER: { color: 'var(--danger)', bg: 'rgba(239, 68, 68, 0.1)' },
  WAITING_FOR_ADMIN: { color: 'var(--info)', bg: 'rgba(59, 130, 246, 0.1)' },
  RESOLVED: { color: 'var(--success)', bg: 'rgba(34, 197, 94, 0.1)' },
  CLOSED: { color: 'var(--text-muted)', bg: 'var(--bg-secondary)' },
  CANCELLED: { color: 'var(--text-muted)', bg: 'var(--bg-secondary)' },
};

const priorityStyles: Record<string, { color: string; label: string; bg: string }> = {
  LOW: { color: 'var(--text-muted)', label: 'Low', bg: 'var(--bg-secondary)' },
  MEDIUM: { color: 'var(--warning)', label: 'Medium', bg: 'rgba(234, 179, 8, 0.1)' },
  HIGH: { color: 'var(--danger)', label: 'High', bg: 'rgba(239, 68, 68, 0.1)' },
  CRITICAL: { color: '#dc2626', label: 'Critical', bg: 'rgba(220, 38, 38, 0.15)' },
};

const categoryIcons: Record<string, string> = {
  ACCOUNT: '👤',
  ORDER: '📦',
  DELIVERY: '🚚',
  INVOICE: '📄',
  PAYMENT: '💳',
  QC: '🔬',
  SYSTEM: '⚙️',
  OTHER: '📋',
};

export default function PortalHelpdesk() {
  const navigate = useNavigate();
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState('');
  const [category, setCategory] = useState('');
  const [search, setSearch] = useState('');
  const [selectedTicket, setSelectedTicket] = useState<any>(null);
  const limit = 12;

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

  const clearFilters = () => {
    setStatus('');
    setCategory('');
    setSearch('');
    setPage(1);
  };

  const hasFilters = status || category || search;

  if (isLoading) {
    return (
      <div style={{ padding: '1.5rem' }}>
        <div className="grid" style={{ gridTemplateColumns: 'repeat(4, 1fr)', gap: '1rem', marginBottom: '1.5rem' }}>
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="card skeleton" style={{ height: '100px' }} />
          ))}
        </div>
        <div className="card skeleton" style={{ height: '60px', marginBottom: '1rem' }} />
        <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '1rem' }}>
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="card skeleton" style={{ height: '160px' }} />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.5rem' }}>
        <div>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 600, marginBottom: '0.25rem' }}>Support Tickets</h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', margin: 0 }}>
            View and manage your support requests
          </p>
        </div>
        <Link to="/portal/helpdesk/new" className="btn btn-primary" style={{ background: '#0d9488', borderColor: '#0d9488' }}>
          <Plus size={16} /> New Ticket
        </Link>
      </div>

      <div className="grid" style={{ gridTemplateColumns: 'repeat(4, 1fr)', gap: '1rem', marginBottom: '1.5rem' }}>
        <KpiCard 
          title="Total Tickets" 
          value={stats.total}
          icon={<Ticket size={20} />}
          color="primary"
          onClick={() => { setStatus(''); setPage(1); }}
          active={!status}
        />
        <KpiCard 
          title="Needs Response" 
          value={stats.waitingForYou}
          icon={<AlertCircle size={20} />}
          color="danger"
          onClick={() => { setStatus(status === 'WAITING_FOR_USER' ? '' : 'WAITING_FOR_USER'); setPage(1); }}
          active={status === 'WAITING_FOR_USER'}
        />
        <KpiCard 
          title="Open" 
          value={stats.open}
          icon={<Clock size={20} />}
          color="warning"
          onClick={() => { setStatus(status === 'OPEN' ? '' : 'OPEN'); setPage(1); }}
          active={status === 'OPEN'}
        />
        <KpiCard 
          title="Resolved" 
          value={stats.resolved}
          icon={<CheckCircle size={20} />}
          color="success"
          onClick={() => { setStatus(status === 'RESOLVED' ? '' : 'RESOLVED'); setPage(1); }}
          active={status === 'RESOLVED'}
        />
      </div>

      <div className="card" style={{ padding: '1rem', marginBottom: '1.5rem' }}>
        <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Filter size={18} style={{ color: 'var(--text-muted)' }} />
            <span style={{ fontWeight: 500, color: 'var(--text-muted)' }}>Filters:</span>
          </div>
          <div style={{ position: 'relative', flex: 1, minWidth: '200px', maxWidth: '300px' }}>
            <Search size={16} style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
            <input
              type="text"
              className="form-input"
              placeholder="Search tickets..."
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              style={{ paddingLeft: '2.25rem' }}
            />
          </div>
          <select
            className="form-select"
            style={{ width: 'auto', minWidth: '150px' }}
            value={status}
            onChange={(e) => { setStatus(e.target.value); setPage(1); }}
          >
            {TICKET_STATUSES.map(opt => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
          <select
            className="form-select"
            style={{ width: 'auto', minWidth: '150px' }}
            value={category}
            onChange={(e) => { setCategory(e.target.value); setPage(1); }}
          >
            {TICKET_CATEGORIES.map(opt => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
          {hasFilters && (
            <button className="btn btn-sm btn-secondary" onClick={clearFilters}>
              <X size={14} /> Clear
            </button>
          )}
        </div>
      </div>

      <div className="grid" style={{ gridTemplateColumns: selectedTicket ? '1fr 400px' : '1fr', gap: '1.5rem' }}>
        <div>
          {tickets.length === 0 ? (
            <div className="card" style={{ padding: '3rem' }}>
              <EmptyState
                icon="file"
                title="No tickets found"
                message={hasFilters ? 'Try adjusting your filters' : 'Create your first support ticket to get help'}
              />
            </div>
          ) : (
            <>
              <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '1rem' }}>
                {tickets.map((ticket: any) => {
                  const isSelected = selectedTicket?.id === ticket.id;
                  const style = statusStyles[ticket.status] || statusStyles.OPEN;
                  const priorityStyle = priorityStyles[ticket.priority] || priorityStyles.MEDIUM;
                  
                  return (
                    <div
                      key={ticket.id}
                      className="card"
                      onClick={() => setSelectedTicket(isSelected ? null : ticket)}
                      style={{
                        padding: '1.25rem',
                        cursor: 'pointer',
                        border: isSelected ? '2px solid #0d9488' : '1px solid var(--border)',
                        transition: 'all 0.2s',
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.75rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                          <span style={{ fontSize: '1.25rem' }}>{categoryIcons[ticket.category] || '📋'}</span>
                          <code style={{ fontSize: '0.8125rem', fontWeight: 500, color: 'var(--text-muted)' }}>{ticket.ticketNo}</code>
                        </div>
                        <span 
                          style={{ 
                            padding: '0.25rem 0.625rem',
                            borderRadius: '12px',
                            fontSize: '0.75rem',
                            fontWeight: 500,
                            background: style.bg,
                            color: style.color,
                          }}
                        >
                          {ticket.status.replace(/_/g, ' ')}
                        </span>
                      </div>
                      
                      <h3 style={{ 
                        fontSize: '0.9375rem', 
                        fontWeight: 600, 
                        marginBottom: '0.5rem',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap'
                      }}>
                        {ticket.subject}
                      </h3>
                      
                      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '0.75rem', fontSize: '0.8125rem', color: 'var(--text-muted)' }}>
                        <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                          <Tag size={12} />
                          {ticket.category}
                        </span>
                        <span style={{ 
                          padding: '0.125rem 0.5rem',
                          borderRadius: '8px',
                          fontSize: '0.75rem',
                          fontWeight: 500,
                          background: priorityStyle.bg,
                          color: priorityStyle.color,
                        }}>
                          {priorityStyle.label}
                        </span>
                      </div>
                      
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '0.75rem', borderTop: '1px solid var(--border)' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', fontSize: '0.8125rem', color: 'var(--text-muted)' }}>
                          <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                            <MessageCircle size={14} /> {ticket._count?.messages || 0}
                          </span>
                          <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                            <Paperclip size={14} /> {ticket._count?.attachments || 0}
                          </span>
                        </div>
                        <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                          <Clock size={12} />
                          {format(new Date(ticket.lastActivityAt), 'MMM d, h:mm a')}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
              
              {pagination.total > limit && (
                <div style={{ marginTop: '1.5rem' }}>
                  <Pagination
                    page={page}
                    pageSize={limit}
                    totalCount={pagination.total}
                    onPageChange={setPage}
                  />
                </div>
              )}
            </>
          )}
        </div>

        {selectedTicket && (
          <div className="card" style={{ padding: '1.5rem', position: 'sticky', top: '100px', alignSelf: 'start' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <h3 style={{ fontSize: '1rem', fontWeight: 600, margin: 0 }}>Ticket Details</h3>
              <button 
                onClick={() => setSelectedTicket(null)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '0.25rem' }}
              >
                <X size={18} style={{ color: 'var(--text-muted)' }} />
              </button>
            </div>

            <div style={{ 
              background: 'rgba(13, 148, 136, 0.1)', 
              padding: '1rem', 
              borderRadius: '8px',
              marginBottom: '1.25rem',
              border: '1px solid rgba(13, 148, 136, 0.2)'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                <span style={{ fontSize: '1.5rem' }}>{categoryIcons[selectedTicket.category] || '📋'}</span>
                <code style={{ fontSize: '0.875rem', fontWeight: 500 }}>{selectedTicket.ticketNo}</code>
              </div>
              <h4 style={{ fontSize: '1rem', fontWeight: 600, margin: '0.5rem 0' }}>{selectedTicket.subject}</h4>
            </div>

            <div style={{ display: 'grid', gap: '0.875rem', fontSize: '0.875rem', marginBottom: '1.25rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--text-muted)' }}>Status</span>
                <span 
                  style={{ 
                    padding: '0.125rem 0.5rem',
                    borderRadius: '8px',
                    fontSize: '0.75rem',
                    fontWeight: 500,
                    background: statusStyles[selectedTicket.status]?.bg,
                    color: statusStyles[selectedTicket.status]?.color,
                  }}
                >
                  {selectedTicket.status.replace(/_/g, ' ')}
                </span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--text-muted)' }}>Category</span>
                <span style={{ fontWeight: 500 }}>{selectedTicket.category}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--text-muted)' }}>Priority</span>
                <span style={{ 
                  fontWeight: 500, 
                  color: priorityStyles[selectedTicket.priority]?.color 
                }}>
                  {priorityStyles[selectedTicket.priority]?.label || selectedTicket.priority}
                </span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--text-muted)' }}>Created</span>
                <span style={{ fontWeight: 500 }}>{format(new Date(selectedTicket.createdAt), 'MMM d, yyyy')}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--text-muted)' }}>Last Activity</span>
                <span style={{ fontWeight: 500 }}>{format(new Date(selectedTicket.lastActivityAt), 'MMM d, h:mm a')}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--text-muted)' }}>Messages</span>
                <span style={{ fontWeight: 500 }}>{selectedTicket._count?.messages || 0}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--text-muted)' }}>Attachments</span>
                <span style={{ fontWeight: 500 }}>{selectedTicket._count?.attachments || 0}</span>
              </div>
            </div>

            <button
              className="btn btn-primary"
              onClick={() => navigate(`/portal/helpdesk/${selectedTicket.id}`)}
              style={{ width: '100%', background: '#0d9488', borderColor: '#0d9488' }}
            >
              <ExternalLink size={16} style={{ marginRight: '0.5rem' }} />
              View Full Ticket
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
