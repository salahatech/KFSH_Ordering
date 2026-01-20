import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../lib/api';
import { format } from 'date-fns';
import { ClipboardCheck, CheckCircle, XCircle, Play } from 'lucide-react';

export default function QC() {
  const [selectedBatch, setSelectedBatch] = useState<any>(null);
  const queryClient = useQueryClient();

  const { data: qcBatches, isLoading } = useQuery({
    queryKey: ['qc-batches'],
    queryFn: async () => {
      const { data } = await api.get('/qc/batches');
      return data;
    },
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
    },
  });

  const updateResultMutation = useMutation({
    mutationFn: async ({ resultId, data }: { resultId: string; data: any }) => {
      return api.put(`/qc/results/${resultId}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['batch-qc'] });
    },
  });

  const completeMutation = useMutation({
    mutationFn: async (batchId: string) => {
      return api.post(`/qc/batches/${batchId}/complete`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['qc-batches'] });
      queryClient.invalidateQueries({ queryKey: ['batch-qc'] });
      setSelectedBatch(null);
    },
  });

  const handleResultChange = (result: any, field: string, value: any) => {
    updateResultMutation.mutate({
      resultId: result.id,
      data: { [field]: value },
    });
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
        <h2 style={{ fontSize: '1.25rem', fontWeight: 600 }}>Quality Control</h2>
      </div>

      <div className="grid" style={{ gridTemplateColumns: selectedBatch ? '1fr 1.5fr' : '1fr' }}>
        <div className="card">
          <div style={{ padding: '1rem 1.5rem', borderBottom: '1px solid var(--border)' }}>
            <h3 style={{ fontWeight: 600 }}>Batches Pending QC ({qcBatches?.length || 0})</h3>
          </div>
          <div style={{ padding: '0' }}>
            {qcBatches?.length > 0 ? (
              qcBatches.map((batch: any) => (
                <div
                  key={batch.id}
                  style={{
                    padding: '1rem 1.5rem',
                    borderBottom: '1px solid var(--border)',
                    cursor: 'pointer',
                    background: selectedBatch?.id === batch.id ? 'var(--bg-secondary)' : undefined,
                  }}
                  onClick={() => setSelectedBatch(batch)}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <div style={{ fontWeight: 600 }}>{batch.batchNumber}</div>
                      <div style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
                        {batch.product?.name}
                      </div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                        {batch.orders?.length || 0} orders
                      </div>
                    </div>
                    <span className={`badge badge-${batch.status === 'QC_PENDING' ? 'warning' : 'info'}`}>
                      {batch.status.replace('_', ' ')}
                    </span>
                  </div>
                </div>
              ))
            ) : (
              <div className="empty-state">No batches pending QC</div>
            )}
          </div>
        </div>

        {selectedBatch && (
          <div className="card">
            <div style={{ padding: '1rem 1.5rem', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <h3 style={{ fontWeight: 600 }}>{batchQC?.batchNumber}</h3>
                <div style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
                  {batchQC?.product?.name}
                </div>
              </div>
              <button
                onClick={() => setSelectedBatch(null)}
                style={{ background: 'none', border: 'none', fontSize: '1.25rem', cursor: 'pointer' }}
              >
                &times;
              </button>
            </div>

            {qcLoading ? (
              <div className="loading-overlay">
                <div className="spinner" />
              </div>
            ) : (
              <div style={{ padding: '1.5rem' }}>
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
                      Start QC Testing
                    </button>
                  </div>
                ) : (
                  <>
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
                              {result.template?.minValue !== null ? (
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
                                  >
                                    <CheckCircle size={14} />
                                    Pass
                                  </button>
                                  <button
                                    className={`btn btn-sm ${result.passed === false ? 'btn-danger' : 'btn-secondary'}`}
                                    onClick={() => handleResultChange(result, 'passed', false)}
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

                    <div style={{ marginTop: '1.5rem', display: 'flex', justifyContent: 'flex-end' }}>
                      <button
                        className="btn btn-primary"
                        onClick={() => completeMutation.mutate(selectedBatch.id)}
                        disabled={completeMutation.isPending}
                      >
                        <CheckCircle size={18} />
                        Complete QC
                      </button>
                    </div>
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
