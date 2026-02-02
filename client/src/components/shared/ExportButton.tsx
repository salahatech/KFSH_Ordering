import React, { useState } from 'react';
import { Download, FileText, Table, ChevronDown } from 'lucide-react';

interface ExportButtonProps {
  onExportPdf?: () => void;
  onExportCsv?: () => void;
  label?: string;
  disabled?: boolean;
  loading?: boolean;
}

export function ExportButton({ 
  onExportPdf, 
  onExportCsv, 
  label = 'Export',
  disabled = false,
  loading = false,
}: ExportButtonProps) {
  const [showMenu, setShowMenu] = useState(false);

  const hasMultipleOptions = onExportPdf && onExportCsv;

  const handleClick = () => {
    if (hasMultipleOptions) {
      setShowMenu(!showMenu);
    } else if (onExportPdf) {
      onExportPdf();
    } else if (onExportCsv) {
      onExportCsv();
    }
  };

  return (
    <div style={{ position: 'relative' }}>
      <button 
        className="btn btn-secondary"
        onClick={handleClick}
        disabled={disabled || loading}
      >
        {loading ? (
          <span className="spinner-sm" />
        ) : (
          <Download size={16} />
        )}
        {label}
        {hasMultipleOptions && <ChevronDown size={14} />}
      </button>
      
      {showMenu && hasMultipleOptions && (
        <>
          <div 
            style={{ position: 'fixed', inset: 0, zIndex: 99 }}
            onClick={() => setShowMenu(false)}
          />
          <div style={{
            position: 'absolute',
            top: '100%',
            right: 0,
            marginTop: '0.25rem',
            backgroundColor: 'var(--bg-primary)',
            border: '1px solid var(--border)',
            borderRadius: '8px',
            boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
            zIndex: 100,
            minWidth: '150px',
            overflow: 'hidden',
          }}>
            {onExportPdf && (
              <button
                className="btn"
                onClick={() => {
                  onExportPdf();
                  setShowMenu(false);
                }}
                style={{
                  width: '100%',
                  justifyContent: 'flex-start',
                  borderRadius: 0,
                  border: 'none',
                  borderBottom: onExportCsv ? '1px solid var(--border)' : 'none',
                }}
              >
                <FileText size={16} /> Export PDF
              </button>
            )}
            {onExportCsv && (
              <button
                className="btn"
                onClick={() => {
                  onExportCsv();
                  setShowMenu(false);
                }}
                style={{
                  width: '100%',
                  justifyContent: 'flex-start',
                  borderRadius: 0,
                  border: 'none',
                }}
              >
                <Table size={16} /> Export CSV
              </button>
            )}
          </div>
        </>
      )}
    </div>
  );
}

export default ExportButton;
