import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import api from '../../lib/api';
import { format } from 'date-fns';
import { Truck, Package, Clock, CheckCircle, AlertTriangle, MapPin, Phone, ArrowRight } from 'lucide-react';
import { KpiCard, StatusBadge } from '../../components/shared';

export default function DriverDashboard() {
  const { data: dashboard, isLoading } = useQuery({
    queryKey: ['driver-dashboard'],
    queryFn: async () => {
      const { data } = await api.get('/driver/dashboard');
      return data;
    },
  });

  if (isLoading) {
    return (
      <div className="loading-overlay">
        <div className="spinner" />
      </div>
    );
  }

  const stats = dashboard?.stats || {};

  return (
    <div>
      <div style={{ marginBottom: '1.5rem' }}>
        <h2 style={{ fontSize: '1.25rem', fontWeight: 600, marginBottom: '0.25rem' }}>
          Welcome, {dashboard?.driver?.fullName || 'Driver'}
        </h2>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', margin: 0 }}>
          {dashboard?.driver?.vehicleType} • {dashboard?.driver?.vehiclePlateNo}
        </p>
      </div>

      <div className="grid" style={{ gridTemplateColumns: 'repeat(5, 1fr)', gap: '1rem', marginBottom: '1.5rem' }}>
        <KpiCard 
          title="Assigned Today" 
          value={stats.assignedToday || 0} 
          icon={<Package size={20} />}
          color="primary"
        />
        <KpiCard 
          title="Awaiting Accept" 
          value={stats.awaitingAcceptance || 0} 
          icon={<Clock size={20} />}
          color="warning"
        />
        <KpiCard 
          title="In Transit" 
          value={stats.inTransit || 0} 
          icon={<Truck size={20} />}
          color="info"
        />
        <KpiCard 
          title="Delivered Today" 
          value={stats.deliveredToday || 0} 
          icon={<CheckCircle size={20} />}
          color="success"
        />
        <KpiCard 
          title="Failed" 
          value={stats.failed || 0} 
          icon={<AlertTriangle size={20} />}
          color="danger"
        />
      </div>

      <div className="card">
        <div style={{ padding: '1rem 1.5rem', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h3 style={{ fontWeight: 600, fontSize: '1rem', margin: 0 }}>
            Upcoming Deliveries
          </h3>
          <Link to="/driver/shipments" className="btn btn-sm btn-outline">
            View All
            <ArrowRight size={14} />
          </Link>
        </div>
        
        {dashboard?.nextDeliveries?.length > 0 ? (
          <div style={{ padding: '1rem' }}>
            {dashboard.nextDeliveries.map((shipment: any) => (
              <div key={shipment.id} style={{ 
                padding: '1rem', 
                backgroundColor: 'var(--bg-secondary)', 
                borderRadius: 'var(--radius)',
                marginBottom: '0.75rem',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
              }}>
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.5rem' }}>
                    <span style={{ fontWeight: 600, fontFamily: 'monospace' }}>{shipment.shipmentNumber}</span>
                    <StatusBadge status={shipment.status} size="sm" />
                    {shipment.priority === 'URGENT' && (
                      <span className="badge badge-danger">Urgent</span>
                    )}
                  </div>
                  <div style={{ fontSize: '0.875rem', marginBottom: '0.25rem' }}>
                    {shipment.customer?.nameEn || shipment.customer?.name}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                      <MapPin size={12} />
                      {shipment.customer?.city || 'N/A'}
                    </span>
                    {shipment.scheduledDeliveryAt && (
                      <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                        <Clock size={12} />
                        {format(new Date(shipment.scheduledDeliveryAt), 'HH:mm')}
                      </span>
                    )}
                    <span>{shipment.orders?.length || 0} orders</span>
                  </div>
                </div>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  {shipment.customer?.mobile && (
                    <a href={`tel:${shipment.customer.mobile}`} className="btn btn-sm btn-outline">
                      <Phone size={14} />
                    </a>
                  )}
                  <Link to={`/driver/shipments/${shipment.id}`} className="btn btn-sm btn-primary">
                    Open
                    <ArrowRight size={14} />
                  </Link>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>
            No pending deliveries
          </div>
        )}
      </div>
    </div>
  );
}
