import { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../../lib/api';
import { format } from 'date-fns';
import { 
  Ticket, ArrowLeft, Send, Paperclip, Clock, User, 
  MessageCircle, AlertCircle, CheckCircle, FileText, ExternalLink 
} from 'lucide-react';
import { useAuthStore } from '../../store/authStore';

const statusStyles: Record<string, { color: string; bg: string; label: string }> = {
  NEW: { color: 'var(--info)', bg: 'var(--info-bg)', label: 'New' },
  OPEN: { color: 'var(--primary)', bg: 'var(--primary-bg)', label: 'Open' },
  IN_PROGRESS: { color: 'var(--warning)', bg: 'var(--warning-bg)', label: 'In Progress' },
  WAITING_FOR_USER: { color: 'var(--danger)', bg: 'var(--danger-bg)', label: 'Waiting for Your Reply' },
  WAITING_FOR_ADMIN: { color: 'var(--info)', bg: 'var(--info-bg)', label: 'Waiting for Support' },
  RESOLVED: { color: 'var(--success)', bg: 'var(--success-bg)', label: 'Resolved' },
  CLOSED: { color: 'var(--text-muted)', bg: 'var(--bg-secondary)', label: 'Closed' },
  CANCELLED: { color: 'var(--text-muted)', bg: 'var(--bg-secondary)', label: 'Cancelled' },
};

const priorityLabels: Record<string, string> = {
  LOW: 'Low',
  MEDIUM: 'Medium',
  HIGH: 'High',
  CRITICAL: 'Critical',
};

export default function PortalTicketDetail() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuthStore();
  const queryClient = useQueryClient();
  const [replyText, setReplyText] = useState('');

  const { data: ticket, isLoading, error } = useQuery({
    queryKey: ['portal-ticket', id],
    queryFn: async () => {
      const { data } = await api.get(`/helpdesk/tickets/${id}`);
      return data;
    },
    enabled: !!id,
  });

  const replyMutation = useMutation({
    mutationFn: async (body: string) => {
      const { data } = await api.post(`/helpdesk/tickets/${id}/reply`, { body });
      return data;
    },
    onSuccess: () => {
      setReplyText('');
      queryClient.invalidateQueries({ queryKey: ['portal-ticket', id] });
      queryClient.invalidateQueries({ queryKey: ['portal-tickets'] });
    },
  });

  const handleReply = (e: React.FormEvent) => {
    e.preventDefault();
    if (!replyText.trim()) return;
    replyMutation.mutate(replyText);
  };

  if (isLoading) {
    return (
      <div style={{ padding: '2rem', textAlign: 'center' }}>
        <div className="spinner" />
        Loading ticket...
      </div>
    );
  }

  if (error || !ticket) {
    return (
      <div style={{ padding: '2rem' }}>
        <Link to="/portal/helpdesk" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-muted)', marginBottom: '1rem', textDecoration: 'none' }}>
          <ArrowLeft size={18} />
          Back to My Tickets
        </Link>
        <div className="card" style={{ padding: '2rem', textAlign: 'center' }}>
          <AlertCircle size={48} style={{ color: 'var(--danger)', marginBottom: '1rem' }} />
          <h2>Ticket not found</h2>
          <p style={{ color: 'var(--text-muted)' }}>This ticket may not exist or you don't have access to view it.</p>
        </div>
      </div>
    );
  }

  const isOpen = !['CLOSED', 'CANCELLED', 'RESOLVED'].includes(ticket.status);
  const statusInfo = statusStyles[ticket.status] || statusStyles.NEW;

  return (
    <div style={{ padding: '1.5rem', maxWidth: '1000px', margin: '0 auto' }}>
      <Link to="/portal/helpdesk" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-muted)', marginBottom: '1rem', textDecoration: 'none' }}>
        <ArrowLeft size={18} />
        Back to My Tickets
      </Link>

      <div className="card" style={{ marginBottom: '1.5rem' }}>
        <div style={{ padding: '1.5rem', borderBottom: '1px solid var(--border)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '1rem', flexWrap: 'wrap' }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.5rem' }}>
                <Ticket size={24} style={{ color: 'var(--primary)' }} />
                <code style={{ fontSize: '1rem', fontWeight: 600 }}>{ticket.ticketNo}</code>
                <span 
                  className="badge" 
                  style={{ background: statusInfo.bg, color: statusInfo.color, fontWeight: 500 }}
                >
                  {statusInfo.label}
                </span>
              </div>
              <h1 style={{ margin: 0, fontSize: '1.25rem' }}>{ticket.subject}</h1>
            </div>
            <div style={{ textAlign: 'right', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
              <div>Created {format(new Date(ticket.createdAt), 'MMM d, yyyy h:mm a')}</div>
              <div>Last update {format(new Date(ticket.lastActivityAt), 'MMM d, yyyy h:mm a')}</div>
            </div>
          </div>
        </div>

        <div style={{ padding: '1rem 1.5rem', background: 'var(--bg-secondary)', display: 'flex', gap: '2rem', flexWrap: 'wrap', fontSize: '0.9rem' }}>
          <div>
            <span style={{ color: 'var(--text-muted)' }}>Category:</span>{' '}
            <strong>{ticket.category}</strong>
          </div>
          <div>
            <span style={{ color: 'var(--text-muted)' }}>Priority:</span>{' '}
            <strong>{priorityLabels[ticket.priority] || ticket.priority}</strong>
          </div>
          {ticket.assignedToUser && (
            <div>
              <span style={{ color: 'var(--text-muted)' }}>Assigned to:</span>{' '}
              <strong>{ticket.assignedToUser.firstName} {ticket.assignedToUser.lastName}</strong>
            </div>
          )}
          {ticket.relatedEntityType && ticket.relatedEntityId && (
            <div>
              <span style={{ color: 'var(--text-muted)' }}>Related {ticket.relatedEntityType}:</span>{' '}
              <Link to={`/portal/${ticket.relatedEntityType.toLowerCase()}s/${ticket.relatedEntityId}`} style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}>
                View <ExternalLink size={12} />
              </Link>
            </div>
          )}
        </div>
      </div>

      {ticket.status === 'WAITING_FOR_USER' && (
        <div className="alert alert-warning" style={{ marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <AlertCircle size={18} />
          <span>Support is waiting for your response. Please reply below.</span>
        </div>
      )}

      <div className="card" style={{ marginBottom: '1.5rem' }}>
        <div style={{ padding: '1rem 1.5rem', borderBottom: '1px solid var(--border)', fontWeight: 500, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <MessageCircle size={18} />
          Conversation
        </div>

        <div style={{ padding: '1.5rem' }}>
          <div style={{ marginBottom: '1.5rem', paddingBottom: '1.5rem', borderBottom: '1px solid var(--border)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
              <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: 'var(--primary)', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.8rem', fontWeight: 600 }}>
                {ticket.requesterUser?.firstName?.[0]}{ticket.requesterUser?.lastName?.[0]}
              </div>
              <div>
                <strong>{ticket.requesterUser?.firstName} {ticket.requesterUser?.lastName}</strong>
                <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem', marginLeft: '0.5rem' }}>
                  (You) • {format(new Date(ticket.createdAt), 'MMM d, h:mm a')}
                </span>
              </div>
            </div>
            <div style={{ marginLeft: '40px', whiteSpace: 'pre-wrap' }}>
              {ticket.description}
            </div>
            {ticket.attachments?.filter((a: any) => !a.messageId).length > 0 && (
              <div style={{ marginLeft: '40px', marginTop: '1rem' }}>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.5rem' }}>
                  <Paperclip size={12} /> Attachments
                </div>
                <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                  {ticket.attachments.filter((a: any) => !a.messageId).map((att: any) => (
                    <a 
                      key={att.id} 
                      href={att.fileUrl} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="btn btn-sm"
                      style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}
                    >
                      <FileText size={14} />
                      {att.fileName}
                    </a>
                  ))}
                </div>
              </div>
            )}
          </div>

          {ticket.messages?.map((msg: any) => {
            const isMe = msg.createdByUserId === user?.id;
            return (
              <div 
                key={msg.id} 
                style={{ 
                  marginBottom: '1.5rem', 
                  paddingBottom: '1.5rem', 
                  borderBottom: '1px solid var(--border)',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                  <div 
                    style={{ 
                      width: '32px', 
                      height: '32px', 
                      borderRadius: '50%', 
                      background: isMe ? 'var(--primary)' : 'var(--success)', 
                      color: 'white', 
                      display: 'flex', 
                      alignItems: 'center', 
                      justifyContent: 'center', 
                      fontSize: '0.8rem', 
                      fontWeight: 600 
                    }}
                  >
                    {msg.createdByUser?.firstName?.[0]}{msg.createdByUser?.lastName?.[0]}
                  </div>
                  <div>
                    <strong>{msg.createdByUser?.firstName} {msg.createdByUser?.lastName}</strong>
                    {isMe && <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem', marginLeft: '0.25rem' }}>(You)</span>}
                    {!isMe && <span className="badge" style={{ marginLeft: '0.5rem', background: 'var(--success-bg)', color: 'var(--success)', fontSize: '0.7rem' }}>Support</span>}
                    <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem', marginLeft: '0.5rem' }}>
                      • {format(new Date(msg.createdAt), 'MMM d, h:mm a')}
                    </span>
                  </div>
                </div>
                <div style={{ marginLeft: '40px', whiteSpace: 'pre-wrap' }}>
                  {msg.body}
                </div>
                {msg.attachments?.length > 0 && (
                  <div style={{ marginLeft: '40px', marginTop: '1rem' }}>
                    <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                      {msg.attachments.map((att: any) => (
                        <a 
                          key={att.id} 
                          href={att.fileUrl} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="btn btn-sm"
                          style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}
                        >
                          <FileText size={14} />
                          {att.fileName}
                        </a>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            );
          })}

          {ticket.messages?.length === 0 && (
            <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>
              <Clock size={32} style={{ marginBottom: '0.5rem', opacity: 0.5 }} />
              <p>No replies yet. Our support team will respond shortly.</p>
            </div>
          )}
        </div>
      </div>

      {isOpen ? (
        <div className="card">
          <form onSubmit={handleReply} style={{ padding: '1.5rem' }}>
            <div style={{ marginBottom: '1rem' }}>
              <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Send size={16} />
                Your Reply
              </label>
              <textarea
                className="form-input"
                rows={4}
                placeholder="Type your message here..."
                value={replyText}
                onChange={(e) => setReplyText(e.target.value)}
                style={{ resize: 'vertical', minHeight: '100px' }}
              />
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <button 
                type="submit" 
                className="btn btn-primary"
                disabled={!replyText.trim() || replyMutation.isPending}
                style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}
              >
                <Send size={16} />
                {replyMutation.isPending ? 'Sending...' : 'Send Reply'}
              </button>
            </div>
          </form>
        </div>
      ) : (
        <div className="card" style={{ padding: '1.5rem', textAlign: 'center', background: 'var(--bg-secondary)' }}>
          <CheckCircle size={32} style={{ color: 'var(--success)', marginBottom: '0.5rem' }} />
          <p style={{ margin: 0, color: 'var(--text-muted)' }}>
            This ticket is {ticket.status.toLowerCase()}. If you need further assistance, please create a new ticket.
          </p>
        </div>
      )}
    </div>
  );
}
