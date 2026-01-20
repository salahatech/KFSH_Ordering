import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../lib/api';
import { format } from 'date-fns';
import { Plus, Edit2, Eye, AlertTriangle, CheckCircle } from 'lucide-react';

export default function Customers() {
  const [showModal, setShowModal] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<any>(null);
  const queryClient = useQueryClient();

  const { data: customers, isLoading } = useQuery({
    queryKey: ['customers'],
    queryFn: async () => {
      const { data } = await api.get('/customers');
      return data;
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: any) => {
      if (selectedCustomer) {
        return api.put(`/customers/${selectedCustomer.id}`, data);
      }
      return api.post('/customers', data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customers'] });
      setShowModal(false);
      setSelectedCustomer(null);
    },
  });

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    createMutation.mutate({
      name: formData.get('name'),
      code: formData.get('code'),
      address: formData.get('address'),
      city: formData.get('city'),
      state: formData.get('state'),
      postalCode: formData.get('postalCode'),
      country: formData.get('country'),
      phone: formData.get('phone'),
      email: formData.get('email'),
      licenseNumber: formData.get('licenseNumber'),
      licenseExpiryDate: formData.get('licenseExpiryDate'),
      travelTimeMinutes: parseInt(formData.get('travelTimeMinutes') as string) || 60,
      region: formData.get('region'),
      category: formData.get('category'),
    });
  };

  const isLicenseExpired = (date: string | null) => {
    if (!date) return false;
    return new Date(date) < new Date();
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
        <h2 style={{ fontSize: '1.25rem', fontWeight: 600 }}>Customer Management</h2>
        <button className="btn btn-primary" onClick={() => setShowModal(true)}>
          <Plus size={18} />
          Add Customer
        </button>
      </div>

      <div className="card">
        <table className="table">
          <thead>
            <tr>
              <th>Code</th>
              <th>Name</th>
              <th>City</th>
              <th>Contact</th>
              <th>License Status</th>
              <th>Travel Time</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {customers?.map((customer: any) => (
              <tr key={customer.id}>
                <td style={{ fontWeight: 500 }}>{customer.code}</td>
                <td>{customer.name}</td>
                <td>{customer.city}, {customer.state}</td>
                <td>
                  <div style={{ fontSize: '0.875rem' }}>{customer.email}</div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{customer.phone}</div>
                </td>
                <td>
                  {customer.licenseExpiryDate ? (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                      {isLicenseExpired(customer.licenseExpiryDate) ? (
                        <>
                          <AlertTriangle size={16} color="var(--danger)" />
                          <span className="badge badge-danger">Expired</span>
                        </>
                      ) : (
                        <>
                          <CheckCircle size={16} color="var(--success)" />
                          <span className="badge badge-success">
                            Valid until {format(new Date(customer.licenseExpiryDate), 'MMM dd, yyyy')}
                          </span>
                        </>
                      )}
                    </div>
                  ) : (
                    <span className="badge badge-default">No license</span>
                  )}
                </td>
                <td>{customer.travelTimeMinutes} min</td>
                <td>
                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <button
                      className="btn btn-secondary btn-sm"
                      onClick={() => {
                        setSelectedCustomer(customer);
                        setShowModal(true);
                      }}
                    >
                      <Edit2 size={14} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {customers?.length === 0 && <div className="empty-state">No customers found</div>}
      </div>

      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal" style={{ maxWidth: '40rem' }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3 style={{ fontWeight: 600 }}>{selectedCustomer ? 'Edit Customer' : 'Add Customer'}</h3>
              <button onClick={() => { setShowModal(false); setSelectedCustomer(null); }} style={{ background: 'none', border: 'none', fontSize: '1.5rem' }}>&times;</button>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="modal-body">
                <div className="grid grid-2">
                  <div className="form-group">
                    <label className="form-label">Code</label>
                    <input name="code" className="form-input" defaultValue={selectedCustomer?.code} required disabled={!!selectedCustomer} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Name</label>
                    <input name="name" className="form-input" defaultValue={selectedCustomer?.name} required />
                  </div>
                  <div className="form-group" style={{ gridColumn: 'span 2' }}>
                    <label className="form-label">Address</label>
                    <input name="address" className="form-input" defaultValue={selectedCustomer?.address} required />
                  </div>
                  <div className="form-group">
                    <label className="form-label">City</label>
                    <input name="city" className="form-input" defaultValue={selectedCustomer?.city} required />
                  </div>
                  <div className="form-group">
                    <label className="form-label">State</label>
                    <input name="state" className="form-input" defaultValue={selectedCustomer?.state} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Postal Code</label>
                    <input name="postalCode" className="form-input" defaultValue={selectedCustomer?.postalCode} required />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Country</label>
                    <input name="country" className="form-input" defaultValue={selectedCustomer?.country || 'USA'} required />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Phone</label>
                    <input name="phone" className="form-input" defaultValue={selectedCustomer?.phone} required />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Email</label>
                    <input name="email" type="email" className="form-input" defaultValue={selectedCustomer?.email} required />
                  </div>
                  <div className="form-group">
                    <label className="form-label">License Number</label>
                    <input name="licenseNumber" className="form-input" defaultValue={selectedCustomer?.licenseNumber} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">License Expiry Date</label>
                    <input name="licenseExpiryDate" type="date" className="form-input" defaultValue={selectedCustomer?.licenseExpiryDate?.split('T')[0]} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Travel Time (minutes)</label>
                    <input name="travelTimeMinutes" type="number" className="form-input" defaultValue={selectedCustomer?.travelTimeMinutes || 60} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Region</label>
                    <input name="region" className="form-input" defaultValue={selectedCustomer?.region} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Category</label>
                    <select name="category" className="form-select" defaultValue={selectedCustomer?.category || 'Hospital'}>
                      <option value="Hospital">Hospital</option>
                      <option value="Academic">Academic</option>
                      <option value="Clinic">Clinic</option>
                      <option value="Specialty">Specialty</option>
                    </select>
                  </div>
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => { setShowModal(false); setSelectedCustomer(null); }}>Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={createMutation.isPending}>
                  {createMutation.isPending ? 'Saving...' : 'Save Customer'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
