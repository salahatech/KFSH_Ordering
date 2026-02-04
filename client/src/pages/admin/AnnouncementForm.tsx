import { useState, useEffect } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../../lib/api';
import { ArrowLeft, Save, AlertTriangle, Info, AlertCircle, Play } from 'lucide-react';
import { useToast } from '../../components/ui/Toast';

interface AudienceTarget {
  audienceType: 'ROLE' | 'CUSTOMER' | 'USER';
  roleCode?: string;
  customerId?: string;
  userId?: string;
}

export default function AnnouncementForm() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const toast = useToast();
  const isEdit = !!id;

  const [formData, setFormData] = useState({
    title: '',
    body: '',
    severity: 'INFO' as 'INFO' | 'WARNING' | 'CRITICAL',
    publishMode: 'IMMEDIATE' as 'IMMEDIATE' | 'SCHEDULED',
    startAt: '',
    endAt: '',
    sendEmail: false,
    sendSms: false,
    sendWhatsapp: false,
    targetRoleCodes: [] as string[],
    specificCustomerIds: [] as string[],
    specificUserIds: [] as string[],
  });

  const { data: existing, isLoading: loadingExisting } = useQuery({
    queryKey: ['announcement', id],
    queryFn: async () => {
      const { data } = await api.get(`/announcements/admin/announcements/${id}`);
      return data;
    },
    enabled: isEdit,
  });

  const { data: roles } = useQuery({
    queryKey: ['roles'],
    queryFn: async () => {
      const { data } = await api.get('/roles');
      return data;
    },
  });

  const { data: customers } = useQuery({
    queryKey: ['customers'],
    queryFn: async () => {
      const { data } = await api.get('/customers');
      return data;
    },
  });

  const { data: users } = useQuery({
    queryKey: ['users'],
    queryFn: async () => {
      const { data } = await api.get('/users');
      return data;
    },
  });

  useEffect(() => {
    if (existing) {
      const roleAudiences = existing.audiences.filter((a: any) => a.audienceType === 'ROLE');
      const customerAudiences = existing.audiences.filter((a: any) => a.audienceType === 'CUSTOMER');
      const userAudiences = existing.audiences.filter((a: any) => a.audienceType === 'USER');

      setFormData({
        title: existing.title,
        body: existing.body,
        severity: existing.severity,
        publishMode: existing.publishMode,
        startAt: existing.startAt ? new Date(existing.startAt).toISOString().slice(0, 16) : '',
        endAt: existing.endAt ? new Date(existing.endAt).toISOString().slice(0, 16) : '',
        sendEmail: existing.sendEmail,
        sendSms: existing.sendSms,
        sendWhatsapp: existing.sendWhatsapp,
        targetRoleCodes: roleAudiences.map((a: any) => a.roleCode),
        specificCustomerIds: customerAudiences.filter((a: any) => a.customerId).map((a: any) => a.customerId),
        specificUserIds: userAudiences.map((a: any) => a.userId),
      });
    }
  }, [existing]);

  const saveMutation = useMutation({
    mutationFn: async (data: any) => {
      if (isEdit) {
        return api.put(`/announcements/admin/announcements/${id}`, data);
      }
      return api.post('/announcements/admin/announcements', data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-announcements'] });
      toast.success('Saved', isEdit ? 'Announcement updated' : 'Announcement created');
      navigate('/admin/announcements');
    },
    onError: (error: any) => {
      toast.error('Error', error.response?.data?.error || 'Failed to save');
    }
  });

  const publishMutation = useMutation({
    mutationFn: async (announcementId: string) => {
      return api.post(`/announcements/admin/announcements/${announcementId}/publish`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-announcements'] });
      toast.success('Published', 'Announcement is now active');
      navigate('/admin/announcements');
    },
    onError: (error: any) => {
      toast.error('Error', error.response?.data?.error || 'Failed to publish');
    }
  });

  const handleSubmit = async (e: React.FormEvent, publish = false) => {
    e.preventDefault();

    if (!formData.title.trim() || !formData.body.trim()) {
      toast.error('Validation Error', 'Title and message are required');
      return;
    }

    if (formData.publishMode === 'SCHEDULED' && !formData.startAt) {
      toast.error('Validation Error', 'Start date is required for scheduled announcements');
      return;
    }

    if (formData.startAt && formData.endAt && new Date(formData.startAt) >= new Date(formData.endAt)) {
      toast.error('Validation Error', 'End date must be after start date');
      return;
    }

    const audiences: AudienceTarget[] = [];

    formData.targetRoleCodes.forEach(roleCode => {
      audiences.push({ audienceType: 'ROLE', roleCode });
    });
    
    formData.specificCustomerIds.forEach(customerId => {
      audiences.push({ audienceType: 'CUSTOMER', customerId });
    });
    
    formData.specificUserIds.forEach(userId => {
      audiences.push({ audienceType: 'USER', userId });
    });

    const payload = {
      title: formData.title,
      body: formData.body,
      severity: formData.severity,
      publishMode: formData.publishMode,
      startAt: formData.startAt || null,
      endAt: formData.endAt || null,
      sendEmail: formData.sendEmail,
      sendSms: formData.sendSms,
      sendWhatsapp: formData.sendWhatsapp,
      audiences,
    };

    const result = await saveMutation.mutateAsync(payload);
    
    if (publish && result.data.id) {
      await publishMutation.mutateAsync(result.data.id);
    }
  };

  if (isEdit && loadingExisting) {
    return <div className="loading-overlay"><div className="spinner" /></div>;
  }

  return (
    <div>
      <div style={{ marginBottom: '1.5rem' }}>
        <Link to="/admin/announcements" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-muted)', textDecoration: 'none', marginBottom: '0.5rem' }}>
          <ArrowLeft size={16} />
          Back to Announcements
        </Link>
        <h2 style={{ fontSize: '1.25rem', fontWeight: 600 }}>
          {isEdit ? 'Edit Announcement' : 'Create Announcement'}
        </h2>
      </div>

      <form onSubmit={(e) => handleSubmit(e, false)}>
        <div className="grid" style={{ gridTemplateColumns: '2fr 1fr', gap: '1.5rem' }}>
          <div>
            <div className="card" style={{ padding: '1.5rem', marginBottom: '1.5rem' }}>
              <h3 style={{ fontWeight: 600, marginBottom: '1rem', fontSize: '1rem' }}>Content</h3>
              
              <div className="form-group">
                <label className="form-label">Title *</label>
                <input
                  type="text"
                  className="form-input"
                  value={formData.title}
                  onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                  placeholder="Announcement title"
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">Message *</label>
                <textarea
                  className="form-input"
                  value={formData.body}
                  onChange={(e) => setFormData(prev => ({ ...prev, body: e.target.value }))}
                  placeholder="Write your announcement message..."
                  rows={6}
                  required
                  style={{ resize: 'vertical' }}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Severity</label>
                <div style={{ display: 'flex', gap: '0.75rem' }}>
                  {(['INFO', 'WARNING', 'CRITICAL'] as const).map((sev) => (
                    <label
                      key={sev}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.5rem',
                        padding: '0.75rem 1rem',
                        border: `2px solid ${formData.severity === sev ? 'var(--primary)' : 'var(--border)'}`,
                        borderRadius: 'var(--radius)',
                        cursor: 'pointer',
                        background: formData.severity === sev ? 'var(--primary-light)' : 'transparent',
                        flex: 1,
                      }}
                    >
                      <input
                        type="radio"
                        name="severity"
                        value={sev}
                        checked={formData.severity === sev}
                        onChange={() => setFormData(prev => ({ ...prev, severity: sev }))}
                        style={{ display: 'none' }}
                      />
                      {sev === 'CRITICAL' ? <AlertCircle size={18} style={{ color: 'var(--danger)' }} /> :
                       sev === 'WARNING' ? <AlertTriangle size={18} style={{ color: 'var(--warning)' }} /> :
                       <Info size={18} style={{ color: 'var(--info)' }} />}
                      <span style={{ fontWeight: 500 }}>{sev.charAt(0) + sev.slice(1).toLowerCase()}</span>
                    </label>
                  ))}
                </div>
              </div>
            </div>

            <div className="card" style={{ padding: '1.5rem' }}>
              <h3 style={{ fontWeight: 600, marginBottom: '1rem', fontSize: '1rem' }}>Audience Targeting</h3>
              
              <div style={{ marginBottom: '1rem' }}>
                <label className="form-label" style={{ marginBottom: '0.5rem', display: 'block' }}>Target Roles</label>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1rem' }}>
                  {roles?.map((role: any) => (
                    <label key={role.id} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
                      <input
                        type="checkbox"
                        checked={formData.targetRoleCodes.includes(role.code)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setFormData(prev => ({ ...prev, targetRoleCodes: [...prev.targetRoleCodes, role.code] }));
                          } else {
                            setFormData(prev => ({ ...prev, targetRoleCodes: prev.targetRoleCodes.filter(c => c !== role.code) }));
                          }
                        }}
                      />
                      {role.name}
                    </label>
                  ))}
                </div>
                {!roles?.length && (
                  <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>No roles found in the system</p>
                )}
              </div>

              <div className="form-group">
                <label className="form-label">Specific Customers (optional)</label>
                <select
                  className="form-select"
                  multiple
                  value={formData.specificCustomerIds}
                  onChange={(e) => {
                    const selected = Array.from(e.target.selectedOptions, option => option.value);
                    setFormData(prev => ({ ...prev, specificCustomerIds: selected }));
                  }}
                  style={{ minHeight: '100px' }}
                >
                  {customers?.map((c: any) => (
                    <option key={c.id} value={c.id}>{c.nameEn || c.name} ({c.code})</option>
                  ))}
                </select>
                <small style={{ color: 'var(--text-muted)' }}>Select specific customers to target. Hold Ctrl/Cmd to select multiple.</small>
              </div>

              <div className="form-group">
                <label className="form-label">Specific Users (optional)</label>
                <select
                  className="form-select"
                  multiple
                  value={formData.specificUserIds}
                  onChange={(e) => {
                    const selected = Array.from(e.target.selectedOptions, option => option.value);
                    setFormData(prev => ({ ...prev, specificUserIds: selected }));
                  }}
                  style={{ minHeight: '100px' }}
                >
                  {users?.map((u: any) => (
                    <option key={u.id} value={u.id}>{u.firstName} {u.lastName} ({u.email})</option>
                  ))}
                </select>
                <small style={{ color: 'var(--text-muted)' }}>Select specific users to always include. Hold Ctrl/Cmd to select multiple.</small>
              </div>
            </div>
          </div>

          <div>
            <div className="card" style={{ padding: '1.5rem', marginBottom: '1.5rem' }}>
              <h3 style={{ fontWeight: 600, marginBottom: '1rem', fontSize: '1rem' }}>Scheduling</h3>
              
              <div className="form-group">
                <label className="form-label">Publish Mode</label>
                <select
                  className="form-select"
                  value={formData.publishMode}
                  onChange={(e) => setFormData(prev => ({ ...prev, publishMode: e.target.value as any }))}
                >
                  <option value="IMMEDIATE">Immediate</option>
                  <option value="SCHEDULED">Scheduled</option>
                </select>
              </div>

              {formData.publishMode === 'SCHEDULED' && (
                <div className="form-group">
                  <label className="form-label">Start Date/Time *</label>
                  <input
                    type="datetime-local"
                    className="form-input"
                    value={formData.startAt}
                    onChange={(e) => setFormData(prev => ({ ...prev, startAt: e.target.value }))}
                    required
                  />
                </div>
              )}

              <div className="form-group">
                <label className="form-label">End Date/Time (optional)</label>
                <input
                  type="datetime-local"
                  className="form-input"
                  value={formData.endAt}
                  onChange={(e) => setFormData(prev => ({ ...prev, endAt: e.target.value }))}
                />
                <small style={{ color: 'var(--text-muted)' }}>Leave empty for no expiration</small>
              </div>
            </div>

            <div className="card" style={{ padding: '1.5rem', marginBottom: '1.5rem' }}>
              <h3 style={{ fontWeight: 600, marginBottom: '1rem', fontSize: '1rem' }}>Notification Channels</h3>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', marginBottom: '1rem' }}>
                In addition to in-app notifications, send via:
              </p>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={formData.sendEmail}
                    onChange={(e) => setFormData(prev => ({ ...prev, sendEmail: e.target.checked }))}
                  />
                  Email
                </label>
                <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={formData.sendSms}
                    onChange={(e) => setFormData(prev => ({ ...prev, sendSms: e.target.checked }))}
                  />
                  SMS
                </label>
                <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={formData.sendWhatsapp}
                    onChange={(e) => setFormData(prev => ({ ...prev, sendWhatsapp: e.target.checked }))}
                  />
                  WhatsApp
                </label>
              </div>
            </div>

            <div className="card" style={{ padding: '1.5rem', background: 'var(--primary-light)' }}>
              <h3 style={{ fontWeight: 600, marginBottom: '1rem', fontSize: '1rem' }}>Preview</h3>
              <div
                style={{
                  padding: '0.75rem 1rem',
                  borderRadius: 'var(--radius)',
                  background: formData.severity === 'CRITICAL' ? 'var(--danger)' :
                              formData.severity === 'WARNING' ? 'var(--warning)' : 'var(--info)',
                  color: 'white',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 600 }}>
                  {formData.severity === 'CRITICAL' ? <AlertCircle size={16} /> :
                   formData.severity === 'WARNING' ? <AlertTriangle size={16} /> : <Info size={16} />}
                  {formData.title || 'Announcement Title'}
                </div>
                <div style={{ fontSize: '0.875rem', marginTop: '0.25rem', opacity: 0.9 }}>
                  {formData.body.substring(0, 80) || 'Your message will appear here...'}
                  {formData.body.length > 80 && '...'}
                </div>
              </div>
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '1rem', marginTop: '1.5rem', justifyContent: 'flex-end' }}>
          <button type="button" className="btn btn-secondary" onClick={() => navigate('/admin/announcements')}>
            Cancel
          </button>
          <button type="submit" className="btn btn-outline" disabled={saveMutation.isPending}>
            <Save size={16} />
            {saveMutation.isPending ? 'Saving...' : 'Save as Draft'}
          </button>
          <button
            type="button"
            className="btn btn-primary"
            onClick={(e) => handleSubmit(e, true)}
            disabled={saveMutation.isPending || publishMutation.isPending}
          >
            <Play size={16} />
            {publishMutation.isPending ? 'Publishing...' : 'Save & Publish'}
          </button>
        </div>
      </form>
    </div>
  );
}
