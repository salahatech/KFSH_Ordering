import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../lib/api';
import { format } from 'date-fns';
import { Plus, Edit2, AlertTriangle, CheckCircle, MapPin } from 'lucide-react';

export default function Customers() {
  const [showModal, setShowModal] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<any>(null);
  const [selectedCountryId, setSelectedCountryId] = useState<string>('');
  const [selectedRegionId, setSelectedRegionId] = useState<string>('');
  const [selectedCityId, setSelectedCityId] = useState<string>('');
  const queryClient = useQueryClient();

  const { data: customers, isLoading } = useQuery({
    queryKey: ['customers'],
    queryFn: async () => {
      const { data } = await api.get('/customers');
      return data;
    },
  });

  const { data: countries } = useQuery({
    queryKey: ['settings', 'countries'],
    queryFn: async () => {
      const { data } = await api.get('/settings/countries');
      return data;
    },
  });

  const { data: regions } = useQuery({
    queryKey: ['settings', 'regions', selectedCountryId],
    queryFn: async () => {
      const params = selectedCountryId ? { countryId: selectedCountryId } : {};
      const { data } = await api.get('/settings/regions', { params });
      return data;
    },
  });

  const { data: cities } = useQuery({
    queryKey: ['settings', 'cities', selectedRegionId],
    queryFn: async () => {
      const params = selectedRegionId ? { regionId: selectedRegionId } : {};
      const { data } = await api.get('/settings/cities', { params });
      return data;
    },
    enabled: !!selectedRegionId,
  });

  const { data: categories } = useQuery({
    queryKey: ['settings', 'categories'],
    queryFn: async () => {
      const { data } = await api.get('/settings/categories');
      return data;
    },
  });

  useEffect(() => {
    if (selectedCustomer?.countryId) {
      setSelectedCountryId(selectedCustomer.countryId);
      setSelectedRegionId(selectedCustomer.regionId || '');
      setSelectedCityId(selectedCustomer.cityId || '');
    } else {
      const saudiArabia = countries?.find((c: any) => c.code === 'SA');
      if (saudiArabia) {
        setSelectedCountryId(saudiArabia.id);
      }
      setSelectedRegionId('');
      setSelectedCityId('');
    }
  }, [selectedCustomer, countries]);

  const handleCountryChange = (countryId: string) => {
    setSelectedCountryId(countryId);
    setSelectedRegionId('');
    setSelectedCityId('');
  };

  const handleRegionChange = (regionId: string) => {
    setSelectedRegionId(regionId);
    setSelectedCityId('');
  };

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
      setSelectedCountryId('');
      setSelectedRegionId('');
      setSelectedCityId('');
    },
  });

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    createMutation.mutate({
      name: formData.get('name'),
      code: formData.get('code'),
      shortAddress: formData.get('shortAddress'),
      buildingNo: formData.get('buildingNo'),
      street: formData.get('street'),
      secondaryNo: formData.get('secondaryNo'),
      district: formData.get('district'),
      postalCode: formData.get('postalCode'),
      countryId: selectedCountryId || null,
      regionId: selectedRegionId || null,
      cityId: selectedCityId || null,
      categoryId: formData.get('categoryId') || null,
      address: formData.get('address'),
      phone: formData.get('phone'),
      email: formData.get('email'),
      licenseNumber: formData.get('licenseNumber'),
      licenseExpiryDate: formData.get('licenseExpiryDate'),
      travelTimeMinutes: parseInt(formData.get('travelTimeMinutes') as string) || 60,
    });
  };

  const isLicenseExpired = (date: string | null) => {
    if (!date) return false;
    return new Date(date) < new Date();
  };

  const handleOpenModal = (customer?: any) => {
    if (customer) {
      setSelectedCustomer(customer);
      setSelectedCountryId(customer.countryId || '');
      setSelectedRegionId(customer.regionId || '');
      setSelectedCityId(customer.cityId || '');
    } else {
      setSelectedCustomer(null);
      const saudiArabia = countries?.find((c: any) => c.code === 'SA');
      setSelectedCountryId(saudiArabia?.id || '');
      setSelectedRegionId('');
      setSelectedCityId('');
    }
    setShowModal(true);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setSelectedCustomer(null);
    setSelectedCountryId('');
    setSelectedRegionId('');
    setSelectedCityId('');
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
        <button className="btn btn-primary" onClick={() => handleOpenModal()}>
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
              <th>Location</th>
              <th>Category</th>
              <th>Contact</th>
              <th>License Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {customers?.map((customer: any) => (
              <tr key={customer.id}>
                <td style={{ fontWeight: 500 }}>{customer.code}</td>
                <td>{customer.name}</td>
                <td>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                    <MapPin size={14} style={{ color: 'var(--text-muted)' }} />
                    <span>{customer.city?.name || customer.district || '-'}</span>
                  </div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                    {customer.region?.name || ''}{customer.region && customer.country ? ', ' : ''}{customer.country?.name || ''}
                  </div>
                </td>
                <td>
                  {customer.category ? (
                    <span className="badge badge-default">{customer.category.name}</span>
                  ) : '-'}
                </td>
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
                <td>
                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <button
                      className="btn btn-secondary btn-sm"
                      onClick={() => handleOpenModal(customer)}
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
        <div className="modal-overlay" onClick={handleCloseModal}>
          <div className="modal" style={{ maxWidth: '48rem', maxHeight: '90vh', overflow: 'auto' }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3 style={{ fontWeight: 600 }}>{selectedCustomer ? 'Edit Customer' : 'Add Customer'}</h3>
              <button onClick={handleCloseModal} style={{ background: 'none', border: 'none', fontSize: '1.5rem', cursor: 'pointer' }}>&times;</button>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="modal-body">
                <h4 style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '1rem' }}>
                  Basic Information
                </h4>
                <div className="grid grid-2" style={{ gap: '1rem', marginBottom: '1.5rem' }}>
                  <div className="form-group">
                    <label className="form-label">Customer Code *</label>
                    <input name="code" className="form-input" defaultValue={selectedCustomer?.code} required disabled={!!selectedCustomer} placeholder="e.g., HOSP001" />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Customer Name *</label>
                    <input name="name" className="form-input" defaultValue={selectedCustomer?.name} required placeholder="e.g., King Fahad Medical City" />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Category</label>
                    <select name="categoryId" className="form-select" defaultValue={selectedCustomer?.categoryId || ''}>
                      <option value="">Select Category</option>
                      {categories?.filter((c: any) => c.isActive).map((cat: any) => (
                        <option key={cat.id} value={cat.id}>{cat.name}</option>
                      ))}
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Travel Time (minutes)</label>
                    <input name="travelTimeMinutes" type="number" className="form-input" defaultValue={selectedCustomer?.travelTimeMinutes || 60} />
                  </div>
                </div>

                <h4 style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <MapPin size={16} />
                  Saudi National Address
                </h4>
                <div className="grid grid-2" style={{ gap: '1rem', marginBottom: '1.5rem' }}>
                  <div className="form-group">
                    <label className="form-label">Short Address</label>
                    <input name="shortAddress" className="form-input" defaultValue={selectedCustomer?.shortAddress} placeholder="e.g., JERA4240" style={{ fontFamily: 'monospace', letterSpacing: '0.1em' }} />
                    <small style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>8-character Saudi National Address code</small>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Building No. *</label>
                    <input name="buildingNo" className="form-input" defaultValue={selectedCustomer?.buildingNo} placeholder="e.g., 4240" />
                  </div>
                  <div className="form-group" style={{ gridColumn: 'span 2' }}>
                    <label className="form-label">Street *</label>
                    <input name="street" className="form-input" defaultValue={selectedCustomer?.street} placeholder="e.g., Muhammad Ali Maghrebi" />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Secondary No.</label>
                    <input name="secondaryNo" className="form-input" defaultValue={selectedCustomer?.secondaryNo} placeholder="e.g., 9014" />
                  </div>
                  <div className="form-group">
                    <label className="form-label">District *</label>
                    <input name="district" className="form-input" defaultValue={selectedCustomer?.district} placeholder="e.g., Ar Rawdah Dist." />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Postal Code *</label>
                    <input name="postalCode" className="form-input" defaultValue={selectedCustomer?.postalCode} required placeholder="e.g., 23434" />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Country *</label>
                    <select 
                      className="form-select" 
                      value={selectedCountryId}
                      onChange={(e) => handleCountryChange(e.target.value)}
                    >
                      <option value="">Select Country</option>
                      {countries?.filter((c: any) => c.isActive).map((country: any) => (
                        <option key={country.id} value={country.id}>{country.name}</option>
                      ))}
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Region *</label>
                    <select 
                      className="form-select" 
                      value={selectedRegionId}
                      onChange={(e) => handleRegionChange(e.target.value)}
                      required
                    >
                      <option value="">Select Region</option>
                      {regions?.filter((r: any) => r.isActive).map((region: any) => (
                        <option key={region.id} value={region.id}>{region.name}</option>
                      ))}
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="form-label">City *</label>
                    <select 
                      className="form-select" 
                      value={selectedCityId}
                      onChange={(e) => setSelectedCityId(e.target.value)}
                    >
                      <option value="">Select City</option>
                      {cities?.filter((c: any) => c.isActive).map((city: any) => (
                        <option key={city.id} value={city.id}>{city.name}</option>
                      ))}
                    </select>
                  </div>
                  <div className="form-group" style={{ gridColumn: 'span 2' }}>
                    <label className="form-label">Full Address (Optional)</label>
                    <input name="address" className="form-input" defaultValue={selectedCustomer?.address} placeholder="Additional address details if needed" />
                  </div>
                </div>

                <h4 style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '1rem' }}>
                  Contact Information
                </h4>
                <div className="grid grid-2" style={{ gap: '1rem', marginBottom: '1.5rem' }}>
                  <div className="form-group">
                    <label className="form-label">Phone *</label>
                    <input name="phone" className="form-input" defaultValue={selectedCustomer?.phone} required placeholder="+966 XX XXX XXXX" />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Email *</label>
                    <input name="email" type="email" className="form-input" defaultValue={selectedCustomer?.email} required placeholder="contact@hospital.com" />
                  </div>
                </div>

                <h4 style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '1rem' }}>
                  License Information
                </h4>
                <div className="grid grid-2" style={{ gap: '1rem' }}>
                  <div className="form-group">
                    <label className="form-label">License Number</label>
                    <input name="licenseNumber" className="form-input" defaultValue={selectedCustomer?.licenseNumber} placeholder="Radioactive Materials License No." />
                  </div>
                  <div className="form-group">
                    <label className="form-label">License Expiry Date</label>
                    <input name="licenseExpiryDate" type="date" className="form-input" defaultValue={selectedCustomer?.licenseExpiryDate?.split('T')[0]} />
                  </div>
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={handleCloseModal}>Cancel</button>
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
