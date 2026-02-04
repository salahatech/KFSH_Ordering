import { useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../../lib/api';
import { format } from 'date-fns';
import { 
  Ticket, ArrowLeft, Send, Paperclip, Clock, User, 
  MessageCircle, AlertCircle, CheckCircle, FileText, ExternalLink,
  Eye, EyeOff, ListTodo, History, Settings, Plus, Users
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

const priorityLabels: Record<string, string> = {
  LOW: 'Low',
  MEDIUM: 'Medium',
  HIGH: 'High',
  CRITICAL: 'Critical',
};

const STATUSES = ['NEW', 'OPEN', 'IN_PROGRESS', 'WAITING_FOR_USER', 'WAITING_FOR_ADMIN', 'RESOLVED', 'CLOSED', 'CANCELLED'];
const PRIORITIES = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'];
const TEAMS = ['SUPPORT', 'FINANCE', 'LOGISTICS', 'QC', 'IT'];

export default function AdminTicketDetail() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuthStore();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  
  const [activeTab, setActiveTab] = useState<'conversation' | 'tasks' | 'timeline'>('conversation');
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
      <div style={{ padding: '2rem', textAlign: 'center' }}>
        <div className="spinner" />
        Loading ticket...
      </div>
    );
  }

  if (error || !ticket) {
    return (
      <div style={{ padding: '2rem' }}>
        <Link to="/admin/helpdesk" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-muted)', marginBottom: '1rem', textDecoration: 'none' }}>
          <ArrowLeft size={18} />
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

  return (
    <div style={{ padding: '1.5rem' }}>
      <Link to="/admin/helpdesk" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-muted)', marginBottom: '1rem', textDecoration: 'none' }}>
        <ArrowLeft size={18} />
        Back to Tickets
      </Link>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 320px', gap: '1.5rem' }}>
        <div>
          <div className="card" style={{ marginBottom: '1.5rem' }}>
            <div style={{ padding: '1.5rem', borderBottom: '1px solid var(--border)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.5rem' }}>
                <Ticket size={24} style={{ color: 'var(--primary)' }} />
                <code style={{ fontSize: '1rem', fontWeight: 600 }}>{ticket.ticketNo}</code>
                <span className="badge" style={{ background: statusInfo.bg, color: statusInfo.color, fontWeight: 500 }}>
                  {statusInfo.label}
                </span>
                <span className="badge" style={{ background: 'var(--bg-secondary)' }}>
                  {ticket.priority}
                </span>
              </div>
              <h1 style={{ margin: 0, fontSize: '1.25rem' }}>{ticket.subject}</h1>
              <div style={{ marginTop: '0.5rem', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                <span>By {ticket.requesterUser?.firstName} {ticket.requesterUser?.lastName}</span>
                <span style={{ margin: '0 0.5rem' }}>•</span>
                <span>{ticket.requesterUser?.email}</span>
                {ticket.customer && (
                  <>
                    <span style={{ margin: '0 0.5rem' }}>•</span>
                    <span>{ticket.customer.name}</span>
                  </>
                )}
              </div>
            </div>

            <div style={{ display: 'flex', borderBottom: '1px solid var(--border)' }}>
              {[
                { key: 'conversation', label: 'Conversation', icon: MessageCircle },
                { key: 'tasks', label: `Tasks (${ticket.tasks?.length || 0})`, icon: ListTodo },
                { key: 'timeline', label: 'Timeline', icon: History },
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
                    fontWeight: activeTab === tab.key ? 500 : 400,
                  }}
                >
                  <tab.icon size={16} />
                  {tab.label}
                </button>
              ))}
            </div>

            <div style={{ padding: '1.5rem' }}>
              {activeTab === 'conversation' && (
                <>
                  <div style={{ marginBottom: '1.5rem', paddingBottom: '1.5rem', borderBottom: '1px solid var(--border)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                      <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: 'var(--primary)', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.8rem', fontWeight: 600 }}>
                        {ticket.requesterUser?.firstName?.[0]}{ticket.requesterUser?.lastName?.[0]}
                      </div>
                      <div>
                        <strong>{ticket.requesterUser?.firstName} {ticket.requesterUser?.lastName}</strong>
                        <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem', marginLeft: '0.5rem' }}>
                          • {format(new Date(ticket.createdAt), 'MMM d, h:mm a')}
                        </span>
                      </div>
                    </div>
                    <div style={{ marginLeft: '40px', whiteSpace: 'pre-wrap' }}>{ticket.description}</div>
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
                            width: '32px', 
                            height: '32px', 
                            borderRadius: '50%', 
                            background: isInternal ? 'var(--warning)' : 'var(--success)', 
                            color: 'white', 
                            display: 'flex', 
                            alignItems: 'center', 
                            justifyContent: 'center', 
                            fontSize: '0.8rem', 
                            fontWeight: 600 
                          }}>
                            {msg.createdByUser?.firstName?.[0]}{msg.createdByUser?.lastName?.[0]}
                          </div>
                          <div>
                            <strong>{msg.createdByUser?.firstName} {msg.createdByUser?.lastName}</strong>
                            {isInternal && (
                              <span className="badge" style={{ marginLeft: '0.5rem', background: 'var(--warning)', color: 'white', fontSize: '0.7rem' }}>
                                <EyeOff size={10} style={{ marginRight: '0.25rem' }} />
                                Internal Note
                              </span>
                            )}
                            <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem', marginLeft: '0.5rem' }}>
                              • {format(new Date(msg.createdAt), 'MMM d, h:mm a')}
                            </span>
                          </div>
                        </div>
                        <div style={{ marginLeft: '40px', whiteSpace: 'pre-wrap' }}>{msg.body}</div>
                      </div>
                    );
                  })}

                  {isOpen && (
                    <form onSubmit={handleReply}>
                      <div style={{ marginBottom: '0.75rem', display: 'flex', gap: '1rem' }}>
                        <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
                          <input
                            type="radio"
                            checked={!isInternalNote}
                            onChange={() => setIsInternalNote(false)}
                          />
                          <Eye size={16} />
                          Public Reply
                        </label>
                        <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
                          <input
                            type="radio"
                            checked={isInternalNote}
                            onChange={() => setIsInternalNote(true)}
                          />
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
                          style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}
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
                    <h3 style={{ margin: 0 }}>Tasks</h3>
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
                        <div style={{ display: 'flex', gap: '0.75rem' }}>
                          <select
                            className="form-input"
                            value={taskForm.priority}
                            onChange={(e) => setTaskForm({ ...taskForm, priority: e.target.value })}
                          >
                            {PRIORITIES.map(p => <option key={p} value={p}>{p}</option>)}
                          </select>
                          <select
                            className="form-input"
                            value={taskForm.assignedToUserId}
                            onChange={(e) => setTaskForm({ ...taskForm, assignedToUserId: e.target.value })}
                          >
                            <option value="">Unassigned</option>
                            {supportUsers?.map((u: any) => (
                              <option key={u.id} value={u.id}>{u.firstName} {u.lastName}</option>
                            ))}
                          </select>
                          <input
                            type="date"
                            className="form-input"
                            value={taskForm.dueAt}
                            onChange={(e) => setTaskForm({ ...taskForm, dueAt: e.target.value })}
                          />
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
                            background: task.status === 'DONE' ? 'var(--success-bg)' : 'transparent',
                          }}
                        >
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                            <div>
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
                                  <span><User size={12} /> {task.assignedToUser.firstName} {task.assignedToUser.lastName}</span>
                                )}
                                {task.dueAt && (
                                  <span><Clock size={12} /> Due {format(new Date(task.dueAt), 'MMM d')}</span>
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
              )}

              {activeTab === 'timeline' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  {ticket.events?.map((event: any) => (
                    <div key={event.id} style={{ display: 'flex', gap: '1rem', fontSize: '0.9rem' }}>
                      <div style={{ color: 'var(--text-muted)', whiteSpace: 'nowrap', minWidth: '130px' }}>
                        {format(new Date(event.createdAt), 'MMM d, h:mm a')}
                      </div>
                      <div>
                        <strong>{event.actorUser?.firstName} {event.actorUser?.lastName}</strong>{' '}
                        <span style={{ color: 'var(--text-muted)' }}>
                          {event.eventType.replace(/_/g, ' ').toLowerCase()}
                        </span>
                        {event.newValueJson && (
                          <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
                            {JSON.stringify(event.newValueJson)}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

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
            <h4 style={{ margin: '0 0 1rem 0' }}>Details</h4>
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
              {ticket.slaResponseDueAt && (
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: 'var(--text-muted)' }}>Response SLA</span>
                  <span style={{ color: ticket.slaResponseMet === false ? 'var(--danger)' : ticket.slaResponseMet ? 'var(--success)' : 'inherit' }}>
                    {format(new Date(ticket.slaResponseDueAt), 'MMM d, h:mm a')}
                    {ticket.slaResponseMet === true && <CheckCircle size={12} style={{ marginLeft: '0.25rem' }} />}
                    {ticket.slaResponseMet === false && <AlertCircle size={12} style={{ marginLeft: '0.25rem' }} />}
                  </span>
                </div>
              )}
              {ticket.slaResolveDueAt && (
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: 'var(--text-muted)' }}>Resolve SLA</span>
                  <span style={{ color: ticket.slaResolveMet === false ? 'var(--danger)' : ticket.slaResolveMet ? 'var(--success)' : 'inherit' }}>
                    {format(new Date(ticket.slaResolveDueAt), 'MMM d, h:mm a')}
                    {ticket.slaResolveMet === true && <CheckCircle size={12} style={{ marginLeft: '0.25rem' }} />}
                    {ticket.slaResolveMet === false && <AlertCircle size={12} style={{ marginLeft: '0.25rem' }} />}
                  </span>
                </div>
              )}
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
      </div>
    </div>
  );
}
