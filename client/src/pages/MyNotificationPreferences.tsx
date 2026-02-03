import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import api from '../lib/api';
import { 
  Bell, Mail, Phone, MessageSquare, ArrowLeft, Save,
  AlertCircle, Info
} from 'lucide-react';
import { useToast } from '../components/ui/Toast';

interface NotificationPreferences {
  id: string;
  emailEnabled: boolean;
  smsEnabled: boolean;
  whatsappEnabled: boolean;
  minSeverity: string;
  emailGlobalEnabled?: boolean;
  smsGlobalEnabled?: boolean;
  whatsappGlobalEnabled?: boolean;
}

const severityLevels = [
  { value: 'INFO', label: 'All Notifications', description: 'Receive all notifications including informational updates' },
  { value: 'ACTION_REQUIRED', label: 'Action Required & Above', description: 'Only notifications that require your action' },
  { value: 'WARNING', label: 'Warnings & Critical Only', description: 'Only warnings and critical alerts' },
  { value: 'CRITICAL', label: 'Critical Only', description: 'Only receive critical system alerts' }
];

export default function MyNotificationPreferences() {
  const queryClient = useQueryClient();
  const toast = useToast();
  const [preferences, setPreferences] = useState<NotificationPreferences | null>(null);
  const [hasChanges, setHasChanges] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ['user-notification-preferences'],
    queryFn: async () => {
      const { data } = await api.get('/notification-channels/user-preferences');
      return data as NotificationPreferences;
    }
  });

  useEffect(() => {
    if (data) {
      setPreferences(data);
    }
  }, [data]);

  const saveMutation = useMutation({
    mutationFn: async (prefs: Partial<NotificationPreferences>) => {
      await api.put('/notification-channels/user-preferences', prefs);
    },
    onSuccess: () => {
      toast.success('Preferences Saved', 'Your notification preferences have been updated');
      queryClient.invalidateQueries({ queryKey: ['user-notification-preferences'] });
      setHasChanges(false);
    },
    onError: () => {
      toast.error('Save Failed', 'Failed to save notification preferences');
    }
  });

  const handleChange = (field: keyof NotificationPreferences, value: boolean | string) => {
    if (preferences) {
      setPreferences({ ...preferences, [field]: value });
      setHasChanges(true);
    }
  };

  const handleSave = () => {
    if (preferences) {
      saveMutation.mutate({
        emailEnabled: preferences.emailEnabled,
        smsEnabled: preferences.smsEnabled,
        whatsappEnabled: preferences.whatsappEnabled,
        minSeverity: preferences.minSeverity
      });
    }
  };

  if (isLoading || !preferences) {
    return (
      <div className="loading-overlay">
        <div className="spinner" />
      </div>
    );
  }

  const renderChannelToggle = (
    channel: 'email' | 'sms' | 'whatsapp',
    icon: any,
    label: string,
    enabled: boolean,
    globalEnabled: boolean | undefined,
    onChange: (value: boolean) => void
  ) => {
    const Icon = icon;
    const isDisabledByAdmin = globalEnabled === false;

    return (
      <div 
        className="card" 
        style={{ 
          padding: '1.25rem',
          opacity: isDisabledByAdmin ? 0.6 : 1
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <Icon size={24} style={{ color: 'var(--primary)' }} />
            <div>
              <h4 style={{ margin: 0 }}>{label}</h4>
              <p style={{ margin: 0, fontSize: '0.875rem', color: 'var(--text-muted)' }}>
                Receive notifications via {label.toLowerCase()}
              </p>
            </div>
          </div>
          <label className="switch" style={{ position: 'relative' }}>
            <input
              type="checkbox"
              checked={enabled && !isDisabledByAdmin}
              disabled={isDisabledByAdmin}
              onChange={(e) => onChange(e.target.checked)}
            />
            <span className="slider"></span>
          </label>
        </div>
        {isDisabledByAdmin && (
          <div style={{ 
            marginTop: '0.75rem', 
            padding: '0.5rem 0.75rem', 
            background: 'var(--warning-bg)', 
            borderRadius: '4px',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            fontSize: '0.875rem',
            color: 'var(--warning)'
          }}>
            <AlertCircle size={14} />
            This channel has been disabled by an administrator
          </div>
        )}
      </div>
    );
  };

  return (
    <div style={{ padding: '1.5rem', maxWidth: '800px', margin: '0 auto' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <Link to="/profile" className="btn btn-outline btn-sm">
            <ArrowLeft size={16} />
          </Link>
          <div>
            <h1 style={{ margin: 0, fontSize: '1.5rem' }}>Notification Preferences</h1>
            <p style={{ margin: 0, color: 'var(--text-muted)', fontSize: '0.875rem' }}>
              Choose how you want to receive notifications
            </p>
          </div>
        </div>
        <button 
          className="btn btn-primary" 
          onClick={handleSave}
          disabled={!hasChanges || saveMutation.isPending}
        >
          {saveMutation.isPending ? (
            <div className="spinner" style={{ width: '16px', height: '16px' }} />
          ) : (
            <Save size={16} />
          )}
          Save Changes
        </button>
      </div>

      <div style={{ marginBottom: '2rem' }}>
        <h3 style={{ marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Bell size={20} />
          Notification Channels
        </h3>
        <p style={{ color: 'var(--text-muted)', marginBottom: '1rem' }}>
          Select which channels you want to receive notifications on. In-app notifications are always enabled.
        </p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          <div className="card" style={{ padding: '1.25rem', background: 'var(--bg-secondary)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <Bell size={24} style={{ color: 'var(--primary)' }} />
              <div style={{ flex: 1 }}>
                <h4 style={{ margin: 0 }}>In-App Notifications</h4>
                <p style={{ margin: 0, fontSize: '0.875rem', color: 'var(--text-muted)' }}>
                  Always enabled - notifications appear in the notification bell
                </p>
              </div>
              <span className="badge badge-success">Always On</span>
            </div>
          </div>

          {renderChannelToggle(
            'email',
            Mail,
            'Email',
            preferences.emailEnabled,
            preferences.emailGlobalEnabled,
            (value) => handleChange('emailEnabled', value)
          )}

          {renderChannelToggle(
            'sms',
            Phone,
            'SMS',
            preferences.smsEnabled,
            preferences.smsGlobalEnabled,
            (value) => handleChange('smsEnabled', value)
          )}

          {renderChannelToggle(
            'whatsapp',
            MessageSquare,
            'WhatsApp',
            preferences.whatsappEnabled,
            preferences.whatsappGlobalEnabled,
            (value) => handleChange('whatsappEnabled', value)
          )}
        </div>
      </div>

      <div>
        <h3 style={{ marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Info size={20} />
          Notification Threshold
        </h3>
        <p style={{ color: 'var(--text-muted)', marginBottom: '1rem' }}>
          Set the minimum severity level for notifications you want to receive.
        </p>

        <div className="card" style={{ padding: '1.25rem' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {severityLevels.map((level) => (
              <label 
                key={level.value} 
                style={{ 
                  display: 'flex', 
                  alignItems: 'flex-start', 
                  gap: '0.75rem',
                  padding: '0.75rem',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  background: preferences.minSeverity === level.value ? 'var(--primary-bg)' : 'transparent',
                  border: preferences.minSeverity === level.value ? '1px solid var(--primary)' : '1px solid transparent'
                }}
              >
                <input
                  type="radio"
                  name="severity"
                  value={level.value}
                  checked={preferences.minSeverity === level.value}
                  onChange={(e) => handleChange('minSeverity', e.target.value)}
                  style={{ marginTop: '0.125rem' }}
                />
                <div>
                  <span style={{ fontWeight: 500 }}>{level.label}</span>
                  <p style={{ margin: 0, fontSize: '0.875rem', color: 'var(--text-muted)' }}>
                    {level.description}
                  </p>
                </div>
              </label>
            ))}
          </div>
        </div>
      </div>

      <style>{`
        .switch {
          position: relative;
          display: inline-block;
          width: 48px;
          height: 26px;
        }
        .switch input {
          opacity: 0;
          width: 0;
          height: 0;
        }
        .slider {
          position: absolute;
          cursor: pointer;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background-color: var(--bg-tertiary);
          transition: 0.3s;
          border-radius: 26px;
        }
        .slider:before {
          position: absolute;
          content: "";
          height: 20px;
          width: 20px;
          left: 3px;
          bottom: 3px;
          background-color: white;
          transition: 0.3s;
          border-radius: 50%;
        }
        input:checked + .slider {
          background-color: var(--primary);
        }
        input:checked + .slider:before {
          transform: translateX(22px);
        }
        input:disabled + .slider {
          opacity: 0.5;
          cursor: not-allowed;
        }
      `}</style>
    </div>
  );
}
