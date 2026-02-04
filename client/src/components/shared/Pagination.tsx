import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from 'lucide-react';

interface PaginationProps {
  page: number;
  pageSize: number;
  totalCount: number;
  onPageChange: (page: number) => void;
  showRecordRange?: boolean;
  compact?: boolean;
}

export function Pagination({
  page,
  pageSize,
  totalCount,
  onPageChange,
  showRecordRange = true,
  compact = false,
}: PaginationProps) {
  const totalPages = Math.ceil(totalCount / pageSize) || 1;
  const firstRecord = totalCount > 0 ? (page - 1) * pageSize + 1 : 0;
  const lastRecord = Math.min(page * pageSize, totalCount);

  if (totalCount <= pageSize) {
    return (
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: compact ? '0.75rem 1rem' : '1rem 1.25rem',
          borderTop: '1px solid var(--border)',
          fontSize: '0.8125rem',
          color: 'var(--text-muted)',
          background: 'var(--bg-secondary)',
        }}
      >
        <span>
          {totalCount} {totalCount === 1 ? 'record' : 'records'}
        </span>
      </div>
    );
  }

  return (
    <div
      style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: compact ? '0.75rem 1rem' : '1rem 1.25rem',
        borderTop: '1px solid var(--border)',
        fontSize: '0.8125rem',
        color: 'var(--text-muted)',
        background: 'var(--bg-secondary)',
        flexWrap: 'wrap',
        gap: '0.75rem',
      }}
    >
      {showRecordRange && (
        <span>
          Showing <strong style={{ color: 'var(--text-primary)' }}>{firstRecord}</strong> - <strong style={{ color: 'var(--text-primary)' }}>{lastRecord}</strong> of <strong style={{ color: 'var(--text-primary)' }}>{totalCount.toLocaleString()}</strong> records
        </span>
      )}
      
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
        <button
          className="btn btn-secondary"
          style={{ 
            padding: '0.375rem 0.5rem',
            display: 'flex',
            alignItems: 'center',
            gap: '0.25rem',
            fontSize: '0.75rem',
          }}
          onClick={() => onPageChange(1)}
          disabled={page <= 1}
          title="First page"
        >
          <ChevronsLeft size={14} />
          {!compact && <span>First</span>}
        </button>
        
        <button
          className="btn btn-secondary"
          style={{ 
            padding: '0.375rem 0.5rem',
            display: 'flex',
            alignItems: 'center',
            gap: '0.25rem',
            fontSize: '0.75rem',
          }}
          onClick={() => onPageChange(page - 1)}
          disabled={page <= 1}
          title="Previous page"
        >
          <ChevronLeft size={14} />
          {!compact && <span>Previous</span>}
        </button>
        
        <span style={{ 
          padding: '0.375rem 0.75rem', 
          display: 'flex', 
          alignItems: 'center',
          background: 'var(--bg-primary)',
          borderRadius: '6px',
          border: '1px solid var(--border)',
          fontSize: '0.8125rem',
          fontWeight: 500,
          color: 'var(--text-primary)',
        }}>
          {page} / {totalPages}
        </span>
        
        <button
          className="btn btn-secondary"
          style={{ 
            padding: '0.375rem 0.5rem',
            display: 'flex',
            alignItems: 'center',
            gap: '0.25rem',
            fontSize: '0.75rem',
          }}
          onClick={() => onPageChange(page + 1)}
          disabled={page >= totalPages}
          title="Next page"
        >
          {!compact && <span>Next</span>}
          <ChevronRight size={14} />
        </button>
        
        <button
          className="btn btn-secondary"
          style={{ 
            padding: '0.375rem 0.5rem',
            display: 'flex',
            alignItems: 'center',
            gap: '0.25rem',
            fontSize: '0.75rem',
          }}
          onClick={() => onPageChange(totalPages)}
          disabled={page >= totalPages}
          title="Last page"
        >
          {!compact && <span>Last</span>}
          <ChevronsRight size={14} />
        </button>
      </div>
    </div>
  );
}

export default Pagination;
