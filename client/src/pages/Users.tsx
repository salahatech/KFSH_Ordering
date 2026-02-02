import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../lib/api';
import { Plus, Edit2, UserCheck, UserX } from 'lucide-react';

export default function Users() {
  const [showModal, setShowModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState<any>(null);
  const queryClient = useQueryClient();

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
    },
  });

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    saveMutation.mutate({
      email: formData.get('email'),
      password: formData.get('password') || undefined,
      firstName: formData.get('firstName'),
      lastName: formData.get('lastName'),
      phone: formData.get('phone'),
      roleId: formData.get('roleId'),
      customerId: formData.get('customerId') || null,
      isActive: formData.get('isActive') === 'true',
    });
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
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
        <h2 style={{ fontSize: '1.25rem', fontWeight: 600 }}>User Management</h2>
        <button className="btn btn-primary" onClick={() => setShowModal(true)}>
          <Plus size={18} />
          Add User
        </button>
      </div>

      <div className="card">
        <table className="table">
          <thead>
            <tr>
              <th>Name</th>
              <th>Email</th>
              <th>Role</th>
              <th>Customer</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {users?.map((user: any) => (
              <tr key={user.id}>
                <td>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <div
                      style={{
                        width: '2.5rem',
                        height: '2.5rem',
                        borderRadius: '50%',
                        background: 'var(--primary)',
                        color: 'white',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontWeight: 600,
                      }}
                    >
                      {user.firstName?.[0]}{user.lastName?.[0]}
                    </div>
                    <div>
                      <div style={{ fontWeight: 500 }}>{user.firstName} {user.lastName}</div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{user.phone}</div>
                    </div>
                  </div>
                </td>
                <td>{user.email}</td>
                <td>
                  <span className="badge badge-info">{user.role?.name}</span>
                </td>
                <td>{user.customer?.name || '-'}</td>
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
                  <button
                    className="btn btn-secondary btn-sm"
                    onClick={() => {
                      setSelectedUser(user);
                      setShowModal(true);
                    }}
                  >
                    <Edit2 size={14} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {users?.length === 0 && <div className="empty-state">No users found</div>}
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
                  <select name="roleId" className="form-select" defaultValue={selectedUser?.roleId} required>
                    <option value="">Select Role</option>
                    {roles?.map((role: any) => (
                      <option key={role.id} value={role.id}>{role.name}</option>
                    ))}
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Customer (for customer portal users)</label>
                  <select name="customerId" className="form-select" defaultValue={selectedUser?.customerId || ''}>
                    <option value="">None</option>
                    {customers?.map((customer: any) => (
                      <option key={customer.id} value={customer.id}>{customer.name}</option>
                    ))}
                  </select>
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
