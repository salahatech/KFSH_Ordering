import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../lib/api';
import { useToast } from '../components/ui/Toast';
import { KpiCard } from '../components/shared';
import {
  FlaskConical,
  Plus,
  Trash2,
  ChevronDown,
  ChevronUp,
  Check,
  X,
  ArrowLeft,
  Play,
  Archive,
  FileText,
  CheckCircle,
  Clock,
  Edit2,
} from 'lucide-react';

interface QcTestDefinition {
  id: string;
  code: string;
  nameEn: string;
  resultType: string;
  unit: string | null;
  category: string | null;
}

interface SpecRule {
  ruleType: string;
  minValue?: number;
  maxValue?: number;
  targetValue?: number;
  tolerance?: number;
  textCriteriaEn?: string;
}

interface TemplateLine {
  id?: string;
  testDefinitionId: string;
  testDefinition?: QcTestDefinition;
  displayOrder: number;
  isRequired: boolean;
  specRule?: SpecRule;
  specRuleId?: string;
  criteriaTextOverrideEn?: string;
  allowManualPassFail: boolean;
  attachmentRequired: boolean;
}

interface ProductQcTemplate {
  id: string;
  version: number;
  status: 'DRAFT' | 'ACTIVE' | 'RETIRED';
  notes: string | null;
  effectiveFrom: string | null;
  effectiveTo: string | null;
  templateLines: TemplateLine[];
  _count?: { batchQcSessions: number };
}

interface Product {
  id: string;
  code: string;
  name: string;
}

const RULE_TYPES = [
  { value: 'PASS_FAIL_ONLY', label: 'Pass/Fail Only' },
  { value: 'MIN', label: 'Minimum' },
  { value: 'MAX', label: 'Maximum' },
  { value: 'RANGE', label: 'Range' },
  { value: 'EQUAL', label: 'Equal To' },
  { value: 'CUSTOM_TEXT', label: 'Custom Text' },
];

export default function ProductQcTemplate() {
  const { productId } = useParams<{ productId: string }>();
  const navigate = useNavigate();
  const toast = useToast();
  const queryClient = useQueryClient();

  const [selectedTemplate, setSelectedTemplate] = useState<ProductQcTemplate | null>(null);
  const [showAddTest, setShowAddTest] = useState(false);
  const [draftLines, setDraftLines] = useState<TemplateLine[]>([]);
  const [editingLineIdx, setEditingLineIdx] = useState<number | null>(null);

  const { data: product } = useQuery<Product>({
    queryKey: ['product', productId],
    queryFn: async () => {
      const { data } = await api.get(`/products/${productId}`);
      return data;
    },
    enabled: !!productId,
  });

  const { data: templates = [], isLoading } = useQuery<ProductQcTemplate[]>({
    queryKey: ['product-qc-templates', productId],
    queryFn: async () => {
      const { data } = await api.get(`/products/${productId}/qc-templates`);
      return data;
    },
    enabled: !!productId,
  });

  const { data: testDefinitions = [] } = useQuery<QcTestDefinition[]>({
    queryKey: ['qc-test-definitions-active'],
    queryFn: async () => {
      const { data } = await api.get('/qc/test-definitions');
      return data.filter((d: any) => d.isActive);
    },
  });

  useEffect(() => {
    if (selectedTemplate) {
      setDraftLines(selectedTemplate.templateLines || []);
    }
  }, [selectedTemplate]);

  const createTemplateMutation = useMutation({
    mutationFn: async () => {
      const { data } = await api.post(`/products/${productId}/qc-templates`, {
        notes: '',
        lines: [],
      });
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['product-qc-templates', productId] });
      setSelectedTemplate(data);
      setDraftLines([]);
      toast.success('Template Created', 'New draft template created');
    },
    onError: (error: any) => {
      toast.error('Error', error.response?.data?.error || 'Failed to create template');
    },
  });

  const updateTemplateMutation = useMutation({
    mutationFn: async () => {
      if (!selectedTemplate) return;
      const { data } = await api.put(`/products/${productId}/qc-templates/${selectedTemplate.id}`, {
        lines: draftLines.map((line, idx) => ({
          testDefinitionId: line.testDefinitionId,
          displayOrder: idx,
          isRequired: line.isRequired,
          specRule: line.specRule,
          criteriaTextOverrideEn: line.criteriaTextOverrideEn,
          allowManualPassFail: line.allowManualPassFail,
          attachmentRequired: line.attachmentRequired,
        })),
      });
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['product-qc-templates', productId] });
      toast.success('Saved', 'Template changes saved');
    },
    onError: (error: any) => {
      toast.error('Error', error.response?.data?.error || 'Failed to save');
    },
  });

  const activateMutation = useMutation({
    mutationFn: async () => {
      if (!selectedTemplate) return;
      const { data } = await api.post(
        `/products/${productId}/qc-templates/${selectedTemplate.id}/activate`
      );
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['product-qc-templates', productId] });
      toast.success('Activated', 'Template is now active');
    },
    onError: (error: any) => {
      toast.error('Error', error.response?.data?.error || 'Failed to activate');
    },
  });

  const retireMutation = useMutation({
    mutationFn: async () => {
      if (!selectedTemplate) return;
      const { data } = await api.post(
        `/products/${productId}/qc-templates/${selectedTemplate.id}/retire`
      );
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['product-qc-templates', productId] });
      toast.success('Retired', 'Template has been retired');
    },
    onError: (error: any) => {
      toast.error('Error', error.response?.data?.error || 'Failed to retire');
    },
  });

  const addTestLine = (testDef: QcTestDefinition) => {
    setDraftLines([
      ...draftLines,
      {
        testDefinitionId: testDef.id,
        testDefinition: testDef,
        displayOrder: draftLines.length,
        isRequired: true,
        allowManualPassFail: false,
        attachmentRequired: false,
        specRule: { ruleType: 'PASS_FAIL_ONLY' },
      },
    ]);
    setShowAddTest(false);
  };

  const removeLine = (idx: number) => {
    setDraftLines(draftLines.filter((_, i) => i !== idx));
    setEditingLineIdx(null);
  };

  const moveLine = (idx: number, direction: 'up' | 'down') => {
    const newLines = [...draftLines];
    const targetIdx = direction === 'up' ? idx - 1 : idx + 1;
    [newLines[idx], newLines[targetIdx]] = [newLines[targetIdx], newLines[idx]];
    setDraftLines(newLines);
  };

  const updateLine = (idx: number, updates: Partial<TemplateLine>) => {
    setDraftLines(draftLines.map((line, i) => (i === idx ? { ...line, ...updates } : line)));
  };

  const getCriteriaDisplay = (line: TemplateLine): string => {
    const rule = line.specRule;
    if (!rule) return '-';
    const unit = line.testDefinition?.unit ? ` ${line.testDefinition.unit}` : '';
    switch (rule.ruleType) {
      case 'MIN':
        return `≥${rule.minValue}${unit}`;
      case 'MAX':
        return `≤${rule.maxValue}${unit}`;
      case 'RANGE':
        return `${rule.minValue}–${rule.maxValue}${unit}`;
      case 'EQUAL':
        return `=${rule.targetValue}${unit}`;
      case 'PASS_FAIL_ONLY':
        return 'Pass/Fail';
      case 'CUSTOM_TEXT':
        return rule.textCriteriaEn || '-';
      default:
        return '-';
    }
  };

  const stats = {
    total: templates.length,
    active: templates.filter((t) => t.status === 'ACTIVE').length,
    draft: templates.filter((t) => t.status === 'DRAFT').length,
    retired: templates.filter((t) => t.status === 'RETIRED').length,
  };

  const getStatusStyle = (status: string) => {
    switch (status) {
      case 'ACTIVE':
        return { bg: 'rgba(34, 197, 94, 0.1)', color: 'var(--success)' };
      case 'DRAFT':
        return { bg: 'rgba(234, 179, 8, 0.1)', color: 'var(--warning)' };
      case 'RETIRED':
        return { bg: 'rgba(100, 116, 139, 0.1)', color: 'var(--text-muted)' };
      default:
        return { bg: 'rgba(100, 116, 139, 0.1)', color: 'var(--text-muted)' };
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
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <button
            onClick={() => navigate('/products')}
            style={{
              background: 'var(--bg-secondary)',
              border: '1px solid var(--border)',
              borderRadius: 'var(--radius)',
              padding: '0.5rem',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            <ArrowLeft size={18} />
          </button>
          <div>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 600, marginBottom: '0.25rem' }}>
              QC Template: {product?.name || 'Loading...'}
            </h2>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', margin: 0 }}>
              Configure quality control tests for this product
            </p>
          </div>
        </div>
        <button className="btn btn-primary" onClick={() => createTemplateMutation.mutate()} disabled={createTemplateMutation.isPending}>
          <Plus size={16} /> New Version
        </button>
      </div>

      <div className="grid" style={{ gridTemplateColumns: 'repeat(4, 1fr)', gap: '1rem', marginBottom: '1.5rem' }}>
        <KpiCard 
          title="Total Versions" 
          value={stats.total} 
          icon={<FileText size={20} />}
          color="primary"
        />
        <KpiCard 
          title="Active" 
          value={stats.active} 
          icon={<CheckCircle size={20} />}
          color="success"
        />
        <KpiCard 
          title="Draft" 
          value={stats.draft} 
          icon={<Edit2 size={20} />}
          color="warning"
        />
        <KpiCard 
          title="Retired" 
          value={stats.retired} 
          icon={<Archive size={20} />}
          color="default"
        />
      </div>

      <div style={{ display: 'flex', gap: '1.5rem' }}>
        <div style={{ width: '280px', flexShrink: 0 }}>
          <div style={{
            background: 'var(--bg-primary)',
            border: '1px solid var(--border)',
            borderRadius: 'var(--radius)',
            padding: '1rem'
          }}>
            <h3 style={{ fontWeight: 600, marginBottom: '1rem', fontSize: '0.9375rem' }}>Template Versions</h3>

            {templates.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '2rem 1rem', color: 'var(--text-muted)' }}>
                <FlaskConical size={32} style={{ opacity: 0.3, marginBottom: '0.5rem' }} />
                <p style={{ margin: 0, fontSize: '0.875rem' }}>No templates yet</p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                {templates.map((t) => {
                  const statusStyle = getStatusStyle(t.status);
                  return (
                    <button
                      key={t.id}
                      onClick={() => setSelectedTemplate(t)}
                      style={{
                        width: '100%',
                        textAlign: 'left',
                        padding: '0.75rem',
                        borderRadius: 'var(--radius)',
                        border: selectedTemplate?.id === t.id ? '2px solid var(--primary)' : '1px solid var(--border)',
                        background: selectedTemplate?.id === t.id ? 'rgba(59, 130, 246, 0.05)' : 'var(--bg-primary)',
                        cursor: 'pointer',
                        transition: 'all 0.15s ease'
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontWeight: 500 }}>Version {t.version}</span>
                        <span style={{
                          fontSize: '0.6875rem',
                          padding: '0.125rem 0.5rem',
                          borderRadius: '9999px',
                          background: statusStyle.bg,
                          color: statusStyle.color
                        }}>
                          {t.status}
                        </span>
                      </div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
                        {t.templateLines?.length || 0} tests
                        {t._count?.batchQcSessions ? ` • ${t._count.batchQcSessions} batches` : ''}
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        <div style={{ flex: 1, minWidth: 0 }}>
          {!selectedTemplate ? (
            <div style={{
              background: 'var(--bg-primary)',
              border: '1px solid var(--border)',
              borderRadius: 'var(--radius)',
              padding: '3rem',
              textAlign: 'center',
              color: 'var(--text-muted)'
            }}>
              <FlaskConical size={48} style={{ opacity: 0.3, marginBottom: '1rem' }} />
              <p style={{ margin: 0 }}>Select a template version to edit, or create a new one</p>
            </div>
          ) : (
            <div style={{
              background: 'var(--bg-primary)',
              border: '1px solid var(--border)',
              borderRadius: 'var(--radius)',
              padding: '1.25rem'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.25rem' }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <h3 style={{ margin: 0, fontWeight: 600, fontSize: '1.125rem' }}>
                      Version {selectedTemplate.version}
                    </h3>
                    <span style={{
                      fontSize: '0.75rem',
                      padding: '0.25rem 0.75rem',
                      borderRadius: '9999px',
                      background: getStatusStyle(selectedTemplate.status).bg,
                      color: getStatusStyle(selectedTemplate.status).color
                    }}>
                      {selectedTemplate.status}
                    </span>
                  </div>
                  {selectedTemplate.effectiveFrom && (
                    <p style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', margin: '0.25rem 0 0' }}>
                      Effective from: {new Date(selectedTemplate.effectiveFrom).toLocaleDateString()}
                    </p>
                  )}
                </div>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  {selectedTemplate.status === 'DRAFT' && (
                    <>
                      <button
                        className="btn btn-secondary"
                        onClick={() => updateTemplateMutation.mutate()}
                        disabled={updateTemplateMutation.isPending}
                      >
                        Save Changes
                      </button>
                      <button
                        className="btn btn-primary"
                        onClick={() => activateMutation.mutate()}
                        disabled={draftLines.length === 0 || activateMutation.isPending}
                      >
                        <Play size={14} /> Activate
                      </button>
                    </>
                  )}
                  {selectedTemplate.status === 'ACTIVE' && (
                    <button
                      className="btn btn-secondary"
                      onClick={() => retireMutation.mutate()}
                      disabled={retireMutation.isPending}
                    >
                      <Archive size={14} /> Retire
                    </button>
                  )}
                </div>
              </div>

              {selectedTemplate.status !== 'DRAFT' && (
                <div style={{
                  background: 'rgba(234, 179, 8, 0.1)',
                  color: 'var(--warning)',
                  padding: '0.75rem 1rem',
                  borderRadius: 'var(--radius)',
                  marginBottom: '1rem',
                  fontSize: '0.8125rem'
                }}>
                  This template is {selectedTemplate.status.toLowerCase()}. Create a new version to make changes.
                </div>
              )}

              <div style={{
                border: '1px solid var(--border)',
                borderRadius: 'var(--radius)',
                overflow: 'hidden'
              }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ background: 'var(--bg-secondary)' }}>
                      <th style={{ textAlign: 'left', padding: '0.75rem 1rem', fontSize: '0.75rem', fontWeight: 500, color: 'var(--text-muted)', width: '40px' }}>#</th>
                      <th style={{ textAlign: 'left', padding: '0.75rem 1rem', fontSize: '0.75rem', fontWeight: 500, color: 'var(--text-muted)' }}>Test</th>
                      <th style={{ textAlign: 'left', padding: '0.75rem 1rem', fontSize: '0.75rem', fontWeight: 500, color: 'var(--text-muted)' }}>Category</th>
                      <th style={{ textAlign: 'left', padding: '0.75rem 1rem', fontSize: '0.75rem', fontWeight: 500, color: 'var(--text-muted)' }}>Result Type</th>
                      <th style={{ textAlign: 'left', padding: '0.75rem 1rem', fontSize: '0.75rem', fontWeight: 500, color: 'var(--text-muted)' }}>Criteria</th>
                      <th style={{ textAlign: 'center', padding: '0.75rem 1rem', fontSize: '0.75rem', fontWeight: 500, color: 'var(--text-muted)' }}>Required</th>
                      <th style={{ width: '100px' }}></th>
                    </tr>
                  </thead>
                  <tbody>
                    {draftLines.map((line, idx) => (
                      <>
                        <tr key={line.testDefinitionId + idx} style={{ borderTop: '1px solid var(--border)' }}>
                          <td style={{ padding: '0.75rem 1rem', color: 'var(--text-muted)', fontSize: '0.8125rem' }}>{idx + 1}</td>
                          <td style={{ padding: '0.75rem 1rem', fontWeight: 500 }}>
                            {line.testDefinition?.nameEn || line.testDefinitionId}
                          </td>
                          <td style={{ padding: '0.75rem 1rem', color: 'var(--text-muted)' }}>
                            {line.testDefinition?.category || '-'}
                          </td>
                          <td style={{ padding: '0.75rem 1rem' }}>
                            <span style={{
                              fontSize: '0.6875rem',
                              padding: '0.125rem 0.5rem',
                              borderRadius: '9999px',
                              background: 'rgba(59, 130, 246, 0.1)',
                              color: 'var(--primary)'
                            }}>
                              {line.testDefinition?.resultType}
                            </span>
                          </td>
                          <td style={{ padding: '0.75rem 1rem' }}>{getCriteriaDisplay(line)}</td>
                          <td style={{ padding: '0.75rem 1rem', textAlign: 'center' }}>
                            {line.isRequired ? (
                              <Check size={16} style={{ color: 'var(--success)' }} />
                            ) : (
                              <X size={16} style={{ color: 'var(--text-muted)' }} />
                            )}
                          </td>
                          <td style={{ padding: '0.75rem 1rem' }}>
                            {selectedTemplate.status === 'DRAFT' && (
                              <div style={{ display: 'flex', gap: '0.25rem', justifyContent: 'flex-end' }}>
                                <button
                                  onClick={() => moveLine(idx, 'up')}
                                  disabled={idx === 0}
                                  style={{
                                    padding: '0.25rem',
                                    background: 'none',
                                    border: 'none',
                                    cursor: idx === 0 ? 'not-allowed' : 'pointer',
                                    opacity: idx === 0 ? 0.3 : 1,
                                    borderRadius: 'var(--radius)'
                                  }}
                                >
                                  <ChevronUp size={16} />
                                </button>
                                <button
                                  onClick={() => moveLine(idx, 'down')}
                                  disabled={idx === draftLines.length - 1}
                                  style={{
                                    padding: '0.25rem',
                                    background: 'none',
                                    border: 'none',
                                    cursor: idx === draftLines.length - 1 ? 'not-allowed' : 'pointer',
                                    opacity: idx === draftLines.length - 1 ? 0.3 : 1,
                                    borderRadius: 'var(--radius)'
                                  }}
                                >
                                  <ChevronDown size={16} />
                                </button>
                                <button
                                  onClick={() => setEditingLineIdx(editingLineIdx === idx ? null : idx)}
                                  style={{
                                    padding: '0.25rem',
                                    background: editingLineIdx === idx ? 'rgba(59, 130, 246, 0.1)' : 'none',
                                    border: 'none',
                                    cursor: 'pointer',
                                    borderRadius: 'var(--radius)'
                                  }}
                                >
                                  <Edit2 size={14} />
                                </button>
                                <button
                                  onClick={() => removeLine(idx)}
                                  style={{
                                    padding: '0.25rem',
                                    background: 'none',
                                    border: 'none',
                                    cursor: 'pointer',
                                    color: 'var(--danger)',
                                    borderRadius: 'var(--radius)'
                                  }}
                                >
                                  <Trash2 size={14} />
                                </button>
                              </div>
                            )}
                          </td>
                        </tr>
                        {editingLineIdx === idx && selectedTemplate.status === 'DRAFT' && (
                          <tr style={{ background: 'var(--bg-secondary)' }}>
                            <td colSpan={7} style={{ padding: '1rem' }}>
                              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem' }}>
                                <div className="form-group">
                                  <label className="form-label">Rule Type</label>
                                  <select
                                    value={line.specRule?.ruleType || 'PASS_FAIL_ONLY'}
                                    onChange={(e) =>
                                      updateLine(idx, {
                                        specRule: {
                                          ...line.specRule,
                                          ruleType: e.target.value,
                                        },
                                      })
                                    }
                                    className="form-control"
                                  >
                                    {RULE_TYPES.map((rt) => (
                                      <option key={rt.value} value={rt.value}>
                                        {rt.label}
                                      </option>
                                    ))}
                                  </select>
                                </div>
                                {['MIN', 'RANGE'].includes(line.specRule?.ruleType || '') && (
                                  <div className="form-group">
                                    <label className="form-label">Min Value</label>
                                    <input
                                      type="number"
                                      value={line.specRule?.minValue || ''}
                                      onChange={(e) =>
                                        updateLine(idx, {
                                          specRule: {
                                            ...line.specRule,
                                            ruleType: line.specRule?.ruleType || 'MIN',
                                            minValue: parseFloat(e.target.value),
                                          },
                                        })
                                      }
                                      className="form-control"
                                      placeholder="0"
                                    />
                                  </div>
                                )}
                                {['MAX', 'RANGE'].includes(line.specRule?.ruleType || '') && (
                                  <div className="form-group">
                                    <label className="form-label">Max Value</label>
                                    <input
                                      type="number"
                                      value={line.specRule?.maxValue || ''}
                                      onChange={(e) =>
                                        updateLine(idx, {
                                          specRule: {
                                            ...line.specRule,
                                            ruleType: line.specRule?.ruleType || 'MAX',
                                            maxValue: parseFloat(e.target.value),
                                          },
                                        })
                                      }
                                      className="form-control"
                                      placeholder="100"
                                    />
                                  </div>
                                )}
                                {line.specRule?.ruleType === 'EQUAL' && (
                                  <div className="form-group">
                                    <label className="form-label">Target Value</label>
                                    <input
                                      type="number"
                                      value={line.specRule?.targetValue || ''}
                                      onChange={(e) =>
                                        updateLine(idx, {
                                          specRule: {
                                            ...line.specRule,
                                            ruleType: 'EQUAL',
                                            targetValue: parseFloat(e.target.value),
                                          },
                                        })
                                      }
                                      className="form-control"
                                      placeholder="7.0"
                                    />
                                  </div>
                                )}
                                {line.specRule?.ruleType === 'CUSTOM_TEXT' && (
                                  <div className="form-group" style={{ gridColumn: 'span 2' }}>
                                    <label className="form-label">Custom Criteria Text</label>
                                    <input
                                      type="text"
                                      value={line.specRule?.textCriteriaEn || ''}
                                      onChange={(e) =>
                                        updateLine(idx, {
                                          specRule: {
                                            ...line.specRule,
                                            ruleType: 'CUSTOM_TEXT',
                                            textCriteriaEn: e.target.value,
                                          },
                                        })
                                      }
                                      className="form-control"
                                      placeholder="Clear to slightly opalescent"
                                    />
                                  </div>
                                )}
                                <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
                                  <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
                                    <input
                                      type="checkbox"
                                      checked={line.isRequired}
                                      onChange={(e) => updateLine(idx, { isRequired: e.target.checked })}
                                    />
                                    Required
                                  </label>
                                  <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
                                    <input
                                      type="checkbox"
                                      checked={line.attachmentRequired}
                                      onChange={(e) => updateLine(idx, { attachmentRequired: e.target.checked })}
                                    />
                                    Attachment Required
                                  </label>
                                </div>
                              </div>
                            </td>
                          </tr>
                        )}
                      </>
                    ))}
                    {draftLines.length === 0 && (
                      <tr>
                        <td colSpan={7} style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                          No tests added yet. Click "Add Test" to add QC tests to this template.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              {selectedTemplate.status === 'DRAFT' && (
                <div style={{ marginTop: '1rem' }}>
                  {showAddTest ? (
                    <div style={{
                      border: '1px solid var(--border)',
                      borderRadius: 'var(--radius)',
                      padding: '1rem'
                    }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                        <h4 style={{ margin: 0, fontWeight: 500 }}>Select a Test to Add</h4>
                        <button
                          onClick={() => setShowAddTest(false)}
                          style={{
                            background: 'none',
                            border: 'none',
                            cursor: 'pointer',
                            padding: '0.25rem'
                          }}
                        >
                          <X size={16} />
                        </button>
                      </div>
                      <div style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(3, 1fr)',
                        gap: '0.5rem',
                        maxHeight: '15rem',
                        overflowY: 'auto'
                      }}>
                        {testDefinitions
                          .filter((td) => !draftLines.some((l) => l.testDefinitionId === td.id))
                          .map((td) => (
                            <button
                              key={td.id}
                              onClick={() => addTestLine(td)}
                              style={{
                                textAlign: 'left',
                                padding: '0.5rem 0.75rem',
                                borderRadius: 'var(--radius)',
                                border: '1px solid var(--border)',
                                background: 'var(--bg-primary)',
                                cursor: 'pointer',
                                transition: 'all 0.15s ease'
                              }}
                            >
                              <div style={{ fontWeight: 500, fontSize: '0.8125rem' }}>{td.nameEn}</div>
                              <div style={{ fontSize: '0.6875rem', color: 'var(--text-muted)' }}>
                                {td.code} | {td.resultType}
                              </div>
                            </button>
                          ))}
                      </div>
                    </div>
                  ) : (
                    <button className="btn btn-secondary" onClick={() => setShowAddTest(true)}>
                      <Plus size={16} /> Add Test
                    </button>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
