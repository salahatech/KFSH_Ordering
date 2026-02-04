import { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../../lib/api';
import { format } from 'date-fns';
import { 
  Ticket, ArrowLeft, Send, Clock, User, 
  MessageCircle, AlertCircle, CheckCircle, ExternalLink,
  Eye, EyeOff, ListTodo, Plus, Users, Tag,
  Calendar, Building2, AlertTriangle, Settings,
  Mail, Phone, FolderOpen, Flag, UserCheck
} from 'lucide-react';
import { useAuthStore } from '../../store/authStore';

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

const priorityStyles: Record<string, { color: string; bg: string }> = {
  LOW: { color: 'var(--text-muted)', bg: 'var(--bg-secondary)' },
  MEDIUM: { color: 'var(--warning)', bg: 'var(--warning-bg)' },
  HIGH: { color: 'var(--danger)', bg: 'var(--danger-bg)' },
  CRITICAL: { color: 'white', bg: 'var(--danger)' },
};

const STATUSES = ['NEW', 'OPEN', 'IN_PROGRESS', 'WAITING_FOR_USER', 'WAITING_FOR_ADMIN', 'RESOLVED', 'CLOSED', 'CANCELLED'];
const PRIORITIES = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'];
const TEAMS = ['SUPPORT', 'FINANCE', 'LOGISTICS', 'QC', 'IT'];

export default function AdminTicketDetail() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuthStore();
  const queryClient = useQueryClient();
  
  const [activeTab, setActiveTab] = useState<'conversation' | 'tasks'>('conversation');
  const [replyText, setReplyText] = useState('');
  const [isInternalNote, setIsInternalNote] = useState(false);
  const [showTaskForm, setShowTaskForm] = useState(false);
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
          <ArrowLeft size={16} /> Back to Tickets
        </Link>
        <div className="card" style={{ padding: '2rem', textAlign: 'center' }}>
          <AlertCircle size={48} style={{ color: 'var(--danger)', marginBottom: '1rem' }} />
          <h2>Ticket not found</h2>
        </div>
      </div>
    );
  }

  const statusInfo = statusStyles[ticket.status] || statusStyles.NEW;
  const priorityInfo = priorityStyles[ticket.priority] || priorityStyles.MEDIUM;
  const isOpen = !['CLOSED', 'CANCELLED'].includes(ticket.status);

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1.5rem' }}>
        <Link to="/admin/helpdesk" className="btn btn-secondary btn-sm">
          <ArrowLeft size={16} />
        </Link>
        <div style={{ flex: 1 }}>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 600, marginBottom: '0.25rem' }}>
            {ticket.ticketNo}
          </h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', margin: 0 }}>
            {ticket.subject}
          </p>
        </div>
        <span className="badge" style={{ background: statusInfo.bg, color: statusInfo.color, fontWeight: 500, padding: '0.5rem 1rem' }}>
          {statusInfo.label}
        </span>
        <span className="badge" style={{ background: priorityInfo.bg, color: priorityInfo.color, fontWeight: 500, padding: '0.5rem 1rem' }}>
          {ticket.priority}
        </span>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: '1.5rem' }}>
        <div>
          <div className="card" style={{ marginBottom: '1.5rem' }}>
            <div style={{ display: 'flex', borderBottom: '1px solid var(--border)' }}>
              {[
                { key: 'conversation', label: 'Conversation', icon: MessageCircle, count: ticket.messages?.length || 0 },
                { key: 'tasks', label: 'Tasks', icon: ListTodo, count: ticket.tasks?.length || 0 },
              ].map(tab => (
                <button
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key as any)}
                  style={{
                    padding: '1rem 1.5rem',
                    border: 'none',
                    background: 'transparent',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                    borderBottom: activeTab === tab.key ? '2px solid var(--primary)' : '2px solid transparent',
                    color: activeTab === tab.key ? 'var(--primary)' : 'var(--text-secondary)',
                    fontWeight: activeTab === tab.key ? 600 : 400,
                  }}
                >
                  <tab.icon size={16} />
                  {tab.label}
                  {tab.count > 0 && (
                    <span className="badge badge-primary" style={{ fontSize: '0.7rem' }}>{tab.count}</span>
                  )}
                </button>
              ))}
            </div>

            <div style={{ padding: '1.5rem' }}>
              {activeTab === 'conversation' && (
                <>
                  <div style={{ marginBottom: '1.5rem', paddingBottom: '1.5rem', borderBottom: '1px solid var(--border)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.75rem' }}>
                      <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: 'var(--primary)', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.875rem', fontWeight: 600 }}>
                        {ticket.requesterUser?.firstName?.[0]}{ticket.requesterUser?.lastName?.[0]}
                      </div>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontWeight: 600 }}>{ticket.requesterUser?.firstName} {ticket.requesterUser?.lastName}</div>
                        <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                          {format(new Date(ticket.createdAt), 'MMM d, yyyy h:mm a')}
                        </div>
                      </div>
                    </div>
                    <div style={{ marginLeft: '52px', whiteSpace: 'pre-wrap', lineHeight: 1.6 }}>{ticket.description}</div>
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
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.75rem' }}>
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
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                              <span style={{ fontWeight: 600 }}>{msg.createdByUser?.firstName} {msg.createdByUser?.lastName}</span>
                              {isInternal && (
                                <span className="badge" style={{ background: 'var(--warning)', color: 'white', fontSize: '0.65rem' }}>
                                  Internal
                                </span>
                              )}
                            </div>
                            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                              {format(new Date(msg.createdAt), 'MMM d, yyyy h:mm a')}
                            </div>
                          </div>
                        </div>
                        <div style={{ marginLeft: '52px', whiteSpace: 'pre-wrap', lineHeight: 1.6 }}>{msg.body}</div>
                      </div>
                    );
                  })}

                  {isOpen && (
                    <form onSubmit={handleReply} style={{ marginTop: '1rem' }}>
                      <div style={{ marginBottom: '0.75rem', display: 'flex', gap: '1.5rem' }}>
                        <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', fontSize: '0.875rem' }}>
                          <input type="radio" checked={!isInternalNote} onChange={() => setIsInternalNote(false)} />
                          <Eye size={14} /> Public Reply
                        </label>
                        <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', fontSize: '0.875rem' }}>
                          <input type="radio" checked={isInternalNote} onChange={() => setIsInternalNote(true)} />
                          <EyeOff size={14} /> Internal Note
                        </label>
                      </div>
                      <textarea
                        className="form-input"
                        rows={4}
                        placeholder={isInternalNote ? "Add an internal note..." : "Type your reply..."}
                        value={replyText}
                        onChange={(e) => setReplyText(e.target.value)}
                        style={{ resize: 'vertical', background: isInternalNote ? 'var(--warning-bg)' : undefined }}
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
              )}

              {activeTab === 'tasks' && (
                <>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                    <h3 style={{ margin: 0, fontSize: '1rem' }}>Tasks</h3>
                    <button className="btn btn-sm btn-primary" onClick={() => setShowTaskForm(true)}>
                      <Plus size={14} /> Add Task
                    </button>
                  </div>

                  {showTaskForm && (
                    <form onSubmit={handleCreateTask} style={{ padding: '1rem', marginBottom: '1rem', background: 'var(--bg-secondary)', borderRadius: '8px' }}>
                      <div style={{ display: 'grid', gap: '0.75rem' }}>
                        <input type="text" className="form-input" placeholder="Task title" value={taskForm.title} onChange={(e) => setTaskForm({ ...taskForm, title: e.target.value })} />
                        <textarea className="form-input" placeholder="Description" rows={2} value={taskForm.description} onChange={(e) => setTaskForm({ ...taskForm, description: e.target.value })} />
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.5rem' }}>
                          <select className="form-input" value={taskForm.priority} onChange={(e) => setTaskForm({ ...taskForm, priority: e.target.value })}>
                            {PRIORITIES.map(p => <option key={p} value={p}>{p}</option>)}
                          </select>
                          <select className="form-input" value={taskForm.assignedToUserId} onChange={(e) => setTaskForm({ ...taskForm, assignedToUserId: e.target.value })}>
                            <option value="">Unassigned</option>
                            {supportUsers?.map((u: any) => <option key={u.id} value={u.id}>{u.firstName} {u.lastName}</option>)}
                          </select>
                          <input type="date" className="form-input" value={taskForm.dueAt} onChange={(e) => setTaskForm({ ...taskForm, dueAt: e.target.value })} />
                        </div>
                        <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
                          <button type="button" className="btn btn-sm" onClick={() => setShowTaskForm(false)}>Cancel</button>
                          <button type="submit" className="btn btn-sm btn-primary" disabled={createTaskMutation.isPending}>Create</button>
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
                        <div key={task.id} style={{ padding: '1rem', border: '1px solid var(--border)', borderRadius: '8px', background: task.status === 'DONE' ? 'var(--success-bg)' : 'var(--bg-primary)' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                            <div style={{ flex: 1 }}>
                              <div style={{ fontWeight: 500, textDecoration: task.status === 'DONE' ? 'line-through' : 'none' }}>{task.title}</div>
                              {task.description && <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>{task.description}</div>}
                              <div style={{ display: 'flex', gap: '1rem', marginTop: '0.5rem', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                                {task.assignedToUser && <span><User size={12} /> {task.assignedToUser.firstName}</span>}
                                {task.dueAt && <span><Clock size={12} /> {format(new Date(task.dueAt), 'MMM d')}</span>}
                              </div>
                            </div>
                            <select className="form-input" value={task.status} onChange={(e) => updateTaskMutation.mutate({ taskId: task.id, updates: { status: e.target.value } })} style={{ width: 'auto', fontSize: '0.75rem', padding: '0.25rem' }}>
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
              )}
            </div>
          </div>
        </div>

        <div>
          <div className="card" style={{ padding: 0, marginBottom: '1rem' }}>
            <div style={{ padding: '1rem', borderBottom: '1px solid var(--border)', background: statusInfo.bg }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Ticket size={18} style={{ color: statusInfo.color }} />
                <span style={{ fontWeight: 600 }}>{ticket.ticketNo}</span>
              </div>
            </div>

            <div style={{ padding: '1rem' }}>
              <div style={{ fontSize: '0.6875rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.75rem' }}>
                Requester
              </div>
              <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '1rem' }}>
                <div style={{ width: '48px', height: '48px', borderRadius: '50%', background: 'var(--primary-light)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--primary)', fontWeight: 600, fontSize: '1rem' }}>
                  {ticket.requesterUser?.firstName?.[0]}{ticket.requesterUser?.lastName?.[0]}
                </div>
                <div>
                  <div style={{ fontWeight: 600, marginBottom: '0.125rem' }}>{ticket.requesterUser?.firstName} {ticket.requesterUser?.lastName}</div>
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{ticket.requesterUser?.email}</div>
                  {ticket.customer && <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '0.25rem' }}><Building2 size={12} style={{ marginRight: '0.25rem' }} />{ticket.customer.name}</div>}
                </div>
              </div>

              <div style={{ fontSize: '0.6875rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.75rem' }}>
                Ticket Properties
              </div>
              <div className="grid" style={{ gridTemplateColumns: '1fr 1fr', gap: '0.5rem', marginBottom: '1rem' }}>
                <div style={{ padding: '0.75rem', background: 'var(--bg-secondary)', borderRadius: 'var(--radius)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', marginBottom: '0.25rem' }}>
                    <FolderOpen size={12} style={{ color: 'var(--text-muted)' }} />
                    <span style={{ fontSize: '0.6875rem', color: 'var(--text-muted)' }}>Category</span>
                  </div>
                  <div style={{ fontWeight: 600, fontSize: '0.875rem' }}>{ticket.category}</div>
                </div>
                <div style={{ padding: '0.75rem', background: 'var(--bg-secondary)', borderRadius: 'var(--radius)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', marginBottom: '0.25rem' }}>
                    <Flag size={12} style={{ color: 'var(--text-muted)' }} />
                    <span style={{ fontSize: '0.6875rem', color: 'var(--text-muted)' }}>Priority</span>
                  </div>
                  <div style={{ fontWeight: 600, fontSize: '0.875rem' }}>{ticket.priority}</div>
                </div>
                <div style={{ padding: '0.75rem', background: 'var(--bg-secondary)', borderRadius: 'var(--radius)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', marginBottom: '0.25rem' }}>
                    <Users size={12} style={{ color: 'var(--text-muted)' }} />
                    <span style={{ fontSize: '0.6875rem', color: 'var(--text-muted)' }}>Team</span>
                  </div>
                  <div style={{ fontWeight: 600, fontSize: '0.875rem' }}>{ticket.assignedTeam || 'Unassigned'}</div>
                </div>
                <div style={{ padding: '0.75rem', background: 'var(--bg-secondary)', borderRadius: 'var(--radius)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', marginBottom: '0.25rem' }}>
                    <UserCheck size={12} style={{ color: 'var(--text-muted)' }} />
                    <span style={{ fontSize: '0.6875rem', color: 'var(--text-muted)' }}>Assignee</span>
                  </div>
                  <div style={{ fontWeight: 600, fontSize: '0.875rem' }}>{ticket.assignedToUser ? ticket.assignedToUser.firstName : 'Unassigned'}</div>
                </div>
              </div>

              <div style={{ fontSize: '0.6875rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.75rem' }}>
                Dates
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', fontSize: '0.8rem', marginBottom: '1rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: 'var(--text-muted)' }}>Created</span>
                  <span>{format(new Date(ticket.createdAt), 'MMM d, yyyy')}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: 'var(--text-muted)' }}>Last Activity</span>
                  <span>{format(new Date(ticket.lastActivityAt), 'MMM d, h:mm a')}</span>
                </div>
              </div>

              {(ticket.slaResponseDueAt || ticket.slaResolveDueAt) && (
                <>
                  <div style={{ fontSize: '0.6875rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.75rem' }}>
                    SLA
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', fontSize: '0.8rem', marginBottom: '1rem' }}>
                    {ticket.slaResponseDueAt && (
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ color: 'var(--text-muted)' }}>Response</span>
                        <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', color: ticket.slaResponseMet === false ? 'var(--danger)' : ticket.slaResponseMet ? 'var(--success)' : 'inherit' }}>
                          {format(new Date(ticket.slaResponseDueAt), 'MMM d')}
                          {ticket.slaResponseMet === true && <CheckCircle size={12} />}
                          {ticket.slaResponseMet === false && <AlertCircle size={12} />}
                        </span>
                      </div>
                    )}
                    {ticket.slaResolveDueAt && (
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ color: 'var(--text-muted)' }}>Resolve</span>
                        <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', color: ticket.slaResolveMet === false ? 'var(--danger)' : ticket.slaResolveMet ? 'var(--success)' : 'inherit' }}>
                          {format(new Date(ticket.slaResolveDueAt), 'MMM d')}
                          {ticket.slaResolveMet === true && <CheckCircle size={12} />}
                          {ticket.slaResolveMet === false && <AlertCircle size={12} />}
                        </span>
                      </div>
                    )}
                  </div>
                </>
              )}
            </div>
          </div>

          <div className="card" style={{ padding: '1rem' }}>
            <div style={{ fontSize: '0.6875rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.75rem' }}>
              Update Ticket
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              <div>
                <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block', marginBottom: '0.25rem' }}>Status</label>
                <select className="form-input" value={ticket.status} onChange={(e) => updateMutation.mutate({ status: e.target.value })} disabled={updateMutation.isPending} style={{ fontSize: '0.875rem' }}>
                  {STATUSES.map(s => <option key={s} value={s}>{s.replace(/_/g, ' ')}</option>)}
                </select>
              </div>
              <div>
                <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block', marginBottom: '0.25rem' }}>Priority</label>
                <select className="form-input" value={ticket.priority} onChange={(e) => updateMutation.mutate({ priority: e.target.value })} disabled={updateMutation.isPending} style={{ fontSize: '0.875rem' }}>
                  {PRIORITIES.map(p => <option key={p} value={p}>{p}</option>)}
                </select>
              </div>
              <div>
                <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block', marginBottom: '0.25rem' }}>Assigned To</label>
                <select className="form-input" value={ticket.assignedToUserId || ''} onChange={(e) => updateMutation.mutate({ assignedToUserId: e.target.value || null })} disabled={updateMutation.isPending} style={{ fontSize: '0.875rem' }}>
                  <option value="">Unassigned</option>
                  {supportUsers?.map((u: any) => <option key={u.id} value={u.id}>{u.firstName} {u.lastName}</option>)}
                </select>
              </div>
              <div>
                <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block', marginBottom: '0.25rem' }}>Team</label>
                <select className="form-input" value={ticket.assignedTeam || ''} onChange={(e) => updateMutation.mutate({ assignedTeam: e.target.value || null })} disabled={updateMutation.isPending} style={{ fontSize: '0.875rem' }}>
                  <option value="">No Team</option>
                  {TEAMS.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
