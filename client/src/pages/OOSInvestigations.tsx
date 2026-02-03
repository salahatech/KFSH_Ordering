import { useState, useEffect } from 'react';
import { AlertTriangle, Plus, Search, Eye, Play, CheckCircle, Clock, FileWarning, Activity, ArrowRight, XCircle, AlertOctagon } from 'lucide-react';
import api from '../lib/api';

interface OOSCase {
  id: string;
  caseNumber: string;
  caseType: string;
  priority: string;
  status: string;
  batchId: string;
  batch: { id: string; batchNumber: string; product: { name: string } };
  testResultId?: string;
  testName: string;
  testMethod?: string;
  specMin?: number;
  specMax?: number;
  actualValue?: number;
  unit?: string;
  deviationPercent?: number;
  initialDescription: string;
  openedAt: string;
  openedBy: { id: string; name: string; email: string };
  phase1InvestigatorId?: string;
  phase1Investigator?: { id: string; name: string };
  phase1StartedAt?: string;
  phase1CompletedAt?: string;
  phase1Conclusion?: string;
  phase2LeadId?: string;
  phase2Lead?: { id: string; name: string };
  phase2StartedAt?: string;
  phase2CompletedAt?: string;
  phase2Conclusion?: string;
  rootCause?: string;
  correctiveAction?: string;
  preventiveAction?: string;
  closedAt?: string;
  closedBy?: { id: string; name: string };
  closureType?: string;
  finalConclusion?: string;
  dueDate?: string;
  isOverdue?: boolean;
  timeline?: Timeline[];
  createdAt: string;
}

interface Timeline {
  id: string;
  action: string;
  description: string;
  oldStatus?: string;
  newStatus?: string;
  userId: string;
  createdAt: string;
}

interface Stats {
  byStatus: { status: string; _count: { id: number } }[];
  byType: { caseType: string; _count: { id: number } }[];
  byPriority: { priority: string; _count: { id: number } }[];
  openCases: number;
  overdue: number;
  recentClosures: number;
}

interface Batch {
  id: string;
  batchNumber: string;
  product: { name: string };
}

const STATUSES = [
  { value: 'OPEN', label: 'Open', color: '#94a3b8' },
  { value: 'PHASE_1_LAB_INVESTIGATION', label: 'Phase 1 Investigation', color: '#3b82f6' },
  { value: 'PHASE_1_COMPLETE', label: 'Phase 1 Complete', color: '#8b5cf6' },
  { value: 'PHASE_2_FULL_INVESTIGATION', label: 'Phase 2 Investigation', color: '#f59e0b' },
  { value: 'PHASE_2_COMPLETE', label: 'Phase 2 Complete', color: '#ec4899' },
  { value: 'CAPA_PROPOSED', label: 'CAPA Proposed', color: '#06b6d4' },
  { value: 'CAPA_APPROVED', label: 'CAPA Approved', color: '#10b981' },
  { value: 'CAPA_IMPLEMENTING', label: 'CAPA Implementing', color: '#84cc16' },
  { value: 'CLOSED_CONFIRMED', label: 'Closed (Confirmed)', color: '#22c55e' },
  { value: 'CLOSED_INVALIDATED', label: 'Closed (Invalidated)', color: '#6b7280' },
  { value: 'CLOSED_INCONCLUSIVE', label: 'Closed (Inconclusive)', color: '#a855f7' },
];

const CASE_TYPES = [
  { value: 'OOS', label: 'Out of Specification', color: '#ef4444' },
  { value: 'OOT', label: 'Out of Trend', color: '#f59e0b' },
  { value: 'OOE', label: 'Out of Expectation', color: '#3b82f6' },
];

const PRIORITIES = [
  { value: 'LOW', label: 'Low', color: '#94a3b8' },
  { value: 'MEDIUM', label: 'Medium', color: '#3b82f6' },
  { value: 'HIGH', label: 'High', color: '#f59e0b' },
  { value: 'CRITICAL', label: 'Critical', color: '#ef4444' },
];

export default function OOSInvestigations() {
  const [cases, setCases] = useState<OOSCase[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [priorityFilter, setPriorityFilter] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedCase, setSelectedCase] = useState<OOSCase | null>(null);
  const [batches, setBatches] = useState<Batch[]>([]);

  const [formData, setFormData] = useState({
    batchId: '',
    caseType: 'OOS',
    priority: 'MEDIUM',
    testName: '',
    testMethod: '',
    specMin: '',
    specMax: '',
    actualValue: '',
    unit: '',
    deviationPercent: '',
    initialDescription: '',
    dueDate: '',
  });

  const fetchCases = async () => {
    try {
      const params = new URLSearchParams({ page: page.toString(), limit: '20' });
      if (statusFilter) params.append('status', statusFilter);
      if (typeFilter) params.append('caseType', typeFilter);
      if (priorityFilter) params.append('priority', priorityFilter);
      const res = await api.get(`/oos-investigations?${params}`);
      setCases(res.data.cases);
      setTotalPages(res.data.totalPages);
    } catch (error) {
      console.error('Failed to fetch OOS cases:', error);
    }
  };

  const fetchStats = async () => {
    try {
      const res = await api.get('/oos-investigations/stats');
      setStats(res.data);
    } catch (error) {
      console.error('Failed to fetch stats:', error);
    }
  };

  const fetchBatches = async () => {
    try {
      const res = await api.get('/batches');
      setBatches(res.data.slice(0, 100));
    } catch (error) {
      console.error('Failed to fetch batches:', error);
    }
  };

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      await Promise.all([fetchCases(), fetchStats(), fetchBatches()]);
      setLoading(false);
    };
    loadData();
  }, [page, statusFilter, typeFilter, priorityFilter]);

  const handleCreateCase = async () => {
    try {
      await api.post('/oos-investigations', formData);
      setShowCreateModal(false);
      setFormData({
        batchId: '',
        caseType: 'OOS',
        priority: 'MEDIUM',
        testName: '',
        testMethod: '',
        specMin: '',
        specMax: '',
        actualValue: '',
        unit: '',
        deviationPercent: '',
        initialDescription: '',
        dueDate: '',
      });
      fetchCases();
      fetchStats();
    } catch (error) {
      console.error('Failed to create OOS case:', error);
    }
  };

  const fetchCaseDetails = async (caseId: string) => {
    try {
      const res = await api.get(`/oos-investigations/${caseId}`);
      setSelectedCase(res.data);
      setShowDetailModal(true);
    } catch (error) {
      console.error('Failed to fetch case details:', error);
    }
  };

  const handleStartPhase1 = async (caseId: string) => {
    try {
      await api.post(`/oos-investigations/${caseId}/start-phase1`, {});
      fetchCaseDetails(caseId);
      fetchCases();
      fetchStats();
    } catch (error) {
      console.error('Failed to start Phase 1:', error);
    }
  };

  const handleCompletePhase1 = async (caseId: string, proceedToPhase2: boolean) => {
    try {
      await api.post(`/oos-investigations/${caseId}/complete-phase1`, {
        conclusion: 'Phase 1 investigation completed',
        proceedToPhase2,
      });
      fetchCaseDetails(caseId);
      fetchCases();
      fetchStats();
    } catch (error) {
      console.error('Failed to complete Phase 1:', error);
    }
  };

  const handleStartPhase2 = async (caseId: string) => {
    try {
      await api.post(`/oos-investigations/${caseId}/start-phase2`, {});
      fetchCaseDetails(caseId);
      fetchCases();
      fetchStats();
    } catch (error) {
      console.error('Failed to start Phase 2:', error);
    }
  };

  const handleCompletePhase2 = async (caseId: string) => {
    try {
      await api.post(`/oos-investigations/${caseId}/complete-phase2`, {
        conclusion: 'Phase 2 investigation completed',
        rootCause: 'Root cause identified during investigation',
      });
      fetchCaseDetails(caseId);
      fetchCases();
      fetchStats();
    } catch (error) {
      console.error('Failed to complete Phase 2:', error);
    }
  };

  const handleProposeCapa = async (caseId: string) => {
    try {
      await api.post(`/oos-investigations/${caseId}/propose-capa`, {
        rootCause: 'Root cause identified',
        correctiveAction: 'Corrective actions to be taken',
        preventiveAction: 'Preventive measures to implement',
      });
      fetchCaseDetails(caseId);
      fetchCases();
      fetchStats();
    } catch (error) {
      console.error('Failed to propose CAPA:', error);
    }
  };

  const handleApproveCapa = async (caseId: string) => {
    try {
      await api.post(`/oos-investigations/${caseId}/approve-capa`, {
        signatureMeaning: 'I approve this CAPA for implementation',
      });
      fetchCaseDetails(caseId);
      fetchCases();
      fetchStats();
    } catch (error) {
      console.error('Failed to approve CAPA:', error);
    }
  };

  const handleStartImplementation = async (caseId: string) => {
    try {
      await api.post(`/oos-investigations/${caseId}/start-implementation`, {});
      fetchCaseDetails(caseId);
      fetchCases();
      fetchStats();
    } catch (error) {
      console.error('Failed to start implementation:', error);
    }
  };

  const handleCloseCase = async (caseId: string, closureType: string) => {
    try {
      await api.post(`/oos-investigations/${caseId}/close`, {
        closureType,
        finalConclusion: `Case closed as ${closureType}`,
        signatureMeaning: `I confirm the closure of this OOS case as ${closureType}`,
      });
      fetchCaseDetails(caseId);
      fetchCases();
      fetchStats();
    } catch (error) {
      console.error('Failed to close case:', error);
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

  const getTypeBadge = (type: string) => {
    const t = CASE_TYPES.find(ct => ct.value === type);
    return (
      <span style={{ backgroundColor: t?.color || '#94a3b8' }} className="px-2 py-1 rounded text-white text-xs font-medium">
        {t?.label || type}
      </span>
    );
  };

  const getPriorityBadge = (priority: string) => {
    const p = PRIORITIES.find(pr => pr.value === priority);
    return (
      <span style={{ backgroundColor: p?.color || '#94a3b8' }} className="px-2 py-1 rounded text-white text-xs font-medium">
        {p?.label || priority}
      </span>
    );
  };

  const filteredCases = cases.filter(c =>
    c.caseNumber.toLowerCase().includes(search.toLowerCase()) ||
    c.testName.toLowerCase().includes(search.toLowerCase()) ||
    c.batch?.batchNumber?.toLowerCase().includes(search.toLowerCase()) ||
    c.batch?.product?.name?.toLowerCase().includes(search.toLowerCase())
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <AlertTriangle className="w-8 h-8 text-red-600" />
          <div>
            <h1 className="text-2xl font-bold text-gray-900">OOS/OOT Investigations</h1>
            <p className="text-gray-500">Manage out-of-specification and out-of-trend investigations</p>
          </div>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="flex items-center gap-2 bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700"
        >
          <Plus className="w-4 h-4" />
          Open New Case
        </button>
      </div>

      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
          <div className="bg-white p-4 rounded-lg shadow border-l-4 border-blue-500">
            <div className="flex items-center gap-2">
              <Activity className="w-5 h-5 text-blue-600" />
              <span className="text-sm text-gray-500">Open Cases</span>
            </div>
            <p className="text-2xl font-bold text-gray-900 mt-1">{stats.openCases}</p>
          </div>
          <div className="bg-white p-4 rounded-lg shadow border-l-4 border-red-500">
            <div className="flex items-center gap-2">
              <AlertOctagon className="w-5 h-5 text-red-600" />
              <span className="text-sm text-gray-500">Overdue</span>
            </div>
            <p className="text-2xl font-bold text-gray-900 mt-1">{stats.overdue}</p>
          </div>
          <div className="bg-white p-4 rounded-lg shadow border-l-4 border-green-500">
            <div className="flex items-center gap-2">
              <CheckCircle className="w-5 h-5 text-green-600" />
              <span className="text-sm text-gray-500">Closed (30d)</span>
            </div>
            <p className="text-2xl font-bold text-gray-900 mt-1">{stats.recentClosures}</p>
          </div>
          {CASE_TYPES.map(ct => {
            const count = stats.byType.find(t => t.caseType === ct.value)?._count.id || 0;
            return (
              <div key={ct.value} className="bg-white p-4 rounded-lg shadow" style={{ borderLeftWidth: '4px', borderLeftColor: ct.color }}>
                <div className="flex items-center gap-2">
                  <FileWarning className="w-5 h-5" style={{ color: ct.color }} />
                  <span className="text-sm text-gray-500">{ct.label}</span>
                </div>
                <p className="text-2xl font-bold text-gray-900 mt-1">{count}</p>
              </div>
            );
          })}
        </div>
      )}

      <div className="bg-white rounded-lg shadow">
        <div className="p-4 border-b flex flex-wrap gap-4 items-center">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search by case number, test name, or batch..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
            />
          </div>
          <select
            value={statusFilter}
            onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
            className="px-3 py-2 border rounded-lg focus:ring-2 focus:ring-red-500"
          >
            <option value="">All Statuses</option>
            {STATUSES.map(s => (
              <option key={s.value} value={s.value}>{s.label}</option>
            ))}
          </select>
          <select
            value={typeFilter}
            onChange={(e) => { setTypeFilter(e.target.value); setPage(1); }}
            className="px-3 py-2 border rounded-lg focus:ring-2 focus:ring-red-500"
          >
            <option value="">All Types</option>
            {CASE_TYPES.map(t => (
              <option key={t.value} value={t.value}>{t.label}</option>
            ))}
          </select>
          <select
            value={priorityFilter}
            onChange={(e) => { setPriorityFilter(e.target.value); setPage(1); }}
            className="px-3 py-2 border rounded-lg focus:ring-2 focus:ring-red-500"
          >
            <option value="">All Priorities</option>
            {PRIORITIES.map(p => (
              <option key={p.value} value={p.value}>{p.label}</option>
            ))}
          </select>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Case</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Type</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Batch</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Test</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Priority</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Opened</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {filteredCases.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-8 text-center text-gray-500">
                    No OOS/OOT cases found
                  </td>
                </tr>
              ) : (
                filteredCases.map(c => (
                  <tr key={c.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <span className="font-medium text-gray-900">{c.caseNumber}</span>
                    </td>
                    <td className="px-4 py-3">{getTypeBadge(c.caseType)}</td>
                    <td className="px-4 py-3">
                      <div>
                        <span className="font-medium text-gray-900">{c.batch?.batchNumber}</span>
                        <p className="text-xs text-gray-500">{c.batch?.product?.name}</p>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-gray-900">{c.testName}</span>
                      {c.actualValue && c.specMin && c.specMax && (
                        <p className="text-xs text-gray-500">
                          {c.actualValue} {c.unit} (Spec: {c.specMin}-{c.specMax})
                        </p>
                      )}
                    </td>
                    <td className="px-4 py-3">{getPriorityBadge(c.priority)}</td>
                    <td className="px-4 py-3">{getStatusBadge(c.status)}</td>
                    <td className="px-4 py-3">
                      <span className="text-sm text-gray-500">
                        {new Date(c.openedAt).toLocaleDateString()}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <button
                        onClick={() => fetchCaseDetails(c.id)}
                        className="p-1.5 text-blue-600 hover:bg-blue-50 rounded"
                        title="View Details"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {totalPages > 1 && (
          <div className="p-4 border-t flex items-center justify-between">
            <button
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page === 1}
              className="px-3 py-1 border rounded disabled:opacity-50"
            >
              Previous
            </button>
            <span className="text-sm text-gray-500">Page {page} of {totalPages}</span>
            <button
              onClick={() => setPage(p => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              className="px-3 py-1 border rounded disabled:opacity-50"
            >
              Next
            </button>
          </div>
        )}
      </div>

      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b">
              <h2 className="text-xl font-semibold">Open New OOS/OOT Investigation</h2>
            </div>
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Batch *</label>
                  <select
                    value={formData.batchId}
                    onChange={(e) => setFormData({ ...formData, batchId: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-red-500"
                  >
                    <option value="">Select Batch</option>
                    {batches.map(b => (
                      <option key={b.id} value={b.id}>{b.batchNumber} - {b.product?.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Case Type *</label>
                  <select
                    value={formData.caseType}
                    onChange={(e) => setFormData({ ...formData, caseType: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-red-500"
                  >
                    {CASE_TYPES.map(t => (
                      <option key={t.value} value={t.value}>{t.label}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Priority *</label>
                  <select
                    value={formData.priority}
                    onChange={(e) => setFormData({ ...formData, priority: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-red-500"
                  >
                    {PRIORITIES.map(p => (
                      <option key={p.value} value={p.value}>{p.label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Due Date</label>
                  <input
                    type="date"
                    value={formData.dueDate}
                    onChange={(e) => setFormData({ ...formData, dueDate: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-red-500"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Test Name *</label>
                  <input
                    type="text"
                    value={formData.testName}
                    onChange={(e) => setFormData({ ...formData, testName: e.target.value })}
                    placeholder="e.g., Radiochemical Purity"
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-red-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Test Method</label>
                  <input
                    type="text"
                    value={formData.testMethod}
                    onChange={(e) => setFormData({ ...formData, testMethod: e.target.value })}
                    placeholder="e.g., HPLC"
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-red-500"
                  />
                </div>
              </div>
              <div className="grid grid-cols-4 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Spec Min</label>
                  <input
                    type="number"
                    step="0.01"
                    value={formData.specMin}
                    onChange={(e) => setFormData({ ...formData, specMin: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-red-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Spec Max</label>
                  <input
                    type="number"
                    step="0.01"
                    value={formData.specMax}
                    onChange={(e) => setFormData({ ...formData, specMax: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-red-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Actual Value</label>
                  <input
                    type="number"
                    step="0.01"
                    value={formData.actualValue}
                    onChange={(e) => setFormData({ ...formData, actualValue: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-red-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Unit</label>
                  <input
                    type="text"
                    value={formData.unit}
                    onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
                    placeholder="e.g., %"
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-red-500"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Initial Description *</label>
                <textarea
                  value={formData.initialDescription}
                  onChange={(e) => setFormData({ ...formData, initialDescription: e.target.value })}
                  rows={4}
                  placeholder="Describe the observed deviation..."
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-red-500"
                />
              </div>
            </div>
            <div className="p-6 border-t flex justify-end gap-3">
              <button
                onClick={() => setShowCreateModal(false)}
                className="px-4 py-2 border rounded-lg hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleCreateCase}
                disabled={!formData.batchId || !formData.testName || !formData.initialDescription}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50"
              >
                Open Case
              </button>
            </div>
          </div>
        </div>
      )}

      {showDetailModal && selectedCase && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b flex items-center justify-between">
              <div>
                <h2 className="text-xl font-semibold">{selectedCase.caseNumber}</h2>
                <p className="text-gray-500">{selectedCase.batch?.batchNumber} - {selectedCase.batch?.product?.name}</p>
              </div>
              <div className="flex items-center gap-2">
                {getTypeBadge(selectedCase.caseType)}
                {getPriorityBadge(selectedCase.priority)}
                {getStatusBadge(selectedCase.status)}
              </div>
            </div>

            <div className="p-6 space-y-6">
              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-4">
                  <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                    <FileWarning className="w-5 h-5" />
                    Test Details
                  </h3>
                  <div className="bg-gray-50 p-4 rounded-lg space-y-2">
                    <p><strong>Test Name:</strong> {selectedCase.testName}</p>
                    {selectedCase.testMethod && <p><strong>Method:</strong> {selectedCase.testMethod}</p>}
                    {selectedCase.specMin !== null && selectedCase.specMax !== null && (
                      <p><strong>Specification:</strong> {selectedCase.specMin} - {selectedCase.specMax} {selectedCase.unit}</p>
                    )}
                    {selectedCase.actualValue !== null && (
                      <p><strong>Actual Value:</strong> {selectedCase.actualValue} {selectedCase.unit}</p>
                    )}
                    {selectedCase.deviationPercent !== null && (
                      <p><strong>Deviation:</strong> {selectedCase.deviationPercent?.toFixed(2)}%</p>
                    )}
                  </div>

                  <h3 className="font-semibold text-gray-900">Initial Description</h3>
                  <p className="text-gray-600">{selectedCase.initialDescription}</p>

                  {selectedCase.rootCause && (
                    <>
                      <h3 className="font-semibold text-gray-900">Root Cause</h3>
                      <p className="text-gray-600">{selectedCase.rootCause}</p>
                    </>
                  )}

                  {selectedCase.correctiveAction && (
                    <>
                      <h3 className="font-semibold text-gray-900">Corrective Action</h3>
                      <p className="text-gray-600">{selectedCase.correctiveAction}</p>
                    </>
                  )}

                  {selectedCase.preventiveAction && (
                    <>
                      <h3 className="font-semibold text-gray-900">Preventive Action</h3>
                      <p className="text-gray-600">{selectedCase.preventiveAction}</p>
                    </>
                  )}
                </div>

                <div className="space-y-4">
                  <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                    <Activity className="w-5 h-5" />
                    Investigation Progress
                  </h3>

                  <div className="space-y-3">
                    <div className={`p-3 rounded-lg border ${selectedCase.status === 'OPEN' ? 'border-blue-500 bg-blue-50' : selectedCase.phase1StartedAt ? 'border-green-500 bg-green-50' : 'border-gray-200'}`}>
                      <div className="flex items-center justify-between">
                        <span className="font-medium">Phase 1: Lab Investigation</span>
                        {selectedCase.phase1CompletedAt ? (
                          <CheckCircle className="w-5 h-5 text-green-600" />
                        ) : selectedCase.phase1StartedAt ? (
                          <Clock className="w-5 h-5 text-blue-600" />
                        ) : (
                          <span className="text-gray-400 text-sm">Pending</span>
                        )}
                      </div>
                      {selectedCase.phase1Investigator && (
                        <p className="text-sm text-gray-500 mt-1">Investigator: {selectedCase.phase1Investigator.name}</p>
                      )}
                      {selectedCase.phase1Conclusion && (
                        <p className="text-sm text-gray-600 mt-1">{selectedCase.phase1Conclusion}</p>
                      )}
                    </div>

                    <div className={`p-3 rounded-lg border ${selectedCase.status.includes('PHASE_2') ? 'border-blue-500 bg-blue-50' : selectedCase.phase2StartedAt ? 'border-green-500 bg-green-50' : 'border-gray-200'}`}>
                      <div className="flex items-center justify-between">
                        <span className="font-medium">Phase 2: Full Investigation</span>
                        {selectedCase.phase2CompletedAt ? (
                          <CheckCircle className="w-5 h-5 text-green-600" />
                        ) : selectedCase.phase2StartedAt ? (
                          <Clock className="w-5 h-5 text-blue-600" />
                        ) : (
                          <span className="text-gray-400 text-sm">Pending</span>
                        )}
                      </div>
                      {selectedCase.phase2Lead && (
                        <p className="text-sm text-gray-500 mt-1">Lead: {selectedCase.phase2Lead.name}</p>
                      )}
                      {selectedCase.phase2Conclusion && (
                        <p className="text-sm text-gray-600 mt-1">{selectedCase.phase2Conclusion}</p>
                      )}
                    </div>

                    <div className={`p-3 rounded-lg border ${selectedCase.status.includes('CAPA') ? 'border-blue-500 bg-blue-50' : selectedCase.correctiveAction ? 'border-green-500 bg-green-50' : 'border-gray-200'}`}>
                      <div className="flex items-center justify-between">
                        <span className="font-medium">CAPA</span>
                        {selectedCase.status === 'CAPA_IMPLEMENTING' || selectedCase.status.startsWith('CLOSED') ? (
                          <CheckCircle className="w-5 h-5 text-green-600" />
                        ) : selectedCase.status.includes('CAPA') ? (
                          <Clock className="w-5 h-5 text-blue-600" />
                        ) : (
                          <span className="text-gray-400 text-sm">Pending</span>
                        )}
                      </div>
                    </div>

                    <div className={`p-3 rounded-lg border ${selectedCase.status.startsWith('CLOSED') ? 'border-green-500 bg-green-50' : 'border-gray-200'}`}>
                      <div className="flex items-center justify-between">
                        <span className="font-medium">Closure</span>
                        {selectedCase.closedAt ? (
                          <CheckCircle className="w-5 h-5 text-green-600" />
                        ) : (
                          <span className="text-gray-400 text-sm">Pending</span>
                        )}
                      </div>
                      {selectedCase.closureType && (
                        <p className="text-sm text-gray-500 mt-1">Type: {selectedCase.closureType}</p>
                      )}
                      {selectedCase.finalConclusion && (
                        <p className="text-sm text-gray-600 mt-1">{selectedCase.finalConclusion}</p>
                      )}
                    </div>
                  </div>

                  <h3 className="font-semibold text-gray-900 flex items-center gap-2 mt-6">
                    <Clock className="w-5 h-5" />
                    Available Actions
                  </h3>

                  <div className="space-y-2">
                    {selectedCase.status === 'OPEN' && (
                      <button
                        onClick={() => handleStartPhase1(selectedCase.id)}
                        className="w-full flex items-center justify-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
                      >
                        <Play className="w-4 h-4" />
                        Start Phase 1 Investigation
                      </button>
                    )}

                    {selectedCase.status === 'PHASE_1_LAB_INVESTIGATION' && (
                      <div className="space-y-2">
                        <button
                          onClick={() => handleCompletePhase1(selectedCase.id, true)}
                          className="w-full flex items-center justify-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
                        >
                          <ArrowRight className="w-4 h-4" />
                          Complete &amp; Proceed to Phase 2
                        </button>
                        <button
                          onClick={() => handleCompletePhase1(selectedCase.id, false)}
                          className="w-full flex items-center justify-center gap-2 border border-gray-300 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-50"
                        >
                          <XCircle className="w-4 h-4" />
                          Invalidate Case
                        </button>
                      </div>
                    )}

                    {selectedCase.status === 'PHASE_1_COMPLETE' && (
                      <div className="space-y-2">
                        <button
                          onClick={() => handleStartPhase2(selectedCase.id)}
                          className="w-full flex items-center justify-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
                        >
                          <Play className="w-4 h-4" />
                          Start Phase 2 Investigation
                        </button>
                        <button
                          onClick={() => handleProposeCapa(selectedCase.id)}
                          className="w-full flex items-center justify-center gap-2 bg-teal-600 text-white px-4 py-2 rounded-lg hover:bg-teal-700"
                        >
                          <FileWarning className="w-4 h-4" />
                          Propose CAPA (Skip Phase 2)
                        </button>
                      </div>
                    )}

                    {selectedCase.status === 'PHASE_2_FULL_INVESTIGATION' && (
                      <button
                        onClick={() => handleCompletePhase2(selectedCase.id)}
                        className="w-full flex items-center justify-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
                      >
                        <CheckCircle className="w-4 h-4" />
                        Complete Phase 2
                      </button>
                    )}

                    {selectedCase.status === 'PHASE_2_COMPLETE' && (
                      <button
                        onClick={() => handleProposeCapa(selectedCase.id)}
                        className="w-full flex items-center justify-center gap-2 bg-teal-600 text-white px-4 py-2 rounded-lg hover:bg-teal-700"
                      >
                        <FileWarning className="w-4 h-4" />
                        Propose CAPA
                      </button>
                    )}

                    {selectedCase.status === 'CAPA_PROPOSED' && (
                      <button
                        onClick={() => handleApproveCapa(selectedCase.id)}
                        className="w-full flex items-center justify-center gap-2 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700"
                      >
                        <CheckCircle className="w-4 h-4" />
                        Approve CAPA
                      </button>
                    )}

                    {selectedCase.status === 'CAPA_APPROVED' && (
                      <button
                        onClick={() => handleStartImplementation(selectedCase.id)}
                        className="w-full flex items-center justify-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
                      >
                        <Play className="w-4 h-4" />
                        Start Implementation
                      </button>
                    )}

                    {selectedCase.status === 'CAPA_IMPLEMENTING' && (
                      <button
                        onClick={() => handleCloseCase(selectedCase.id, 'CONFIRMED')}
                        className="w-full flex items-center justify-center gap-2 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700"
                      >
                        <CheckCircle className="w-4 h-4" />
                        Close Case (Confirmed)
                      </button>
                    )}

                    {['PHASE_1_COMPLETE', 'PHASE_2_COMPLETE'].includes(selectedCase.status) && (
                      <div className="flex gap-2 mt-4">
                        <button
                          onClick={() => handleCloseCase(selectedCase.id, 'CONFIRMED')}
                          className="flex-1 flex items-center justify-center gap-2 bg-green-600 text-white px-3 py-2 rounded-lg hover:bg-green-700 text-sm"
                        >
                          Close Confirmed
                        </button>
                        <button
                          onClick={() => handleCloseCase(selectedCase.id, 'INVALIDATED')}
                          className="flex-1 flex items-center justify-center gap-2 bg-gray-600 text-white px-3 py-2 rounded-lg hover:bg-gray-700 text-sm"
                        >
                          Invalidate
                        </button>
                        <button
                          onClick={() => handleCloseCase(selectedCase.id, 'INCONCLUSIVE')}
                          className="flex-1 flex items-center justify-center gap-2 bg-purple-600 text-white px-3 py-2 rounded-lg hover:bg-purple-700 text-sm"
                        >
                          Inconclusive
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {selectedCase.timeline && selectedCase.timeline.length > 0 && (
                <div>
                  <h3 className="font-semibold text-gray-900 mb-3">Timeline</h3>
                  <div className="space-y-2 max-h-48 overflow-y-auto">
                    {selectedCase.timeline.map((entry) => (
                      <div key={entry.id} className="flex items-start gap-3 p-2 bg-gray-50 rounded">
                        <Clock className="w-4 h-4 text-gray-400 mt-0.5" />
                        <div className="flex-1">
                          <p className="text-sm font-medium text-gray-900">{entry.action.replace(/_/g, ' ')}</p>
                          <p className="text-xs text-gray-500">{entry.description}</p>
                          <p className="text-xs text-gray-400">{new Date(entry.createdAt).toLocaleString()}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="p-6 border-t flex justify-end">
              <button
                onClick={() => setShowDetailModal(false)}
                className="px-4 py-2 border rounded-lg hover:bg-gray-50"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
