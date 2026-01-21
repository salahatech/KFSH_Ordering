import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../lib/api';
import { format } from 'date-fns';
import { Play, Pause, Eye, ArrowRight } from 'lucide-react';
import ApprovalStatus from '../components/ApprovalStatus';

export default function Batches() {
  const [selectedBatch, setSelectedBatch] = useState<any>(null);
  const [statusFilter, setStatusFilter] = useState<string>('');
  const queryClient = useQueryClient();

  const { data: batches, isLoading } = useQuery({
    queryKey: ['batches', statusFilter],
    queryFn: async () => {
      const params: any = {};
      if (statusFilter) params.status = statusFilter;
      const { data } = await api.get('/batches', { params });
      return data;
    },
  });

  const { data: batchDetails, isLoading: detailsLoading } = useQuery({
    queryKey: ['batch', selectedBatch?.id],
    queryFn: async () => {
      const { data } = await api.get(`/batches/${selectedBatch.id}`);
      return data;
    },
    enabled: !!selectedBatch,
  });

  const updateStatusMutation = useMutation({
    mutationFn: async ({ id, status, actualStartTime, actualEndTime, actualActivity }: any) => {
      return api.patch(`/batches/${id}/status`, { status, actualStartTime, actualEndTime, actualActivity });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['batches'] });
      queryClient.invalidateQueries({ queryKey: ['batch'] });
    },
  });

  const getNextStatus = (currentStatus: string): { status: string; label: string } | null => {
    const transitions: Record<string, { status: string; label: string }> = {
      PLANNED: { status: 'IN_PROGRESS', label: 'Start Production' },
      IN_PROGRESS: { status: 'COMPLETED', label: 'Complete Production' },
      COMPLETED: { status: 'QC_PENDING', label: 'Submit to QC' },
    };
    return transitions[currentStatus] || null;
  };

  const getStatusColor = (status: string): string => {
    const colors: Record<string, string> = {
      PLANNED: 'default',
      IN_PROGRESS: 'warning',
      COMPLETED: 'success',
      QC_PENDING: 'warning',
      QC_IN_PROGRESS: 'warning',
      QC_PASSED: 'success',
      QC_FAILED: 'danger',
      RELEASED: 'success',
      CANCELLED: 'danger',
    };
    return colors[status] || 'default';
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
        <h2 style={{ fontSize: '1.25rem', fontWeight: 600 }}>Batch Management</h2>
        <select
          className="form-select"
          style={{ width: 'auto' }}
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
        >
          <option value="">All Statuses</option>
          <option value="PLANNED">Planned</option>
          <option value="IN_PROGRESS">In Progress</option>
          <option value="COMPLETED">Completed</option>
          <option value="QC_PENDING">QC Pending</option>
          <option value="QC_PASSED">QC Passed</option>
          <option value="QC_FAILED">QC Failed</option>
          <option value="RELEASED">Released</option>
        </select>
      </div>

      <div className="grid" style={{ gridTemplateColumns: selectedBatch ? '1fr 1fr' : '1fr' }}>
        <div className="card">
          <table className="table">
            <thead>
              <tr>
                <th>Batch #</th>
                <th>Product</th>
                <th>Scheduled</th>
                <th>Activity</th>
                <th>Orders</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {batches?.map((batch: any) => (
                <tr
                  key={batch.id}
                  style={{
                    background: selectedBatch?.id === batch.id ? 'var(--bg-secondary)' : undefined,
                    cursor: 'pointer',
                  }}
                  onClick={() => setSelectedBatch(batch)}
                >
                  <td style={{ fontWeight: 500 }}>{batch.batchNumber}</td>
                  <td>
                    <div>{batch.product?.name}</div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                      {batch.product?.radionuclide}
                    </div>
                  </td>
                  <td>
                    <div>{format(new Date(batch.plannedStartTime), 'MMM dd, HH:mm')}</div>
                  </td>
                  <td>
                    <div>{batch.targetActivity} {batch.activityUnit}</div>
                    {batch.actualActivity && (
                      <div style={{ fontSize: '0.75rem', color: 'var(--success)' }}>
                        Actual: {batch.actualActivity}
                      </div>
                    )}
                  </td>
                  <td>{batch.orders?.length || 0}</td>
                  <td>
                    <span className={`badge badge-${getStatusColor(batch.status)}`}>
                      {batch.status.replace('_', ' ')}
                    </span>
                  </td>
                  <td>
                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                      {getNextStatus(batch.status) && (
                        <button
                          className="btn btn-primary btn-sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            const next = getNextStatus(batch.status)!;
                            updateStatusMutation.mutate({
                              id: batch.id,
                              status: next.status,
                              actualStartTime: next.status === 'IN_PROGRESS' ? new Date().toISOString() : undefined,
                              actualEndTime: next.status === 'COMPLETED' ? new Date().toISOString() : undefined,
                            });
                          }}
                          disabled={updateStatusMutation.isPending}
                        >
                          <ArrowRight size={14} />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {batches?.length === 0 && <div className="empty-state">No batches found</div>}
        </div>

        {selectedBatch && (
          <div className="card">
            <div style={{ padding: '1rem 1.5rem', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between' }}>
              <h3 style={{ fontWeight: 600 }}>Batch Details</h3>
              <button
                onClick={() => setSelectedBatch(null)}
                style={{ background: 'none', border: 'none', fontSize: '1.25rem', cursor: 'pointer' }}
              >
                &times;
              </button>
            </div>
            {detailsLoading ? (
              <div className="loading-overlay">
                <div className="spinner" />
              </div>
            ) : batchDetails ? (
              <div style={{ padding: '1.5rem' }}>
                <div className="grid grid-2" style={{ marginBottom: '1.5rem' }}>
                  <div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Batch Number</div>
                    <div style={{ fontWeight: 600 }}>{batchDetails.batchNumber}</div>
                  </div>
                  <div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Status</div>
                    <span className={`badge badge-${getStatusColor(batchDetails.status)}`}>
                      {batchDetails.status.replace('_', ' ')}
                    </span>
                  </div>
                  <div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Product</div>
                    <div>{batchDetails.product?.name}</div>
                  </div>
                  <div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Target Activity</div>
                    <div>{batchDetails.targetActivity} {batchDetails.activityUnit}</div>
                  </div>
                </div>

                <div style={{ marginBottom: '1rem' }}>
                  <h4 style={{ fontWeight: 600, marginBottom: '0.5rem' }}>Approval Status</h4>
                  <ApprovalStatus entityType="BATCH" entityId={batchDetails.id} />
                </div>

                <h4 style={{ fontWeight: 600, marginBottom: '0.5rem' }}>Orders ({batchDetails.orders?.length || 0})</h4>
                <div style={{ marginBottom: '1rem' }}>
                  {batchDetails.orders?.map((order: any) => (
                    <div
                      key={order.id}
                      style={{
                        padding: '0.5rem',
                        background: 'var(--bg-secondary)',
                        borderRadius: 'var(--radius-sm)',
                        marginBottom: '0.25rem',
                        fontSize: '0.875rem',
                      }}
                    >
                      {order.orderNumber} - {order.customer?.name}
                    </div>
                  ))}
                </div>

                {batchDetails.materialLots?.length > 0 && (
                  <>
                    <h4 style={{ fontWeight: 600, marginBottom: '0.5rem' }}>Material Lots</h4>
                    <div style={{ marginBottom: '1rem' }}>
                      {batchDetails.materialLots.map((ml: any) => (
                        <div
                          key={ml.id}
                          style={{
                            padding: '0.5rem',
                            background: 'var(--bg-secondary)',
                            borderRadius: 'var(--radius-sm)',
                            marginBottom: '0.25rem',
                            fontSize: '0.875rem',
                          }}
                        >
                          {ml.materialLot?.materialName} - Lot: {ml.materialLot?.lotNumber}
                        </div>
                      ))}
                    </div>
                  </>
                )}

                {batchDetails.batchReleases?.length > 0 && (
                  <>
                    <h4 style={{ fontWeight: 600, marginBottom: '0.5rem' }}>Release Records</h4>
                    {batchDetails.batchReleases.map((release: any) => (
                      <div
                        key={release.id}
                        style={{
                          padding: '0.75rem',
                          background: '#dcfce7',
                          borderRadius: 'var(--radius-sm)',
                          fontSize: '0.875rem',
                        }}
                      >
                        <div>Released by: {release.releasedBy?.firstName} {release.releasedBy?.lastName}</div>
                        <div>Date: {format(new Date(release.signatureTimestamp), 'MMM dd, yyyy HH:mm')}</div>
                        {release.reason && <div>Reason: {release.reason}</div>}
                      </div>
                    ))}
                  </>
                )}
              </div>
            ) : null}
          </div>
        )}
      </div>
    </div>
  );
}
