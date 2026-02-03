import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import api from '../../lib/api';
import { useToast } from '../../components/ui/Toast';
import { PageHeader } from '../../components/shared';
import { 
  ArrowLeft, ArrowRight, Check, Key, FileText, Shield, 
  Play, CheckCircle, XCircle, AlertTriangle, Plus, Trash2 
} from 'lucide-react';

interface Credential {
  id: string;
  deviceName: string;
  environment: string;
  status: string;
  csrPem: string | null;
  compliancePassed: boolean;
}

const STEPS = [
  { id: 1, title: 'Create Device', icon: Plus },
  { id: 2, title: 'Generate CSR', icon: Key },
  { id: 3, title: 'Request CCSID', icon: FileText },
  { id: 4, title: 'Compliance Check', icon: Shield },
  { id: 5, title: 'Request PCSID', icon: CheckCircle },
];

export default function ZatcaOnboarding() {
  const navigate = useNavigate();
  const toast = useToast();
  const queryClient = useQueryClient();
  const [selectedCredential, setSelectedCredential] = useState<string | null>(null);
  const [otp, setOtp] = useState('');
  const [newDeviceName, setNewDeviceName] = useState('');

  const { data: credentials = [], isLoading } = useQuery<Credential[]>({
    queryKey: ['zatca-credentials'],
    queryFn: async () => {
      const { data } = await api.get('/zatca/credentials');
      return data;
    },
  });

  const { data: config } = useQuery({
    queryKey: ['zatca-config'],
    queryFn: async () => {
      const { data } = await api.get('/zatca/config');
      return data;
    },
  });

  const createMutation = useMutation({
    mutationFn: async (deviceName: string) => {
      const { data } = await api.post('/zatca/credentials', { 
        deviceName, 
        environment: config?.environment || 'SIMULATION' 
      });
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['zatca-credentials'] });
      setSelectedCredential(data.id);
      setNewDeviceName('');
      toast.success('Device Created', 'New device credential created');
    },
    onError: (error: any) => {
      toast.error('Error', error.response?.data?.error || 'Failed to create device');
    },
  });

  const generateCsrMutation = useMutation({
    mutationFn: async (id: string) => {
      const { data } = await api.post(`/zatca/credentials/${id}/generate-csr`, {});
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['zatca-credentials'] });
      toast.success('CSR Generated', 'Certificate Signing Request has been generated');
    },
    onError: (error: any) => {
      toast.error('Error', error.response?.data?.error || 'Failed to generate CSR');
    },
  });

  const requestCcsidMutation = useMutation({
    mutationFn: async ({ id, otp }: { id: string; otp: string }) => {
      const { data } = await api.post(`/zatca/credentials/${id}/request-ccsid`, { otp });
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['zatca-credentials'] });
      setOtp('');
      toast.success('CCSID Obtained', 'Compliance CSID has been issued');
    },
    onError: (error: any) => {
      toast.error('Error', error.response?.data?.error || 'Failed to obtain CCSID');
    },
  });

  const runComplianceMutation = useMutation({
    mutationFn: async (id: string) => {
      const { data } = await api.post(`/zatca/credentials/${id}/run-compliance`);
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['zatca-credentials'] });
      if (data.result?.passed) {
        toast.success('Compliance Passed', 'All compliance checks passed');
      } else {
        toast.error('Compliance Failed', 'Some checks failed. Review errors.');
      }
    },
    onError: (error: any) => {
      toast.error('Error', error.response?.data?.error || 'Failed to run compliance');
    },
  });

  const requestPcsidMutation = useMutation({
    mutationFn: async (id: string) => {
      const { data } = await api.post(`/zatca/credentials/${id}/request-pcsid`);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['zatca-credentials'] });
      queryClient.invalidateQueries({ queryKey: ['zatca-status'] });
      toast.success('PCSID Obtained', 'Production CSID issued. Integration is now ACTIVE!');
    },
    onError: (error: any) => {
      toast.error('Error', error.response?.data?.error || 'Failed to obtain PCSID');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/zatca/credentials/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['zatca-credentials'] });
      setSelectedCredential(null);
      toast.success('Deleted', 'Credential has been removed');
    },
    onError: (error: any) => {
      toast.error('Error', error.response?.data?.error || 'Failed to delete');
    },
  });

  const selected = credentials.find(c => c.id === selectedCredential);

  const getCurrentStep = (cred: Credential): number => {
    if (cred.status === 'ACTIVE') return 6;
    if (cred.compliancePassed) return 5;
    if (cred.status === 'COMPLIANCE_READY') return 4;
    if (cred.csrPem) return 3;
    return 2;
  };

  const getStepStatus = (stepId: number, currentStep: number): 'completed' | 'current' | 'pending' => {
    if (stepId < currentStep) return 'completed';
    if (stepId === currentStep) return 'current';
    return 'pending';
  };

  return (
    <div>
      <PageHeader
        title="ZATCA Onboarding"
        subtitle="Complete the onboarding process to activate ZATCA e-invoice integration"
        actions={
          <button className="btn btn-secondary" onClick={() => navigate('/admin/zatca')}>
            <ArrowLeft size={16} />
            Back to Overview
          </button>
        }
      />

      <div className="grid grid-3" style={{ gap: '1.5rem' }}>
        <div className="card" style={{ gridColumn: 'span 1' }}>
          <div style={{ padding: '1rem 1.25rem', borderBottom: '1px solid var(--border)' }}>
            <h3 style={{ margin: 0, fontWeight: 600 }}>Devices / Solution Units</h3>
          </div>
          <div style={{ padding: '1rem' }}>
            <div style={{ marginBottom: '1rem' }}>
              <input
                type="text"
                className="form-input"
                placeholder="New device name..."
                value={newDeviceName}
                onChange={(e) => setNewDeviceName(e.target.value)}
                style={{ marginBottom: '0.5rem' }}
              />
              <button
                className="btn btn-primary"
                style={{ width: '100%' }}
                onClick={() => createMutation.mutate(newDeviceName)}
                disabled={!newDeviceName || createMutation.isPending}
              >
                <Plus size={16} />
                Create Device
              </button>
            </div>

            {isLoading ? (
              <div style={{ textAlign: 'center', padding: '1rem', color: 'var(--text-muted)' }}>
                Loading...
              </div>
            ) : credentials.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '1rem', color: 'var(--text-muted)' }}>
                No devices created yet
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                {credentials.map((cred) => (
                  <div
                    key={cred.id}
                    onClick={() => setSelectedCredential(cred.id)}
                    style={{
                      padding: '0.75rem',
                      borderRadius: '8px',
                      border: `2px solid ${selectedCredential === cred.id ? 'var(--primary)' : 'var(--border)'}`,
                      cursor: 'pointer',
                      background: selectedCredential === cred.id ? 'var(--primary-light)' : 'transparent',
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontWeight: 500 }}>{cred.deviceName}</span>
                      <span className={`badge badge-${cred.status === 'ACTIVE' ? 'success' : cred.status === 'COMPLIANCE_READY' ? 'warning' : 'default'}`}>
                        {cred.status}
                      </span>
                    </div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                      {cred.environment}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="card" style={{ gridColumn: 'span 2' }}>
          <div style={{ padding: '1rem 1.25rem', borderBottom: '1px solid var(--border)' }}>
            <h3 style={{ margin: 0, fontWeight: 600 }}>Onboarding Steps</h3>
          </div>
          {!selected ? (
            <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>
              <Shield size={48} style={{ marginBottom: '1rem' }} />
              <p>Select a device from the left panel or create a new one to begin onboarding</p>
            </div>
          ) : (
            <div style={{ padding: '1.5rem' }}>
              <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '2rem' }}>
                {STEPS.map((step, idx) => {
                  const currentStep = getCurrentStep(selected);
                  const status = getStepStatus(step.id, currentStep);
                  const Icon = step.icon;
                  return (
                    <div key={step.id} style={{ flex: 1, textAlign: 'center' }}>
                      <div style={{
                        width: '40px',
                        height: '40px',
                        borderRadius: '50%',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        margin: '0 auto 0.5rem',
                        background: status === 'completed' ? 'var(--success)' : status === 'current' ? 'var(--primary)' : 'var(--bg-tertiary)',
                        color: status === 'pending' ? 'var(--text-muted)' : '#fff',
                      }}>
                        {status === 'completed' ? <Check size={20} /> : <Icon size={20} />}
                      </div>
                      <div style={{ fontSize: '0.75rem', fontWeight: status === 'current' ? 600 : 400 }}>
                        {step.title}
                      </div>
                      {idx < STEPS.length - 1 && (
                        <div style={{
                          position: 'absolute',
                          top: '20px',
                          left: '50%',
                          width: '100%',
                          height: '2px',
                          background: status === 'completed' ? 'var(--success)' : 'var(--border)',
                        }} />
                      )}
                    </div>
                  );
                })}
              </div>

              {selected.status === 'ACTIVE' ? (
                <div style={{ textAlign: 'center', padding: '2rem' }}>
                  <CheckCircle size={64} style={{ color: 'var(--success)', marginBottom: '1rem' }} />
                  <h3>Onboarding Complete!</h3>
                  <p style={{ color: 'var(--text-muted)' }}>
                    This device is now active and ready to submit invoices to ZATCA.
                  </p>
                </div>
              ) : (
                <div className="card" style={{ background: 'var(--bg-secondary)' }}>
                  <div style={{ padding: '1.25rem' }}>
                    {getCurrentStep(selected) === 2 && (
                      <div>
                        <h4 style={{ marginBottom: '0.5rem' }}>Step 2: Generate CSR</h4>
                        <p style={{ color: 'var(--text-muted)', marginBottom: '1rem' }}>
                          Generate a Certificate Signing Request (CSR) with your organization details.
                        </p>
                        <button
                          className="btn btn-primary"
                          onClick={() => generateCsrMutation.mutate(selected.id)}
                          disabled={generateCsrMutation.isPending}
                        >
                          <Key size={16} />
                          Generate CSR
                        </button>
                      </div>
                    )}

                    {getCurrentStep(selected) === 3 && (
                      <div>
                        <h4 style={{ marginBottom: '0.5rem' }}>Step 3: Request CCSID</h4>
                        <p style={{ color: 'var(--text-muted)', marginBottom: '1rem' }}>
                          Enter the OTP from the Fatoora portal to obtain a Compliance CSID.
                        </p>
                        <div style={{ display: 'flex', gap: '0.5rem' }}>
                          <input
                            type="text"
                            className="form-input"
                            placeholder="Enter OTP from Fatoora portal"
                            value={otp}
                            onChange={(e) => setOtp(e.target.value)}
                            style={{ flex: 1 }}
                          />
                          <button
                            className="btn btn-primary"
                            onClick={() => requestCcsidMutation.mutate({ id: selected.id, otp })}
                            disabled={!otp || requestCcsidMutation.isPending}
                          >
                            <FileText size={16} />
                            Request CCSID
                          </button>
                        </div>
                      </div>
                    )}

                    {getCurrentStep(selected) === 4 && (
                      <div>
                        <h4 style={{ marginBottom: '0.5rem' }}>Step 4: Run Compliance Checks</h4>
                        <p style={{ color: 'var(--text-muted)', marginBottom: '1rem' }}>
                          Submit sample invoices to verify compliance with ZATCA requirements.
                        </p>
                        <button
                          className="btn btn-primary"
                          onClick={() => runComplianceMutation.mutate(selected.id)}
                          disabled={runComplianceMutation.isPending}
                        >
                          <Shield size={16} />
                          Run Compliance Checks
                        </button>
                      </div>
                    )}

                    {getCurrentStep(selected) === 5 && (
                      <div>
                        <h4 style={{ marginBottom: '0.5rem' }}>Step 5: Request PCSID</h4>
                        <p style={{ color: 'var(--text-muted)', marginBottom: '1rem' }}>
                          Compliance passed! Request a Production CSID to activate the integration.
                        </p>
                        <button
                          className="btn btn-primary"
                          onClick={() => requestPcsidMutation.mutate(selected.id)}
                          disabled={requestPcsidMutation.isPending}
                        >
                          <CheckCircle size={16} />
                          Request PCSID & Activate
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {selected.status !== 'ACTIVE' && (
                <div style={{ marginTop: '1.5rem', textAlign: 'right' }}>
                  <button
                    className="btn btn-danger"
                    onClick={() => {
                      if (confirm('Delete this device credential?')) {
                        deleteMutation.mutate(selected.id);
                      }
                    }}
                  >
                    <Trash2 size={16} />
                    Delete Device
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
