import { useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import api from '../lib/api';
import { PenTool, Lock, AlertCircle, CheckCircle, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';

interface ESignatureModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (signature: any) => void;
  scope: 'BATCH_RELEASE' | 'QC_APPROVAL' | 'DEVIATION_APPROVAL' | 'MASTERDATA_CHANGE' | 'RECIPE_ACTIVATION' | 'PO_APPROVAL' | 'FINANCIAL_APPROVAL' | 'DISPENSING_APPROVAL';
  entityType: string;
  entityId: string;
  title?: string;
  description?: string;
  metadata?: Record<string, any>;
}

export default function ESignatureModal({
  isOpen,
  onClose,
  onSuccess,
  scope,
  entityType,
  entityId,
  title = 'Electronic Signature Required',
  description,
  metadata,
}: ESignatureModalProps) {
  const [password, setPassword] = useState('');
  const [selectedMeaning, setSelectedMeaning] = useState('');
  const [comment, setComment] = useState('');
  const [error, setError] = useState('');

  const { data: meanings } = useQuery({
    queryKey: ['esignature-meanings', scope],
    queryFn: async () => {
      const { data } = await api.get(`/esignatures/meanings/${scope}`);
      return data as string[];
    },
    enabled: isOpen,
  });

  const signMutation = useMutation({
    mutationFn: async () => {
      const { data } = await api.post('/esignatures/sign', {
        password,
        scope,
        entityType,
        entityId,
        meaning: selectedMeaning,
        comment: comment || undefined,
        metadata,
      });
      return data;
    },
    onSuccess: (data) => {
      toast.success('Signed successfully');
      setPassword('');
      setSelectedMeaning('');
      setComment('');
      setError('');
      onSuccess(data.signature);
      onClose();
    },
    onError: (err: any) => {
      setError(err.response?.data?.error || 'Signature failed');
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!password) {
      setError('Password is required for authentication');
      return;
    }

    if (!selectedMeaning) {
      setError('Please select the meaning of your signature');
      return;
    }

    signMutation.mutate();
  };

  const handleClose = () => {
    setPassword('');
    setSelectedMeaning('');
    setComment('');
    setError('');
    onClose();
  };

  if (!isOpen) return null;

  const scopeLabels: Record<string, string> = {
    BATCH_RELEASE: 'Batch Release',
    QC_APPROVAL: 'QC Approval',
    DEVIATION_APPROVAL: 'Deviation Approval',
    MASTERDATA_CHANGE: 'Master Data Change',
    RECIPE_ACTIVATION: 'Recipe Activation',
    PO_APPROVAL: 'Purchase Order Approval',
    FINANCIAL_APPROVAL: 'Financial Approval',
    DISPENSING_APPROVAL: 'Dispensing Approval',
  };

  return (
    <div className="modal-overlay" onClick={handleClose}>
      <div 
        className="modal" 
        style={{ maxWidth: '480px' }} 
        onClick={(e) => e.stopPropagation()}
      >
        <div className="modal-header" style={{ borderBottom: '1px solid var(--border)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <div style={{
              width: '40px',
              height: '40px',
              borderRadius: '10px',
              background: 'linear-gradient(135deg, var(--primary) 0%, #1e40af 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}>
              <PenTool size={20} style={{ color: 'white' }} />
            </div>
            <div>
              <h3 style={{ fontWeight: 600, margin: 0 }}>{title}</h3>
              <span className="badge badge-primary" style={{ fontSize: '0.6875rem', marginTop: '0.25rem' }}>
                {scopeLabels[scope] || scope}
              </span>
            </div>
          </div>
          <button 
            onClick={handleClose} 
            style={{ 
              background: 'var(--bg-secondary)', 
              border: 'none', 
              borderRadius: 'var(--radius)', 
              padding: '0.375rem', 
              cursor: 'pointer', 
              fontSize: '1.25rem', 
              lineHeight: 1 
            }}
          >
            &times;
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="modal-body">
            {description && (
              <div style={{ 
                padding: '0.875rem', 
                background: 'var(--bg-secondary)', 
                borderRadius: 'var(--radius)',
                marginBottom: '1.25rem',
                fontSize: '0.875rem',
                color: 'var(--text-muted)',
              }}>
                {description}
              </div>
            )}

            <div style={{
              padding: '0.75rem',
              background: 'rgba(59, 130, 246, 0.1)',
              borderRadius: 'var(--radius)',
              marginBottom: '1.25rem',
              display: 'flex',
              alignItems: 'flex-start',
              gap: '0.75rem',
            }}>
              <Lock size={18} style={{ color: 'var(--primary)', flexShrink: 0, marginTop: '2px' }} />
              <div style={{ fontSize: '0.8125rem' }}>
                <strong>GMP Compliance Notice</strong>
                <p style={{ margin: '0.25rem 0 0', color: 'var(--text-muted)' }}>
                  This action requires your electronic signature. Your password will be verified 
                  and the signature will be permanently recorded with timestamp.
                </p>
              </div>
            </div>

            {error && (
              <div style={{
                padding: '0.75rem',
                background: 'rgba(239, 68, 68, 0.1)',
                borderRadius: 'var(--radius)',
                marginBottom: '1rem',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                color: 'var(--danger)',
                fontSize: '0.875rem',
              }}>
                <AlertCircle size={16} />
                {error}
              </div>
            )}

            <div className="form-group">
              <label className="form-label">Meaning of Signature *</label>
              <select
                className="form-select"
                value={selectedMeaning}
                onChange={(e) => setSelectedMeaning(e.target.value)}
                required
              >
                <option value="">Select the meaning of your signature</option>
                {meanings?.map((meaning, idx) => (
                  <option key={idx} value={meaning}>{meaning}</option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">Comment / Reason (Optional)</label>
              <textarea
                className="form-textarea"
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                placeholder="Add any additional comments or reasons..."
                rows={2}
                style={{ resize: 'none' }}
              />
            </div>

            <div className="form-group">
              <label className="form-label">
                <Lock size={14} style={{ marginRight: '0.375rem' }} />
                Enter Your Password to Sign *
              </label>
              <input
                type="password"
                className="form-input"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter your password"
                required
                autoComplete="current-password"
              />
            </div>

            <div style={{
              padding: '0.625rem',
              background: 'var(--bg-secondary)',
              borderRadius: 'var(--radius)',
              fontSize: '0.75rem',
              color: 'var(--text-muted)',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
            }}>
              <CheckCircle size={14} style={{ color: 'var(--success)' }} />
              Signature will be timestamped: {new Date().toLocaleString()}
            </div>
          </div>

          <div className="modal-footer" style={{ 
            display: 'flex', 
            gap: '0.75rem', 
            justifyContent: 'flex-end',
            borderTop: '1px solid var(--border)',
            padding: '1rem 1.5rem',
          }}>
            <button 
              type="button" 
              className="btn btn-secondary" 
              onClick={handleClose}
              disabled={signMutation.isPending}
            >
              Cancel
            </button>
            <button 
              type="submit" 
              className="btn btn-primary"
              disabled={signMutation.isPending || !password || !selectedMeaning}
              style={{ minWidth: '140px' }}
            >
              {signMutation.isPending ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  Signing...
                </>
              ) : (
                <>
                  <PenTool size={16} />
                  Sign & Confirm
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
