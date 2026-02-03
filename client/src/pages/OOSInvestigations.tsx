import { useState, useEffect, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import api from '../lib/api';
import { format } from 'date-fns';
import { AlertTriangle, Plus, Eye, Play, CheckCircle, Clock, FileWarning, Activity, XCircle, AlertOctagon, MoreVertical, ArrowRight, X } from 'lucide-react';
import { useToast } from '../components/ui/Toast';
import { parseApiError } from '../components/ui/FormErrors';
import { KpiCard, StatusBadge, FilterBar, EmptyState, type FilterWidget } from '../components/shared';

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
  openedBy: { id: string; firstName: string; lastName: string; email: string };
  phase1InvestigatorId?: string;
  phase1Investigator?: { id: string; firstName: string; lastName: string };
  phase1StartedAt?: string;
  phase1CompletedAt?: string;
  phase1Conclusion?: string;
  phase2LeadId?: string;
  phase2Lead?: { id: string; firstName: string; lastName: string };
  phase2StartedAt?: string;
  phase2CompletedAt?: string;
  phase2Conclusion?: string;
  rootCause?: string;
  correctiveAction?: string;
  preventiveAction?: string;
  closedAt?: string;
  closedBy?: { id: string; firstName: string; lastName: string };
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

interface Batch {
  id: string;
  batchNumber: string;
  product: { name: string };
}

const STATUSES = [
  { value: 'OPEN', label: 'Open' },
  { value: 'PHASE_1_LAB_INVESTIGATION', label: 'Phase 1 Investigation' },
  { value: 'PHASE_1_COMPLETE', label: 'Phase 1 Complete' },
  { value: 'PHASE_2_FULL_INVESTIGATION', label: 'Phase 2 Investigation' },
  { value: 'PHASE_2_COMPLETE', label: 'Phase 2 Complete' },
  { value: 'CAPA_PROPOSED', label: 'CAPA Proposed' },
  { value: 'CAPA_APPROVED', label: 'CAPA Approved' },
  { value: 'CAPA_IMPLEMENTING', label: 'CAPA Implementing' },
  { value: 'CLOSED_CONFIRMED', label: 'Closed (Confirmed)' },
  { value: 'CLOSED_INVALIDATED', label: 'Closed (Invalidated)' },
  { value: 'CLOSED_INCONCLUSIVE', label: 'Closed (Inconclusive)' },
];

const CASE_TYPES = [
  { value: 'OOS', label: 'Out of Specification' },
  { value: 'OOT', label: 'Out of Trend' },
  { value: 'OOE', label: 'Out of Expectation' },
];

const PRIORITIES = [
  { value: 'LOW', label: 'Low' },
  { value: 'MEDIUM', label: 'Medium' },
  { value: 'HIGH', label: 'High' },
  { value: 'CRITICAL', label: 'Critical' },
];

export default function OOSInvestigations() {
  const [filters, setFilters] = useState<Record<string, any>>({});
  const [page, setPage] = useState(1);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedCase, setSelectedCase] = useState<OOSCase | null>(null);
  const [activeDropdown, setActiveDropdown] = useState<string | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const queryClient = useQueryClient();
  const toast = useToast();

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

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setActiveDropdown(null);
      }
    };
    if (activeDropdown) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [activeDropdown]);

  const { data: casesData, isLoading } = useQuery({
    queryKey: ['oos-cases', filters, page],
    queryFn: async () => {
      const params = new URLSearchParams();
      params.append('page', page.toString());
      params.append('limit', '20');
      if (filters.status) params.append('status', filters.status);
      if (filters.caseType) params.append('caseType', filters.caseType);
      if (filters.priority) params.append('priority', filters.priority);
      const { data } = await api.get(`/oos-investigations?${params}`);
      return data;
    },
  });

  const allCases = casesData?.cases || [];
  const totalPages = casesData?.totalPages || 1;
  
  const cases = filters.search 
    ? allCases.filter((c: OOSCase) =>
        c.caseNumber.toLowerCase().includes(filters.search.toLowerCase()) ||
        c.testName.toLowerCase().includes(filters.search.toLowerCase()) ||
        c.batch?.batchNumber?.toLowerCase().includes(filters.search.toLowerCase()) ||
        c.batch?.product?.name?.toLowerCase().includes(filters.search.toLowerCase())
      )
    : allCases;

  const { data: stats } = useQuery({
    queryKey: ['oos-stats'],
    queryFn: async () => {
      const { data } = await api.get('/oos-investigations/stats');
      return data;
    },
  });

  const { data: batches } = useQuery({
    queryKey: ['batches-for-oos'],
    queryFn: async () => {
      const { data } = await api.get('/batches');
      return data.slice(0, 100);
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: any) => {
      return api.post('/oos-investigations', data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['oos-cases'] });
      queryClient.invalidateQueries({ queryKey: ['oos-stats'] });
      setShowCreateModal(false);
      resetForm();
      toast.success('Case Opened', 'New OOS/OOT investigation case has been opened');
    },
    onError: (error: any) => {
      const apiError = parseApiError(error);
      toast.error('Creation Failed', apiError?.userMessage || 'Failed to create case');
    },
  });

  const startPhase1Mutation = useMutation({
    mutationFn: async (id: string) => {
      return api.post(`/oos-investigations/${id}/start-phase1`, {});
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['oos-cases'] });
      queryClient.invalidateQueries({ queryKey: ['oos-stats'] });
      if (selectedCase) fetchCaseDetails(selectedCase.id);
      toast.success('Phase 1 Started', 'Lab investigation has begun');
    },
    onError: (error: any) => {
      const apiError = parseApiError(error);
      toast.error('Failed', apiError?.userMessage || 'Failed to start Phase 1');
    },
  });

  const completePhase1Mutation = useMutation({
    mutationFn: async ({ id, proceedToPhase2 }: { id: string; proceedToPhase2: boolean }) => {
      return api.post(`/oos-investigations/${id}/complete-phase1`, {
        conclusion: 'Phase 1 investigation completed',
        proceedToPhase2,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['oos-cases'] });
      queryClient.invalidateQueries({ queryKey: ['oos-stats'] });
      if (selectedCase) fetchCaseDetails(selectedCase.id);
      toast.success('Phase 1 Completed', 'Lab investigation phase completed');
    },
    onError: (error: any) => {
      const apiError = parseApiError(error);
      toast.error('Failed', apiError?.userMessage || 'Failed to complete Phase 1');
    },
  });

  const startPhase2Mutation = useMutation({
    mutationFn: async (id: string) => {
      return api.post(`/oos-investigations/${id}/start-phase2`, {});
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['oos-cases'] });
      queryClient.invalidateQueries({ queryKey: ['oos-stats'] });
      if (selectedCase) fetchCaseDetails(selectedCase.id);
      toast.success('Phase 2 Started', 'Full investigation has begun');
    },
    onError: (error: any) => {
      const apiError = parseApiError(error);
      toast.error('Failed', apiError?.userMessage || 'Failed to start Phase 2');
    },
  });

  const completePhase2Mutation = useMutation({
    mutationFn: async (id: string) => {
      return api.post(`/oos-investigations/${id}/complete-phase2`, {
        conclusion: 'Phase 2 investigation completed',
        rootCause: 'Root cause identified during investigation',
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['oos-cases'] });
      queryClient.invalidateQueries({ queryKey: ['oos-stats'] });
      if (selectedCase) fetchCaseDetails(selectedCase.id);
      toast.success('Phase 2 Completed', 'Full investigation phase completed');
    },
    onError: (error: any) => {
      const apiError = parseApiError(error);
      toast.error('Failed', apiError?.userMessage || 'Failed to complete Phase 2');
    },
  });

  const proposeCapaMutation = useMutation({
    mutationFn: async (id: string) => {
      return api.post(`/oos-investigations/${id}/propose-capa`, {
        rootCause: 'Root cause identified',
        correctiveAction: 'Corrective actions to be taken',
        preventiveAction: 'Preventive measures to implement',
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['oos-cases'] });
      queryClient.invalidateQueries({ queryKey: ['oos-stats'] });
      if (selectedCase) fetchCaseDetails(selectedCase.id);
      toast.success('CAPA Proposed', 'Corrective and preventive actions submitted');
    },
    onError: (error: any) => {
      const apiError = parseApiError(error);
      toast.error('Failed', apiError?.userMessage || 'Failed to propose CAPA');
    },
  });

  const approveCapaMutation = useMutation({
    mutationFn: async (id: string) => {
      return api.post(`/oos-investigations/${id}/approve-capa`, {
        signatureMeaning: 'I approve this CAPA for implementation',
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['oos-cases'] });
      queryClient.invalidateQueries({ queryKey: ['oos-stats'] });
      if (selectedCase) fetchCaseDetails(selectedCase.id);
      toast.success('CAPA Approved', 'CAPA has been approved for implementation');
    },
    onError: (error: any) => {
      const apiError = parseApiError(error);
      toast.error('Failed', apiError?.userMessage || 'Failed to approve CAPA');
    },
  });

  const startImplementationMutation = useMutation({
    mutationFn: async (id: string) => {
      return api.post(`/oos-investigations/${id}/start-implementation`, {});
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['oos-cases'] });
      queryClient.invalidateQueries({ queryKey: ['oos-stats'] });
      if (selectedCase) fetchCaseDetails(selectedCase.id);
      toast.success('Implementation Started', 'CAPA implementation has begun');
    },
    onError: (error: any) => {
      const apiError = parseApiError(error);
      toast.error('Failed', apiError?.userMessage || 'Failed to start implementation');
    },
  });

  const closeCaseMutation = useMutation({
    mutationFn: async ({ id, closureType }: { id: string; closureType: string }) => {
      return api.post(`/oos-investigations/${id}/close`, {
        closureType,
        finalConclusion: `Case closed as ${closureType}`,
        signatureMeaning: `I confirm the closure of this OOS case as ${closureType}`,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['oos-cases'] });
      queryClient.invalidateQueries({ queryKey: ['oos-stats'] });
      if (selectedCase) fetchCaseDetails(selectedCase.id);
      toast.success('Case Closed', 'Investigation has been closed');
    },
    onError: (error: any) => {
      const apiError = parseApiError(error);
      toast.error('Failed', apiError?.userMessage || 'Failed to close case');
    },
  });

  const resetForm = () => {
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
  };

  const fetchCaseDetails = async (caseId: string) => {
    try {
      const { data } = await api.get(`/oos-investigations/${caseId}`);
      setSelectedCase(data);
      setShowDetailModal(true);
    } catch (error) {
      console.error('Failed to fetch case details:', error);
    }
  };

  const handleCreateCase = () => {
    createMutation.mutate(formData);
  };

  const filterWidgets: FilterWidget[] = [
    { key: 'search', label: 'Search', type: 'search', placeholder: 'Search cases...' },
    { 
      key: 'status', 
      label: 'Status', 
      type: 'select', 
      options: [
        { value: '', label: 'All Statuses' },
        ...STATUSES.map(s => ({ value: s.value, label: s.label }))
      ]
    },
    {
      key: 'caseType',
      label: 'Type',
      type: 'select',
      options: [
        { value: '', label: 'All Types' },
        ...CASE_TYPES.map(t => ({ value: t.value, label: t.label }))
      ]
    },
    {
      key: 'priority',
      label: 'Priority',
      type: 'select',
      options: [
        { value: '', label: 'All Priorities' },
        ...PRIORITIES.map(p => ({ value: p.value, label: p.label }))
      ]
    },
  ];

  const kpiStats = {
    open: stats?.openCases || 0,
    overdue: stats?.overdue || 0,
    closed: stats?.recentClosures || 0,
    oos: stats?.byType?.find((t: any) => t.caseType === 'OOS')?._count?.id || 0,
    oot: stats?.byType?.find((t: any) => t.caseType === 'OOT')?._count?.id || 0,
    ooe: stats?.byType?.find((t: any) => t.caseType === 'OOE')?._count?.id || 0,
  };

  const getStatusColor = (status: string): string => {
    const colors: Record<string, string> = {
      OPEN: 'default',
      PHASE_1_LAB_INVESTIGATION: 'info',
      PHASE_1_COMPLETE: 'info',
      PHASE_2_FULL_INVESTIGATION: 'warning',
      PHASE_2_COMPLETE: 'warning',
      CAPA_PROPOSED: 'primary',
      CAPA_APPROVED: 'success',
      CAPA_IMPLEMENTING: 'success',
      CLOSED_CONFIRMED: 'success',
      CLOSED_INVALIDATED: 'default',
      CLOSED_INCONCLUSIVE: 'warning',
    };
    return colors[status] || 'default';
  };

  const getPriorityColor = (priority: string): string => {
    const colors: Record<string, string> = {
      LOW: 'default',
      MEDIUM: 'info',
      HIGH: 'warning',
      CRITICAL: 'danger',
    };
    return colors[priority] || 'default';
  };

  const getTypeColor = (type: string): string => {
    const colors: Record<string, string> = {
      OOS: 'danger',
      OOT: 'warning',
      OOE: 'info',
    };
    return colors[type] || 'default';
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
          <h2 style={{ fontSize: '1.25rem', fontWeight: 600, marginBottom: '0.25rem' }}>OOS/OOT Investigations</h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', margin: 0 }}>
            Manage out-of-specification and out-of-trend investigations
          </p>
        </div>
        <button className="btn btn-primary" onClick={() => setShowCreateModal(true)}>
          <Plus size={16} />
          Open New Case
        </button>
      </div>

      <div className="grid" style={{ gridTemplateColumns: 'repeat(6, 1fr)', gap: '1rem', marginBottom: '1.5rem' }}>
        <KpiCard 
          title="Open Cases" 
          value={kpiStats.open} 
          icon={<Activity size={20} />}
          color="primary"
          onClick={() => setFilters({ status: 'OPEN' })}
          selected={filters.status === 'OPEN'}
        />
        <KpiCard 
          title="Overdue" 
          value={kpiStats.overdue} 
          icon={<AlertOctagon size={20} />}
          color="danger"
        />
        <KpiCard 
          title="Closed (30d)" 
          value={kpiStats.closed} 
          icon={<CheckCircle size={20} />}
          color="success"
        />
        <KpiCard 
          title="OOS Cases" 
          value={kpiStats.oos} 
          icon={<AlertTriangle size={20} />}
          color="danger"
          onClick={() => setFilters({ caseType: 'OOS' })}
          selected={filters.caseType === 'OOS'}
        />
        <KpiCard 
          title="OOT Cases" 
          value={kpiStats.oot} 
          icon={<FileWarning size={20} />}
          color="warning"
          onClick={() => setFilters({ caseType: 'OOT' })}
          selected={filters.caseType === 'OOT'}
        />
        <KpiCard 
          title="OOE Cases" 
          value={kpiStats.ooe} 
          icon={<Clock size={20} />}
          color="info"
          onClick={() => setFilters({ caseType: 'OOE' })}
          selected={filters.caseType === 'OOE'}
        />
      </div>

      <div className="card" style={{ marginBottom: '1rem', padding: '1rem' }}>
        <FilterBar 
          widgets={filterWidgets}
          values={filters}
          onChange={(key, value) => setFilters(prev => ({ ...prev, [key]: value }))}
          onReset={() => setFilters({})}
        />
      </div>

      <div className="card">
        <div style={{ padding: '1rem 1.5rem', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <h3 style={{ fontWeight: 600, fontSize: '1rem', margin: 0 }}>
            Investigation Cases ({cases?.length || 0})
          </h3>
        </div>
        {cases?.length > 0 ? (
          <table className="table" style={{ marginBottom: 0 }}>
            <thead>
              <tr>
                <th>Case #</th>
                <th>Type</th>
                <th>Batch</th>
                <th>Test</th>
                <th>Priority</th>
                <th>Status</th>
                <th>Opened</th>
                <th style={{ width: '120px', textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {cases.map((c: OOSCase) => (
                <tr key={c.id}>
                  <td>
                    <span style={{ fontWeight: 500, fontFamily: 'monospace', fontSize: '0.8125rem', color: 'var(--danger)' }}>
                      {c.caseNumber}
                    </span>
                  </td>
                  <td>
                    <span className={`badge badge-${getTypeColor(c.caseType)}`} style={{ fontSize: '0.6875rem' }}>
                      {c.caseType}
                    </span>
                  </td>
                  <td>
                    <div style={{ fontWeight: 500 }}>{c.batch?.batchNumber}</div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                      {c.batch?.product?.name}
                    </div>
                  </td>
                  <td>
                    <div>{c.testName}</div>
                    {c.actualValue && c.specMin && c.specMax && (
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                        {c.actualValue} {c.unit} (Spec: {c.specMin}-{c.specMax})
                      </div>
                    )}
                  </td>
                  <td>
                    <span className={`badge badge-${getPriorityColor(c.priority)}`} style={{ fontSize: '0.6875rem' }}>
                      {c.priority}
                    </span>
                  </td>
                  <td>
                    <StatusBadge status={c.status} size="sm" />
                  </td>
                  <td>
                    <div>{format(new Date(c.openedAt), 'MMM dd, yyyy')}</div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                      {c.openedBy?.firstName} {c.openedBy?.lastName}
                    </div>
                  </td>
                  <td>
                    <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end', position: 'relative' }}>
                      <button className="btn btn-sm btn-outline" onClick={() => fetchCaseDetails(c.id)} title="View Details">
                        <Eye size={14} />
                      </button>
                      <div style={{ position: 'relative' }} ref={activeDropdown === c.id ? dropdownRef : null}>
                        <button
                          className="btn btn-sm btn-outline"
                          onClick={(e) => {
                            e.stopPropagation();
                            setActiveDropdown(activeDropdown === c.id ? null : c.id);
                          }}
                        >
                          <MoreVertical size={14} />
                        </button>
                        {activeDropdown === c.id && (
                          <div className="dropdown-menu" onClick={(e) => e.stopPropagation()}>
                            {c.status === 'OPEN' && (
                              <button
                                className="dropdown-item"
                                onClick={() => {
                                  startPhase1Mutation.mutate(c.id);
                                  setActiveDropdown(null);
                                }}
                              >
                                <Play size={14} />
                                Start Phase 1
                              </button>
                            )}
                            {c.status === 'PHASE_1_LAB_INVESTIGATION' && (
                              <>
                                <button
                                  className="dropdown-item"
                                  onClick={() => {
                                    completePhase1Mutation.mutate({ id: c.id, proceedToPhase2: false });
                                    setActiveDropdown(null);
                                  }}
                                >
                                  <CheckCircle size={14} />
                                  Complete Phase 1
                                </button>
                                <button
                                  className="dropdown-item"
                                  onClick={() => {
                                    completePhase1Mutation.mutate({ id: c.id, proceedToPhase2: true });
                                    setActiveDropdown(null);
                                  }}
                                >
                                  <ArrowRight size={14} />
                                  Proceed to Phase 2
                                </button>
                              </>
                            )}
                            {c.status === 'PHASE_1_COMPLETE' && (
                              <button
                                className="dropdown-item"
                                onClick={() => {
                                  startPhase2Mutation.mutate(c.id);
                                  setActiveDropdown(null);
                                }}
                              >
                                <Play size={14} />
                                Start Phase 2
                              </button>
                            )}
                            {c.status === 'PHASE_2_FULL_INVESTIGATION' && (
                              <button
                                className="dropdown-item"
                                onClick={() => {
                                  completePhase2Mutation.mutate(c.id);
                                  setActiveDropdown(null);
                                }}
                              >
                                <CheckCircle size={14} />
                                Complete Phase 2
                              </button>
                            )}
                            {c.status === 'PHASE_2_COMPLETE' && (
                              <button
                                className="dropdown-item"
                                onClick={() => {
                                  proposeCapaMutation.mutate(c.id);
                                  setActiveDropdown(null);
                                }}
                              >
                                <FileWarning size={14} />
                                Propose CAPA
                              </button>
                            )}
                            {c.status === 'CAPA_PROPOSED' && (
                              <button
                                className="dropdown-item"
                                onClick={() => {
                                  approveCapaMutation.mutate(c.id);
                                  setActiveDropdown(null);
                                }}
                              >
                                <CheckCircle size={14} />
                                Approve CAPA
                              </button>
                            )}
                            {c.status === 'CAPA_APPROVED' && (
                              <button
                                className="dropdown-item"
                                onClick={() => {
                                  startImplementationMutation.mutate(c.id);
                                  setActiveDropdown(null);
                                }}
                              >
                                <Play size={14} />
                                Start Implementation
                              </button>
                            )}
                            {c.status === 'CAPA_IMPLEMENTING' && (
                              <>
                                <button
                                  className="dropdown-item"
                                  onClick={() => {
                                    closeCaseMutation.mutate({ id: c.id, closureType: 'CONFIRMED' });
                                    setActiveDropdown(null);
                                  }}
                                >
                                  <CheckCircle size={14} />
                                  Close (Confirmed)
                                </button>
                                <button
                                  className="dropdown-item"
                                  onClick={() => {
                                    closeCaseMutation.mutate({ id: c.id, closureType: 'INVALIDATED' });
                                    setActiveDropdown(null);
                                  }}
                                >
                                  <XCircle size={14} />
                                  Close (Invalidated)
                                </button>
                              </>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <div style={{ padding: '2rem' }}>
            <EmptyState 
              title="No investigations found"
              message="Open a new case to start an investigation"
              icon="alert"
            />
          </div>
        )}
        
        {totalPages > 1 && (
          <div style={{ padding: '1rem 1.5rem', borderTop: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <button
              className="btn btn-sm btn-outline"
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page === 1}
            >
              Previous
            </button>
            <span style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>
              Page {page} of {totalPages}
            </span>
            <button
              className="btn btn-sm btn-outline"
              onClick={() => setPage(p => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
            >
              Next
            </button>
          </div>
        )}
      </div>

      {activeDropdown && (
        <div
          style={{ position: 'fixed', inset: 0, zIndex: 999 }}
          onClick={() => setActiveDropdown(null)}
        />
      )}

      {showCreateModal && (
        <div className="modal-overlay">
          <div className="modal" style={{ maxWidth: '700px' }}>
            <div className="modal-header">
              <h3>Open New OOS/OOT Investigation</h3>
              <button className="btn btn-ghost btn-sm" onClick={() => setShowCreateModal(false)}>
                <X size={18} />
              </button>
            </div>
            <div className="modal-body">
              <div className="form-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div className="form-group">
                  <label className="form-label">Batch *</label>
                  <select
                    className="form-select"
                    value={formData.batchId}
                    onChange={(e) => setFormData({ ...formData, batchId: e.target.value })}
                  >
                    <option value="">Select Batch</option>
                    {batches?.map((b: Batch) => (
                      <option key={b.id} value={b.id}>{b.batchNumber} - {b.product?.name}</option>
                    ))}
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Case Type *</label>
                  <select
                    className="form-select"
                    value={formData.caseType}
                    onChange={(e) => setFormData({ ...formData, caseType: e.target.value })}
                  >
                    {CASE_TYPES.map(t => (
                      <option key={t.value} value={t.value}>{t.label}</option>
                    ))}
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Priority *</label>
                  <select
                    className="form-select"
                    value={formData.priority}
                    onChange={(e) => setFormData({ ...formData, priority: e.target.value })}
                  >
                    {PRIORITIES.map(p => (
                      <option key={p.value} value={p.value}>{p.label}</option>
                    ))}
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Due Date</label>
                  <input
                    type="date"
                    className="form-input"
                    value={formData.dueDate}
                    onChange={(e) => setFormData({ ...formData, dueDate: e.target.value })}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Test Name *</label>
                  <input
                    type="text"
                    className="form-input"
                    value={formData.testName}
                    onChange={(e) => setFormData({ ...formData, testName: e.target.value })}
                    placeholder="e.g., Assay, pH, Endotoxin"
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Test Method</label>
                  <input
                    type="text"
                    className="form-input"
                    value={formData.testMethod}
                    onChange={(e) => setFormData({ ...formData, testMethod: e.target.value })}
                    placeholder="e.g., HPLC, USP Method"
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Spec Min</label>
                  <input
                    type="number"
                    className="form-input"
                    value={formData.specMin}
                    onChange={(e) => setFormData({ ...formData, specMin: e.target.value })}
                    placeholder="Minimum specification"
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Spec Max</label>
                  <input
                    type="number"
                    className="form-input"
                    value={formData.specMax}
                    onChange={(e) => setFormData({ ...formData, specMax: e.target.value })}
                    placeholder="Maximum specification"
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Actual Value</label>
                  <input
                    type="number"
                    className="form-input"
                    value={formData.actualValue}
                    onChange={(e) => setFormData({ ...formData, actualValue: e.target.value })}
                    placeholder="Observed value"
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Unit</label>
                  <input
                    type="text"
                    className="form-input"
                    value={formData.unit}
                    onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
                    placeholder="e.g., %, mg/mL"
                  />
                </div>
                <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                  <label className="form-label">Initial Description *</label>
                  <textarea
                    className="form-textarea"
                    rows={3}
                    value={formData.initialDescription}
                    onChange={(e) => setFormData({ ...formData, initialDescription: e.target.value })}
                    placeholder="Describe the deviation or issue observed..."
                  />
                </div>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setShowCreateModal(false)}>
                Cancel
              </button>
              <button 
                className="btn btn-primary" 
                onClick={handleCreateCase}
                disabled={!formData.batchId || !formData.testName || !formData.initialDescription || createMutation.isPending}
              >
                {createMutation.isPending ? 'Creating...' : 'Open Case'}
              </button>
            </div>
          </div>
        </div>
      )}

      {showDetailModal && selectedCase && (
        <div className="modal-overlay">
          <div className="modal" style={{ maxWidth: '800px' }}>
            <div className="modal-header">
              <div>
                <h3 style={{ marginBottom: '0.25rem' }}>{selectedCase.caseNumber}</h3>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <span className={`badge badge-${getTypeColor(selectedCase.caseType)}`}>{selectedCase.caseType}</span>
                  <span className={`badge badge-${getPriorityColor(selectedCase.priority)}`}>{selectedCase.priority}</span>
                  <StatusBadge status={selectedCase.status} size="sm" />
                </div>
              </div>
              <button className="btn btn-ghost btn-sm" onClick={() => setShowDetailModal(false)}>
                <X size={18} />
              </button>
            </div>
            <div className="modal-body" style={{ maxHeight: '60vh', overflowY: 'auto' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
                <div className="card" style={{ padding: '1rem' }}>
                  <h4 style={{ fontSize: '0.875rem', fontWeight: 600, marginBottom: '0.75rem', color: 'var(--text-muted)' }}>Batch Information</h4>
                  <div style={{ fontSize: '0.875rem' }}>
                    <div style={{ marginBottom: '0.5rem' }}>
                      <span style={{ color: 'var(--text-muted)' }}>Batch:</span>{' '}
                      <span style={{ fontWeight: 500 }}>{selectedCase.batch?.batchNumber}</span>
                    </div>
                    <div>
                      <span style={{ color: 'var(--text-muted)' }}>Product:</span>{' '}
                      <span>{selectedCase.batch?.product?.name}</span>
                    </div>
                  </div>
                </div>
                <div className="card" style={{ padding: '1rem' }}>
                  <h4 style={{ fontSize: '0.875rem', fontWeight: 600, marginBottom: '0.75rem', color: 'var(--text-muted)' }}>Test Details</h4>
                  <div style={{ fontSize: '0.875rem' }}>
                    <div style={{ marginBottom: '0.5rem' }}>
                      <span style={{ color: 'var(--text-muted)' }}>Test:</span>{' '}
                      <span style={{ fontWeight: 500 }}>{selectedCase.testName}</span>
                    </div>
                    {selectedCase.testMethod && (
                      <div style={{ marginBottom: '0.5rem' }}>
                        <span style={{ color: 'var(--text-muted)' }}>Method:</span>{' '}
                        <span>{selectedCase.testMethod}</span>
                      </div>
                    )}
                    {selectedCase.actualValue && (
                      <div>
                        <span style={{ color: 'var(--text-muted)' }}>Result:</span>{' '}
                        <span style={{ color: 'var(--danger)', fontWeight: 500 }}>
                          {selectedCase.actualValue} {selectedCase.unit}
                        </span>
                        {selectedCase.specMin && selectedCase.specMax && (
                          <span style={{ color: 'var(--text-muted)' }}> (Spec: {selectedCase.specMin}-{selectedCase.specMax})</span>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div className="card" style={{ padding: '1rem', marginTop: '1rem' }}>
                <h4 style={{ fontSize: '0.875rem', fontWeight: 600, marginBottom: '0.75rem', color: 'var(--text-muted)' }}>Initial Description</h4>
                <p style={{ fontSize: '0.875rem', margin: 0 }}>{selectedCase.initialDescription}</p>
              </div>

              {(selectedCase.rootCause || selectedCase.correctiveAction || selectedCase.preventiveAction) && (
                <div className="card" style={{ padding: '1rem', marginTop: '1rem' }}>
                  <h4 style={{ fontSize: '0.875rem', fontWeight: 600, marginBottom: '0.75rem', color: 'var(--text-muted)' }}>CAPA Details</h4>
                  {selectedCase.rootCause && (
                    <div style={{ marginBottom: '0.75rem' }}>
                      <div style={{ fontWeight: 500, fontSize: '0.8125rem', marginBottom: '0.25rem' }}>Root Cause</div>
                      <p style={{ fontSize: '0.875rem', margin: 0 }}>{selectedCase.rootCause}</p>
                    </div>
                  )}
                  {selectedCase.correctiveAction && (
                    <div style={{ marginBottom: '0.75rem' }}>
                      <div style={{ fontWeight: 500, fontSize: '0.8125rem', marginBottom: '0.25rem' }}>Corrective Action</div>
                      <p style={{ fontSize: '0.875rem', margin: 0 }}>{selectedCase.correctiveAction}</p>
                    </div>
                  )}
                  {selectedCase.preventiveAction && (
                    <div>
                      <div style={{ fontWeight: 500, fontSize: '0.8125rem', marginBottom: '0.25rem' }}>Preventive Action</div>
                      <p style={{ fontSize: '0.875rem', margin: 0 }}>{selectedCase.preventiveAction}</p>
                    </div>
                  )}
                </div>
              )}

              {selectedCase.timeline && selectedCase.timeline.length > 0 && (
                <div className="card" style={{ padding: '1rem', marginTop: '1rem' }}>
                  <h4 style={{ fontSize: '0.875rem', fontWeight: 600, marginBottom: '0.75rem', color: 'var(--text-muted)' }}>Timeline</h4>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                    {selectedCase.timeline.map((t) => (
                      <div key={t.id} style={{ display: 'flex', gap: '0.75rem', fontSize: '0.875rem' }}>
                        <div style={{ color: 'var(--text-muted)', minWidth: '120px' }}>
                          {format(new Date(t.createdAt), 'MMM dd, HH:mm')}
                        </div>
                        <div>
                          <div style={{ fontWeight: 500 }}>{t.action}</div>
                          {t.description && <div style={{ color: 'var(--text-muted)' }}>{t.description}</div>}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setShowDetailModal(false)}>
                Close
              </button>
              {selectedCase.status === 'OPEN' && (
                <button className="btn btn-primary" onClick={() => startPhase1Mutation.mutate(selectedCase.id)}>
                  <Play size={16} />
                  Start Phase 1
                </button>
              )}
              {selectedCase.status === 'PHASE_1_LAB_INVESTIGATION' && (
                <button className="btn btn-primary" onClick={() => completePhase1Mutation.mutate({ id: selectedCase.id, proceedToPhase2: true })}>
                  <ArrowRight size={16} />
                  Complete & Proceed to Phase 2
                </button>
              )}
              {selectedCase.status === 'PHASE_1_COMPLETE' && (
                <button className="btn btn-primary" onClick={() => startPhase2Mutation.mutate(selectedCase.id)}>
                  <Play size={16} />
                  Start Phase 2
                </button>
              )}
              {selectedCase.status === 'PHASE_2_FULL_INVESTIGATION' && (
                <button className="btn btn-primary" onClick={() => completePhase2Mutation.mutate(selectedCase.id)}>
                  <CheckCircle size={16} />
                  Complete Phase 2
                </button>
              )}
              {selectedCase.status === 'PHASE_2_COMPLETE' && (
                <button className="btn btn-primary" onClick={() => proposeCapaMutation.mutate(selectedCase.id)}>
                  <FileWarning size={16} />
                  Propose CAPA
                </button>
              )}
              {selectedCase.status === 'CAPA_PROPOSED' && (
                <button className="btn btn-primary" onClick={() => approveCapaMutation.mutate(selectedCase.id)}>
                  <CheckCircle size={16} />
                  Approve CAPA
                </button>
              )}
              {selectedCase.status === 'CAPA_APPROVED' && (
                <button className="btn btn-primary" onClick={() => startImplementationMutation.mutate(selectedCase.id)}>
                  <Play size={16} />
                  Start Implementation
                </button>
              )}
              {selectedCase.status === 'CAPA_IMPLEMENTING' && (
                <button className="btn btn-success" onClick={() => closeCaseMutation.mutate({ id: selectedCase.id, closureType: 'CONFIRMED' })}>
                  <CheckCircle size={16} />
                  Close Case
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
