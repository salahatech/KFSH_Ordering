import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';
import api from '../../lib/api';
import { 
  Plus, Edit2, Trash2, Copy, Play, Pause, Megaphone,
  AlertTriangle, Info, AlertCircle, Calendar, Users, Eye
} from 'lucide-react';
import { useToast } from '../../components/ui/Toast';
import { KpiCard, FilterBar, EmptyState, type FilterWidget } from '../../components/shared';

interface Announcement {
  id: string;
  title: string;
  body: string;
  severity: 'INFO' | 'WARNING' | 'CRITICAL';
  publishMode: 'IMMEDIATE' | 'SCHEDULED';
  status: 'DRAFT' | 'SCHEDULED' | 'ACTIVE' | 'EXPIRED';
  computedStatus?: string;
  startAt: string | null;
  endAt: string | null;
  isPublished: boolean;
  sendEmail: boolean;
  sendSms: boolean;
  sendWhatsapp: boolean;
  createdBy: { firstName: string; lastName: string };
  audiences: any[];
  _count: { deliveries: number };
  createdAt: string;
}

export default function Announcements() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const toast = useToast();
  const [filters, setFilters] = useState<Record<string, any>>({});
  const [selectedKpi, setSelectedKpi] = useState<string | null>(null);

  const { data: announcements, isLoading } = useQuery({
    queryKey: ['admin-announcements'],
    queryFn: async () => {
      const { data } = await api.get('/announcements/admin/announcements');
      return data as Announcement[];
    },
  });

  const publishMutation = useMutation({
    mutationFn: async (id: string) => {
      return api.post(`/announcements/admin/announcements/${id}/publish`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-announcements'] });
      toast.success('Published', 'Announcement is now active');
    },
    onError: (error: any) => {
      toast.error('Error', error.response?.data?.error || 'Failed to publish');
    }
  });

  const unpublishMutation = useMutation({
    mutationFn: async (id: string) => {
      return api.post(`/announcements/admin/announcements/${id}/unpublish`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-announcements'] });
      toast.success('Unpublished', 'Announcement is now a draft');
    }
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      return api.delete(`/announcements/admin/announcements/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-announcements'] });
      toast.success('Deleted', 'Announcement has been removed');
    }
  });

  const duplicateMutation = useMutation({
    mutationFn: async (id: string) => {
      return api.post(`/announcements/admin/announcements/${id}/duplicate`);
    },
    onSuccess: (response) => {
      queryClient.invalidateQueries({ queryKey: ['admin-announcements'] });
      toast.success('Duplicated', 'A copy has been created');
      navigate(`/admin/announcements/${response.data.id}/edit`);
    }
  });

  const filterWidgets: FilterWidget[] = [
    { key: 'search', label: 'Search', type: 'search', placeholder: 'Search title or content...' },
    { 
      key: 'status', 
      label: 'Status', 
      type: 'select', 
      options: [
        { value: '', label: 'All Statuses' },
        { value: 'DRAFT', label: 'Draft' },
        { value: 'SCHEDULED', label: 'Scheduled' },
        { value: 'ACTIVE', label: 'Active' },
        { value: 'EXPIRED', label: 'Expired' },
      ]
    },
    { 
      key: 'severity', 
      label: 'Severity', 
      type: 'select', 
      options: [
        { value: '', label: 'All Severities' },
        { value: 'INFO', label: 'Info' },
        { value: 'WARNING', label: 'Warning' },
        { value: 'CRITICAL', label: 'Critical' },
      ]
    },
  ];

  const getEffectiveStatus = (a: Announcement) => a.computedStatus || a.status;

  const filteredAnnouncements = announcements?.filter((a) => {
    const status = getEffectiveStatus(a);
    if (filters.status && status !== filters.status) return false;
    if (filters.severity && a.severity !== filters.severity) return false;
    
    if (selectedKpi === 'draft' && status !== 'DRAFT') return false;
    if (selectedKpi === 'scheduled' && status !== 'SCHEDULED') return false;
    if (selectedKpi === 'active' && status !== 'ACTIVE') return false;
    if (selectedKpi === 'expired' && status !== 'EXPIRED') return false;

    if (filters.search) {
      const q = filters.search.toLowerCase();
      if (!a.title.toLowerCase().includes(q) && !a.body.toLowerCase().includes(q)) {
        return false;
      }
    }
    return true;
  });

  const stats = {
    total: announcements?.length || 0,
    draft: announcements?.filter(a => getEffectiveStatus(a) === 'DRAFT').length || 0,
    scheduled: announcements?.filter(a => getEffectiveStatus(a) === 'SCHEDULED').length || 0,
    active: announcements?.filter(a => getEffectiveStatus(a) === 'ACTIVE').length || 0,
    expired: announcements?.filter(a => getEffectiveStatus(a) === 'EXPIRED').length || 0,
  };

  const handleKpiClick = (kpi: string) => {
    setSelectedKpi(selectedKpi === kpi ? null : kpi);
  };

  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case 'CRITICAL': return <AlertCircle size={14} style={{ color: 'var(--danger)' }} />;
      case 'WARNING': return <AlertTriangle size={14} style={{ color: 'var(--warning)' }} />;
      default: return <Info size={14} style={{ color: 'var(--info)' }} />;
    }
  };

  const getStatusBadge = (status: string) => {
    const styles: Record<string, string> = {
      DRAFT: 'badge-secondary',
      SCHEDULED: 'badge-info',
      ACTIVE: 'badge-success',
      EXPIRED: 'badge-danger',
    };
    return <span className={`badge ${styles[status] || 'badge-secondary'}`}>{status}</span>;
  };

  if (isLoading) {
    return <div className="loading-overlay"><div className="spinner" /></div>;
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.5rem' }}>
        <div>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 600, marginBottom: '0.25rem' }}>Announcement Management</h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', margin: 0 }}>
            Create and manage system-wide announcements
          </p>
        </div>
        <button className="btn btn-primary" onClick={() => navigate('/admin/announcements/new')}>
          <Plus size={16} />
          New Announcement
        </button>
      </div>

      <div className="grid" style={{ gridTemplateColumns: 'repeat(5, 1fr)', gap: '1rem', marginBottom: '1.5rem' }}>
        <KpiCard 
          title="Total" 
          value={stats.total} 
          icon={<Megaphone size={20} />}
          color="primary"
          onClick={() => setSelectedKpi(null)}
          selected={selectedKpi === null}
        />
        <KpiCard 
          title="Draft" 
          value={stats.draft} 
          icon={<Edit2 size={20} />}
          color="default"
          onClick={() => handleKpiClick('draft')}
          selected={selectedKpi === 'draft'}
        />
        <KpiCard 
          title="Scheduled" 
          value={stats.scheduled} 
          icon={<Calendar size={20} />}
          color="info"
          onClick={() => handleKpiClick('scheduled')}
          selected={selectedKpi === 'scheduled'}
        />
        <KpiCard 
          title="Active" 
          value={stats.active} 
          icon={<Play size={20} />}
          color="success"
          onClick={() => handleKpiClick('active')}
          selected={selectedKpi === 'active'}
        />
        <KpiCard 
          title="Expired" 
          value={stats.expired} 
          icon={<Pause size={20} />}
          color="danger"
          onClick={() => handleKpiClick('expired')}
          selected={selectedKpi === 'expired'}
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
        <div style={{ padding: '1rem 1.5rem', borderBottom: '1px solid var(--border)' }}>
          <h3 style={{ fontWeight: 600, fontSize: '1rem', margin: 0 }}>
            Announcements ({filteredAnnouncements?.length || 0})
          </h3>
        </div>
        {filteredAnnouncements && filteredAnnouncements.length > 0 ? (
          <div style={{ overflowX: 'auto' }}>
            <table className="table" style={{ marginBottom: 0 }}>
              <thead>
                <tr>
                  <th>Title</th>
                  <th>Severity</th>
                  <th>Status</th>
                  <th>Schedule</th>
                  <th>Audience</th>
                  <th>Delivered</th>
                  <th>Created</th>
                  <th style={{ width: '150px', textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredAnnouncements.map((a) => (
                  <tr key={a.id}>
                    <td>
                      <div style={{ fontWeight: 500, maxWidth: '300px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {a.title}
                      </div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', maxWidth: '300px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {a.body.substring(0, 60)}...
                      </div>
                    </td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        {getSeverityIcon(a.severity)}
                        <span style={{ fontSize: '0.8125rem' }}>{a.severity}</span>
                      </div>
                    </td>
                    <td>{getStatusBadge(getEffectiveStatus(a))}</td>
                    <td style={{ fontSize: '0.8125rem' }}>
                      {a.startAt ? (
                        <div>
                          <div>{format(new Date(a.startAt), 'MMM dd, yyyy HH:mm')}</div>
                          {a.endAt && (
                            <div style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>
                              to {format(new Date(a.endAt), 'MMM dd, yyyy HH:mm')}
                            </div>
                          )}
                        </div>
                      ) : (
                        <span style={{ color: 'var(--text-muted)' }}>-</span>
                      )}
                    </td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                        <Users size={14} style={{ color: 'var(--text-muted)' }} />
                        <span style={{ fontSize: '0.8125rem' }}>
                          {a.audiences.length === 0 ? 'All' : `${a.audiences.length} targets`}
                        </span>
                      </div>
                    </td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                        <Eye size={14} style={{ color: 'var(--text-muted)' }} />
                        <span style={{ fontSize: '0.8125rem' }}>{a._count.deliveries}</span>
                      </div>
                    </td>
                    <td style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                      {format(new Date(a.createdAt), 'MMM dd')}
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: '0.25rem', justifyContent: 'flex-end' }}>
                        <button
                          className="btn btn-sm btn-outline"
                          onClick={() => navigate(`/admin/announcements/${a.id}/edit`)}
                          title="Edit"
                          disabled={getEffectiveStatus(a) === 'ACTIVE'}
                        >
                          <Edit2 size={14} />
                        </button>
                        {!a.isPublished ? (
                          <button
                            className="btn btn-sm btn-success"
                            onClick={() => publishMutation.mutate(a.id)}
                            title="Publish"
                            disabled={publishMutation.isPending}
                          >
                            <Play size={14} />
                          </button>
                        ) : getEffectiveStatus(a) === 'ACTIVE' ? (
                          <button
                            className="btn btn-sm btn-warning"
                            onClick={() => unpublishMutation.mutate(a.id)}
                            title="Unpublish"
                            disabled={unpublishMutation.isPending}
                          >
                            <Pause size={14} />
                          </button>
                        ) : null}
                        <button
                          className="btn btn-sm btn-outline"
                          onClick={() => duplicateMutation.mutate(a.id)}
                          title="Duplicate"
                        >
                          <Copy size={14} />
                        </button>
                        <button
                          className="btn btn-sm btn-danger"
                          onClick={() => {
                            if (confirm('Delete this announcement?')) {
                              deleteMutation.mutate(a.id);
                            }
                          }}
                          title="Delete"
                        >
                          <Trash2 size={14} />
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
              title="No announcements found"
              message="Create your first announcement to notify users"
              icon="alert"
            />
          </div>
        )}
      </div>
    </div>
  );
}
