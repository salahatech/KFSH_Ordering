import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import api from '../lib/api';
import { format } from 'date-fns';
import { User, Truck, Plus, Search, Phone, Mail, Edit, Trash2, CheckCircle, XCircle, Car } from 'lucide-react';
import { useToast } from '../components/ui/Toast';
import { parseApiError } from '../components/ui/FormErrors';
import { KpiCard, StatusBadge, EmptyState } from '../components/shared';

export default function Drivers() {
  const [showModal, setShowModal] = useState(false);
  const [editingDriver, setEditingDriver] = useState<any>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const queryClient = useQueryClient();
  const toast = useToast();

  const { data: drivers, isLoading } = useQuery({
    queryKey: ['drivers', searchTerm, statusFilter],
    queryFn: async () => {
      const params: any = {};
      if (searchTerm) params.search = searchTerm;
      if (statusFilter) params.status = statusFilter;
      const { data } = await api.get('/drivers', { params });
      return data;
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: any) => {
      return api.post('/drivers', data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['drivers'] });
      setShowModal(false);
      setEditingDriver(null);
      toast.success('Driver Created', 'New driver has been added successfully');
    },
    onError: (error: any) => {
      const apiError = parseApiError(error);
      toast.error('Creation Failed', apiError?.userMessage || 'Failed to create driver');
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: any }) => {
      return api.put(`/drivers/${id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['drivers'] });
      setShowModal(false);
      setEditingDriver(null);
      toast.success('Driver Updated', 'Driver information has been updated');
    },
    onError: (error: any) => {
      const apiError = parseApiError(error);
      toast.error('Update Failed', apiError?.userMessage || 'Failed to update driver');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      return api.delete(`/drivers/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['drivers'] });
      toast.success('Driver Removed', 'Driver has been removed or deactivated');
    },
    onError: (error: any) => {
      const apiError = parseApiError(error);
      toast.error('Delete Failed', apiError?.userMessage || 'Failed to remove driver');
    },
  });

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const data = {
      fullName: formData.get('fullName'),
      mobile: formData.get('mobile'),
      email: formData.get('email') || null,
      nationalId: formData.get('nationalId') || null,
      driverLicenseNo: formData.get('driverLicenseNo') || null,
      licenseExpiryDate: formData.get('licenseExpiryDate') || null,
      vehicleType: formData.get('vehicleType'),
      vehiclePlateNo: formData.get('vehiclePlateNo') || null,
      vehicleModel: formData.get('vehicleModel') || null,
      status: formData.get('status') || 'ACTIVE',
      createUserAccount: formData.get('createUserAccount') === 'on',
      userPassword: formData.get('userPassword') || null,
    };

    if (editingDriver) {
      updateMutation.mutate({ id: editingDriver.id, data });
    } else {
      createMutation.mutate(data);
    }
  };

  const stats = {
    total: drivers?.length || 0,
    active: drivers?.filter((d: any) => d.status === 'ACTIVE').length || 0,
    inactive: drivers?.filter((d: any) => d.status === 'INACTIVE').length || 0,
    onRoute: drivers?.filter((d: any) => d.inTransit > 0).length || 0,
  };

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
          <h2 style={{ fontSize: '1.25rem', fontWeight: 600, marginBottom: '0.25rem' }}>Driver Management</h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', margin: 0 }}>
            Manage delivery drivers, vehicles, and availability
          </p>
        </div>
        <button className="btn btn-primary" onClick={() => { setEditingDriver(null); setShowModal(true); }}>
          <Plus size={16} />
          Add Driver
        </button>
      </div>

      <div className="grid" style={{ gridTemplateColumns: 'repeat(4, 1fr)', gap: '1rem', marginBottom: '1.5rem' }}>
        <KpiCard 
          title="Total Drivers" 
          value={stats.total} 
          icon={<User size={20} />}
          color="primary"
          onClick={() => setStatusFilter('')}
          selected={!statusFilter}
        />
        <KpiCard 
          title="Active" 
          value={stats.active} 
          icon={<CheckCircle size={20} />}
          color="success"
          onClick={() => setStatusFilter('ACTIVE')}
          selected={statusFilter === 'ACTIVE'}
        />
        <KpiCard 
          title="Inactive" 
          value={stats.inactive} 
          icon={<XCircle size={20} />}
          color="default"
          onClick={() => setStatusFilter('INACTIVE')}
          selected={statusFilter === 'INACTIVE'}
        />
        <KpiCard 
          title="On Route" 
          value={stats.onRoute} 
          icon={<Truck size={20} />}
          color="info"
        />
      </div>

      <div className="card" style={{ marginBottom: '1rem', padding: '1rem' }}>
        <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
          <div style={{ position: 'relative', flex: 1 }}>
            <Search size={16} style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
            <input
              type="text"
              placeholder="Search by name, mobile, email, or plate number..."
              className="form-input"
              style={{ paddingLeft: '2.25rem' }}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <select
            className="form-select"
            style={{ width: '150px' }}
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="">All Status</option>
            <option value="ACTIVE">Active</option>
            <option value="INACTIVE">Inactive</option>
          </select>
        </div>
      </div>

      <div className="card">
        <div style={{ padding: '1rem 1.5rem', borderBottom: '1px solid var(--border)' }}>
          <h3 style={{ fontWeight: 600, fontSize: '1rem', margin: 0 }}>
            Drivers ({drivers?.length || 0})
          </h3>
        </div>
        {drivers?.length > 0 ? (
          <table className="table" style={{ marginBottom: 0 }}>
            <thead>
              <tr>
                <th>Driver</th>
                <th>Contact</th>
                <th>Vehicle</th>
                <th>Workload</th>
                <th>Status</th>
                <th style={{ width: '100px', textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {drivers.map((driver: any) => (
                <tr key={driver.id}>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                      <div style={{ 
                        width: '40px', 
                        height: '40px', 
                        borderRadius: '50%', 
                        backgroundColor: 'var(--primary-light)', 
                        display: 'flex', 
                        alignItems: 'center', 
                        justifyContent: 'center',
                        color: 'var(--primary)',
                        fontWeight: 600,
                      }}>
                        {driver.fullName.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <div style={{ fontWeight: 500 }}>{driver.fullName}</div>
                        {driver.driverLicenseNo && (
                          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                            License: {driver.driverLicenseNo}
                          </div>
                        )}
                      </div>
                    </div>
                  </td>
                  <td>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.875rem' }}>
                        <Phone size={12} />
                        {driver.mobile}
                      </div>
                      {driver.email && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                          <Mail size={12} />
                          {driver.email}
                        </div>
                      )}
                    </div>
                  </td>
                  <td>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <Car size={14} />
                        {driver.vehicleType}
                      </div>
                      {driver.vehiclePlateNo && (
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                          {driver.vehiclePlateNo} {driver.vehicleModel && `• ${driver.vehicleModel}`}
                        </div>
                      )}
                    </div>
                  </td>
                  <td>
                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                      {driver.inTransit > 0 ? (
                        <span className="badge badge-info">{driver.inTransit} in transit</span>
                      ) : (
                        <span className="badge badge-default">Available</span>
                      )}
                      {driver.assignedToday > 0 && (
                        <span className="badge badge-warning">{driver.assignedToday} today</span>
                      )}
                    </div>
                  </td>
                  <td>
                    <span className={`badge ${driver.status === 'ACTIVE' ? 'badge-success' : 'badge-default'}`}>
                      {driver.status}
                    </span>
                  </td>
                  <td>
                    <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
                      <button
                        className="btn btn-sm btn-outline"
                        onClick={() => { setEditingDriver(driver); setShowModal(true); }}
                        title="Edit"
                      >
                        <Edit size={14} />
                      </button>
                      <button
                        className="btn btn-sm btn-outline"
                        style={{ color: 'var(--danger)' }}
                        onClick={() => {
                          if (confirm(`Are you sure you want to ${driver._count?.shipments > 0 ? 'deactivate' : 'delete'} this driver?`)) {
                            deleteMutation.mutate(driver.id);
                          }
                        }}
                        title="Remove"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <div style={{ padding: '2rem' }}>
            <EmptyState 
              title="No drivers found"
              message="Add your first driver to start assigning shipments"
              icon="user"
            />
          </div>
        )}
      </div>

      {showModal && (
        <div className="modal-overlay">
          <div className="modal" style={{ maxWidth: '600px' }}>
            <div className="modal-header">
              <h3>{editingDriver ? 'Edit Driver' : 'Add Driver'}</h3>
              <button className="btn btn-secondary btn-sm" onClick={() => { setShowModal(false); setEditingDriver(null); }}>×</button>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="modal-body">
                <div className="form-row">
                  <div className="form-group" style={{ flex: 2 }}>
                    <label className="form-label">Full Name *</label>
                    <input 
                      type="text" 
                      name="fullName" 
                      className="form-input" 
                      required 
                      defaultValue={editingDriver?.fullName || ''}
                    />
                  </div>
                  <div className="form-group" style={{ flex: 1 }}>
                    <label className="form-label">Status</label>
                    <select name="status" className="form-select" defaultValue={editingDriver?.status || 'ACTIVE'}>
                      <option value="ACTIVE">Active</option>
                      <option value="INACTIVE">Inactive</option>
                    </select>
                  </div>
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">Mobile *</label>
                    <input 
                      type="tel" 
                      name="mobile" 
                      className="form-input" 
                      required 
                      placeholder="+966 5xx xxx xxxx"
                      defaultValue={editingDriver?.mobile || ''}
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Email</label>
                    <input 
                      type="email" 
                      name="email" 
                      className="form-input" 
                      defaultValue={editingDriver?.email || ''}
                    />
                  </div>
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">National ID / Iqama</label>
                    <input 
                      type="text" 
                      name="nationalId" 
                      className="form-input" 
                      defaultValue={editingDriver?.nationalId || ''}
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Driver License No</label>
                    <input 
                      type="text" 
                      name="driverLicenseNo" 
                      className="form-input" 
                      defaultValue={editingDriver?.driverLicenseNo || ''}
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">License Expiry Date</label>
                  <input 
                    type="date" 
                    name="licenseExpiryDate" 
                    className="form-input" 
                    defaultValue={editingDriver?.licenseExpiryDate ? format(new Date(editingDriver.licenseExpiryDate), 'yyyy-MM-dd') : ''}
                  />
                </div>

                <div style={{ borderTop: '1px solid var(--border)', margin: '1rem 0', paddingTop: '1rem' }}>
                  <h4 style={{ fontSize: '0.875rem', fontWeight: 600, marginBottom: '0.75rem' }}>Vehicle Information</h4>
                  <div className="form-row">
                    <div className="form-group">
                      <label className="form-label">Vehicle Type</label>
                      <select name="vehicleType" className="form-select" defaultValue={editingDriver?.vehicleType || 'CAR'}>
                        <option value="CAR">Car</option>
                        <option value="VAN">Van</option>
                        <option value="MOTORCYCLE">Motorcycle</option>
                      </select>
                    </div>
                    <div className="form-group">
                      <label className="form-label">Plate Number</label>
                      <input 
                        type="text" 
                        name="vehiclePlateNo" 
                        className="form-input" 
                        placeholder="ABC 1234"
                        defaultValue={editingDriver?.vehiclePlateNo || ''}
                      />
                    </div>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Vehicle Model</label>
                    <input 
                      type="text" 
                      name="vehicleModel" 
                      className="form-input" 
                      placeholder="e.g., Toyota Hilux 2023"
                      defaultValue={editingDriver?.vehicleModel || ''}
                    />
                  </div>
                </div>

                {!editingDriver && (
                  <div style={{ borderTop: '1px solid var(--border)', margin: '1rem 0', paddingTop: '1rem' }}>
                    <h4 style={{ fontSize: '0.875rem', fontWeight: 600, marginBottom: '0.75rem' }}>Portal Access</h4>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
                      <input type="checkbox" name="createUserAccount" />
                      <span>Create user account for driver portal access</span>
                    </label>
                    <div className="form-group" style={{ marginTop: '0.75rem' }}>
                      <label className="form-label">Initial Password</label>
                      <input 
                        type="password" 
                        name="userPassword" 
                        className="form-input" 
                        placeholder="Leave empty for default: driver123"
                      />
                    </div>
                  </div>
                )}
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => { setShowModal(false); setEditingDriver(null); }}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary" disabled={createMutation.isPending || updateMutation.isPending}>
                  {(createMutation.isPending || updateMutation.isPending) ? 'Saving...' : (editingDriver ? 'Update Driver' : 'Add Driver')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
