import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';
import api from '../../lib/api';
import { useToast } from '../../components/ui/Toast';
import { PageHeader } from '../../components/shared';
import { Plus, Edit2, Trash2, X, DollarSign, TrendingUp, Calendar, RefreshCw, Cloud } from 'lucide-react';

interface ExchangeRate {
  id: string;
  date: string;
  fromCurrency: string;
  toCurrency: string;
  rate: number;
  source: string;
  isActive: boolean;
  createdAt: string;
}

const COMMON_CURRENCIES = [
  { code: 'USD', name: 'US Dollar' },
  { code: 'EUR', name: 'Euro' },
  { code: 'GBP', name: 'British Pound' },
  { code: 'AED', name: 'UAE Dirham' },
  { code: 'KWD', name: 'Kuwaiti Dinar' },
  { code: 'BHD', name: 'Bahraini Dinar' },
  { code: 'QAR', name: 'Qatari Riyal' },
  { code: 'OMR', name: 'Omani Rial' },
  { code: 'EGP', name: 'Egyptian Pound' },
  { code: 'JOD', name: 'Jordanian Dinar' },
];

interface RateProvider {
  id: string;
  name: string;
  requiresKey: boolean;
  description: string;
}

export default function ExchangeRates() {
  const toast = useToast();
  const queryClient = useQueryClient();
  const [showModal, setShowModal] = useState(false);
  const [showFetchModal, setShowFetchModal] = useState(false);
  const [editingRate, setEditingRate] = useState<ExchangeRate | null>(null);
  const [filterCurrency, setFilterCurrency] = useState('');
  const [page, setPage] = useState(1);
  const [selectedProvider, setSelectedProvider] = useState('exchangerate-api');
  const [apiKey, setApiKey] = useState('');
  const [formData, setFormData] = useState({
    date: format(new Date(), 'yyyy-MM-dd'),
    fromCurrency: 'USD',
    rate: 3.75,
    source: 'MANUAL',
  });

  const { data, isLoading } = useQuery({
    queryKey: ['exchange-rates', filterCurrency, page],
    queryFn: async () => {
      const params: any = { page, pageSize: 25 };
      if (filterCurrency) params.fromCurrency = filterCurrency;
      const { data } = await api.get('/localization/exchange-rates', { params });
      return data;
    },
  });

  const { data: latestRates = [] } = useQuery<ExchangeRate[]>({
    queryKey: ['latest-exchange-rates'],
    queryFn: async () => {
      const { data } = await api.get('/localization/exchange-rates/latest');
      return data;
    },
  });

  const { data: providers = [] } = useQuery<RateProvider[]>({
    queryKey: ['rate-providers'],
    queryFn: async () => {
      const { data } = await api.get('/localization/exchange-rates/providers');
      return data;
    },
  });

  const fetchRatesMutation = useMutation({
    mutationFn: async (data: { provider: string; apiKey?: string }) => {
      const { data: result } = await api.post('/localization/exchange-rates/fetch-online', data);
      return result;
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['exchange-rates'] });
      queryClient.invalidateQueries({ queryKey: ['latest-exchange-rates'] });
      toast.success('Rates Updated', result.message);
      setShowFetchModal(false);
      setApiKey('');
    },
    onError: (error: any) => {
      toast.error('Error', error.response?.data?.error || 'Failed to fetch rates');
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      const { data: result } = await api.post('/localization/exchange-rates', data);
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['exchange-rates'] });
      queryClient.invalidateQueries({ queryKey: ['latest-exchange-rates'] });
      toast.success('Rate Saved', 'Exchange rate has been saved');
      closeModal();
    },
    onError: (error: any) => {
      toast.error('Error', error.response?.data?.error || 'Failed to save rate');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/localization/exchange-rates/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['exchange-rates'] });
      queryClient.invalidateQueries({ queryKey: ['latest-exchange-rates'] });
      toast.success('Rate Deleted', 'Exchange rate has been removed');
    },
    onError: (error: any) => {
      toast.error('Error', error.response?.data?.error || 'Failed to delete rate');
    },
  });

  const openModal = (rate?: ExchangeRate) => {
    if (rate) {
      setEditingRate(rate);
      setFormData({
        date: rate.date.split('T')[0],
        fromCurrency: rate.fromCurrency,
        rate: rate.rate,
        source: rate.source,
      });
    } else {
      setEditingRate(null);
      setFormData({
        date: format(new Date(), 'yyyy-MM-dd'),
        fromCurrency: 'USD',
        rate: 3.75,
        source: 'MANUAL',
      });
    }
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setEditingRate(null);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    createMutation.mutate(formData);
  };

  const handleDelete = (rate: ExchangeRate) => {
    if (confirm(`Delete rate for ${rate.fromCurrency} on ${format(new Date(rate.date), 'MMM dd, yyyy')}?`)) {
      deleteMutation.mutate(rate.id);
    }
  };

  const rates = data?.data || [];
  const total = data?.total || 0;
  const totalPages = data?.totalPages || 1;

  return (
    <div>
      <PageHeader
        title="Exchange Rates"
        subtitle="Manage currency exchange rates to SAR (base currency)"
        actions={
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <button className="btn btn-secondary" onClick={() => setShowFetchModal(true)}>
              <Cloud size={16} />
              Fetch from Provider
            </button>
            <button className="btn btn-primary" onClick={() => openModal()}>
              <Plus size={16} />
              Add Rate
            </button>
          </div>
        }
      />

      {latestRates.length > 0 && (
        <div className="grid grid-4" style={{ marginBottom: '1.5rem' }}>
          {latestRates.slice(0, 4).map((rate) => (
            <div key={rate.id} className="card stat-card">
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                <DollarSign size={20} style={{ color: 'var(--primary)' }} />
                <span className="stat-label">{rate.fromCurrency}/SAR</span>
              </div>
              <div className="stat-value">{rate.rate.toFixed(4)}</div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                {format(new Date(rate.date), 'MMM dd, yyyy')}
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="card">
        <div style={{ padding: '1rem', borderBottom: '1px solid var(--border)', display: 'flex', gap: '1rem', alignItems: 'center' }}>
          <select
            className="form-select"
            value={filterCurrency}
            onChange={(e) => { setFilterCurrency(e.target.value); setPage(1); }}
            style={{ width: 'auto' }}
          >
            <option value="">All Currencies</option>
            {COMMON_CURRENCIES.map((c) => (
              <option key={c.code} value={c.code}>{c.code} - {c.name}</option>
            ))}
          </select>
          <span style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>
            {total} rates found
          </span>
        </div>

        {isLoading ? (
          <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>
            Loading rates...
          </div>
        ) : rates.length === 0 ? (
          <div style={{ padding: '3rem', textAlign: 'center' }}>
            <TrendingUp size={48} style={{ color: 'var(--text-muted)', marginBottom: '1rem' }} />
            <h3 style={{ marginBottom: '0.5rem' }}>No Exchange Rates</h3>
            <p style={{ color: 'var(--text-muted)' }}>
              Add exchange rates to enable multi-currency display
            </p>
          </div>
        ) : (
          <>
            <table className="table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>From Currency</th>
                  <th>To Currency</th>
                  <th>Rate</th>
                  <th>Source</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {rates.map((rate: ExchangeRate) => (
                  <tr key={rate.id}>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <Calendar size={14} style={{ color: 'var(--text-muted)' }} />
                        {format(new Date(rate.date), 'MMM dd, yyyy')}
                      </div>
                    </td>
                    <td>
                      <code style={{ 
                        background: 'var(--bg-secondary)', 
                        padding: '0.25rem 0.5rem', 
                        borderRadius: '4px',
                        fontWeight: 600
                      }}>
                        {rate.fromCurrency}
                      </code>
                    </td>
                    <td>
                      <code style={{ 
                        background: 'var(--primary-light)', 
                        color: 'var(--primary)',
                        padding: '0.25rem 0.5rem', 
                        borderRadius: '4px',
                        fontWeight: 600
                      }}>
                        SAR
                      </code>
                    </td>
                    <td style={{ fontWeight: 600, fontFamily: 'monospace' }}>
                      {rate.rate.toFixed(4)}
                    </td>
                    <td>
                      <span className={`badge badge-${rate.source === 'API' ? 'info' : 'default'}`}>
                        {rate.source}
                      </span>
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: '0.5rem' }}>
                        <button
                          className="btn btn-secondary"
                          style={{ padding: '0.375rem' }}
                          onClick={() => openModal(rate)}
                        >
                          <Edit2 size={14} />
                        </button>
                        <button
                          className="btn btn-danger"
                          style={{ padding: '0.375rem' }}
                          onClick={() => handleDelete(rate)}
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {totalPages > 1 && (
              <div style={{ 
                padding: '1rem', 
                borderTop: '1px solid var(--border)', 
                display: 'flex', 
                justifyContent: 'space-between',
                alignItems: 'center'
              }}>
                <span style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>
                  Page {page} of {totalPages}
                </span>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <button
                    className="btn btn-secondary"
                    disabled={page <= 1}
                    onClick={() => setPage(p => p - 1)}
                  >
                    Previous
                  </button>
                  <button
                    className="btn btn-secondary"
                    disabled={page >= totalPages}
                    onClick={() => setPage(p => p + 1)}
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {showModal && (
        <div className="modal-overlay" onClick={closeModal}>
          <div className="modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '450px' }}>
            <div className="modal-header">
              <h3>{editingRate ? 'Edit Exchange Rate' : 'Add Exchange Rate'}</h3>
              <button className="modal-close" onClick={closeModal}>
                <X size={20} />
              </button>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="modal-body">
                <div className="form-group">
                  <label className="form-label">Date *</label>
                  <input
                    type="date"
                    className="form-input"
                    value={formData.date}
                    onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                    required
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">From Currency *</label>
                  <select
                    className="form-select"
                    value={formData.fromCurrency}
                    onChange={(e) => setFormData({ ...formData, fromCurrency: e.target.value })}
                    required
                  >
                    {COMMON_CURRENCIES.map((c) => (
                      <option key={c.code} value={c.code}>{c.code} - {c.name}</option>
                    ))}
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">To Currency</label>
                  <input
                    type="text"
                    className="form-input"
                    value="SAR (Saudi Riyal)"
                    disabled
                    style={{ background: 'var(--bg-secondary)' }}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Exchange Rate *</label>
                  <input
                    type="number"
                    className="form-input"
                    value={formData.rate}
                    onChange={(e) => setFormData({ ...formData, rate: parseFloat(e.target.value) || 0 })}
                    step="0.0001"
                    min="0.0001"
                    placeholder="e.g., 3.75"
                    required
                  />
                  <small style={{ color: 'var(--text-muted)' }}>
                    1 {formData.fromCurrency} = {formData.rate} SAR
                  </small>
                </div>
                <div className="form-group">
                  <label className="form-label">Source</label>
                  <select
                    className="form-select"
                    value={formData.source}
                    onChange={(e) => setFormData({ ...formData, source: e.target.value })}
                  >
                    <option value="MANUAL">Manual Entry</option>
                    <option value="API">API Import</option>
                  </select>
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={closeModal}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  {editingRate ? 'Update' : 'Add'} Rate
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showFetchModal && (
        <div className="modal-overlay" onClick={() => setShowFetchModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '500px' }}>
            <div className="modal-header">
              <h3>Fetch Rates from Provider</h3>
              <button className="modal-close" onClick={() => setShowFetchModal(false)}>
                <X size={20} />
              </button>
            </div>
            <div className="modal-body">
              <p style={{ marginBottom: '1rem', color: 'var(--text-secondary)', fontSize: '0.875rem' }}>
                Fetch today's exchange rates from an online provider. Rates will be saved to SAR (Saudi Riyal).
              </p>
              
              <div className="form-group">
                <label className="form-label">Provider</label>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  {providers.map((provider) => (
                    <label 
                      key={provider.id}
                      style={{ 
                        display: 'flex', 
                        alignItems: 'flex-start', 
                        gap: '0.75rem',
                        padding: '0.75rem',
                        border: '1px solid var(--border)',
                        borderRadius: '8px',
                        cursor: 'pointer',
                        background: selectedProvider === provider.id ? 'var(--bg-secondary)' : 'transparent',
                      }}
                    >
                      <input
                        type="radio"
                        name="provider"
                        value={provider.id}
                        checked={selectedProvider === provider.id}
                        onChange={(e) => setSelectedProvider(e.target.value)}
                        style={{ marginTop: '2px' }}
                      />
                      <div>
                        <div style={{ fontWeight: 500 }}>{provider.name}</div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                          {provider.description}
                          {provider.requiresKey && (
                            <span style={{ color: 'var(--warning)', marginLeft: '0.5rem' }}>
                              (API key required)
                            </span>
                          )}
                        </div>
                      </div>
                    </label>
                  ))}
                </div>
              </div>

              {providers.find(p => p.id === selectedProvider)?.requiresKey && (
                <div className="form-group">
                  <label className="form-label">API Key *</label>
                  <input
                    type="password"
                    className="form-input"
                    value={apiKey}
                    onChange={(e) => setApiKey(e.target.value)}
                    placeholder="Enter your API key"
                  />
                  <small style={{ color: 'var(--text-muted)', marginTop: '0.25rem', display: 'block' }}>
                    Get a free API key from the provider's website
                  </small>
                </div>
              )}

              <div style={{ 
                marginTop: '1rem', 
                padding: '0.75rem', 
                background: 'var(--bg-secondary)', 
                borderRadius: '8px',
                fontSize: '0.8125rem',
                color: 'var(--text-secondary)',
              }}>
                <strong>Currencies to fetch:</strong> USD, EUR, GBP, AED, KWD, BHD, QAR, OMR, EGP, JOD
              </div>
            </div>
            <div className="modal-footer">
              <button 
                type="button" 
                className="btn btn-secondary" 
                onClick={() => setShowFetchModal(false)}
              >
                Cancel
              </button>
              <button 
                type="button" 
                className="btn btn-primary"
                onClick={() => {
                  const provider = providers.find(p => p.id === selectedProvider);
                  if (provider?.requiresKey && !apiKey) {
                    toast.error('API Key Required', 'Please enter your API key');
                    return;
                  }
                  fetchRatesMutation.mutate({ 
                    provider: selectedProvider, 
                    apiKey: apiKey || undefined 
                  });
                }}
                disabled={fetchRatesMutation.isPending}
              >
                {fetchRatesMutation.isPending ? (
                  <>
                    <RefreshCw size={16} className="spin" />
                    Fetching...
                  </>
                ) : (
                  <>
                    <Cloud size={16} />
                    Fetch Rates
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
