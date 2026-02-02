import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../lib/api';
import { format } from 'date-fns';
import { Plus, Edit2, AlertTriangle, CheckCircle, MapPin, Users, Building, ShieldCheck, Search } from 'lucide-react';
import { useToast } from '../components/ui/Toast';
import { parseApiError } from '../components/ui/FormErrors';
import { KpiCard, StatusBadge, FilterBar, EmptyState, type FilterWidget } from '../components/shared';

export default function Customers() {
  const [showModal, setShowModal] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<any>(null);
  const [selectedCountryId, setSelectedCountryId] = useState<string>('');
  const [selectedRegionId, setSelectedRegionId] = useState<string>('');
  const [selectedCityId, setSelectedCityId] = useState<string>('');
  const [filters, setFilters] = useState<Record<string, any>>({});
  const queryClient = useQueryClient();
  const toast = useToast();

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
      toast.success(selectedCustomer ? 'Customer Updated' : 'Customer Created', 
        selectedCustomer ? 'Customer details have been updated' : 'New customer has been added');
    },
    onError: (error: any) => {
      const apiError = parseApiError(error);
      toast.error('Error', apiError?.userMessage || 'Failed to save customer');
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

  const filterWidgets: FilterWidget[] = [
    { key: 'search', label: 'Search', type: 'search', placeholder: 'Search customers...' },
    { 
      key: 'category', 
      label: 'Category', 
      type: 'select', 
      options: [
        { value: '', label: 'All Categories' },
        ...(categories?.map((c: any) => ({ value: c.id, label: c.name })) || [])
      ]
    },
    { 
      key: 'licenseStatus', 
      label: 'License', 
      type: 'select', 
      options: [
        { value: '', label: 'All' },
        { value: 'valid', label: 'Valid' },
        { value: 'expired', label: 'Expired' },
      ]
    },
  ];

  const filteredCustomers = customers?.filter((customer: any) => {
    if (filters.category && customer.categoryId !== filters.category) return false;
    if (filters.licenseStatus === 'valid' && isLicenseExpired(customer.licenseExpiryDate)) return false;
    if (filters.licenseStatus === 'expired' && !isLicenseExpired(customer.licenseExpiryDate)) return false;
    if (filters.search) {
      const q = filters.search.toLowerCase();
      if (!customer.name?.toLowerCase().includes(q) &&
          !customer.code?.toLowerCase().includes(q) &&
          !customer.email?.toLowerCase().includes(q)) {
        return false;
      }
    }
    return true;
  });

  const stats = {
    total: customers?.length || 0,
    active: customers?.filter((c: any) => !isLicenseExpired(c.licenseExpiryDate)).length || 0,
    expired: customers?.filter((c: any) => isLicenseExpired(c.licenseExpiryDate)).length || 0,
    hospitals: customers?.filter((c: any) => c.category?.name?.toLowerCase().includes('hospital')).length || 0,
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
          <h2 style={{ fontSize: '1.25rem', fontWeight: 600, marginBottom: '0.25rem' }}>Customer Management</h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', margin: 0 }}>
            Manage healthcare facilities and their licensing information
          </p>
        </div>
        <button className="btn btn-primary" onClick={() => handleOpenModal()}>
          <Plus size={16} />
          Add Customer
        </button>
      </div>

      <div className="grid" style={{ gridTemplateColumns: 'repeat(4, 1fr)', gap: '1rem', marginBottom: '1.5rem' }}>
        <KpiCard 
          title="Total Customers" 
          value={stats.total} 
          icon={<Users size={20} />}
          color="primary"
        />
        <KpiCard 
          title="Licensed" 
          value={stats.active} 
          icon={<ShieldCheck size={20} />}
          color="success"
        />
        <KpiCard 
          title="License Expired" 
          value={stats.expired} 
          icon={<AlertTriangle size={20} />}
          color="danger"
        />
        <KpiCard 
          title="Hospitals" 
          value={stats.hospitals} 
          icon={<Building size={20} />}
          color="info"
        />
      </div>

      <div className="card" style={{ marginBottom: '1rem', padding: '1rem' }}>
        <FilterBar 
          widgets={filterWidgets}
          values={filters}
          onChange={(key, value) => setFilters(prev => ({ ...prev, [key]: value }))}
          onReset={() => setFilters({})}
        />
      </div>

      <div className="card">
        <div style={{ padding: '1rem 1.5rem', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <h3 style={{ fontWeight: 600, fontSize: '1rem', margin: 0 }}>
            Customer List ({filteredCustomers?.length || 0})
          </h3>
        </div>
        {filteredCustomers?.length > 0 ? (
          <table className="table" style={{ marginBottom: 0 }}>
            <thead>
              <tr>
                <th>Code</th>
                <th>Name</th>
                <th>Location</th>
                <th>Category</th>
                <th>Contact</th>
                <th>License Status</th>
                <th style={{ width: '80px', textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredCustomers.map((customer: any) => (
                <tr key={customer.id}>
                  <td style={{ fontWeight: 500, fontFamily: 'monospace', fontSize: '0.8125rem' }}>{customer.code}</td>
                  <td style={{ fontWeight: 500 }}>{customer.name}</td>
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
                    <div style={{ fontSize: '0.875rem' }}>{customer.email || '-'}</div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{customer.phone || '-'}</div>
                  </td>
                  <td>
                    {customer.licenseNumber ? (
                      <div>
                        {isLicenseExpired(customer.licenseExpiryDate) ? (
                          <StatusBadge status="EXPIRED" size="sm" />
                        ) : (
                          <StatusBadge status="VALID" size="sm" />
                        )}
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
                          {customer.licenseExpiryDate ? `Exp: ${format(new Date(customer.licenseExpiryDate), 'MMM dd, yyyy')}` : ''}
                        </div>
                      </div>
                    ) : (
                      <span style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>No license</span>
                    )}
                  </td>
                  <td>
                    <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
                      <button
                        className="btn btn-sm btn-outline"
                        onClick={() => handleOpenModal(customer)}
                        title="Edit Customer"
                      >
                        <Edit2 size={14} />
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
              title="No customers found"
              message="Add your first customer to get started"
              icon="package"
            />
          </div>
        )}
      </div>

      {showModal && (
        <div className="modal-overlay">
          <div className="modal" style={{ maxWidth: '700px' }}>
            <div className="modal-header">
              <h3>{selectedCustomer ? 'Edit Customer' : 'Add Customer'}</h3>
              <button className="btn btn-secondary btn-sm" onClick={handleCloseModal}>×</button>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="modal-body" style={{ maxHeight: '70vh', overflowY: 'auto' }}>
                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">Customer Code *</label>
                    <input type="text" name="code" className="form-input" defaultValue={selectedCustomer?.code} required />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Customer Name *</label>
                    <input type="text" name="name" className="form-input" defaultValue={selectedCustomer?.name} required />
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">Category</label>
                  <select name="categoryId" className="form-select" defaultValue={selectedCustomer?.categoryId || ''}>
                    <option value="">Select Category</option>
                    {categories?.map((category: any) => (
                      <option key={category.id} value={category.id}>{category.name}</option>
                    ))}
                  </select>
                </div>

                <div style={{ marginBottom: '1rem', padding: '1rem', backgroundColor: 'var(--bg-secondary)', borderRadius: 'var(--radius)' }}>
                  <h4 style={{ fontSize: '0.875rem', fontWeight: 600, marginBottom: '0.75rem' }}>Saudi National Address</h4>
                  <div className="form-row">
                    <div className="form-group">
                      <label className="form-label">Short Address (8 digits)</label>
                      <input type="text" name="shortAddress" className="form-input" defaultValue={selectedCustomer?.shortAddress} maxLength={8} placeholder="ABCD1234" />
                    </div>
                    <div className="form-group">
                      <label className="form-label">Building No.</label>
                      <input type="text" name="buildingNo" className="form-input" defaultValue={selectedCustomer?.buildingNo} />
                    </div>
                  </div>
                  <div className="form-row">
                    <div className="form-group">
                      <label className="form-label">Street</label>
                      <input type="text" name="street" className="form-input" defaultValue={selectedCustomer?.street} />
                    </div>
                    <div className="form-group">
                      <label className="form-label">Secondary No.</label>
                      <input type="text" name="secondaryNo" className="form-input" defaultValue={selectedCustomer?.secondaryNo} />
                    </div>
                  </div>
                  <div className="form-row">
                    <div className="form-group">
                      <label className="form-label">District</label>
                      <input type="text" name="district" className="form-input" defaultValue={selectedCustomer?.district} />
                    </div>
                    <div className="form-group">
                      <label className="form-label">Postal Code</label>
                      <input type="text" name="postalCode" className="form-input" defaultValue={selectedCustomer?.postalCode} />
                    </div>
                  </div>
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">Country</label>
                    <select 
                      className="form-select" 
                      value={selectedCountryId}
                      onChange={(e) => handleCountryChange(e.target.value)}
                    >
                      <option value="">Select Country</option>
                      {countries?.map((country: any) => (
                        <option key={country.id} value={country.id}>{country.name}</option>
                      ))}
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Region</label>
                    <select 
                      className="form-select"
                      value={selectedRegionId}
                      onChange={(e) => handleRegionChange(e.target.value)}
                      disabled={!selectedCountryId}
                    >
                      <option value="">Select Region</option>
                      {regions?.map((region: any) => (
                        <option key={region.id} value={region.id}>{region.name}</option>
                      ))}
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="form-label">City</label>
                    <select 
                      className="form-select"
                      value={selectedCityId}
                      onChange={(e) => setSelectedCityId(e.target.value)}
                      disabled={!selectedRegionId}
                    >
                      <option value="">Select City</option>
                      {cities?.map((city: any) => (
                        <option key={city.id} value={city.id}>{city.name}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">Full Address</label>
                  <textarea name="address" className="form-textarea" rows={2} defaultValue={selectedCustomer?.address} />
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">Email</label>
                    <input type="email" name="email" className="form-input" defaultValue={selectedCustomer?.email} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Phone</label>
                    <input type="tel" name="phone" className="form-input" defaultValue={selectedCustomer?.phone} />
                  </div>
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">License Number</label>
                    <input type="text" name="licenseNumber" className="form-input" defaultValue={selectedCustomer?.licenseNumber} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">License Expiry Date</label>
                    <input type="date" name="licenseExpiryDate" className="form-input" defaultValue={selectedCustomer?.licenseExpiryDate?.split('T')[0]} />
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">Travel Time (minutes)</label>
                  <input type="number" name="travelTimeMinutes" className="form-input" defaultValue={selectedCustomer?.travelTimeMinutes || 60} min={0} />
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={handleCloseModal}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary" disabled={createMutation.isPending}>
                  {createMutation.isPending ? 'Saving...' : selectedCustomer ? 'Update Customer' : 'Add Customer'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
