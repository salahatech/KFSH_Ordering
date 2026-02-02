import { AlertCircle, ChevronRight } from 'lucide-react';

export interface FieldError {
  field: string;
  message: string;
}

export interface ApiError {
  code: string;
  message: string;
  userMessage: string;
  details?: Record<string, any>;
  fieldErrors?: FieldError[];
  traceId?: string;
}

interface InlineFieldErrorProps {
  message?: string;
}

export function InlineFieldError({ message }: InlineFieldErrorProps) {
  if (!message) return null;
  
  return (
    <div style={{
      color: 'var(--danger)',
      fontSize: '0.75rem',
      marginTop: '0.25rem',
      display: 'flex',
      alignItems: 'center',
      gap: '0.25rem',
    }}>
      <AlertCircle size={12} />
      {message}
    </div>
  );
}

interface FormErrorSummaryProps {
  errors: FieldError[];
  title?: string;
  onFieldClick?: (field: string) => void;
}

export function FormErrorSummary({ errors, title, onFieldClick }: FormErrorSummaryProps) {
  if (!errors || errors.length === 0) return null;

  return (
    <div style={{
      backgroundColor: 'rgba(239, 68, 68, 0.1)',
      border: '1px solid rgba(239, 68, 68, 0.3)',
      borderRadius: 'var(--radius)',
      padding: '1rem',
      marginBottom: '1.5rem',
    }}>
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '0.5rem',
        color: 'var(--danger)',
        fontWeight: 600,
        marginBottom: '0.75rem',
      }}>
        <AlertCircle size={18} />
        {title || `Please fix ${errors.length} error${errors.length > 1 ? 's' : ''} below`}
      </div>
      <ul style={{
        margin: 0,
        paddingLeft: 0,
        listStyle: 'none',
      }}>
        {errors.map((error, idx) => (
          <li 
            key={idx}
            style={{
              padding: '0.375rem 0',
              borderTop: idx > 0 ? '1px solid rgba(239, 68, 68, 0.2)' : 'none',
            }}
          >
            {onFieldClick ? (
              <button
                type="button"
                onClick={() => onFieldClick(error.field)}
                style={{
                  background: 'none',
                  border: 'none',
                  padding: 0,
                  color: 'var(--danger)',
                  fontSize: '0.875rem',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.25rem',
                  textAlign: 'left',
                }}
              >
                <ChevronRight size={14} />
                <strong style={{ marginRight: '0.25rem' }}>{formatFieldName(error.field)}:</strong>
                {error.message}
              </button>
            ) : (
              <div style={{
                color: 'var(--danger)',
                fontSize: '0.875rem',
                display: 'flex',
                alignItems: 'center',
                gap: '0.25rem',
              }}>
                <ChevronRight size={14} />
                <strong style={{ marginRight: '0.25rem' }}>{formatFieldName(error.field)}:</strong>
                {error.message}
              </div>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}

function formatFieldName(field: string): string {
  return field
    .replace(/([A-Z])/g, ' $1')
    .replace(/^./, str => str.toUpperCase())
    .replace(/_/g, ' ')
    .trim();
}

interface ErrorAlertProps {
  error: ApiError | string | null;
  onDismiss?: () => void;
}

export function ErrorAlert({ error, onDismiss }: ErrorAlertProps) {
  if (!error) return null;

  const message = typeof error === 'string' ? error : error.userMessage || error.message;
  const traceId = typeof error === 'object' ? error.traceId : undefined;

  return (
    <div style={{
      backgroundColor: 'rgba(239, 68, 68, 0.1)',
      border: '1px solid rgba(239, 68, 68, 0.3)',
      borderRadius: 'var(--radius)',
      padding: '1rem',
      marginBottom: '1rem',
      display: 'flex',
      alignItems: 'flex-start',
      gap: '0.75rem',
    }}>
      <AlertCircle size={20} style={{ color: 'var(--danger)', flexShrink: 0, marginTop: '2px' }} />
      <div style={{ flex: 1 }}>
        <div style={{ color: 'var(--danger)', fontWeight: 500 }}>{message}</div>
        {traceId && (
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
            Reference: {traceId}
          </div>
        )}
      </div>
      {onDismiss && (
        <button
          onClick={onDismiss}
          style={{
            background: 'none',
            border: 'none',
            padding: '4px',
            cursor: 'pointer',
            color: 'var(--danger)',
            opacity: 0.6,
          }}
        >
          ×
        </button>
      )}
    </div>
  );
}

export function parseApiError(error: any): ApiError | null {
  if (!error) return null;
  
  if (error.response?.data?.error) {
    return error.response.data.error;
  }
  
  if (error.response?.data?.message) {
    return {
      code: 'UNKNOWN',
      message: error.response.data.message,
      userMessage: error.response.data.message,
    };
  }
  
  if (error.message) {
    return {
      code: 'NETWORK_ERROR',
      message: error.message,
      userMessage: 'Unable to connect to the server. Please check your connection and try again.',
    };
  }
  
  return {
    code: 'UNKNOWN',
    message: 'An unknown error occurred',
    userMessage: 'Something went wrong. Please try again.',
  };
}
