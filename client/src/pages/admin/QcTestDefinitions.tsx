import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../../lib/api';
import { useToast } from '../../components/ui/Toast';
import { KpiCard } from '../../components/shared';
import { Plus, Edit2, Trash2, FlaskConical, Search, X, CheckCircle, XCircle, Filter, FileText, Beaker } from 'lucide-react';

interface QcTestDefinition {
  id: string;
  code: string;
  nameEn: string;
  nameAr: string | null;
  descriptionEn: string | null;
  descriptionAr: string | null;
  resultType: 'PASS_FAIL' | 'NUMERIC' | 'TEXT' | 'OPTION_LIST';
  unit: string | null;
  optionList: string | null;
  category: string | null;
  method: string | null;
  isActive: boolean;
  createdAt: string;
}

const RESULT_TYPES = [
  { value: 'PASS_FAIL', label: 'Pass/Fail' },
  { value: 'NUMERIC', label: 'Numeric' },
  { value: 'TEXT', label: 'Text' },
  { value: 'OPTION_LIST', label: 'Option List' },
];

const CATEGORIES = [
  'Appearance',
  'Identity',
  'Purity',
  'Potency',
  'Sterility',
  'Endotoxin',
  'pH',
  'Radioactivity',
  'Particle Size',
  'Other',
];

export default function QcTestDefinitions() {
  const toast = useToast();
  const queryClient = useQueryClient();
  const [showModal, setShowModal] = useState(false);
  const [editingItem, setEditingItem] = useState<QcTestDefinition | null>(null);
  const [detailItem, setDetailItem] = useState<QcTestDefinition | null>(null);
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [formData, setFormData] = useState({
    code: '',
    nameEn: '',
    nameAr: '',
    descriptionEn: '',
    descriptionAr: '',
    resultType: 'PASS_FAIL',
    unit: '',
    optionList: '',
    category: '',
    method: '',
    isActive: true,
  });

  const { data: definitions = [], isLoading } = useQuery<QcTestDefinition[]>({
    queryKey: ['qc-test-definitions'],
    queryFn: async () => {
      const { data } = await api.get('/qc/test-definitions');
      return data;
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      const { data: result } = await api.post('/qc/test-definitions', data);
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['qc-test-definitions'] });
      toast.success('Test Created', 'QC test definition has been added successfully');
      closeModal();
    },
    onError: (error: any) => {
      toast.error('Error', error.response?.data?.error || 'Failed to create test definition');
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: typeof formData }) => {
      const { data: result } = await api.put(`/qc/test-definitions/${id}`, data);
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['qc-test-definitions'] });
      toast.success('Test Updated', 'QC test definition has been updated successfully');
      closeModal();
    },
    onError: (error: any) => {
      toast.error('Error', error.response?.data?.error || 'Failed to update test definition');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/qc/test-definitions/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['qc-test-definitions'] });
      toast.success('Test Deleted', 'QC test definition has been removed');
      setDetailItem(null);
    },
    onError: (error: any) => {
      toast.error('Error', error.response?.data?.error || 'Failed to delete test definition');
    },
  });

  const openModal = (item?: QcTestDefinition) => {
    if (item) {
      setEditingItem(item);
      setFormData({
        code: item.code,
        nameEn: item.nameEn,
        nameAr: item.nameAr || '',
        descriptionEn: item.descriptionEn || '',
        descriptionAr: item.descriptionAr || '',
        resultType: item.resultType,
        unit: item.unit || '',
        optionList: item.optionList || '',
        category: item.category || '',
        method: item.method || '',
        isActive: item.isActive,
      });
    } else {
      setEditingItem(null);
      setFormData({
        code: '',
        nameEn: '',
        nameAr: '',
        descriptionEn: '',
        descriptionAr: '',
        resultType: 'PASS_FAIL',
        unit: '',
        optionList: '',
        category: '',
        method: '',
        isActive: true,
      });
    }
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setEditingItem(null);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingItem) {
      updateMutation.mutate({ id: editingItem.id, data: formData });
    } else {
      createMutation.mutate(formData);
    }
  };

  const handleDelete = (item: QcTestDefinition) => {
    if (confirm(`Are you sure you want to delete "${item.nameEn}"?`)) {
      deleteMutation.mutate(item.id);
    }
  };

  const filteredDefinitions = definitions.filter((def) => {
    const matchesSearch =
      def.code.toLowerCase().includes(search.toLowerCase()) ||
      def.nameEn.toLowerCase().includes(search.toLowerCase());
    const matchesCategory = !categoryFilter || def.category === categoryFilter;
    return matchesSearch && matchesCategory;
  });

  const uniqueCategories = [...new Set(definitions.map((d) => d.category).filter(Boolean))];

  const stats = {
    total: definitions.length,
    active: definitions.filter((d) => d.isActive).length,
    inactive: definitions.filter((d) => !d.isActive).length,
    numeric: definitions.filter((d) => d.resultType === 'NUMERIC').length,
  };

  const getResultTypeColor = (type: string) => {
    switch (type) {
      case 'PASS_FAIL': return { bg: 'rgba(34, 197, 94, 0.1)', color: 'var(--success)' };
      case 'NUMERIC': return { bg: 'rgba(59, 130, 246, 0.1)', color: 'var(--primary)' };
      case 'TEXT': return { bg: 'rgba(234, 179, 8, 0.1)', color: 'var(--warning)' };
      case 'OPTION_LIST': return { bg: 'rgba(168, 85, 247, 0.1)', color: '#a855f7' };
      default: return { bg: 'rgba(100, 116, 139, 0.1)', color: 'var(--text-muted)' };
    }
  };

  if (isLoading) {
    return (
      <div className="loading-overlay">
        <div className="spinner" />
      </div>
    );
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.5rem' }}>
        <div>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 600, marginBottom: '0.25rem' }}>QC Test Definitions</h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', margin: 0 }}>
            Manage catalog of quality control tests for radiopharmaceuticals
          </p>
        </div>
        <button className="btn btn-primary" onClick={() => openModal()}>
          <Plus size={16} /> Add Test
        </button>
      </div>

      <div className="grid" style={{ gridTemplateColumns: 'repeat(4, 1fr)', gap: '1rem', marginBottom: '1.5rem' }}>
        <KpiCard 
          title="Total Tests" 
          value={stats.total} 
          icon={<FlaskConical size={20} />}
          color="primary"
          onClick={() => setCategoryFilter('')}
          active={!categoryFilter}
        />
        <KpiCard 
          title="Active" 
          value={stats.active} 
          icon={<CheckCircle size={20} />}
          color="success"
        />
        <KpiCard 
          title="Inactive" 
          value={stats.inactive} 
          icon={<XCircle size={20} />}
          color="warning"
        />
        <KpiCard 
          title="Numeric Tests" 
          value={stats.numeric} 
          icon={<Beaker size={20} />}
          color="info"
        />
      </div>

      <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '1.5rem', flexWrap: 'wrap' }}>
        <div style={{ position: 'relative', flex: 1, minWidth: '200px' }}>
          <Search size={16} style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
          <input
            type="text"
            placeholder="Search by code or name..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{
              width: '100%',
              padding: '0.625rem 0.75rem 0.625rem 2.25rem',
              border: '1px solid var(--border)',
              borderRadius: 'var(--radius)',
              background: 'var(--bg-primary)',
              fontSize: '0.875rem'
            }}
          />
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Filter size={16} style={{ color: 'var(--text-muted)' }} />
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            style={{
              padding: '0.625rem 0.75rem',
              border: '1px solid var(--border)',
              borderRadius: 'var(--radius)',
              background: 'var(--bg-primary)',
              fontSize: '0.875rem',
              minWidth: '150px'
            }}
          >
            <option value="">All Categories</option>
            {uniqueCategories.map((cat) => (
              <option key={cat} value={cat || ''}>
                {cat}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div style={{ display: 'flex', gap: '1.5rem' }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          {filteredDefinitions.length === 0 ? (
            <div style={{ 
              textAlign: 'center', 
              padding: '3rem', 
              background: 'var(--bg-primary)', 
              borderRadius: 'var(--radius)', 
              border: '1px solid var(--border)' 
            }}>
              <FlaskConical size={48} style={{ color: 'var(--text-muted)', opacity: 0.3, marginBottom: '1rem' }} />
              <p style={{ color: 'var(--text-muted)', margin: 0 }}>
                No test definitions found. Add your first QC test to get started.
              </p>
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '1rem' }}>
              {filteredDefinitions.map((def) => {
                const typeColor = getResultTypeColor(def.resultType);
                return (
                  <div
                    key={def.id}
                    onClick={() => setDetailItem(def)}
                    style={{
                      background: 'var(--bg-primary)',
                      border: detailItem?.id === def.id ? '2px solid var(--primary)' : '1px solid var(--border)',
                      borderRadius: 'var(--radius)',
                      padding: '1rem',
                      cursor: 'pointer',
                      transition: 'all 0.15s ease'
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.75rem' }}>
                      <div>
                        <div style={{ fontFamily: 'monospace', fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '0.25rem' }}>
                          {def.code}
                        </div>
                        <div style={{ fontWeight: 600, fontSize: '0.9375rem' }}>{def.nameEn}</div>
                      </div>
                      <span style={{
                        padding: '0.125rem 0.5rem',
                        borderRadius: '9999px',
                        fontSize: '0.6875rem',
                        fontWeight: 500,
                        background: def.isActive ? 'rgba(34, 197, 94, 0.1)' : 'rgba(100, 116, 139, 0.1)',
                        color: def.isActive ? 'var(--success)' : 'var(--text-muted)'
                      }}>
                        {def.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </div>
                    <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                      <span style={{
                        padding: '0.125rem 0.5rem',
                        borderRadius: '9999px',
                        fontSize: '0.6875rem',
                        background: typeColor.bg,
                        color: typeColor.color
                      }}>
                        {RESULT_TYPES.find((t) => t.value === def.resultType)?.label}
                      </span>
                      {def.category && (
                        <span style={{
                          padding: '0.125rem 0.5rem',
                          borderRadius: '9999px',
                          fontSize: '0.6875rem',
                          background: 'var(--bg-secondary)',
                          color: 'var(--text-muted)'
                        }}>
                          {def.category}
                        </span>
                      )}
                      {def.unit && (
                        <span style={{
                          padding: '0.125rem 0.5rem',
                          borderRadius: '9999px',
                          fontSize: '0.6875rem',
                          background: 'var(--bg-secondary)',
                          color: 'var(--text-muted)'
                        }}>
                          {def.unit}
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {detailItem && (
          <div style={{ 
            width: '320px', 
            flexShrink: 0,
            background: 'var(--bg-primary)',
            border: '1px solid var(--border)',
            borderRadius: 'var(--radius)',
            padding: '1.25rem',
            height: 'fit-content',
            position: 'sticky',
            top: '1rem'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
              <div>
                <div style={{ fontFamily: 'monospace', fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '0.25rem' }}>
                  {detailItem.code}
                </div>
                <h3 style={{ margin: 0, fontSize: '1.125rem', fontWeight: 600 }}>{detailItem.nameEn}</h3>
                {detailItem.nameAr && (
                  <div style={{ fontSize: '0.875rem', color: 'var(--text-muted)', direction: 'rtl', marginTop: '0.25rem' }}>
                    {detailItem.nameAr}
                  </div>
                )}
              </div>
              <button 
                onClick={() => setDetailItem(null)}
                style={{ 
                  background: 'none', 
                  border: 'none', 
                  cursor: 'pointer', 
                  padding: '0.25rem',
                  color: 'var(--text-muted)'
                }}
              >
                <X size={18} />
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div>
                <div style={{ fontSize: '0.6875rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.375rem' }}>
                  Status
                </div>
                <span style={{
                  padding: '0.25rem 0.75rem',
                  borderRadius: '9999px',
                  fontSize: '0.75rem',
                  fontWeight: 500,
                  background: detailItem.isActive ? 'rgba(34, 197, 94, 0.1)' : 'rgba(100, 116, 139, 0.1)',
                  color: detailItem.isActive ? 'var(--success)' : 'var(--text-muted)'
                }}>
                  {detailItem.isActive ? 'Active' : 'Inactive'}
                </span>
              </div>

              <div>
                <div style={{ fontSize: '0.6875rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.375rem' }}>
                  Result Type
                </div>
                <span style={{
                  padding: '0.25rem 0.75rem',
                  borderRadius: '9999px',
                  fontSize: '0.75rem',
                  background: getResultTypeColor(detailItem.resultType).bg,
                  color: getResultTypeColor(detailItem.resultType).color
                }}>
                  {RESULT_TYPES.find((t) => t.value === detailItem.resultType)?.label}
                </span>
              </div>

              {detailItem.category && (
                <div>
                  <div style={{ fontSize: '0.6875rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.375rem' }}>
                    Category
                  </div>
                  <div style={{ fontSize: '0.875rem' }}>{detailItem.category}</div>
                </div>
              )}

              {detailItem.unit && (
                <div>
                  <div style={{ fontSize: '0.6875rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.375rem' }}>
                    Unit
                  </div>
                  <div style={{ fontSize: '0.875rem' }}>{detailItem.unit}</div>
                </div>
              )}

              {detailItem.method && (
                <div>
                  <div style={{ fontSize: '0.6875rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.375rem' }}>
                    Test Method
                  </div>
                  <div style={{ fontSize: '0.875rem' }}>{detailItem.method}</div>
                </div>
              )}

              {detailItem.optionList && detailItem.resultType === 'OPTION_LIST' && (
                <div>
                  <div style={{ fontSize: '0.6875rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.375rem' }}>
                    Options
                  </div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.375rem' }}>
                    {detailItem.optionList.split(',').map((opt, i) => (
                      <span key={i} style={{
                        padding: '0.125rem 0.5rem',
                        borderRadius: '9999px',
                        fontSize: '0.6875rem',
                        background: 'var(--bg-secondary)',
                        border: '1px solid var(--border)'
                      }}>
                        {opt.trim()}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {detailItem.descriptionEn && (
                <div>
                  <div style={{ fontSize: '0.6875rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.375rem' }}>
                    Description
                  </div>
                  <div style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                    {detailItem.descriptionEn}
                  </div>
                </div>
              )}

              <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem' }}>
                <button
                  className="btn btn-primary"
                  style={{ flex: 1 }}
                  onClick={() => openModal(detailItem)}
                >
                  <Edit2 size={14} /> Edit
                </button>
                <button
                  className="btn btn-secondary"
                  style={{ color: 'var(--danger)' }}
                  onClick={() => handleDelete(detailItem)}
                >
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {showModal && (
        <div className="modal-overlay" onClick={closeModal}>
          <div className="modal" style={{ maxWidth: '40rem' }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3 style={{ fontWeight: 600, margin: 0 }}>
                {editingItem ? 'Edit Test Definition' : 'Add Test Definition'}
              </h3>
              <button onClick={closeModal} style={{ background: 'var(--bg-secondary)', border: 'none', borderRadius: 'var(--radius)', padding: '0.375rem', cursor: 'pointer', fontSize: '1.25rem', lineHeight: 1 }}>&times;</button>
            </div>

            <form onSubmit={handleSubmit}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div className="form-group">
                  <label className="form-label">Code *</label>
                  <input
                    type="text"
                    value={formData.code}
                    onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                    className="form-control"
                    placeholder="e.g., STERILITY"
                    required
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Category</label>
                  <select
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    className="form-control"
                  >
                    <option value="">Select Category</option>
                    {CATEGORIES.map((cat) => (
                      <option key={cat} value={cat}>
                        {cat}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Name (English) *</label>
                  <input
                    type="text"
                    value={formData.nameEn}
                    onChange={(e) => setFormData({ ...formData, nameEn: e.target.value })}
                    className="form-control"
                    placeholder="Sterility Test"
                    required
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Name (Arabic)</label>
                  <input
                    type="text"
                    value={formData.nameAr}
                    onChange={(e) => setFormData({ ...formData, nameAr: e.target.value })}
                    className="form-control"
                    dir="rtl"
                    placeholder="اختبار العقم"
                  />
                </div>
                <div className="form-group" style={{ gridColumn: 'span 2' }}>
                  <label className="form-label">Description (English)</label>
                  <textarea
                    value={formData.descriptionEn}
                    onChange={(e) => setFormData({ ...formData, descriptionEn: e.target.value })}
                    className="form-control"
                    rows={2}
                    placeholder="Detailed test description..."
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Result Type *</label>
                  <select
                    value={formData.resultType}
                    onChange={(e) => setFormData({ ...formData, resultType: e.target.value })}
                    className="form-control"
                    required
                  >
                    {RESULT_TYPES.map((type) => (
                      <option key={type.value} value={type.value}>
                        {type.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Unit</label>
                  <input
                    type="text"
                    value={formData.unit}
                    onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
                    className="form-control"
                    placeholder="e.g., mCi, pH, %"
                  />
                </div>
                {formData.resultType === 'OPTION_LIST' && (
                  <div className="form-group" style={{ gridColumn: 'span 2' }}>
                    <label className="form-label">Options (comma-separated)</label>
                    <input
                      type="text"
                      value={formData.optionList}
                      onChange={(e) => setFormData({ ...formData, optionList: e.target.value })}
                      className="form-control"
                      placeholder="Clear, Slightly Hazy, Hazy"
                    />
                  </div>
                )}
                <div className="form-group" style={{ gridColumn: 'span 2' }}>
                  <label className="form-label">Test Method</label>
                  <input
                    type="text"
                    value={formData.method}
                    onChange={(e) => setFormData({ ...formData, method: e.target.value })}
                    className="form-control"
                    placeholder="USP <71> Sterility Testing"
                  />
                </div>
                <div className="form-group" style={{ gridColumn: 'span 2' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
                    <input
                      type="checkbox"
                      checked={formData.isActive}
                      onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                    />
                    <span>Active</span>
                  </label>
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1.5rem' }}>
                <button type="button" onClick={closeModal} className="btn btn-secondary">
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={createMutation.isPending || updateMutation.isPending}
                >
                  {createMutation.isPending || updateMutation.isPending
                    ? 'Saving...'
                    : editingItem
                    ? 'Update Test'
                    : 'Create Test'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
