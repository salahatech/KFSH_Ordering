import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import api from '../../lib/api';
import { 
  Bell, Mail, MessageSquare, Phone, ArrowLeft, Save, 
  CheckCircle, XCircle, Send, Settings, Power, AlertCircle,
  FileText, RefreshCw
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

export default function NotificationChannels() {
  const queryClient = useQueryClient();
  const toast = useToast();
  const [activeTab, setActiveTab] = useState('EMAIL');
  const [testRecipient, setTestRecipient] = useState('');
  const [testing, setTesting] = useState(false);

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

  const updateMutation = useMutation({
    mutationFn: async ({ channel, data }: { channel: string; data: Partial<ChannelConfig> }) => {
      await api.put(`/notification-channels/${channel}`, data);
    },
    onSuccess: () => {
      toast.success('Settings Saved', 'Channel configuration updated successfully');
      queryClient.invalidateQueries({ queryKey: ['notification-channel-configs'] });
    },
    onError: () => {
      toast.error('Save Failed', 'Failed to save channel configuration');
    }
  });

  const handleToggleChannel = async (channel: string, isEnabled: boolean) => {
    updateMutation.mutate({ channel, data: { isEnabled } });
  };

  const handleSaveConfig = async (channel: string, data: Partial<ChannelConfig>) => {
    updateMutation.mutate({ channel, data });
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

  const currentConfig = configs?.[activeTab];
  const currentStatus = status?.[activeTab.toLowerCase()];

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

  const renderChannelTab = (channel: 'EMAIL' | 'SMS' | 'WHATSAPP') => {
    const config = configs?.[channel];
    const channelStatus = channel === 'EMAIL' ? status?.email : channel === 'SMS' ? status?.sms : status?.whatsapp;
    const isEmail = channel === 'EMAIL';
    const icon = isEmail ? Mail : channel === 'SMS' ? Phone : MessageSquare;
    const Icon = icon;
    const channelName = channel === 'WHATSAPP' ? 'WhatsApp' : channel.charAt(0) + channel.slice(1).toLowerCase();
    const recipientLabel = isEmail ? 'email address' : 'phone number';
    const recipientPlaceholder = isEmail ? 'test@example.com' : '+966501234567';

    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
        <div className="card" style={{ padding: '1.5rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <Icon size={24} style={{ color: 'var(--primary)' }} />
              <h3 style={{ margin: 0 }}>{channelName} Channel</h3>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
              {channelStatus?.connected ? (
                <span className="badge badge-success" style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                  <CheckCircle size={12} /> Provider Connected
                </span>
              ) : (
                <span className="badge badge-danger" style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                  <XCircle size={12} /> Provider Not Connected
                </span>
              )}
              <button
                className="btn btn-sm btn-outline"
                onClick={() => refetchStatus()}
                style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}
              >
                <RefreshCw size={14} />
                Refresh
              </button>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1.5rem', padding: '1rem', background: 'var(--bg-secondary)', borderRadius: '8px' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={config?.isEnabled ?? false}
                onChange={(e) => handleToggleChannel(channel, e.target.checked)}
                style={{ width: '20px', height: '20px' }}
              />
              <Power size={18} />
              <span style={{ fontWeight: 600 }}>Enable {channelName} Channel</span>
            </label>
            {!config?.isEnabled && (
              <span style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>
                When disabled, no {channelName.toLowerCase()} notifications will be sent
              </span>
            )}
          </div>

          <div className="grid" style={{ gridTemplateColumns: 'repeat(2, 1fr)', gap: '1rem', marginBottom: '1.5rem' }}>
            <div>
              <label style={{ fontWeight: 500, marginBottom: '0.25rem', display: 'block' }}>Provider</label>
              <p style={{ color: 'var(--text-muted)', margin: 0 }}>{channelStatus?.provider || config?.providerType || 'Not configured'}</p>
            </div>
            <div>
              <label style={{ fontWeight: 500, marginBottom: '0.25rem', display: 'block' }}>
                {isEmail ? 'From Address' : 'Phone Number'}
              </label>
              <p style={{ color: 'var(--text-muted)', margin: 0 }}>
                {isEmail ? channelStatus?.fromAddress : channelStatus?.phoneNumber || 'Not configured'}
              </p>
            </div>
          </div>

          {isEmail && (
            <div style={{ marginBottom: '1.5rem' }}>
              <label style={{ fontWeight: 500, marginBottom: '0.5rem', display: 'block' }}>From Name</label>
              <input
                type="text"
                className="form-control"
                value={config?.fromName || 'RadioPharma OMS'}
                onChange={(e) => handleSaveConfig(channel, { fromName: e.target.value })}
                placeholder="RadioPharma OMS"
                style={{ maxWidth: '300px' }}
              />
              <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
                Display name shown in email recipients' inbox
              </p>
            </div>
          )}

          {channelStatus?.error && (
            <div style={{ padding: '0.75rem', background: 'var(--danger-bg)', borderRadius: '6px', display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--danger)', marginBottom: '1rem' }}>
              <AlertCircle size={16} />
              <span style={{ fontSize: '0.875rem' }}>{channelStatus.error}</span>
            </div>
          )}
        </div>

        <div className="card" style={{ padding: '1.5rem' }}>
          <h4 style={{ marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Send size={18} />
            Send Test {channelName}
          </h4>
          <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'flex-end' }}>
            <div style={{ flex: 1, maxWidth: '400px' }}>
              <label style={{ fontWeight: 500, marginBottom: '0.5rem', display: 'block' }}>
                Recipient {recipientLabel}
              </label>
              <input
                type={isEmail ? 'email' : 'tel'}
                className="form-control"
                value={testRecipient}
                onChange={(e) => setTestRecipient(e.target.value)}
                placeholder={recipientPlaceholder}
              />
            </div>
            <button
              className="btn btn-primary"
              onClick={() => handleTestChannel(channel)}
              disabled={testing || !channelStatus?.connected}
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
                View detailed logs of all {channelName.toLowerCase()} delivery attempts
              </p>
            </div>
            <Link to="/admin/notification-delivery-logs" className="btn btn-outline">
              View Logs
            </Link>
          </div>
        </div>
      </div>
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
        {tabs.map((tab) => (
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
            {tab.id !== 'IN_APP' && configs?.[tab.id]?.isEnabled && (
              <span className="badge badge-success" style={{ padding: '0.125rem 0.375rem', fontSize: '0.625rem' }}>ON</span>
            )}
            {tab.id !== 'IN_APP' && !configs?.[tab.id]?.isEnabled && (
              <span className="badge badge-secondary" style={{ padding: '0.125rem 0.375rem', fontSize: '0.625rem' }}>OFF</span>
            )}
          </button>
        ))}
      </div>

      {activeTab === 'IN_APP' && renderInAppTab()}
      {activeTab === 'EMAIL' && renderChannelTab('EMAIL')}
      {activeTab === 'SMS' && renderChannelTab('SMS')}
      {activeTab === 'WHATSAPP' && renderChannelTab('WHATSAPP')}
    </div>
  );
}
