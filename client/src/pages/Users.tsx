import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../lib/api';
import { Plus, Edit2, UserCheck, UserX, AlertTriangle, Link2, Users as UsersIcon, Shield, Building, Truck, Phone, Mail } from 'lucide-react';
import { useToast } from '../components/ui/Toast';
import { KpiCard, FilterBar, EmptyState, type FilterWidget } from '../components/shared';

export default function Users() {
  const [showModal, setShowModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState<any>(null);
  const [selectedRoleId, setSelectedRoleId] = useState<string>('');
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>('');
  const [filters, setFilters] = useState<Record<string, any>>({});
  const [selectedKpi, setSelectedKpi] = useState<string | null>(null);
  const queryClient = useQueryClient();
  const toast = useToast();

  const { data: users, isLoading } = useQuery({
    queryKey: ['users'],
    queryFn: async () => {
      const { data } = await api.get('/users');
      return data;
    },
  });

  const { data: roles } = useQuery({
    queryKey: ['roles'],
    queryFn: async () => {
      const { data } = await api.get('/roles');
      return data;
    },
  });

  const { data: customers } = useQuery({
    queryKey: ['customers'],
    queryFn: async () => {
      const { data } = await api.get('/customers');
      return data;
    },
  });

  const isCustomerRole = roles?.find((r: any) => r.id === selectedRoleId)?.name === 'Customer';
  const isDriverRole = roles?.find((r: any) => r.id === selectedRoleId)?.name === 'Driver';

  useEffect(() => {
    if (selectedUser) {
      setSelectedRoleId(selectedUser.roleId || '');
      setSelectedCustomerId(selectedUser.customerId || '');
    } else {
      setSelectedRoleId('');
      setSelectedCustomerId('');
    }
  }, [selectedUser]);

  const saveMutation = useMutation({
    mutationFn: async (data: any) => {
      if (selectedUser) {
        return api.put(`/users/${selectedUser.id}`, data);
      }
      return api.post('/users', data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      setShowModal(false);
      setSelectedUser(null);
      toast.success('Success', selectedUser ? 'User updated successfully' : 'User created successfully');
    },
    onError: (error: any) => {
      toast.error('Error', error.response?.data?.error || 'Failed to save user');
    },
  });

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const roleId = formData.get('roleId') as string;
    const customerId = formData.get('customerId') as string;
    
    const roleName = roles?.find((r: any) => r.id === roleId)?.name;
    if (roleName === 'Customer' && !customerId) {
      toast.error('Customer Required', 'Users with Customer role must be linked to a customer record.');
      return;
    }
    
    saveMutation.mutate({
      email: formData.get('email'),
      password: formData.get('password') || undefined,
      firstName: formData.get('firstName'),
      lastName: formData.get('lastName'),
      phone: formData.get('phone'),
      roleId,
      customerId: customerId || null,
      isActive: formData.get('isActive') === 'true',
    });
  };

  const filterWidgets: FilterWidget[] = [
    { key: 'search', label: 'Search', type: 'search', placeholder: 'Search name, email, phone...' },
    { 
      key: 'role', 
      label: 'Role', 
      type: 'select', 
      options: [
        { value: '', label: 'All Roles' },
        ...(roles?.map((r: any) => ({ value: r.id, label: r.name })) || [])
      ]
    },
    { 
      key: 'status', 
      label: 'Status', 
      type: 'select', 
      options: [
        { value: '', label: 'All' },
        { value: 'active', label: 'Active' },
        { value: 'inactive', label: 'Inactive' },
      ]
    },
    { 
      key: 'customerLinked', 
      label: 'Customer Link', 
      type: 'select', 
      options: [
        { value: '', label: 'All' },
        { value: 'linked', label: 'Linked to Customer' },
        { value: 'internal', label: 'Internal Users' },
      ]
    },
  ];

  const filteredUsers = users?.filter((user: any) => {
    if (filters.role && user.roleId !== filters.role) return false;
    if (filters.status === 'active' && !user.isActive) return false;
    if (filters.status === 'inactive' && user.isActive) return false;
    if (filters.customerLinked === 'linked' && !user.customerId) return false;
    if (filters.customerLinked === 'internal' && user.customerId) return false;
    
    if (selectedKpi === 'active' && !user.isActive) return false;
    if (selectedKpi === 'inactive' && user.isActive) return false;
    if (selectedKpi === 'admins' && user.role?.name !== 'Admin') return false;
    if (selectedKpi === 'customers' && user.role?.name !== 'Customer') return false;
    if (selectedKpi === 'drivers' && user.role?.name !== 'Driver') return false;

    if (filters.search) {
      const q = filters.search.toLowerCase();
      const searchFields = [
        user.firstName,
        user.lastName,
        `${user.firstName} ${user.lastName}`,
        user.email,
        user.phone,
        user.role?.name,
        user.customer?.name,
      ];
      if (!searchFields.some(field => field?.toLowerCase().includes(q))) {
        return false;
      }
    }
    return true;
  });

  const stats = {
    total: users?.length || 0,
    active: users?.filter((u: any) => u.isActive).length || 0,
    inactive: users?.filter((u: any) => !u.isActive).length || 0,
    admins: users?.filter((u: any) => u.role?.name === 'Admin').length || 0,
    customers: users?.filter((u: any) => u.role?.name === 'Customer').length || 0,
    drivers: users?.filter((u: any) => u.role?.name === 'Driver').length || 0,
  };

  const handleKpiClick = (kpi: string) => {
    if (selectedKpi === kpi) {
      setSelectedKpi(null);
    } else {
      setSelectedKpi(kpi);
    }
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
          <h2 style={{ fontSize: '1.25rem', fontWeight: 600, marginBottom: '0.25rem' }}>User Management</h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', margin: 0 }}>
            Manage system users, roles, and customer access
          </p>
        </div>
        <button className="btn btn-primary" onClick={() => setShowModal(true)}>
          <Plus size={16} />
          Add User
        </button>
      </div>

      <div className="grid" style={{ gridTemplateColumns: 'repeat(5, 1fr)', gap: '1rem', marginBottom: '1.5rem' }}>
        <KpiCard 
          title="Total Users" 
          value={stats.total} 
          icon={<UsersIcon size={20} />}
          color="primary"
          onClick={() => setSelectedKpi(null)}
          selected={selectedKpi === null}
        />
        <KpiCard 
          title="Active" 
          value={stats.active} 
          icon={<UserCheck size={20} />}
          color="success"
          onClick={() => handleKpiClick('active')}
          selected={selectedKpi === 'active'}
        />
        <KpiCard 
          title="Inactive" 
          value={stats.inactive} 
          icon={<UserX size={20} />}
          color="danger"
          onClick={() => handleKpiClick('inactive')}
          selected={selectedKpi === 'inactive'}
        />
        <KpiCard 
          title="Admins" 
          value={stats.admins} 
          icon={<Shield size={20} />}
          color="info"
          onClick={() => handleKpiClick('admins')}
          selected={selectedKpi === 'admins'}
        />
        <KpiCard 
          title="Customers" 
          value={stats.customers} 
          icon={<Building size={20} />}
          color="warning"
          onClick={() => handleKpiClick('customers')}
          selected={selectedKpi === 'customers'}
        />
      </div>

      <div className="card" style={{ marginBottom: '1rem', padding: '1rem' }}>
        <FilterBar 
          widgets={filterWidgets}
          values={filters}
          onChange={(key, value) => setFilters(prev => ({ ...prev, [key]: value }))}
          onReset={() => { setFilters({}); setSelectedKpi(null); }}
        />
      </div>

      <div className="card">
        <div style={{ padding: '1rem 1.5rem', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <h3 style={{ fontWeight: 600, fontSize: '1rem', margin: 0 }}>
            User List ({filteredUsers?.length || 0})
          </h3>
        </div>
        {filteredUsers?.length > 0 ? (
          <div style={{ overflowX: 'auto' }}>
            <table className="table" style={{ marginBottom: 0, minWidth: '900px' }}>
              <thead>
                <tr>
                  <th>User</th>
                  <th>Email</th>
                  <th>Phone</th>
                  <th>Role</th>
                  <th>Linked Customer</th>
                  <th>Status</th>
                  <th style={{ width: '80px', textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredUsers.map((user: any) => (
                  <tr key={user.id}>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                        <div
                          style={{
                            width: '2.25rem',
                            height: '2.25rem',
                            borderRadius: '50%',
                            background: user.isActive ? 'var(--primary)' : 'var(--text-muted)',
                            color: 'white',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontWeight: 600,
                            fontSize: '0.8125rem',
                          }}
                        >
                          {user.firstName?.[0]}{user.lastName?.[0]}
                        </div>
                        <div>
                          <div style={{ fontWeight: 500 }}>{user.firstName} {user.lastName}</div>
                        </div>
                      </div>
                    </td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', fontSize: '0.875rem' }}>
                        <Mail size={14} style={{ color: 'var(--text-muted)' }} />
                        {user.email}
                      </div>
                    </td>
                    <td>
                      {user.phone ? (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', fontSize: '0.875rem' }}>
                          <Phone size={14} style={{ color: 'var(--text-muted)' }} />
                          {user.phone}
                        </div>
                      ) : (
                        <span style={{ color: 'var(--text-muted)' }}>-</span>
                      )}
                    </td>
                    <td>
                      <span className={`badge ${
                        user.role?.name === 'Admin' ? 'badge-primary' :
                        user.role?.name === 'Customer' ? 'badge-warning' :
                        user.role?.name === 'Driver' ? 'badge-info' :
                        'badge-secondary'
                      }`}>
                        {user.role?.name === 'Admin' && <Shield size={12} style={{ marginRight: '0.25rem' }} />}
                        {user.role?.name === 'Customer' && <Building size={12} style={{ marginRight: '0.25rem' }} />}
                        {user.role?.name === 'Driver' && <Truck size={12} style={{ marginRight: '0.25rem' }} />}
                        {user.role?.name}
                      </span>
                    </td>
                    <td>
                      {user.customer ? (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                          <Link2 size={14} style={{ color: 'var(--primary)' }} />
                          <span style={{ fontSize: '0.875rem' }}>{user.customer.nameEn || user.customer.name}</span>
                        </div>
                      ) : (
                        <span style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>Internal</span>
                      )}
                    </td>
                    <td>
                      {user.isActive ? (
                        <span className="badge badge-success">
                          <UserCheck size={12} style={{ marginRight: '0.25rem' }} />
                          Active
                        </span>
                      ) : (
                        <span className="badge badge-danger">
                          <UserX size={12} style={{ marginRight: '0.25rem' }} />
                          Inactive
                        </span>
                      )}
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
                        <button
                          className="btn btn-sm btn-outline"
                          onClick={() => {
                            setSelectedUser(user);
                            setShowModal(true);
                          }}
                          title="Edit User"
                        >
                          <Edit2 size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div style={{ padding: '2rem' }}>
            <EmptyState 
              title="No users found"
              message="Add your first user to get started"
              icon="user"
            />
          </div>
        )}
      </div>

      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3 style={{ fontWeight: 600, margin: 0 }}>{selectedUser ? 'Edit User' : 'Add User'}</h3>
              <button onClick={() => { setShowModal(false); setSelectedUser(null); }} style={{ background: 'var(--bg-secondary)', border: 'none', borderRadius: 'var(--radius)', padding: '0.375rem', cursor: 'pointer', fontSize: '1.25rem', lineHeight: 1 }}>&times;</button>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="modal-body">
                <div className="grid grid-2">
                  <div className="form-group">
                    <label className="form-label">First Name *</label>
                    <input name="firstName" className="form-input" defaultValue={selectedUser?.firstName} required />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Last Name *</label>
                    <input name="lastName" className="form-input" defaultValue={selectedUser?.lastName} required />
                  </div>
                </div>
                <div className="form-group">
                  <label className="form-label">Email *</label>
                  <input name="email" type="email" className="form-input" defaultValue={selectedUser?.email} required />
                </div>
                <div className="form-group">
                  <label className="form-label">{selectedUser ? 'New Password (leave blank to keep)' : 'Password *'}</label>
                  <input name="password" type="password" className="form-input" required={!selectedUser} />
                </div>
                <div className="form-group">
                  <label className="form-label">Phone</label>
                  <input name="phone" className="form-input" defaultValue={selectedUser?.phone} />
                </div>
                <div className="form-group">
                  <label className="form-label">Role *</label>
                  <select 
                    name="roleId" 
                    className="form-select" 
                    value={selectedRoleId}
                    onChange={(e) => setSelectedRoleId(e.target.value)}
                    required
                  >
                    <option value="">Select Role</option>
                    {roles?.map((role: any) => (
                      <option key={role.id} value={role.id}>{role.name}</option>
                    ))}
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">
                    <span style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <Link2 size={14} />
                      Linked Customer {isCustomerRole && <span style={{ color: 'var(--danger)' }}>*</span>}
                    </span>
                  </label>
                  <select 
                    name="customerId" 
                    className="form-select" 
                    value={selectedCustomerId}
                    onChange={(e) => setSelectedCustomerId(e.target.value)}
                    required={isCustomerRole}
                    style={isCustomerRole && !selectedCustomerId ? { borderColor: 'var(--warning)' } : {}}
                  >
                    <option value="">None (Internal User)</option>
                    {customers?.map((customer: any) => (
                      <option key={customer.id} value={customer.id}>{customer.nameEn || customer.name} ({customer.code})</option>
                    ))}
                  </select>
                  {isCustomerRole && !selectedCustomerId && (
                    <div style={{ 
                      display: 'flex', 
                      alignItems: 'center', 
                      gap: '0.5rem',
                      marginTop: '0.5rem',
                      padding: '0.5rem 0.75rem',
                      backgroundColor: 'rgba(251, 191, 36, 0.1)',
                      borderRadius: 'var(--radius)',
                      fontSize: '0.75rem',
                      color: 'var(--warning)'
                    }}>
                      <AlertTriangle size={14} />
                      Customer role requires linking to a customer record
                    </div>
                  )}
                  {!isCustomerRole && !isDriverRole && selectedCustomerId && (
                    <div style={{ 
                      display: 'flex', 
                      alignItems: 'center', 
                      gap: '0.5rem',
                      marginTop: '0.5rem',
                      fontSize: '0.75rem',
                      color: 'var(--text-muted)'
                    }}>
                      Note: Only Customer role users can access the customer portal
                    </div>
                  )}
                </div>
                {selectedUser && (
                  <div className="form-group">
                    <label className="form-label">Status</label>
                    <select name="isActive" className="form-select" defaultValue={selectedUser?.isActive ? 'true' : 'false'}>
                      <option value="true">Active</option>
                      <option value="false">Inactive</option>
                    </select>
                  </div>
                )}
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => { setShowModal(false); setSelectedUser(null); }}>Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={saveMutation.isPending}>
                  {saveMutation.isPending ? 'Saving...' : 'Save User'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
