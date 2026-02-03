import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../../lib/api';
import { useToast } from '../../components/ui/Toast';
import { PageHeader } from '../../components/shared';
import { Globe, Clock, DollarSign, Save, Settings } from 'lucide-react';

interface LocalizationSettings {
  id: string;
  defaultLanguageCode: string;
  defaultTimezone: string;
  baseCurrencyCode: string;
  enableMultiCurrencyDisplay: boolean;
  enableUserLanguageOverride: boolean;
  enableUserTimezoneOverride: boolean;
  enableUserCurrencyOverride: boolean;
  dateFormat: string;
  timeFormat: string;
  numberFormat: string;
}

interface Language {
  id: string;
  code: string;
  name: string;
  isActive: boolean;
}

const TIMEZONES = [
  'Asia/Riyadh',
  'Asia/Dubai',
  'Asia/Kuwait',
  'Asia/Bahrain',
  'Asia/Qatar',
  'Africa/Cairo',
  'Europe/London',
  'Europe/Paris',
  'America/New_York',
  'America/Los_Angeles',
  'UTC',
];

const DATE_FORMATS = [
  { value: 'yyyy-MM-dd', label: '2024-01-15' },
  { value: 'dd/MM/yyyy', label: '15/01/2024' },
  { value: 'MM/dd/yyyy', label: '01/15/2024' },
  { value: 'dd-MM-yyyy', label: '15-01-2024' },
  { value: 'dd MMM yyyy', label: '15 Jan 2024' },
];

const TIME_FORMATS = [
  { value: 'HH:mm', label: '14:30 (24-hour)' },
  { value: 'HH:mm:ss', label: '14:30:00 (24-hour with seconds)' },
  { value: 'hh:mm a', label: '02:30 PM (12-hour)' },
  { value: 'hh:mm:ss a', label: '02:30:00 PM (12-hour with seconds)' },
];

export default function LocalizationSettings() {
  const toast = useToast();
  const queryClient = useQueryClient();
  const [formData, setFormData] = useState<Partial<LocalizationSettings>>({});

  const { data: settings, isLoading } = useQuery<LocalizationSettings>({
    queryKey: ['localization-settings'],
    queryFn: async () => {
      const { data } = await api.get('/localization/settings');
      return data;
    },
  });

  const { data: languages = [] } = useQuery<Language[]>({
    queryKey: ['languages-active'],
    queryFn: async () => {
      const { data } = await api.get('/localization/languages', { params: { activeOnly: 'true' } });
      return data;
    },
  });

  useEffect(() => {
    if (settings) {
      setFormData(settings);
    }
  }, [settings]);

  const updateMutation = useMutation({
    mutationFn: async (data: Partial<LocalizationSettings>) => {
      const { data: result } = await api.put('/localization/settings', data);
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['localization-settings'] });
      toast.success('Settings Saved', 'Localization settings have been updated');
    },
    onError: (error: any) => {
      toast.error('Error', error.response?.data?.error || 'Failed to save settings');
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    updateMutation.mutate(formData);
  };

  const handleChange = (key: keyof LocalizationSettings, value: any) => {
    setFormData((prev) => ({ ...prev, [key]: value }));
  };

  if (isLoading) {
    return (
      <div>
        <PageHeader title="Localization Settings" subtitle="Configure system-wide localization preferences" />
        <div className="card" style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>
          Loading settings...
        </div>
      </div>
    );
  }

  return (
    <div>
      <PageHeader
        title="Localization Settings"
        subtitle="Configure system-wide language, timezone, and currency preferences"
      />

      <form onSubmit={handleSubmit}>
        <div className="grid grid-2" style={{ gap: '1.5rem' }}>
          <div className="card">
            <div style={{ padding: '1rem 1.5rem', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Globe size={20} style={{ color: 'var(--primary)' }} />
              <h3 style={{ margin: 0, fontWeight: 600 }}>Language Settings</h3>
            </div>
            <div style={{ padding: '1.5rem' }}>
              <div className="form-group">
                <label className="form-label">Default Language</label>
                <select
                  className="form-select"
                  value={formData.defaultLanguageCode || 'en'}
                  onChange={(e) => handleChange('defaultLanguageCode', e.target.value)}
                >
                  {languages.map((lang) => (
                    <option key={lang.code} value={lang.code}>{lang.name} ({lang.code.toUpperCase()})</option>
                  ))}
                  {languages.length === 0 && <option value="en">English (en)</option>}
                </select>
                <small style={{ color: 'var(--text-muted)' }}>
                  Used when user has no preference set
                </small>
              </div>
              <div className="form-group">
                <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={formData.enableUserLanguageOverride ?? true}
                    onChange={(e) => handleChange('enableUserLanguageOverride', e.target.checked)}
                  />
                  Allow users to override language
                </label>
                <small style={{ color: 'var(--text-muted)' }}>
                  When disabled, all users will see the default language
                </small>
              </div>
            </div>
          </div>

          <div className="card">
            <div style={{ padding: '1rem 1.5rem', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Clock size={20} style={{ color: 'var(--warning)' }} />
              <h3 style={{ margin: 0, fontWeight: 600 }}>Timezone Settings</h3>
            </div>
            <div style={{ padding: '1.5rem' }}>
              <div className="form-group">
                <label className="form-label">Default Timezone</label>
                <select
                  className="form-select"
                  value={formData.defaultTimezone || 'Asia/Riyadh'}
                  onChange={(e) => handleChange('defaultTimezone', e.target.value)}
                >
                  {TIMEZONES.map((tz) => (
                    <option key={tz} value={tz}>{tz}</option>
                  ))}
                </select>
                <small style={{ color: 'var(--text-muted)' }}>
                  All timestamps displayed using this timezone by default
                </small>
              </div>
              <div className="form-group">
                <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={formData.enableUserTimezoneOverride ?? true}
                    onChange={(e) => handleChange('enableUserTimezoneOverride', e.target.checked)}
                  />
                  Allow users to override timezone
                </label>
              </div>
            </div>
          </div>

          <div className="card">
            <div style={{ padding: '1rem 1.5rem', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <DollarSign size={20} style={{ color: 'var(--success)' }} />
              <h3 style={{ margin: 0, fontWeight: 600 }}>Currency Settings</h3>
            </div>
            <div style={{ padding: '1.5rem' }}>
              <div className="form-group">
                <label className="form-label">Base Currency</label>
                <input
                  type="text"
                  className="form-input"
                  value="SAR (Saudi Riyal)"
                  disabled
                  style={{ background: 'var(--bg-secondary)' }}
                />
                <small style={{ color: 'var(--text-muted)' }}>
                  All accounting is stored in SAR
                </small>
              </div>
              <div className="form-group">
                <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={formData.enableMultiCurrencyDisplay ?? true}
                    onChange={(e) => handleChange('enableMultiCurrencyDisplay', e.target.checked)}
                  />
                  Enable multi-currency display
                </label>
                <small style={{ color: 'var(--text-muted)' }}>
                  Allow displaying amounts in other currencies using exchange rates
                </small>
              </div>
              <div className="form-group">
                <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={formData.enableUserCurrencyOverride ?? true}
                    onChange={(e) => handleChange('enableUserCurrencyOverride', e.target.checked)}
                  />
                  Allow users to override display currency
                </label>
              </div>
            </div>
          </div>

          <div className="card">
            <div style={{ padding: '1rem 1.5rem', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Settings size={20} style={{ color: 'var(--info)' }} />
              <h3 style={{ margin: 0, fontWeight: 600 }}>Format Settings</h3>
            </div>
            <div style={{ padding: '1.5rem' }}>
              <div className="form-group">
                <label className="form-label">Date Format</label>
                <select
                  className="form-select"
                  value={formData.dateFormat || 'yyyy-MM-dd'}
                  onChange={(e) => handleChange('dateFormat', e.target.value)}
                >
                  {DATE_FORMATS.map((f) => (
                    <option key={f.value} value={f.value}>{f.label}</option>
                  ))}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Time Format</label>
                <select
                  className="form-select"
                  value={formData.timeFormat || 'HH:mm'}
                  onChange={(e) => handleChange('timeFormat', e.target.value)}
                >
                  {TIME_FORMATS.map((f) => (
                    <option key={f.value} value={f.value}>{f.label}</option>
                  ))}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Number Format Locale</label>
                <select
                  className="form-select"
                  value={formData.numberFormat || 'en-US'}
                  onChange={(e) => handleChange('numberFormat', e.target.value)}
                >
                  <option value="en-US">English (US) - 1,234.56</option>
                  <option value="en-GB">English (UK) - 1,234.56</option>
                  <option value="ar-SA">Arabic (SA) - ١٬٢٣٤٫٥٦</option>
                  <option value="de-DE">German - 1.234,56</option>
                  <option value="fr-FR">French - 1 234,56</option>
                </select>
              </div>
            </div>
          </div>
        </div>

        <div style={{ marginTop: '1.5rem', display: 'flex', justifyContent: 'flex-end' }}>
          <button type="submit" className="btn btn-primary" disabled={updateMutation.isPending}>
            <Save size={16} />
            Save Settings
          </button>
        </div>
      </form>
    </div>
  );
}
