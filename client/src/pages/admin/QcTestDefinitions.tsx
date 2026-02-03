import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../../lib/api';
import { useToast } from '../../components/ui/Toast';
import { PageHeader } from '../../components/shared';
import { Plus, Edit2, Trash2, FlaskConical, Search, X } from 'lucide-react';

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

  return (
    <div className="p-6">
      <PageHeader
        title="QC Test Definitions"
        subtitle="Manage catalog of quality control tests"
        icon={<FlaskConical size={24} />}
        actions={
          <button onClick={() => openModal()} className="btn btn-primary flex items-center gap-2">
            <Plus size={16} />
            Add Test
          </button>
        }
      />

      <div className="card mt-6">
        <div className="flex flex-wrap gap-4 mb-4">
          <div className="relative flex-1 min-w-[200px]">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
            <input
              type="text"
              placeholder="Search by code or name..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="input pl-10 w-full"
            />
          </div>
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="input min-w-[150px]"
          >
            <option value="">All Categories</option>
            {uniqueCategories.map((cat) => (
              <option key={cat} value={cat || ''}>
                {cat}
              </option>
            ))}
          </select>
        </div>

        {isLoading ? (
          <div className="text-center py-8 text-muted">Loading...</div>
        ) : filteredDefinitions.length === 0 ? (
          <div className="text-center py-8 text-muted">
            No test definitions found. Add your first QC test to get started.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-default">
                  <th className="text-left py-3 px-4 text-sm font-medium text-muted">Code</th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-muted">Name</th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-muted">Category</th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-muted">Result Type</th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-muted">Unit</th>
                  <th className="text-center py-3 px-4 text-sm font-medium text-muted">Status</th>
                  <th className="text-right py-3 px-4 text-sm font-medium text-muted">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredDefinitions.map((def) => (
                  <tr key={def.id} className="border-b border-default hover:bg-hover">
                    <td className="py-3 px-4 font-mono text-sm">{def.code}</td>
                    <td className="py-3 px-4">{def.nameEn}</td>
                    <td className="py-3 px-4 text-muted">{def.category || '-'}</td>
                    <td className="py-3 px-4">
                      <span className="px-2 py-1 text-xs rounded-full bg-primary/10 text-primary">
                        {RESULT_TYPES.find((t) => t.value === def.resultType)?.label}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-muted">{def.unit || '-'}</td>
                    <td className="py-3 px-4 text-center">
                      <span
                        className={`px-2 py-1 text-xs rounded-full ${
                          def.isActive ? 'bg-green-500/10 text-green-500' : 'bg-gray-500/10 text-gray-500'
                        }`}
                      >
                        {def.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex justify-end gap-2">
                        <button
                          onClick={() => openModal(def)}
                          className="p-2 hover:bg-hover rounded-lg transition-colors"
                          title="Edit"
                        >
                          <Edit2 size={16} />
                        </button>
                        <button
                          onClick={() => handleDelete(def)}
                          className="p-2 hover:bg-hover rounded-lg transition-colors text-red-500"
                          title="Delete"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {showModal && (
        <div className="modal-overlay" onClick={closeModal}>
          <div className="modal-content max-w-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-semibold">
                {editingItem ? 'Edit Test Definition' : 'Add Test Definition'}
              </h2>
              <button onClick={closeModal} className="p-2 hover:bg-hover rounded-lg">
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSubmit}>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="label">Code *</label>
                  <input
                    type="text"
                    value={formData.code}
                    onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                    className="input w-full"
                    placeholder="e.g., STERILITY"
                    required
                  />
                </div>
                <div>
                  <label className="label">Category</label>
                  <select
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    className="input w-full"
                  >
                    <option value="">Select Category</option>
                    {CATEGORIES.map((cat) => (
                      <option key={cat} value={cat}>
                        {cat}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="label">Name (English) *</label>
                  <input
                    type="text"
                    value={formData.nameEn}
                    onChange={(e) => setFormData({ ...formData, nameEn: e.target.value })}
                    className="input w-full"
                    placeholder="Sterility Test"
                    required
                  />
                </div>
                <div>
                  <label className="label">Name (Arabic)</label>
                  <input
                    type="text"
                    value={formData.nameAr}
                    onChange={(e) => setFormData({ ...formData, nameAr: e.target.value })}
                    className="input w-full"
                    dir="rtl"
                    placeholder="اختبار العقم"
                  />
                </div>
                <div className="col-span-2">
                  <label className="label">Description (English)</label>
                  <textarea
                    value={formData.descriptionEn}
                    onChange={(e) => setFormData({ ...formData, descriptionEn: e.target.value })}
                    className="input w-full"
                    rows={2}
                    placeholder="Detailed test description..."
                  />
                </div>
                <div>
                  <label className="label">Result Type *</label>
                  <select
                    value={formData.resultType}
                    onChange={(e) => setFormData({ ...formData, resultType: e.target.value })}
                    className="input w-full"
                    required
                  >
                    {RESULT_TYPES.map((type) => (
                      <option key={type.value} value={type.value}>
                        {type.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="label">Unit</label>
                  <input
                    type="text"
                    value={formData.unit}
                    onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
                    className="input w-full"
                    placeholder="e.g., mCi, pH, %"
                  />
                </div>
                {formData.resultType === 'OPTION_LIST' && (
                  <div className="col-span-2">
                    <label className="label">Options (comma-separated)</label>
                    <input
                      type="text"
                      value={formData.optionList}
                      onChange={(e) => setFormData({ ...formData, optionList: e.target.value })}
                      className="input w-full"
                      placeholder="Clear, Slightly Hazy, Hazy"
                    />
                  </div>
                )}
                <div className="col-span-2">
                  <label className="label">Test Method</label>
                  <input
                    type="text"
                    value={formData.method}
                    onChange={(e) => setFormData({ ...formData, method: e.target.value })}
                    className="input w-full"
                    placeholder="USP <71> Sterility Testing"
                  />
                </div>
                <div className="col-span-2">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.isActive}
                      onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                      className="form-checkbox"
                    />
                    <span>Active</span>
                  </label>
                </div>
              </div>

              <div className="flex justify-end gap-3 mt-6">
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
