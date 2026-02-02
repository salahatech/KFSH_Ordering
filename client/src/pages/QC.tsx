import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import api from '../lib/api';
import { format } from 'date-fns';
import { ClipboardCheck, CheckCircle, XCircle, Play, Clock, AlertTriangle, Beaker, FileText, Eye, History } from 'lucide-react';
import { KpiCard, StatusBadge, FilterBar, EmptyState, type FilterWidget } from '../components/shared';
import { useToast } from '../components/ui/Toast';

const qcSteps = [
  { key: 'pending', label: 'Pending', icon: Clock },
  { key: 'testing', label: 'Testing', icon: Beaker },
  { key: 'review', label: 'Review', icon: FileText },
  { key: 'complete', label: 'Complete', icon: CheckCircle },
];

function getQCProgress(results: any[]) {
  if (!results || results.length === 0) return { completed: 0, total: 0, passed: 0, failed: 0 };
  const completed = results.filter(r => r.passed !== null).length;
  const passed = results.filter(r => r.passed === true).length;
  const failed = results.filter(r => r.passed === false).length;
  return { completed, total: results.length, passed, failed };
}

export default function QC() {
  const [selectedBatch, setSelectedBatch] = useState<any>(null);
  const [viewMode, setViewMode] = useState<'workbench' | 'history'>('workbench');
  const [filters, setFilters] = useState<Record<string, any>>({});
  const queryClient = useQueryClient();
  const toast = useToast();

  const { data: stats } = useQuery({
    queryKey: ['qc-stats'],
    queryFn: async () => {
      const { data } = await api.get('/qc/stats');
      return data;
    },
  });

  const { data: qcBatches, isLoading } = useQuery({
    queryKey: ['qc-batches'],
    queryFn: async () => {
      const { data } = await api.get('/qc/batches');
      return data;
    },
  });

  const { data: historyBatches, isLoading: historyLoading } = useQuery({
    queryKey: ['qc-history'],
    queryFn: async () => {
      const { data } = await api.get('/qc/history?days=14');
      return data;
    },
    enabled: viewMode === 'history',
  });

  const { data: batchQC, isLoading: qcLoading } = useQuery({
    queryKey: ['batch-qc', selectedBatch?.id],
    queryFn: async () => {
      const { data } = await api.get(`/qc/batches/${selectedBatch.id}`);
      return data;
    },
    enabled: !!selectedBatch,
  });

  const initializeMutation = useMutation({
    mutationFn: async (batchId: string) => {
      return api.post(`/qc/batches/${batchId}/initialize`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['qc-batches'] });
      queryClient.invalidateQueries({ queryKey: ['batch-qc'] });
      queryClient.invalidateQueries({ queryKey: ['qc-stats'] });
      toast.success('QC testing initialized');
    },
    onError: () => toast.error('Failed to initialize QC'),
  });

  const updateResultMutation = useMutation({
    mutationFn: async ({ resultId, data }: { resultId: string; data: any }) => {
      return api.put(`/qc/results/${resultId}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['batch-qc'] });
    },
    onError: () => toast.error('Failed to update result'),
  });

  const completeMutation = useMutation({
    mutationFn: async (batchId: string) => {
      return api.post(`/qc/batches/${batchId}/complete`);
    },
    onSuccess: (response) => {
      queryClient.invalidateQueries({ queryKey: ['qc-batches'] });
      queryClient.invalidateQueries({ queryKey: ['batch-qc'] });
      queryClient.invalidateQueries({ queryKey: ['qc-stats'] });
      queryClient.invalidateQueries({ queryKey: ['qc-history'] });
      const passed = response.data?.passed;
      if (passed) {
        toast.success('QC completed - All tests passed!');
      } else {
        toast.error('QC completed - Some tests failed');
      }
      setSelectedBatch(null);
    },
    onError: (error: any) => {
      const message = error.response?.data?.error || 'Failed to complete QC';
      toast.error(message);
    },
  });

  const handleResultChange = (result: any, field: string, value: any) => {
    updateResultMutation.mutate({
      resultId: result.id,
      data: { [field]: value },
    });
  };

  const filterWidgets: FilterWidget[] = [
    { key: 'search', label: 'Search', type: 'search', placeholder: 'Search batches...' },
  ];

  const filteredBatches = (viewMode === 'workbench' ? qcBatches : historyBatches)?.filter((batch: any) => {
    if (filters.search) {
      const q = filters.search.toLowerCase();
      if (!batch.batchNumber.toLowerCase().includes(q) && 
          !batch.product?.name.toLowerCase().includes(q)) {
        return false;
      }
    }
    return true;
  });

  const progress = batchQC ? getQCProgress(batchQC.qcResults) : null;
  const currentStep = !batchQC?.qcResults?.length ? 'pending' : 
    batchQC?.status === 'QC_PASSED' || batchQC?.status === 'FAILED_QC' ? 'complete' :
    progress?.completed === progress?.total ? 'review' : 'testing';

  const handleViewModeChange = (mode: 'workbench' | 'history') => {
    setViewMode(mode);
    setSelectedBatch(null);
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
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <h2 style={{ fontSize: '1.25rem', fontWeight: 600 }}>Quality Control</h2>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <button 
            className={`btn ${viewMode === 'workbench' ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => handleViewModeChange('workbench')}
          >
            <Beaker size={16} /> Workbench
          </button>
          <button 
            className={`btn ${viewMode === 'history' ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => handleViewModeChange('history')}
          >
            <History size={16} /> History
          </button>
        </div>
      </div>

      <div className="grid" style={{ gridTemplateColumns: 'repeat(4, 1fr)', gap: '1rem', marginBottom: '1.5rem' }}>
        <KpiCard 
          title="Pending QC" 
          value={stats?.pending || 0} 
          icon={<Clock size={20} />}
          color="warning"
          onClick={() => setViewMode('workbench')}
        />
        <KpiCard 
          title="In Progress" 
          value={stats?.inProgress || 0} 
          icon={<Beaker size={20} />}
          color="info"
          onClick={() => setViewMode('workbench')}
        />
        <KpiCard 
          title="Passed Today" 
          value={stats?.passedToday || 0} 
          icon={<CheckCircle size={20} />}
          color="success"
          onClick={() => setViewMode('history')}
        />
        <KpiCard 
          title="Failed Today" 
          value={stats?.failedToday || 0} 
          icon={<XCircle size={20} />}
          color="danger"
          onClick={() => setViewMode('history')}
        />
      </div>

      <div className="card" style={{ marginBottom: '1rem', padding: '1rem' }}>
        <FilterBar 
          widgets={filterWidgets}
          values={filters}
          onChange={(key, value) => setFilters(prev => ({ ...prev, [key]: value }))}
          onReset={() => setFilters({})}
        />
      </div>

      <div className="grid" style={{ gridTemplateColumns: selectedBatch ? '1fr 1.5fr' : '1fr' }}>
        <div className="card">
          <div style={{ padding: '1rem 1.5rem', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h3 style={{ fontWeight: 600 }}>
              {viewMode === 'workbench' ? `Batches Pending QC (${filteredBatches?.length || 0})` : `QC History (${filteredBatches?.length || 0})`}
            </h3>
          </div>
          <div style={{ padding: '0', maxHeight: '60vh', overflowY: 'auto' }}>
            {(viewMode === 'workbench' ? isLoading : historyLoading) ? (
              <div style={{ padding: '2rem', textAlign: 'center' }}>
                <div className="spinner" />
              </div>
            ) : filteredBatches?.length > 0 ? (
              filteredBatches.map((batch: any) => {
                const batchProgress = getQCProgress(batch.qcResults);
                return (
                  <div
                    key={batch.id}
                    style={{
                      padding: '1rem 1.5rem',
                      borderBottom: '1px solid var(--border)',
                      cursor: 'pointer',
                      background: selectedBatch?.id === batch.id ? 'var(--bg-secondary)' : undefined,
                      transition: 'background 0.15s',
                    }}
                    onClick={() => setSelectedBatch(batch)}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <div style={{ flex: 1 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                          <span style={{ fontWeight: 600 }}>{batch.batchNumber}</span>
                          {batch.status === 'FAILED_QC' && <AlertTriangle size={14} color="var(--danger)" />}
                        </div>
                        <div style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
                          {batch.product?.name}
                        </div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
                          {batch.orders?.length || 0} orders | {format(new Date(batch.plannedStartTime || batch.createdAt), 'MMM dd HH:mm')}
                        </div>
                        {batchProgress.total > 0 && (
                          <div style={{ marginTop: '0.5rem' }}>
                            <div style={{ 
                              height: '4px', 
                              background: 'var(--border)', 
                              borderRadius: '2px',
                              overflow: 'hidden',
                            }}>
                              <div style={{ 
                                height: '100%', 
                                width: `${(batchProgress.completed / batchProgress.total) * 100}%`,
                                background: batchProgress.failed > 0 ? 'var(--danger)' : 'var(--success)',
                                transition: 'width 0.3s',
                              }} />
                            </div>
                            <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
                              {batchProgress.completed}/{batchProgress.total} tests ({batchProgress.passed} passed, {batchProgress.failed} failed)
                            </div>
                          </div>
                        )}
                      </div>
                      <StatusBadge status={batch.status} size="sm" />
                    </div>
                  </div>
                );
              })
            ) : (
              <EmptyState 
                title={viewMode === 'workbench' ? 'No batches pending QC' : 'No QC history found'}
                message={viewMode === 'workbench' ? 'All batches have completed QC testing' : 'No completed QC tests in the selected period'}
                icon="success"
                variant="compact"
              />
            )}
          </div>
        </div>

        {selectedBatch && (
          <div className="card">
            <div style={{ padding: '1rem 1.5rem', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  <h3 style={{ fontWeight: 600 }}>{batchQC?.batchNumber || selectedBatch.batchNumber}</h3>
                  <StatusBadge status={batchQC?.status || selectedBatch.status} />
                </div>
                <div style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
                  {batchQC?.product?.name || selectedBatch.product?.name}
                </div>
              </div>
              <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                <Link to={`/batches/${selectedBatch.id}/journey`} className="btn btn-secondary btn-sm">
                  <Eye size={14} /> Batch Journey
                </Link>
                <button
                  onClick={() => setSelectedBatch(null)}
                  style={{ background: 'none', border: 'none', fontSize: '1.25rem', cursor: 'pointer', color: 'var(--text-muted)' }}
                >
                  &times;
                </button>
              </div>
            </div>

            {qcLoading ? (
              <div style={{ padding: '3rem', textAlign: 'center' }}>
                <div className="spinner" />
              </div>
            ) : (
              <div style={{ padding: '1.5rem' }}>
                {/* QC Progress Stepper */}
                <div style={{ display: 'flex', marginBottom: '1.5rem', gap: '0.5rem' }}>
                  {qcSteps.map((step, idx) => {
                    const isCompleted = qcSteps.findIndex(s => s.key === currentStep) > idx;
                    const isCurrent = step.key === currentStep;
                    const Icon = step.icon;
                    return (
                      <div key={step.key} style={{ 
                        flex: 1, 
                        display: 'flex', 
                        flexDirection: 'column', 
                        alignItems: 'center',
                        opacity: isCompleted || isCurrent ? 1 : 0.4,
                      }}>
                        <div style={{
                          width: '2rem',
                          height: '2rem',
                          borderRadius: '50%',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          background: isCompleted ? 'var(--success)' : isCurrent ? 'var(--primary)' : 'var(--border)',
                          color: isCompleted || isCurrent ? 'white' : 'var(--text-muted)',
                          marginBottom: '0.5rem',
                        }}>
                          <Icon size={14} />
                        </div>
                        <span style={{ fontSize: '0.75rem', fontWeight: isCurrent ? 600 : 400 }}>{step.label}</span>
                      </div>
                    );
                  })}
                </div>

                {batchQC?.qcResults?.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '2rem' }}>
                    <ClipboardCheck size={48} color="var(--text-muted)" style={{ marginBottom: '1rem' }} />
                    <p style={{ color: 'var(--text-muted)', marginBottom: '1rem' }}>
                      QC testing not yet initialized
                    </p>
                    <button
                      className="btn btn-primary"
                      onClick={() => initializeMutation.mutate(selectedBatch.id)}
                      disabled={initializeMutation.isPending}
                    >
                      <Play size={18} />
                      {initializeMutation.isPending ? 'Initializing...' : 'Start QC Testing'}
                    </button>
                  </div>
                ) : (
                  <>
                    {progress && (
                      <div style={{ 
                        background: 'var(--bg-secondary)', 
                        borderRadius: '0.5rem', 
                        padding: '1rem', 
                        marginBottom: '1rem',
                        display: 'flex',
                        justifyContent: 'space-around',
                      }}>
                        <div style={{ textAlign: 'center' }}>
                          <div style={{ fontSize: '1.5rem', fontWeight: 700 }}>{progress.total}</div>
                          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Total Tests</div>
                        </div>
                        <div style={{ textAlign: 'center' }}>
                          <div style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--success)' }}>{progress.passed}</div>
                          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Passed</div>
                        </div>
                        <div style={{ textAlign: 'center' }}>
                          <div style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--danger)' }}>{progress.failed}</div>
                          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Failed</div>
                        </div>
                        <div style={{ textAlign: 'center' }}>
                          <div style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--warning)' }}>{progress.total - progress.completed}</div>
                          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Pending</div>
                        </div>
                      </div>
                    )}

                    <table className="table">
                      <thead>
                        <tr>
                          <th>Test</th>
                          <th>Criteria</th>
                          <th>Result</th>
                          <th>Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {batchQC?.qcResults?.map((result: any) => (
                          <tr key={result.id}>
                            <td>
                              <div style={{ fontWeight: 500 }}>{result.template?.testName}</div>
                              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                                {result.template?.testMethod}
                              </div>
                            </td>
                            <td style={{ fontSize: '0.875rem' }}>
                              {result.template?.acceptanceCriteria}
                              {result.template?.minValue !== null && result.template?.maxValue !== null && (
                                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                                  Range: {result.template.minValue} - {result.template.maxValue} {result.template.unit}
                                </div>
                              )}
                            </td>
                            <td>
                              {viewMode === 'history' ? (
                                <span style={{ fontWeight: 500 }}>
                                  {result.numericResult !== null ? `${result.numericResult} ${result.template?.unit || ''}` : 
                                   result.passed === true ? 'Pass' : result.passed === false ? 'Fail' : '-'}
                                </span>
                              ) : result.template?.minValue !== null ? (
                                <input
                                  type="number"
                                  step="0.01"
                                  className="form-input"
                                  style={{ width: '6rem' }}
                                  value={result.numericResult ?? ''}
                                  onChange={(e) => handleResultChange(result, 'numericResult', parseFloat(e.target.value))}
                                />
                              ) : (
                                <div style={{ display: 'flex', gap: '0.5rem' }}>
                                  <button
                                    className={`btn btn-sm ${result.passed === true ? 'btn-success' : 'btn-secondary'}`}
                                    onClick={() => handleResultChange(result, 'passed', true)}
                                    disabled={updateResultMutation.isPending}
                                  >
                                    <CheckCircle size={14} />
                                    Pass
                                  </button>
                                  <button
                                    className={`btn btn-sm ${result.passed === false ? 'btn-danger' : 'btn-secondary'}`}
                                    onClick={() => handleResultChange(result, 'passed', false)}
                                    disabled={updateResultMutation.isPending}
                                  >
                                    <XCircle size={14} />
                                    Fail
                                  </button>
                                </div>
                              )}
                            </td>
                            <td>
                              {result.passed === true && (
                                <span className="badge badge-success">Passed</span>
                              )}
                              {result.passed === false && (
                                <span className="badge badge-danger">Failed</span>
                              )}
                              {result.passed === null && (
                                <span className="badge badge-default">Pending</span>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>

                    {viewMode === 'workbench' && (
                      <div style={{ marginTop: '1.5rem', display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
                        <button
                          className="btn btn-primary"
                          onClick={() => completeMutation.mutate(selectedBatch.id)}
                          disabled={completeMutation.isPending || Boolean(progress && progress.completed < progress.total)}
                          title={progress && progress.completed < progress.total ? 'Complete all tests first' : 'Complete QC'}
                        >
                          <CheckCircle size={18} />
                          {completeMutation.isPending ? 'Completing...' : 'Complete QC'}
                        </button>
                      </div>
                    )}
                  </>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
