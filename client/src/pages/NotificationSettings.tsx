import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../lib/api';
import toast from 'react-hot-toast';
import { Mail, MessageSquare, Phone, Settings, TestTube, CheckCircle, XCircle, Loader2, Save } from 'lucide-react';

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

export default function NotificationSettings() {
  const queryClient = useQueryClient();
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
      toast.success('Settings saved successfully');
      queryClient.invalidateQueries({ queryKey: ['notification-settings'] });
    },
    onError: () => {
      toast.error('Failed to save settings');
    }
  });

  const handleSave = () => {
    saveMutation.mutate(settings);
  };

  const handleTestEmail = async () => {
    setTesting('email');
    try {
      const { data } = await api.get('/notification-settings/test/email');
      toast.success(data.message || 'Test email sent');
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Email test failed');
    }
    setTesting(null);
  };

  const handleTestSMS = async () => {
    if (!testPhone) {
      toast.error('Please enter a phone number');
      return;
    }
    setTesting('sms');
    try {
      const { data } = await api.get(`/notification-settings/test/sms?to=${encodeURIComponent(testPhone)}`);
      toast.success(data.message || 'Test SMS sent');
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'SMS test failed');
    }
    setTesting(null);
  };

  const handleTestWhatsApp = async () => {
    if (!testPhone) {
      toast.error('Please enter a phone number');
      return;
    }
    setTesting('whatsapp');
    try {
      const { data } = await api.get(`/notification-settings/test/whatsapp?to=${encodeURIComponent(testPhone)}`);
      toast.success(data.message || 'Test WhatsApp sent');
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'WhatsApp test failed');
    }
    setTesting(null);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Settings className="w-8 h-8 text-blue-600" />
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Notification Settings</h1>
            <p className="text-gray-500">Configure email, SMS, and WhatsApp notifications</p>
          </div>
        </div>
        <button
          onClick={handleSave}
          disabled={saveMutation.isPending}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
        >
          {saveMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          Save Changes
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <div className="bg-white rounded-lg border p-4">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <Mail className="w-5 h-5 text-blue-600" />
              <span className="font-medium">Email</span>
            </div>
            {status?.email.connected ? (
              <span className="flex items-center gap-1 text-green-600 text-sm">
                <CheckCircle className="w-4 h-4" /> Connected
              </span>
            ) : (
              <span className="flex items-center gap-1 text-red-600 text-sm">
                <XCircle className="w-4 h-4" /> Disconnected
              </span>
            )}
          </div>
          <p className="text-sm text-gray-500 mb-2">Provider: {status?.email.provider || 'Resend'}</p>
          <button
            onClick={handleTestEmail}
            disabled={testing === 'email'}
            className="flex items-center gap-1 text-sm text-blue-600 hover:text-blue-700"
          >
            {testing === 'email' ? <Loader2 className="w-3 h-3 animate-spin" /> : <TestTube className="w-3 h-3" />}
            Send Test
          </button>
        </div>

        <div className="bg-white rounded-lg border p-4">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <Phone className="w-5 h-5 text-green-600" />
              <span className="font-medium">SMS</span>
            </div>
            {status?.sms.connected ? (
              <span className="flex items-center gap-1 text-green-600 text-sm">
                <CheckCircle className="w-4 h-4" /> Connected
              </span>
            ) : (
              <span className="flex items-center gap-1 text-red-600 text-sm">
                <XCircle className="w-4 h-4" /> Disconnected
              </span>
            )}
          </div>
          <p className="text-sm text-gray-500 mb-1">Provider: {status?.sms.provider || 'Twilio'}</p>
          {status?.sms.phoneNumber && (
            <p className="text-xs text-gray-400 mb-2">From: {status.sms.phoneNumber}</p>
          )}
          <button
            onClick={handleTestSMS}
            disabled={testing === 'sms' || !status?.sms.connected}
            className="flex items-center gap-1 text-sm text-blue-600 hover:text-blue-700 disabled:text-gray-400"
          >
            {testing === 'sms' ? <Loader2 className="w-3 h-3 animate-spin" /> : <TestTube className="w-3 h-3" />}
            Send Test
          </button>
        </div>

        <div className="bg-white rounded-lg border p-4">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <MessageSquare className="w-5 h-5 text-green-500" />
              <span className="font-medium">WhatsApp</span>
            </div>
            {status?.whatsapp.connected ? (
              <span className="flex items-center gap-1 text-green-600 text-sm">
                <CheckCircle className="w-4 h-4" /> Connected
              </span>
            ) : (
              <span className="flex items-center gap-1 text-red-600 text-sm">
                <XCircle className="w-4 h-4" /> Disconnected
              </span>
            )}
          </div>
          <p className="text-sm text-gray-500 mb-1">Provider: {status?.whatsapp.provider || 'Twilio'}</p>
          {status?.whatsapp.phoneNumber && (
            <p className="text-xs text-gray-400 mb-2">From: {status.whatsapp.phoneNumber}</p>
          )}
          <button
            onClick={handleTestWhatsApp}
            disabled={testing === 'whatsapp' || !status?.whatsapp.connected}
            className="flex items-center gap-1 text-sm text-blue-600 hover:text-blue-700 disabled:text-gray-400"
          >
            {testing === 'whatsapp' ? <Loader2 className="w-3 h-3 animate-spin" /> : <TestTube className="w-3 h-3" />}
            Send Test
          </button>
        </div>
      </div>

      <div className="bg-white rounded-lg border p-4 mb-6">
        <h3 className="font-medium mb-3">Test Phone Number</h3>
        <p className="text-sm text-gray-500 mb-2">Enter a phone number to test SMS and WhatsApp (include country code, e.g., +1234567890)</p>
        <input
          type="tel"
          value={testPhone}
          onChange={(e) => setTestPhone(e.target.value)}
          placeholder="+1234567890"
          className="w-full max-w-xs px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
        />
      </div>

      <div className="bg-white rounded-lg border mb-6">
        <div className="p-4 border-b">
          <h2 className="text-lg font-semibold">Channel Settings</h2>
        </div>
        <div className="p-4 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <label className="flex items-center gap-3">
              <input
                type="checkbox"
                checked={settings['notification_email_enabled'] === true || settings['notification_email_enabled'] === 'true'}
                onChange={(e) => setSettings({ ...settings, notification_email_enabled: e.target.checked })}
                className="w-5 h-5 text-blue-600 rounded"
              />
              <span>Enable Email Notifications</span>
            </label>
            <label className="flex items-center gap-3">
              <input
                type="checkbox"
                checked={settings['notification_sms_enabled'] === true || settings['notification_sms_enabled'] === 'true'}
                onChange={(e) => setSettings({ ...settings, notification_sms_enabled: e.target.checked })}
                className="w-5 h-5 text-blue-600 rounded"
              />
              <span>Enable SMS Notifications</span>
            </label>
            <label className="flex items-center gap-3">
              <input
                type="checkbox"
                checked={settings['notification_whatsapp_enabled'] === true || settings['notification_whatsapp_enabled'] === 'true'}
                onChange={(e) => setSettings({ ...settings, notification_whatsapp_enabled: e.target.checked })}
                className="w-5 h-5 text-blue-600 rounded"
              />
              <span>Enable WhatsApp Notifications</span>
            </label>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-lg border mb-6">
        <div className="p-4 border-b">
          <h2 className="text-lg font-semibold">Email Settings</h2>
        </div>
        <div className="p-4 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Sender Email Address</label>
            <input
              type="email"
              value={settings['notification_email_from_address'] || ''}
              onChange={(e) => setSettings({ ...settings, notification_email_from_address: e.target.value })}
              className="w-full max-w-md px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
              placeholder="noreply@radiopharma.com"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Sender Display Name</label>
            <input
              type="text"
              value={settings['notification_email_from_name'] || ''}
              onChange={(e) => setSettings({ ...settings, notification_email_from_name: e.target.value })}
              className="w-full max-w-md px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
              placeholder="RadioPharma OMS"
            />
          </div>
        </div>
      </div>

      <div className="bg-white rounded-lg border">
        <div className="p-4 border-b">
          <h2 className="text-lg font-semibold">Event Channel Configuration</h2>
          <p className="text-sm text-gray-500">Configure which channels to use for different notification types</p>
        </div>
        <div className="p-4 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Order Notifications</label>
              <select
                value={settings['notification_order_events'] || 'email'}
                onChange={(e) => setSettings({ ...settings, notification_order_events: e.target.value })}
                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
              >
                {CHANNEL_OPTIONS.map(opt => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
              <p className="text-xs text-gray-400 mt-1">Order status updates, confirmations</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Batch/Production Notifications</label>
              <select
                value={settings['notification_batch_events'] || 'email'}
                onChange={(e) => setSettings({ ...settings, notification_batch_events: e.target.value })}
                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
              >
                {CHANNEL_OPTIONS.map(opt => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
              <p className="text-xs text-gray-400 mt-1">Production status, QC results, batch releases</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Delivery Notifications</label>
              <select
                value={settings['notification_delivery_events'] || 'email,sms'}
                onChange={(e) => setSettings({ ...settings, notification_delivery_events: e.target.value })}
                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
              >
                {CHANNEL_OPTIONS.map(opt => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
              <p className="text-xs text-gray-400 mt-1">Shipment dispatched, delivery updates, ETA changes</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Approval Notifications</label>
              <select
                value={settings['notification_approval_events'] || 'email'}
                onChange={(e) => setSettings({ ...settings, notification_approval_events: e.target.value })}
                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
              >
                {CHANNEL_OPTIONS.map(opt => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
              <p className="text-xs text-gray-400 mt-1">Pending approvals, approval/rejection outcomes</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Invoice Notifications</label>
              <select
                value={settings['notification_invoice_events'] || 'email'}
                onChange={(e) => setSettings({ ...settings, notification_invoice_events: e.target.value })}
                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
              >
                {CHANNEL_OPTIONS.map(opt => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
              <p className="text-xs text-gray-400 mt-1">Invoice generated, payment reminders, receipts</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Default Channel</label>
              <select
                value={settings['notification_default_channel'] || 'email'}
                onChange={(e) => setSettings({ ...settings, notification_default_channel: e.target.value })}
                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
              >
                <option value="email">Email</option>
                <option value="sms">SMS</option>
                <option value="whatsapp">WhatsApp</option>
                <option value="all">All Channels</option>
              </select>
              <p className="text-xs text-gray-400 mt-1">Fallback channel for uncategorized notifications</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
