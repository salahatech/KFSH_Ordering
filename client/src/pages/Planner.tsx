import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../lib/api';
import { format, addDays } from 'date-fns';
import { Calendar, Clock, Package, Users, Play } from 'lucide-react';

export default function Planner() {
  const [selectedDate, setSelectedDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const queryClient = useQueryClient();

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
                        <span className="badge badge-info">{order.product?.productType}</span>
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
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                          <Users size={14} />
                          {suggestion.orderCount} orders grouped
                        </div>
                        <div>Total Activity: {suggestion.totalActivity.toFixed(1)} mCi</div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', marginTop: '0.25rem' }}>
                          <Clock size={14} />
                          Start: {format(new Date(suggestion.suggestedStartTime), 'HH:mm')}
                        </div>
                      </div>
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
