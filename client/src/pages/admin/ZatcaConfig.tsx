import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import api from '../../lib/api';
import { useToast } from '../../components/ui/Toast';
import { PageHeader } from '../../components/shared';
import { Save, ArrowLeft, Building, FileText, Settings, RefreshCw } from 'lucide-react';

interface ZatcaConfig {
  id: string;
  environment: string;
  enableZatcaPosting: boolean;
  sellerName: string;
  sellerNameAr: string;
  sellerVatNo: string;
  sellerCrNo: string;
  sellerStreet: string;
  sellerBuilding: string;
  sellerDistrict: string;
  sellerCity: string;
  sellerPostalCode: string;
  sellerCountry: string;
  simplifiedMode: string;
  standardMode: string;
  retriesCount: number;
  backoffSeconds: number;
  blockUntilAccepted: boolean;
  notifyOnRejection: boolean;
}

export default function ZatcaConfig() {
  const navigate = useNavigate();
  const toast = useToast();
  const queryClient = useQueryClient();
  const [formData, setFormData] = useState<Partial<ZatcaConfig>>({});

  const { data: config, isLoading } = useQuery<ZatcaConfig>({
    queryKey: ['zatca-config'],
    queryFn: async () => {
      const { data } = await api.get('/zatca/config');
      return data;
    },
  });

  useEffect(() => {
    if (config) {
      setFormData(config);
    }
  }, [config]);

  const saveMutation = useMutation({
    mutationFn: async (data: Partial<ZatcaConfig>) => {
      const { data: result } = await api.put('/zatca/config', data);
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['zatca-config'] });
      queryClient.invalidateQueries({ queryKey: ['zatca-status'] });
      toast.success('Configuration Saved', 'ZATCA settings have been updated');
    },
    onError: (error: any) => {
      toast.error('Error', error.response?.data?.error || 'Failed to save configuration');
    },
  });

  const testMutation = useMutation({
    mutationFn: async () => {
      const { data } = await api.post('/zatca/test-connection');
      return data;
    },
    onSuccess: (data) => {
      toast.success('Connection Test Passed', data.message);
    },
    onError: (error: any) => {
      toast.error('Connection Test Failed', error.response?.data?.error || 'Failed to connect');
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    saveMutation.mutate(formData);
  };

  const handleChange = (key: keyof ZatcaConfig, value: any) => {
    setFormData((prev) => ({ ...prev, [key]: value }));
  };

  if (isLoading) {
    return (
      <div>
        <PageHeader title="ZATCA Configuration" subtitle="Configure e-invoice integration settings" />
        <div className="card" style={{ padding: '3rem', textAlign: 'center' }}>Loading...</div>
      </div>
    );
  }

  return (
    <div>
      <PageHeader
        title="ZATCA Configuration"
        subtitle="Configure Fatoora e-invoice integration settings"
        actions={
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <button className="btn btn-secondary" onClick={() => navigate('/admin/zatca')}>
              <ArrowLeft size={16} />
              Back
            </button>
            <button className="btn btn-secondary" onClick={() => testMutation.mutate()} disabled={testMutation.isPending}>
              <RefreshCw size={16} />
              Test Connection
            </button>
          </div>
        }
      />

      <form onSubmit={handleSubmit}>
        <div className="grid grid-2" style={{ gap: '1.5rem' }}>
          <div className="card">
            <div style={{ padding: '1rem 1.25rem', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Settings size={18} style={{ color: 'var(--primary)' }} />
              <h3 style={{ margin: 0, fontWeight: 600 }}>General Settings</h3>
            </div>
            <div style={{ padding: '1.25rem' }}>
              <div className="form-group">
                <label className="form-label">Environment</label>
                <select
                  className="form-select"
                  value={formData.environment || 'SIMULATION'}
                  onChange={(e) => handleChange('environment', e.target.value)}
                >
                  <option value="SIMULATION">Simulation (Testing)</option>
                  <option value="PRODUCTION">Production</option>
                </select>
                <small style={{ color: 'var(--text-muted)' }}>
                  Use Simulation for testing before going live
                </small>
              </div>
              <div className="form-group">
                <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={formData.enableZatcaPosting || false}
                    onChange={(e) => handleChange('enableZatcaPosting', e.target.checked)}
                  />
                  Enable ZATCA Posting
                </label>
                <small style={{ color: 'var(--text-muted)' }}>
                  When enabled, issued invoices will be submitted to ZATCA automatically
                </small>
              </div>
              <div className="grid grid-2" style={{ gap: '1rem' }}>
                <div className="form-group">
                  <label className="form-label">Simplified Invoice Mode (B2C)</label>
                  <select
                    className="form-select"
                    value={formData.simplifiedMode || 'REPORTING'}
                    onChange={(e) => handleChange('simplifiedMode', e.target.value)}
                  >
                    <option value="REPORTING">Reporting</option>
                    <option value="CLEARANCE">Clearance</option>
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Standard Invoice Mode (B2B)</label>
                  <select
                    className="form-select"
                    value={formData.standardMode || 'CLEARANCE'}
                    onChange={(e) => handleChange('standardMode', e.target.value)}
                  >
                    <option value="CLEARANCE">Clearance</option>
                    <option value="REPORTING">Reporting</option>
                  </select>
                </div>
              </div>
            </div>
          </div>

          <div className="card">
            <div style={{ padding: '1rem 1.25rem', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Building size={18} style={{ color: 'var(--info)' }} />
              <h3 style={{ margin: 0, fontWeight: 600 }}>Seller Information</h3>
            </div>
            <div style={{ padding: '1.25rem' }}>
              <div className="grid grid-2" style={{ gap: '1rem' }}>
                <div className="form-group">
                  <label className="form-label">Seller Name (English)</label>
                  <input
                    type="text"
                    className="form-input"
                    value={formData.sellerName || ''}
                    onChange={(e) => handleChange('sellerName', e.target.value)}
                    placeholder="Company name in English"
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Seller Name (Arabic)</label>
                  <input
                    type="text"
                    className="form-input"
                    value={formData.sellerNameAr || ''}
                    onChange={(e) => handleChange('sellerNameAr', e.target.value)}
                    placeholder="اسم الشركة بالعربية"
                    dir="rtl"
                  />
                </div>
              </div>
              <div className="grid grid-2" style={{ gap: '1rem' }}>
                <div className="form-group">
                  <label className="form-label">VAT Number</label>
                  <input
                    type="text"
                    className="form-input"
                    value={formData.sellerVatNo || ''}
                    onChange={(e) => handleChange('sellerVatNo', e.target.value)}
                    placeholder="300000000000003"
                    maxLength={15}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">CR Number</label>
                  <input
                    type="text"
                    className="form-input"
                    value={formData.sellerCrNo || ''}
                    onChange={(e) => handleChange('sellerCrNo', e.target.value)}
                    placeholder="Commercial Registration"
                  />
                </div>
              </div>
              <div className="grid grid-2" style={{ gap: '1rem' }}>
                <div className="form-group">
                  <label className="form-label">Street</label>
                  <input
                    type="text"
                    className="form-input"
                    value={formData.sellerStreet || ''}
                    onChange={(e) => handleChange('sellerStreet', e.target.value)}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Building Number</label>
                  <input
                    type="text"
                    className="form-input"
                    value={formData.sellerBuilding || ''}
                    onChange={(e) => handleChange('sellerBuilding', e.target.value)}
                  />
                </div>
              </div>
              <div className="grid grid-3" style={{ gap: '1rem' }}>
                <div className="form-group">
                  <label className="form-label">District</label>
                  <input
                    type="text"
                    className="form-input"
                    value={formData.sellerDistrict || ''}
                    onChange={(e) => handleChange('sellerDistrict', e.target.value)}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">City</label>
                  <input
                    type="text"
                    className="form-input"
                    value={formData.sellerCity || ''}
                    onChange={(e) => handleChange('sellerCity', e.target.value)}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Postal Code</label>
                  <input
                    type="text"
                    className="form-input"
                    value={formData.sellerPostalCode || ''}
                    onChange={(e) => handleChange('sellerPostalCode', e.target.value)}
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="card">
            <div style={{ padding: '1rem 1.25rem', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <FileText size={18} style={{ color: 'var(--warning)' }} />
              <h3 style={{ margin: 0, fontWeight: 600 }}>Retry & Notification Settings</h3>
            </div>
            <div style={{ padding: '1.25rem' }}>
              <div className="grid grid-2" style={{ gap: '1rem' }}>
                <div className="form-group">
                  <label className="form-label">Retry Count</label>
                  <input
                    type="number"
                    className="form-input"
                    value={formData.retriesCount || 3}
                    onChange={(e) => handleChange('retriesCount', parseInt(e.target.value))}
                    min={0}
                    max={10}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Backoff Seconds</label>
                  <input
                    type="number"
                    className="form-input"
                    value={formData.backoffSeconds || 60}
                    onChange={(e) => handleChange('backoffSeconds', parseInt(e.target.value))}
                    min={10}
                  />
                </div>
              </div>
              <div className="form-group">
                <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={formData.blockUntilAccepted || false}
                    onChange={(e) => handleChange('blockUntilAccepted', e.target.checked)}
                  />
                  Block customer visibility until ZATCA accepted
                </label>
              </div>
              <div className="form-group">
                <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={formData.notifyOnRejection !== false}
                    onChange={(e) => handleChange('notifyOnRejection', e.target.checked)}
                  />
                  Notify admin on rejection/failure
                </label>
              </div>
            </div>
          </div>
        </div>

        <div style={{ marginTop: '1.5rem', display: 'flex', justifyContent: 'flex-end' }}>
          <button type="submit" className="btn btn-primary" disabled={saveMutation.isPending}>
            <Save size={16} />
            Save Configuration
          </button>
        </div>
      </form>
    </div>
  );
}
