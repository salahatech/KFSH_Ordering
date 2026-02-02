import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import api from '../lib/api';
import { format } from 'date-fns';
import { Plus, Edit2, AlertTriangle, MapPin, Users, Building, ShieldCheck, FileText, Phone, Mail } from 'lucide-react';
import { KpiCard, StatusBadge, FilterBar, EmptyState, type FilterWidget } from '../components/shared';

export default function Customers() {
  const navigate = useNavigate();
  const [filters, setFilters] = useState<Record<string, any>>({});
  const [selectedKpi, setSelectedKpi] = useState<string | null>(null);

  const { data: customers, isLoading } = useQuery({
    queryKey: ['customers'],
    queryFn: async () => {
      const { data } = await api.get('/customers');
      return data;
    },
  });

  const { data: categories } = useQuery({
    queryKey: ['settings', 'categories'],
    queryFn: async () => {
      const { data } = await api.get('/settings/categories');
      return data;
    },
  });

  const isLicenseExpired = (date: string | null) => {
    if (!date) return false;
    return new Date(date) < new Date();
  };

  const hasMissingDocs = (customer: any) => {
    return !customer.documents || customer.documents.length === 0;
  };

  const filterWidgets: FilterWidget[] = [
    { key: 'search', label: 'Search', type: 'search', placeholder: 'Search name, code, mobile, email, CR, tax...' },
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
    { 
      key: 'docsStatus', 
      label: 'Documents', 
      type: 'select', 
      options: [
        { value: '', label: 'All' },
        { value: 'missing', label: 'Missing Docs' },
        { value: 'uploaded', label: 'Has Docs' },
      ]
    },
  ];

  const filteredCustomers = customers?.filter((customer: any) => {
    if (filters.category && customer.categoryId !== filters.category) return false;
    if (filters.licenseStatus === 'valid' && isLicenseExpired(customer.licenseExpiryDate)) return false;
    if (filters.licenseStatus === 'expired' && !isLicenseExpired(customer.licenseExpiryDate)) return false;
    if (filters.docsStatus === 'missing' && !hasMissingDocs(customer)) return false;
    if (filters.docsStatus === 'uploaded' && hasMissingDocs(customer)) return false;
    
    if (selectedKpi === 'expired' && !isLicenseExpired(customer.licenseExpiryDate)) return false;
    if (selectedKpi === 'licensed' && isLicenseExpired(customer.licenseExpiryDate)) return false;
    if (selectedKpi === 'hospitals' && !customer.category?.name?.toLowerCase().includes('hospital')) return false;
    if (selectedKpi === 'missingDocs' && !hasMissingDocs(customer)) return false;

    if (filters.search) {
      const q = filters.search.toLowerCase();
      const searchFields = [
        customer.name,
        customer.nameEn,
        customer.nameAr,
        customer.code,
        customer.email,
        customer.mobile,
        customer.phone,
        customer.crNumber,
        customer.taxNumber,
      ];
      if (!searchFields.some(field => field?.toLowerCase().includes(q))) {
        return false;
      }
    }
    return true;
  });

  const stats = {
    total: customers?.length || 0,
    licensed: customers?.filter((c: any) => !isLicenseExpired(c.licenseExpiryDate)).length || 0,
    expired: customers?.filter((c: any) => isLicenseExpired(c.licenseExpiryDate)).length || 0,
    hospitals: customers?.filter((c: any) => c.category?.name?.toLowerCase().includes('hospital')).length || 0,
    missingDocs: customers?.filter((c: any) => hasMissingDocs(c)).length || 0,
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
          <h2 style={{ fontSize: '1.25rem', fontWeight: 600, marginBottom: '0.25rem' }}>Customer Management</h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', margin: 0 }}>
            Manage healthcare facilities and their licensing information
          </p>
        </div>
        <button className="btn btn-primary" onClick={() => navigate('/customers/new')}>
          <Plus size={16} />
          Add Customer
        </button>
      </div>

      <div className="grid" style={{ gridTemplateColumns: 'repeat(5, 1fr)', gap: '1rem', marginBottom: '1.5rem' }}>
        <KpiCard 
          title="Total Customers" 
          value={stats.total} 
          icon={<Users size={20} />}
          color="primary"
          onClick={() => setSelectedKpi(null)}
          selected={selectedKpi === null}
        />
        <KpiCard 
          title="Licensed" 
          value={stats.licensed} 
          icon={<ShieldCheck size={20} />}
          color="success"
          onClick={() => handleKpiClick('licensed')}
          selected={selectedKpi === 'licensed'}
        />
        <KpiCard 
          title="License Expired" 
          value={stats.expired} 
          icon={<AlertTriangle size={20} />}
          color="danger"
          onClick={() => handleKpiClick('expired')}
          selected={selectedKpi === 'expired'}
        />
        <KpiCard 
          title="Hospitals" 
          value={stats.hospitals} 
          icon={<Building size={20} />}
          color="info"
          onClick={() => handleKpiClick('hospitals')}
          selected={selectedKpi === 'hospitals'}
        />
        <KpiCard 
          title="Missing Docs" 
          value={stats.missingDocs} 
          icon={<FileText size={20} />}
          color="warning"
          onClick={() => handleKpiClick('missingDocs')}
          selected={selectedKpi === 'missingDocs'}
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
            Customer List ({filteredCustomers?.length || 0})
          </h3>
        </div>
        {filteredCustomers?.length > 0 ? (
          <div style={{ overflowX: 'auto' }}>
            <table className="table" style={{ marginBottom: 0, minWidth: '1000px' }}>
              <thead>
                <tr>
                  <th>Code</th>
                  <th>Name (EN / AR)</th>
                  <th>City</th>
                  <th>Contact</th>
                  <th>CR Number</th>
                  <th>Tax Number</th>
                  <th>Docs</th>
                  <th>License Status</th>
                  <th style={{ width: '80px', textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredCustomers.map((customer: any) => (
                  <tr key={customer.id}>
                    <td style={{ fontWeight: 500, fontFamily: 'monospace', fontSize: '0.8125rem' }}>{customer.code}</td>
                    <td>
                      <div style={{ fontWeight: 500 }}>{customer.nameEn || customer.name}</div>
                      {customer.nameAr && (
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', direction: 'rtl' }}>
                          {customer.nameAr}
                        </div>
                      )}
                    </td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                        <MapPin size={14} style={{ color: 'var(--text-muted)' }} />
                        <span>{customer.city?.name || customer.district || '-'}</span>
                      </div>
                    </td>
                    <td>
                      <div style={{ fontSize: '0.8125rem' }}>
                        {customer.mobile && (
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                            <Phone size={12} style={{ color: 'var(--text-muted)' }} />
                            <span>{customer.mobile}</span>
                          </div>
                        )}
                        {customer.email && (
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', color: 'var(--text-muted)', fontSize: '0.75rem' }}>
                            <Mail size={12} />
                            <span>{customer.email}</span>
                          </div>
                        )}
                        {!customer.mobile && !customer.email && '-'}
                      </div>
                    </td>
                    <td style={{ fontFamily: 'monospace', fontSize: '0.75rem' }}>
                      {customer.crNumber || '-'}
                    </td>
                    <td style={{ fontFamily: 'monospace', fontSize: '0.75rem' }}>
                      {customer.taxNumber || '-'}
                    </td>
                    <td>
                      {customer.documents?.length > 0 ? (
                        <span className="badge badge-success" style={{ fontSize: '0.6875rem' }}>
                          {customer.documents.length} docs
                        </span>
                      ) : (
                        <span className="badge badge-warning" style={{ fontSize: '0.6875rem' }}>
                          None
                        </span>
                      )}
                    </td>
                    <td>
                      {customer.licenseNumber ? (
                        <div>
                          {isLicenseExpired(customer.licenseExpiryDate) ? (
                            <StatusBadge status="EXPIRED" size="sm" />
                          ) : (
                            <StatusBadge status="VALID" size="sm" />
                          )}
                          <div style={{ fontSize: '0.6875rem', color: 'var(--text-muted)', marginTop: '0.125rem' }}>
                            {customer.licenseExpiryDate ? `Exp: ${format(new Date(customer.licenseExpiryDate), 'MMM dd, yyyy')}` : ''}
                          </div>
                        </div>
                      ) : (
                        <span style={{ color: 'var(--text-muted)', fontSize: '0.8125rem' }}>-</span>
                      )}
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
                        <button
                          className="btn btn-sm btn-outline"
                          onClick={() => navigate(`/customers/${customer.id}/edit`)}
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
          </div>
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
    </div>
  );
}
