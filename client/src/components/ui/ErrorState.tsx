import { AlertTriangle, RefreshCw, Home } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface ErrorStatePageProps {
  title?: string;
  message?: string;
  onRetry?: () => void;
  showHomeButton?: boolean;
}

export function ErrorStatePage({ 
  title = 'Something went wrong', 
  message = 'We encountered an unexpected error. Please try again.',
  onRetry,
  showHomeButton = true,
}: ErrorStatePageProps) {
  const navigate = useNavigate();

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: '400px',
      padding: '2rem',
      textAlign: 'center',
    }}>
      <div style={{
        width: '80px',
        height: '80px',
        borderRadius: '50%',
        backgroundColor: 'rgba(239, 68, 68, 0.1)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: '1.5rem',
      }}>
        <AlertTriangle size={40} style={{ color: 'var(--danger)' }} />
      </div>
      <h2 style={{ fontSize: '1.5rem', fontWeight: 600, marginBottom: '0.5rem', color: 'var(--text)' }}>
        {title}
      </h2>
      <p style={{ color: 'var(--text-muted)', marginBottom: '1.5rem', maxWidth: '400px' }}>
        {message}
      </p>
      <div style={{ display: 'flex', gap: '0.75rem' }}>
        {onRetry && (
          <button className="btn btn-primary" onClick={onRetry}>
            <RefreshCw size={18} /> Try Again
          </button>
        )}
        {showHomeButton && (
          <button className="btn btn-secondary" onClick={() => navigate('/')}>
            <Home size={18} /> Go Home
          </button>
        )}
      </div>
    </div>
  );
}

interface EmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  message?: string;
  action?: {
    label: string;
    onClick: () => void;
  };
}

export function EmptyState({ icon, title, message, action }: EmptyStateProps) {
  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '3rem 2rem',
      textAlign: 'center',
    }}>
      {icon && (
        <div style={{ marginBottom: '1rem', opacity: 0.3 }}>
          {icon}
        </div>
      )}
      <h3 style={{ fontSize: '1.125rem', fontWeight: 600, marginBottom: '0.25rem', color: 'var(--text)' }}>
        {title}
      </h3>
      {message && (
        <p style={{ color: 'var(--text-muted)', marginBottom: action ? '1rem' : 0, maxWidth: '300px' }}>
          {message}
        </p>
      )}
      {action && (
        <button className="btn btn-primary" onClick={action.onClick}>
          {action.label}
        </button>
      )}
    </div>
  );
}

interface LoadingStateProps {
  message?: string;
}

export function LoadingState({ message = 'Loading...' }: LoadingStateProps) {
  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '3rem 2rem',
      textAlign: 'center',
    }}>
      <div className="spinner" style={{ marginBottom: '1rem' }} />
      <p style={{ color: 'var(--text-muted)' }}>{message}</p>
    </div>
  );
}
