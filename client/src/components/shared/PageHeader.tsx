import React from 'react';
import { ChevronRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import { StatusBadge } from './StatusBadge';

interface BreadcrumbItem {
  label: string;
  href?: string;
}

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  status?: string;
  statusLabel?: string;
  breadcrumbs?: BreadcrumbItem[];
  actions?: React.ReactNode;
  sticky?: boolean;
}

export function PageHeader({
  title,
  subtitle,
  status,
  statusLabel,
  breadcrumbs,
  actions,
  sticky = false,
}: PageHeaderProps) {
  return (
    <div
      style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: '1.5rem',
        gap: '1rem',
        flexWrap: 'wrap',
        ...(sticky && {
          position: 'sticky',
          top: 0,
          backgroundColor: 'var(--bg-secondary)',
          paddingTop: '1rem',
          paddingBottom: '1rem',
          marginTop: '-1rem',
          marginBottom: '1rem',
          zIndex: 100,
          borderBottom: '1px solid var(--border)',
        }),
      }}
    >
      <div style={{ flex: 1, minWidth: 0 }}>
        {breadcrumbs && breadcrumbs.length > 0 && (
          <nav
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              marginBottom: '0.5rem',
              fontSize: '0.8125rem',
              color: 'var(--text-muted)',
            }}
          >
            {breadcrumbs.map((item, index) => (
              <React.Fragment key={index}>
                {index > 0 && <ChevronRight size={14} style={{ color: 'var(--text-muted)' }} />}
                {item.href ? (
                  <Link
                    to={item.href}
                    style={{
                      color: 'var(--text-muted)',
                      textDecoration: 'none',
                    }}
                  >
                    {item.label}
                  </Link>
                ) : (
                  <span style={{ color: 'var(--text-primary)', fontWeight: 500 }}>{item.label}</span>
                )}
              </React.Fragment>
            ))}
          </nav>
        )}

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
          <h1
            style={{
              fontSize: '1.25rem',
              fontWeight: 600,
              margin: 0,
              color: 'var(--text-primary)',
            }}
          >
            {title}
          </h1>
          {status && <StatusBadge status={status} label={statusLabel} size="md" />}
        </div>

        {subtitle && (
          <p
            style={{
              color: 'var(--text-muted)',
              fontSize: '0.875rem',
              margin: '0.25rem 0 0 0',
            }}
          >
            {subtitle}
          </p>
        )}
      </div>

      {actions && (
        <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', alignItems: 'center' }}>
          {actions}
        </div>
      )}
    </div>
  );
}

export default PageHeader;
