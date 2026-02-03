import React from 'react';
import { AlertCircle } from 'lucide-react';

interface InputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'size'> {
  label?: string;
  error?: string;
  hint?: string;
  size?: 'sm' | 'md' | 'lg';
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  required?: boolean;
}

const sizeStyles = {
  sm: { height: '32px', fontSize: '0.8125rem', padding: '0.375rem 0.75rem' },
  md: { height: '40px', fontSize: '0.875rem', padding: '0.5rem 0.875rem' },
  lg: { height: '48px', fontSize: '1rem', padding: '0.625rem 1rem' },
};

export function Input({
  label,
  error,
  hint,
  size = 'md',
  leftIcon,
  rightIcon,
  required,
  className = '',
  style,
  id,
  ...props
}: InputProps) {
  const inputId = id || props.name;
  const sizeStyle = sizeStyles[size];

  return (
    <div className="form-group" style={{ marginBottom: '1rem' }}>
      {label && (
        <label 
          htmlFor={inputId} 
          className="form-label"
          style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}
        >
          {label}
          {required && <span style={{ color: 'var(--danger)' }}>*</span>}
        </label>
      )}
      <div style={{ position: 'relative' }}>
        {leftIcon && (
          <span
            style={{
              position: 'absolute',
              left: '0.75rem',
              top: '50%',
              transform: 'translateY(-50%)',
              color: 'var(--text-muted)',
              pointerEvents: 'none',
            }}
          >
            {leftIcon}
          </span>
        )}
        <input
          id={inputId}
          className={`form-input ${error ? 'form-input-error' : ''} ${className}`}
          style={{
            ...sizeStyle,
            paddingLeft: leftIcon ? '2.5rem' : sizeStyle.padding,
            paddingRight: rightIcon ? '2.5rem' : sizeStyle.padding,
            borderColor: error ? 'var(--danger)' : undefined,
            ...style,
          }}
          {...props}
        />
        {rightIcon && (
          <span
            style={{
              position: 'absolute',
              right: '0.75rem',
              top: '50%',
              transform: 'translateY(-50%)',
              color: 'var(--text-muted)',
            }}
          >
            {rightIcon}
          </span>
        )}
      </div>
      {error && (
        <p
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.25rem',
            color: 'var(--danger)',
            fontSize: '0.75rem',
            marginTop: '0.375rem',
          }}
        >
          <AlertCircle size={12} />
          {error}
        </p>
      )}
      {hint && !error && (
        <p style={{ color: 'var(--text-muted)', fontSize: '0.75rem', marginTop: '0.375rem' }}>
          {hint}
        </p>
      )}
    </div>
  );
}

interface SelectProps extends Omit<React.SelectHTMLAttributes<HTMLSelectElement>, 'size'> {
  label?: string;
  error?: string;
  hint?: string;
  size?: 'sm' | 'md' | 'lg';
  options: { value: string; label: string; disabled?: boolean }[];
  placeholder?: string;
  required?: boolean;
}

export function Select({
  label,
  error,
  hint,
  size = 'md',
  options,
  placeholder,
  required,
  className = '',
  style,
  id,
  ...props
}: SelectProps) {
  const inputId = id || props.name;
  const sizeStyle = sizeStyles[size];

  return (
    <div className="form-group" style={{ marginBottom: '1rem' }}>
      {label && (
        <label 
          htmlFor={inputId} 
          className="form-label"
          style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}
        >
          {label}
          {required && <span style={{ color: 'var(--danger)' }}>*</span>}
        </label>
      )}
      <select
        id={inputId}
        className={`form-select ${error ? 'form-select-error' : ''} ${className}`}
        style={{
          height: sizeStyle.height,
          fontSize: sizeStyle.fontSize,
          borderColor: error ? 'var(--danger)' : undefined,
          ...style,
        }}
        {...props}
      >
        {placeholder && <option value="">{placeholder}</option>}
        {options.map((opt) => (
          <option key={opt.value} value={opt.value} disabled={opt.disabled}>
            {opt.label}
          </option>
        ))}
      </select>
      {error && (
        <p
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.25rem',
            color: 'var(--danger)',
            fontSize: '0.75rem',
            marginTop: '0.375rem',
          }}
        >
          <AlertCircle size={12} />
          {error}
        </p>
      )}
      {hint && !error && (
        <p style={{ color: 'var(--text-muted)', fontSize: '0.75rem', marginTop: '0.375rem' }}>
          {hint}
        </p>
      )}
    </div>
  );
}

interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
  hint?: string;
  required?: boolean;
}

export function Textarea({
  label,
  error,
  hint,
  required,
  className = '',
  style,
  id,
  ...props
}: TextareaProps) {
  const inputId = id || props.name;

  return (
    <div className="form-group" style={{ marginBottom: '1rem' }}>
      {label && (
        <label 
          htmlFor={inputId} 
          className="form-label"
          style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}
        >
          {label}
          {required && <span style={{ color: 'var(--danger)' }}>*</span>}
        </label>
      )}
      <textarea
        id={inputId}
        className={`form-input ${error ? 'form-input-error' : ''} ${className}`}
        style={{
          minHeight: '100px',
          resize: 'vertical',
          borderColor: error ? 'var(--danger)' : undefined,
          ...style,
        }}
        {...props}
      />
      {error && (
        <p
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.25rem',
            color: 'var(--danger)',
            fontSize: '0.75rem',
            marginTop: '0.375rem',
          }}
        >
          <AlertCircle size={12} />
          {error}
        </p>
      )}
      {hint && !error && (
        <p style={{ color: 'var(--text-muted)', fontSize: '0.75rem', marginTop: '0.375rem' }}>
          {hint}
        </p>
      )}
    </div>
  );
}

export default Input;
