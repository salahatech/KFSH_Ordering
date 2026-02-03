import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../lib/api';
import { useToast } from '../components/ui/Toast';
import { PageHeader } from '../components/shared';
import {
  FlaskConical,
  ArrowLeft,
  Check,
  X,
  AlertCircle,
  Clock,
  Play,
  Send,
  CheckCircle,
  XCircle,
  Paperclip,
} from 'lucide-react';

interface QcResult {
  id: string;
  testDefinitionId: string;
  testDefinition: {
    code: string;
    nameEn: string;
    resultType: string;
    category: string | null;
  };
  displayOrder: number;
  criteriaDisplayEn: string;
  resultType: string;
  unit: string | null;
  isRequired: boolean;
  specRuleType: string | null;
  specMinValue: number | null;
  specMaxValue: number | null;
  specTargetValue: number | null;
  numericValue: number | null;
  textValue: string | null;
  passFailValue: string | null;
  selectedOption: string | null;
  status: 'PENDING' | 'PASS' | 'FAIL';
  failReason: string | null;
  enteredByUser: { firstName: string; lastName: string } | null;
  enteredAt: string | null;
  attachments: any[];
}

interface BatchQcSession {
  id: string;
  batchId: string;
  status: 'NOT_STARTED' | 'IN_PROGRESS' | 'WAITING_REVIEW' | 'QC_PASSED' | 'QC_FAILED';
  analystUser: { firstName: string; lastName: string } | null;
  reviewedByUser: { firstName: string; lastName: string } | null;
  completedAt: string | null;
  reviewedAt: string | null;
  notes: string | null;
  results: QcResult[];
  summary: {
    totalTests: number;
    completedTests: number;
    passedTests: number;
    failedTests: number;
    progress: number;
  };
}

interface Batch {
  id: string;
  batchNumber: string;
  status: string;
  product: {
    name: string;
    code: string;
  };
}

const STATUS_CONFIG: Record<string, { color: string; icon: any; label: string }> = {
  NOT_STARTED: { color: 'gray', icon: Clock, label: 'Not Started' },
  IN_PROGRESS: { color: 'yellow', icon: Play, label: 'In Progress' },
  WAITING_REVIEW: { color: 'blue', icon: Send, label: 'Awaiting Review' },
  QC_PASSED: { color: 'green', icon: CheckCircle, label: 'QC Passed' },
  QC_FAILED: { color: 'red', icon: XCircle, label: 'QC Failed' },
};

export default function BatchQcSession() {
  const { batchId } = useParams<{ batchId: string }>();
  const navigate = useNavigate();
  const toast = useToast();
  const queryClient = useQueryClient();
  const [editingResult, setEditingResult] = useState<string | null>(null);
  const [reviewNotes, setReviewNotes] = useState('');
  const [showReviewModal, setShowReviewModal] = useState(false);

  const { data: batch } = useQuery<Batch>({
    queryKey: ['batch', batchId],
    queryFn: async () => {
      const { data } = await api.get(`/batches/${batchId}`);
      return data;
    },
    enabled: !!batchId,
  });

  const { data: session, isLoading, error } = useQuery<BatchQcSession>({
    queryKey: ['batch-qc-session', batchId],
    queryFn: async () => {
      const { data } = await api.get(`/batches/${batchId}/qc-session`);
      return data;
    },
    enabled: !!batchId,
    retry: false,
  });

  const generateSessionMutation = useMutation({
    mutationFn: async () => {
      const { data } = await api.post(`/batches/${batchId}/qc-session/generate`);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['batch-qc-session', batchId] });
      toast.success('Session Generated', 'QC session created from product template');
    },
    onError: (error: any) => {
      toast.error('Error', error.response?.data?.error || 'Failed to generate QC session');
    },
  });

  const updateResultMutation = useMutation({
    mutationFn: async ({
      resultId,
      data,
    }: {
      resultId: string;
      data: { numericValue?: number; textValue?: string; passFailValue?: string };
    }) => {
      const { data: result } = await api.put(`/batches/${batchId}/qc-session/results/${resultId}`, data);
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['batch-qc-session', batchId] });
      setEditingResult(null);
    },
    onError: (error: any) => {
      toast.error('Error', error.response?.data?.error || 'Failed to save result');
    },
  });

  const submitSessionMutation = useMutation({
    mutationFn: async () => {
      const { data } = await api.post(`/batches/${batchId}/qc-session/submit`);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['batch-qc-session', batchId] });
      toast.success('Submitted', 'QC session submitted for review');
    },
    onError: (error: any) => {
      toast.error('Error', error.response?.data?.error || 'Failed to submit session');
    },
  });

  const reviewSessionMutation = useMutation({
    mutationFn: async (decision: 'APPROVE' | 'REJECT') => {
      const { data } = await api.post(`/batches/${batchId}/qc-session/review`, {
        decision,
        notes: reviewNotes,
      });
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['batch-qc-session', batchId] });
      queryClient.invalidateQueries({ queryKey: ['batch', batchId] });
      setShowReviewModal(false);
      toast.success('Reviewed', 'QC session review completed');
    },
    onError: (error: any) => {
      toast.error('Error', error.response?.data?.error || 'Failed to complete review');
    },
  });

  const renderResultInput = (result: QcResult) => {
    const isEditing = editingResult === result.id;
    const isCompleted = ['QC_PASSED', 'QC_FAILED'].includes(session?.status || '');

    if (!isEditing || isCompleted) {
      return (
        <div
          onClick={() => !isCompleted && setEditingResult(result.id)}
          className={`cursor-pointer p-2 rounded hover:bg-hover min-w-[100px] ${
            !isCompleted ? 'border border-dashed border-default' : ''
          }`}
        >
          {result.resultType === 'PASS_FAIL' && result.passFailValue && (
            <span
              className={`px-2 py-1 text-xs rounded-full ${
                result.passFailValue === 'PASS'
                  ? 'bg-green-500/10 text-green-500'
                  : 'bg-red-500/10 text-red-500'
              }`}
            >
              {result.passFailValue}
            </span>
          )}
          {result.resultType === 'NUMERIC' && result.numericValue !== null && (
            <span>
              {result.numericValue}
              {result.unit && <span className="text-muted ml-1">{result.unit}</span>}
            </span>
          )}
          {result.resultType === 'TEXT' && result.textValue && (
            <span className="text-sm">{result.textValue}</span>
          )}
          {!result.numericValue && !result.passFailValue && !result.textValue && (
            <span className="text-muted text-sm">Click to enter</span>
          )}
        </div>
      );
    }

    if (result.resultType === 'PASS_FAIL') {
      return (
        <div className="flex gap-2">
          <button
            onClick={() =>
              updateResultMutation.mutate({
                resultId: result.id,
                data: { passFailValue: 'PASS' },
              })
            }
            className="btn btn-sm bg-green-500/10 text-green-500 hover:bg-green-500/20"
          >
            PASS
          </button>
          <button
            onClick={() =>
              updateResultMutation.mutate({
                resultId: result.id,
                data: { passFailValue: 'FAIL' },
              })
            }
            className="btn btn-sm bg-red-500/10 text-red-500 hover:bg-red-500/20"
          >
            FAIL
          </button>
          <button onClick={() => setEditingResult(null)} className="btn btn-sm btn-secondary">
            Cancel
          </button>
        </div>
      );
    }

    if (result.resultType === 'NUMERIC') {
      return (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            const form = e.target as HTMLFormElement;
            const input = form.elements.namedItem('value') as HTMLInputElement;
            updateResultMutation.mutate({
              resultId: result.id,
              data: { numericValue: parseFloat(input.value) },
            });
          }}
          className="flex gap-2"
        >
          <input
            name="value"
            type="number"
            step="any"
            defaultValue={result.numericValue || ''}
            className="input w-24"
            autoFocus
          />
          {result.unit && <span className="self-center text-muted">{result.unit}</span>}
          <button type="submit" className="btn btn-sm btn-primary">
            Save
          </button>
          <button type="button" onClick={() => setEditingResult(null)} className="btn btn-sm btn-secondary">
            Cancel
          </button>
        </form>
      );
    }

    if (result.resultType === 'TEXT') {
      return (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            const form = e.target as HTMLFormElement;
            const input = form.elements.namedItem('value') as HTMLInputElement;
            updateResultMutation.mutate({
              resultId: result.id,
              data: { textValue: input.value },
            });
          }}
          className="flex gap-2"
        >
          <input
            name="value"
            type="text"
            defaultValue={result.textValue || ''}
            className="input w-48"
            autoFocus
          />
          <button type="submit" className="btn btn-sm btn-primary">
            Save
          </button>
          <button type="button" onClick={() => setEditingResult(null)} className="btn btn-sm btn-secondary">
            Cancel
          </button>
        </form>
      );
    }

    return null;
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'PASS':
        return <Check size={16} className="text-green-500" />;
      case 'FAIL':
        return <X size={16} className="text-red-500" />;
      default:
        return <Clock size={16} className="text-muted" />;
    }
  };

  const statusConfig = session ? STATUS_CONFIG[session.status] : null;
  const StatusIcon = statusConfig?.icon;

  const noSession = !session && !isLoading && error;
  const canSubmit = session?.status === 'IN_PROGRESS' && session.summary.completedTests === session.summary.totalTests;
  const canReview = session?.status === 'WAITING_REVIEW';
  const isCompleted = ['QC_PASSED', 'QC_FAILED'].includes(session?.status || '');

  return (
    <div className="p-6">
      <div className="flex items-center gap-4 mb-6">
        <button onClick={() => navigate(`/batches/${batchId}`)} className="p-2 hover:bg-hover rounded-lg">
          <ArrowLeft size={20} />
        </button>
        <PageHeader
          title={`QC Testing: ${batch?.batchNumber || 'Loading...'}`}
          subtitle={batch?.product?.name || ''}
          icon={<FlaskConical size={24} />}
        />
      </div>

      {noSession ? (
        <div className="card text-center py-12">
          <FlaskConical size={48} className="mx-auto mb-4 text-muted" />
          <h3 className="text-lg font-semibold mb-2">No QC Session</h3>
          <p className="text-muted mb-6">
            Generate a QC session from the product's active template to start testing.
          </p>
          <button
            onClick={() => generateSessionMutation.mutate()}
            className="btn btn-primary"
            disabled={generateSessionMutation.isPending}
          >
            {generateSessionMutation.isPending ? 'Generating...' : 'Generate QC Session'}
          </button>
        </div>
      ) : isLoading ? (
        <div className="card text-center py-12 text-muted">Loading QC session...</div>
      ) : session ? (
        <>
          <div className="grid grid-cols-4 gap-4 mb-6">
            <div className="card">
              <div className="text-sm text-muted mb-1">Status</div>
              <div className="flex items-center gap-2">
                {StatusIcon && <StatusIcon size={20} className={`text-${statusConfig?.color}-500`} />}
                <span
                  className={`px-2 py-1 text-sm rounded-full bg-${statusConfig?.color}-500/10 text-${statusConfig?.color}-500`}
                >
                  {statusConfig?.label}
                </span>
              </div>
            </div>
            <div className="card">
              <div className="text-sm text-muted mb-1">Progress</div>
              <div className="flex items-center gap-3">
                <div className="flex-1 bg-hover rounded-full h-2">
                  <div
                    className="bg-primary rounded-full h-2 transition-all"
                    style={{ width: `${session.summary.progress}%` }}
                  />
                </div>
                <span className="text-sm font-medium">{session.summary.progress}%</span>
              </div>
            </div>
            <div className="card">
              <div className="text-sm text-muted mb-1">Tests</div>
              <div className="flex items-center gap-4">
                <span className="flex items-center gap-1">
                  <Check size={14} className="text-green-500" />
                  <span className="text-green-500 font-medium">{session.summary.passedTests}</span>
                </span>
                <span className="flex items-center gap-1">
                  <X size={14} className="text-red-500" />
                  <span className="text-red-500 font-medium">{session.summary.failedTests}</span>
                </span>
                <span className="flex items-center gap-1">
                  <Clock size={14} className="text-muted" />
                  <span className="text-muted font-medium">
                    {session.summary.totalTests - session.summary.completedTests}
                  </span>
                </span>
              </div>
            </div>
            <div className="card">
              <div className="text-sm text-muted mb-1">Actions</div>
              <div className="flex gap-2">
                {canSubmit && (
                  <button
                    onClick={() => submitSessionMutation.mutate()}
                    className="btn btn-primary btn-sm flex items-center gap-1"
                    disabled={submitSessionMutation.isPending}
                  >
                    <Send size={14} />
                    Submit for Review
                  </button>
                )}
                {canReview && (
                  <button
                    onClick={() => setShowReviewModal(true)}
                    className="btn btn-primary btn-sm flex items-center gap-1"
                  >
                    <CheckCircle size={14} />
                    Review
                  </button>
                )}
                {isCompleted && session.reviewedByUser && (
                  <span className="text-sm text-muted">
                    Reviewed by {session.reviewedByUser.firstName} {session.reviewedByUser.lastName}
                  </span>
                )}
              </div>
            </div>
          </div>

          <div className="card">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-hover">
                  <tr>
                    <th className="text-left py-3 px-4 text-sm font-medium text-muted w-12">#</th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-muted">Test</th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-muted">Criteria</th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-muted">Result</th>
                    <th className="text-center py-3 px-4 text-sm font-medium text-muted">Status</th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-muted">Notes</th>
                  </tr>
                </thead>
                <tbody>
                  {session.results.map((result, idx) => (
                    <tr
                      key={result.id}
                      className={`border-t border-default ${
                        result.status === 'FAIL' ? 'bg-red-500/5' : ''
                      }`}
                    >
                      <td className="py-3 px-4 text-muted">{idx + 1}</td>
                      <td className="py-3 px-4">
                        <div className="font-medium">{result.testDefinition?.nameEn}</div>
                        <div className="text-xs text-muted">
                          {result.testDefinition?.code}
                          {result.isRequired && (
                            <span className="ml-2 text-red-500">*Required</span>
                          )}
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <span className="text-sm bg-hover px-2 py-1 rounded">
                          {result.criteriaDisplayEn || '-'}
                        </span>
                      </td>
                      <td className="py-3 px-4">{renderResultInput(result)}</td>
                      <td className="py-3 px-4 text-center">
                        <div className="flex flex-col items-center gap-1">
                          {getStatusIcon(result.status)}
                          <span
                            className={`text-xs ${
                              result.status === 'PASS'
                                ? 'text-green-500'
                                : result.status === 'FAIL'
                                ? 'text-red-500'
                                : 'text-muted'
                            }`}
                          >
                            {result.status}
                          </span>
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        {result.failReason && (
                          <div className="flex items-start gap-1 text-red-500 text-sm">
                            <AlertCircle size={14} className="mt-0.5 flex-shrink-0" />
                            <span>{result.failReason}</span>
                          </div>
                        )}
                        {result.enteredByUser && (
                          <div className="text-xs text-muted mt-1">
                            By {result.enteredByUser.firstName} {result.enteredByUser.lastName}
                          </div>
                        )}
                        {result.attachments.length > 0 && (
                          <div className="flex items-center gap-1 text-xs text-primary mt-1">
                            <Paperclip size={12} />
                            {result.attachments.length} file(s)
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      ) : null}

      {showReviewModal && (
        <div className="modal-overlay" onClick={() => setShowReviewModal(false)}>
          <div className="modal-content max-w-lg" onClick={(e) => e.stopPropagation()}>
            <h2 className="text-xl font-semibold mb-4">Review QC Session</h2>
            <div className="mb-4">
              <div className="flex justify-between text-sm mb-2">
                <span>Passed Tests:</span>
                <span className="text-green-500 font-medium">{session?.summary.passedTests}</span>
              </div>
              <div className="flex justify-between text-sm mb-2">
                <span>Failed Tests:</span>
                <span className="text-red-500 font-medium">{session?.summary.failedTests}</span>
              </div>
            </div>
            <div className="mb-4">
              <label className="label">Review Notes</label>
              <textarea
                value={reviewNotes}
                onChange={(e) => setReviewNotes(e.target.value)}
                className="input w-full"
                rows={3}
                placeholder="Add any notes about this review..."
              />
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => reviewSessionMutation.mutate('REJECT')}
                className="btn flex-1 bg-red-500/10 text-red-500 hover:bg-red-500/20"
                disabled={reviewSessionMutation.isPending}
              >
                <X size={16} className="mr-1" />
                Reject
              </button>
              <button
                onClick={() => reviewSessionMutation.mutate('APPROVE')}
                className="btn btn-primary flex-1"
                disabled={reviewSessionMutation.isPending || (session?.summary.failedTests || 0) > 0}
              >
                <Check size={16} className="mr-1" />
                Approve
              </button>
            </div>
            {(session?.summary.failedTests || 0) > 0 && (
              <p className="text-red-500 text-sm mt-3 text-center">
                Cannot approve: {session?.summary.failedTests} test(s) failed
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
