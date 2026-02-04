import { useMemo } from 'react';
import { format, addDays, startOfWeek, eachDayOfInterval, eachHourOfInterval, startOfDay, endOfDay } from 'date-fns';

interface UtilizationSlot {
  hour: number;
  date: string;
  utilizationPercent: number;
  batchCount: number;
  equipmentId?: string;
}

interface Equipment {
  id: string;
  name: string;
  type: string;
  capacity?: number;
}

interface EquipmentHeatMapProps {
  equipment: Equipment[];
  utilizationData: UtilizationSlot[];
  weekStart: Date;
  onCellClick?: (equipment: Equipment, date: string, hour: number) => void;
  view?: 'weekly' | 'daily';
  selectedDate?: string;
}

const getHeatColor = (percent: number) => {
  if (percent === 0) return 'var(--bg-secondary)';
  if (percent < 25) return '#dcfce7';
  if (percent < 50) return '#86efac';
  if (percent < 75) return '#fcd34d';
  if (percent < 90) return '#fb923c';
  return '#ef4444';
};

const getTextColor = (percent: number) => {
  if (percent === 0) return 'var(--text-tertiary)';
  if (percent < 50) return '#166534';
  if (percent < 75) return '#92400e';
  return '#ffffff';
};

export default function EquipmentHeatMap({ 
  equipment, 
  utilizationData, 
  weekStart, 
  onCellClick,
  view = 'weekly',
  selectedDate 
}: EquipmentHeatMapProps) {
  const days = useMemo(() => {
    if (view === 'daily' && selectedDate) {
      return [new Date(selectedDate)];
    }
    const start = startOfWeek(weekStart, { weekStartsOn: 1 });
    return eachDayOfInterval({ start, end: addDays(start, 6) });
  }, [weekStart, view, selectedDate]);

  const hours = view === 'daily' ? Array.from({ length: 24 }, (_, i) => i) : [6, 9, 12, 15, 18];

  const getUtilization = (equipmentId: string, date: string, hour: number) => {
    const slot = utilizationData.find(
      s => s.equipmentId === equipmentId && s.date === date && s.hour === hour
    );
    return slot?.utilizationPercent || 0;
  };

  const getBatchCount = (equipmentId: string, date: string, hour: number) => {
    const slot = utilizationData.find(
      s => s.equipmentId === equipmentId && s.date === date && s.hour === hour
    );
    return slot?.batchCount || 0;
  };

  const calculateEquipmentDayAverage = (equipmentId: string, date: string) => {
    const daySlots = utilizationData.filter(
      s => s.equipmentId === equipmentId && s.date === date
    );
    if (daySlots.length === 0) return 0;
    const sum = daySlots.reduce((acc, s) => acc + s.utilizationPercent, 0);
    return Math.round(sum / daySlots.length);
  };

  return (
    <div className="card" style={{ overflow: 'hidden' }}>
      <div style={{ padding: '1rem 1.5rem', borderBottom: '1px solid var(--border)' }}>
        <h3 style={{ fontWeight: 600, margin: 0 }}>
          Equipment Utilization Heat Map
          {view === 'weekly' && ` - Week of ${format(weekStart, 'MMM d, yyyy')}`}
          {view === 'daily' && selectedDate && ` - ${format(new Date(selectedDate), 'EEEE, MMMM d')}`}
        </h3>
      </div>
      
      <div style={{ overflowX: 'auto' }}>
        <div style={{ minWidth: view === 'daily' ? '800px' : '1000px' }}>
          <div style={{ display: 'flex', borderBottom: '1px solid var(--border)', background: 'var(--bg-secondary)' }}>
            <div style={{ width: '140px', flexShrink: 0, padding: '0.75rem 1rem', fontWeight: 600, fontSize: '0.85rem' }}>
              Equipment
            </div>
            {days.map(day => (
              <div key={day.toISOString()} style={{ flex: 1, minWidth: view === 'daily' ? 'auto' : '100px' }}>
                {view === 'weekly' ? (
                  <div style={{ 
                    textAlign: 'center', 
                    padding: '0.5rem',
                    borderLeft: '1px solid var(--border)',
                    fontWeight: 500,
                    fontSize: '0.8rem'
                  }}>
                    <div>{format(day, 'EEE')}</div>
                    <div style={{ color: 'var(--text-secondary)', fontSize: '0.75rem' }}>{format(day, 'MMM d')}</div>
                  </div>
                ) : (
                  <div style={{ display: 'flex' }}>
                    {hours.map(hour => (
                      <div 
                        key={hour}
                        style={{
                          flex: 1,
                          textAlign: 'center',
                          padding: '0.5rem 0.25rem',
                          borderLeft: '1px solid var(--border)',
                          fontSize: '0.7rem',
                          color: 'var(--text-secondary)'
                        }}
                      >
                        {hour.toString().padStart(2, '0')}:00
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
          
          {equipment.length === 0 ? (
            <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-secondary)' }}>
              No equipment data available
            </div>
          ) : (
            equipment.map((equip, eqIdx) => (
              <div 
                key={equip.id} 
                style={{ 
                  display: 'flex', 
                  borderBottom: '1px solid var(--border)',
                  background: eqIdx % 2 === 0 ? 'var(--bg-primary)' : 'rgba(0,0,0,0.01)'
                }}
              >
                <div style={{ 
                  width: '140px', 
                  flexShrink: 0, 
                  padding: '0.75rem 1rem',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'center'
                }}>
                  <div style={{ fontWeight: 500, fontSize: '0.85rem' }}>{equip.name}</div>
                  <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>{equip.type}</div>
                </div>
                
                {days.map(day => {
                  const dateStr = format(day, 'yyyy-MM-dd');
                  
                  if (view === 'weekly') {
                    const avgUtil = calculateEquipmentDayAverage(equip.id, dateStr);
                    return (
                      <div 
                        key={dateStr}
                        onClick={() => onCellClick?.(equip, dateStr, 12)}
                        style={{
                          flex: 1,
                          minWidth: '100px',
                          minHeight: '48px',
                          borderLeft: '1px solid var(--border)',
                          background: getHeatColor(avgUtil),
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          cursor: 'pointer',
                          transition: 'opacity 0.15s'
                        }}
                        onMouseEnter={e => e.currentTarget.style.opacity = '0.8'}
                        onMouseLeave={e => e.currentTarget.style.opacity = '1'}
                        title={`${equip.name} - ${format(day, 'EEE MMM d')}: ${avgUtil}% utilization`}
                      >
                        <span style={{ 
                          fontSize: '0.8rem', 
                          fontWeight: 600,
                          color: getTextColor(avgUtil)
                        }}>
                          {avgUtil}%
                        </span>
                      </div>
                    );
                  }
                  
                  return (
                    <div key={dateStr} style={{ flex: 1, display: 'flex' }}>
                      {hours.map(hour => {
                        const util = getUtilization(equip.id, dateStr, hour);
                        const batches = getBatchCount(equip.id, dateStr, hour);
                        
                        return (
                          <div
                            key={hour}
                            onClick={() => onCellClick?.(equip, dateStr, hour)}
                            style={{
                              flex: 1,
                              minHeight: '40px',
                              borderLeft: '1px solid var(--border)',
                              background: getHeatColor(util),
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              cursor: 'pointer',
                              transition: 'opacity 0.15s'
                            }}
                            onMouseEnter={e => e.currentTarget.style.opacity = '0.8'}
                            onMouseLeave={e => e.currentTarget.style.opacity = '1'}
                            title={`${equip.name} at ${hour}:00 - ${util}% (${batches} batches)`}
                          >
                            {util > 0 && (
                              <span style={{ 
                                fontSize: '0.65rem', 
                                fontWeight: 500,
                                color: getTextColor(util)
                              }}>
                                {util}%
                              </span>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  );
                })}
              </div>
            ))
          )}
        </div>
      </div>
      
      <div style={{ padding: '1rem', borderTop: '1px solid var(--border)', background: 'var(--bg-secondary)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.75rem' }}>
          <span style={{ color: 'var(--text-secondary)' }}>Utilization:</span>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
            <div style={{ width: '20px', height: '12px', background: 'var(--bg-secondary)', border: '1px solid var(--border)', borderRadius: '2px' }} />
            <span style={{ color: 'var(--text-secondary)' }}>0%</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
            <div style={{ width: '20px', height: '12px', background: '#dcfce7', borderRadius: '2px' }} />
            <span style={{ color: 'var(--text-secondary)' }}>1-24%</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
            <div style={{ width: '20px', height: '12px', background: '#86efac', borderRadius: '2px' }} />
            <span style={{ color: 'var(--text-secondary)' }}>25-49%</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
            <div style={{ width: '20px', height: '12px', background: '#fcd34d', borderRadius: '2px' }} />
            <span style={{ color: 'var(--text-secondary)' }}>50-74%</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
            <div style={{ width: '20px', height: '12px', background: '#fb923c', borderRadius: '2px' }} />
            <span style={{ color: 'var(--text-secondary)' }}>75-89%</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
            <div style={{ width: '20px', height: '12px', background: '#ef4444', borderRadius: '2px' }} />
            <span style={{ color: 'var(--text-secondary)' }}>90-100%</span>
          </div>
        </div>
      </div>
    </div>
  );
}
