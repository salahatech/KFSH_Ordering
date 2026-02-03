import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../../lib/api';
import { useToast } from '../../components/ui/Toast';
import { PageHeader } from '../../components/shared';
import { Plus, Edit2, Trash2, Check, X, Globe, Languages as LanguagesIcon } from 'lucide-react';

interface Language {
  id: string;
  code: string;
  name: string;
  nativeName: string | null;
  direction: string;
  isActive: boolean;
  isDefault: boolean;
  sortOrder: number;
}

export default function Languages() {
  const toast = useToast();
  const queryClient = useQueryClient();
  const [showModal, setShowModal] = useState(false);
  const [editingLang, setEditingLang] = useState<Language | null>(null);
  const [formData, setFormData] = useState({
    code: '',
    name: '',
    nativeName: '',
    direction: 'ltr',
    isActive: true,
    isDefault: false,
    sortOrder: 0,
  });

  const { data: languages = [], isLoading } = useQuery<Language[]>({
    queryKey: ['languages'],
    queryFn: async () => {
      const { data } = await api.get('/localization/languages');
      return data;
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      const { data: result } = await api.post('/localization/languages', data);
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['languages'] });
      toast.success('Language Created', 'Language has been added successfully');
      closeModal();
    },
    onError: (error: any) => {
      toast.error('Error', error.response?.data?.error || 'Failed to create language');
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: typeof formData }) => {
      const { data: result } = await api.put(`/localization/languages/${id}`, data);
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['languages'] });
      toast.success('Language Updated', 'Language has been updated successfully');
      closeModal();
    },
    onError: (error: any) => {
      toast.error('Error', error.response?.data?.error || 'Failed to update language');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/localization/languages/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['languages'] });
      toast.success('Language Deleted', 'Language has been removed');
    },
    onError: (error: any) => {
      toast.error('Error', error.response?.data?.error || 'Failed to delete language');
    },
  });

  const seedMutation = useMutation({
    mutationFn: async () => {
      const { data } = await api.post('/localization/seed-languages');
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['languages'] });
      toast.success('Languages Seeded', 'Default languages have been added');
    },
    onError: (error: any) => {
      toast.error('Error', error.response?.data?.error || 'Failed to seed languages');
    },
  });

  const openModal = (lang?: Language) => {
    if (lang) {
      setEditingLang(lang);
      setFormData({
        code: lang.code,
        name: lang.name,
        nativeName: lang.nativeName || '',
        direction: lang.direction,
        isActive: lang.isActive,
        isDefault: lang.isDefault,
        sortOrder: lang.sortOrder,
      });
    } else {
      setEditingLang(null);
      setFormData({
        code: '',
        name: '',
        nativeName: '',
        direction: 'ltr',
        isActive: true,
        isDefault: false,
        sortOrder: languages.length,
      });
    }
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setEditingLang(null);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingLang) {
      updateMutation.mutate({ id: editingLang.id, data: formData });
    } else {
      createMutation.mutate(formData);
    }
  };

  const handleDelete = (lang: Language) => {
    if (lang.isDefault) {
      toast.error('Cannot Delete', 'Cannot delete the default language');
      return;
    }
    if (confirm(`Are you sure you want to delete ${lang.name}?`)) {
      deleteMutation.mutate(lang.id);
    }
  };

  const handleSetDefault = (lang: Language) => {
    updateMutation.mutate({ id: lang.id, data: { ...lang, isDefault: true } });
  };

  const handleToggleActive = (lang: Language) => {
    updateMutation.mutate({ id: lang.id, data: { ...lang, isActive: !lang.isActive } });
  };

  return (
    <div>
      <PageHeader
        title="Languages"
        subtitle="Manage supported languages for the application"
        actions={
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            {languages.length === 0 && (
              <button className="btn btn-secondary" onClick={() => seedMutation.mutate()}>
                <LanguagesIcon size={16} />
                Seed Default Languages
              </button>
            )}
            <button className="btn btn-primary" onClick={() => openModal()}>
              <Plus size={16} />
              Add Language
            </button>
          </div>
        }
      />

      <div className="card">
        {isLoading ? (
          <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>
            Loading languages...
          </div>
        ) : languages.length === 0 ? (
          <div style={{ padding: '3rem', textAlign: 'center' }}>
            <Globe size={48} style={{ color: 'var(--text-muted)', marginBottom: '1rem' }} />
            <h3 style={{ marginBottom: '0.5rem' }}>No Languages Configured</h3>
            <p style={{ color: 'var(--text-muted)', marginBottom: '1rem' }}>
              Click "Seed Default Languages" to add English and Arabic, or add languages manually.
            </p>
          </div>
        ) : (
          <table className="table">
            <thead>
              <tr>
                <th>Code</th>
                <th>Name</th>
                <th>Native Name</th>
                <th>Direction</th>
                <th>Status</th>
                <th>Default</th>
                <th>Order</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {languages.map((lang) => (
                <tr key={lang.id}>
                  <td>
                    <code style={{ 
                      background: 'var(--bg-secondary)', 
                      padding: '0.25rem 0.5rem', 
                      borderRadius: '4px',
                      fontWeight: 600
                    }}>
                      {lang.code.toUpperCase()}
                    </code>
                  </td>
                  <td style={{ fontWeight: 500 }}>{lang.name}</td>
                  <td>{lang.nativeName || '-'}</td>
                  <td>
                    <span className={`badge badge-${lang.direction === 'rtl' ? 'warning' : 'default'}`}>
                      {lang.direction.toUpperCase()}
                    </span>
                  </td>
                  <td>
                    <button
                      className={`badge badge-${lang.isActive ? 'success' : 'danger'}`}
                      onClick={() => handleToggleActive(lang)}
                      style={{ cursor: 'pointer', border: 'none' }}
                    >
                      {lang.isActive ? 'Active' : 'Inactive'}
                    </button>
                  </td>
                  <td>
                    {lang.isDefault ? (
                      <span className="badge badge-primary">Default</span>
                    ) : (
                      <button
                        className="btn btn-secondary"
                        style={{ padding: '0.25rem 0.5rem', fontSize: '0.75rem' }}
                        onClick={() => handleSetDefault(lang)}
                      >
                        Set Default
                      </button>
                    )}
                  </td>
                  <td>{lang.sortOrder}</td>
                  <td>
                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                      <button
                        className="btn btn-secondary"
                        style={{ padding: '0.375rem' }}
                        onClick={() => openModal(lang)}
                      >
                        <Edit2 size={14} />
                      </button>
                      <button
                        className="btn btn-danger"
                        style={{ padding: '0.375rem' }}
                        onClick={() => handleDelete(lang)}
                        disabled={lang.isDefault}
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {showModal && (
        <div className="modal-overlay" onClick={closeModal}>
          <div className="modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '500px' }}>
            <div className="modal-header">
              <h3>{editingLang ? 'Edit Language' : 'Add Language'}</h3>
              <button className="modal-close" onClick={closeModal}>
                <X size={20} />
              </button>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="modal-body">
                <div className="grid grid-2" style={{ gap: '1rem' }}>
                  <div className="form-group">
                    <label className="form-label">Language Code *</label>
                    <input
                      type="text"
                      className="form-input"
                      value={formData.code}
                      onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                      placeholder="e.g., en, ar, fr"
                      maxLength={5}
                      required
                      disabled={!!editingLang}
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Direction *</label>
                    <select
                      className="form-select"
                      value={formData.direction}
                      onChange={(e) => setFormData({ ...formData, direction: e.target.value })}
                      required
                    >
                      <option value="ltr">Left to Right (LTR)</option>
                      <option value="rtl">Right to Left (RTL)</option>
                    </select>
                  </div>
                </div>
                <div className="form-group">
                  <label className="form-label">Language Name *</label>
                  <input
                    type="text"
                    className="form-input"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="e.g., English"
                    required
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Native Name</label>
                  <input
                    type="text"
                    className="form-input"
                    value={formData.nativeName}
                    onChange={(e) => setFormData({ ...formData, nativeName: e.target.value })}
                    placeholder="e.g., العربية"
                  />
                </div>
                <div className="grid grid-2" style={{ gap: '1rem' }}>
                  <div className="form-group">
                    <label className="form-label">Sort Order</label>
                    <input
                      type="number"
                      className="form-input"
                      value={formData.sortOrder}
                      onChange={(e) => setFormData({ ...formData, sortOrder: parseInt(e.target.value) || 0 })}
                    />
                  </div>
                  <div className="form-group" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'flex-end' }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
                      <input
                        type="checkbox"
                        checked={formData.isActive}
                        onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                      />
                      Active
                    </label>
                  </div>
                </div>
                <div className="form-group">
                  <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
                    <input
                      type="checkbox"
                      checked={formData.isDefault}
                      onChange={(e) => setFormData({ ...formData, isDefault: e.target.checked })}
                    />
                    Set as Default Language
                  </label>
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={closeModal}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  {editingLang ? 'Update' : 'Create'} Language
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
