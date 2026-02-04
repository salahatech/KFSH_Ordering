import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../../lib/api';
import { useToast } from '../../components/ui/Toast';
import { PageHeader } from '../../components/shared';
import { Search, Edit2, Save, X, Download, Upload, FileText, Filter, Database } from 'lucide-react';

interface TranslationEntry {
  id: string;
  entityType: string;
  entityId: string;
  fieldKey: string;
  langCode: string;
  value: string;
  updatedAt: string;
}

interface Language {
  code: string;
  name: string;
  isActive: boolean;
}

const ENTITY_TYPES = [
  { value: 'SYSTEM', label: 'System UI' },
  { value: 'PRODUCT', label: 'Products' },
  { value: 'CUSTOMER', label: 'Customers' },
  { value: 'MATERIAL', label: 'Materials' },
  { value: 'SUPPLIER', label: 'Suppliers' },
  { value: 'CATEGORY', label: 'Categories' },
  { value: 'CITY', label: 'Cities' },
  { value: 'REGION', label: 'Regions' },
  { value: 'COUNTRY', label: 'Countries' },
];

export default function Translations() {
  const toast = useToast();
  const queryClient = useQueryClient();
  const [entityType, setEntityType] = useState('SYSTEM');
  const [entityId, setEntityId] = useState('');
  const [langCode, setLangCode] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [page, setPage] = useState(1);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState('');

  const { data: languages = [] } = useQuery<Language[]>({
    queryKey: ['languages-active'],
    queryFn: async () => {
      const { data } = await api.get('/localization/languages', { params: { activeOnly: 'true' } });
      return data;
    },
  });

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['translations', entityType, entityId, langCode, searchTerm, page],
    queryFn: async () => {
      const params: any = { page, pageSize: 25 };
      if (entityType) params.entityType = entityType;
      if (entityId) params.entityId = entityId;
      if (langCode) params.langCode = langCode;
      if (searchTerm) params.search = searchTerm;
      const { data } = await api.get('/localization/translations', { params });
      return data;
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ entityType, entityId, fieldKey, langCode, value }: any) => {
      const { data } = await api.post('/localization/translations', {
        entityType,
        entityId,
        fieldKey,
        langCode,
        value,
      });
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['translations'] });
      toast.success('Translation Saved', 'Translation has been updated');
      setEditingId(null);
    },
    onError: (error: any) => {
      toast.error('Error', error.response?.data?.error || 'Failed to save translation');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/localization/translations/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['translations'] });
      toast.success('Translation Deleted', 'Translation has been removed');
    },
    onError: (error: any) => {
      toast.error('Error', error.response?.data?.error || 'Failed to delete translation');
    },
  });

  const seedMutation = useMutation({
    mutationFn: async () => {
      const { data } = await api.post('/localization/seed-system-translations');
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['translations'] });
      toast.success('System Translations Seeded', `Created ${data.created} translations (${data.skipped} skipped)`);
    },
    onError: (error: any) => {
      toast.error('Seed Failed', error.response?.data?.error || 'Failed to seed system translations');
    },
  });

  const handleSave = (entry: TranslationEntry) => {
    updateMutation.mutate({
      entityType: entry.entityType,
      entityId: entry.entityId,
      fieldKey: entry.fieldKey,
      langCode: entry.langCode,
      value: editValue,
    });
  };

  const handleExport = async () => {
    try {
      const response = await api.get('/localization/translations/export', {
        params: { entityType },
        responseType: 'blob',
      });
      const url = URL.createObjectURL(response.data);
      const a = document.createElement('a');
      a.href = url;
      a.download = `translations-${entityType.toLowerCase()}.json`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success('Export Complete', 'Translations exported successfully');
    } catch (error: any) {
      toast.error('Export Failed', error.response?.data?.error || 'Failed to export translations');
    }
  };

  const handleImport = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      const content = await file.text();
      const translations = JSON.parse(content);
      await api.post('/localization/translations/import', { translations });
      queryClient.invalidateQueries({ queryKey: ['translations'] });
      toast.success('Import Complete', 'Translations imported successfully');
    } catch (error: any) {
      toast.error('Import Failed', error.response?.data?.error || 'Failed to import translations');
    }
    event.target.value = '';
  };

  const translations = data?.data || [];
  const total = data?.total || 0;
  const totalPages = data?.totalPages || 1;

  return (
    <div>
      <PageHeader
        title="Translations"
        subtitle="Manage multilingual translations for system entities"
        actions={
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <button 
              className="btn btn-primary" 
              onClick={() => seedMutation.mutate()}
              disabled={seedMutation.isPending}
            >
              <Database size={16} />
              {seedMutation.isPending ? 'Seeding...' : 'Seed System Translations'}
            </button>
            <button className="btn btn-secondary" onClick={handleExport}>
              <Download size={16} />
              Export
            </button>
            <label className="btn btn-secondary" style={{ cursor: 'pointer' }}>
              <Upload size={16} />
              Import
              <input
                type="file"
                accept=".json"
                onChange={handleImport}
                style={{ display: 'none' }}
              />
            </label>
          </div>
        }
      />

      <div className="card" style={{ marginBottom: '1rem' }}>
        <div style={{ padding: '1rem', display: 'flex', gap: '1rem', alignItems: 'center', flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Filter size={16} style={{ color: 'var(--text-muted)' }} />
            <select
              className="form-select"
              value={entityType}
              onChange={(e) => { setEntityType(e.target.value); setPage(1); }}
              style={{ width: 'auto' }}
            >
              {ENTITY_TYPES.map((et) => (
                <option key={et.value} value={et.value}>{et.label}</option>
              ))}
            </select>
          </div>
          <select
            className="form-select"
            value={langCode}
            onChange={(e) => { setLangCode(e.target.value); setPage(1); }}
            style={{ width: 'auto' }}
          >
            <option value="">All Languages</option>
            {languages.map((lang) => (
              <option key={lang.code} value={lang.code}>{lang.name} ({lang.code.toUpperCase()})</option>
            ))}
          </select>
          <div style={{ flex: 1, maxWidth: '300px' }}>
            <div style={{ position: 'relative' }}>
              <Search size={16} style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
              <input
                type="text"
                className="form-input"
                placeholder="Search translations..."
                value={searchTerm}
                onChange={(e) => { setSearchTerm(e.target.value); setPage(1); }}
                style={{ paddingLeft: '2.25rem' }}
              />
            </div>
          </div>
          <span style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>
            {total} translations
          </span>
        </div>
      </div>

      <div className="card">
        {isLoading ? (
          <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>
            Loading translations...
          </div>
        ) : translations.length === 0 ? (
          <div style={{ padding: '3rem', textAlign: 'center' }}>
            <FileText size={48} style={{ color: 'var(--text-muted)', marginBottom: '1rem' }} />
            <h3 style={{ marginBottom: '0.5rem' }}>No Translations Found</h3>
            <p style={{ color: 'var(--text-muted)' }}>
              Translations will appear here when you add multilingual content to entities.
            </p>
          </div>
        ) : (
          <>
            <table className="table">
              <thead>
                <tr>
                  <th>Entity Type</th>
                  <th>Entity ID</th>
                  <th>Field</th>
                  <th>Language</th>
                  <th>Translation</th>
                  <th style={{ width: '100px' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {translations.map((entry: TranslationEntry) => (
                  <tr key={entry.id}>
                    <td>
                      <span className="badge badge-default">{entry.entityType}</span>
                    </td>
                    <td style={{ fontFamily: 'monospace', fontSize: '0.8125rem' }}>
                      {entry.entityId.substring(0, 8)}...
                    </td>
                    <td style={{ fontWeight: 500 }}>{entry.fieldKey}</td>
                    <td>
                      <code style={{ 
                        background: 'var(--bg-secondary)', 
                        padding: '0.25rem 0.5rem', 
                        borderRadius: '4px',
                        fontWeight: 600
                      }}>
                        {entry.langCode.toUpperCase()}
                      </code>
                    </td>
                    <td>
                      {editingId === entry.id ? (
                        <input
                          type="text"
                          className="form-input"
                          value={editValue}
                          onChange={(e) => setEditValue(e.target.value)}
                          autoFocus
                          style={{ width: '100%' }}
                        />
                      ) : (
                        <span style={{ 
                          maxWidth: '300px', 
                          display: 'block', 
                          overflow: 'hidden', 
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap'
                        }}>
                          {entry.value}
                        </span>
                      )}
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: '0.5rem' }}>
                        {editingId === entry.id ? (
                          <>
                            <button
                              className="btn btn-primary"
                              style={{ padding: '0.375rem' }}
                              onClick={() => handleSave(entry)}
                            >
                              <Save size={14} />
                            </button>
                            <button
                              className="btn btn-secondary"
                              style={{ padding: '0.375rem' }}
                              onClick={() => setEditingId(null)}
                            >
                              <X size={14} />
                            </button>
                          </>
                        ) : (
                          <button
                            className="btn btn-secondary"
                            style={{ padding: '0.375rem' }}
                            onClick={() => {
                              setEditingId(entry.id);
                              setEditValue(entry.value);
                            }}
                          >
                            <Edit2 size={14} />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {totalPages > 1 && (
              <div style={{ 
                padding: '1rem', 
                borderTop: '1px solid var(--border)', 
                display: 'flex', 
                justifyContent: 'space-between',
                alignItems: 'center'
              }}>
                <span style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>
                  Page {page} of {totalPages}
                </span>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <button
                    className="btn btn-secondary"
                    disabled={page <= 1}
                    onClick={() => setPage(p => p - 1)}
                  >
                    Previous
                  </button>
                  <button
                    className="btn btn-secondary"
                    disabled={page >= totalPages}
                    onClick={() => setPage(p => p + 1)}
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
