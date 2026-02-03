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
            style={{ 
              maxWidth: '720px', 
              maxHeight: '90vh', 
              overflow: 'hidden', 
              display: 'flex', 
              flexDirection: 'column',
              borderRadius: '16px',
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="modal-header" style={{ 
              background: 'linear-gradient(135deg, var(--primary) 0%, #1e40af 100%)',
              padding: '1.5rem',
              borderRadius: '16px 16px 0 0',
              color: 'white'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                <div style={{ 
                  width: '48px', 
                  height: '48px', 
                  borderRadius: '12px', 
                  background: 'rgba(255,255,255,0.2)', 
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'center',
                  backdropFilter: 'blur(10px)'
                }}>
                  <Activity size={24} color="white" />
                </div>
                <div>
                  <h3 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 600, color: 'white' }}>Audit Log Details</h3>
                  <p style={{ margin: 0, fontSize: '0.875rem', color: 'rgba(255,255,255,0.8)' }}>
                    {format(new Date(selectedLog.createdAt), 'MMMM dd, yyyy \'at\' HH:mm:ss')}
                  </p>
                </div>
              </div>
              <button 
                onClick={() => setSelectedLog(null)}
                style={{ 
                  background: 'rgba(255,255,255,0.2)', 
                  border: 'none', 
                  borderRadius: '8px',
                  padding: '0.5rem',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
              >
                <X size={20} color="white" />
              </button>
            </div>

            <div className="modal-body" style={{ overflow: 'auto', flex: 1, padding: '1.5rem' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1.5rem' }}>
                <div style={{ 
                  padding: '1.25rem', 
                  background: 'linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%)', 
                  borderRadius: '12px',
                  border: '1px solid #bae6fd'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem' }}>
                    <div style={{ 
                      width: '28px', 
                      height: '28px', 
                      borderRadius: '6px', 
                      background: '#0284c7', 
                      display: 'flex', 
                      alignItems: 'center', 
                      justifyContent: 'center' 
                    }}>
                      <User size={14} color="white" />
                    </div>
                    <span style={{ fontSize: '0.75rem', color: '#0369a1', textTransform: 'uppercase', fontWeight: 600, letterSpacing: '0.05em' }}>User</span>
                  </div>
                  {selectedLog.user ? (
                    <>
                      <div style={{ fontWeight: 600, fontSize: '1rem', color: '#0c4a6e' }}>{selectedLog.user.firstName} {selectedLog.user.lastName}</div>
                      <div style={{ fontSize: '0.875rem', color: '#0369a1', marginTop: '0.25rem' }}>{selectedLog.user.email}</div>
                      {selectedLog.actorRole && (
                        <span className="badge badge-info" style={{ marginTop: '0.75rem', display: 'inline-block' }}>{selectedLog.actorRole}</span>
                      )}
                    </>
                  ) : (
                    <div style={{ fontWeight: 600, fontSize: '1rem', color: '#64748b' }}>System</div>
                  )}
                </div>

                <div style={{ 
                  padding: '1.25rem', 
                  background: 'linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%)', 
                  borderRadius: '12px',
                  border: '1px solid #bbf7d0'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem' }}>
                    <div style={{ 
                      width: '28px', 
                      height: '28px', 
                      borderRadius: '6px', 
                      background: '#16a34a', 
                      display: 'flex', 
                      alignItems: 'center', 
                      justifyContent: 'center' 
                    }}>
                      <Clock size={14} color="white" />
                    </div>
                    <span style={{ fontSize: '0.75rem', color: '#15803d', textTransform: 'uppercase', fontWeight: 600, letterSpacing: '0.05em' }}>Timestamp</span>
                  </div>
                  <div style={{ fontWeight: 600, fontSize: '1rem', color: '#14532d' }}>{format(new Date(selectedLog.createdAt), 'MMM dd, yyyy')}</div>
                  <div style={{ fontSize: '0.875rem', color: '#15803d', marginTop: '0.25rem' }}>{format(new Date(selectedLog.createdAt), 'HH:mm:ss.SSS')}</div>
                </div>

                <div style={{ 
                  padding: '1.25rem', 
                  background: 'linear-gradient(135deg, #fefce8 0%, #fef9c3 100%)', 
                  borderRadius: '12px',
                  border: '1px solid #fde047'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem' }}>
                    <div style={{ 
                      width: '28px', 
                      height: '28px', 
                      borderRadius: '6px', 
                      background: '#ca8a04', 
                      display: 'flex', 
                      alignItems: 'center', 
                      justifyContent: 'center' 
                    }}>
                      <FileText size={14} color="white" />
                    </div>
                    <span style={{ fontSize: '0.75rem', color: '#a16207', textTransform: 'uppercase', fontWeight: 600, letterSpacing: '0.05em' }}>Entity</span>
                  </div>
                  <div style={{ fontWeight: 600, fontSize: '1rem', color: '#713f12' }}>{selectedLog.entityType}</div>
                  <code style={{ 
                    fontSize: '0.75rem', 
                    background: 'rgba(0,0,0,0.05)', 
                    padding: '0.375rem 0.625rem', 
                    borderRadius: '6px',
                    display: 'inline-block',
                    marginTop: '0.5rem',
                    color: '#92400e',
                    fontFamily: 'monospace',
                    wordBreak: 'break-all'
                  }}>
                    {selectedLog.entityId || 'N/A'}
                  </code>
                </div>

                <div style={{ 
                  padding: '1.25rem', 
                  background: 'linear-gradient(135deg, #fdf4ff 0%, #fae8ff 100%)', 
                  borderRadius: '12px',
                  border: '1px solid #e879f9'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem' }}>
                    <div style={{ 
                      width: '28px', 
                      height: '28px', 
                      borderRadius: '6px', 
                      background: '#a855f7', 
                      display: 'flex', 
                      alignItems: 'center', 
                      justifyContent: 'center' 
                    }}>
                      <Hash size={14} color="white" />
                    </div>
                    <span style={{ fontSize: '0.75rem', color: '#7e22ce', textTransform: 'uppercase', fontWeight: 600, letterSpacing: '0.05em' }}>Action</span>
                  </div>
                  <span className={`badge badge-${getActionColor(selectedLog.action)}`} style={{ fontSize: '0.875rem', fontWeight: 600 }}>
                    {selectedLog.action}
                  </span>
                  {selectedLog.traceId && (
                    <div style={{ marginTop: '0.75rem' }}>
                      <span style={{ fontSize: '0.75rem', color: '#7e22ce' }}>Trace ID: </span>
                      <code style={{ fontSize: '0.7rem', background: 'rgba(0,0,0,0.05)', padding: '0.25rem 0.5rem', borderRadius: '4px' }}>
                        {selectedLog.traceId.slice(0, 16)}...
                      </code>
                    </div>
                  )}
                </div>
              </div>

              {(selectedLog.oldValues || selectedLog.newValues) && (
                <div style={{ 
                  marginTop: '1.5rem',
                  padding: '1.25rem',
                  background: 'var(--bg-secondary)',
                  borderRadius: '12px',
                  border: '1px solid var(--border)'
                }}>
                  <div style={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    gap: '0.75rem', 
                    marginBottom: '1rem',
                    paddingBottom: '0.75rem',
                    borderBottom: '1px solid var(--border)'
                  }}>
                    <div style={{ 
                      width: '32px', 
                      height: '32px', 
                      borderRadius: '8px', 
                      background: 'var(--primary)', 
                      display: 'flex', 
                      alignItems: 'center', 
                      justifyContent: 'center' 
                    }}>
                      <ArrowRight size={16} color="white" />
                    </div>
                    <h4 style={{ fontSize: '1rem', fontWeight: 600, margin: 0, color: 'var(--text-primary)' }}>
                      Changes
                    </h4>
                  </div>
                  
                  {selectedLog.oldValues && selectedLog.newValues ? (
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                      <div>
                        <div style={{ 
                          fontSize: '0.75rem', 
                          fontWeight: 600, 
                          color: '#dc2626', 
                          marginBottom: '0.5rem',
                          textTransform: 'uppercase',
                          letterSpacing: '0.05em',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.5rem'
                        }}>
                          <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#dc2626' }} />
                          Before
                        </div>
                        <pre style={{ 
                          background: '#fef2f2', 
                          padding: '1rem', 
                          borderRadius: '8px', 
                          fontSize: '0.8rem',
                          overflow: 'auto',
                          maxHeight: '220px',
                          border: '1px solid #fecaca',
                          margin: 0,
                          color: '#991b1b',
                          fontFamily: '"SF Mono", "Fira Code", monospace',
                          lineHeight: 1.5
                        }}>
                          {JSON.stringify(selectedLog.oldValues, null, 2)}
                        </pre>
                      </div>
                      <div>
                        <div style={{ 
                          fontSize: '0.75rem', 
                          fontWeight: 600, 
                          color: '#16a34a', 
                          marginBottom: '0.5rem',
                          textTransform: 'uppercase',
                          letterSpacing: '0.05em',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.5rem'
                        }}>
                          <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#16a34a' }} />
                          After
                        </div>
                        <pre style={{ 
                          background: '#f0fdf4', 
                          padding: '1rem', 
                          borderRadius: '8px', 
                          fontSize: '0.8rem',
                          overflow: 'auto',
                          maxHeight: '220px',
                          border: '1px solid #bbf7d0',
                          margin: 0,
                          color: '#166534',
                          fontFamily: '"SF Mono", "Fira Code", monospace',
                          lineHeight: 1.5
                        }}>
                          {JSON.stringify(selectedLog.newValues, null, 2)}
                        </pre>
                      </div>
                    </div>
                  ) : (
                    <div>
                      <div style={{ 
                        fontSize: '0.75rem', 
                        fontWeight: 600, 
                        color: selectedLog.oldValues ? '#dc2626' : '#16a34a', 
                        marginBottom: '0.5rem',
                        textTransform: 'uppercase',
                        letterSpacing: '0.05em',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.5rem'
                      }}>
                        <span style={{ 
                          width: '8px', 
                          height: '8px', 
                          borderRadius: '50%', 
                          background: selectedLog.oldValues ? '#dc2626' : '#16a34a' 
                        }} />
                        {selectedLog.oldValues ? 'Previous Values' : 'New Values'}
                      </div>
                      <pre style={{ 
                        background: selectedLog.oldValues ? '#fef2f2' : '#f0fdf4', 
                        padding: '1rem', 
                        borderRadius: '8px', 
                        fontSize: '0.8rem',
                        overflow: 'auto',
                        maxHeight: '300px',
                        border: `1px solid ${selectedLog.oldValues ? '#fecaca' : '#bbf7d0'}`,
                        margin: 0,
                        color: selectedLog.oldValues ? '#991b1b' : '#166534',
                        fontFamily: '"SF Mono", "Fira Code", monospace',
                        lineHeight: 1.5
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
                  padding: '2.5rem', 
                  color: 'var(--text-muted)',
                  background: 'var(--bg-secondary)',
                  borderRadius: '12px',
                  border: '2px dashed var(--border)',
                  marginTop: '1rem'
                }}>
                  <FileText size={32} style={{ marginBottom: '0.75rem', opacity: 0.5 }} />
                  <div style={{ fontWeight: 500 }}>No detailed change data available</div>
                  <div style={{ fontSize: '0.875rem', marginTop: '0.25rem' }}>This log entry does not contain before/after values.</div>
                </div>
              )}
            </div>

            <div className="modal-footer" style={{ 
              borderTop: '1px solid var(--border)', 
              padding: '1rem 1.5rem', 
              display: 'flex', 
              justifyContent: 'flex-end',
              background: 'var(--bg-secondary)',
              borderRadius: '0 0 16px 16px'
            }}>
              <button className="btn btn-primary" onClick={() => setSelectedLog(null)}>
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
