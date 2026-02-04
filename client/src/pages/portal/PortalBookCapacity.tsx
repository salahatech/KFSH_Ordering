import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import api from '../../lib/api';
import { format, addDays, startOfDay } from 'date-fns';
import { 
  Calendar, 
  Clock, 
  Package, 
  ChevronLeft, 
  ChevronRight, 
  Check, 
  AlertTriangle, 
  Timer, 
  Building2, 
  X,
  Zap,
  Activity,
  CalendarCheck
} from 'lucide-react';
import { useAuthStore } from '../../store/authStore';
import { KpiCard } from '../../components/shared';

interface DeliveryWindow {
  id: string;
  date: string;
  name: string;
  startTime: string;
  endTime: string;
  capacityMinutes: number;
  usedMinutes: number;
  availableMinutes: number;
  utilizationPercent: number;
}

interface Product {
  id: string;
  name: string;
  code: string;
  productType: string;
  radionuclide: string;
  dispensingMinutesPerDose: number;
}

export default function PortalBookCapacity() {
  const { user } = useAuthStore();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  
  const [weekOffset, setWeekOffset] = useState(0);
  const [selectedWindow, setSelectedWindow] = useState<DeliveryWindow | null>(null);
  const [selectedProduct, setSelectedProduct] = useState<string>('');
  const [numberOfDoses, setNumberOfDoses] = useState(1);
  const [requestedActivity, setRequestedActivity] = useState<number>(10);
  const [hospitalOrderReference, setHospitalOrderReference] = useState('');
  const [specialNotes, setSpecialNotes] = useState('');
  const [step, setStep] = useState<'calendar' | 'confirm'>('calendar');
  const [pendingReservation, setPendingReservation] = useState<any>(null);
  const [countdown, setCountdown] = useState<number>(0);

  const startDate = addDays(startOfDay(new Date()), weekOffset * 7);
  const endDate = addDays(startDate, 13);

  const { data: calendar, isLoading: calendarLoading } = useQuery({
    queryKey: ['portal-capacity-calendar', startDate.toISOString()],
    queryFn: async () => {
      const { data } = await api.get('/portal/capacity/calendar', {
        params: { startDate: startDate.toISOString(), endDate: endDate.toISOString() },
      });
      return data as DeliveryWindow[];
    },
  });

  const { data: products, isLoading: productsLoading } = useQuery({
    queryKey: ['portal-available-products'],
    queryFn: async () => {
      const { data } = await api.get('/portal/products/available');
      return data as Product[];
    },
  });

  const createReservationMutation = useMutation({
    mutationFn: async (payload: any) => {
      const { data } = await api.post('/portal/reservations', payload);
      return data;
    },
    onSuccess: (data) => {
      setPendingReservation(data);
      setCountdown(data.expiresInSeconds || 900);
      setStep('confirm');
      const interval = setInterval(() => {
        setCountdown(prev => {
          if (prev <= 1) {
            clearInterval(interval);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    },
  });

  const confirmReservationMutation = useMutation({
    mutationFn: async () => {
      const { data } = await api.post(`/portal/reservations/${pendingReservation.id}/confirm`, {
        hospitalOrderReference,
        specialNotes,
      });
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['portal-capacity-calendar'] });
      queryClient.invalidateQueries({ queryKey: ['portal-orders'] });
      navigate(`/portal/orders/${data.order.id}/journey`);
    },
  });

  const selectedProductDetails = products?.find(p => p.id === selectedProduct);
  const estimatedMinutes = selectedProductDetails 
    ? selectedProductDetails.dispensingMinutesPerDose * numberOfDoses 
    : 15 * numberOfDoses;

  const handleWindowSelect = (window: DeliveryWindow) => {
    if (window.availableMinutes <= 0) return;
    setSelectedWindow(window);
    setSelectedProduct('');
    setNumberOfDoses(1);
    setRequestedActivity(10);
    setHospitalOrderReference('');
    setSpecialNotes('');
  };

  const handleCreateReservation = () => {
    if (!selectedWindow || !selectedProduct) return;
    createReservationMutation.mutate({
      productId: selectedProduct,
      windowId: selectedWindow.id,
      requestedDate: selectedWindow.date,
      requestedActivity,
      numberOfDoses,
      hospitalOrderReference,
    });
  };

  const handleConfirmOrder = () => {
    confirmReservationMutation.mutate();
  };

  const formatCountdown = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const getCapacityColor = (utilizationPercent: number) => {
    if (utilizationPercent >= 90) return 'var(--danger)';
    if (utilizationPercent >= 70) return 'var(--warning)';
    return 'var(--success)';
  };

  const getCapacityBg = (utilizationPercent: number) => {
    if (utilizationPercent >= 90) return 'rgba(239, 68, 68, 0.1)';
    if (utilizationPercent >= 70) return 'rgba(234, 179, 8, 0.1)';
    return 'rgba(34, 197, 94, 0.1)';
  };

  const groupedByDate = (calendar || []).reduce((acc: Record<string, DeliveryWindow[]>, window) => {
    const dateKey = format(new Date(window.date), 'yyyy-MM-dd');
    if (!acc[dateKey]) acc[dateKey] = [];
    acc[dateKey].push(window);
    return acc;
  }, {});

  const stats = {
    totalSlots: calendar?.length || 0,
    availableSlots: calendar?.filter(w => w.availableMinutes > 0).length || 0,
    totalCapacity: calendar?.reduce((sum, w) => sum + w.capacityMinutes, 0) || 0,
    availableCapacity: calendar?.reduce((sum, w) => sum + w.availableMinutes, 0) || 0,
  };

  if (calendarLoading || productsLoading) {
    return (
      <div style={{ padding: '1.5rem' }}>
        <div className="card skeleton" style={{ height: '80px', marginBottom: '1rem' }} />
        <div className="grid" style={{ gridTemplateColumns: 'repeat(4, 1fr)', gap: '1rem', marginBottom: '1.5rem' }}>
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="card skeleton" style={{ height: '100px' }} />
          ))}
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '0.5rem' }}>
          {Array.from({ length: 14 }).map((_, i) => (
            <div key={i} className="card skeleton" style={{ height: '120px' }} />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.5rem' }}>
        <div>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 600, marginBottom: '0.25rem' }}>Book Capacity</h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Building2 size={14} /> {user?.customerName || 'Select a delivery window to reserve capacity'}
          </p>
        </div>
      </div>

      <div className="grid" style={{ gridTemplateColumns: 'repeat(4, 1fr)', gap: '1rem', marginBottom: '1.5rem' }}>
        <KpiCard 
          title="Total Slots" 
          value={stats.totalSlots} 
          icon={<Calendar size={20} />}
          color="primary"
        />
        <KpiCard 
          title="Available Slots" 
          value={stats.availableSlots} 
          icon={<CalendarCheck size={20} />}
          color="success"
        />
        <KpiCard 
          title="Total Capacity" 
          value={`${Math.round(stats.totalCapacity / 60)}h`} 
          icon={<Clock size={20} />}
          color="info"
        />
        <KpiCard 
          title="Available" 
          value={`${Math.round(stats.availableCapacity / 60)}h`} 
          icon={<Zap size={20} />}
          color="warning"
        />
      </div>

      <div className="card" style={{ padding: '1rem', marginBottom: '1.5rem' }}>
        <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Calendar size={18} style={{ color: 'var(--primary)' }} />
            <span style={{ fontWeight: 500 }}>
              {format(startDate, 'MMM d')} - {format(endDate, 'MMM d, yyyy')}
            </span>
          </div>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <button 
              className="btn btn-sm btn-outline-secondary" 
              onClick={() => setWeekOffset(prev => prev - 1)}
              disabled={weekOffset === 0}
            >
              <ChevronLeft size={16} />
            </button>
            <button 
              className="btn btn-sm btn-outline-secondary"
              onClick={() => setWeekOffset(0)}
            >
              Today
            </button>
            <button 
              className="btn btn-sm btn-outline-secondary"
              onClick={() => setWeekOffset(prev => prev + 1)}
            >
              <ChevronRight size={16} />
            </button>
          </div>
          <div style={{ marginLeft: 'auto', display: 'flex', gap: '1rem', fontSize: '0.8125rem' }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
              <span style={{ width: 10, height: 10, borderRadius: '50%', background: 'var(--success)' }} />
              Available
            </span>
            <span style={{ display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
              <span style={{ width: 10, height: 10, borderRadius: '50%', background: 'var(--warning)' }} />
              Limited
            </span>
            <span style={{ display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
              <span style={{ width: 10, height: 10, borderRadius: '50%', background: 'var(--danger)' }} />
              Full
            </span>
          </div>
        </div>
      </div>

      {step === 'calendar' && (
        <div className="grid" style={{ gridTemplateColumns: selectedWindow ? '1fr 380px' : '1fr', gap: '1.5rem' }}>
          <div style={{ 
            display: 'grid', 
            gridTemplateColumns: 'repeat(7, 1fr)', 
            gap: '0.75rem',
          }}>
            {Array.from({ length: 14 }).map((_, i) => {
              const date = addDays(startDate, i);
              const dateKey = format(date, 'yyyy-MM-dd');
              const windows = groupedByDate[dateKey] || [];
              const isToday = format(date, 'yyyy-MM-dd') === format(new Date(), 'yyyy-MM-dd');
              const isPast = date < startOfDay(new Date());
              const dayAvailable = windows.reduce((sum, w) => sum + w.availableMinutes, 0);

              return (
                <div 
                  key={i} 
                  className="card" 
                  style={{ 
                    padding: 0,
                    opacity: isPast ? 0.5 : 1,
                    border: isToday ? '2px solid #0d9488' : '1px solid var(--border)',
                    overflow: 'hidden',
                  }}
                >
                  <div style={{ 
                    background: isToday ? 'rgba(13, 148, 136, 0.1)' : 'var(--bg-secondary)',
                    padding: '0.75rem',
                    textAlign: 'center',
                    borderBottom: '1px solid var(--border)',
                  }}>
                    <div style={{ 
                      fontSize: '0.6875rem', 
                      fontWeight: 500,
                      color: 'var(--text-muted)',
                      textTransform: 'uppercase',
                      letterSpacing: '0.5px',
                      marginBottom: '0.25rem'
                    }}>
                      {format(date, 'EEE')}
                    </div>
                    <div style={{ 
                      fontSize: '1.25rem', 
                      fontWeight: 700, 
                      color: isToday ? '#0d9488' : 'var(--text-primary)' 
                    }}>
                      {format(date, 'd')}
                    </div>
                  </div>
                  
                  <div style={{ padding: '0.75rem' }}>
                    {windows.length === 0 ? (
                      <div style={{ 
                        fontSize: '0.75rem', 
                        color: 'var(--text-muted)', 
                        textAlign: 'center',
                        padding: '1.5rem 0',
                        background: 'var(--bg-secondary)',
                        borderRadius: '8px',
                      }}>
                        No slots
                      </div>
                    ) : (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.625rem' }}>
                        {windows.map(w => {
                          const isSelected = selectedWindow?.id === w.id;
                          const isFull = w.availableMinutes <= 0;
                          const statusLabel = isFull ? 'Full' : w.utilizationPercent >= 70 ? 'Limited' : 'Available';
                          const statusColor = isFull ? 'var(--danger)' : w.utilizationPercent >= 70 ? 'var(--warning)' : 'var(--success)';
                          const statusBg = isFull ? 'rgba(239, 68, 68, 0.1)' : w.utilizationPercent >= 70 ? 'rgba(234, 179, 8, 0.1)' : 'rgba(34, 197, 94, 0.1)';
                          
                          return (
                            <button
                              key={w.id}
                              onClick={() => !isPast && handleWindowSelect(w)}
                              disabled={isPast || isFull}
                              style={{
                                padding: 0,
                                borderRadius: '10px',
                                border: isSelected ? '2px solid #0d9488' : '1px solid var(--border)',
                                background: isSelected ? 'rgba(13, 148, 136, 0.08)' : 'var(--bg-primary)',
                                cursor: isPast || isFull ? 'not-allowed' : 'pointer',
                                textAlign: 'left',
                                transition: 'all 0.2s ease',
                                overflow: 'hidden',
                                boxShadow: isSelected ? '0 2px 8px rgba(13, 148, 136, 0.2)' : 'none',
                              }}
                            >
                              <div style={{ 
                                display: 'flex', 
                                alignItems: 'center', 
                                justifyContent: 'space-between',
                                padding: '0.625rem 0.75rem',
                                borderBottom: '1px solid var(--border)',
                                background: isSelected ? 'rgba(13, 148, 136, 0.05)' : 'var(--bg-secondary)',
                              }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', fontSize: '0.8125rem', fontWeight: 600 }}>
                                  <Clock size={13} style={{ color: isSelected ? '#0d9488' : 'var(--text-muted)' }} />
                                  {format(new Date(w.startTime), 'HH:mm')} - {format(new Date(w.endTime), 'HH:mm')}
                                </div>
                                <span style={{ 
                                  padding: '0.1875rem 0.5rem',
                                  borderRadius: '10px',
                                  fontSize: '0.625rem',
                                  fontWeight: 600,
                                  textTransform: 'uppercase',
                                  letterSpacing: '0.3px',
                                  background: statusBg,
                                  color: statusColor,
                                }}>
                                  {statusLabel}
                                </span>
                              </div>
                              
                              <div style={{ padding: '0.625rem 0.75rem' }}>
                                <div style={{ 
                                  display: 'flex', 
                                  alignItems: 'center', 
                                  justifyContent: 'space-between',
                                  marginBottom: '0.5rem'
                                }}>
                                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Capacity</span>
                                  <span style={{ 
                                    fontSize: '0.875rem', 
                                    fontWeight: 700, 
                                    color: statusColor 
                                  }}>
                                    {w.availableMinutes} min
                                  </span>
                                </div>
                                <div style={{
                                  width: '100%',
                                  height: '6px',
                                  background: 'var(--bg-muted)',
                                  borderRadius: '3px',
                                  overflow: 'hidden'
                                }}>
                                  <div style={{
                                    width: `${w.utilizationPercent}%`,
                                    height: '100%',
                                    background: statusColor,
                                    borderRadius: '3px',
                                    transition: 'width 0.3s ease',
                                  }} />
                                </div>
                                <div style={{ 
                                  display: 'flex', 
                                  justifyContent: 'space-between',
                                  marginTop: '0.375rem',
                                  fontSize: '0.625rem',
                                  color: 'var(--text-muted)'
                                }}>
                                  <span>{w.usedMinutes} used</span>
                                  <span>{w.capacityMinutes} total</span>
                                </div>
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>
                  
                  {windows.length > 0 && (
                    <div style={{ 
                      background: 'var(--bg-secondary)',
                      padding: '0.5rem 0.75rem',
                      borderTop: '1px solid var(--border)',
                      display: 'flex',
                      justifyContent: 'center',
                      alignItems: 'center',
                      gap: '0.375rem',
                      fontSize: '0.6875rem',
                      color: 'var(--text-muted)',
                    }}>
                      <Timer size={11} />
                      {dayAvailable} min available
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {selectedWindow && (
            <div className="card" style={{ padding: 0, position: 'sticky', top: '100px', alignSelf: 'start', width: '380px' }}>
              <div style={{ 
                display: 'flex', 
                justifyContent: 'space-between', 
                alignItems: 'center', 
                padding: '1rem 1.25rem',
                borderBottom: '1px solid var(--border)'
              }}>
                <h3 style={{ fontSize: '1rem', fontWeight: 600, margin: 0 }}>Slot Details</h3>
                <button 
                  onClick={() => setSelectedWindow(null)}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '0.25rem' }}
                >
                  <X size={18} style={{ color: 'var(--text-muted)' }} />
                </button>
              </div>

              <div style={{ padding: '1.25rem', borderBottom: '1px solid var(--border)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.25rem' }}>
                  <div style={{ 
                    width: '44px', 
                    height: '44px', 
                    borderRadius: '12px', 
                    background: 'rgba(13, 148, 136, 0.1)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}>
                    <Calendar size={22} style={{ color: '#0d9488' }} />
                  </div>
                  <div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                      {format(new Date(selectedWindow.date), 'EEEE')}
                    </div>
                    <div style={{ fontSize: '1.125rem', fontWeight: 600 }}>
                      {format(new Date(selectedWindow.date), 'MMMM d, yyyy')}
                    </div>
                  </div>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.5rem 0', borderBottom: '1px solid var(--border)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <Clock size={14} style={{ color: 'var(--text-muted)' }} />
                      <span style={{ fontSize: '0.8125rem', color: 'var(--text-muted)' }}>Time Slot</span>
                    </div>
                    <span style={{ fontSize: '0.875rem', fontWeight: 600 }}>
                      {format(new Date(selectedWindow.startTime), 'HH:mm')} - {format(new Date(selectedWindow.endTime), 'HH:mm')}
                    </span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.5rem 0', borderBottom: '1px solid var(--border)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <Zap size={14} style={{ color: '#0d9488' }} />
                      <span style={{ fontSize: '0.8125rem', color: 'var(--text-muted)' }}>Available</span>
                    </div>
                    <span style={{ fontSize: '0.9375rem', fontWeight: 700, color: getCapacityColor(selectedWindow.utilizationPercent) }}>
                      {selectedWindow.availableMinutes} min
                    </span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.5rem 0', borderBottom: '1px solid var(--border)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <Timer size={14} style={{ color: 'var(--text-muted)' }} />
                      <span style={{ fontSize: '0.8125rem', color: 'var(--text-muted)' }}>Total Capacity</span>
                    </div>
                    <span style={{ fontSize: '0.875rem' }}>{selectedWindow.capacityMinutes} min</span>
                  </div>
                  <div style={{ padding: '0.625rem 0' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.375rem' }}>
                      <span style={{ fontSize: '0.8125rem', color: 'var(--text-muted)' }}>Utilization</span>
                      <span style={{ fontSize: '0.8125rem', fontWeight: 600 }}>{selectedWindow.utilizationPercent}%</span>
                    </div>
                    <div style={{ 
                      height: '6px', 
                      background: 'var(--bg-secondary)', 
                      borderRadius: '3px', 
                      overflow: 'hidden' 
                    }}>
                      <div style={{ 
                        width: `${Math.min(selectedWindow.utilizationPercent, 100)}%`, 
                        height: '100%', 
                        background: getCapacityColor(selectedWindow.utilizationPercent),
                        borderRadius: '3px',
                        transition: 'width 0.3s ease'
                      }} />
                    </div>
                  </div>
                </div>
              </div>

              <div style={{ padding: '1.25rem', borderBottom: '1px solid var(--border)' }}>
                <h4 style={{ 
                  fontSize: '0.75rem', 
                  fontWeight: 600, 
                  marginBottom: '1rem', 
                  color: 'var(--text-muted)',
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px'
                }}>
                  Reserve This Slot
                </h4>

                <div style={{ marginBottom: '0.875rem' }}>
                  <label style={{ fontSize: '0.8125rem', fontWeight: 500, display: 'block', marginBottom: '0.375rem' }}>
                    Product <span style={{ color: 'var(--danger)' }}>*</span>
                  </label>
                  <select 
                    className="form-control"
                    value={selectedProduct}
                    onChange={e => setSelectedProduct(e.target.value)}
                    style={{ 
                      fontSize: '0.875rem', 
                      padding: '0.5rem 0.75rem',
                      borderColor: selectedProduct ? '#0d9488' : 'var(--border)',
                      borderWidth: selectedProduct ? '2px' : '1px'
                    }}
                  >
                    <option value="">Select a product...</option>
                    {products?.map(p => (
                      <option key={p.id} value={p.id}>
                        {p.name} ({p.code})
                      </option>
                    ))}
                  </select>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginBottom: '0.875rem' }}>
                  <div>
                    <label style={{ fontSize: '0.8125rem', fontWeight: 500, display: 'block', marginBottom: '0.375rem' }}>
                      Doses <span style={{ color: 'var(--danger)' }}>*</span>
                    </label>
                    <input
                      type="number"
                      className="form-control"
                      value={numberOfDoses}
                      onChange={e => setNumberOfDoses(Math.max(1, parseInt(e.target.value) || 1))}
                      min={1}
                      style={{ fontSize: '0.875rem', padding: '0.5rem 0.75rem' }}
                    />
                  </div>
                  <div>
                    <label style={{ fontSize: '0.8125rem', fontWeight: 500, display: 'block', marginBottom: '0.375rem' }}>
                      Activity (mCi) <span style={{ color: 'var(--danger)' }}>*</span>
                    </label>
                    <input
                      type="number"
                      className="form-control"
                      value={requestedActivity}
                      onChange={e => setRequestedActivity(parseFloat(e.target.value) || 0)}
                      step="0.1"
                      style={{ fontSize: '0.875rem', padding: '0.5rem 0.75rem' }}
                    />
                  </div>
                </div>

                <div style={{ marginBottom: '0.875rem' }}>
                  <label style={{ fontSize: '0.8125rem', fontWeight: 500, display: 'block', marginBottom: '0.375rem' }}>
                    Hospital Reference
                  </label>
                  <input
                    type="text"
                    className="form-control"
                    value={hospitalOrderReference}
                    onChange={e => setHospitalOrderReference(e.target.value)}
                    placeholder="Your internal reference"
                    style={{ fontSize: '0.875rem', padding: '0.5rem 0.75rem' }}
                  />
                </div>

                <div>
                  <label style={{ fontSize: '0.8125rem', fontWeight: 500, display: 'block', marginBottom: '0.375rem' }}>
                    Special Notes
                  </label>
                  <textarea
                    className="form-control"
                    value={specialNotes}
                    onChange={e => setSpecialNotes(e.target.value)}
                    rows={2}
                    placeholder="Any special requirements..."
                    style={{ fontSize: '0.875rem', padding: '0.5rem 0.75rem', resize: 'none' }}
                  />
                </div>
              </div>

              <div style={{ padding: '1.25rem' }}>
                {selectedProduct && (
                  <div style={{ 
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    padding: '0.75rem 1rem',
                    background: estimatedMinutes > selectedWindow.availableMinutes ? 'rgba(239, 68, 68, 0.08)' : 'rgba(13, 148, 136, 0.08)', 
                    borderRadius: '8px',
                    marginBottom: '1rem',
                    border: estimatedMinutes > selectedWindow.availableMinutes ? '1px solid rgba(239, 68, 68, 0.2)' : '1px solid rgba(13, 148, 136, 0.2)'
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <Timer size={16} style={{ color: estimatedMinutes > selectedWindow.availableMinutes ? 'var(--danger)' : '#0d9488' }} />
                      <span style={{ fontSize: '0.8125rem', color: 'var(--text-muted)' }}>Est. Time Required</span>
                    </div>
                    <span style={{ 
                      fontSize: '0.9375rem', 
                      fontWeight: 700,
                      color: estimatedMinutes > selectedWindow.availableMinutes ? 'var(--danger)' : '#0d9488'
                    }}>
                      {estimatedMinutes} min
                      {estimatedMinutes > selectedWindow.availableMinutes && (
                        <AlertTriangle size={14} style={{ marginLeft: '0.375rem', verticalAlign: 'middle' }} />
                      )}
                    </span>
                  </div>
                )}

                <button
                  className="btn"
                  onClick={handleCreateReservation}
                  disabled={!selectedProduct || estimatedMinutes > selectedWindow.availableMinutes || createReservationMutation.isPending}
                  style={{ 
                    width: '100%', 
                    background: (!selectedProduct || estimatedMinutes > selectedWindow.availableMinutes) ? 'var(--bg-secondary)' : '#0d9488', 
                    borderColor: (!selectedProduct || estimatedMinutes > selectedWindow.availableMinutes) ? 'var(--border)' : '#0d9488',
                    color: (!selectedProduct || estimatedMinutes > selectedWindow.availableMinutes) ? 'var(--text-muted)' : 'white',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '0.5rem',
                    padding: '0.75rem 1rem',
                    fontSize: '0.9375rem',
                    fontWeight: 600,
                    cursor: (!selectedProduct || estimatedMinutes > selectedWindow.availableMinutes) ? 'not-allowed' : 'pointer'
                  }}
                >
                  <CalendarCheck size={18} />
                  {createReservationMutation.isPending ? 'Reserving...' : 'Reserve Capacity'}
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {step === 'confirm' && pendingReservation && (
        <div className="card" style={{ padding: '2rem', maxWidth: '500px', margin: '2rem auto' }}>
          <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
            <div style={{ 
              width: '64px', 
              height: '64px', 
              borderRadius: '50%', 
              background: 'rgba(34, 197, 94, 0.1)', 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center',
              margin: '0 auto 1rem'
            }}>
              <Check size={32} style={{ color: 'var(--success)' }} />
            </div>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 600, marginBottom: '0.5rem' }}>
              Capacity Reserved!
            </h2>
            <p style={{ color: 'var(--text-muted)', margin: 0 }}>
              Reservation: {pendingReservation.reservationNumber}
            </p>
          </div>

          <div style={{ 
            background: countdown < 120 ? 'rgba(239, 68, 68, 0.1)' : 'rgba(234, 179, 8, 0.1)',
            border: `1px solid ${countdown < 120 ? 'rgba(239, 68, 68, 0.3)' : 'rgba(234, 179, 8, 0.3)'}`,
            padding: '1rem',
            borderRadius: '8px',
            textAlign: 'center',
            marginBottom: '1.5rem'
          }}>
            <Timer size={24} style={{ marginBottom: '0.5rem', color: countdown < 120 ? 'var(--danger)' : 'var(--warning)' }} />
            <div style={{ fontSize: '1.75rem', fontWeight: 700 }}>
              {formatCountdown(countdown)}
            </div>
            <p style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', margin: '0.25rem 0 0' }}>
              Confirm before expiry
            </p>
          </div>

          <div style={{ 
            background: 'var(--bg-secondary)', 
            padding: '1rem', 
            borderRadius: '8px',
            marginBottom: '1.5rem'
          }}>
            <div style={{ fontSize: '0.6875rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-muted)', marginBottom: '0.75rem', fontWeight: 500 }}>
              Order Summary
            </div>
            <div style={{ display: 'grid', gap: '0.625rem', fontSize: '0.875rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--text-muted)' }}>Product</span>
                <span style={{ fontWeight: 500 }}>{pendingReservation.product?.name}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--text-muted)' }}>Doses</span>
                <span style={{ fontWeight: 500 }}>{pendingReservation.numberOfDoses}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--text-muted)' }}>Activity</span>
                <span style={{ fontWeight: 500 }}>{pendingReservation.requestedActivity} mCi</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--text-muted)' }}>Delivery</span>
                <span style={{ fontWeight: 500 }}>{format(new Date(pendingReservation.requestedDate), 'MMM d, yyyy')}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--text-muted)' }}>Reserved Time</span>
                <span style={{ fontWeight: 500 }}>{pendingReservation.estimatedMinutes} min</span>
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '0.75rem' }}>
            <button
              className="btn btn-outline-secondary"
              onClick={() => { setStep('calendar'); setPendingReservation(null); setSelectedWindow(null); }}
              style={{ flex: 1 }}
            >
              Cancel
            </button>
            <button
              className="btn btn-primary"
              onClick={handleConfirmOrder}
              disabled={countdown === 0 || confirmReservationMutation.isPending}
              style={{ flex: 2, background: '#0d9488', borderColor: '#0d9488' }}
            >
              {confirmReservationMutation.isPending ? 'Creating Order...' : 'Confirm Order'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
