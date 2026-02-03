import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import api from '../lib/api';
import { format } from 'date-fns';
import { Filter, ChevronLeft, ChevronRight, X, Clock, User, FileText, Hash, Activity, ArrowRight } from 'lucide-react';

interface AuditLogEntry {
  id: string;
  action: string;
  entityType: string;
  entityId: string;
  createdAt: string;
  actorRole?: string;
  traceId?: string;
  oldValues?: Record<string, any>;
  newValues?: Record<string, any>;
  user?: {
    firstName: string;
    lastName: string;
    email: string;
  };
}

export default function AuditLog() {
  const [filters, setFilters] = useState({
    entityType: '',
    action: '',
    fromDate: '',
    toDate: '',
    limit: 50,
    offset: 0,
  });
  const [selectedLog, setSelectedLog] = useState<AuditLogEntry | null>(null);

  const { data: auditData, isLoading } = useQuery({
    queryKey: ['audit-logs', filters],
    queryFn: async () => {
      const params: any = { ...filters };
      Object.keys(params).forEach(key => {
        if (!params[key]) delete params[key];
      });
      const { data } = await api.get('/audit', { params });
      return data;
    },
  });

  const { data: actions } = useQuery({
    queryKey: ['audit-actions'],
    queryFn: async () => {
      const { data } = await api.get('/audit/actions');
      return data;
    },
  });

  const { data: entityTypes } = useQuery({
    queryKey: ['audit-entity-types'],
    queryFn: async () => {
      const { data } = await api.get('/audit/entity-types');
      return data;
    },
  });

  const handlePageChange = (direction: 'prev' | 'next') => {
    setFilters(prev => ({
      ...prev,
      offset: direction === 'next' 
        ? prev.offset + prev.limit 
        : Math.max(0, prev.offset - prev.limit),
    }));
  };

  const getActionColor = (action: string): string => {
    if (action.includes('CREATE')) return 'success';
    if (action.includes('UPDATE') || action.includes('CHANGE')) return 'warning';
    if (action.includes('DELETE')) return 'danger';
    if (action.includes('LOGIN') || action.includes('LOGOUT')) return 'info';
    return 'default';
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
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
        <h2 style={{ fontSize: '1.25rem', fontWeight: 600 }}>Audit Log</h2>
      </div>

      <div className="card" style={{ marginBottom: '1rem', padding: '1rem' }}>
        <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', flexWrap: 'wrap' }}>
          <Filter size={18} color="var(--text-muted)" />
          <select
            className="form-select"
            style={{ width: 'auto' }}
            value={filters.entityType}
            onChange={(e) => setFilters({ ...filters, entityType: e.target.value, offset: 0 })}
          >
            <option value="">All Entity Types</option>
            {entityTypes?.map((type: string) => (
              <option key={type} value={type}>{type}</option>
            ))}
          </select>
          <select
            className="form-select"
            style={{ width: 'auto' }}
            value={filters.action}
            onChange={(e) => setFilters({ ...filters, action: e.target.value, offset: 0 })}
          >
            <option value="">All Actions</option>
            {actions?.map((action: string) => (
              <option key={action} value={action}>{action}</option>
            ))}
          </select>
          <input
            type="date"
            className="form-input"
            style={{ width: 'auto' }}
            value={filters.fromDate}
            onChange={(e) => setFilters({ ...filters, fromDate: e.target.value, offset: 0 })}
            placeholder="From Date"
          />
          <input
            type="date"
            className="form-input"
            style={{ width: 'auto' }}
            value={filters.toDate}
            onChange={(e) => setFilters({ ...filters, toDate: e.target.value, offset: 0 })}
            placeholder="To Date"
          />
          {(filters.entityType || filters.action || filters.fromDate || filters.toDate) && (
            <button
              className="btn btn-secondary btn-sm"
              onClick={() => setFilters({ entityType: '', action: '', fromDate: '', toDate: '', limit: 50, offset: 0 })}
            >
              Clear Filters
            </button>
          )}
        </div>
      </div>

      <div className="card">
        <table className="table">
          <thead>
            <tr>
              <th>Timestamp</th>
              <th>User</th>
              <th>Action</th>
              <th>Entity Type</th>
              <th>Entity ID</th>
              <th>Details</th>
            </tr>
          </thead>
          <tbody>
            {auditData?.logs?.map((log: any) => (
              <tr key={log.id}>
                <td>
                  <div>{format(new Date(log.createdAt), 'MMM dd, yyyy')}</div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                    {format(new Date(log.createdAt), 'HH:mm:ss')}
                  </div>
                </td>
                <td>
                  {log.user ? (
                    <div>
                      <div>{log.user.firstName} {log.user.lastName}</div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                        {log.user.email}
                      </div>
                    </div>
                  ) : (
                    <span style={{ color: 'var(--text-muted)' }}>System</span>
                  )}
                </td>
                <td>
                  <span className={`badge badge-${getActionColor(log.action)}`}>
                    {log.action}
                  </span>
                </td>
                <td>{log.entityType}</td>
                <td>
                  <code style={{ fontSize: '0.75rem', background: 'var(--bg-tertiary)', padding: '0.125rem 0.25rem', borderRadius: '4px' }}>
                    {log.entityId?.slice(0, 8) || '-'}
                  </code>
                </td>
                <td>
                  <button
                    className="btn btn-secondary btn-sm"
                    onClick={() => setSelectedLog(log)}
                  >
                    View
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {auditData?.logs?.length === 0 && <div className="empty-state">No audit logs found</div>}

        <div
          style={{
            padding: '1rem 1.5rem',
            borderTop: '1px solid var(--border)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <span style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>
            Showing {filters.offset + 1} - {Math.min(filters.offset + filters.limit, auditData?.total || 0)} of {auditData?.total || 0}
          </span>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <button
              className="btn btn-secondary btn-sm"
              onClick={() => handlePageChange('prev')}
              disabled={filters.offset === 0}
            >
              <ChevronLeft size={16} />
              Previous
            </button>
            <button
              className="btn btn-secondary btn-sm"
              onClick={() => handlePageChange('next')}
              disabled={filters.offset + filters.limit >= (auditData?.total || 0)}
            >
              Next
              <ChevronRight size={16} />
            </button>
          </div>
        </div>
      </div>

      {selectedLog && (
        <div className="modal-overlay" onClick={() => setSelectedLog(null)}>
          <div
            className="modal-content"
            style={{ maxWidth: '700px', maxHeight: '85vh', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="modal-header" style={{ borderBottom: '1px solid var(--border)', paddingBottom: '1rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <div style={{ 
                  width: '40px', 
                  height: '40px', 
                  borderRadius: '10px', 
                  background: 'var(--primary)', 
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'center' 
                }}>
                  <Activity size={20} color="white" />
                </div>
                <div>
                  <h3 style={{ margin: 0, fontSize: '1.125rem', fontWeight: 600 }}>Audit Log Details</h3>
                  <p style={{ margin: 0, fontSize: '0.875rem', color: 'var(--text-muted)' }}>
                    {format(new Date(selectedLog.createdAt), 'MMMM dd, yyyy \'at\' HH:mm:ss')}
                  </p>
                </div>
              </div>
              <button className="modal-close" onClick={() => setSelectedLog(null)}>
                <X size={20} />
              </button>
            </div>

            <div className="modal-body" style={{ overflow: 'auto', flex: 1 }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1.5rem' }}>
                <div style={{ 
                  padding: '1rem', 
                  background: 'var(--bg-secondary)', 
                  borderRadius: '8px',
                  border: '1px solid var(--border)'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                    <User size={14} color="var(--text-muted)" />
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 500 }}>User</span>
                  </div>
                  {selectedLog.user ? (
                    <>
                      <div style={{ fontWeight: 500 }}>{selectedLog.user.firstName} {selectedLog.user.lastName}</div>
                      <div style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>{selectedLog.user.email}</div>
                      {selectedLog.actorRole && (
                        <span className="badge badge-info" style={{ marginTop: '0.5rem' }}>{selectedLog.actorRole}</span>
                      )}
                    </>
                  ) : (
                    <div style={{ fontWeight: 500, color: 'var(--text-muted)' }}>System</div>
                  )}
                </div>

                <div style={{ 
                  padding: '1rem', 
                  background: 'var(--bg-secondary)', 
                  borderRadius: '8px',
                  border: '1px solid var(--border)'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                    <Clock size={14} color="var(--text-muted)" />
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 500 }}>Timestamp</span>
                  </div>
                  <div style={{ fontWeight: 500 }}>{format(new Date(selectedLog.createdAt), 'MMM dd, yyyy')}</div>
                  <div style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>{format(new Date(selectedLog.createdAt), 'HH:mm:ss.SSS')}</div>
                </div>

                <div style={{ 
                  padding: '1rem', 
                  background: 'var(--bg-secondary)', 
                  borderRadius: '8px',
                  border: '1px solid var(--border)'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                    <FileText size={14} color="var(--text-muted)" />
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 500 }}>Entity</span>
                  </div>
                  <div style={{ fontWeight: 500 }}>{selectedLog.entityType}</div>
                  <code style={{ 
                    fontSize: '0.75rem', 
                    background: 'var(--bg-tertiary)', 
                    padding: '0.25rem 0.5rem', 
                    borderRadius: '4px',
                    display: 'inline-block',
                    marginTop: '0.25rem'
                  }}>
                    {selectedLog.entityId || 'N/A'}
                  </code>
                </div>

                <div style={{ 
                  padding: '1rem', 
                  background: 'var(--bg-secondary)', 
                  borderRadius: '8px',
                  border: '1px solid var(--border)'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                    <Hash size={14} color="var(--text-muted)" />
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 500 }}>Action</span>
                  </div>
                  <span className={`badge badge-${getActionColor(selectedLog.action)}`} style={{ fontSize: '0.875rem' }}>
                    {selectedLog.action}
                  </span>
                  {selectedLog.traceId && (
                    <div style={{ marginTop: '0.5rem' }}>
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Trace: </span>
                      <code style={{ fontSize: '0.7rem' }}>{selectedLog.traceId.slice(0, 12)}...</code>
                    </div>
                  )}
                </div>
              </div>

              {(selectedLog.oldValues || selectedLog.newValues) && (
                <div style={{ marginTop: '1rem' }}>
                  <h4 style={{ fontSize: '0.875rem', fontWeight: 600, marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <ArrowRight size={16} />
                    Changes
                  </h4>
                  
                  {selectedLog.oldValues && selectedLog.newValues ? (
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                      <div>
                        <div style={{ 
                          fontSize: '0.75rem', 
                          fontWeight: 500, 
                          color: 'var(--text-muted)', 
                          marginBottom: '0.5rem',
                          textTransform: 'uppercase'
                        }}>
                          Before
                        </div>
                        <pre style={{ 
                          background: 'var(--bg-tertiary)', 
                          padding: '1rem', 
                          borderRadius: '8px', 
                          fontSize: '0.75rem',
                          overflow: 'auto',
                          maxHeight: '200px',
                          border: '1px solid var(--border)',
                          margin: 0
                        }}>
                          {JSON.stringify(selectedLog.oldValues, null, 2)}
                        </pre>
                      </div>
                      <div>
                        <div style={{ 
                          fontSize: '0.75rem', 
                          fontWeight: 500, 
                          color: 'var(--text-muted)', 
                          marginBottom: '0.5rem',
                          textTransform: 'uppercase'
                        }}>
                          After
                        </div>
                        <pre style={{ 
                          background: 'var(--bg-tertiary)', 
                          padding: '1rem', 
                          borderRadius: '8px', 
                          fontSize: '0.75rem',
                          overflow: 'auto',
                          maxHeight: '200px',
                          border: '1px solid var(--border)',
                          margin: 0
                        }}>
                          {JSON.stringify(selectedLog.newValues, null, 2)}
                        </pre>
                      </div>
                    </div>
                  ) : (
                    <div>
                      <div style={{ 
                        fontSize: '0.75rem', 
                        fontWeight: 500, 
                        color: 'var(--text-muted)', 
                        marginBottom: '0.5rem',
                        textTransform: 'uppercase'
                      }}>
                        {selectedLog.oldValues ? 'Previous Values' : 'New Values'}
                      </div>
                      <pre style={{ 
                        background: 'var(--bg-tertiary)', 
                        padding: '1rem', 
                        borderRadius: '8px', 
                        fontSize: '0.75rem',
                        overflow: 'auto',
                        maxHeight: '300px',
                        border: '1px solid var(--border)',
                        margin: 0
                      }}>
                        {JSON.stringify(selectedLog.oldValues || selectedLog.newValues, null, 2)}
                      </pre>
                    </div>
                  )}
                </div>
              )}

              {!selectedLog.oldValues && !selectedLog.newValues && (
                <div style={{ 
                  textAlign: 'center', 
                  padding: '2rem', 
                  color: 'var(--text-muted)',
                  background: 'var(--bg-secondary)',
                  borderRadius: '8px',
                  border: '1px dashed var(--border)'
                }}>
                  No detailed change data available for this entry.
                </div>
              )}
            </div>

            <div className="modal-footer" style={{ borderTop: '1px solid var(--border)', paddingTop: '1rem', display: 'flex', justifyContent: 'flex-end' }}>
              <button className="btn btn-secondary" onClick={() => setSelectedLog(null)}>
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
