import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../lib/api';
import { format, addDays, startOfWeek, endOfWeek } from 'date-fns';
import { Calendar, Plus, Clock, ChevronLeft, ChevronRight, CalendarDays, Users, X, Package, Building2 } from 'lucide-react';

export default function Availability() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showGenerateModal, setShowGenerateModal] = useState(false);
  const [selectedWindow, setSelectedWindow] = useState<any>(null);
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
    if (percent >= 40) return 'var(--primary)';
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

  const handleWindowClick = (window: any) => {
    setSelectedWindow(window);
  };

  const getReservationsForWindow = (windowId: string) => {
    if (!reservations) return [];
    return reservations.filter((r: any) => r.windowId === windowId && ['TENTATIVE', 'CONFIRMED'].includes(r.status));
  };

  const activeReservations = reservations?.filter((r: any) => ['TENTATIVE', 'CONFIRMED'].includes(r.status)) || [];
  const filteredReservations = selectedWindow 
    ? activeReservations.filter((r: any) => r.windowId === selectedWindow.id)
    : activeReservations;

  const totalWindows = calendarData?.length || 0;
  const totalCapacity = calendarData?.reduce((sum: number, w: any) => sum + w.capacityMinutes, 0) || 0;
  const usedCapacity = calendarData?.reduce((sum: number, w: any) => sum + w.usedMinutes, 0) || 0;

  if (isLoading) {
    return (
      <div className="loading-overlay">
        <div className="spinner" />
      </div>
    );
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.5rem' }}>
        <div>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 600, marginBottom: '0.25rem' }}>Availability & Capacity</h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', margin: 0 }}>
            Manage delivery windows and track capacity utilization
          </p>
        </div>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <button className="btn btn-secondary" onClick={() => setShowGenerateModal(true)}>
            <CalendarDays size={16} /> Generate Windows
          </button>
          <button className="btn btn-primary" onClick={() => setShowCreateModal(true)}>
            <Plus size={18} /> Add Window
          </button>
        </div>
      </div>

      <div className="grid" style={{ gridTemplateColumns: 'repeat(4, 1fr)', gap: '1rem', marginBottom: '1.5rem' }}>
        <div className="card stat-card" style={{ cursor: 'pointer' }} onClick={() => setSelectedWindow(null)}>
          <div className="stat-icon" style={{ background: 'rgba(59, 130, 246, 0.1)', color: 'var(--primary)' }}>
            <CalendarDays size={20} />
          </div>
          <div>
            <div className="stat-value" style={{ color: 'var(--primary)' }}>{totalWindows}</div>
            <div className="stat-label">Delivery Windows</div>
          </div>
        </div>
        <div className="card stat-card">
          <div className="stat-icon" style={{ background: 'rgba(100, 116, 139, 0.1)', color: 'var(--text-muted)' }}>
            <Clock size={20} />
          </div>
          <div>
            <div className="stat-value">{Math.round(totalCapacity / 60)}h</div>
            <div className="stat-label">Total Capacity</div>
          </div>
        </div>
        <div className="card stat-card">
          <div className="stat-icon" style={{ 
            background: totalCapacity > 0 ? `${getUtilizationColor((usedCapacity / totalCapacity) * 100)}15` : 'rgba(34, 197, 94, 0.1)', 
            color: totalCapacity > 0 ? getUtilizationColor((usedCapacity / totalCapacity) * 100) : 'var(--success)' 
          }}>
            <Users size={20} />
          </div>
          <div>
            <div className="stat-value" style={{ color: totalCapacity > 0 ? getUtilizationColor((usedCapacity / totalCapacity) * 100) : 'var(--success)' }}>
              {totalCapacity > 0 ? Math.round((usedCapacity / totalCapacity) * 100) : 0}%
            </div>
            <div className="stat-label">Utilization</div>
          </div>
        </div>
        <div 
          className="card stat-card" 
          style={{ cursor: 'pointer', border: selectedWindow === null && activeReservations.length > 0 ? '2px solid var(--warning)' : undefined }}
          onClick={() => setSelectedWindow(null)}
        >
          <div className="stat-icon" style={{ background: 'rgba(234, 179, 8, 0.1)', color: 'var(--warning)' }}>
            <Package size={20} />
          </div>
          <div>
            <div className="stat-value" style={{ color: 'var(--warning)' }}>{activeReservations.length}</div>
            <div className="stat-label">Active Reservations</div>
          </div>
        </div>
      </div>

      <div className="card" style={{ marginBottom: '1.5rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
          <button
            className="btn btn-secondary"
            onClick={() => setCurrentDate(addDays(currentDate, -7))}
          >
            <ChevronLeft size={18} /> Previous Week
          </button>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <Calendar size={20} style={{ color: 'var(--primary)' }} />
            <h3 style={{ fontWeight: 600, fontSize: '1.125rem', margin: 0 }}>
              {format(startDate, 'MMM d')} - {format(endDate, 'MMM d, yyyy')}
            </h3>
          </div>
          <button
            className="btn btn-secondary"
            onClick={() => setCurrentDate(addDays(currentDate, 7))}
          >
            Next Week <ChevronRight size={18} />
          </button>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '0.75rem' }}>
          {weekDays.map((day) => {
            const windows = getWindowsForDate(day);
            const isToday = format(day, 'yyyy-MM-dd') === format(new Date(), 'yyyy-MM-dd');
            const isWeekend = day.getDay() === 0 || day.getDay() === 6;

            return (
              <div
                key={day.toISOString()}
                style={{
                  border: isToday ? '2px solid var(--primary)' : '1px solid var(--border)',
                  borderRadius: 'var(--radius)',
                  padding: '1rem',
                  minHeight: '180px',
                  backgroundColor: isWeekend ? 'var(--bg-secondary)' : 'white',
                  transition: 'box-shadow 0.2s',
                }}
              >
                <div style={{ marginBottom: '0.75rem' }}>
                  <div style={{ 
                    fontSize: '0.75rem', 
                    fontWeight: 600, 
                    textTransform: 'uppercase',
                    color: isToday ? 'var(--primary)' : 'var(--text-muted)',
                    letterSpacing: '0.05em'
                  }}>
                    {format(day, 'EEE')}
                  </div>
                  <div style={{ 
                    fontSize: '1.5rem', 
                    fontWeight: 600,
                    color: isToday ? 'var(--primary)' : 'var(--text)'
                  }}>
                    {format(day, 'd')}
                  </div>
                </div>

                {windows.length > 0 ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    {windows.map((window: any) => {
                      const windowReservations = getReservationsForWindow(window.id);
                      const isSelected = selectedWindow?.id === window.id;
                      return (
                        <div
                          key={window.id}
                          onClick={() => handleWindowClick(window)}
                          style={{
                            backgroundColor: isSelected ? 'rgba(59, 130, 246, 0.1)' : 'var(--bg-secondary)',
                            borderRadius: 'var(--radius)',
                            padding: '0.625rem',
                            fontSize: '0.75rem',
                            border: isSelected ? '2px solid var(--primary)' : '1px solid var(--border)',
                            cursor: 'pointer',
                            transition: 'all 0.2s',
                          }}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', marginBottom: '0.5rem' }}>
                            <Clock size={12} style={{ color: 'var(--text-muted)' }} />
                            <span style={{ fontWeight: 500 }}>
                              {format(new Date(window.startTime), 'HH:mm')}-{format(new Date(window.endTime), 'HH:mm')}
                            </span>
                          </div>
                          <div
                            style={{
                              height: '6px',
                              backgroundColor: 'var(--border)',
                              borderRadius: '3px',
                              overflow: 'hidden',
                            }}
                          >
                            <div
                              style={{
                                width: `${window.utilizationPercent}%`,
                                height: '100%',
                                backgroundColor: getUtilizationColor(window.utilizationPercent),
                                transition: 'width 0.3s',
                              }}
                            />
                          </div>
                          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '0.375rem' }}>
                            <span style={{ color: 'var(--text-muted)' }}>
                              {window.availableMinutes}m free
                            </span>
                            <span style={{ color: getUtilizationColor(window.utilizationPercent), fontWeight: 500 }}>
                              {window.utilizationPercent}%
                            </span>
                          </div>
                          {windowReservations.length > 0 && (
                            <div style={{ 
                              display: 'flex', 
                              alignItems: 'center', 
                              gap: '0.25rem',
                              color: 'var(--primary)', 
                              marginTop: '0.375rem',
                              fontSize: '0.6875rem'
                            }}>
                              <Users size={10} />
                              {windowReservations.length} reservation{windowReservations.length > 1 ? 's' : ''}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div style={{ 
                    color: 'var(--text-muted)', 
                    fontSize: '0.75rem', 
                    textAlign: 'center', 
                    paddingTop: '2rem',
                    opacity: 0.7
                  }}>
                    No windows
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      <div className="card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Users size={18} style={{ color: 'var(--primary)' }} />
            <h3 style={{ fontWeight: 600, fontSize: '1rem', margin: 0 }}>
              {selectedWindow ? 'Window Reservations' : 'Active Reservations'}
            </h3>
            {selectedWindow && (
              <span className="badge badge-primary" style={{ marginLeft: '0.5rem' }}>
                {format(new Date(selectedWindow.date), 'MMM d')} {format(new Date(selectedWindow.startTime), 'HH:mm')}-{format(new Date(selectedWindow.endTime), 'HH:mm')}
              </span>
            )}
          </div>
          {selectedWindow && (
            <button 
              className="btn btn-sm btn-secondary"
              onClick={() => setSelectedWindow(null)}
            >
              <X size={14} /> Clear Filter
            </button>
          )}
        </div>
        <table className="table">
          <thead>
            <tr>
              <th>Reservation #</th>
              <th>Customer</th>
              <th>Product</th>
              <th>Window</th>
              <th>Date</th>
              <th>Activity</th>
              <th>Est. Minutes</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {filteredReservations.map((res: any) => (
              <tr 
                key={res.id}
                style={{ cursor: 'pointer' }}
                onClick={() => res.windowId && setSelectedWindow(calendarData?.find((w: any) => w.id === res.windowId))}
              >
                <td style={{ fontFamily: 'monospace', fontSize: '0.8125rem', fontWeight: 500 }}>{res.reservationNumber}</td>
                <td>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <Building2 size={14} style={{ color: 'var(--text-muted)' }} />
                    {res.customer?.name}
                  </div>
                </td>
                <td>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <Package size={14} style={{ color: 'var(--text-muted)' }} />
                    {res.product?.name}
                  </div>
                </td>
                <td>
                  {res.window ? (
                    <span style={{ fontSize: '0.8125rem', color: 'var(--primary)' }}>
                      {format(new Date(res.window.startTime), 'HH:mm')}-{format(new Date(res.window.endTime), 'HH:mm')}
                    </span>
                  ) : (
                    <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>No window</span>
                  )}
                </td>
                <td>{format(new Date(res.requestedDate), 'MMM d, yyyy')}</td>
                <td style={{ fontWeight: 500 }}>{res.requestedActivity} {res.activityUnit}</td>
                <td>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                    <Clock size={12} style={{ color: 'var(--text-muted)' }} />
                    {res.estimatedMinutes} min
                  </div>
                </td>
                <td>
                  <span className={`badge badge-${res.status === 'CONFIRMED' ? 'success' : 'warning'}`}>
                    {res.status}
                  </span>
                </td>
              </tr>
            ))}
            {filteredReservations.length === 0 && (
              <tr>
                <td colSpan={8} style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '2rem' }}>
                  {selectedWindow ? 'No reservations for this window' : 'No active reservations for this period'}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {showCreateModal && (
        <div className="modal-overlay" onClick={() => setShowCreateModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3 style={{ fontWeight: 600, margin: 0 }}>Create Delivery Window</h3>
              <button onClick={() => setShowCreateModal(false)} style={{ background: 'var(--bg-secondary)', border: 'none', borderRadius: 'var(--radius)', padding: '0.375rem', cursor: 'pointer', fontSize: '1.25rem', lineHeight: 1 }}>&times;</button>
            </div>
            <div className="modal-body">
              <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', marginBottom: '1.5rem' }}>
                Add a new delivery window for a specific date
              </p>
              <div className="form-group">
                <label className="form-label">Name</label>
                <input
                  type="text"
                  className="form-input"
                  value={createForm.name}
                  onChange={(e) => setCreateForm({ ...createForm, name: e.target.value })}
                  placeholder="e.g., Morning Delivery Window"
                />
              </div>
              <div className="form-group">
                <label className="form-label">Date</label>
                <input
                  type="date"
                  className="form-input"
                  value={createForm.date}
                  onChange={(e) => setCreateForm({ ...createForm, date: e.target.value })}
                />
              </div>
              <div className="grid" style={{ gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div className="form-group">
                  <label className="form-label">Start Time</label>
                  <input
                    type="time"
                    className="form-input"
                    value={createForm.startTime}
                    onChange={(e) => setCreateForm({ ...createForm, startTime: e.target.value })}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">End Time</label>
                  <input
                    type="time"
                    className="form-input"
                    value={createForm.endTime}
                    onChange={(e) => setCreateForm({ ...createForm, endTime: e.target.value })}
                  />
                </div>
              </div>
              <div className="form-group">
                <label className="form-label">Capacity (minutes)</label>
                <input
                  type="number"
                  className="form-input"
                  value={createForm.capacityMinutes}
                  onChange={(e) => setCreateForm({ ...createForm, capacityMinutes: parseInt(e.target.value) || 0 })}
                  min="0"
                  step="30"
                />
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setShowCreateModal(false)}>
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
            <div className="modal-header">
              <h3 style={{ fontWeight: 600, margin: 0 }}>Generate Delivery Windows</h3>
              <button onClick={() => setShowGenerateModal(false)} style={{ background: 'var(--bg-secondary)', border: 'none', borderRadius: 'var(--radius)', padding: '0.375rem', cursor: 'pointer', fontSize: '1.25rem', lineHeight: 1 }}>&times;</button>
            </div>
            <div className="modal-body">
              <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', marginBottom: '1.5rem' }}>
                Automatically generate delivery windows for a date range
              </p>
              <div className="grid" style={{ gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div className="form-group">
                  <label className="form-label">Start Date</label>
                  <input
                    type="date"
                    className="form-input"
                    value={generateForm.startDate}
                    onChange={(e) => setGenerateForm({ ...generateForm, startDate: e.target.value })}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">End Date</label>
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
                  <label className="form-label">Start Time</label>
                  <input
                    type="time"
                    className="form-input"
                    value={generateForm.startTime}
                    onChange={(e) => setGenerateForm({ ...generateForm, startTime: e.target.value })}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">End Time</label>
                  <input
                    type="time"
                    className="form-input"
                    value={generateForm.endTime}
                    onChange={(e) => setGenerateForm({ ...generateForm, endTime: e.target.value })}
                  />
                </div>
              </div>
              <div className="form-group">
                <label className="form-label">Capacity (minutes per day)</label>
                <input
                  type="number"
                  className="form-input"
                  value={generateForm.capacityMinutes}
                  onChange={(e) => setGenerateForm({ ...generateForm, capacityMinutes: parseInt(e.target.value) || 0 })}
                  min="0"
                  step="30"
                />
              </div>
              <div className="form-group">
                <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={generateForm.excludeWeekends}
                    onChange={(e) => setGenerateForm({ ...generateForm, excludeWeekends: e.target.checked })}
                    style={{ width: '16px', height: '16px' }}
                  />
                  <span className="form-label" style={{ margin: 0 }}>Exclude weekends</span>
                </label>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setShowGenerateModal(false)}>
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
