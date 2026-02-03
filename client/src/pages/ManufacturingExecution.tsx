import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { 
  Factory, Plus, Eye, Play, CheckCircle, Clock, AlertTriangle, Package, Wrench, 
  FileWarning, Activity, X, Filter, Search, HelpCircle, ChevronDown, ChevronUp, ArrowRight
} from 'lucide-react';
import api from '../lib/api';
import { KpiCard, StatusBadge, EmptyState } from '../components/shared';
import { useToast } from '../components/ui/Toast';

interface BatchRecord {
  id: string;
  recordNumber: string;
  status: string;
  batchId: string;
  batch: { id: string; batchNumber: string; product: { name: string } };
  recipeId: string;
  recipe: { id: string; code: string; name: string; version: number };
  recipeVersion: number;
  startedAt?: string;
  completedAt?: string;
  reviewedAt?: string;
  approvedAt?: string;
  actualYield?: number;
  yieldUnit?: string;
  notes?: string;
  startedBy?: { firstName: string; lastName: string };
  completedBy?: { firstName: string; lastName: string };
  reviewedBy?: { firstName: string; lastName: string };
  approvedBy?: { firstName: string; lastName: string };
  _count?: { steps: number; materialConsumptions: number; equipmentUsages: number; deviations: number };
  createdAt: string;
}

interface BatchRecordStep {
  id: string;
  sequence: number;
  stepNumber: string;
  stepName: string;
  description?: string;
  category: string;
  instructions?: string;
  expectedDuration?: number;
  isQualityCheckpoint: boolean;
  requiresVerification: boolean;
  acceptanceCriteria?: string;
  status: string;
  startedAt?: string;
  completedAt?: string;
  verifiedAt?: string;
  actualValue?: string;
  actualDuration?: number;
  notes?: string;
  executedBy?: { firstName: string; lastName: string };
  verifiedBy?: { firstName: string; lastName: string };
}

interface Batch {
  id: string;
  batchNumber: string;
  status: string;
  product: { id: string; name: string };
}

interface Recipe {
  id: string;
  code: string;
  name: string;
  version: number;
  productId?: string;
}

const STATUSES = [
  { value: 'DRAFT', label: 'Draft', color: '#94a3b8' },
  { value: 'IN_PROGRESS', label: 'In Progress', color: '#3b82f6' },
  { value: 'PENDING_REVIEW', label: 'Pending Review', color: '#f59e0b' },
  { value: 'APPROVED', label: 'Approved', color: '#22c55e' },
  { value: 'REJECTED', label: 'Rejected', color: '#ef4444' },
  { value: 'CANCELLED', label: 'Cancelled', color: '#6b7280' },
];

const STEP_STATUSES = [
  { value: 'PENDING', label: 'Pending', color: '#94a3b8' },
  { value: 'IN_PROGRESS', label: 'In Progress', color: '#3b82f6' },
  { value: 'COMPLETED', label: 'Completed', color: '#22c55e' },
  { value: 'SKIPPED', label: 'Skipped', color: '#6b7280' },
  { value: 'FAILED', label: 'Failed', color: '#ef4444' },
  { value: 'ON_HOLD', label: 'On Hold', color: '#f59e0b' },
];

const statusDescriptions: Record<string, { label: string; description: string; nextAction: string }> = {
  DRAFT: { 
    label: 'Draft', 
    description: 'Batch record created but production not yet started.', 
    nextAction: 'Start production to begin recording steps' 
  },
  IN_PROGRESS: { 
    label: 'In Progress', 
    description: 'Production is actively running. Steps are being executed.', 
    nextAction: 'Complete all steps to finish production' 
  },
  PENDING_REVIEW: { 
    label: 'Pending Review', 
    description: 'Production complete. Awaiting QA review and approval.', 
    nextAction: 'Review and approve the batch record' 
  },
  APPROVED: { 
    label: 'Approved', 
    description: 'Batch record approved. Ready for release.', 
    nextAction: 'Batch can proceed to QC/release' 
  },
  REJECTED: { 
    label: 'Rejected', 
    description: 'Batch record was rejected during review.', 
    nextAction: 'Investigate and document deviation' 
  },
};

export default function ManufacturingExecution() {
  const queryClient = useQueryClient();
  const toast = useToast();

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [page, setPage] = useState(1);
  const [showStatusGuide, setShowStatusGuide] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedRecordId, setSelectedRecordId] = useState<string | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [createForm, setCreateForm] = useState({ batchId: '', recipeId: '', notes: '' });

  const { data: recordsData, isLoading } = useQuery({
    queryKey: ['batch-records', search, statusFilter, page],
    queryFn: async () => {
      const params: any = { page, limit: 15 };
      if (search) params.search = search;
      if (statusFilter) params.status = statusFilter;
      const { data } = await api.get('/batch-records', { params });
      return data;
    },
  });

  const { data: stats } = useQuery({
    queryKey: ['batch-records-stats'],
    queryFn: async () => {
      const { data } = await api.get('/batch-records', { params: { limit: 1000 } });
      const allRecords = data.records;
      return {
        total: allRecords.length,
        draft: allRecords.filter((r: any) => r.status === 'DRAFT').length,
        inProgress: allRecords.filter((r: any) => r.status === 'IN_PROGRESS').length,
        pendingReview: allRecords.filter((r: any) => r.status === 'PENDING_REVIEW').length,
        approved: allRecords.filter((r: any) => r.status === 'APPROVED').length,
        rejected: allRecords.filter((r: any) => r.status === 'REJECTED').length,
      };
    },
  });

  const { data: recordDetail } = useQuery({
    queryKey: ['batch-record', selectedRecordId],
    queryFn: async () => {
      const [detailRes, kpisRes] = await Promise.all([
        api.get(`/batch-records/${selectedRecordId}`),
        api.get(`/batch-records/${selectedRecordId}/kpis`)
      ]);
      return { record: detailRes.data, kpis: kpisRes.data };
    },
    enabled: !!selectedRecordId,
  });

  const { data: formData } = useQuery({
    queryKey: ['batch-record-form-data'],
    queryFn: async () => {
      const [batchesRes, recipesRes] = await Promise.all([
        api.get('/batches', { params: { limit: 100 } }),
        api.get('/recipes', { params: { status: 'ACTIVE', limit: 100 } })
      ]);
      return {
        batches: batchesRes.data.batches || [],
        recipes: recipesRes.data.recipes || [],
      };
    },
    enabled: showCreateModal,
  });

  const createMutation = useMutation({
    mutationFn: async (data: typeof createForm) => api.post('/batch-records', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['batch-records'] });
      queryClient.invalidateQueries({ queryKey: ['batch-records-stats'] });
      toast.success('Batch record created');
      setShowCreateModal(false);
      setCreateForm({ batchId: '', recipeId: '', notes: '' });
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.error || 'Failed to create batch record');
    },
  });

  const startRecordMutation = useMutation({
    mutationFn: async (id: string) => api.post(`/batch-records/${id}/start`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['batch-records'] });
      queryClient.invalidateQueries({ queryKey: ['batch-records-stats'] });
      queryClient.invalidateQueries({ queryKey: ['batch-record', selectedRecordId] });
      toast.success('Production started');
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.error || 'Failed to start production');
    },
  });

  const startStepMutation = useMutation({
    mutationFn: async ({ recordId, stepId }: { recordId: string; stepId: string }) => 
      api.post(`/batch-records/${recordId}/steps/${stepId}/start`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['batch-record', selectedRecordId] });
      toast.success('Step started');
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.error || 'Failed to start step');
    },
  });

  const completeStepMutation = useMutation({
    mutationFn: async ({ recordId, stepId }: { recordId: string; stepId: string }) => 
      api.post(`/batch-records/${recordId}/steps/${stepId}/complete`, {}),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['batch-record', selectedRecordId] });
      toast.success('Step completed');
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.error || 'Failed to complete step');
    },
  });

  const completeRecordMutation = useMutation({
    mutationFn: async (id: string) => api.post(`/batch-records/${id}/complete`, {}),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['batch-records'] });
      queryClient.invalidateQueries({ queryKey: ['batch-records-stats'] });
      queryClient.invalidateQueries({ queryKey: ['batch-record', selectedRecordId] });
      toast.success('Production completed');
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.error || 'Failed to complete production');
    },
  });

  const reviewMutation = useMutation({
    mutationFn: async (id: string) => api.post(`/batch-records/${id}/review`, { meaning: 'Reviewed and verified' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['batch-records'] });
      queryClient.invalidateQueries({ queryKey: ['batch-records-stats'] });
      queryClient.invalidateQueries({ queryKey: ['batch-record', selectedRecordId] });
      toast.success('Record reviewed');
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.error || 'Failed to review record');
    },
  });

  const approveMutation = useMutation({
    mutationFn: async (id: string) => api.post(`/batch-records/${id}/approve`, { meaning: 'Approved for release' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['batch-records'] });
      queryClient.invalidateQueries({ queryKey: ['batch-records-stats'] });
      queryClient.invalidateQueries({ queryKey: ['batch-record', selectedRecordId] });
      toast.success('Record approved');
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.error || 'Failed to approve record');
    },
  });

  const handleViewDetail = (id: string) => {
    setSelectedRecordId(id);
    setShowDetailModal(true);
  };

  const getStatusColor = (status: string): string => {
    const colors: Record<string, string> = {
      DRAFT: 'default',
      IN_PROGRESS: 'info',
      PENDING_REVIEW: 'warning',
      APPROVED: 'success',
      REJECTED: 'danger',
      CANCELLED: 'default',
    };
    return colors[status] || 'default';
  };

  const getStepStatusStyle = (status: string) => {
    const s = STEP_STATUSES.find(st => st.value === status);
    return { backgroundColor: `${s?.color}20`, color: s?.color };
  };

  const records = recordsData?.records || [];
  const totalPages = recordsData?.totalPages || 1;
  const selectedRecord = recordDetail?.record;
  const recordKpis = recordDetail?.kpis;
  const recordSteps = selectedRecord?.steps || [];

  if (isLoading) {
    return (
      <div className="loading-overlay">
        <div className="spinner" />
      </div>
    );
  }

  return (
    <div style={{ padding: '1.5rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.5rem' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.25rem' }}>
            <Factory size={28} style={{ color: 'var(--primary)' }} />
            <h1 style={{ fontSize: '1.5rem', fontWeight: 600, margin: 0 }}>Manufacturing Execution</h1>
          </div>
          <p style={{ color: 'var(--text-muted)', margin: 0 }}>
            Electronic Batch Records (eBR) for production control
          </p>
        </div>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <button 
            className="btn btn-secondary"
            onClick={() => setShowStatusGuide(!showStatusGuide)}
          >
            <HelpCircle size={16} />
            Workflow Guide
            {showStatusGuide ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
          </button>
          <button className="btn btn-primary" onClick={() => setShowCreateModal(true)}>
            <Plus size={16} /> New Batch Record
          </button>
        </div>
      </div>

      <div className="grid" style={{ gridTemplateColumns: 'repeat(6, 1fr)', gap: '1rem', marginBottom: '1.5rem' }}>
        <KpiCard 
          title="Total Records" 
          value={stats?.total || 0} 
          icon={<Factory size={20} />}
          color="primary"
          onClick={() => setStatusFilter('')}
          selected={!statusFilter}
        />
        <KpiCard 
          title="Draft" 
          value={stats?.draft || 0} 
          icon={<Clock size={20} />}
          color="default"
          onClick={() => setStatusFilter('DRAFT')}
          selected={statusFilter === 'DRAFT'}
        />
        <KpiCard 
          title="In Progress" 
          value={stats?.inProgress || 0} 
          icon={<Activity size={20} />}
          color="info"
          onClick={() => setStatusFilter('IN_PROGRESS')}
          selected={statusFilter === 'IN_PROGRESS'}
        />
        <KpiCard 
          title="Pending Review" 
          value={stats?.pendingReview || 0} 
          icon={<Eye size={20} />}
          color="warning"
          onClick={() => setStatusFilter('PENDING_REVIEW')}
          selected={statusFilter === 'PENDING_REVIEW'}
        />
        <KpiCard 
          title="Approved" 
          value={stats?.approved || 0} 
          icon={<CheckCircle size={20} />}
          color="success"
          onClick={() => setStatusFilter('APPROVED')}
          selected={statusFilter === 'APPROVED'}
        />
        <KpiCard 
          title="Rejected" 
          value={stats?.rejected || 0} 
          icon={<AlertTriangle size={20} />}
          color="danger"
          onClick={() => setStatusFilter('REJECTED')}
          selected={statusFilter === 'REJECTED'}
        />
      </div>

      <div className="card" style={{ padding: '1rem', marginBottom: '1rem' }}>
        <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Filter size={18} style={{ color: 'var(--text-muted)' }} />
            <span style={{ fontWeight: 500, color: 'var(--text-muted)' }}>Filters:</span>
          </div>
          <div style={{ position: 'relative', flex: 1, minWidth: '200px', maxWidth: '300px' }}>
            <Search size={16} style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
            <input
              type="text"
              className="form-input"
              placeholder="Search record # or batch..."
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              style={{ paddingLeft: '2.25rem' }}
            />
          </div>
          <select 
            className="form-select"
            style={{ width: 'auto', minWidth: '150px' }}
            value={statusFilter} 
            onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
          >
            <option value="">All Statuses</option>
            {STATUSES.map(s => (
              <option key={s.value} value={s.value}>{s.label}</option>
            ))}
          </select>
          {(search || statusFilter) && (
            <button
              className="btn btn-sm btn-secondary"
              onClick={() => { setSearch(''); setStatusFilter(''); setPage(1); }}
            >
              <X size={14} /> Clear
            </button>
          )}
        </div>
      </div>

      {showStatusGuide && (
        <div className="card" style={{ marginBottom: '1.5rem', padding: '1.25rem' }}>
          <h3 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <HelpCircle size={18} style={{ color: 'var(--primary)' }} />
            Batch Record Workflow Guide
          </h3>
          <div style={{ marginBottom: '1rem', fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
            Batch records flow through these stages from creation to approval:
          </div>
          <div style={{ 
            display: 'flex', 
            flexWrap: 'wrap',
            gap: '0.5rem',
            marginBottom: '1rem',
            padding: '0.75rem',
            backgroundColor: 'var(--bg-secondary)',
            borderRadius: 'var(--radius)',
          }}>
            {['DRAFT', 'IN_PROGRESS', 'PENDING_REVIEW', 'APPROVED'].map((status, idx, arr) => (
              <div key={status} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <StatusBadge status={status} size="sm" />
                {idx < arr.length - 1 && <ArrowRight size={14} style={{ color: 'var(--text-muted)' }} />}
              </div>
            ))}
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '0.75rem' }}>
            {Object.entries(statusDescriptions).map(([status, info]) => (
              <div key={status} style={{ 
                padding: '0.75rem', 
                backgroundColor: 'var(--bg-tertiary)', 
                borderRadius: 'var(--radius-sm)',
                borderLeft: `3px solid var(--${getStatusColor(status) === 'default' ? 'secondary' : getStatusColor(status)})`,
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
                  <StatusBadge status={status} size="sm" />
                </div>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '0.25rem' }}>
                  {info.description}
                </div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                  <strong>Next:</strong> {info.nextAction}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="card">
        <div style={{ padding: '1rem 1.5rem', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <h3 style={{ fontWeight: 600, fontSize: '1rem', margin: 0 }}>
            Batch Records ({records.length})
          </h3>
        </div>
        {records.length > 0 ? (
          <>
            <table className="table" style={{ marginBottom: 0 }}>
              <thead>
                <tr>
                  <th>Record #</th>
                  <th>Batch</th>
                  <th>Product</th>
                  <th>Recipe</th>
                  <th>Status</th>
                  <th>Progress</th>
                  <th>Created</th>
                  <th style={{ width: '100px', textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {records.map((record: BatchRecord) => (
                  <tr key={record.id}>
                    <td style={{ fontWeight: 500, fontFamily: 'monospace', fontSize: '0.8125rem', color: 'var(--primary)' }}>
                      {record.recordNumber}
                    </td>
                    <td>{record.batch?.batchNumber}</td>
                    <td>{record.batch?.product?.name}</td>
                    <td>
                      <span style={{ fontSize: '0.875rem' }}>{record.recipe?.code} v{record.recipeVersion}</span>
                    </td>
                    <td>
                      <StatusBadge status={record.status} size="sm" />
                    </td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <Activity size={14} style={{ color: 'var(--text-muted)' }} />
                        <span style={{ fontSize: '0.875rem' }}>{record._count?.steps || 0} steps</span>
                        {(record._count?.deviations || 0) > 0 && (
                          <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', color: 'var(--error)', fontSize: '0.75rem' }}>
                            <AlertTriangle size={12} />
                            {record._count?.deviations}
                          </span>
                        )}
                      </div>
                    </td>
                    <td style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>
                      {new Date(record.createdAt).toLocaleDateString()}
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
                        <button 
                          className="btn btn-sm btn-outline"
                          onClick={() => handleViewDetail(record.id)}
                          title="View Details"
                        >
                          <Eye size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {totalPages > 1 && (
              <div style={{ padding: '1rem', borderTop: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <button
                  className="btn btn-secondary"
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  disabled={page === 1}
                >
                  Previous
                </button>
                <span style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>Page {page} of {totalPages}</span>
                <button
                  className="btn btn-secondary"
                  onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                >
                  Next
                </button>
              </div>
            )}
          </>
        ) : (
          <div style={{ padding: '2rem' }}>
            <EmptyState 
              title="No batch records found"
              message="Create a new batch record to get started"
              icon="package"
            />
          </div>
        )}
      </div>

      {showCreateModal && (
        <div className="modal-overlay" onClick={() => setShowCreateModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '500px' }}>
            <div className="modal-header">
              <h2>Create Batch Record</h2>
              <button className="btn btn-ghost" onClick={() => setShowCreateModal(false)}>&times;</button>
            </div>
            <div className="modal-body">
              <div className="form-group">
                <label>Batch *</label>
                <select
                  className="form-select"
                  value={createForm.batchId}
                  onChange={(e) => setCreateForm({ ...createForm, batchId: e.target.value })}
                >
                  <option value="">Select batch...</option>
                  {formData?.batches.map((b: Batch) => (
                    <option key={b.id} value={b.id}>{b.batchNumber} - {b.product?.name}</option>
                  ))}
                </select>
              </div>
              <div className="form-group">
                <label>Recipe *</label>
                <select
                  className="form-select"
                  value={createForm.recipeId}
                  onChange={(e) => setCreateForm({ ...createForm, recipeId: e.target.value })}
                >
                  <option value="">Select recipe...</option>
                  {formData?.recipes.map((r: Recipe) => (
                    <option key={r.id} value={r.id}>{r.code} - {r.name} (v{r.version})</option>
                  ))}
                </select>
              </div>
              <div className="form-group">
                <label>Notes</label>
                <textarea
                  className="form-input"
                  value={createForm.notes}
                  onChange={(e) => setCreateForm({ ...createForm, notes: e.target.value })}
                  rows={3}
                />
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn" onClick={() => setShowCreateModal(false)}>Cancel</button>
              <button
                className="btn btn-primary"
                onClick={() => createMutation.mutate(createForm)}
                disabled={createMutation.isPending || !createForm.batchId || !createForm.recipeId}
              >
                {createMutation.isPending ? 'Creating...' : 'Create Record'}
              </button>
            </div>
          </div>
        </div>
      )}

      {showDetailModal && selectedRecord && (
        <div className="modal-overlay" onClick={() => setShowDetailModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '900px', maxHeight: '90vh', display: 'flex', flexDirection: 'column' }}>
            <div className="modal-header" style={{ background: 'var(--bg-secondary)' }}>
              <div>
                <h2 style={{ marginBottom: '0.25rem' }}>{selectedRecord.recordNumber}</h2>
                <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)', margin: 0 }}>
                  {selectedRecord.batch?.batchNumber} - {selectedRecord.batch?.product?.name}
                </p>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                <StatusBadge status={selectedRecord.status} size="md" />
                <button className="btn btn-ghost" onClick={() => setShowDetailModal(false)}>&times;</button>
              </div>
            </div>

            <div style={{ flex: 1, overflowY: 'auto', padding: '1.5rem' }}>
              {recordKpis && (
                <div className="grid" style={{ gridTemplateColumns: 'repeat(5, 1fr)', gap: '1rem', marginBottom: '1.5rem' }}>
                  <div style={{ padding: '1rem', background: 'rgba(59, 130, 246, 0.1)', borderRadius: 'var(--radius)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--info)', marginBottom: '0.5rem' }}>
                      <Activity size={16} />
                      <span style={{ fontSize: '0.75rem', fontWeight: 500 }}>Progress</span>
                    </div>
                    <div style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--info)' }}>{recordKpis.progress?.percentage || 0}%</div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{recordKpis.progress?.completed}/{recordKpis.progress?.total} steps</div>
                  </div>
                  <div style={{ padding: '1rem', background: 'rgba(139, 92, 246, 0.1)', borderRadius: 'var(--radius)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#8b5cf6', marginBottom: '0.5rem' }}>
                      <Clock size={16} />
                      <span style={{ fontSize: '0.75rem', fontWeight: 500 }}>Duration</span>
                    </div>
                    <div style={{ fontSize: '1.5rem', fontWeight: 700, color: '#8b5cf6' }}>{recordKpis.timing?.actualMinutes || 0} min</div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Expected: {recordKpis.timing?.expectedMinutes || 0} min</div>
                  </div>
                  <div style={{ padding: '1rem', background: 'rgba(34, 197, 94, 0.1)', borderRadius: 'var(--radius)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--success)', marginBottom: '0.5rem' }}>
                      <Package size={16} />
                      <span style={{ fontSize: '0.75rem', fontWeight: 500 }}>Materials</span>
                    </div>
                    <div style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--success)' }}>{recordKpis.materials?.itemsConsumed || 0}</div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Items consumed</div>
                  </div>
                  <div style={{ padding: '1rem', background: 'rgba(245, 158, 11, 0.1)', borderRadius: 'var(--radius)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--warning)', marginBottom: '0.5rem' }}>
                      <Wrench size={16} />
                      <span style={{ fontSize: '0.75rem', fontWeight: 500 }}>Equipment</span>
                    </div>
                    <div style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--warning)' }}>{recordKpis.equipment?.itemsUsed || 0}</div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Items used</div>
                  </div>
                  <div style={{ padding: '1rem', background: 'rgba(239, 68, 68, 0.1)', borderRadius: 'var(--radius)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--error)', marginBottom: '0.5rem' }}>
                      <FileWarning size={16} />
                      <span style={{ fontSize: '0.75rem', fontWeight: 500 }}>Deviations</span>
                    </div>
                    <div style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--error)' }}>{recordKpis.deviations?.total || 0}</div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{recordKpis.deviations?.open || 0} open</div>
                  </div>
                </div>
              )}

              <div className="card" style={{ marginBottom: '1rem' }}>
                <div style={{ padding: '0.75rem 1rem', borderBottom: '1px solid var(--border)', background: 'var(--bg-secondary)' }}>
                  <h4 style={{ fontWeight: 600, margin: 0 }}>Production Steps</h4>
                </div>
                <div>
                  {recordSteps.map((step: BatchRecordStep) => (
                    <div key={step.id} style={{ 
                      padding: '0.75rem 1rem', 
                      borderBottom: '1px solid var(--border)',
                      display: 'flex', 
                      alignItems: 'center', 
                      justifyContent: 'space-between',
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                        <div style={{ 
                          width: '32px', 
                          height: '32px', 
                          borderRadius: '50%', 
                          background: 'var(--bg-secondary)', 
                          display: 'flex', 
                          alignItems: 'center', 
                          justifyContent: 'center',
                          fontWeight: 600,
                          fontSize: '0.875rem',
                        }}>
                          {step.sequence}
                        </div>
                        <div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <span style={{ fontWeight: 500 }}>{step.stepNumber}: {step.stepName}</span>
                            {step.isQualityCheckpoint && (
                              <span className="badge" style={{ fontSize: '0.625rem', background: 'rgba(139, 92, 246, 0.1)', color: '#8b5cf6' }}>QC</span>
                            )}
                            {step.requiresVerification && (
                              <span className="badge" style={{ fontSize: '0.625rem', background: 'rgba(59, 130, 246, 0.1)', color: '#3b82f6' }}>Verify</span>
                            )}
                          </div>
                          <div style={{ fontSize: '0.8125rem', color: 'var(--text-muted)' }}>{step.description || step.category}</div>
                        </div>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                        {step.expectedDuration && (
                          <span style={{ fontSize: '0.8125rem', color: 'var(--text-muted)' }}>~{step.expectedDuration} min</span>
                        )}
                        <span className="badge" style={getStepStatusStyle(step.status)}>
                          {STEP_STATUSES.find(s => s.value === step.status)?.label}
                        </span>
                        {selectedRecord.status === 'IN_PROGRESS' && step.status === 'PENDING' && (
                          <button 
                            className="btn btn-sm btn-secondary"
                            onClick={() => startStepMutation.mutate({ recordId: selectedRecord.id, stepId: step.id })}
                            disabled={startStepMutation.isPending}
                          >
                            <Play size={14} />
                          </button>
                        )}
                        {selectedRecord.status === 'IN_PROGRESS' && step.status === 'IN_PROGRESS' && (
                          <button 
                            className="btn btn-sm btn-primary"
                            onClick={() => completeStepMutation.mutate({ recordId: selectedRecord.id, stepId: step.id })}
                            disabled={completeStepMutation.isPending}
                          >
                            <CheckCircle size={14} />
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {(selectedRecord.startedBy || selectedRecord.approvedBy) && (
                <div style={{ fontSize: '0.875rem', color: 'var(--text-muted)', display: 'flex', gap: '2rem' }}>
                  {selectedRecord.startedBy && (
                    <span>Started by: {selectedRecord.startedBy.firstName} {selectedRecord.startedBy.lastName}</span>
                  )}
                  {selectedRecord.approvedBy && (
                    <span>Approved by: {selectedRecord.approvedBy.firstName} {selectedRecord.approvedBy.lastName}</span>
                  )}
                </div>
              )}
            </div>

            <div className="modal-footer" style={{ background: 'var(--bg-secondary)' }}>
              <button className="btn" onClick={() => setShowDetailModal(false)}>Close</button>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                {selectedRecord.status === 'DRAFT' && (
                  <button 
                    className="btn btn-primary"
                    onClick={() => startRecordMutation.mutate(selectedRecord.id)}
                    disabled={startRecordMutation.isPending}
                  >
                    <Play size={16} /> Start Production
                  </button>
                )}
                {selectedRecord.status === 'IN_PROGRESS' && recordKpis?.progress?.percentage === 100 && (
                  <button 
                    className="btn btn-primary"
                    onClick={() => completeRecordMutation.mutate(selectedRecord.id)}
                    disabled={completeRecordMutation.isPending}
                  >
                    <CheckCircle size={16} /> Complete Production
                  </button>
                )}
                {selectedRecord.status === 'PENDING_REVIEW' && !selectedRecord.reviewedAt && (
                  <button 
                    className="btn btn-warning"
                    onClick={() => reviewMutation.mutate(selectedRecord.id)}
                    disabled={reviewMutation.isPending}
                  >
                    <Eye size={16} /> Review Record
                  </button>
                )}
                {selectedRecord.status === 'PENDING_REVIEW' && selectedRecord.reviewedAt && (
                  <button 
                    className="btn btn-primary"
                    onClick={() => approveMutation.mutate(selectedRecord.id)}
                    disabled={approveMutation.isPending}
                  >
                    <CheckCircle size={16} /> Approve Record
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
