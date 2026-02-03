import { useState, useEffect } from 'react';
import { Factory, Plus, Search, Eye, Play, CheckCircle, Clock, AlertTriangle, Package, Wrench, FileWarning, Activity } from 'lucide-react';
import api from '../lib/api';

interface BatchRecord {
  id: string;
  recordNumber: string;
  status: string;
  batchId: string;
  batch: { id: string; batchNumber: string; product: { name: string } };
  recipeId: string;
  recipe: { id: string; code: string; name: string; version: number };
  recipeVersion: number;
  startedAt?: string;
  completedAt?: string;
  reviewedAt?: string;
  approvedAt?: string;
  actualYield?: number;
  yieldUnit?: string;
  notes?: string;
  startedBy?: { firstName: string; lastName: string };
  completedBy?: { firstName: string; lastName: string };
  reviewedBy?: { firstName: string; lastName: string };
  approvedBy?: { firstName: string; lastName: string };
  _count?: { steps: number; materialConsumptions: number; equipmentUsages: number; deviations: number };
  createdAt: string;
}

interface BatchRecordStep {
  id: string;
  sequence: number;
  stepNumber: string;
  stepName: string;
  description?: string;
  category: string;
  instructions?: string;
  expectedDuration?: number;
  isQualityCheckpoint: boolean;
  requiresVerification: boolean;
  acceptanceCriteria?: string;
  status: string;
  startedAt?: string;
  completedAt?: string;
  verifiedAt?: string;
  actualValue?: string;
  actualDuration?: number;
  notes?: string;
  executedBy?: { firstName: string; lastName: string };
  verifiedBy?: { firstName: string; lastName: string };
}

interface Batch {
  id: string;
  batchNumber: string;
  status: string;
  product: { id: string; name: string };
}

interface Recipe {
  id: string;
  code: string;
  name: string;
  version: number;
  productId?: string;
}

interface Stats {
  total: number;
  draft: number;
  inProgress: number;
  pendingReview: number;
  approved: number;
  rejected: number;
}

const STATUSES = [
  { value: 'DRAFT', label: 'Draft', color: '#94a3b8' },
  { value: 'IN_PROGRESS', label: 'In Progress', color: '#3b82f6' },
  { value: 'PENDING_REVIEW', label: 'Pending Review', color: '#f59e0b' },
  { value: 'APPROVED', label: 'Approved', color: '#22c55e' },
  { value: 'REJECTED', label: 'Rejected', color: '#ef4444' },
  { value: 'CANCELLED', label: 'Cancelled', color: '#6b7280' },
];

const STEP_STATUSES = [
  { value: 'PENDING', label: 'Pending', color: '#94a3b8' },
  { value: 'IN_PROGRESS', label: 'In Progress', color: '#3b82f6' },
  { value: 'COMPLETED', label: 'Completed', color: '#22c55e' },
  { value: 'SKIPPED', label: 'Skipped', color: '#6b7280' },
  { value: 'FAILED', label: 'Failed', color: '#ef4444' },
  { value: 'ON_HOLD', label: 'On Hold', color: '#f59e0b' },
];

export default function ManufacturingExecution() {
  const [records, setRecords] = useState<BatchRecord[]>([]);
  const [stats, setStats] = useState<Stats>({ total: 0, draft: 0, inProgress: 0, pendingReview: 0, approved: 0, rejected: 0 });
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  
  const [selectedRecord, setSelectedRecord] = useState<BatchRecord | null>(null);
  const [recordSteps, setRecordSteps] = useState<BatchRecordStep[]>([]);
  const [recordKpis, setRecordKpis] = useState<any>(null);
  const [showDetail, setShowDetail] = useState(false);
  
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [batches, setBatches] = useState<Batch[]>([]);
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [createForm, setCreateForm] = useState({ batchId: '', recipeId: '', notes: '' });
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    fetchRecords();
    fetchStats();
  }, [search, statusFilter, page]);

  const fetchRecords = async () => {
    try {
      setLoading(true);
      const params: any = { page, limit: 15 };
      if (search) params.search = search;
      if (statusFilter) params.status = statusFilter;
      
      const res = await api.get('/batch-records', { params });
      setRecords(res.data.records);
      setTotalPages(res.data.totalPages);
    } catch (err) {
      console.error('Error fetching batch records:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const res = await api.get('/batch-records', { params: { limit: 1000 } });
      const allRecords = res.data.records;
      setStats({
        total: allRecords.length,
        draft: allRecords.filter((r: any) => r.status === 'DRAFT').length,
        inProgress: allRecords.filter((r: any) => r.status === 'IN_PROGRESS').length,
        pendingReview: allRecords.filter((r: any) => r.status === 'PENDING_REVIEW').length,
        approved: allRecords.filter((r: any) => r.status === 'APPROVED').length,
        rejected: allRecords.filter((r: any) => r.status === 'REJECTED').length,
      });
    } catch (err) {
      console.error('Error fetching stats:', err);
    }
  };

  const fetchRecordDetail = async (id: string) => {
    try {
      const [detailRes, kpisRes] = await Promise.all([
        api.get(`/batch-records/${id}`),
        api.get(`/batch-records/${id}/kpis`)
      ]);
      setSelectedRecord(detailRes.data);
      setRecordSteps(detailRes.data.steps || []);
      setRecordKpis(kpisRes.data);
      setShowDetail(true);
    } catch (err) {
      console.error('Error fetching record detail:', err);
    }
  };

  const openCreateModal = async () => {
    try {
      const [batchesRes, recipesRes] = await Promise.all([
        api.get('/batches', { params: { limit: 100 } }),
        api.get('/recipes', { params: { status: 'ACTIVE', limit: 100 } })
      ]);
      setBatches(batchesRes.data.batches || []);
      setRecipes(recipesRes.data.recipes || []);
      setCreateForm({ batchId: '', recipeId: '', notes: '' });
      setShowCreateModal(true);
    } catch (err) {
      console.error('Error loading form data:', err);
    }
  };

  const handleCreate = async () => {
    if (!createForm.batchId || !createForm.recipeId) return;
    try {
      setCreating(true);
      await api.post('/batch-records', createForm);
      setShowCreateModal(false);
      fetchRecords();
      fetchStats();
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed to create batch record');
    } finally {
      setCreating(false);
    }
  };

  const handleStartRecord = async () => {
    if (!selectedRecord) return;
    try {
      await api.post(`/batch-records/${selectedRecord.id}/start`);
      fetchRecordDetail(selectedRecord.id);
      fetchRecords();
      fetchStats();
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed to start batch record');
    }
  };

  const handleStartStep = async (stepId: string) => {
    if (!selectedRecord) return;
    try {
      await api.post(`/batch-records/${selectedRecord.id}/steps/${stepId}/start`);
      fetchRecordDetail(selectedRecord.id);
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed to start step');
    }
  };

  const handleCompleteStep = async (stepId: string) => {
    if (!selectedRecord) return;
    try {
      await api.post(`/batch-records/${selectedRecord.id}/steps/${stepId}/complete`, {});
      fetchRecordDetail(selectedRecord.id);
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed to complete step');
    }
  };

  const handleCompleteRecord = async () => {
    if (!selectedRecord) return;
    try {
      await api.post(`/batch-records/${selectedRecord.id}/complete`, {});
      fetchRecordDetail(selectedRecord.id);
      fetchRecords();
      fetchStats();
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed to complete batch record');
    }
  };

  const handleReview = async () => {
    if (!selectedRecord) return;
    try {
      await api.post(`/batch-records/${selectedRecord.id}/review`, { meaning: 'Reviewed and verified' });
      fetchRecordDetail(selectedRecord.id);
      fetchRecords();
      fetchStats();
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed to review batch record');
    }
  };

  const handleApprove = async () => {
    if (!selectedRecord) return;
    try {
      await api.post(`/batch-records/${selectedRecord.id}/approve`, { meaning: 'Approved for release' });
      fetchRecordDetail(selectedRecord.id);
      fetchRecords();
      fetchStats();
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed to approve batch record');
    }
  };

  const getStatusBadge = (status: string) => {
    const s = STATUSES.find(st => st.value === status);
    return (
      <span style={{ backgroundColor: s?.color || '#94a3b8' }} className="px-2 py-1 rounded text-white text-xs font-medium">
        {s?.label || status}
      </span>
    );
  };

  const getStepStatusBadge = (status: string) => {
    const s = STEP_STATUSES.find(st => st.value === status);
    return (
      <span style={{ backgroundColor: s?.color || '#94a3b8' }} className="px-2 py-1 rounded text-white text-xs font-medium">
        {s?.label || status}
      </span>
    );
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Factory className="w-8 h-8 text-blue-600" />
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Manufacturing Execution</h1>
            <p className="text-gray-600">Electronic Batch Records (eBR) for production control</p>
          </div>
        </div>
        <button onClick={openCreateModal} className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700">
          <Plus className="w-5 h-5" />
          New Batch Record
        </button>
      </div>

      <div className="grid grid-cols-6 gap-4">
        <div className="bg-white p-4 rounded-lg shadow border-l-4 border-gray-400">
          <p className="text-sm text-gray-600">Total Records</p>
          <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
        </div>
        <div className="bg-white p-4 rounded-lg shadow border-l-4 border-gray-500">
          <p className="text-sm text-gray-600">Draft</p>
          <p className="text-2xl font-bold text-gray-600">{stats.draft}</p>
        </div>
        <div className="bg-white p-4 rounded-lg shadow border-l-4 border-blue-500">
          <p className="text-sm text-gray-600">In Progress</p>
          <p className="text-2xl font-bold text-blue-600">{stats.inProgress}</p>
        </div>
        <div className="bg-white p-4 rounded-lg shadow border-l-4 border-yellow-500">
          <p className="text-sm text-gray-600">Pending Review</p>
          <p className="text-2xl font-bold text-yellow-600">{stats.pendingReview}</p>
        </div>
        <div className="bg-white p-4 rounded-lg shadow border-l-4 border-green-500">
          <p className="text-sm text-gray-600">Approved</p>
          <p className="text-2xl font-bold text-green-600">{stats.approved}</p>
        </div>
        <div className="bg-white p-4 rounded-lg shadow border-l-4 border-red-500">
          <p className="text-sm text-gray-600">Rejected</p>
          <p className="text-2xl font-bold text-red-600">{stats.rejected}</p>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow">
        <div className="p-4 border-b flex items-center gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type="text"
              placeholder="Search by record number or batch..."
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              className="w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <select
            value={statusFilter}
            onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
            className="border rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500"
          >
            <option value="">All Statuses</option>
            {STATUSES.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
          </select>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">Record #</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">Batch</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">Product</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">Recipe</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">Status</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">Progress</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">Created</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {loading ? (
                <tr><td colSpan={8} className="px-4 py-8 text-center text-gray-500">Loading...</td></tr>
              ) : records.length === 0 ? (
                <tr><td colSpan={8} className="px-4 py-8 text-center text-gray-500">No batch records found</td></tr>
              ) : records.map((record) => (
                <tr key={record.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium text-blue-600">{record.recordNumber}</td>
                  <td className="px-4 py-3">{record.batch?.batchNumber}</td>
                  <td className="px-4 py-3">{record.batch?.product?.name}</td>
                  <td className="px-4 py-3">
                    <span className="text-sm">{record.recipe?.code} v{record.recipeVersion}</span>
                  </td>
                  <td className="px-4 py-3">{getStatusBadge(record.status)}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <Activity className="w-4 h-4 text-gray-400" />
                      <span className="text-sm">{record._count?.steps || 0} steps</span>
                      {(record._count?.deviations || 0) > 0 && (
                        <span className="flex items-center gap-1 text-red-600 text-xs">
                          <AlertTriangle className="w-3 h-3" />
                          {record._count?.deviations}
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-600">{new Date(record.createdAt).toLocaleDateString()}</td>
                  <td className="px-4 py-3">
                    <button onClick={() => fetchRecordDetail(record.id)} className="p-2 text-blue-600 hover:bg-blue-50 rounded">
                      <Eye className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {totalPages > 1 && (
          <div className="p-4 border-t flex items-center justify-between">
            <button
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page === 1}
              className="px-4 py-2 border rounded disabled:opacity-50"
            >
              Previous
            </button>
            <span className="text-sm text-gray-600">Page {page} of {totalPages}</span>
            <button
              onClick={() => setPage(p => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              className="px-4 py-2 border rounded disabled:opacity-50"
            >
              Next
            </button>
          </div>
        )}
      </div>

      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-lg">
            <div className="p-4 border-b flex items-center justify-between">
              <h2 className="text-lg font-semibold">Create Batch Record</h2>
              <button onClick={() => setShowCreateModal(false)} className="text-gray-400 hover:text-gray-600">×</button>
            </div>
            <div className="p-4 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Batch *</label>
                <select
                  value={createForm.batchId}
                  onChange={(e) => setCreateForm({ ...createForm, batchId: e.target.value })}
                  className="w-full border rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Select batch...</option>
                  {batches.map(b => (
                    <option key={b.id} value={b.id}>{b.batchNumber} - {b.product?.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Recipe *</label>
                <select
                  value={createForm.recipeId}
                  onChange={(e) => setCreateForm({ ...createForm, recipeId: e.target.value })}
                  className="w-full border rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Select recipe...</option>
                  {recipes.map(r => (
                    <option key={r.id} value={r.id}>{r.code} - {r.name} (v{r.version})</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
                <textarea
                  value={createForm.notes}
                  onChange={(e) => setCreateForm({ ...createForm, notes: e.target.value })}
                  className="w-full border rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500"
                  rows={3}
                />
              </div>
            </div>
            <div className="p-4 border-t flex justify-end gap-2">
              <button onClick={() => setShowCreateModal(false)} className="px-4 py-2 border rounded-lg hover:bg-gray-50">Cancel</button>
              <button
                onClick={handleCreate}
                disabled={creating || !createForm.batchId || !createForm.recipeId}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
              >
                {creating ? 'Creating...' : 'Create Record'}
              </button>
            </div>
          </div>
        </div>
      )}

      {showDetail && selectedRecord && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-5xl max-h-[90vh] overflow-hidden flex flex-col">
            <div className="p-4 border-b flex items-center justify-between bg-gray-50">
              <div>
                <h2 className="text-lg font-semibold">{selectedRecord.recordNumber}</h2>
                <p className="text-sm text-gray-600">{selectedRecord.batch?.batchNumber} - {selectedRecord.batch?.product?.name}</p>
              </div>
              <div className="flex items-center gap-2">
                {getStatusBadge(selectedRecord.status)}
                <button onClick={() => setShowDetail(false)} className="ml-4 text-gray-400 hover:text-gray-600 text-xl">×</button>
              </div>
            </div>

            <div className="flex-1 overflow-auto p-4 space-y-4">
              {recordKpis && (
                <div className="grid grid-cols-5 gap-4">
                  <div className="bg-blue-50 p-3 rounded-lg">
                    <div className="flex items-center gap-2 text-blue-600 mb-1">
                      <Activity className="w-4 h-4" />
                      <span className="text-sm font-medium">Progress</span>
                    </div>
                    <p className="text-2xl font-bold text-blue-700">{recordKpis.progress?.percentage || 0}%</p>
                    <p className="text-xs text-blue-600">{recordKpis.progress?.completed}/{recordKpis.progress?.total} steps</p>
                  </div>
                  <div className="bg-purple-50 p-3 rounded-lg">
                    <div className="flex items-center gap-2 text-purple-600 mb-1">
                      <Clock className="w-4 h-4" />
                      <span className="text-sm font-medium">Duration</span>
                    </div>
                    <p className="text-2xl font-bold text-purple-700">{recordKpis.timing?.actualMinutes || 0} min</p>
                    <p className="text-xs text-purple-600">Expected: {recordKpis.timing?.expectedMinutes || 0} min</p>
                  </div>
                  <div className="bg-green-50 p-3 rounded-lg">
                    <div className="flex items-center gap-2 text-green-600 mb-1">
                      <Package className="w-4 h-4" />
                      <span className="text-sm font-medium">Materials</span>
                    </div>
                    <p className="text-2xl font-bold text-green-700">{recordKpis.materials?.itemsConsumed || 0}</p>
                    <p className="text-xs text-green-600">Items consumed</p>
                  </div>
                  <div className="bg-orange-50 p-3 rounded-lg">
                    <div className="flex items-center gap-2 text-orange-600 mb-1">
                      <Wrench className="w-4 h-4" />
                      <span className="text-sm font-medium">Equipment</span>
                    </div>
                    <p className="text-2xl font-bold text-orange-700">{recordKpis.equipment?.itemsUsed || 0}</p>
                    <p className="text-xs text-orange-600">Items used</p>
                  </div>
                  <div className="bg-red-50 p-3 rounded-lg">
                    <div className="flex items-center gap-2 text-red-600 mb-1">
                      <FileWarning className="w-4 h-4" />
                      <span className="text-sm font-medium">Deviations</span>
                    </div>
                    <p className="text-2xl font-bold text-red-700">{recordKpis.deviations?.total || 0}</p>
                    <p className="text-xs text-red-600">{recordKpis.deviations?.open || 0} open</p>
                  </div>
                </div>
              )}

              <div className="bg-white border rounded-lg">
                <div className="p-3 border-b bg-gray-50">
                  <h3 className="font-semibold">Production Steps</h3>
                </div>
                <div className="divide-y">
                  {recordSteps.map((step) => (
                    <div key={step.id} className="p-3 flex items-center justify-between hover:bg-gray-50">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center text-sm font-medium">
                          {step.sequence}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-medium">{step.stepNumber}: {step.stepName}</span>
                            {step.isQualityCheckpoint && (
                              <span className="px-1.5 py-0.5 bg-purple-100 text-purple-700 text-xs rounded">QC</span>
                            )}
                            {step.requiresVerification && (
                              <span className="px-1.5 py-0.5 bg-blue-100 text-blue-700 text-xs rounded">Verify</span>
                            )}
                          </div>
                          <p className="text-sm text-gray-600">{step.description || step.category}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        {step.expectedDuration && (
                          <span className="text-sm text-gray-500">~{step.expectedDuration} min</span>
                        )}
                        {getStepStatusBadge(step.status)}
                        {selectedRecord.status === 'IN_PROGRESS' && step.status === 'PENDING' && (
                          <button onClick={() => handleStartStep(step.id)} className="p-1.5 bg-blue-100 text-blue-600 rounded hover:bg-blue-200">
                            <Play className="w-4 h-4" />
                          </button>
                        )}
                        {selectedRecord.status === 'IN_PROGRESS' && step.status === 'IN_PROGRESS' && (
                          <button onClick={() => handleCompleteStep(step.id)} className="p-1.5 bg-green-100 text-green-600 rounded hover:bg-green-200">
                            <CheckCircle className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="p-4 border-t bg-gray-50 flex justify-between">
              <div className="flex items-center gap-2 text-sm text-gray-600">
                {selectedRecord.startedBy && (
                  <span>Started by: {selectedRecord.startedBy.firstName} {selectedRecord.startedBy.lastName}</span>
                )}
                {selectedRecord.approvedBy && (
                  <span className="ml-4">Approved by: {selectedRecord.approvedBy.firstName} {selectedRecord.approvedBy.lastName}</span>
                )}
              </div>
              <div className="flex gap-2">
                {selectedRecord.status === 'DRAFT' && (
                  <button onClick={handleStartRecord} className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
                    <Play className="w-4 h-4" />
                    Start Production
                  </button>
                )}
                {selectedRecord.status === 'IN_PROGRESS' && recordKpis?.progress?.percentage === 100 && (
                  <button onClick={handleCompleteRecord} className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700">
                    <CheckCircle className="w-4 h-4" />
                    Complete Production
                  </button>
                )}
                {selectedRecord.status === 'PENDING_REVIEW' && !selectedRecord.reviewedAt && (
                  <button onClick={handleReview} className="flex items-center gap-2 px-4 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700">
                    <Eye className="w-4 h-4" />
                    Review Record
                  </button>
                )}
                {selectedRecord.status === 'PENDING_REVIEW' && selectedRecord.reviewedAt && (
                  <button onClick={handleApprove} className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700">
                    <CheckCircle className="w-4 h-4" />
                    Approve Record
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
