import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../../lib/api';
import { useToast } from '../../components/ui/Toast';
import { PageHeader } from '../../components/shared';
import { 
  Search, Edit2, Save, X, Download, Upload, FileText, 
  Database, Globe, Check, AlertCircle, ChevronDown, ChevronRight,
  Languages, Tag, Box, Users, Building2, MapPin, FolderOpen
} from 'lucide-react';

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
  { value: 'SYSTEM', label: 'System UI', icon: Globe, description: 'Navigation, buttons, labels' },
  { value: 'PRODUCT', label: 'Products', icon: Box, description: 'Product names and descriptions' },
  { value: 'CUSTOMER', label: 'Customers', icon: Building2, description: 'Customer information' },
  { value: 'MATERIAL', label: 'Materials', icon: Tag, description: 'Material names' },
  { value: 'SUPPLIER', label: 'Suppliers', icon: Users, description: 'Supplier details' },
  { value: 'CATEGORY', label: 'Categories', icon: FolderOpen, description: 'Category labels' },
  { value: 'CITY', label: 'Cities', icon: MapPin, description: 'City names' },
  { value: 'REGION', label: 'Regions', icon: MapPin, description: 'Region names' },
  { value: 'COUNTRY', label: 'Countries', icon: MapPin, description: 'Country names' },
];

const SYSTEM_KEY_GROUPS = [
  { prefix: 'nav.', label: 'Navigation', color: '#3b82f6' },
  { prefix: 'action.', label: 'Actions', color: '#10b981' },
  { prefix: 'label.', label: 'Labels', color: '#8b5cf6' },
  { prefix: 'status.', label: 'Status', color: '#f59e0b' },
  { prefix: 'message.', label: 'Messages', color: '#06b6d4' },
  { prefix: 'page.', label: 'Pages', color: '#ec4899' },
];

export default function Translations() {
  const toast = useToast();
  const queryClient = useQueryClient();
  const [entityType, setEntityType] = useState('SYSTEM');
  const [langCode, setLangCode] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [page, setPage] = useState(1);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState('');
  const [selectedGroup, setSelectedGroup] = useState<string | null>(null);
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set(['nav.', 'action.', 'label.']));

  const { data: languages = [] } = useQuery<Language[]>({
    queryKey: ['languages-active'],
    queryFn: async () => {
      const { data } = await api.get('/localization/languages', { params: { activeOnly: 'true' } });
      return data;
    },
  });

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['translations', entityType, '', langCode, searchTerm, page],
    queryFn: async () => {
      const params: any = { page, pageSize: 100 };
      if (entityType) params.entityType = entityType;
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
      toast.success('Saved', 'Translation updated successfully');
      setEditingId(null);
    },
    onError: (error: any) => {
      toast.error('Error', error.response?.data?.error || 'Failed to save translation');
    },
  });

  const seedMutation = useMutation({
    mutationFn: async () => {
      const { data } = await api.post('/localization/seed-system-translations');
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['translations'] });
      toast.success('Translations Added', `Created ${data.created} new translations`);
    },
    onError: (error: any) => {
      toast.error('Failed', error.response?.data?.error || 'Could not add translations');
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
      toast.success('Exported', 'Translations file downloaded');
    } catch (error: any) {
      toast.error('Export Failed', error.response?.data?.error || 'Could not export translations');
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
      toast.success('Imported', 'Translations uploaded successfully');
    } catch (error: any) {
      toast.error('Import Failed', error.response?.data?.error || 'Could not import translations');
    }
    event.target.value = '';
  };

  const translations = data?.data || [];
  const total = data?.total || 0;
  const totalPages = data?.totalPages || 1;

  const groupedTranslations = useMemo(() => {
    if (entityType !== 'SYSTEM') return null;
    
    const groups: Record<string, TranslationEntry[]> = {};
    translations.forEach((t: TranslationEntry) => {
      const group = SYSTEM_KEY_GROUPS.find(g => t.fieldKey.startsWith(g.prefix));
      const key = group?.prefix || 'other';
      if (!groups[key]) groups[key] = [];
      groups[key].push(t);
    });
    return groups;
  }, [translations, entityType]);

  const toggleGroup = (prefix: string) => {
    setExpandedGroups(prev => {
      const next = new Set(prev);
      if (next.has(prefix)) {
        next.delete(prefix);
      } else {
        next.add(prefix);
      }
      return next;
    });
  };

  const currentEntityType = ENTITY_TYPES.find(e => e.value === entityType);

  const renderTranslationCard = (entry: TranslationEntry, showGroup = false) => {
    const isEditing = editingId === entry.id;
    const group = SYSTEM_KEY_GROUPS.find(g => entry.fieldKey.startsWith(g.prefix));
    const displayKey = entry.fieldKey.replace(group?.prefix || '', '');
    
    return (
      <div
        key={entry.id}
        style={{
          padding: '1rem',
          background: isEditing ? 'var(--bg-secondary)' : 'var(--bg-primary)',
          borderRadius: '8px',
          border: '1px solid var(--border)',
          transition: 'all 0.2s',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.75rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            {showGroup && group && (
              <span 
                style={{ 
                  fontSize: '0.6875rem',
                  padding: '0.125rem 0.5rem',
                  borderRadius: '4px',
                  background: `${group.color}15`,
                  color: group.color,
                  fontWeight: 600,
                  textTransform: 'uppercase',
                }}
              >
                {group.label}
              </span>
            )}
            <span style={{ 
              fontWeight: 600, 
              fontSize: '0.875rem',
              color: 'var(--text-primary)',
              fontFamily: 'var(--font-mono, monospace)',
            }}>
              {displayKey}
            </span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span style={{
              fontSize: '0.75rem',
              padding: '0.25rem 0.5rem',
              borderRadius: '4px',
              background: entry.langCode === 'ar' ? '#10b98115' : '#3b82f615',
              color: entry.langCode === 'ar' ? '#10b981' : '#3b82f6',
              fontWeight: 600,
            }}>
              {entry.langCode === 'ar' ? 'العربية' : 'English'}
            </span>
            {isEditing ? (
              <div style={{ display: 'flex', gap: '0.25rem' }}>
                <button
                  className="btn btn-primary"
                  style={{ padding: '0.375rem 0.625rem', fontSize: '0.75rem' }}
                  onClick={() => handleSave(entry)}
                  disabled={updateMutation.isPending}
                >
                  <Save size={14} />
                  Save
                </button>
                <button
                  className="btn btn-secondary"
                  style={{ padding: '0.375rem 0.625rem', fontSize: '0.75rem' }}
                  onClick={() => setEditingId(null)}
                >
                  <X size={14} />
                </button>
              </div>
            ) : (
              <button
                className="btn btn-secondary"
                style={{ padding: '0.375rem 0.625rem', fontSize: '0.75rem' }}
                onClick={() => {
                  setEditingId(entry.id);
                  setEditValue(entry.value);
                }}
              >
                <Edit2 size={14} />
                Edit
              </button>
            )}
          </div>
        </div>
        
        {isEditing ? (
          <textarea
            className="form-input"
            value={editValue}
            onChange={(e) => setEditValue(e.target.value)}
            autoFocus
            rows={2}
            style={{ 
              width: '100%', 
              resize: 'vertical',
              direction: entry.langCode === 'ar' ? 'rtl' : 'ltr',
              fontFamily: entry.langCode === 'ar' ? 'inherit' : 'var(--font-mono, monospace)',
            }}
          />
        ) : (
          <div 
            style={{ 
              padding: '0.75rem',
              background: 'var(--bg-secondary)',
              borderRadius: '6px',
              fontSize: '0.9375rem',
              lineHeight: 1.5,
              direction: entry.langCode === 'ar' ? 'rtl' : 'ltr',
              color: entry.value ? 'var(--text-primary)' : 'var(--text-muted)',
              fontStyle: entry.value ? 'normal' : 'italic',
            }}
          >
            {entry.value || 'No translation yet'}
          </div>
        )}
      </div>
    );
  };

  return (
    <div>
      <PageHeader
        title="Translations"
        subtitle="Manage text content in multiple languages"
        actions={
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <button 
              className="btn btn-primary" 
              onClick={() => seedMutation.mutate()}
              disabled={seedMutation.isPending}
              title="Add default system translations for common UI elements"
            >
              <Database size={16} />
              {seedMutation.isPending ? 'Adding...' : 'Add Default Translations'}
            </button>
            <button className="btn btn-secondary" onClick={handleExport} title="Download translations as file">
              <Download size={16} />
              Export
            </button>
            <label className="btn btn-secondary" style={{ cursor: 'pointer' }} title="Upload translations file">
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

      <div style={{ display: 'grid', gridTemplateColumns: '280px 1fr', gap: '1.5rem' }}>
        <div>
          <div style={{ 
            fontSize: '0.6875rem', 
            fontWeight: 600, 
            color: 'var(--text-muted)', 
            textTransform: 'uppercase',
            letterSpacing: '0.05em',
            marginBottom: '0.75rem',
          }}>
            Content Type
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.375rem' }}>
            {ENTITY_TYPES.map((et) => {
              const Icon = et.icon;
              const isActive = entityType === et.value;
              return (
                <button
                  key={et.value}
                  onClick={() => { setEntityType(et.value); setPage(1); setSelectedGroup(null); }}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.75rem',
                    padding: '0.75rem 1rem',
                    background: isActive ? 'var(--primary)' : 'var(--bg-primary)',
                    color: isActive ? 'white' : 'var(--text-primary)',
                    border: `1px solid ${isActive ? 'var(--primary)' : 'var(--border)'}`,
                    borderRadius: '8px',
                    cursor: 'pointer',
                    textAlign: 'left',
                    transition: 'all 0.2s',
                  }}
                >
                  <Icon size={18} style={{ opacity: 0.8 }} />
                  <div>
                    <div style={{ fontWeight: 500, fontSize: '0.875rem' }}>{et.label}</div>
                    <div style={{ 
                      fontSize: '0.75rem', 
                      opacity: isActive ? 0.85 : 0.6,
                      marginTop: '0.125rem',
                    }}>
                      {et.description}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>

          {entityType === 'SYSTEM' && groupedTranslations && (
            <>
              <div style={{ 
                fontSize: '0.6875rem', 
                fontWeight: 600, 
                color: 'var(--text-muted)', 
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
                marginTop: '1.5rem',
                marginBottom: '0.75rem',
              }}>
                Categories
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                {SYSTEM_KEY_GROUPS.map((group) => {
                  const count = groupedTranslations[group.prefix]?.length || 0;
                  const isActive = selectedGroup === group.prefix;
                  return (
                    <button
                      key={group.prefix}
                      onClick={() => setSelectedGroup(isActive ? null : group.prefix)}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '0.625rem 0.875rem',
                        background: isActive ? `${group.color}10` : 'transparent',
                        border: 'none',
                        borderRadius: '6px',
                        cursor: 'pointer',
                        transition: 'all 0.2s',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <div style={{ 
                          width: '8px', 
                          height: '8px', 
                          borderRadius: '2px',
                          background: group.color,
                        }} />
                        <span style={{ 
                          fontSize: '0.8125rem', 
                          fontWeight: isActive ? 600 : 400,
                          color: isActive ? group.color : 'var(--text-secondary)',
                        }}>
                          {group.label}
                        </span>
                      </div>
                      <span style={{ 
                        fontSize: '0.75rem', 
                        color: 'var(--text-muted)',
                        background: 'var(--bg-secondary)',
                        padding: '0.125rem 0.5rem',
                        borderRadius: '10px',
                      }}>
                        {count}
                      </span>
                    </button>
                  );
                })}
              </div>
            </>
          )}
        </div>

        <div>
          <div className="card" style={{ marginBottom: '1rem', overflow: 'hidden' }}>
            <div style={{ 
              padding: '1rem 1.25rem', 
              background: 'var(--bg-secondary)',
              borderBottom: '1px solid var(--border)',
              display: 'flex', 
              gap: '1rem', 
              alignItems: 'center', 
              justifyContent: 'space-between',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                <div style={{ position: 'relative' }}>
                  <Search size={16} style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                  <input
                    type="text"
                    className="form-input"
                    placeholder="Search translations..."
                    value={searchTerm}
                    onChange={(e) => { setSearchTerm(e.target.value); setPage(1); }}
                    style={{ paddingLeft: '2.25rem', width: '280px' }}
                  />
                </div>
                <select
                  className="form-select"
                  value={langCode}
                  onChange={(e) => { setLangCode(e.target.value); setPage(1); }}
                  style={{ width: 'auto' }}
                >
                  <option value="">All Languages</option>
                  {languages.map((lang) => (
                    <option key={lang.code} value={lang.code}>
                      {lang.name}
                    </option>
                  ))}
                </select>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <span style={{ 
                  color: 'var(--text-muted)', 
                  fontSize: '0.8125rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.375rem',
                }}>
                  <Languages size={14} />
                  {total} translations
                </span>
              </div>
            </div>
          </div>

          {isLoading ? (
            <div className="card" style={{ padding: '4rem', textAlign: 'center', color: 'var(--text-muted)' }}>
              <div className="loading-spinner" style={{ margin: '0 auto 1rem' }} />
              Loading translations...
            </div>
          ) : translations.length === 0 ? (
            <div className="card" style={{ padding: '4rem', textAlign: 'center' }}>
              <FileText size={48} style={{ color: 'var(--text-muted)', marginBottom: '1rem' }} />
              <h3 style={{ marginBottom: '0.5rem', fontWeight: 600 }}>No Translations Found</h3>
              <p style={{ color: 'var(--text-muted)', marginBottom: '1.5rem', maxWidth: '400px', margin: '0 auto' }}>
                {entityType === 'SYSTEM' 
                  ? 'Click "Add Default Translations" to populate common UI text, or add translations manually.'
                  : 'Translations will appear here when you add multilingual content to this type of data.'}
              </p>
              {entityType === 'SYSTEM' && (
                <button 
                  className="btn btn-primary" 
                  onClick={() => seedMutation.mutate()}
                  disabled={seedMutation.isPending}
                  style={{ marginTop: '1rem' }}
                >
                  <Database size={16} />
                  Add Default Translations
                </button>
              )}
            </div>
          ) : entityType === 'SYSTEM' && groupedTranslations ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {(selectedGroup ? [{ prefix: selectedGroup, ...SYSTEM_KEY_GROUPS.find(g => g.prefix === selectedGroup)! }] : SYSTEM_KEY_GROUPS)
                .filter(group => groupedTranslations[group.prefix]?.length > 0)
                .map((group) => {
                  const items = groupedTranslations[group.prefix] || [];
                  const isExpanded = expandedGroups.has(group.prefix);
                  
                  return (
                    <div key={group.prefix} className="card" style={{ overflow: 'hidden' }}>
                      <button
                        onClick={() => toggleGroup(group.prefix)}
                        style={{
                          width: '100%',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          padding: '1rem 1.25rem',
                          background: 'var(--bg-secondary)',
                          border: 'none',
                          borderBottom: isExpanded ? '1px solid var(--border)' : 'none',
                          cursor: 'pointer',
                          textAlign: 'left',
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                          {isExpanded ? <ChevronDown size={18} /> : <ChevronRight size={18} />}
                          <div style={{ 
                            width: '10px', 
                            height: '10px', 
                            borderRadius: '3px',
                            background: group.color,
                          }} />
                          <span style={{ fontWeight: 600, fontSize: '0.9375rem' }}>{group.label}</span>
                          <span style={{ 
                            fontSize: '0.75rem', 
                            color: 'var(--text-muted)',
                            background: 'var(--bg-primary)',
                            padding: '0.25rem 0.625rem',
                            borderRadius: '12px',
                          }}>
                            {items.length} items
                          </span>
                        </div>
                      </button>
                      
                      {isExpanded && (
                        <div style={{ 
                          padding: '1rem',
                          display: 'grid',
                          gridTemplateColumns: 'repeat(auto-fill, minmax(400px, 1fr))',
                          gap: '0.75rem',
                        }}>
                          {items.map((entry: TranslationEntry) => renderTranslationCard(entry, false))}
                        </div>
                      )}
                    </div>
                  );
                })}
            </div>
          ) : (
            <div style={{ 
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(400px, 1fr))',
              gap: '0.75rem',
            }}>
              {translations.map((entry: TranslationEntry) => renderTranslationCard(entry, true))}
            </div>
          )}

          {totalPages > 1 && (
            <div style={{ 
              marginTop: '1.5rem',
              padding: '1rem', 
              background: 'var(--bg-secondary)',
              borderRadius: '8px',
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
        </div>
      </div>
    </div>
  );
}
