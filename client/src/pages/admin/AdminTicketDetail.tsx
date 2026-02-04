import { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../../lib/api';
import { format } from 'date-fns';
import { 
  Ticket, ArrowLeft, Send, Clock, User, 
  MessageCircle, AlertCircle, CheckCircle, ExternalLink,
  Eye, EyeOff, ListTodo, History, Plus, Users, Tag,
  Calendar, Building2, AlertTriangle, Settings
} from 'lucide-react';
import { useAuthStore } from '../../store/authStore';
import { EntityDetailLayout, EntityTab, EntityKpi, EntityMetadata, EntityAction } from '../../components/shared/EntityDetailLayout';
import { TimelineEvent } from '../../components/shared/Timeline';

const statusStyles: Record<string, { color: string; bg: string; label: string }> = {
  NEW: { color: 'var(--info)', bg: 'var(--info-bg)', label: 'New' },
  OPEN: { color: 'var(--primary)', bg: 'var(--primary-bg)', label: 'Open' },
  IN_PROGRESS: { color: 'var(--warning)', bg: 'var(--warning-bg)', label: 'In Progress' },
  WAITING_FOR_USER: { color: 'var(--danger)', bg: 'var(--danger-bg)', label: 'Waiting for User' },
  WAITING_FOR_ADMIN: { color: 'var(--info)', bg: 'var(--info-bg)', label: 'Waiting for Admin' },
  RESOLVED: { color: 'var(--success)', bg: 'var(--success-bg)', label: 'Resolved' },
  CLOSED: { color: 'var(--text-muted)', bg: 'var(--bg-secondary)', label: 'Closed' },
  CANCELLED: { color: 'var(--text-muted)', bg: 'var(--bg-secondary)', label: 'Cancelled' },
};

const TICKET_JOURNEY = [
  { status: 'NEW', label: 'New', icon: Ticket },
  { status: 'OPEN', label: 'Open', icon: Eye },
  { status: 'IN_PROGRESS', label: 'In Progress', icon: Clock },
  { status: 'WAITING_FOR_USER', label: 'Waiting', icon: User },
  { status: 'RESOLVED', label: 'Resolved', icon: CheckCircle },
  { status: 'CLOSED', label: 'Closed', icon: CheckCircle },
];

const STATUSES = ['NEW', 'OPEN', 'IN_PROGRESS', 'WAITING_FOR_USER', 'WAITING_FOR_ADMIN', 'RESOLVED', 'CLOSED', 'CANCELLED'];
const PRIORITIES = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'];
const TEAMS = ['SUPPORT', 'FINANCE', 'LOGISTICS', 'QC', 'IT'];

export default function AdminTicketDetail() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuthStore();
  const queryClient = useQueryClient();
  
  const [replyText, setReplyText] = useState('');
  const [isInternalNote, setIsInternalNote] = useState(false);
  const [showTaskForm, setShowTaskForm] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [taskForm, setTaskForm] = useState({ title: '', description: '', priority: 'MEDIUM', assignedToUserId: '', dueAt: '' });

  const { data: ticket, isLoading, error } = useQuery({
    queryKey: ['admin-ticket', id],
    queryFn: async () => {
      const { data } = await api.get(`/helpdesk/admin/tickets/${id}`);
      return data;
    },
    enabled: !!id,
  });

  const { data: supportUsers } = useQuery({
    queryKey: ['support-users'],
    queryFn: async () => {
      const { data } = await api.get('/helpdesk/admin/support-users');
      return data;
    },
  });

  const updateMutation = useMutation({
    mutationFn: async (updates: any) => {
      const { data } = await api.patch(`/helpdesk/admin/tickets/${id}`, updates);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-ticket', id] });
      queryClient.invalidateQueries({ queryKey: ['admin-tickets'] });
    },
  });

  const replyMutation = useMutation({
    mutationFn: async ({ body, isInternal }: { body: string; isInternal: boolean }) => {
      const endpoint = isInternal ? `/helpdesk/admin/tickets/${id}/internal-note` : `/helpdesk/admin/tickets/${id}/reply`;
      const { data } = await api.post(endpoint, { body });
      return data;
    },
    onSuccess: () => {
      setReplyText('');
      queryClient.invalidateQueries({ queryKey: ['admin-ticket', id] });
    },
  });

  const createTaskMutation = useMutation({
    mutationFn: async (taskData: typeof taskForm) => {
      const { data } = await api.post(`/helpdesk/admin/tickets/${id}/tasks`, taskData);
      return data;
    },
    onSuccess: () => {
      setShowTaskForm(false);
      setTaskForm({ title: '', description: '', priority: 'MEDIUM', assignedToUserId: '', dueAt: '' });
      queryClient.invalidateQueries({ queryKey: ['admin-ticket', id] });
    },
  });

  const updateTaskMutation = useMutation({
    mutationFn: async ({ taskId, updates }: { taskId: string; updates: any }) => {
      const { data } = await api.patch(`/helpdesk/admin/tasks/${taskId}`, updates);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-ticket', id] });
    },
  });

  const handleReply = (e: React.FormEvent) => {
    e.preventDefault();
    if (!replyText.trim()) return;
    replyMutation.mutate({ body: replyText, isInternal: isInternalNote });
  };

  const handleCreateTask = (e: React.FormEvent) => {
    e.preventDefault();
    if (!taskForm.title.trim()) return;
    createTaskMutation.mutate(taskForm);
  };

  if (isLoading) {
    return (
      <div className="loading-overlay">
        <div className="spinner" />
      </div>
    );
  }

  if (error || !ticket) {
    return (
      <div style={{ padding: '2rem' }}>
        <Link to="/admin/helpdesk" className="btn btn-secondary btn-sm" style={{ marginBottom: '1rem' }}>
          <ArrowLeft size={16} />
          Back to Tickets
        </Link>
        <div className="card" style={{ padding: '2rem', textAlign: 'center' }}>
          <AlertCircle size={48} style={{ color: 'var(--danger)', marginBottom: '1rem' }} />
          <h2>Ticket not found</h2>
        </div>
      </div>
    );
  }

  const statusInfo = statusStyles[ticket.status] || statusStyles.NEW;
  const isOpen = !['CLOSED', 'CANCELLED'].includes(ticket.status);

  const getCurrentStepIndex = () => {
    if (['CANCELLED'].includes(ticket.status)) return -1;
    if (ticket.status === 'WAITING_FOR_ADMIN') return 3;
    return TICKET_JOURNEY.findIndex(s => s.status === ticket.status);
  };

  const currentStepIndex = getCurrentStepIndex();

  const ConversationContent = (
    <>
      <div style={{ marginBottom: '1.5rem', paddingBottom: '1.5rem', borderBottom: '1px solid var(--border)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
          <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: 'var(--primary)', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.875rem', fontWeight: 600 }}>
            {ticket.requesterUser?.firstName?.[0]}{ticket.requesterUser?.lastName?.[0]}
          </div>
          <div style={{ flex: 1 }}>
            <strong>{ticket.requesterUser?.firstName} {ticket.requesterUser?.lastName}</strong>
            <span className="badge badge-primary" style={{ marginLeft: '0.5rem', fontSize: '0.7rem' }}>Requester</span>
            <div style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>
              {format(new Date(ticket.createdAt), 'MMM d, yyyy h:mm a')}
            </div>
          </div>
        </div>
        <div style={{ marginLeft: '48px', whiteSpace: 'pre-wrap', lineHeight: 1.6 }}>{ticket.description}</div>
      </div>

      {ticket.messages?.map((msg: any) => {
        const isInternal = msg.visibility === 'INTERNAL';
        return (
          <div 
            key={msg.id} 
            style={{ 
              marginBottom: '1.5rem', 
              paddingBottom: '1.5rem', 
              borderBottom: '1px solid var(--border)',
              background: isInternal ? 'var(--warning-bg)' : 'transparent',
              padding: isInternal ? '1rem' : '0 0 1.5rem 0',
              borderRadius: isInternal ? '8px' : 0,
              marginLeft: isInternal ? '-0.5rem' : 0,
              marginRight: isInternal ? '-0.5rem' : 0,
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
              <div style={{ 
                width: '40px', 
                height: '40px', 
                borderRadius: '50%', 
                background: isInternal ? 'var(--warning)' : 'var(--success)', 
                color: 'white', 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'center', 
                fontSize: '0.875rem', 
                fontWeight: 600 
              }}>
                {msg.createdByUser?.firstName?.[0]}{msg.createdByUser?.lastName?.[0]}
              </div>
              <div style={{ flex: 1 }}>
                <strong>{msg.createdByUser?.firstName} {msg.createdByUser?.lastName}</strong>
                {isInternal && (
                  <span className="badge" style={{ marginLeft: '0.5rem', background: 'var(--warning)', color: 'white', fontSize: '0.7rem' }}>
                    <EyeOff size={10} style={{ marginRight: '0.25rem' }} />
                    Internal
                  </span>
                )}
                <div style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>
                  {format(new Date(msg.createdAt), 'MMM d, yyyy h:mm a')}
                </div>
              </div>
            </div>
            <div style={{ marginLeft: '48px', whiteSpace: 'pre-wrap', lineHeight: 1.6 }}>{msg.body}</div>
          </div>
        );
      })}

      {isOpen && (
        <form onSubmit={handleReply} style={{ marginTop: '1rem' }}>
          <div style={{ marginBottom: '0.75rem', display: 'flex', gap: '1.5rem' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
              <input type="radio" checked={!isInternalNote} onChange={() => setIsInternalNote(false)} />
              <Eye size={16} />
              Public Reply
            </label>
            <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
              <input type="radio" checked={isInternalNote} onChange={() => setIsInternalNote(true)} />
              <EyeOff size={16} />
              Internal Note
            </label>
          </div>
          <textarea
            className="form-input"
            rows={4}
            placeholder={isInternalNote ? "Add an internal note (hidden from customer)..." : "Type your reply to the customer..."}
            value={replyText}
            onChange={(e) => setReplyText(e.target.value)}
            style={{ resize: 'vertical', minHeight: '100px', background: isInternalNote ? 'var(--warning-bg)' : undefined }}
          />
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '0.75rem' }}>
            <button 
              type="submit" 
              className={`btn ${isInternalNote ? 'btn-warning' : 'btn-primary'}`}
              disabled={!replyText.trim() || replyMutation.isPending}
            >
              <Send size={16} />
              {replyMutation.isPending ? 'Sending...' : isInternalNote ? 'Add Note' : 'Send Reply'}
            </button>
          </div>
        </form>
      )}
    </>
  );

  const TasksContent = (
    <>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
        <h3 style={{ margin: 0, fontSize: '1rem' }}>Tasks</h3>
        <button className="btn btn-sm btn-primary" onClick={() => setShowTaskForm(true)}>
          <Plus size={16} /> Add Task
        </button>
      </div>

      {showTaskForm && (
        <form onSubmit={handleCreateTask} className="card" style={{ padding: '1rem', marginBottom: '1rem', background: 'var(--bg-secondary)' }}>
          <div style={{ display: 'grid', gap: '0.75rem' }}>
            <input
              type="text"
              className="form-input"
              placeholder="Task title"
              value={taskForm.title}
              onChange={(e) => setTaskForm({ ...taskForm, title: e.target.value })}
            />
            <textarea
              className="form-input"
              placeholder="Description (optional)"
              rows={2}
              value={taskForm.description}
              onChange={(e) => setTaskForm({ ...taskForm, description: e.target.value })}
            />
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.75rem' }}>
              <select className="form-input" value={taskForm.priority} onChange={(e) => setTaskForm({ ...taskForm, priority: e.target.value })}>
                {PRIORITIES.map(p => <option key={p} value={p}>{p}</option>)}
              </select>
              <select className="form-input" value={taskForm.assignedToUserId} onChange={(e) => setTaskForm({ ...taskForm, assignedToUserId: e.target.value })}>
                <option value="">Unassigned</option>
                {supportUsers?.map((u: any) => (
                  <option key={u.id} value={u.id}>{u.firstName} {u.lastName}</option>
                ))}
              </select>
              <input type="date" className="form-input" value={taskForm.dueAt} onChange={(e) => setTaskForm({ ...taskForm, dueAt: e.target.value })} />
            </div>
            <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
              <button type="button" className="btn btn-sm" onClick={() => setShowTaskForm(false)}>Cancel</button>
              <button type="submit" className="btn btn-sm btn-primary" disabled={createTaskMutation.isPending}>
                {createTaskMutation.isPending ? 'Creating...' : 'Create Task'}
              </button>
            </div>
          </div>
        </form>
      )}

      {ticket.tasks?.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>
          <ListTodo size={32} style={{ opacity: 0.5, marginBottom: '0.5rem' }} />
          <p>No tasks yet</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          {ticket.tasks?.map((task: any) => (
            <div 
              key={task.id} 
              style={{ 
                padding: '1rem', 
                border: '1px solid var(--border)', 
                borderRadius: '8px',
                background: task.status === 'DONE' ? 'var(--success-bg)' : 'var(--bg-primary)',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 500, textDecoration: task.status === 'DONE' ? 'line-through' : 'none' }}>
                    {task.title}
                  </div>
                  {task.description && (
                    <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
                      {task.description}
                    </div>
                  )}
                  <div style={{ display: 'flex', gap: '1rem', marginTop: '0.5rem', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                    {task.assignedToUser && (
                      <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}><User size={12} /> {task.assignedToUser.firstName} {task.assignedToUser.lastName}</span>
                    )}
                    {task.dueAt && (
                      <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}><Clock size={12} /> Due {format(new Date(task.dueAt), 'MMM d')}</span>
                    )}
                  </div>
                </div>
                <select
                  className="form-input"
                  value={task.status}
                  onChange={(e) => updateTaskMutation.mutate({ taskId: task.id, updates: { status: e.target.value } })}
                  style={{ width: 'auto', fontSize: '0.8rem', padding: '0.25rem 0.5rem' }}
                >
                  <option value="TODO">To Do</option>
                  <option value="IN_PROGRESS">In Progress</option>
                  <option value="DONE">Done</option>
                  <option value="BLOCKED">Blocked</option>
                </select>
              </div>
            </div>
          ))}
        </div>
      )}
    </>
  );

  const DetailsContent = (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
      <div className="card" style={{ padding: '1.5rem' }}>
        <h4 style={{ margin: '0 0 1rem 0', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <User size={18} />
          Requester Information
        </h4>
        <div style={{ display: 'flex', gap: '1rem', alignItems: 'flex-start' }}>
          <div style={{ width: '56px', height: '56px', borderRadius: '50%', background: 'var(--primary-light)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--primary)', fontWeight: 600, fontSize: '1.25rem' }}>
            {ticket.requesterUser?.firstName?.[0]}{ticket.requesterUser?.lastName?.[0]}
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 600, marginBottom: '0.25rem' }}>{ticket.requesterUser?.firstName} {ticket.requesterUser?.lastName}</div>
            <div style={{ fontSize: '0.875rem', color: 'var(--text-muted)', marginBottom: '0.25rem' }}>{ticket.requesterUser?.email}</div>
            {ticket.customer && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
                <Building2 size={14} />
                {ticket.customer.name}
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="card" style={{ padding: '1.5rem' }}>
        <h4 style={{ margin: '0 0 1rem 0', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Tag size={18} />
          Ticket Properties
        </h4>
        <div style={{ display: 'grid', gap: '0.75rem', fontSize: '0.9rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span style={{ color: 'var(--text-muted)' }}>Category</span>
            <strong>{ticket.category}</strong>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span style={{ color: 'var(--text-muted)' }}>Priority</span>
            <span className={`badge badge-${ticket.priority === 'HIGH' || ticket.priority === 'CRITICAL' ? 'danger' : ticket.priority === 'LOW' ? 'secondary' : 'warning'}`}>{ticket.priority}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span style={{ color: 'var(--text-muted)' }}>Team</span>
            <strong>{ticket.assignedTeam || 'Unassigned'}</strong>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span style={{ color: 'var(--text-muted)' }}>Assigned To</span>
            <strong>{ticket.assignedToUser ? `${ticket.assignedToUser.firstName} ${ticket.assignedToUser.lastName}` : 'Unassigned'}</strong>
          </div>
        </div>
      </div>

      <div className="card" style={{ padding: '1.5rem' }}>
        <h4 style={{ margin: '0 0 1rem 0', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Clock size={18} />
          SLA Tracking
        </h4>
        <div style={{ display: 'grid', gap: '0.75rem', fontSize: '0.9rem' }}>
          {ticket.slaResponseDueAt && (
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ color: 'var(--text-muted)' }}>Response Due</span>
              <span style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: ticket.slaResponseMet === false ? 'var(--danger)' : ticket.slaResponseMet ? 'var(--success)' : 'inherit' }}>
                {format(new Date(ticket.slaResponseDueAt), 'MMM d, h:mm a')}
                {ticket.slaResponseMet === true && <CheckCircle size={14} />}
                {ticket.slaResponseMet === false && <AlertCircle size={14} />}
              </span>
            </div>
          )}
          {ticket.slaResolveDueAt && (
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ color: 'var(--text-muted)' }}>Resolution Due</span>
              <span style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: ticket.slaResolveMet === false ? 'var(--danger)' : ticket.slaResolveMet ? 'var(--success)' : 'inherit' }}>
                {format(new Date(ticket.slaResolveDueAt), 'MMM d, h:mm a')}
                {ticket.slaResolveMet === true && <CheckCircle size={14} />}
                {ticket.slaResolveMet === false && <AlertCircle size={14} />}
              </span>
            </div>
          )}
          {!ticket.slaResponseDueAt && !ticket.slaResolveDueAt && (
            <div style={{ color: 'var(--text-muted)', textAlign: 'center', padding: '1rem' }}>No SLA configured</div>
          )}
        </div>
      </div>

      <div className="card" style={{ padding: '1.5rem' }}>
        <h4 style={{ margin: '0 0 1rem 0', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Calendar size={18} />
          Timeline
        </h4>
        <div style={{ display: 'grid', gap: '0.75rem', fontSize: '0.9rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span style={{ color: 'var(--text-muted)' }}>Created</span>
            <span>{format(new Date(ticket.createdAt), 'MMM d, yyyy h:mm a')}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span style={{ color: 'var(--text-muted)' }}>Last Activity</span>
            <span>{format(new Date(ticket.lastActivityAt), 'MMM d, yyyy h:mm a')}</span>
          </div>
          {ticket.closedAt && (
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: 'var(--text-muted)' }}>Closed</span>
              <span>{format(new Date(ticket.closedAt), 'MMM d, yyyy h:mm a')}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );

  const tabs: EntityTab[] = [
    { key: 'conversation', label: 'Conversation', icon: <MessageCircle size={16} />, content: ConversationContent, badge: ticket.messages?.length || 0 },
    { key: 'tasks', label: 'Tasks', icon: <ListTodo size={16} />, content: TasksContent, badge: ticket.tasks?.length || 0 },
    { key: 'details', label: 'Details', icon: <Tag size={16} />, content: DetailsContent },
  ];

  const kpis: EntityKpi[] = [
    { title: 'Messages', value: ticket.messages?.length || 0, icon: <MessageCircle size={20} />, color: 'primary' },
    { title: 'Tasks', value: ticket.tasks?.length || 0, icon: <ListTodo size={20} />, color: 'info' },
    { title: 'Open Tasks', value: ticket.tasks?.filter((t: any) => t.status !== 'DONE').length || 0, icon: <Clock size={20} />, color: 'warning' },
    { title: 'Events', value: ticket.events?.length || 0, icon: <History size={20} />, color: 'default' },
  ];

  const metadata: EntityMetadata[] = [
    { label: 'Category', value: ticket.category },
    { label: 'Priority', value: ticket.priority },
    { label: 'Requester', value: `${ticket.requesterUser?.firstName} ${ticket.requesterUser?.lastName}` },
  ];

  const timelineEvents: TimelineEvent[] = (ticket.events || []).map((event: any) => ({
    id: event.id,
    title: event.eventType.replace(/_/g, ' '),
    description: event.newValueJson ? JSON.stringify(event.newValueJson) : undefined,
    timestamp: event.createdAt,
    user: event.actorUser ? `${event.actorUser.firstName} ${event.actorUser.lastName}` : undefined,
    type: event.eventType === 'CREATED' ? 'success' : event.eventType === 'STATUS_CHANGED' ? 'info' : 'default',
  }));

  const actions: EntityAction[] = [
    { 
      label: 'Settings', 
      icon: <Settings size={16} />, 
      onClick: () => setShowSettings(!showSettings),
      variant: 'secondary'
    },
  ];

  return (
    <>
      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1.5rem' }}>
        <Link to="/admin/helpdesk" className="btn btn-secondary btn-sm">
          <ArrowLeft size={16} />
        </Link>
        <div style={{ flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.25rem' }}>
            <Ticket size={24} style={{ color: 'var(--primary)' }} />
            <code style={{ fontSize: '1rem', fontWeight: 600 }}>{ticket.ticketNo}</code>
            <span className="badge" style={{ background: statusInfo.bg, color: statusInfo.color, fontWeight: 500 }}>
              {statusInfo.label}
            </span>
          </div>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 600, margin: 0 }}>{ticket.subject}</h2>
        </div>
        {actions.map((action, i) => (
          <button key={i} className={`btn btn-${action.variant || 'secondary'}`} onClick={action.onClick}>
            {action.icon}
            {action.label}
          </button>
        ))}
      </div>

      <div className="card" style={{ marginBottom: '1.5rem', padding: '1.5rem' }}>
        <h3 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '1.5rem' }}>Ticket Journey</h3>
        
        {['CANCELLED'].includes(ticket.status) && (
          <div style={{ 
            backgroundColor: 'var(--bg-secondary)', 
            padding: '1rem', 
            borderRadius: 'var(--radius)', 
            marginBottom: '1.5rem',
            display: 'flex',
            alignItems: 'center',
            gap: '0.75rem',
          }}>
            <AlertTriangle size={20} color="var(--text-muted)" />
            <div style={{ fontWeight: 500, color: 'var(--text-muted)' }}>Ticket Cancelled</div>
          </div>
        )}

        <div style={{ display: 'flex', justifyContent: 'space-between', position: 'relative', marginBottom: '1rem' }}>
          <div style={{
            position: 'absolute',
            top: '20px',
            left: '40px',
            right: '40px',
            height: '2px',
            backgroundColor: 'var(--border)',
            zIndex: 0,
          }} />
          <div style={{
            position: 'absolute',
            top: '20px',
            left: '40px',
            width: currentStepIndex >= 0 ? `${(currentStepIndex / (TICKET_JOURNEY.length - 1)) * 100}%` : '0%',
            maxWidth: 'calc(100% - 80px)',
            height: '2px',
            backgroundColor: 'var(--primary)',
            zIndex: 1,
            transition: 'width 0.3s ease',
          }} />
          
          {TICKET_JOURNEY.map((step, index) => {
            const isCompleted = currentStepIndex >= index;
            const isCurrent = currentStepIndex === index;
            const Icon = step.icon;
            
            return (
              <div key={step.status} style={{ 
                display: 'flex', 
                flexDirection: 'column', 
                alignItems: 'center',
                zIndex: 2,
                flex: 1,
              }}>
                <div style={{
                  width: '40px',
                  height: '40px',
                  borderRadius: '50%',
                  backgroundColor: isCompleted ? 'var(--primary)' : 'var(--bg-secondary)',
                  border: isCurrent ? '3px solid var(--primary)' : '2px solid var(--border)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: isCompleted ? 'white' : 'var(--text-muted)',
                  transition: 'all 0.3s ease',
                }}>
                  <Icon size={18} />
                </div>
                <div style={{
                  marginTop: '0.5rem',
                  fontSize: '0.75rem',
                  fontWeight: isCurrent ? 600 : 400,
                  color: isCompleted ? 'var(--text-primary)' : 'var(--text-muted)',
                  textAlign: 'center',
                }}>
                  {step.label}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: showSettings ? '1fr 320px' : '1fr', gap: '1.5rem' }}>
        <div>
          <div style={{ 
            display: 'grid', 
            gridTemplateColumns: 'repeat(4, 1fr)', 
            gap: '1rem', 
            marginBottom: '1.5rem' 
          }}>
            {kpis.map((kpi, i) => (
              <div key={i} className="card" style={{ padding: '1rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
                <div style={{ 
                  width: '48px', 
                  height: '48px', 
                  borderRadius: '12px', 
                  background: `var(--${kpi.color}-bg)`, 
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'center',
                  color: `var(--${kpi.color})`
                }}>
                  {kpi.icon}
                </div>
                <div>
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{kpi.title}</div>
                  <div style={{ fontSize: '1.5rem', fontWeight: 600 }}>{kpi.value}</div>
                </div>
              </div>
            ))}
          </div>

          <div className="card" style={{ marginBottom: '1.5rem' }}>
            <div style={{ 
              display: 'flex', 
              borderBottom: '1px solid var(--border)', 
              overflowX: 'auto',
              gap: '0'
            }}>
              {tabs.map(tab => (
                <button
                  key={tab.key}
                  onClick={() => {}}
                  className={tab.key === 'conversation' ? 'active' : ''}
                  style={{
                    padding: '0.875rem 1.25rem',
                    border: 'none',
                    background: 'transparent',
                    borderBottom: '2px solid var(--primary)',
                    color: 'var(--primary)',
                    fontWeight: 600,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                    whiteSpace: 'nowrap',
                    fontSize: '0.875rem',
                  }}
                  id={`tab-${tab.key}`}
                >
                  {tab.icon}
                  {tab.label}
                  {tab.badge !== undefined && tab.badge > 0 && (
                    <span className="badge badge-primary" style={{ fontSize: '0.75rem' }}>{tab.badge}</span>
                  )}
                </button>
              ))}
            </div>
            <div style={{ padding: '1.5rem' }}>
              {ConversationContent}
            </div>
          </div>
        </div>

        {showSettings && (
          <div>
            <div className="card" style={{ padding: '1rem', marginBottom: '1rem' }}>
              <h4 style={{ margin: '0 0 1rem 0', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Settings size={16} />
                Ticket Settings
              </h4>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <div>
                  <label className="form-label">Status</label>
                  <select
                    className="form-input"
                    value={ticket.status}
                    onChange={(e) => updateMutation.mutate({ status: e.target.value })}
                    disabled={updateMutation.isPending}
                  >
                    {STATUSES.map(s => (
                      <option key={s} value={s}>{s.replace(/_/g, ' ')}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="form-label">Priority</label>
                  <select
                    className="form-input"
                    value={ticket.priority}
                    onChange={(e) => updateMutation.mutate({ priority: e.target.value })}
                    disabled={updateMutation.isPending}
                  >
                    {PRIORITIES.map(p => (
                      <option key={p} value={p}>{p}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="form-label">Assigned To</label>
                  <select
                    className="form-input"
                    value={ticket.assignedToUserId || ''}
                    onChange={(e) => updateMutation.mutate({ assignedToUserId: e.target.value || null })}
                    disabled={updateMutation.isPending}
                  >
                    <option value="">Unassigned</option>
                    {supportUsers?.map((u: any) => (
                      <option key={u.id} value={u.id}>{u.firstName} {u.lastName}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="form-label">Team</label>
                  <select
                    className="form-input"
                    value={ticket.assignedTeam || ''}
                    onChange={(e) => updateMutation.mutate({ assignedTeam: e.target.value || null })}
                    disabled={updateMutation.isPending}
                  >
                    <option value="">No Team</option>
                    {TEAMS.map(t => (
                      <option key={t} value={t}>{t}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            <div className="card" style={{ padding: '1rem' }}>
              <h4 style={{ margin: '0 0 1rem 0' }}>Quick Info</h4>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', fontSize: '0.9rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: 'var(--text-muted)' }}>Category</span>
                  <strong>{ticket.category}</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: 'var(--text-muted)' }}>Created</span>
                  <span>{format(new Date(ticket.createdAt), 'MMM d, yyyy')}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: 'var(--text-muted)' }}>Last Activity</span>
                  <span>{format(new Date(ticket.lastActivityAt), 'MMM d, h:mm a')}</span>
                </div>
                {ticket.relatedEntityType && ticket.relatedEntityId && (
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: 'var(--text-muted)' }}>Related {ticket.relatedEntityType}</span>
                    <Link to={`/${ticket.relatedEntityType.toLowerCase()}s/${ticket.relatedEntityId}`} style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                      View <ExternalLink size={12} />
                    </Link>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
