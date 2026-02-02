import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import api from '../lib/api';
import { format, addDays } from 'date-fns';
import { 
  Play, Route, ArrowRight, Calendar, Package, FlaskConical, 
  Beaker, Shield, AlertTriangle, Clock, Filter, X, Search
} from 'lucide-react';
import { useToast } from '../components/ui/Toast';
import { parseApiError } from '../components/ui/FormErrors';

const allStatuses = [
  { value: 'PLANNED', label: 'Planned', group: 'main' },
  { value: 'SCHEDULED', label: 'Scheduled', group: 'main' },
  { value: 'IN_PRODUCTION', label: 'In Production', group: 'main' },
  { value: 'PRODUCTION_COMPLETE', label: 'Production Complete', group: 'main' },
  { value: 'QC_PENDING', label: 'QC Pending', group: 'main' },
  { value: 'QC_IN_PROGRESS', label: 'QC In Progress', group: 'main' },
  { value: 'QC_PASSED', label: 'QC Passed', group: 'main' },
  { value: 'QP_REVIEW', label: 'QP Review', group: 'main' },
  { value: 'RELEASED', label: 'Released', group: 'main' },
  { value: 'DISPENSING_IN_PROGRESS', label: 'Dispensing', group: 'main' },
  { value: 'DISPENSED', label: 'Dispensed', group: 'main' },
  { value: 'PACKED', label: 'Packed', group: 'main' },
  { value: 'DISPATCHED', label: 'Dispatched', group: 'main' },
  { value: 'CLOSED', label: 'Closed', group: 'main' },
  { value: 'ON_HOLD', label: 'On Hold', group: 'exception' },
  { value: 'REJECTED', label: 'Rejected', group: 'exception' },
  { value: 'FAILED_QC', label: 'QC Failed', group: 'exception' },
  { value: 'CANCELLED', label: 'Cancelled', group: 'exception' },
  { value: 'DEVIATION_OPEN', label: 'Deviation', group: 'exception' },
];

export default function Batches() {
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [productFilter, setProductFilter] = useState<string>('');
  const [dateFrom, setDateFrom] = useState<string>('');
  const [dateTo, setDateTo] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [showExceptionsOnly, setShowExceptionsOnly] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const queryClient = useQueryClient();
  const toast = useToast();

  const { data: batches, isLoading } = useQuery({
    queryKey: ['batches', statusFilter, productFilter, dateFrom, dateTo],
    queryFn: async () => {
      const params: any = {};
      if (statusFilter) params.status = statusFilter;
      if (productFilter) params.productId = productFilter;
      if (dateFrom) params.fromDate = dateFrom;
      if (dateTo) params.toDate = dateTo;
      const { data } = await api.get('/batches', { params });
      return data;
    },
  });

  const { data: metrics } = useQuery({
    queryKey: ['batch-metrics'],
    queryFn: async () => {
      const { data } = await api.get('/batches/metrics/summary');
      return data;
    },
  });

  const { data: products } = useQuery({
    queryKey: ['products'],
    queryFn: async () => {
      const { data } = await api.get('/products');
      return data;
    },
  });

  const transitionMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      return api.post(`/batches/${id}/transition`, { status });
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['batches'] });
      queryClient.invalidateQueries({ queryKey: ['batch-metrics'] });
      toast.success('Status Updated', `Batch moved to ${variables.status.replace(/_/g, ' ')}`);
    },
    onError: (error: any) => {
      const apiError = parseApiError(error);
      toast.error('Update Failed', apiError?.userMessage || 'Failed to update batch status');
    },
  });

  const getNextStatus = (currentStatus: string): { status: string; label: string } | null => {
    const transitions: Record<string, { status: string; label: string }> = {
      PLANNED: { status: 'IN_PRODUCTION', label: 'Start' },
      SCHEDULED: { status: 'IN_PRODUCTION', label: 'Start' },
      IN_PRODUCTION: { status: 'PRODUCTION_COMPLETE', label: 'Complete' },
      PRODUCTION_COMPLETE: { status: 'QC_PENDING', label: 'To QC' },
      QC_PENDING: { status: 'QC_IN_PROGRESS', label: 'Start QC' },
      QC_IN_PROGRESS: { status: 'QC_PASSED', label: 'Pass QC' },
      QC_PASSED: { status: 'QP_REVIEW', label: 'To QP' },
      RELEASED: { status: 'DISPENSING_IN_PROGRESS', label: 'Dispense' },
      DISPENSING_IN_PROGRESS: { status: 'DISPENSED', label: 'Done' },
      DISPENSED: { status: 'PACKED', label: 'Pack' },
      PACKED: { status: 'DISPATCHED', label: 'Dispatch' },
      DISPATCHED: { status: 'CLOSED', label: 'Close' },
    };
    return transitions[currentStatus] || null;
  };

  const getStatusColor = (status: string): string => {
    const colors: Record<string, string> = {
      // Planning stage - gray (not started)
      PLANNED: 'default',
      SCHEDULED: 'secondary',
      // Production stage - blue (active work)
      IN_PRODUCTION: 'info',
      PRODUCTION_COMPLETE: 'info',
      // QC stage - orange/warning (testing)
      QC_PENDING: 'warning',
      QC_IN_PROGRESS: 'warning',
      QC_PASSED: 'success',
      // Release stage - purple (review)
      QP_REVIEW: 'purple',
      RELEASED: 'success',
      // Dispensing stage - teal (fulfillment)
      DISPENSING_IN_PROGRESS: 'teal',
      DISPENSED: 'teal',
      // Logistics stage - blue (shipping)
      PACKED: 'info',
      DISPATCHED: 'info',
      // Completed - dark green (terminal state)
      CLOSED: 'complete',
      // Exceptions - red/orange
      ON_HOLD: 'warning',
      REJECTED: 'danger',
      FAILED_QC: 'danger',
      CANCELLED: 'danger',
      DEVIATION_OPEN: 'warning',
    };
    return colors[status] || 'default';
  };

  const isException = (status: string) => 
    ['ON_HOLD', 'REJECTED', 'FAILED_QC', 'CANCELLED', 'DEVIATION_OPEN'].includes(status);

  const filteredBatches = batches?.filter((batch: any) => {
    if (showExceptionsOnly && !isException(batch.status)) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      if (!batch.batchNumber.toLowerCase().includes(q) &&
          !batch.product?.name.toLowerCase().includes(q)) {
        return false;
      }
    }
    return true;
  });

  const clearFilters = () => {
    setStatusFilter('');
    setProductFilter('');
    setDateFrom('');
    setDateTo('');
    setSearchQuery('');
    setShowExceptionsOnly(false);
  };

  const hasActiveFilters = statusFilter || productFilter || dateFrom || dateTo || searchQuery || showExceptionsOnly;

  if (isLoading) {
    return (
      <div className="loading-overlay">
        <div className="spinner" />
      </div>
    );
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <h2 style={{ fontSize: '1.25rem', fontWeight: 600 }}>Batch Management</h2>
        <button 
          className={`btn ${showFilters ? 'btn-primary' : 'btn-secondary'}`}
          onClick={() => setShowFilters(!showFilters)}
        >
          <Filter size={16} /> Filters {hasActiveFilters && <span className="badge badge-danger" style={{ marginLeft: '0.25rem' }}>!</span>}
        </button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
        <div className="card" style={{ padding: '1rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <div style={{ padding: '0.5rem', borderRadius: '8px', backgroundColor: 'rgba(59, 130, 246, 0.1)' }}>
            <Calendar size={20} style={{ color: 'var(--primary)' }} />
          </div>
          <div>
            <div style={{ fontSize: '1.5rem', fontWeight: 700 }}>{metrics?.batchesToday || 0}</div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Today</div>
          </div>
        </div>
        <div className="card" style={{ padding: '1rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <div style={{ padding: '0.5rem', borderRadius: '8px', backgroundColor: 'rgba(245, 158, 11, 0.1)' }}>
            <Beaker size={20} style={{ color: '#f59e0b' }} />
          </div>
          <div>
            <div style={{ fontSize: '1.5rem', fontWeight: 700 }}>{metrics?.awaitingQC || 0}</div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Awaiting QC</div>
          </div>
        </div>
        <div className="card" style={{ padding: '1rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <div style={{ padding: '0.5rem', borderRadius: '8px', backgroundColor: 'rgba(139, 92, 246, 0.1)' }}>
            <Shield size={20} style={{ color: '#8b5cf6' }} />
          </div>
          <div>
            <div style={{ fontSize: '1.5rem', fontWeight: 700 }}>{metrics?.awaitingRelease || 0}</div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Awaiting Release</div>
          </div>
        </div>
        <div className="card" style={{ padding: '1rem', display: 'flex', alignItems: 'center', gap: '0.75rem', cursor: 'pointer' }} onClick={() => setShowExceptionsOnly(!showExceptionsOnly)}>
          <div style={{ padding: '0.5rem', borderRadius: '8px', backgroundColor: 'rgba(239, 68, 68, 0.1)' }}>
            <AlertTriangle size={20} style={{ color: '#ef4444' }} />
          </div>
          <div>
            <div style={{ fontSize: '1.5rem', fontWeight: 700 }}>{metrics?.exceptions || 0}</div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Exceptions</div>
          </div>
        </div>
      </div>

      {showFilters && (
        <div className="card" style={{ padding: '1rem', marginBottom: '1.5rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <h4 style={{ margin: 0, fontSize: '0.875rem', fontWeight: 600 }}>Filters</h4>
            {hasActiveFilters && (
              <button className="btn btn-secondary btn-sm" onClick={clearFilters}>
                <X size={14} /> Clear All
              </button>
            )}
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1rem' }}>
            <div>
              <label className="form-label">Search</label>
              <div style={{ position: 'relative' }}>
                <Search size={16} style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                <input
                  type="text"
                  className="form-input"
                  style={{ paddingLeft: '2.25rem' }}
                  placeholder="Batch # or product..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
            </div>
            <div>
              <label className="form-label">Status</label>
              <select
                className="form-select"
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
              >
                <option value="">All Statuses</option>
                <optgroup label="Main Stages">
                  {allStatuses.filter(s => s.group === 'main').map(s => (
                    <option key={s.value} value={s.value}>{s.label}</option>
                  ))}
                </optgroup>
                <optgroup label="Exceptions">
                  {allStatuses.filter(s => s.group === 'exception').map(s => (
                    <option key={s.value} value={s.value}>{s.label}</option>
                  ))}
                </optgroup>
              </select>
            </div>
            <div>
              <label className="form-label">Product</label>
              <select
                className="form-select"
                value={productFilter}
                onChange={(e) => setProductFilter(e.target.value)}
              >
                <option value="">All Products</option>
                {products?.map((p: any) => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="form-label">From Date</label>
              <input
                type="date"
                className="form-input"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
              />
            </div>
            <div>
              <label className="form-label">To Date</label>
              <input
                type="date"
                className="form-input"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
              />
            </div>
            <div style={{ display: 'flex', alignItems: 'flex-end' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={showExceptionsOnly}
                  onChange={(e) => setShowExceptionsOnly(e.target.checked)}
                />
                Exceptions Only
              </label>
            </div>
          </div>
        </div>
      )}

      <div className="card">
        <table className="table">
          <thead>
            <tr>
              <th>Batch #</th>
              <th>Product</th>
              <th>Planned Start</th>
              <th>Status</th>
              <th>Orders</th>
              <th>Doses</th>
              <th>Updated</th>
              <th style={{ width: '140px' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredBatches?.length > 0 ? (
              filteredBatches.map((batch: any) => {
                const nextStatus = getNextStatus(batch.status);
                const doseCount = batch.doseUnits?.length || 0;
                return (
                  <tr key={batch.id}>
                    <td>
                      <strong>{batch.batchNumber}</strong>
                      {isException(batch.status) && (
                        <AlertTriangle size={14} style={{ color: 'var(--danger)', marginLeft: '0.25rem' }} />
                      )}
                    </td>
                    <td>{batch.product?.name}</td>
                    <td>{format(new Date(batch.plannedStartTime), 'MMM dd HH:mm')}</td>
                    <td>
                      <span className={`badge badge-${getStatusColor(batch.status)}`}>
                        {batch.status.replace(/_/g, ' ')}
                      </span>
                    </td>
                    <td>{batch.orders?.length || 0}</td>
                    <td>{doseCount}</td>
                    <td style={{ fontSize: '0.8125rem', color: 'var(--text-muted)' }}>
                      {format(new Date(batch.updatedAt), 'MMM dd HH:mm')}
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: '0.5rem' }}>
                        <Link to={`/batches/${batch.id}/journey`} className="btn btn-secondary btn-sm" title="View Journey">
                          <Route size={14} />
                        </Link>
                        {nextStatus && !isException(batch.status) && (
                          <button
                            className="btn btn-primary btn-sm"
                            onClick={() => transitionMutation.mutate({ id: batch.id, status: nextStatus.status })}
                            disabled={transitionMutation.isPending}
                            title={nextStatus.label}
                          >
                            <Play size={14} /> {nextStatus.label}
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })
            ) : (
              <tr>
                <td colSpan={8} style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>
                  <Package size={32} style={{ marginBottom: '0.5rem', opacity: 0.5 }} />
                  <p>No batches found</p>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
