import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import api from '../lib/api';
import { format } from 'date-fns';
import { Filter, ChevronLeft, ChevronRight } from 'lucide-react';

export default function AuditLog() {
  const [filters, setFilters] = useState({
    entityType: '',
    action: '',
    fromDate: '',
    toDate: '',
    limit: 50,
    offset: 0,
  });

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
                  {log.newValues && (
                    <button
                      className="btn btn-secondary btn-sm"
                      onClick={() => {
                        alert(JSON.stringify(log.newValues, null, 2));
                      }}
                    >
                      View
                    </button>
                  )}
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
    </div>
  );
}
