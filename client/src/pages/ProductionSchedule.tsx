import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import api from '../lib/api';
import { format, startOfWeek, addDays, subDays, addWeeks, subWeeks } from 'date-fns';
import { Calendar, ChevronLeft, ChevronRight, BarChart3, Grid3X3, List, Clock } from 'lucide-react';
import { ProductionGanttChart, EquipmentHeatMap } from '../components/charts';

type ViewMode = 'gantt' | 'heatmap' | 'list';

export default function ProductionSchedule() {
  const [selectedDate, setSelectedDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [viewMode, setViewMode] = useState<ViewMode>('gantt');
  const [weekView, setWeekView] = useState(false);
  const navigate = useNavigate();

  const weekStart = useMemo(() => startOfWeek(new Date(selectedDate), { weekStartsOn: 1 }), [selectedDate]);

  const { data: batches, isLoading: batchesLoading } = useQuery({
    queryKey: ['production-schedule-batches', selectedDate, weekView],
    queryFn: async () => {
      const fromDate = weekView ? format(weekStart, 'yyyy-MM-dd') : selectedDate;
      const toDate = weekView ? format(addDays(weekStart, 6), 'yyyy-MM-dd') : selectedDate;
      const { data } = await api.get('/planner/batches', { params: { fromDate, toDate } });
      return data;
    },
  });

  const { data: equipment } = useQuery({
    queryKey: ['production-equipment'],
    queryFn: async () => {
      const { data } = await api.get('/planner/equipment');
      return data;
    },
  });

  const utilizationData = useMemo(() => {
    if (!batches || !equipment) return [];
    
    const slots: Array<{
      hour: number;
      date: string;
      utilizationPercent: number;
      batchCount: number;
      equipmentId: string;
    }> = [];
    
    equipment.forEach((equip: any) => {
      const days = weekView ? 7 : 1;
      for (let d = 0; d < days; d++) {
        const dayDate = weekView ? format(addDays(weekStart, d), 'yyyy-MM-dd') : selectedDate;
        
        for (let hour = 0; hour < 24; hour++) {
          const hourStart = new Date(`${dayDate}T${hour.toString().padStart(2, '0')}:00:00`);
          const hourEnd = new Date(`${dayDate}T${hour.toString().padStart(2, '0')}:59:59`);
          
          const batchesInSlot = batches.filter((b: any) => {
            const batchStart = new Date(b.plannedStartTime);
            const batchEnd = new Date(b.plannedEndTime);
            const equipMatch = b.synthesisModuleId === equip.id || b.hotCellId === equip.id;
            return equipMatch && batchStart <= hourEnd && batchEnd >= hourStart;
          });
          
          slots.push({
            hour,
            date: dayDate,
            utilizationPercent: Math.min(100, batchesInSlot.length * 50),
            batchCount: batchesInSlot.length,
            equipmentId: equip.id
          });
        }
      }
    });
    
    return slots;
  }, [batches, equipment, selectedDate, weekStart, weekView]);

  const handlePrevious = () => {
    if (weekView) {
      setSelectedDate(format(subWeeks(new Date(selectedDate), 1), 'yyyy-MM-dd'));
    } else {
      setSelectedDate(format(subDays(new Date(selectedDate), 1), 'yyyy-MM-dd'));
    }
  };

  const handleNext = () => {
    if (weekView) {
      setSelectedDate(format(addWeeks(new Date(selectedDate), 1), 'yyyy-MM-dd'));
    } else {
      setSelectedDate(format(addDays(new Date(selectedDate), 1), 'yyyy-MM-dd'));
    }
  };

  const handleBatchClick = (batch: any) => {
    navigate(`/batches/${batch.id}`);
  };

  return (
    <div className="page-container">
      <div className="page-header">
        <div>
          <h1>Production Schedule</h1>
          <p style={{ color: 'var(--text-secondary)', marginTop: '0.25rem' }}>
            Visual overview of batch production and equipment utilization
          </p>
        </div>
      </div>

      <div className="card" style={{ marginBottom: '1.5rem' }}>
        <div style={{ padding: '1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <button className="btn btn-secondary" onClick={handlePrevious} style={{ padding: '0.5rem' }}>
              <ChevronLeft size={18} />
            </button>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', minWidth: '200px', justifyContent: 'center' }}>
              <Calendar size={18} />
              <input
                type="date"
                value={selectedDate}
                onChange={e => setSelectedDate(e.target.value)}
                style={{
                  border: '1px solid var(--border)',
                  borderRadius: 'var(--radius)',
                  padding: '0.5rem 0.75rem',
                  fontSize: '0.9rem'
                }}
              />
            </div>
            <button className="btn btn-secondary" onClick={handleNext} style={{ padding: '0.5rem' }}>
              <ChevronRight size={18} />
            </button>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.875rem', cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={weekView}
                onChange={e => setWeekView(e.target.checked)}
                style={{ width: '16px', height: '16px' }}
              />
              Week View
            </label>

            <div style={{ display: 'flex', background: 'var(--bg-secondary)', borderRadius: 'var(--radius)', padding: '2px' }}>
              <button
                className={`btn btn-sm ${viewMode === 'gantt' ? 'btn-primary' : 'btn-secondary'}`}
                onClick={() => setViewMode('gantt')}
                style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', padding: '0.4rem 0.75rem' }}
              >
                <BarChart3 size={16} />
                Gantt
              </button>
              <button
                className={`btn btn-sm ${viewMode === 'heatmap' ? 'btn-primary' : 'btn-secondary'}`}
                onClick={() => setViewMode('heatmap')}
                style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', padding: '0.4rem 0.75rem' }}
              >
                <Grid3X3 size={16} />
                Heat Map
              </button>
              <button
                className={`btn btn-sm ${viewMode === 'list' ? 'btn-primary' : 'btn-secondary'}`}
                onClick={() => setViewMode('list')}
                style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', padding: '0.4rem 0.75rem' }}
              >
                <List size={16} />
                List
              </button>
            </div>
          </div>
        </div>
      </div>

      <div style={{ marginBottom: '1.5rem' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '1rem' }}>
          <div className="card" style={{ padding: '1rem', textAlign: 'center' }}>
            <div style={{ fontSize: '1.75rem', fontWeight: 700, color: 'var(--primary)' }}>
              {batches?.length || 0}
            </div>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Scheduled Batches</div>
          </div>
          <div className="card" style={{ padding: '1rem', textAlign: 'center' }}>
            <div style={{ fontSize: '1.75rem', fontWeight: 700, color: '#22c55e' }}>
              {batches?.filter((b: any) => b.status === 'IN_PRODUCTION').length || 0}
            </div>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>In Production</div>
          </div>
          <div className="card" style={{ padding: '1rem', textAlign: 'center' }}>
            <div style={{ fontSize: '1.75rem', fontWeight: 700, color: '#f59e0b' }}>
              {batches?.filter((b: any) => b.status === 'QC_PENDING').length || 0}
            </div>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Awaiting QC</div>
          </div>
          <div className="card" style={{ padding: '1rem', textAlign: 'center' }}>
            <div style={{ fontSize: '1.75rem', fontWeight: 700, color: '#8b5cf6' }}>
              {batches?.filter((b: any) => b.status === 'RELEASED').length || 0}
            </div>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Released</div>
          </div>
        </div>
      </div>

      {batchesLoading ? (
        <div className="card" style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-secondary)' }}>
          Loading schedule...
        </div>
      ) : viewMode === 'gantt' ? (
        <ProductionGanttChart
          batches={batches || []}
          equipment={equipment || []}
          date={selectedDate}
          onBatchClick={handleBatchClick}
        />
      ) : viewMode === 'heatmap' ? (
        <EquipmentHeatMap
          equipment={equipment || []}
          utilizationData={utilizationData}
          weekStart={weekStart}
          view={weekView ? 'weekly' : 'daily'}
          selectedDate={selectedDate}
          onCellClick={(equip, date, hour) => {
            console.log('Cell clicked:', equip.name, date, hour);
          }}
        />
      ) : (
        <div className="card">
          <div style={{ padding: '1rem 1.5rem', borderBottom: '1px solid var(--border)' }}>
            <h3 style={{ fontWeight: 600, margin: 0 }}>Batch List</h3>
          </div>
          <div style={{ overflowX: 'auto' }}>
            <table className="table">
              <thead>
                <tr>
                  <th>Batch #</th>
                  <th>Product</th>
                  <th>Planned Time</th>
                  <th>Target Activity</th>
                  <th>Status</th>
                  <th>Orders</th>
                </tr>
              </thead>
              <tbody>
                {batches?.length === 0 ? (
                  <tr>
                    <td colSpan={6} style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-secondary)' }}>
                      No batches scheduled for this {weekView ? 'week' : 'date'}
                    </td>
                  </tr>
                ) : (
                  batches?.map((batch: any) => (
                    <tr 
                      key={batch.id} 
                      onClick={() => handleBatchClick(batch)}
                      style={{ cursor: 'pointer' }}
                    >
                      <td style={{ fontWeight: 500 }}>{batch.batchNumber}</td>
                      <td>{batch.product?.name}</td>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                          <Clock size={14} />
                          {format(new Date(batch.plannedStartTime), 'MMM d HH:mm')} - {format(new Date(batch.plannedEndTime), 'HH:mm')}
                        </div>
                      </td>
                      <td>{batch.targetActivity} {batch.activityUnit}</td>
                      <td>
                        <span className={`badge badge-${batch.status === 'RELEASED' ? 'success' : batch.status === 'IN_PRODUCTION' ? 'primary' : 'default'}`}>
                          {batch.status.replace(/_/g, ' ')}
                        </span>
                      </td>
                      <td>{batch.orders?.length || 0}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
