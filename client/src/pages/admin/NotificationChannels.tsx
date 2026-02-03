import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import api from '../../lib/api';
import { 
  Bell, Mail, MessageSquare, Phone, ArrowLeft, Save, 
  CheckCircle, XCircle, Send, Power, AlertCircle,
  FileText, RefreshCw, Eye, EyeOff
} from 'lucide-react';
import { useToast } from '../../components/ui/Toast';

interface ChannelConfig {
  id?: string;
  channel: string;
  isEnabled: boolean;
  providerType: string;
  settingsJson: any;
  fromName: string;
  fromAddress: string;
  lastTestedAt: string | null;
  lastTestStatus: string | null;
  lastTestMessage: string | null;
  updatedBy?: { firstName: string; lastName: string };
}

interface ChannelStatus {
  connected: boolean;
  provider: string;
  fromAddress?: string;
  phoneNumber?: string;
  error?: string;
}

const tabs = [
  { id: 'IN_APP', label: 'In-App', icon: Bell },
  { id: 'EMAIL', label: 'Email', icon: Mail },
  { id: 'SMS', label: 'SMS', icon: Phone },
  { id: 'WHATSAPP', label: 'WhatsApp', icon: MessageSquare },
];

const emailProviders = [
  { value: 'SMTP', label: 'SMTP' },
  { value: 'RESEND', label: 'Resend' },
];

const smsProviders = [
  { value: 'TWILIO', label: 'Twilio' },
];

const whatsappProviders = [
  { value: 'META_WHATSAPP', label: 'Meta Cloud API' },
  { value: 'TWILIO', label: 'Twilio' },
];

export default function NotificationChannels() {
  const queryClient = useQueryClient();
  const toast = useToast();
  const [activeTab, setActiveTab] = useState('EMAIL');
  const [testRecipient, setTestRecipient] = useState('');
  const [testing, setTesting] = useState(false);
  const [showPassword, setShowPassword] = useState<Record<string, boolean>>({});

  const [emailForm, setEmailForm] = useState({
    providerType: 'SMTP',
    host: '',
    port: '587',
    secure: false,
    username: '',
    password: '',
    fromEmail: '',
    fromName: 'RadioPharma OMS',
    isEnabled: false
  });

  const [smsForm, setSmsForm] = useState({
    providerType: 'TWILIO',
    accountSid: '',
    authToken: '',
    phoneNumber: '',
    isEnabled: false
  });

  const [whatsappForm, setWhatsappForm] = useState({
    providerType: 'META_WHATSAPP',
    accessToken: '',
    phoneNumberId: '',
    businessAccountId: '',
    isEnabled: false
  });

  const { data: configs, isLoading: configLoading } = useQuery({
    queryKey: ['notification-channel-configs'],
    queryFn: async () => {
      const { data } = await api.get('/notification-channels');
      return data as Record<string, ChannelConfig>;
    }
  });

  const { data: status, isLoading: statusLoading, refetch: refetchStatus } = useQuery({
    queryKey: ['notification-channel-status'],
    queryFn: async () => {
      const { data } = await api.get('/notification-channels/status');
      return data as Record<string, ChannelStatus>;
    }
  });

  useEffect(() => {
    if (configs?.EMAIL) {
      const settings = configs.EMAIL.settingsJson || {};
      setEmailForm({
        providerType: configs.EMAIL.providerType || 'SMTP',
        host: settings.host || '',
        port: settings.port || '587',
        secure: settings.secure || false,
        username: settings.username || '',
        password: settings.password || '',
        fromEmail: settings.fromEmail || configs.EMAIL.fromAddress || '',
        fromName: settings.fromName || configs.EMAIL.fromName || 'RadioPharma OMS',
        isEnabled: configs.EMAIL.isEnabled || false
      });
    }
    if (configs?.SMS) {
      const settings = configs.SMS.settingsJson || {};
      setSmsForm({
        providerType: configs.SMS.providerType || 'TWILIO',
        accountSid: settings.accountSid || '',
        authToken: settings.authToken || '',
        phoneNumber: settings.phoneNumber || '',
        isEnabled: configs.SMS.isEnabled || false
      });
    }
    if (configs?.WHATSAPP) {
      const settings = configs.WHATSAPP.settingsJson || {};
      setWhatsappForm({
        providerType: configs.WHATSAPP.providerType || 'META_WHATSAPP',
        accessToken: settings.accessToken || '',
        phoneNumberId: settings.phoneNumberId || '',
        businessAccountId: settings.businessAccountId || '',
        isEnabled: configs.WHATSAPP.isEnabled || false
      });
    }
  }, [configs]);

  const updateMutation = useMutation({
    mutationFn: async ({ channel, data }: { channel: string; data: any }) => {
      await api.put(`/notification-channels/${channel}`, data);
    },
    onSuccess: () => {
      toast.success('Settings Saved', 'Channel configuration updated successfully');
      queryClient.invalidateQueries({ queryKey: ['notification-channel-configs'] });
      queryClient.invalidateQueries({ queryKey: ['notification-channel-status'] });
    },
    onError: () => {
      toast.error('Save Failed', 'Failed to save channel configuration');
    }
  });

  const handleSaveEmail = async () => {
    const settingsJson = emailForm.providerType === 'SMTP' ? {
      host: emailForm.host,
      port: emailForm.port,
      secure: emailForm.secure,
      username: emailForm.username,
      password: emailForm.password,
      fromEmail: emailForm.fromEmail,
      fromName: emailForm.fromName
    } : {};
    
    updateMutation.mutate({
      channel: 'EMAIL',
      data: {
        providerType: emailForm.providerType,
        settingsJson,
        fromName: emailForm.fromName,
        fromAddress: emailForm.fromEmail,
        isEnabled: emailForm.isEnabled
      }
    });
  };

  const handleSaveSms = async () => {
    updateMutation.mutate({
      channel: 'SMS',
      data: {
        providerType: smsForm.providerType,
        settingsJson: {
          accountSid: smsForm.accountSid,
          authToken: smsForm.authToken,
          phoneNumber: smsForm.phoneNumber
        },
        isEnabled: smsForm.isEnabled
      }
    });
  };

  const handleSaveWhatsapp = async () => {
    updateMutation.mutate({
      channel: 'WHATSAPP',
      data: {
        providerType: whatsappForm.providerType,
        settingsJson: {
          accessToken: whatsappForm.accessToken,
          phoneNumberId: whatsappForm.phoneNumberId,
          businessAccountId: whatsappForm.businessAccountId
        },
        isEnabled: whatsappForm.isEnabled
      }
    });
  };

  const handleTestChannel = async (channel: string) => {
    if (!testRecipient) {
      toast.error('Recipient Required', 'Please enter a recipient to send the test to');
      return;
    }

    setTesting(true);
    try {
      const { data } = await api.post(`/notification-channels/${channel}/test`, { recipient: testRecipient });
      if (data.success) {
        toast.success('Test Sent', data.message || 'Test message sent successfully');
      } else {
        toast.error('Test Failed', data.message || 'Failed to send test message');
      }
      queryClient.invalidateQueries({ queryKey: ['notification-channel-configs'] });
    } catch (error: any) {
      toast.error('Test Failed', error.response?.data?.error || 'Failed to send test message');
    }
    setTesting(false);
  };

  if (configLoading || statusLoading) {
    return (
      <div className="loading-overlay">
        <div className="spinner" />
      </div>
    );
  }

  const renderInAppTab = () => (
    <div className="card" style={{ padding: '1.5rem' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
        <Bell size={24} style={{ color: 'var(--primary)' }} />
        <h3 style={{ margin: 0 }}>In-App Notifications</h3>
        <span className="badge badge-success" style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
          <CheckCircle size={12} /> Always Enabled
        </span>
      </div>
      <p style={{ color: 'var(--text-muted)', marginBottom: '1rem' }}>
        In-app notifications are always enabled and cannot be disabled. They appear in the notification bell 
        in the header and in the notification center.
      </p>
      <div className="card" style={{ padding: '1rem', background: 'var(--bg-secondary)' }}>
        <h4 style={{ marginBottom: '0.75rem' }}>Features</h4>
        <ul style={{ margin: 0, paddingLeft: '1.25rem', color: 'var(--text-muted)' }}>
          <li>Real-time notification bell with unread count</li>
          <li>Notification center with full history</li>
          <li>Click-to-navigate to related records</li>
          <li>Mark as read / Mark all as read</li>
          <li>Filter by notification type</li>
        </ul>
      </div>
    </div>
  );

  const renderEmailTab = () => {
    const channelStatus = status?.email;
    const isActive = channelStatus?.connected && emailForm.isEnabled;

    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
        <div className="card" style={{ padding: '1.5rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <Mail size={24} style={{ color: 'var(--primary)' }} />
              <h3 style={{ margin: 0 }}>Email Configuration</h3>
              {isActive && (
                <span className="badge badge-success">Active</span>
              )}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              {channelStatus?.connected ? (
                <span className="badge badge-success" style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                  <CheckCircle size={12} /> Connected
                </span>
              ) : (
                <span className="badge badge-danger" style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                  <XCircle size={12} /> Not Connected
                </span>
              )}
              <button className="btn btn-sm btn-outline" onClick={() => refetchStatus()}>
                <RefreshCw size={14} />
              </button>
            </div>
          </div>
          <p style={{ color: 'var(--text-muted)', marginBottom: '1.5rem' }}>
            Configure email notification settings
          </p>

          <div className="card" style={{ padding: '1.5rem', background: 'var(--bg-secondary)', marginBottom: '1.5rem' }}>
            <h4 style={{ marginBottom: '1rem' }}>Provider Settings</h4>
            <p style={{ color: 'var(--text-muted)', marginBottom: '1rem', fontSize: '0.875rem' }}>
              Select your email service provider
            </p>
            <div style={{ marginBottom: '1rem' }}>
              <label style={{ fontWeight: 500, marginBottom: '0.5rem', display: 'block' }}>Provider</label>
              <select
                className="form-control"
                value={emailForm.providerType}
                onChange={(e) => setEmailForm({ ...emailForm, providerType: e.target.value })}
                style={{ maxWidth: '300px' }}
              >
                {emailProviders.map(p => (
                  <option key={p.value} value={p.value}>{p.label}</option>
                ))}
              </select>
            </div>
          </div>

          {emailForm.providerType === 'SMTP' && (
            <div className="card" style={{ padding: '1.5rem', background: 'var(--bg-secondary)', marginBottom: '1.5rem' }}>
              <h4 style={{ marginBottom: '0.5rem' }}>Credentials</h4>
              <p style={{ color: 'var(--text-muted)', marginBottom: '1rem', fontSize: '0.875rem' }}>
                Enter your SMTP API credentials
              </p>
              
              <div className="grid" style={{ gridTemplateColumns: 'repeat(2, 1fr)', gap: '1rem', marginBottom: '1rem' }}>
                <div>
                  <label style={{ fontWeight: 500, marginBottom: '0.5rem', display: 'block' }}>
                    SMTP Host <span style={{ color: 'var(--danger)' }}>*</span>
                  </label>
                  <input
                    type="text"
                    className="form-control"
                    value={emailForm.host}
                    onChange={(e) => setEmailForm({ ...emailForm, host: e.target.value })}
                    placeholder="smtp.example.com"
                  />
                </div>
                <div>
                  <label style={{ fontWeight: 500, marginBottom: '0.5rem', display: 'block' }}>
                    SMTP Port <span style={{ color: 'var(--danger)' }}>*</span>
                  </label>
                  <input
                    type="text"
                    className="form-control"
                    value={emailForm.port}
                    onChange={(e) => setEmailForm({ ...emailForm, port: e.target.value })}
                    placeholder="587"
                  />
                </div>
              </div>

              <div style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={emailForm.secure}
                    onChange={(e) => setEmailForm({ ...emailForm, secure: e.target.checked })}
                  />
                  <span style={{ fontWeight: 500 }}>Use SSL/TLS</span>
                </label>
                <p style={{ color: 'var(--text-muted)', fontSize: '0.75rem', margin: '0.25rem 0 0 1.5rem' }}>
                  Enable secure connection for SMTP
                </p>
              </div>

              <div className="grid" style={{ gridTemplateColumns: 'repeat(2, 1fr)', gap: '1rem', marginBottom: '1rem' }}>
                <div>
                  <label style={{ fontWeight: 500, marginBottom: '0.5rem', display: 'block' }}>
                    Username <span style={{ color: 'var(--danger)' }}>*</span>
                  </label>
                  <input
                    type="text"
                    className="form-control"
                    value={emailForm.username}
                    onChange={(e) => setEmailForm({ ...emailForm, username: e.target.value })}
                    placeholder="your-username"
                  />
                </div>
                <div>
                  <label style={{ fontWeight: 500, marginBottom: '0.5rem', display: 'block' }}>
                    Password <span style={{ color: 'var(--danger)' }}>*</span>
                  </label>
                  <div style={{ position: 'relative' }}>
                    <input
                      type={showPassword.emailPassword ? 'text' : 'password'}
                      className="form-control"
                      value={emailForm.password}
                      onChange={(e) => setEmailForm({ ...emailForm, password: e.target.value })}
                      placeholder="Enter password"
                      style={{ paddingRight: '2.5rem' }}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword({ ...showPassword, emailPassword: !showPassword.emailPassword })}
                      style={{ 
                        position: 'absolute', 
                        right: '0.5rem', 
                        top: '50%', 
                        transform: 'translateY(-50%)',
                        background: 'none',
                        border: 'none',
                        cursor: 'pointer',
                        color: 'var(--text-muted)'
                      }}
                    >
                      {showPassword.emailPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </div>
              </div>

              <div className="grid" style={{ gridTemplateColumns: 'repeat(2, 1fr)', gap: '1rem' }}>
                <div>
                  <label style={{ fontWeight: 500, marginBottom: '0.5rem', display: 'block' }}>
                    From Email <span style={{ color: 'var(--danger)' }}>*</span>
                  </label>
                  <input
                    type="email"
                    className="form-control"
                    value={emailForm.fromEmail}
                    onChange={(e) => setEmailForm({ ...emailForm, fromEmail: e.target.value })}
                    placeholder="noreply@example.com"
                  />
                </div>
                <div>
                  <label style={{ fontWeight: 500, marginBottom: '0.5rem', display: 'block' }}>From Name</label>
                  <input
                    type="text"
                    className="form-control"
                    value={emailForm.fromName}
                    onChange={(e) => setEmailForm({ ...emailForm, fromName: e.target.value })}
                    placeholder="RadioPharma OMS"
                  />
                </div>
              </div>
            </div>
          )}

          {emailForm.providerType === 'RESEND' && (
            <div className="card" style={{ padding: '1rem', background: 'var(--info-bg)', marginBottom: '1.5rem' }}>
              <p style={{ margin: 0, color: 'var(--info)', fontSize: '0.875rem' }}>
                Resend credentials are managed through Replit integrations. Configure your Resend API key in the Replit secrets panel.
              </p>
            </div>
          )}

          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '1rem', background: 'var(--bg-secondary)', borderRadius: '8px' }}>
            <div>
              <label style={{ fontWeight: 600 }}>Enable Channel</label>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', margin: 0 }}>
                Allow notifications to be sent through this channel
              </p>
            </div>
            <label className="toggle-switch">
              <input
                type="checkbox"
                checked={emailForm.isEnabled}
                onChange={(e) => setEmailForm({ ...emailForm, isEnabled: e.target.checked })}
              />
              <span className="toggle-slider"></span>
            </label>
          </div>

          {channelStatus?.error && (
            <div style={{ padding: '0.75rem', background: 'var(--danger-bg)', borderRadius: '6px', display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--danger)', marginTop: '1rem' }}>
              <AlertCircle size={16} />
              <span style={{ fontSize: '0.875rem' }}>{channelStatus.error}</span>
            </div>
          )}

          <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '1.5rem' }}>
            <button className="btn btn-primary" onClick={handleSaveEmail} disabled={updateMutation.isPending}>
              <Save size={16} style={{ marginRight: '0.5rem' }} />
              Save Changes
            </button>
          </div>
        </div>

        {renderTestSection('EMAIL', 'email address', 'test@example.com')}
      </div>
    );
  };

  const renderSmsTab = () => {
    const channelStatus = status?.sms;
    const isActive = channelStatus?.connected && smsForm.isEnabled;

    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
        <div className="card" style={{ padding: '1.5rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <Phone size={24} style={{ color: 'var(--primary)' }} />
              <h3 style={{ margin: 0 }}>SMS Configuration</h3>
              {isActive && (
                <span className="badge badge-success">Active</span>
              )}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              {channelStatus?.connected ? (
                <span className="badge badge-success" style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                  <CheckCircle size={12} /> Connected
                </span>
              ) : (
                <span className="badge badge-danger" style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                  <XCircle size={12} /> Not Connected
                </span>
              )}
              <button className="btn btn-sm btn-outline" onClick={() => refetchStatus()}>
                <RefreshCw size={14} />
              </button>
            </div>
          </div>
          <p style={{ color: 'var(--text-muted)', marginBottom: '1.5rem' }}>
            Configure SMS notification settings
          </p>

          <div className="card" style={{ padding: '1.5rem', background: 'var(--bg-secondary)', marginBottom: '1.5rem' }}>
            <h4 style={{ marginBottom: '1rem' }}>Provider Settings</h4>
            <p style={{ color: 'var(--text-muted)', marginBottom: '1rem', fontSize: '0.875rem' }}>
              Select your SMS service provider
            </p>
            <div style={{ marginBottom: '1rem' }}>
              <label style={{ fontWeight: 500, marginBottom: '0.5rem', display: 'block' }}>Provider</label>
              <select
                className="form-control"
                value={smsForm.providerType}
                onChange={(e) => setSmsForm({ ...smsForm, providerType: e.target.value })}
                style={{ maxWidth: '300px' }}
              >
                {smsProviders.map(p => (
                  <option key={p.value} value={p.value}>{p.label}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="card" style={{ padding: '1.5rem', background: 'var(--bg-secondary)', marginBottom: '1.5rem' }}>
            <h4 style={{ marginBottom: '0.5rem' }}>Credentials</h4>
            <p style={{ color: 'var(--text-muted)', marginBottom: '1rem', fontSize: '0.875rem' }}>
              Enter your Twilio API credentials
            </p>
            
            <div style={{ marginBottom: '1rem' }}>
              <label style={{ fontWeight: 500, marginBottom: '0.5rem', display: 'block' }}>
                Account SID <span style={{ color: 'var(--danger)' }}>*</span>
              </label>
              <input
                type="text"
                className="form-control"
                value={smsForm.accountSid}
                onChange={(e) => setSmsForm({ ...smsForm, accountSid: e.target.value })}
                placeholder="AC..."
              />
            </div>

            <div style={{ marginBottom: '1rem' }}>
              <label style={{ fontWeight: 500, marginBottom: '0.5rem', display: 'block' }}>
                Auth Token <span style={{ color: 'var(--danger)' }}>*</span>
              </label>
              <div style={{ position: 'relative' }}>
                <input
                  type={showPassword.smsAuthToken ? 'text' : 'password'}
                  className="form-control"
                  value={smsForm.authToken}
                  onChange={(e) => setSmsForm({ ...smsForm, authToken: e.target.value })}
                  placeholder="Enter auth token"
                  style={{ paddingRight: '2.5rem' }}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword({ ...showPassword, smsAuthToken: !showPassword.smsAuthToken })}
                  style={{ 
                    position: 'absolute', 
                    right: '0.5rem', 
                    top: '50%', 
                    transform: 'translateY(-50%)',
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    color: 'var(--text-muted)'
                  }}
                >
                  {showPassword.smsAuthToken ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            <div>
              <label style={{ fontWeight: 500, marginBottom: '0.5rem', display: 'block' }}>
                Phone Number <span style={{ color: 'var(--danger)' }}>*</span>
              </label>
              <input
                type="tel"
                className="form-control"
                value={smsForm.phoneNumber}
                onChange={(e) => setSmsForm({ ...smsForm, phoneNumber: e.target.value })}
                placeholder="+1234567890"
              />
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '1rem', background: 'var(--bg-secondary)', borderRadius: '8px' }}>
            <div>
              <label style={{ fontWeight: 600 }}>Enable Channel</label>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', margin: 0 }}>
                Allow notifications to be sent through this channel
              </p>
            </div>
            <label className="toggle-switch">
              <input
                type="checkbox"
                checked={smsForm.isEnabled}
                onChange={(e) => setSmsForm({ ...smsForm, isEnabled: e.target.checked })}
              />
              <span className="toggle-slider"></span>
            </label>
          </div>

          {channelStatus?.error && (
            <div style={{ padding: '0.75rem', background: 'var(--danger-bg)', borderRadius: '6px', display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--danger)', marginTop: '1rem' }}>
              <AlertCircle size={16} />
              <span style={{ fontSize: '0.875rem' }}>{channelStatus.error}</span>
            </div>
          )}

          <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '1.5rem' }}>
            <button className="btn btn-primary" onClick={handleSaveSms} disabled={updateMutation.isPending}>
              <Save size={16} style={{ marginRight: '0.5rem' }} />
              Save Changes
            </button>
          </div>
        </div>

        {renderTestSection('SMS', 'phone number', '+966501234567')}
      </div>
    );
  };

  const renderWhatsappTab = () => {
    const channelStatus = status?.whatsapp;
    const isActive = channelStatus?.connected && whatsappForm.isEnabled;

    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
        <div className="card" style={{ padding: '1.5rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <MessageSquare size={24} style={{ color: 'var(--primary)' }} />
              <h3 style={{ margin: 0 }}>WhatsApp Configuration</h3>
              {isActive && (
                <span className="badge badge-success">Active</span>
              )}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              {channelStatus?.connected ? (
                <span className="badge badge-success" style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                  <CheckCircle size={12} /> Connected
                </span>
              ) : (
                <span className="badge badge-danger" style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                  <XCircle size={12} /> Not Connected
                </span>
              )}
              <button className="btn btn-sm btn-outline" onClick={() => refetchStatus()}>
                <RefreshCw size={14} />
              </button>
            </div>
          </div>
          <p style={{ color: 'var(--text-muted)', marginBottom: '1.5rem' }}>
            Configure WhatsApp notification settings
          </p>

          <div className="card" style={{ padding: '1.5rem', background: 'var(--bg-secondary)', marginBottom: '1.5rem' }}>
            <h4 style={{ marginBottom: '1rem' }}>Provider Settings</h4>
            <p style={{ color: 'var(--text-muted)', marginBottom: '1rem', fontSize: '0.875rem' }}>
              Select your WhatsApp service provider
            </p>
            <div style={{ marginBottom: '1rem' }}>
              <label style={{ fontWeight: 500, marginBottom: '0.5rem', display: 'block' }}>Provider</label>
              <select
                className="form-control"
                value={whatsappForm.providerType}
                onChange={(e) => setWhatsappForm({ ...whatsappForm, providerType: e.target.value })}
                style={{ maxWidth: '300px' }}
              >
                {whatsappProviders.map(p => (
                  <option key={p.value} value={p.value}>{p.label}</option>
                ))}
              </select>
            </div>
          </div>

          {whatsappForm.providerType === 'META_WHATSAPP' && (
            <div className="card" style={{ padding: '1.5rem', background: 'var(--bg-secondary)', marginBottom: '1.5rem' }}>
              <h4 style={{ marginBottom: '0.5rem' }}>Credentials</h4>
              <p style={{ color: 'var(--text-muted)', marginBottom: '1rem', fontSize: '0.875rem' }}>
                Enter your Meta API credentials
              </p>
              
              <div style={{ marginBottom: '1rem' }}>
                <label style={{ fontWeight: 500, marginBottom: '0.5rem', display: 'block' }}>
                  Access Token <span style={{ color: 'var(--danger)' }}>*</span>
                </label>
                <div style={{ position: 'relative' }}>
                  <input
                    type={showPassword.whatsappToken ? 'text' : 'password'}
                    className="form-control"
                    value={whatsappForm.accessToken}
                    onChange={(e) => setWhatsappForm({ ...whatsappForm, accessToken: e.target.value })}
                    placeholder="Enter access token"
                    style={{ paddingRight: '2.5rem' }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword({ ...showPassword, whatsappToken: !showPassword.whatsappToken })}
                    style={{ 
                      position: 'absolute', 
                      right: '0.5rem', 
                      top: '50%', 
                      transform: 'translateY(-50%)',
                      background: 'none',
                      border: 'none',
                      cursor: 'pointer',
                      color: 'var(--text-muted)'
                    }}
                  >
                    {showPassword.whatsappToken ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              <div style={{ marginBottom: '1rem' }}>
                <label style={{ fontWeight: 500, marginBottom: '0.5rem', display: 'block' }}>
                  Phone Number ID <span style={{ color: 'var(--danger)' }}>*</span>
                </label>
                <input
                  type="text"
                  className="form-control"
                  value={whatsappForm.phoneNumberId}
                  onChange={(e) => setWhatsappForm({ ...whatsappForm, phoneNumberId: e.target.value })}
                  placeholder="Enter phone number id"
                />
              </div>

              <div>
                <label style={{ fontWeight: 500, marginBottom: '0.5rem', display: 'block' }}>Business Account ID</label>
                <input
                  type="text"
                  className="form-control"
                  value={whatsappForm.businessAccountId}
                  onChange={(e) => setWhatsappForm({ ...whatsappForm, businessAccountId: e.target.value })}
                  placeholder="Enter business account id"
                />
              </div>
            </div>
          )}

          {whatsappForm.providerType === 'TWILIO' && (
            <div className="card" style={{ padding: '1rem', background: 'var(--info-bg)', marginBottom: '1.5rem' }}>
              <p style={{ margin: 0, color: 'var(--info)', fontSize: '0.875rem' }}>
                Twilio WhatsApp uses the same credentials as SMS. Configure your Twilio credentials in the SMS tab.
              </p>
            </div>
          )}

          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '1rem', background: 'var(--bg-secondary)', borderRadius: '8px' }}>
            <div>
              <label style={{ fontWeight: 600 }}>Enable Channel</label>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', margin: 0 }}>
                Allow notifications to be sent through this channel
              </p>
            </div>
            <label className="toggle-switch">
              <input
                type="checkbox"
                checked={whatsappForm.isEnabled}
                onChange={(e) => setWhatsappForm({ ...whatsappForm, isEnabled: e.target.checked })}
              />
              <span className="toggle-slider"></span>
            </label>
          </div>

          {channelStatus?.error && (
            <div style={{ padding: '0.75rem', background: 'var(--danger-bg)', borderRadius: '6px', display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--danger)', marginTop: '1rem' }}>
              <AlertCircle size={16} />
              <span style={{ fontSize: '0.875rem' }}>{channelStatus.error}</span>
            </div>
          )}

          <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '1.5rem' }}>
            <button className="btn btn-primary" onClick={handleSaveWhatsapp} disabled={updateMutation.isPending}>
              <Save size={16} style={{ marginRight: '0.5rem' }} />
              Save Changes
            </button>
          </div>
        </div>

        {renderTestSection('WHATSAPP', 'phone number', '+966501234567')}
      </div>
    );
  };

  const renderTestSection = (channel: string, recipientLabel: string, placeholder: string) => {
    const config = configs?.[channel];
    
    return (
      <>
        <div className="card" style={{ padding: '1.5rem' }}>
          <h4 style={{ marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Send size={18} />
            Send Test Message
          </h4>
          <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'flex-end' }}>
            <div style={{ flex: 1, maxWidth: '400px' }}>
              <label style={{ fontWeight: 500, marginBottom: '0.5rem', display: 'block' }}>
                Recipient {recipientLabel}
              </label>
              <input
                type={channel === 'EMAIL' ? 'email' : 'tel'}
                className="form-control"
                value={testRecipient}
                onChange={(e) => setTestRecipient(e.target.value)}
                placeholder={placeholder}
              />
            </div>
            <button
              className="btn btn-primary"
              onClick={() => handleTestChannel(channel)}
              disabled={testing}
              style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}
            >
              {testing ? <div className="spinner" style={{ width: '16px', height: '16px' }} /> : <Send size={16} />}
              Send Test
            </button>
          </div>

          {config?.lastTestedAt && (
            <div style={{ marginTop: '1rem', padding: '0.75rem', background: 'var(--bg-secondary)', borderRadius: '6px', fontSize: '0.875rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                {config.lastTestStatus === 'SENT' ? (
                  <CheckCircle size={14} style={{ color: 'var(--success)' }} />
                ) : (
                  <XCircle size={14} style={{ color: 'var(--danger)' }} />
                )}
                <span>
                  Last test: {new Date(config.lastTestedAt).toLocaleString()} - 
                  <span style={{ color: config.lastTestStatus === 'SENT' ? 'var(--success)' : 'var(--danger)', marginLeft: '0.25rem' }}>
                    {config.lastTestStatus === 'SENT' ? 'Successful' : 'Failed'}
                  </span>
                </span>
              </div>
              {config.lastTestMessage && config.lastTestStatus !== 'SENT' && (
                <p style={{ margin: '0.5rem 0 0 0', color: 'var(--text-muted)' }}>{config.lastTestMessage}</p>
              )}
            </div>
          )}
        </div>

        <div className="card" style={{ padding: '1.5rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <h4 style={{ marginBottom: '0.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <FileText size={18} />
                Delivery Logs
              </h4>
              <p style={{ color: 'var(--text-muted)', margin: 0, fontSize: '0.875rem' }}>
                View detailed logs of all delivery attempts
              </p>
            </div>
            <Link to="/admin/notification-delivery-logs" className="btn btn-outline">
              View Logs
            </Link>
          </div>
        </div>
      </>
    );
  };

  return (
    <div style={{ padding: '1.5rem' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <Link to="/settings" className="btn btn-outline btn-sm">
            <ArrowLeft size={16} />
          </Link>
          <div>
            <h1 style={{ margin: 0, fontSize: '1.5rem' }}>Notification Channels</h1>
            <p style={{ margin: 0, color: 'var(--text-muted)', fontSize: '0.875rem' }}>
              Configure email, SMS, and WhatsApp notification channels
            </p>
          </div>
        </div>
      </div>

      <div style={{ display: 'flex', borderBottom: '1px solid var(--border)', marginBottom: '1.5rem' }}>
        {tabs.map((tab) => {
          const isEnabled = tab.id === 'EMAIL' ? emailForm.isEnabled : 
                           tab.id === 'SMS' ? smsForm.isEnabled : 
                           tab.id === 'WHATSAPP' ? whatsappForm.isEnabled : true;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`tab-button ${activeTab === tab.id ? 'active' : ''}`}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                padding: '0.75rem 1.5rem',
                border: 'none',
                background: 'transparent',
                cursor: 'pointer',
                borderBottom: activeTab === tab.id ? '2px solid var(--primary)' : '2px solid transparent',
                color: activeTab === tab.id ? 'var(--primary)' : 'var(--text-muted)',
                fontWeight: activeTab === tab.id ? 600 : 400
              }}
            >
              <tab.icon size={18} />
              {tab.label}
              {tab.id !== 'IN_APP' && isEnabled && (
                <span className="badge badge-success" style={{ padding: '0.125rem 0.375rem', fontSize: '0.625rem' }}>ON</span>
              )}
              {tab.id !== 'IN_APP' && !isEnabled && (
                <span className="badge badge-secondary" style={{ padding: '0.125rem 0.375rem', fontSize: '0.625rem' }}>OFF</span>
              )}
            </button>
          );
        })}
      </div>

      {activeTab === 'IN_APP' && renderInAppTab()}
      {activeTab === 'EMAIL' && renderEmailTab()}
      {activeTab === 'SMS' && renderSmsTab()}
      {activeTab === 'WHATSAPP' && renderWhatsappTab()}
    </div>
  );
}
