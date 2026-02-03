import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import api from '../lib/api';
import { 
  Bell, Mail, MessageSquare, Phone, ArrowLeft, Save, 
  CheckCircle, XCircle, Send, Settings, Zap
} from 'lucide-react';
import { useToast } from '../components/ui/Toast';

interface ChannelStatus {
  connected: boolean;
  provider: string;
  phoneNumber?: string;
  error?: string;
}

interface NotificationConfig {
  key: string;
  value: any;
  dataType: string;
  description: string;
}

const CHANNEL_OPTIONS = [
  { value: 'email', label: 'Email Only' },
  { value: 'sms', label: 'SMS Only' },
  { value: 'whatsapp', label: 'WhatsApp Only' },
  { value: 'email,sms', label: 'Email + SMS' },
  { value: 'email,whatsapp', label: 'Email + WhatsApp' },
  { value: 'email,sms,whatsapp', label: 'All Channels' },
];

const tabs = [
  { id: 'channels', label: 'Channel Status', icon: Zap },
  { id: 'email', label: 'Email Settings', icon: Mail },
  { id: 'events', label: 'Event Routing', icon: Bell },
];

export default function NotificationSettings() {
  const queryClient = useQueryClient();
  const toast = useToast();
  const [activeTab, setActiveTab] = useState('channels');
  const [settings, setSettings] = useState<Record<string, any>>({});
  const [testPhone, setTestPhone] = useState('');
  const [testing, setTesting] = useState<string | null>(null);

  const { data: config, isLoading } = useQuery({
    queryKey: ['notification-settings'],
    queryFn: async () => {
      const { data } = await api.get('/notification-settings');
      return data as Record<string, NotificationConfig>;
    }
  });

  const { data: status } = useQuery({
    queryKey: ['notification-status'],
    queryFn: async () => {
      const { data } = await api.get('/notification-settings/status');
      return data as { email: ChannelStatus; sms: ChannelStatus; whatsapp: ChannelStatus };
    }
  });

  useEffect(() => {
    if (config) {
      const initialSettings: Record<string, any> = {};
      Object.entries(config).forEach(([name, conf]) => {
        initialSettings[conf.key] = conf.value;
      });
      setSettings(initialSettings);
    }
  }, [config]);

  const saveMutation = useMutation({
    mutationFn: async (data: Record<string, any>) => {
      await api.put('/notification-settings', data);
    },
    onSuccess: () => {
      toast.success('Settings Saved', 'Notification settings updated successfully');
      queryClient.invalidateQueries({ queryKey: ['notification-settings'] });
    },
    onError: () => {
      toast.error('Save Failed', 'Failed to save notification settings');
    }
  });

  const handleSave = () => {
    saveMutation.mutate(settings);
  };

  const handleTestEmail = async () => {
    setTesting('email');
    try {
      const { data } = await api.get('/notification-settings/test/email');
      toast.success('Email Sent', data.message || 'Test email sent successfully');
    } catch (error: any) {
      toast.error('Email Failed', error.response?.data?.error || 'Email test failed');
    }
    setTesting(null);
  };

  const handleTestSMS = async () => {
    if (!testPhone) {
      toast.error('Phone Required', 'Please enter a phone number');
      return;
    }
    setTesting('sms');
    try {
      const { data } = await api.get(`/notification-settings/test/sms?to=${encodeURIComponent(testPhone)}`);
      toast.success('SMS Sent', data.message || 'Test SMS sent successfully');
    } catch (error: any) {
      toast.error('SMS Failed', error.response?.data?.error || 'SMS test failed');
    }
    setTesting(null);
  };

  const handleTestWhatsApp = async () => {
    if (!testPhone) {
      toast.error('Phone Required', 'Please enter a phone number');
      return;
    }
    setTesting('whatsapp');
    try {
      const { data } = await api.get(`/notification-settings/test/whatsapp?to=${encodeURIComponent(testPhone)}`);
      toast.success('WhatsApp Sent', data.message || 'Test WhatsApp sent successfully');
    } catch (error: any) {
      toast.error('WhatsApp Failed', error.response?.data?.error || 'WhatsApp test failed');
    }
    setTesting(null);
  };

  if (isLoading) {
    return (
      <div className="loading-overlay">
        <div className="spinner" />
      </div>
    );
  }

  const renderChannelStatus = () => (
    <>
      <div className="grid" style={{ gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem', marginBottom: '1.5rem' }}>
        <div className="card" style={{ padding: '1.25rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Mail size={20} style={{ color: 'var(--primary)' }} />
              <span style={{ fontWeight: 600 }}>Email</span>
            </div>
            {status?.email.connected ? (
              <span className="badge badge-success" style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                <CheckCircle size={12} /> Connected
              </span>
            ) : (
              <span className="badge badge-danger" style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                <XCircle size={12} /> Disconnected
              </span>
            )}
          </div>
          <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)', marginBottom: '0.75rem' }}>
            Provider: {status?.email.provider || 'Resend'}
          </p>
          <button
            className="btn btn-sm btn-outline"
            onClick={handleTestEmail}
            disabled={testing === 'email'}
            style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}
          >
            {testing === 'email' ? <div className="spinner" style={{ width: '14px', height: '14px' }} /> : <Send size={14} />}
            Send Test
          </button>
        </div>

        <div className="card" style={{ padding: '1.25rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Phone size={20} style={{ color: 'var(--success)' }} />
              <span style={{ fontWeight: 600 }}>SMS</span>
            </div>
            {status?.sms.connected ? (
              <span className="badge badge-success" style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                <CheckCircle size={12} /> Connected
              </span>
            ) : (
              <span className="badge badge-danger" style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                <XCircle size={12} /> Disconnected
              </span>
            )}
          </div>
          <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)', marginBottom: '0.25rem' }}>
            Provider: {status?.sms.provider || 'Twilio'}
          </p>
          {status?.sms.phoneNumber && (
            <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '0.75rem' }}>
              From: {status.sms.phoneNumber}
            </p>
          )}
          <button
            className="btn btn-sm btn-outline"
            onClick={handleTestSMS}
            disabled={testing === 'sms' || !status?.sms.connected}
            style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}
          >
            {testing === 'sms' ? <div className="spinner" style={{ width: '14px', height: '14px' }} /> : <Send size={14} />}
            Send Test
          </button>
        </div>

        <div className="card" style={{ padding: '1.25rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <MessageSquare size={20} style={{ color: '#25D366' }} />
              <span style={{ fontWeight: 600 }}>WhatsApp</span>
            </div>
            {status?.whatsapp.connected ? (
              <span className="badge badge-success" style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                <CheckCircle size={12} /> Connected
              </span>
            ) : (
              <span className="badge badge-danger" style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                <XCircle size={12} /> Disconnected
              </span>
            )}
          </div>
          <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)', marginBottom: '0.25rem' }}>
            Provider: {status?.whatsapp.provider || 'Twilio'}
          </p>
          {status?.whatsapp.phoneNumber && (
            <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '0.75rem' }}>
              From: {status.whatsapp.phoneNumber}
            </p>
          )}
          <button
            className="btn btn-sm btn-outline"
            onClick={handleTestWhatsApp}
            disabled={testing === 'whatsapp' || !status?.whatsapp.connected}
            style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}
          >
            {testing === 'whatsapp' ? <div className="spinner" style={{ width: '14px', height: '14px' }} /> : <Send size={14} />}
            Send Test
          </button>
        </div>
      </div>

      <div className="card" style={{ marginBottom: '1.5rem' }}>
        <div style={{ padding: '1rem 1.5rem', borderBottom: '1px solid var(--border)' }}>
          <h3 style={{ fontWeight: 600, fontSize: '1rem', margin: 0 }}>Test Phone Number</h3>
        </div>
        <div style={{ padding: '1.25rem' }}>
          <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)', marginBottom: '0.75rem' }}>
            Enter a phone number to test SMS and WhatsApp (include country code, e.g., +1234567890)
          </p>
          <input
            type="tel"
            className="form-input"
            value={testPhone}
            onChange={(e) => setTestPhone(e.target.value)}
            placeholder="+1234567890"
            style={{ maxWidth: '300px' }}
          />
        </div>
      </div>

      <div className="card">
        <div style={{ padding: '1rem 1.5rem', borderBottom: '1px solid var(--border)' }}>
          <h3 style={{ fontWeight: 600, fontSize: '1rem', margin: 0 }}>Channel Enable/Disable</h3>
        </div>
        <div style={{ padding: '1.25rem' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1.5rem' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={settings['notification_email_enabled'] === true || settings['notification_email_enabled'] === 'true'}
                onChange={(e) => setSettings({ ...settings, notification_email_enabled: e.target.checked })}
                style={{ width: '18px', height: '18px' }}
              />
              <span style={{ fontWeight: 500 }}>Enable Email Notifications</span>
            </label>
            <label style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={settings['notification_sms_enabled'] === true || settings['notification_sms_enabled'] === 'true'}
                onChange={(e) => setSettings({ ...settings, notification_sms_enabled: e.target.checked })}
                style={{ width: '18px', height: '18px' }}
              />
              <span style={{ fontWeight: 500 }}>Enable SMS Notifications</span>
            </label>
            <label style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={settings['notification_whatsapp_enabled'] === true || settings['notification_whatsapp_enabled'] === 'true'}
                onChange={(e) => setSettings({ ...settings, notification_whatsapp_enabled: e.target.checked })}
                style={{ width: '18px', height: '18px' }}
              />
              <span style={{ fontWeight: 500 }}>Enable WhatsApp Notifications</span>
            </label>
          </div>
        </div>
      </div>
    </>
  );

  const renderEmailSettings = () => (
    <div className="card">
      <div style={{ padding: '1rem 1.5rem', borderBottom: '1px solid var(--border)' }}>
        <h3 style={{ fontWeight: 600, fontSize: '1rem', margin: 0 }}>Email Configuration</h3>
      </div>
      <div style={{ padding: '1.25rem' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
          <div className="form-group">
            <label className="form-label">Sender Email Address</label>
            <input
              type="email"
              className="form-input"
              value={settings['notification_email_from_address'] || ''}
              onChange={(e) => setSettings({ ...settings, notification_email_from_address: e.target.value })}
              placeholder="noreply@radiopharma.com"
            />
            <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
              The email address that will appear in the "From" field
            </p>
          </div>
          <div className="form-group">
            <label className="form-label">Sender Display Name</label>
            <input
              type="text"
              className="form-input"
              value={settings['notification_email_from_name'] || ''}
              onChange={(e) => setSettings({ ...settings, notification_email_from_name: e.target.value })}
              placeholder="RadioPharma OMS"
            />
            <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
              The display name shown to email recipients
            </p>
          </div>
        </div>
      </div>
    </div>
  );

  const renderEventRouting = () => (
    <div className="card">
      <div style={{ padding: '1rem 1.5rem', borderBottom: '1px solid var(--border)' }}>
        <h3 style={{ fontWeight: 600, fontSize: '1rem', margin: 0 }}>Event Channel Configuration</h3>
        <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)', margin: '0.25rem 0 0' }}>
          Configure which channels to use for different notification types
        </p>
      </div>
      <div style={{ padding: '1.25rem' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
          <div className="form-group">
            <label className="form-label">Order Notifications</label>
            <select
              className="form-select"
              value={settings['notification_order_events'] || 'email'}
              onChange={(e) => setSettings({ ...settings, notification_order_events: e.target.value })}
            >
              {CHANNEL_OPTIONS.map(opt => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
            <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
              Order status updates, confirmations
            </p>
          </div>

          <div className="form-group">
            <label className="form-label">Batch/Production Notifications</label>
            <select
              className="form-select"
              value={settings['notification_batch_events'] || 'email'}
              onChange={(e) => setSettings({ ...settings, notification_batch_events: e.target.value })}
            >
              {CHANNEL_OPTIONS.map(opt => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
            <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
              Production status, QC results, batch releases
            </p>
          </div>

          <div className="form-group">
            <label className="form-label">Delivery Notifications</label>
            <select
              className="form-select"
              value={settings['notification_delivery_events'] || 'email,sms'}
              onChange={(e) => setSettings({ ...settings, notification_delivery_events: e.target.value })}
            >
              {CHANNEL_OPTIONS.map(opt => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
            <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
              Shipment dispatched, delivery updates, ETA changes
            </p>
          </div>

          <div className="form-group">
            <label className="form-label">Approval Notifications</label>
            <select
              className="form-select"
              value={settings['notification_approval_events'] || 'email'}
              onChange={(e) => setSettings({ ...settings, notification_approval_events: e.target.value })}
            >
              {CHANNEL_OPTIONS.map(opt => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
            <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
              Pending approvals, approval/rejection outcomes
            </p>
          </div>

          <div className="form-group">
            <label className="form-label">Invoice Notifications</label>
            <select
              className="form-select"
              value={settings['notification_invoice_events'] || 'email'}
              onChange={(e) => setSettings({ ...settings, notification_invoice_events: e.target.value })}
            >
              {CHANNEL_OPTIONS.map(opt => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
            <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
              Invoice generated, payment reminders, receipts
            </p>
          </div>

          <div className="form-group">
            <label className="form-label">Default Channel</label>
            <select
              className="form-select"
              value={settings['notification_default_channel'] || 'email'}
              onChange={(e) => setSettings({ ...settings, notification_default_channel: e.target.value })}
            >
              <option value="email">Email</option>
              <option value="sms">SMS</option>
              <option value="whatsapp">WhatsApp</option>
              <option value="all">All Channels</option>
            </select>
            <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
              Fallback channel for uncategorized notifications
            </p>
          </div>
        </div>
      </div>
    </div>
  );

  const renderContent = () => {
    switch (activeTab) {
      case 'channels':
        return renderChannelStatus();
      case 'email':
        return renderEmailSettings();
      case 'events':
        return renderEventRouting();
      default:
        return null;
    }
  };

  return (
    <div style={{ display: 'flex', gap: '1.5rem' }}>
      <div style={{ width: '240px', flexShrink: 0 }}>
        <Link 
          to="/settings" 
          className="btn btn-secondary" 
          style={{ marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem', width: '100%' }}
        >
          <ArrowLeft size={16} />
          Back to Settings
        </Link>
        
        <div className="card" style={{ overflow: 'hidden' }}>
          <div style={{ padding: '1rem 1.25rem', borderBottom: '1px solid var(--border)', background: 'var(--bg-secondary)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Settings size={18} style={{ color: 'var(--primary)' }} />
              <span style={{ fontWeight: 600, fontSize: '0.9375rem' }}>Notification Settings</span>
            </div>
          </div>
          <div style={{ padding: '0.5rem' }}>
            {tabs.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.75rem',
                    width: '100%',
                    padding: '0.75rem 1rem',
                    border: 'none',
                    borderRadius: 'var(--radius-sm)',
                    background: isActive ? 'var(--primary)' : 'transparent',
                    color: isActive ? 'white' : 'var(--text-secondary)',
                    cursor: 'pointer',
                    fontSize: '0.875rem',
                    fontWeight: isActive ? 500 : 400,
                    textAlign: 'left',
                    transition: 'all 0.15s ease',
                  }}
                >
                  <Icon size={18} />
                  {tab.label}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      <div style={{ flex: 1 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.5rem' }}>
          <div>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 600, marginBottom: '0.25rem' }}>Notification Settings</h2>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', margin: 0 }}>
              Configure email, SMS, and WhatsApp notification channels
            </p>
          </div>
          <button 
            className="btn btn-primary"
            onClick={handleSave}
            disabled={saveMutation.isPending}
          >
            {saveMutation.isPending ? (
              <div className="spinner" style={{ width: '16px', height: '16px' }} />
            ) : (
              <Save size={16} />
            )}
            Save Changes
          </button>
        </div>

        {renderContent()}
      </div>
    </div>
  );
}
