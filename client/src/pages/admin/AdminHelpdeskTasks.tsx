import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link, useNavigate } from 'react-router-dom';
import api from '../../lib/api';
import { format } from 'date-fns';
import { 
  ListTodo, Search, Filter, Clock, CheckCircle, 
  User, AlertCircle, Calendar, ArrowLeft, Edit2, X
} from 'lucide-react';
import { KpiCard, EmptyState } from '../../components/shared';

const TASK_STATUSES = [
  { value: '', label: 'All Statuses' },
  { value: 'TODO', label: 'To Do' },
  { value: 'IN_PROGRESS', label: 'In Progress' },
  { value: 'DONE', label: 'Done' },
  { value: 'BLOCKED', label: 'Blocked' },
];

const PRIORITIES = [
  { value: '', label: 'All Priorities' },
  { value: 'LOW', label: 'Low' },
  { value: 'MEDIUM', label: 'Medium' },
  { value: 'HIGH', label: 'High' },
  { value: 'CRITICAL', label: 'Critical' },
];

const statusStyles: Record<string, { color: string; bg: string; label: string }> = {
  TODO: { color: 'var(--text-muted)', bg: 'var(--bg-secondary)', label: 'To Do' },
  IN_PROGRESS: { color: 'var(--warning)', bg: 'var(--warning-bg)', label: 'In Progress' },
  DONE: { color: 'var(--success)', bg: 'var(--success-bg)', label: 'Done' },
  BLOCKED: { color: 'var(--danger)', bg: 'var(--danger-bg)', label: 'Blocked' },
};

const priorityStyles: Record<string, { color: string; bg: string }> = {
  LOW: { color: 'var(--text-muted)', bg: 'var(--bg-secondary)' },
  MEDIUM: { color: 'var(--warning)', bg: 'var(--warning-bg)' },
  HIGH: { color: 'var(--danger)', bg: 'var(--danger-bg)' },
  CRITICAL: { color: 'white', bg: 'var(--danger)' },
};

export default function AdminHelpdeskTasks() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [status, setStatus] = useState('');
  const [priority, setPriority] = useState('');
  const [assignedTo, setAssignedTo] = useState('');
  const [search, setSearch] = useState('');
  const [selectedTask, setSelectedTask] = useState<any>(null);

  const { data, isLoading } = useQuery({
    queryKey: ['admin-tasks', status, assignedTo],
    queryFn: async () => {
      const params: any = { limit: 100 };
      if (status) params.status = status;
      if (assignedTo) params.assignedTo = assignedTo;
      const { data } = await api.get('/helpdesk/admin/tasks', { params });
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

  const updateTaskMutation = useMutation({
    mutationFn: async ({ taskId, updates }: { taskId: string; updates: any }) => {
      const { data } = await api.patch(`/helpdesk/admin/tasks/${taskId}`, updates);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-tasks'] });
      if (selectedTask) {
        setSelectedTask((prev: any) => ({ ...prev, ...updateTaskMutation.variables?.updates }));
      }
    },
  });

  const tasks = data?.tasks || [];

  const filteredTasks = tasks.filter((task: any) => {
    if (priority && task.priority !== priority) return false;
    if (search) {
      const query = search.toLowerCase();
      return (
        task.title.toLowerCase().includes(query) ||
        task.ticket?.ticketNo?.toLowerCase().includes(query) ||
        task.ticket?.subject?.toLowerCase().includes(query)
      );
    }
    return true;
  });

  const stats = {
    total: tasks.length,
    todo: tasks.filter((t: any) => t.status === 'TODO').length,
    inProgress: tasks.filter((t: any) => t.status === 'IN_PROGRESS').length,
    done: tasks.filter((t: any) => t.status === 'DONE').length,
  };

  const getStatusStyle = (s: string) => statusStyles[s] || statusStyles.TODO;
  const getPriorityStyle = (p: string) => priorityStyles[p] || priorityStyles.MEDIUM;

  const isOverdue = (task: any) => {
    if (!task.dueAt) return false;
    return new Date(task.dueAt) < new Date() && task.status !== 'DONE';
  };

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
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <Link to="/admin/helpdesk" className="btn btn-secondary btn-sm">
            <ArrowLeft size={16} />
          </Link>
          <div>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 600, marginBottom: '0.25rem' }}>Helpdesk Tasks</h2>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', margin: 0 }}>
              Manage all tasks across support tickets
            </p>
          </div>
        </div>
      </div>

      <div className="grid" style={{ gridTemplateColumns: 'repeat(4, 1fr)', gap: '1rem', marginBottom: '1.5rem' }}>
        <KpiCard 
          title="Total Tasks" 
          value={stats.total}
          icon={<ListTodo size={20} />}
          color="primary"
          onClick={() => setStatus('')}
          selected={!status}
        />
        <KpiCard 
          title="To Do" 
          value={stats.todo}
          icon={<Clock size={20} />}
          color="info"
          onClick={() => setStatus('TODO')}
          selected={status === 'TODO'}
        />
        <KpiCard 
          title="In Progress" 
          value={stats.inProgress}
          icon={<AlertCircle size={20} />}
          color="warning"
          onClick={() => setStatus('IN_PROGRESS')}
          selected={status === 'IN_PROGRESS'}
        />
        <KpiCard 
          title="Completed" 
          value={stats.done}
          icon={<CheckCircle size={20} />}
          color="success"
          onClick={() => setStatus('DONE')}
          selected={status === 'DONE'}
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
            placeholder="Search by title, ticket..."
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
          {TASK_STATUSES.map(opt => (
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
          value={assignedTo}
          onChange={(e) => setAssignedTo(e.target.value)}
          style={{ width: 'auto', fontSize: '0.875rem', height: '36px' }}
        >
          <option value="">All Assignees</option>
          {supportUsers?.map((user: any) => (
            <option key={user.id} value={user.id}>{user.firstName} {user.lastName}</option>
          ))}
        </select>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: selectedTask ? '1fr 340px' : '1fr', gap: '1.5rem' }}>
        <div>
          {filteredTasks.length === 0 ? (
            <div className="card" style={{ padding: '2rem' }}>
              <EmptyState
                icon="file"
                title="No tasks found"
                message="Try adjusting your filters or create tasks from tickets"
              />
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '1rem' }}>
              {filteredTasks.map((task: any) => {
                const statusStyle = getStatusStyle(task.status);
                const prioStyle = getPriorityStyle(task.priority);
                const overdue = isOverdue(task);

                return (
                  <div
                    key={task.id}
                    className="card"
                    onClick={() => setSelectedTask(task)}
                    style={{ 
                      padding: '1rem', 
                      cursor: 'pointer',
                      border: selectedTask?.id === task.id ? '2px solid var(--primary)' : '1px solid var(--border)',
                      background: task.status === 'DONE' ? 'var(--success-bg)' : overdue ? 'rgba(220, 38, 38, 0.03)' : 'var(--bg-primary)',
                      transition: 'all 0.15s ease',
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.75rem' }}>
                      <span 
                        className="badge"
                        style={{ background: statusStyle.bg, color: statusStyle.color, fontWeight: 600 }}
                      >
                        {statusStyle.label}
                      </span>
                      <button
                        className="btn btn-secondary btn-sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          navigate(`/admin/helpdesk/tickets/${task.ticket?.id}`);
                        }}
                        style={{ padding: '0.25rem 0.5rem' }}
                      >
                        <Edit2 size={14} />
                      </button>
                    </div>

                    <h3 style={{ 
                      fontWeight: 600, 
                      marginBottom: '0.25rem', 
                      fontSize: '0.9375rem',
                      textDecoration: task.status === 'DONE' ? 'line-through' : 'none',
                      opacity: task.status === 'DONE' ? 0.7 : 1,
                    }}>
                      {task.title}
                    </h3>
                    <p style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', marginBottom: '0.75rem' }}>
                      <span style={{ fontFamily: 'monospace' }}>{task.ticket?.ticketNo}</span>
                      {' • '}
                      {task.ticket?.subject?.substring(0, 30)}{task.ticket?.subject?.length > 30 ? '...' : ''}
                    </p>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem', fontSize: '0.8125rem', marginBottom: '0.75rem' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
                        <User size={14} style={{ color: 'var(--text-muted)' }} />
                        <span>{task.assignedToUser?.firstName || 'Unassigned'}</span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', color: overdue ? 'var(--danger)' : 'inherit' }}>
                        <Calendar size={14} style={{ color: overdue ? 'var(--danger)' : 'var(--text-muted)' }} />
                        <span>{task.dueAt ? format(new Date(task.dueAt), 'MMM d') : 'No due date'}</span>
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
                      <span className="badge" style={{ background: prioStyle.bg, color: prioStyle.color, fontSize: '0.6875rem' }}>
                        {task.priority}
                      </span>
                      {overdue && (
                        <span style={{ fontSize: '0.75rem', color: 'var(--danger)', fontWeight: 500 }}>
                          Overdue
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {selectedTask && (
          <div className="card" style={{ padding: 0, height: 'fit-content', position: 'sticky', top: '1rem' }}>
            <div style={{ 
              padding: '1rem', 
              borderBottom: '1px solid var(--border)',
              background: getStatusStyle(selectedTask.status).bg,
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                  <span 
                    className="badge"
                    style={{ 
                      background: getStatusStyle(selectedTask.status).color, 
                      color: 'white',
                      marginBottom: '0.5rem',
                    }}
                  >
                    {getStatusStyle(selectedTask.status).label}
                  </span>
                  <h3 style={{ fontWeight: 600, fontSize: '1rem', margin: '0.5rem 0 0.25rem' }}>{selectedTask.title}</h3>
                </div>
                <button
                  className="btn btn-sm btn-secondary"
                  onClick={() => setSelectedTask(null)}
                  style={{ borderRadius: '50%', width: '28px', height: '28px', padding: 0 }}
                >
                  <X size={14} />
                </button>
              </div>
            </div>

            <div style={{ padding: '1rem' }}>
              <div style={{ marginBottom: '1rem' }}>
                <div style={{ fontSize: '0.6875rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.75rem' }}>
                  Related Ticket
                </div>
                <Link 
                  to={`/admin/helpdesk/tickets/${selectedTask.ticket?.id}`}
                  style={{ 
                    display: 'block',
                    padding: '0.75rem', 
                    background: 'var(--bg-secondary)', 
                    borderRadius: 'var(--radius)',
                    textDecoration: 'none',
                    color: 'inherit',
                  }}
                >
                  <div style={{ fontWeight: 600, fontSize: '0.875rem', marginBottom: '0.25rem' }}>
                    {selectedTask.ticket?.ticketNo}
                  </div>
                  <div style={{ fontSize: '0.8125rem', color: 'var(--text-muted)' }}>
                    {selectedTask.ticket?.subject}
                  </div>
                </Link>
              </div>

              {selectedTask.description && (
                <div style={{ marginBottom: '1rem' }}>
                  <div style={{ fontSize: '0.6875rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.5rem' }}>
                    Description
                  </div>
                  <p style={{ fontSize: '0.875rem', margin: 0, lineHeight: 1.5 }}>{selectedTask.description}</p>
                </div>
              )}

              <div style={{ marginBottom: '1rem' }}>
                <div style={{ fontSize: '0.6875rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.75rem' }}>
                  Task Info
                </div>
                <div className="grid" style={{ gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
                  <div style={{ padding: '0.625rem', background: 'var(--bg-secondary)', borderRadius: 'var(--radius)' }}>
                    <div style={{ fontSize: '0.6875rem', color: 'var(--text-muted)', marginBottom: '0.125rem' }}>Priority</div>
                    <div style={{ fontWeight: 600, fontSize: '0.8125rem' }}>{selectedTask.priority}</div>
                  </div>
                  <div style={{ padding: '0.625rem', background: 'var(--bg-secondary)', borderRadius: 'var(--radius)' }}>
                    <div style={{ fontSize: '0.6875rem', color: 'var(--text-muted)', marginBottom: '0.125rem' }}>Assignee</div>
                    <div style={{ fontWeight: 600, fontSize: '0.8125rem' }}>
                      {selectedTask.assignedToUser?.firstName || 'Unassigned'}
                    </div>
                  </div>
                  <div style={{ padding: '0.625rem', background: 'var(--bg-secondary)', borderRadius: 'var(--radius)' }}>
                    <div style={{ fontSize: '0.6875rem', color: 'var(--text-muted)', marginBottom: '0.125rem' }}>Due Date</div>
                    <div style={{ fontWeight: 600, fontSize: '0.8125rem', color: isOverdue(selectedTask) ? 'var(--danger)' : 'inherit' }}>
                      {selectedTask.dueAt ? format(new Date(selectedTask.dueAt), 'MMM d, yyyy') : 'Not set'}
                    </div>
                  </div>
                  <div style={{ padding: '0.625rem', background: 'var(--bg-secondary)', borderRadius: 'var(--radius)' }}>
                    <div style={{ fontSize: '0.6875rem', color: 'var(--text-muted)', marginBottom: '0.125rem' }}>Created</div>
                    <div style={{ fontWeight: 600, fontSize: '0.8125rem' }}>
                      {format(new Date(selectedTask.createdAt), 'MMM d')}
                    </div>
                  </div>
                </div>
              </div>

              <div style={{ marginBottom: '1rem' }}>
                <div style={{ fontSize: '0.6875rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.5rem' }}>
                  Update Status
                </div>
                <select 
                  className="form-input" 
                  value={selectedTask.status} 
                  onChange={(e) => updateTaskMutation.mutate({ taskId: selectedTask.id, updates: { status: e.target.value } })}
                  style={{ width: '100%', fontSize: '0.875rem' }}
                >
                  <option value="TODO">To Do</option>
                  <option value="IN_PROGRESS">In Progress</option>
                  <option value="DONE">Done</option>
                  <option value="BLOCKED">Blocked</option>
                </select>
              </div>

              <Link 
                to={`/admin/helpdesk/tickets/${selectedTask.ticket?.id}`}
                className="btn btn-primary"
                style={{ width: '100%', justifyContent: 'center' }}
              >
                View Ticket
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
