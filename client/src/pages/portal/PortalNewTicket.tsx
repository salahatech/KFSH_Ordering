import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../../lib/api';
import { Ticket, ArrowLeft, Send, AlertCircle } from 'lucide-react';

const CATEGORIES = [
  { value: 'ACCOUNT', label: 'Account Issue', description: 'Login, profile, or account settings' },
  { value: 'ORDER', label: 'Order Issue', description: 'Problems with your orders' },
  { value: 'DELIVERY', label: 'Delivery Issue', description: 'Shipping or delivery problems' },
  { value: 'INVOICE', label: 'Invoice Issue', description: 'Billing or invoice questions' },
  { value: 'PAYMENT', label: 'Payment Issue', description: 'Payment or refund requests' },
  { value: 'QC', label: 'Quality Issue', description: 'Product quality concerns' },
  { value: 'SYSTEM', label: 'System Issue', description: 'Technical problems or bugs' },
  { value: 'OTHER', label: 'Other', description: 'Other inquiries' },
];

const PRIORITIES = [
  { value: 'LOW', label: 'Low', description: 'General inquiry, no urgency' },
  { value: 'MEDIUM', label: 'Medium', description: 'Important but not urgent' },
  { value: 'HIGH', label: 'High', description: 'Urgent, needs quick response' },
  { value: 'CRITICAL', label: 'Critical', description: 'Emergency, requires immediate attention' },
];

export default function PortalNewTicket() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  
  const [formData, setFormData] = useState({
    subject: '',
    description: '',
    category: '',
    priority: 'MEDIUM',
    relatedEntityType: '',
    relatedEntityId: '',
  });
  const [error, setError] = useState('');

  const createMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      const { data: result } = await api.post('/helpdesk/tickets', data);
      return result;
    },
    onSuccess: (ticket) => {
      queryClient.invalidateQueries({ queryKey: ['portal-tickets'] });
      navigate(`/portal/helpdesk/${ticket.id}`);
    },
    onError: (err: any) => {
      setError(err.response?.data?.error || 'Failed to create ticket');
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    
    if (!formData.subject.trim()) {
      setError('Please enter a subject');
      return;
    }
    if (!formData.description.trim()) {
      setError('Please describe your issue');
      return;
    }
    if (!formData.category) {
      setError('Please select a category');
      return;
    }
    
    createMutation.mutate(formData);
  };

  return (
    <div style={{ padding: '1.5rem', maxWidth: '800px', margin: '0 auto' }}>
      <Link to="/portal/helpdesk" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-muted)', marginBottom: '1rem', textDecoration: 'none' }}>
        <ArrowLeft size={18} />
        Back to My Tickets
      </Link>

      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.5rem' }}>
        <Ticket size={28} style={{ color: 'var(--primary)' }} />
        <h1 style={{ margin: 0 }}>Create Support Ticket</h1>
      </div>

      <form onSubmit={handleSubmit}>
        <div className="card" style={{ padding: '1.5rem' }}>
          {error && (
            <div className="alert alert-danger" style={{ marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <AlertCircle size={18} />
              {error}
            </div>
          )}

          <div className="form-group" style={{ marginBottom: '1.5rem' }}>
            <label className="form-label">Subject *</label>
            <input
              type="text"
              className="form-input"
              placeholder="Brief summary of your issue"
              value={formData.subject}
              onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
              maxLength={200}
            />
          </div>

          <div className="form-group" style={{ marginBottom: '1.5rem' }}>
            <label className="form-label">Category *</label>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: '0.75rem' }}>
              {CATEGORIES.map((cat) => (
                <label
                  key={cat.value}
                  style={{
                    padding: '1rem',
                    border: `2px solid ${formData.category === cat.value ? 'var(--primary)' : 'var(--border)'}`,
                    borderRadius: '8px',
                    cursor: 'pointer',
                    background: formData.category === cat.value ? 'var(--primary-bg)' : 'transparent',
                    transition: 'all 0.2s',
                  }}
                >
                  <input
                    type="radio"
                    name="category"
                    value={cat.value}
                    checked={formData.category === cat.value}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    style={{ display: 'none' }}
                  />
                  <div style={{ fontWeight: 500 }}>{cat.label}</div>
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>{cat.description}</div>
                </label>
              ))}
            </div>
          </div>

          <div className="form-group" style={{ marginBottom: '1.5rem' }}>
            <label className="form-label">Priority</label>
            <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
              {PRIORITIES.map((pri) => (
                <label
                  key={pri.value}
                  style={{
                    padding: '0.75rem 1rem',
                    border: `2px solid ${formData.priority === pri.value ? 'var(--primary)' : 'var(--border)'}`,
                    borderRadius: '8px',
                    cursor: 'pointer',
                    background: formData.priority === pri.value ? 'var(--primary-bg)' : 'transparent',
                    transition: 'all 0.2s',
                    flex: '1',
                    minWidth: '140px',
                  }}
                >
                  <input
                    type="radio"
                    name="priority"
                    value={pri.value}
                    checked={formData.priority === pri.value}
                    onChange={(e) => setFormData({ ...formData, priority: e.target.value })}
                    style={{ display: 'none' }}
                  />
                  <div style={{ fontWeight: 500 }}>{pri.label}</div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>{pri.description}</div>
                </label>
              ))}
            </div>
          </div>

          <div className="form-group" style={{ marginBottom: '1.5rem' }}>
            <label className="form-label">Description *</label>
            <textarea
              className="form-input"
              rows={6}
              placeholder="Please describe your issue in detail. Include any relevant information such as order numbers, error messages, or steps to reproduce the problem."
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              style={{ resize: 'vertical', minHeight: '120px' }}
            />
          </div>

          <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end' }}>
            <Link to="/portal/helpdesk" className="btn">
              Cancel
            </Link>
            <button 
              type="submit" 
              className="btn btn-primary"
              disabled={createMutation.isPending}
              style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}
            >
              <Send size={18} />
              {createMutation.isPending ? 'Submitting...' : 'Submit Ticket'}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}
