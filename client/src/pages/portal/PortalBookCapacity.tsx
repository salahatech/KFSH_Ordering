import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import api from '../../lib/api';
import { format, addDays, startOfDay } from 'date-fns';
import { Calendar, Clock, Package, ChevronLeft, ChevronRight, Check, AlertTriangle, Timer, Building2 } from 'lucide-react';
import { useAuthStore } from '../../store/authStore';

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
  const [step, setStep] = useState<'calendar' | 'details' | 'confirm'>('calendar');
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
    setStep('details');
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

  const groupedByDate = (calendar || []).reduce((acc: Record<string, DeliveryWindow[]>, window) => {
    const dateKey = format(new Date(window.date), 'yyyy-MM-dd');
    if (!acc[dateKey]) acc[dateKey] = [];
    acc[dateKey].push(window);
    return acc;
  }, {});

  if (calendarLoading || productsLoading) {
    return (
      <div style={{ padding: '1.5rem' }}>
        <div className="card skeleton" style={{ height: '80px', marginBottom: '1rem' }} />
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '0.5rem' }}>
          {Array.from({ length: 14 }).map((_, i) => (
            <div key={i} className="card skeleton" style={{ height: '120px' }} />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div style={{ padding: '1.5rem' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
        <div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 600, marginBottom: '0.25rem' }}>Book Capacity</h1>
          <p style={{ color: 'var(--text-muted)' }}>
            {user?.customerName && <span style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Building2 size={16} /> Ordering as: {user.customerName}
            </span>}
          </p>
        </div>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <button 
            className="btn btn-outline-secondary" 
            onClick={() => setWeekOffset(prev => prev - 1)}
            disabled={weekOffset === 0}
          >
            <ChevronLeft size={18} />
          </button>
          <button 
            className="btn btn-outline-secondary"
            onClick={() => setWeekOffset(0)}
          >
            Today
          </button>
          <button 
            className="btn btn-outline-secondary"
            onClick={() => setWeekOffset(prev => prev + 1)}
          >
            <ChevronRight size={18} />
          </button>
        </div>
      </div>

      {step === 'calendar' && (
        <>
          <div className="card" style={{ padding: '1rem', marginBottom: '1rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
              <Calendar size={20} style={{ color: 'var(--primary)' }} />
              <span style={{ fontWeight: 500 }}>
                {format(startDate, 'MMM d')} - {format(endDate, 'MMM d, yyyy')}
              </span>
              <div style={{ marginLeft: 'auto', display: 'flex', gap: '1rem', fontSize: '0.85rem' }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                  <span style={{ width: 12, height: 12, borderRadius: '50%', background: 'var(--success)' }} />
                  Available
                </span>
                <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                  <span style={{ width: 12, height: 12, borderRadius: '50%', background: 'var(--warning)' }} />
                  Limited
                </span>
                <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                  <span style={{ width: 12, height: 12, borderRadius: '50%', background: 'var(--danger)' }} />
                  Full
                </span>
              </div>
            </div>
          </div>

          <div style={{ 
            display: 'grid', 
            gridTemplateColumns: 'repeat(7, 1fr)', 
            gap: '0.5rem',
            marginBottom: '1rem'
          }}>
            {Array.from({ length: 14 }).map((_, i) => {
              const date = addDays(startDate, i);
              const dateKey = format(date, 'yyyy-MM-dd');
              const windows = groupedByDate[dateKey] || [];
              const isToday = format(date, 'yyyy-MM-dd') === format(new Date(), 'yyyy-MM-dd');
              const isPast = date < startOfDay(new Date());

              return (
                <div 
                  key={i} 
                  className="card" 
                  style={{ 
                    padding: '0.75rem',
                    opacity: isPast ? 0.5 : 1,
                    border: isToday ? '2px solid var(--primary)' : undefined,
                  }}
                >
                  <div style={{ 
                    fontSize: '0.75rem', 
                    color: 'var(--text-muted)',
                    marginBottom: '0.5rem',
                    textAlign: 'center'
                  }}>
                    {format(date, 'EEE')}
                    <div style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                      {format(date, 'd')}
                    </div>
                  </div>
                  
                  {windows.length === 0 ? (
                    <div style={{ 
                      fontSize: '0.75rem', 
                      color: 'var(--text-muted)', 
                      textAlign: 'center',
                      padding: '1rem 0'
                    }}>
                      No slots
                    </div>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                      {windows.map(w => (
                        <button
                          key={w.id}
                          onClick={() => !isPast && handleWindowSelect(w)}
                          disabled={isPast || w.availableMinutes <= 0}
                          style={{
                            padding: '0.5rem',
                            borderRadius: '0.25rem',
                            border: 'none',
                            background: w.availableMinutes <= 0 ? 'var(--bg-muted)' : 'var(--bg-secondary)',
                            cursor: isPast || w.availableMinutes <= 0 ? 'not-allowed' : 'pointer',
                            textAlign: 'left',
                            fontSize: '0.75rem',
                          }}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', marginBottom: '0.25rem' }}>
                            <Clock size={12} />
                            {format(new Date(w.startTime), 'HH:mm')} - {format(new Date(w.endTime), 'HH:mm')}
                          </div>
                          <div style={{ 
                            display: 'flex', 
                            alignItems: 'center', 
                            justifyContent: 'space-between' 
                          }}>
                            <span style={{ color: getCapacityColor(w.utilizationPercent) }}>
                              {w.availableMinutes} min
                            </span>
                            <div style={{
                              width: '30px',
                              height: '4px',
                              background: 'var(--bg-muted)',
                              borderRadius: '2px',
                              overflow: 'hidden'
                            }}>
                              <div style={{
                                width: `${w.utilizationPercent}%`,
                                height: '100%',
                                background: getCapacityColor(w.utilizationPercent),
                              }} />
                            </div>
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </>
      )}

      {step === 'details' && selectedWindow && (
        <div className="card" style={{ padding: '1.5rem', maxWidth: '600px', margin: '0 auto' }}>
          <button 
            className="btn btn-ghost" 
            onClick={() => { setStep('calendar'); setSelectedWindow(null); }}
            style={{ marginBottom: '1rem' }}
          >
            <ChevronLeft size={18} /> Back to Calendar
          </button>
          
          <h2 style={{ fontSize: '1.25rem', fontWeight: 600, marginBottom: '1rem' }}>
            Reserve Capacity
          </h2>

          <div style={{ 
            background: 'var(--bg-secondary)', 
            padding: '1rem', 
            borderRadius: '0.5rem',
            marginBottom: '1.5rem'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
              <Calendar size={18} style={{ color: 'var(--primary)' }} />
              <strong>{format(new Date(selectedWindow.date), 'EEEE, MMMM d, yyyy')}</strong>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Clock size={18} style={{ color: 'var(--primary)' }} />
              {format(new Date(selectedWindow.startTime), 'HH:mm')} - {format(new Date(selectedWindow.endTime), 'HH:mm')}
              <span style={{ marginLeft: 'auto', color: getCapacityColor(selectedWindow.utilizationPercent) }}>
                {selectedWindow.availableMinutes} min available
              </span>
            </div>
          </div>

          <div className="form-group" style={{ marginBottom: '1rem' }}>
            <label className="form-label">Product *</label>
            <select 
              className="form-control"
              value={selectedProduct}
              onChange={e => setSelectedProduct(e.target.value)}
            >
              <option value="">Select a product...</option>
              {products?.map(p => (
                <option key={p.id} value={p.id}>
                  {p.name} ({p.code}) - {p.dispensingMinutesPerDose} min/dose
                </option>
              ))}
            </select>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
            <div className="form-group">
              <label className="form-label">Number of Doses *</label>
              <input
                type="number"
                className="form-control"
                value={numberOfDoses}
                onChange={e => setNumberOfDoses(Math.max(1, parseInt(e.target.value) || 1))}
                min={1}
              />
            </div>
            <div className="form-group">
              <label className="form-label">Requested Activity (mCi) *</label>
              <input
                type="number"
                className="form-control"
                value={requestedActivity}
                onChange={e => setRequestedActivity(parseFloat(e.target.value) || 0)}
                step="0.1"
              />
            </div>
          </div>

          <div className="form-group" style={{ marginBottom: '1rem' }}>
            <label className="form-label">Hospital Order Reference</label>
            <input
              type="text"
              className="form-control"
              value={hospitalOrderReference}
              onChange={e => setHospitalOrderReference(e.target.value)}
              placeholder="Your internal reference number (optional)"
            />
            <small style={{ color: 'var(--text-muted)' }}>
              This is used as a pseudonym - no patient identifiers
            </small>
          </div>

          <div className="form-group" style={{ marginBottom: '1.5rem' }}>
            <label className="form-label">Special Notes</label>
            <textarea
              className="form-control"
              value={specialNotes}
              onChange={e => setSpecialNotes(e.target.value)}
              rows={2}
              placeholder="Any special requirements or notes..."
            />
          </div>

          {selectedProduct && (
            <div style={{ 
              background: 'var(--bg-muted)', 
              padding: '1rem', 
              borderRadius: '0.5rem',
              marginBottom: '1.5rem'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 500 }}>
                <Timer size={18} />
                Estimated Time: {estimatedMinutes} minutes
              </div>
              {estimatedMinutes > selectedWindow.availableMinutes && (
                <div style={{ color: 'var(--danger)', marginTop: '0.5rem', fontSize: '0.85rem' }}>
                  <AlertTriangle size={16} style={{ marginRight: '0.25rem' }} />
                  Not enough capacity available in this window
                </div>
              )}
            </div>
          )}

          <button
            className="btn btn-primary"
            onClick={handleCreateReservation}
            disabled={!selectedProduct || estimatedMinutes > selectedWindow.availableMinutes || createReservationMutation.isPending}
            style={{ width: '100%' }}
          >
            {createReservationMutation.isPending ? 'Reserving...' : 'Reserve Capacity'}
          </button>
        </div>
      )}

      {step === 'confirm' && pendingReservation && (
        <div className="card" style={{ padding: '1.5rem', maxWidth: '600px', margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
            <div style={{ 
              width: '60px', 
              height: '60px', 
              borderRadius: '50%', 
              background: 'var(--success-bg)', 
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
            <p style={{ color: 'var(--text-muted)' }}>
              Reservation: {pendingReservation.reservationNumber}
            </p>
          </div>

          <div style={{ 
            background: countdown < 120 ? 'var(--danger-bg)' : 'var(--warning-bg)',
            padding: '1rem',
            borderRadius: '0.5rem',
            textAlign: 'center',
            marginBottom: '1.5rem'
          }}>
            <Timer size={24} style={{ marginBottom: '0.5rem', color: countdown < 120 ? 'var(--danger)' : 'var(--warning)' }} />
            <div style={{ fontSize: '1.5rem', fontWeight: 600 }}>
              {formatCountdown(countdown)}
            </div>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
              Confirm your order before the reservation expires
            </p>
          </div>

          <div style={{ 
            background: 'var(--bg-secondary)', 
            padding: '1rem', 
            borderRadius: '0.5rem',
            marginBottom: '1.5rem'
          }}>
            <h3 style={{ fontSize: '1rem', fontWeight: 500, marginBottom: '0.75rem' }}>Order Summary</h3>
            <div style={{ display: 'grid', gap: '0.5rem', fontSize: '0.9rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--text-muted)' }}>Product:</span>
                <span>{pendingReservation.product?.name}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--text-muted)' }}>Doses:</span>
                <span>{pendingReservation.numberOfDoses}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--text-muted)' }}>Activity:</span>
                <span>{pendingReservation.requestedActivity} mCi</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--text-muted)' }}>Delivery:</span>
                <span>{format(new Date(pendingReservation.requestedDate), 'MMM d, yyyy')}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--text-muted)' }}>Reserved Time:</span>
                <span>{pendingReservation.estimatedMinutes} minutes</span>
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '1rem' }}>
            <button
              className="btn btn-outline-secondary"
              onClick={() => { setStep('calendar'); setPendingReservation(null); }}
              style={{ flex: 1 }}
            >
              Cancel
            </button>
            <button
              className="btn btn-primary"
              onClick={handleConfirmOrder}
              disabled={countdown === 0 || confirmReservationMutation.isPending}
              style={{ flex: 2 }}
            >
              {confirmReservationMutation.isPending ? 'Creating Order...' : 'Confirm & Create Order'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
