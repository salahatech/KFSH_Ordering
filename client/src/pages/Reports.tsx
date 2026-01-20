import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import api from '../lib/api';
import { format, subDays } from 'date-fns';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { Calendar, TrendingUp, CheckCircle, Clock, Truck } from 'lucide-react';

const COLORS = ['#2563eb', '#22c55e', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4'];

export default function Reports() {
  const [dateRange, setDateRange] = useState({
    fromDate: format(subDays(new Date(), 7), 'yyyy-MM-dd'),
    toDate: format(new Date(), 'yyyy-MM-dd'),
  });

  const { data: dailyProduction } = useQuery({
    queryKey: ['daily-production', dateRange],
    queryFn: async () => {
      const { data } = await api.get('/reports/daily-production', { params: dateRange });
      return data;
    },
  });

  const { data: onTimeDelivery } = useQuery({
    queryKey: ['on-time-delivery', dateRange],
    queryFn: async () => {
      const { data } = await api.get('/reports/on-time-delivery', { params: dateRange });
      return data;
    },
  });

  const { data: qcPassRate } = useQuery({
    queryKey: ['qc-pass-rate', dateRange],
    queryFn: async () => {
      const { data } = await api.get('/reports/qc-pass-rate', { params: dateRange });
      return data;
    },
  });

  const { data: capacityUtilization } = useQuery({
    queryKey: ['capacity-utilization', dateRange],
    queryFn: async () => {
      const { data } = await api.get('/reports/capacity-utilization', { params: dateRange });
      return data;
    },
  });

  const { data: orderTurnaround } = useQuery({
    queryKey: ['order-turnaround', dateRange],
    queryFn: async () => {
      const { data } = await api.get('/reports/order-turnaround', { params: dateRange });
      return data;
    },
  });

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
        <h2 style={{ fontSize: '1.25rem', fontWeight: 600 }}>Reports & Analytics</h2>
        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
          <Calendar size={18} color="var(--text-muted)" />
          <input
            type="date"
            className="form-input"
            style={{ width: 'auto' }}
            value={dateRange.fromDate}
            onChange={(e) => setDateRange({ ...dateRange, fromDate: e.target.value })}
          />
          <span>to</span>
          <input
            type="date"
            className="form-input"
            style={{ width: 'auto' }}
            value={dateRange.toDate}
            onChange={(e) => setDateRange({ ...dateRange, toDate: e.target.value })}
          />
        </div>
      </div>

      <div className="grid grid-4" style={{ marginBottom: '1.5rem' }}>
        <div className="card stat-card">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
            <Truck size={20} color="var(--primary)" />
            <span className="stat-label">On-Time Delivery</span>
          </div>
          <div className="stat-value">{onTimeDelivery?.onTimeRate || 0}%</div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
            {onTimeDelivery?.onTime || 0} of {onTimeDelivery?.totalDelivered || 0} deliveries
          </div>
        </div>

        <div className="card stat-card">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
            <CheckCircle size={20} color="var(--success)" />
            <span className="stat-label">QC Pass Rate</span>
          </div>
          <div className="stat-value">{qcPassRate?.passRate || 0}%</div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
            {qcPassRate?.passed || 0} passed, {qcPassRate?.failed || 0} failed
          </div>
        </div>

        <div className="card stat-card">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
            <Clock size={20} color="var(--warning)" />
            <span className="stat-label">Avg Turnaround</span>
          </div>
          <div className="stat-value">{orderTurnaround?.averageTurnaroundHours || 0}h</div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
            Order to delivery
          </div>
        </div>

        <div className="card stat-card">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
            <TrendingUp size={20} color="var(--info)" />
            <span className="stat-label">Total Orders</span>
          </div>
          <div className="stat-value">{orderTurnaround?.totalOrders || 0}</div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
            Delivered in period
          </div>
        </div>
      </div>

      <div className="grid grid-2" style={{ marginBottom: '1.5rem' }}>
        <div className="card">
          <div style={{ padding: '1rem 1.5rem', borderBottom: '1px solid var(--border)' }}>
            <h3 style={{ fontWeight: 600 }}>Daily Production Summary</h3>
          </div>
          <div style={{ padding: '1.5rem', height: '300px' }}>
            {dailyProduction?.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={dailyProduction}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" tickFormatter={(val) => format(new Date(val), 'MMM dd')} />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="totalBatches" fill="#2563eb" name="Batches" />
                  <Bar dataKey="totalOrders" fill="#22c55e" name="Orders" />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="empty-state">No production data for this period</div>
            )}
          </div>
        </div>

        <div className="card">
          <div style={{ padding: '1rem 1.5rem', borderBottom: '1px solid var(--border)' }}>
            <h3 style={{ fontWeight: 600 }}>QC Pass Rate by Product</h3>
          </div>
          <div style={{ padding: '1.5rem', height: '300px' }}>
            {qcPassRate?.byProduct && Object.keys(qcPassRate.byProduct).length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={Object.entries(qcPassRate.byProduct).map(([name, stats]: [string, any]) => ({
                      name,
                      value: stats.passed,
                    }))}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                    outerRadius={100}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {Object.entries(qcPassRate.byProduct).map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="empty-state">No QC data for this period</div>
            )}
          </div>
        </div>
      </div>

      <div className="card">
        <div style={{ padding: '1rem 1.5rem', borderBottom: '1px solid var(--border)' }}>
          <h3 style={{ fontWeight: 600 }}>Capacity Utilization</h3>
        </div>
        <div style={{ padding: '0' }}>
          {capacityUtilization?.length > 0 ? (
            <table className="table">
              <thead>
                <tr>
                  <th>Equipment</th>
                  <th>Type</th>
                  <th>Batches</th>
                  <th>Minutes Used</th>
                  <th>Utilization</th>
                </tr>
              </thead>
              <tbody>
                {capacityUtilization.map((item: any) => (
                  <tr key={item.equipment}>
                    <td style={{ fontWeight: 500 }}>{item.equipment}</td>
                    <td>{item.type}</td>
                    <td>{item.batchCount}</td>
                    <td>{item.minutesUsed.toFixed(0)} min</td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <div
                          style={{
                            width: '100px',
                            height: '8px',
                            background: 'var(--bg-tertiary)',
                            borderRadius: '4px',
                            overflow: 'hidden',
                          }}
                        >
                          <div
                            style={{
                              width: `${item.utilizationPercent}%`,
                              height: '100%',
                              background: parseFloat(item.utilizationPercent) > 80 ? 'var(--success)' : 'var(--primary)',
                              borderRadius: '4px',
                            }}
                          />
                        </div>
                        <span>{item.utilizationPercent}%</span>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <div className="empty-state">No capacity data for this period</div>
          )}
        </div>
      </div>
    </div>
  );
}
