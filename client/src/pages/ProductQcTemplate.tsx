import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../lib/api';
import { useToast } from '../components/ui/Toast';
import { PageHeader } from '../components/shared';
import {
  FlaskConical,
  Plus,
  Trash2,
  GripVertical,
  ChevronDown,
  ChevronUp,
  Check,
  X,
  ArrowLeft,
  Play,
  Archive,
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
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['product-qc-templates', productId] });
      setSelectedTemplate(data);
      toast.success('Template Saved', 'Template has been saved');
    },
    onError: (error: any) => {
      toast.error('Error', error.response?.data?.error || 'Failed to save template');
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
      toast.success('Template Activated', 'Template is now active and will be used for new batches');
    },
    onError: (error: any) => {
      toast.error('Error', error.response?.data?.error || 'Failed to activate template');
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
      toast.success('Template Retired', 'Template has been retired');
    },
    onError: (error: any) => {
      toast.error('Error', error.response?.data?.error || 'Failed to retire template');
    },
  });

  const addTestLine = (testDef: QcTestDefinition) => {
    const newLine: TemplateLine = {
      testDefinitionId: testDef.id,
      testDefinition: testDef,
      displayOrder: draftLines.length,
      isRequired: true,
      specRule: { ruleType: 'PASS_FAIL_ONLY' },
      allowManualPassFail: false,
      attachmentRequired: false,
    };
    setDraftLines([...draftLines, newLine]);
    setShowAddTest(false);
    setEditingLineIdx(draftLines.length);
  };

  const removeLine = (idx: number) => {
    setDraftLines(draftLines.filter((_, i) => i !== idx));
    if (editingLineIdx === idx) setEditingLineIdx(null);
  };

  const updateLine = (idx: number, updates: Partial<TemplateLine>) => {
    setDraftLines(
      draftLines.map((line, i) => (i === idx ? { ...line, ...updates } : line))
    );
  };

  const moveLine = (idx: number, direction: 'up' | 'down') => {
    if (direction === 'up' && idx === 0) return;
    if (direction === 'down' && idx === draftLines.length - 1) return;
    const newLines = [...draftLines];
    const swapIdx = direction === 'up' ? idx - 1 : idx + 1;
    [newLines[idx], newLines[swapIdx]] = [newLines[swapIdx], newLines[idx]];
    setDraftLines(newLines);
  };

  const getCriteriaDisplay = (line: TemplateLine) => {
    const rule = line.specRule;
    if (!rule) return '-';
    const unit = line.testDefinition?.unit || '';
    switch (rule.ruleType) {
      case 'MIN':
        return `${rule.minValue}${unit}`;
      case 'MAX':
        return `${rule.maxValue}${unit}`;
      case 'RANGE':
        return `${rule.minValue}${rule.maxValue}${unit}`;
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

  const activeTemplate = templates.find((t) => t.status === 'ACTIVE');
  const draftTemplates = templates.filter((t) => t.status === 'DRAFT');

  return (
    <div className="p-6">
      <div className="flex items-center gap-4 mb-6">
        <button onClick={() => navigate('/products')} className="p-2 hover:bg-hover rounded-lg">
          <ArrowLeft size={20} />
        </button>
        <PageHeader
          title={`QC Template: ${product?.name || 'Loading...'}`}
          subtitle="Configure quality control tests for this product"
          icon={<FlaskConical size={24} />}
        />
      </div>

      <div className="grid grid-cols-12 gap-6">
        <div className="col-span-3">
          <div className="card">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold">Template Versions</h3>
              <button
                onClick={() => createTemplateMutation.mutate()}
                className="btn btn-sm btn-primary flex items-center gap-1"
                disabled={createTemplateMutation.isPending}
              >
                <Plus size={14} />
                New
              </button>
            </div>

            {isLoading ? (
              <div className="text-muted text-center py-4">Loading...</div>
            ) : templates.length === 0 ? (
              <div className="text-muted text-center py-4">No templates yet</div>
            ) : (
              <div className="space-y-2">
                {templates.map((t) => (
                  <button
                    key={t.id}
                    onClick={() => setSelectedTemplate(t)}
                    className={`w-full text-left p-3 rounded-lg border transition-colors ${
                      selectedTemplate?.id === t.id
                        ? 'border-primary bg-primary/10'
                        : 'border-default hover:bg-hover'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-medium">Version {t.version}</span>
                      <span
                        className={`text-xs px-2 py-0.5 rounded-full ${
                          t.status === 'ACTIVE'
                            ? 'bg-green-500/10 text-green-500'
                            : t.status === 'DRAFT'
                            ? 'bg-yellow-500/10 text-yellow-500'
                            : 'bg-gray-500/10 text-gray-500'
                        }`}
                      >
                        {t.status}
                      </span>
                    </div>
                    <div className="text-xs text-muted mt-1">
                      {t.templateLines?.length || 0} tests
                      {t._count?.batchQcSessions ? ` | ${t._count.batchQcSessions} batches` : ''}
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="col-span-9">
          {!selectedTemplate ? (
            <div className="card text-center py-12 text-muted">
              Select a template version to edit, or create a new one
            </div>
          ) : (
            <div className="card">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h3 className="font-semibold text-lg">
                    Version {selectedTemplate.version}
                    <span
                      className={`ml-2 text-xs px-2 py-0.5 rounded-full ${
                        selectedTemplate.status === 'ACTIVE'
                          ? 'bg-green-500/10 text-green-500'
                          : selectedTemplate.status === 'DRAFT'
                          ? 'bg-yellow-500/10 text-yellow-500'
                          : 'bg-gray-500/10 text-gray-500'
                      }`}
                    >
                      {selectedTemplate.status}
                    </span>
                  </h3>
                  {selectedTemplate.effectiveFrom && (
                    <p className="text-sm text-muted">
                      Effective from:{' '}
                      {new Date(selectedTemplate.effectiveFrom).toLocaleDateString()}
                    </p>
                  )}
                </div>
                <div className="flex gap-2">
                  {selectedTemplate.status === 'DRAFT' && (
                    <>
                      <button
                        onClick={() => updateTemplateMutation.mutate()}
                        className="btn btn-secondary"
                        disabled={updateTemplateMutation.isPending}
                      >
                        Save Changes
                      </button>
                      <button
                        onClick={() => activateMutation.mutate()}
                        className="btn btn-primary flex items-center gap-1"
                        disabled={draftLines.length === 0 || activateMutation.isPending}
                      >
                        <Play size={14} />
                        Activate
                      </button>
                    </>
                  )}
                  {selectedTemplate.status === 'ACTIVE' && (
                    <button
                      onClick={() => retireMutation.mutate()}
                      className="btn btn-secondary flex items-center gap-1"
                      disabled={retireMutation.isPending}
                    >
                      <Archive size={14} />
                      Retire
                    </button>
                  )}
                </div>
              </div>

              {selectedTemplate.status !== 'DRAFT' && (
                <div className="bg-yellow-500/10 text-yellow-700 p-3 rounded-lg mb-4 text-sm">
                  This template is {selectedTemplate.status.toLowerCase()}. Create a new version to
                  make changes.
                </div>
              )}

              <div className="border border-default rounded-lg overflow-hidden">
                <table className="w-full">
                  <thead className="bg-hover">
                    <tr>
                      <th className="text-left py-3 px-4 text-sm font-medium text-muted w-10"></th>
                      <th className="text-left py-3 px-4 text-sm font-medium text-muted">Test</th>
                      <th className="text-left py-3 px-4 text-sm font-medium text-muted">
                        Category
                      </th>
                      <th className="text-left py-3 px-4 text-sm font-medium text-muted">
                        Result Type
                      </th>
                      <th className="text-left py-3 px-4 text-sm font-medium text-muted">
                        Criteria
                      </th>
                      <th className="text-center py-3 px-4 text-sm font-medium text-muted">
                        Required
                      </th>
                      <th className="w-20"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {draftLines.map((line, idx) => (
                      <>
                        <tr key={line.testDefinitionId + idx} className="border-t border-default">
                          <td className="py-3 px-4">
                            {selectedTemplate.status === 'DRAFT' && (
                              <GripVertical size={16} className="text-muted cursor-move" />
                            )}
                          </td>
                          <td className="py-3 px-4 font-medium">
                            {line.testDefinition?.nameEn || line.testDefinitionId}
                          </td>
                          <td className="py-3 px-4 text-muted">
                            {line.testDefinition?.category || '-'}
                          </td>
                          <td className="py-3 px-4">
                            <span className="text-xs px-2 py-1 rounded-full bg-primary/10 text-primary">
                              {line.testDefinition?.resultType}
                            </span>
                          </td>
                          <td className="py-3 px-4">{getCriteriaDisplay(line)}</td>
                          <td className="py-3 px-4 text-center">
                            {line.isRequired ? (
                              <Check size={16} className="text-green-500 mx-auto" />
                            ) : (
                              <X size={16} className="text-muted mx-auto" />
                            )}
                          </td>
                          <td className="py-3 px-4">
                            {selectedTemplate.status === 'DRAFT' && (
                              <div className="flex gap-1">
                                <button
                                  onClick={() => moveLine(idx, 'up')}
                                  disabled={idx === 0}
                                  className="p-1 hover:bg-hover rounded disabled:opacity-30"
                                >
                                  <ChevronUp size={16} />
                                </button>
                                <button
                                  onClick={() => moveLine(idx, 'down')}
                                  disabled={idx === draftLines.length - 1}
                                  className="p-1 hover:bg-hover rounded disabled:opacity-30"
                                >
                                  <ChevronDown size={16} />
                                </button>
                                <button
                                  onClick={() =>
                                    setEditingLineIdx(editingLineIdx === idx ? null : idx)
                                  }
                                  className={`p-1 hover:bg-hover rounded ${
                                    editingLineIdx === idx ? 'bg-primary/10' : ''
                                  }`}
                                >
                                  <ChevronDown
                                    size={16}
                                    className={
                                      editingLineIdx === idx ? 'rotate-180' : ''
                                    }
                                  />
                                </button>
                                <button
                                  onClick={() => removeLine(idx)}
                                  className="p-1 hover:bg-hover rounded text-red-500"
                                >
                                  <Trash2 size={16} />
                                </button>
                              </div>
                            )}
                          </td>
                        </tr>
                        {editingLineIdx === idx && selectedTemplate.status === 'DRAFT' && (
                          <tr className="bg-hover/50">
                            <td colSpan={7} className="p-4">
                              <div className="grid grid-cols-3 gap-4">
                                <div>
                                  <label className="label">Rule Type</label>
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
                                    className="input w-full"
                                  >
                                    {RULE_TYPES.map((rt) => (
                                      <option key={rt.value} value={rt.value}>
                                        {rt.label}
                                      </option>
                                    ))}
                                  </select>
                                </div>
                                {['MIN', 'RANGE'].includes(
                                  line.specRule?.ruleType || ''
                                ) && (
                                  <div>
                                    <label className="label">Min Value</label>
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
                                      className="input w-full"
                                      placeholder="0"
                                    />
                                  </div>
                                )}
                                {['MAX', 'RANGE'].includes(
                                  line.specRule?.ruleType || ''
                                ) && (
                                  <div>
                                    <label className="label">Max Value</label>
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
                                      className="input w-full"
                                      placeholder="100"
                                    />
                                  </div>
                                )}
                                {line.specRule?.ruleType === 'EQUAL' && (
                                  <div>
                                    <label className="label">Target Value</label>
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
                                      className="input w-full"
                                      placeholder="7.0"
                                    />
                                  </div>
                                )}
                                {line.specRule?.ruleType === 'CUSTOM_TEXT' && (
                                  <div className="col-span-2">
                                    <label className="label">Custom Criteria Text</label>
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
                                      className="input w-full"
                                      placeholder="Clear to slightly opalescent"
                                    />
                                  </div>
                                )}
                                <div className="flex items-center gap-4">
                                  <label className="flex items-center gap-2 cursor-pointer">
                                    <input
                                      type="checkbox"
                                      checked={line.isRequired}
                                      onChange={(e) =>
                                        updateLine(idx, { isRequired: e.target.checked })
                                      }
                                      className="form-checkbox"
                                    />
                                    Required
                                  </label>
                                  <label className="flex items-center gap-2 cursor-pointer">
                                    <input
                                      type="checkbox"
                                      checked={line.attachmentRequired}
                                      onChange={(e) =>
                                        updateLine(idx, { attachmentRequired: e.target.checked })
                                      }
                                      className="form-checkbox"
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
                        <td colSpan={7} className="py-8 text-center text-muted">
                          No tests added yet. Click "Add Test" to add QC tests to this template.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              {selectedTemplate.status === 'DRAFT' && (
                <div className="mt-4">
                  {showAddTest ? (
                    <div className="border border-default rounded-lg p-4">
                      <div className="flex items-center justify-between mb-3">
                        <h4 className="font-medium">Select a Test to Add</h4>
                        <button
                          onClick={() => setShowAddTest(false)}
                          className="p-1 hover:bg-hover rounded"
                        >
                          <X size={16} />
                        </button>
                      </div>
                      <div className="grid grid-cols-3 gap-2 max-h-60 overflow-y-auto">
                        {testDefinitions
                          .filter(
                            (td) =>
                              !draftLines.some((l) => l.testDefinitionId === td.id)
                          )
                          .map((td) => (
                            <button
                              key={td.id}
                              onClick={() => addTestLine(td)}
                              className="text-left p-2 rounded border border-default hover:bg-hover transition-colors"
                            >
                              <div className="font-medium text-sm">{td.nameEn}</div>
                              <div className="text-xs text-muted">
                                {td.code} | {td.resultType}
                              </div>
                            </button>
                          ))}
                      </div>
                    </div>
                  ) : (
                    <button
                      onClick={() => setShowAddTest(true)}
                      className="btn btn-secondary flex items-center gap-2"
                    >
                      <Plus size={16} />
                      Add Test
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
