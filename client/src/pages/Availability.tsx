import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../lib/api';
import { format, addDays, startOfWeek, endOfWeek } from 'date-fns';
import { Calendar, Plus, Clock, ChevronLeft, ChevronRight } from 'lucide-react';

export default function Availability() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showGenerateModal, setShowGenerateModal] = useState(false);
  const queryClient = useQueryClient();

  const startDate = startOfWeek(currentDate, { weekStartsOn: 1 });
  const endDate = endOfWeek(currentDate, { weekStartsOn: 1 });

  const { data: calendarData, isLoading } = useQuery({
    queryKey: ['availability', 'calendar', startDate.toISOString(), endDate.toISOString()],
    queryFn: async () => {
      const { data } = await api.get('/availability/calendar', {
        params: {
          startDate: startDate.toISOString(),
          endDate: endDate.toISOString(),
        },
      });
      return data;
    },
  });

  const { data: reservations } = useQuery({
    queryKey: ['reservations', startDate.toISOString(), endDate.toISOString()],
    queryFn: async () => {
      const { data } = await api.get('/reservations', {
        params: {
          startDate: startDate.toISOString(),
          endDate: endDate.toISOString(),
        },
      });
      return data;
    },
  });

  const createWindowMutation = useMutation({
    mutationFn: async (data: any) => {
      return api.post('/availability/windows', data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['availability'] });
      setShowCreateModal(false);
    },
  });

  const generateWindowsMutation = useMutation({
    mutationFn: async (data: any) => {
      return api.post('/availability/windows/generate', data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['availability'] });
      setShowGenerateModal(false);
    },
  });

  const [createForm, setCreateForm] = useState({
    name: '',
    date: format(new Date(), 'yyyy-MM-dd'),
    startTime: '08:00',
    endTime: '17:00',
    capacityMinutes: 480,
  });

  const [generateForm, setGenerateForm] = useState({
    startDate: format(new Date(), 'yyyy-MM-dd'),
    endDate: format(addDays(new Date(), 30), 'yyyy-MM-dd'),
    startTime: '08:00',
    endTime: '17:00',
    capacityMinutes: 480,
    excludeWeekends: true,
  });

  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(startDate, i));

  const getWindowsForDate = (date: Date) => {
    if (!calendarData) return [];
    const dateStr = format(date, 'yyyy-MM-dd');
    return calendarData.filter((w: any) => format(new Date(w.date), 'yyyy-MM-dd') === dateStr);
  };

  const getUtilizationColor = (percent: number) => {
    if (percent >= 90) return 'var(--danger)';
    if (percent >= 70) return 'var(--warning)';
    return 'var(--success)';
  };

  const handleCreateWindow = () => {
    const dateStr = createForm.date;
    createWindowMutation.mutate({
      name: createForm.name || `Delivery Window ${dateStr}`,
      date: dateStr,
      startTime: `${dateStr}T${createForm.startTime}:00`,
      endTime: `${dateStr}T${createForm.endTime}:00`,
      capacityMinutes: createForm.capacityMinutes,
    });
  };

  const handleGenerate = () => {
    generateWindowsMutation.mutate({
      startDate: generateForm.startDate,
      endDate: generateForm.endDate,
      startTime: generateForm.startTime,
      endTime: generateForm.endTime,
      capacityMinutes: generateForm.capacityMinutes,
      excludeWeekends: generateForm.excludeWeekends,
    });
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
        <h2 style={{ fontSize: '1.25rem', fontWeight: 600 }}>Availability & Capacity</h2>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <button className="btn btn-outline" onClick={() => setShowGenerateModal(true)}>
            <Calendar size={16} /> Generate Windows
          </button>
          <button className="btn btn-primary" onClick={() => setShowCreateModal(true)}>
            <Plus size={16} /> Add Window
          </button>
        </div>
      </div>

      <div className="card" style={{ marginBottom: '1.5rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
          <button
            className="btn btn-outline"
            onClick={() => setCurrentDate(addDays(currentDate, -7))}
          >
            <ChevronLeft size={16} /> Previous Week
          </button>
          <h3 style={{ fontWeight: 600 }}>
            {format(startDate, 'MMM d')} - {format(endDate, 'MMM d, yyyy')}
          </h3>
          <button
            className="btn btn-outline"
            onClick={() => setCurrentDate(addDays(currentDate, 7))}
          >
            Next Week <ChevronRight size={16} />
          </button>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '0.5rem' }}>
          {weekDays.map((day) => {
            const windows = getWindowsForDate(day);
            const isToday = format(day, 'yyyy-MM-dd') === format(new Date(), 'yyyy-MM-dd');
            const isWeekend = day.getDay() === 0 || day.getDay() === 6;

            return (
              <div
                key={day.toISOString()}
                style={{
                  border: isToday ? '2px solid var(--primary)' : '1px solid var(--border)',
                  borderRadius: '0.5rem',
                  padding: '0.75rem',
                  minHeight: '150px',
                  backgroundColor: isWeekend ? 'var(--background-secondary)' : 'white',
                }}
              >
                <div style={{ fontWeight: 600, marginBottom: '0.5rem', fontSize: '0.875rem' }}>
                  {format(day, 'EEE')}
                  <span style={{ display: 'block', fontSize: '1.25rem' }}>{format(day, 'd')}</span>
                </div>

                {windows.length > 0 ? (
                  windows.map((window: any) => (
                    <div
                      key={window.id}
                      style={{
                        backgroundColor: 'var(--background-secondary)',
                        borderRadius: '0.25rem',
                        padding: '0.5rem',
                        marginBottom: '0.25rem',
                        fontSize: '0.75rem',
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.25rem' }}>
                        <span>
                          <Clock size={12} style={{ marginRight: '0.25rem' }} />
                          {format(new Date(window.startTime), 'HH:mm')}-{format(new Date(window.endTime), 'HH:mm')}
                        </span>
                      </div>
                      <div
                        style={{
                          height: '4px',
                          backgroundColor: 'var(--border)',
                          borderRadius: '2px',
                          overflow: 'hidden',
                        }}
                      >
                        <div
                          style={{
                            width: `${window.utilizationPercent}%`,
                            height: '100%',
                            backgroundColor: getUtilizationColor(window.utilizationPercent),
                          }}
                        />
                      </div>
                      <div style={{ marginTop: '0.25rem', color: 'var(--text-muted)' }}>
                        {window.availableMinutes} / {window.capacityMinutes} min available
                      </div>
                      {window.reservationCount > 0 && (
                        <div style={{ color: 'var(--primary)', marginTop: '0.25rem' }}>
                          {window.reservationCount} reservation(s)
                        </div>
                      )}
                    </div>
                  ))
                ) : (
                  <div style={{ color: 'var(--text-muted)', fontSize: '0.75rem', textAlign: 'center', paddingTop: '1rem' }}>
                    No windows
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      <div className="card">
        <h3 style={{ fontWeight: 600, marginBottom: '1rem' }}>Active Reservations</h3>
        <table className="table">
          <thead>
            <tr>
              <th>Reservation #</th>
              <th>Customer</th>
              <th>Product</th>
              <th>Date</th>
              <th>Activity</th>
              <th>Est. Minutes</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {reservations?.filter((r: any) => ['TENTATIVE', 'CONFIRMED'].includes(r.status)).map((res: any) => (
              <tr key={res.id}>
                <td style={{ fontFamily: 'monospace' }}>{res.reservationNumber}</td>
                <td>{res.customer?.name}</td>
                <td>{res.product?.name}</td>
                <td>{format(new Date(res.requestedDate), 'MMM d, yyyy')}</td>
                <td>{res.requestedActivity} {res.activityUnit}</td>
                <td>{res.estimatedMinutes} min</td>
                <td>
                  <span className={`badge badge-${res.status === 'CONFIRMED' ? 'success' : 'warning'}`}>
                    {res.status}
                  </span>
                </td>
              </tr>
            ))}
            {(!reservations || reservations.filter((r: any) => ['TENTATIVE', 'CONFIRMED'].includes(r.status)).length === 0) && (
              <tr>
                <td colSpan={7} style={{ textAlign: 'center', color: 'var(--text-muted)' }}>
                  No active reservations
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {showCreateModal && (
        <div className="modal-overlay" onClick={() => setShowCreateModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h3 style={{ marginBottom: '1rem' }}>Create Delivery Window</h3>
            <div className="form-group">
              <label>Name</label>
              <input
                type="text"
                className="form-input"
                value={createForm.name}
                onChange={(e) => setCreateForm({ ...createForm, name: e.target.value })}
                placeholder="e.g., Morning Delivery Window"
              />
            </div>
            <div className="form-group">
              <label>Date</label>
              <input
                type="date"
                className="form-input"
                value={createForm.date}
                onChange={(e) => setCreateForm({ ...createForm, date: e.target.value })}
              />
            </div>
            <div className="grid" style={{ gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <div className="form-group">
                <label>Start Time</label>
                <input
                  type="time"
                  className="form-input"
                  value={createForm.startTime}
                  onChange={(e) => setCreateForm({ ...createForm, startTime: e.target.value })}
                />
              </div>
              <div className="form-group">
                <label>End Time</label>
                <input
                  type="time"
                  className="form-input"
                  value={createForm.endTime}
                  onChange={(e) => setCreateForm({ ...createForm, endTime: e.target.value })}
                />
              </div>
            </div>
            <div className="form-group">
              <label>Capacity (minutes)</label>
              <input
                type="number"
                className="form-input"
                value={createForm.capacityMinutes}
                onChange={(e) => setCreateForm({ ...createForm, capacityMinutes: parseInt(e.target.value) })}
              />
            </div>
            <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end', marginTop: '1rem' }}>
              <button className="btn btn-outline" onClick={() => setShowCreateModal(false)}>
                Cancel
              </button>
              <button
                className="btn btn-primary"
                onClick={handleCreateWindow}
                disabled={createWindowMutation.isPending}
              >
                {createWindowMutation.isPending ? 'Creating...' : 'Create Window'}
              </button>
            </div>
          </div>
        </div>
      )}

      {showGenerateModal && (
        <div className="modal-overlay" onClick={() => setShowGenerateModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h3 style={{ marginBottom: '1rem' }}>Generate Delivery Windows</h3>
            <div className="grid" style={{ gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <div className="form-group">
                <label>Start Date</label>
                <input
                  type="date"
                  className="form-input"
                  value={generateForm.startDate}
                  onChange={(e) => setGenerateForm({ ...generateForm, startDate: e.target.value })}
                />
              </div>
              <div className="form-group">
                <label>End Date</label>
                <input
                  type="date"
                  className="form-input"
                  value={generateForm.endDate}
                  onChange={(e) => setGenerateForm({ ...generateForm, endDate: e.target.value })}
                />
              </div>
            </div>
            <div className="grid" style={{ gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <div className="form-group">
                <label>Start Time</label>
                <input
                  type="time"
                  className="form-input"
                  value={generateForm.startTime}
                  onChange={(e) => setGenerateForm({ ...generateForm, startTime: e.target.value })}
                />
              </div>
              <div className="form-group">
                <label>End Time</label>
                <input
                  type="time"
                  className="form-input"
                  value={generateForm.endTime}
                  onChange={(e) => setGenerateForm({ ...generateForm, endTime: e.target.value })}
                />
              </div>
            </div>
            <div className="form-group">
              <label>Daily Capacity (minutes)</label>
              <input
                type="number"
                className="form-input"
                value={generateForm.capacityMinutes}
                onChange={(e) => setGenerateForm({ ...generateForm, capacityMinutes: parseInt(e.target.value) })}
              />
            </div>
            <div className="form-group">
              <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <input
                  type="checkbox"
                  checked={generateForm.excludeWeekends}
                  onChange={(e) => setGenerateForm({ ...generateForm, excludeWeekends: e.target.checked })}
                />
                Exclude Weekends
              </label>
            </div>
            <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end', marginTop: '1rem' }}>
              <button className="btn btn-outline" onClick={() => setShowGenerateModal(false)}>
                Cancel
              </button>
              <button
                className="btn btn-primary"
                onClick={handleGenerate}
                disabled={generateWindowsMutation.isPending}
              >
                {generateWindowsMutation.isPending ? 'Generating...' : 'Generate Windows'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
