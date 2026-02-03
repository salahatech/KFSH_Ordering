import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import api from '../lib/api';
import { format, addDays } from 'date-fns';
import { Calendar, Clock, Package, Users, Play, Eye, MoreVertical, Activity, AlertTriangle, TrendingUp } from 'lucide-react';

function CapacityBar({ window }: { window: any }) {
  const getStatusColor = (status: string) => {
    if (status === 'FULL') return 'var(--danger)';
    if (status === 'NEAR_FULL') return 'var(--warning)';
    return 'var(--success)';
  };
  
  return (
    <div style={{ marginBottom: '0.75rem', padding: '0.75rem', background: 'var(--bg-primary)', borderRadius: 'var(--radius)', border: '1px solid var(--border)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
        <span style={{ fontSize: '0.8rem', fontWeight: 500 }}>{window.name}</span>
        <span style={{ fontSize: '0.75rem', color: getStatusColor(window.status), fontWeight: 600 }}>
          {window.utilizationPercent}% used
        </span>
      </div>
      <div style={{ height: '8px', background: 'var(--bg-tertiary)', borderRadius: '4px', overflow: 'hidden' }}>
        <div style={{ 
          display: 'flex', 
          height: '100%',
          transition: 'width 0.3s ease'
        }}>
          <div style={{ width: `${Math.min(100, (window.usedMinutes / window.capacityMinutes) * 100)}%`, background: '#3b82f6' }} title={`Used: ${window.usedMinutes} min`} />
          <div style={{ width: `${Math.min(100 - (window.usedMinutes / window.capacityMinutes) * 100, (window.committedMinutes / window.capacityMinutes) * 100)}%`, background: '#22c55e' }} title={`Committed: ${window.committedMinutes} min`} />
          <div style={{ width: `${Math.min(100 - ((window.usedMinutes + window.committedMinutes) / window.capacityMinutes) * 100, (window.reservedMinutes / window.capacityMinutes) * 100)}%`, background: '#f59e0b' }} title={`Reserved: ${window.reservedMinutes} min`} />
        </div>
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '0.35rem', fontSize: '0.7rem', color: 'var(--text-secondary)' }}>
        <span>{format(new Date(window.startTime), 'HH:mm')} - {format(new Date(window.endTime), 'HH:mm')}</span>
        <span>{window.availableMinutes} min available</span>
      </div>
    </div>
  );
}

export default function Planner() {
  const [selectedDate, setSelectedDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  const { data: capacityData } = useQuery({
    queryKey: ['planner-capacity', selectedDate],
    queryFn: async () => {
      const { data } = await api.get('/planner/capacity', { params: { date: selectedDate, days: 1 } });
      return data;
    },
  });

  const { data: ordersForPlanning, isLoading: ordersLoading } = useQuery({
    queryKey: ['planner-orders', selectedDate],
    queryFn: async () => {
      const { data } = await api.get('/planner/orders', { params: { date: selectedDate } });
      return data;
    },
  });

  const { data: batches, isLoading: batchesLoading } = useQuery({
    queryKey: ['planner-batches', selectedDate],
    queryFn: async () => {
      const { data } = await api.get('/planner/batches', {
        params: { fromDate: selectedDate, toDate: selectedDate },
      });
      return data;
    },
  });

  const { data: suggestedBatches } = useQuery({
    queryKey: ['suggested-batches', selectedDate],
    queryFn: async () => {
      const { data } = await api.post('/planner/group-orders', { date: selectedDate });
      return data;
    },
    enabled: !!ordersForPlanning?.length,
  });

  const { data: equipment } = useQuery({
    queryKey: ['equipment'],
    queryFn: async () => {
      const { data } = await api.get('/planner/equipment');
      return data;
    },
  });

  const createBatchMutation = useMutation({
    mutationFn: async (batchData: any) => {
      return api.post('/batches', batchData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['planner-orders'] });
      queryClient.invalidateQueries({ queryKey: ['planner-batches'] });
      queryClient.invalidateQueries({ queryKey: ['suggested-batches'] });
    },
  });

  const handleCreateBatch = (suggestion: any) => {
    const synthesisModule = equipment?.find((e: any) => e.type === 'Synthesis');
    const hotCell = equipment?.find((e: any) => e.type === 'HotCell');

    createBatchMutation.mutate({
      productId: suggestion.productId,
      plannedStartTime: suggestion.suggestedStartTime,
      plannedEndTime: suggestion.suggestedEndTime,
      targetActivity: suggestion.totalActivity,
      calibrationTime: suggestion.suggestedStartTime,
      synthesisModuleId: synthesisModule?.id,
      hotCellId: hotCell?.id,
      orderIds: suggestion.orders.map((o: any) => o.id),
    });
  };

  const isLoading = ordersLoading || batchesLoading;

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
        <h2 style={{ fontSize: '1.25rem', fontWeight: 600 }}>Production Planner</h2>
        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
          <button
            className="btn btn-secondary btn-sm"
            onClick={() => setSelectedDate(format(addDays(new Date(selectedDate), -1), 'yyyy-MM-dd'))}
          >
            Previous
          </button>
          <input
            type="date"
            className="form-input"
            style={{ width: 'auto' }}
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
          />
          <button
            className="btn btn-secondary btn-sm"
            onClick={() => setSelectedDate(format(addDays(new Date(selectedDate), 1), 'yyyy-MM-dd'))}
          >
            Next
          </button>
        </div>
      </div>

      {capacityData?.summary && (
        <div className="card" style={{ marginBottom: '1.5rem' }}>
          <div style={{ padding: '1rem 1.5rem', borderBottom: '1px solid var(--border)' }}>
            <h3 style={{ fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Activity size={20} />
              Dispensing Capacity Overview
            </h3>
          </div>
          <div style={{ padding: '1rem' }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '1rem', marginBottom: '1rem' }}>
              <div style={{ textAlign: 'center', padding: '0.75rem', background: 'var(--bg-secondary)', borderRadius: 'var(--radius)' }}>
                <div style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--primary)' }}>{capacityData.summary.totalCapacityMinutes}</div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Total Capacity (min)</div>
              </div>
              <div style={{ textAlign: 'center', padding: '0.75rem', background: 'var(--bg-secondary)', borderRadius: 'var(--radius)' }}>
                <div style={{ fontSize: '1.25rem', fontWeight: 700, color: '#22c55e' }}>{capacityData.summary.totalCommittedMinutes}</div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Committed (min)</div>
              </div>
              <div style={{ textAlign: 'center', padding: '0.75rem', background: 'var(--bg-secondary)', borderRadius: 'var(--radius)' }}>
                <div style={{ fontSize: '1.25rem', fontWeight: 700, color: '#f59e0b' }}>{capacityData.summary.totalReservedMinutes}</div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Reserved (min)</div>
              </div>
              <div style={{ textAlign: 'center', padding: '0.75rem', background: 'var(--bg-secondary)', borderRadius: 'var(--radius)' }}>
                <div style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--success)' }}>{capacityData.summary.totalAvailableMinutes}</div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Available (min)</div>
              </div>
            </div>
            <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', justifyContent: 'center', fontSize: '0.75rem' }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                <span style={{ width: '12px', height: '12px', background: '#3b82f6', borderRadius: '2px' }} /> Used
              </span>
              <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                <span style={{ width: '12px', height: '12px', background: '#22c55e', borderRadius: '2px' }} /> Committed
              </span>
              <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                <span style={{ width: '12px', height: '12px', background: '#f59e0b', borderRadius: '2px' }} /> Reserved (Tentative)
              </span>
            </div>
            {capacityData?.windows?.length > 0 && (
              <div style={{ marginTop: '1rem' }}>
                {capacityData.windows.map((w: any) => (
                  <CapacityBar key={w.id} window={w} />
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {isLoading ? (
        <div className="loading-overlay">
          <div className="spinner" />
        </div>
      ) : (
        <div className="grid grid-2">
          <div className="card">
            <div style={{ padding: '1rem 1.5rem', borderBottom: '1px solid var(--border)' }}>
              <h3 style={{ fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Calendar size={20} />
                Orders to Schedule ({ordersForPlanning?.length || 0})
              </h3>
            </div>
            <div style={{ padding: '1rem' }}>
              {ordersForPlanning?.length > 0 ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                  {ordersForPlanning.map((order: any) => (
                    <div
                      key={order.id}
                      style={{
                        padding: '1rem',
                        background: 'var(--bg-secondary)',
                        borderRadius: 'var(--radius)',
                        border: '1px solid var(--border)',
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                        <span style={{ fontWeight: 600 }}>{order.orderNumber}</span>
                        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                          <span className="badge badge-info">{order.product?.productType}</span>
                          <button
                            className="btn btn-secondary btn-sm"
                            onClick={() => navigate(`/orders/${order.id}/journey`)}
                            title="View Order Details"
                          >
                            <Eye size={14} />
                          </button>
                        </div>
                      </div>
                      <div style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
                        <div>{order.customer?.name}</div>
                        <div>{order.product?.name}</div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', marginTop: '0.25rem' }}>
                          <Clock size={14} />
                          Delivery: {format(new Date(order.deliveryTimeStart), 'HH:mm')}
                        </div>
                        <div>Activity: {order.requestedActivity} {order.activityUnit}</div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="empty-state">No orders pending scheduling for this date</div>
              )}
            </div>
          </div>

          <div className="card">
            <div style={{ padding: '1rem 1.5rem', borderBottom: '1px solid var(--border)' }}>
              <h3 style={{ fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Package size={20} />
                Suggested Batches
              </h3>
            </div>
            <div style={{ padding: '1rem' }}>
              {suggestedBatches?.length > 0 ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                  {suggestedBatches.map((suggestion: any, index: number) => (
                    <div
                      key={index}
                      style={{
                        padding: '1rem',
                        background: 'var(--bg-secondary)',
                        borderRadius: 'var(--radius)',
                        border: '1px solid var(--border)',
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                        <span style={{ fontWeight: 600 }}>{suggestion.product?.name}</span>
                        <button
                          className="btn btn-primary btn-sm"
                          onClick={() => handleCreateBatch(suggestion)}
                          disabled={createBatchMutation.isPending}
                        >
                          <Play size={14} />
                          Create Batch
                        </button>
                      </div>
                      <div style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
                        <div>Total Activity: {suggestion.totalActivity.toFixed(1)} mCi</div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', marginTop: '0.25rem' }}>
                          <Clock size={14} />
                          Start: {format(new Date(suggestion.suggestedStartTime), 'HH:mm')}
                        </div>
                      </div>
                      
                      {suggestion.orders?.length > 0 && (
                        <div style={{ marginTop: '0.75rem', borderTop: '1px solid var(--border)', paddingTop: '0.75rem' }}>
                          <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                            <Users size={12} />
                            Orders in this batch ({suggestion.orders.length})
                          </div>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                            {suggestion.orders.map((order: any) => (
                              <div
                                key={order.id}
                                style={{
                                  display: 'flex',
                                  justifyContent: 'space-between',
                                  alignItems: 'center',
                                  padding: '0.5rem',
                                  background: 'var(--bg-primary)',
                                  borderRadius: 'var(--radius-sm)',
                                  border: '1px solid var(--border)',
                                  fontSize: '0.8rem',
                                }}
                              >
                                <div>
                                  <span style={{ fontWeight: 500 }}>{order.orderNumber}</span>
                                  <span style={{ color: 'var(--text-secondary)', marginLeft: '0.5rem' }}>
                                    {order.customer?.name || order.customer?.nameEn}
                                  </span>
                                  <span style={{ color: 'var(--text-secondary)', marginLeft: '0.5rem' }}>
                                    ({order.requestedActivity} mCi)
                                  </span>
                                </div>
                                <button
                                  className="btn btn-secondary btn-sm"
                                  onClick={() => navigate(`/orders/${order.id}/journey`)}
                                  title="View Order History"
                                  style={{ padding: '0.25rem 0.5rem', fontSize: '0.7rem' }}
                                >
                                  <Eye size={12} />
                                </button>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="empty-state">No batch suggestions available</div>
              )}
            </div>
          </div>
        </div>
      )}

      <div className="card" style={{ marginTop: '1.5rem' }}>
        <div style={{ padding: '1rem 1.5rem', borderBottom: '1px solid var(--border)' }}>
          <h3 style={{ fontWeight: 600 }}>Scheduled Batches ({batches?.length || 0})</h3>
        </div>
        <div style={{ padding: '0' }}>
          {batches?.length > 0 ? (
            <table className="table">
              <thead>
                <tr>
                  <th>Batch #</th>
                  <th>Product</th>
                  <th>Scheduled Time</th>
                  <th>Target Activity</th>
                  <th>Orders</th>
                  <th>Status</th>
                  <th style={{ width: '100px' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {batches.map((batch: any) => (
                  <tr key={batch.id}>
                    <td style={{ fontWeight: 500 }}>{batch.batchNumber}</td>
                    <td>{batch.product?.name}</td>
                    <td>
                      {format(new Date(batch.plannedStartTime), 'HH:mm')} - {format(new Date(batch.plannedEndTime), 'HH:mm')}
                    </td>
                    <td>{batch.targetActivity} {batch.activityUnit}</td>
                    <td>{batch.orders?.length || 0}</td>
                    <td>
                      <span className={`badge badge-${getStatusColor(batch.status)}`}>
                        {batch.status.replace('_', ' ')}
                      </span>
                    </td>
                    <td>
                      <button
                        className="btn btn-secondary btn-sm"
                        onClick={() => navigate(`/batches/${batch.id}/journey`)}
                        title="View Batch Journey"
                      >
                        <Eye size={14} />
                        View
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <div className="empty-state">No batches scheduled for this date</div>
          )}
        </div>
      </div>
    </div>
  );
}

function getStatusColor(status: string): string {
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
}
