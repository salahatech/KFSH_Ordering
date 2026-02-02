import React, { useState } from 'react';
import { Search, X, Filter, ChevronDown, Calendar, RotateCcw } from 'lucide-react';
import { format } from 'date-fns';

export interface FilterOption {
  value: string;
  label: string;
  group?: string;
}

export interface FilterWidget {
  key: string;
  label: string;
  type: 'search' | 'select' | 'multiselect' | 'daterange' | 'toggle' | 'chip';
  options?: FilterOption[];
  placeholder?: string;
  defaultValue?: any;
}

interface FilterBarProps {
  widgets: FilterWidget[];
  values: Record<string, any>;
  onChange: (key: string, value: any) => void;
  onReset?: () => void;
  lastRefresh?: Date;
  onRefresh?: () => void;
  quickFilters?: { key: string; label: string; filters: Record<string, any> }[];
  activeQuickFilter?: string;
  onQuickFilterClick?: (key: string) => void;
}

export function FilterBar({ 
  widgets, 
  values, 
  onChange, 
  onReset, 
  lastRefresh,
  onRefresh,
  quickFilters,
  activeQuickFilter,
  onQuickFilterClick 
}: FilterBarProps) {
  const [expandedSelect, setExpandedSelect] = useState<string | null>(null);

  const activeFilterCount = Object.entries(values).filter(([_, v]) => {
    if (Array.isArray(v)) return v.length > 0;
    if (typeof v === 'boolean') return v;
    return v && v !== '';
  }).length;

  return (
    <div style={{ marginBottom: '1rem' }}>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem', alignItems: 'flex-end' }}>
        {widgets.map(widget => {
          if (widget.type === 'search') {
            return (
              <div key={widget.key} style={{ flex: '1 1 200px', maxWidth: '300px' }}>
                <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '0.375rem', display: 'block', fontWeight: 500 }}>
                  {widget.label}
                </label>
                <div style={{ position: 'relative' }}>
                  <Search size={16} style={{ position: 'absolute', left: '0.875rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                  <input
                    type="text"
                    className="form-input"
                    placeholder={widget.placeholder || `Search ${widget.label.toLowerCase()}...`}
                    value={values[widget.key] || ''}
                    onChange={(e) => onChange(widget.key, e.target.value)}
                    style={{ paddingLeft: '2.5rem', height: '40px' }}
                  />
                  {values[widget.key] && (
                    <button
                      onClick={() => onChange(widget.key, '')}
                      style={{ position: 'absolute', right: '0.75rem', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}
                    >
                      <X size={14} />
                    </button>
                  )}
                </div>
              </div>
            );
          }

          if (widget.type === 'select') {
            return (
              <div key={widget.key} style={{ flex: '0 0 auto', minWidth: '160px' }}>
                <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '0.375rem', display: 'block', fontWeight: 500 }}>
                  {widget.label}
                </label>
                <select
                  className="form-select"
                  value={values[widget.key] || ''}
                  onChange={(e) => onChange(widget.key, e.target.value)}
                  style={{ height: '40px', minWidth: '140px' }}
                >
                  <option value="">All</option>
                  {widget.options?.map(opt => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
              </div>
            );
          }

          if (widget.type === 'multiselect') {
            const selectedValues = values[widget.key] || [];
            return (
              <div key={widget.key} style={{ flex: '0 0 auto', minWidth: '160px', position: 'relative' }}>
                <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '0.375rem', display: 'block', fontWeight: 500 }}>
                  {widget.label}
                </label>
                <button
                  className="form-select"
                  onClick={() => setExpandedSelect(expandedSelect === widget.key ? null : widget.key)}
                  style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%', textAlign: 'left', height: '40px', backgroundImage: 'none' }}
                >
                  <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {selectedValues.length === 0 ? 'All' : `${selectedValues.length} selected`}
                  </span>
                  <ChevronDown size={16} style={{ color: 'var(--text-muted)' }} />
                </button>
                {expandedSelect === widget.key && (
                  <div style={{
                    position: 'absolute',
                    top: '100%',
                    left: 0,
                    right: 0,
                    backgroundColor: 'var(--bg-primary)',
                    border: '1px solid var(--border)',
                    borderRadius: '8px',
                    boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
                    zIndex: 100,
                    maxHeight: '200px',
                    overflow: 'auto',
                  }}>
                    {widget.options?.map(opt => (
                      <label
                        key={opt.value}
                        style={{ display: 'flex', alignItems: 'center', padding: '0.5rem 0.75rem', cursor: 'pointer', gap: '0.5rem' }}
                      >
                        <input
                          type="checkbox"
                          checked={selectedValues.includes(opt.value)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              onChange(widget.key, [...selectedValues, opt.value]);
                            } else {
                              onChange(widget.key, selectedValues.filter((v: string) => v !== opt.value));
                            }
                          }}
                        />
                        <span style={{ fontSize: '0.875rem' }}>{opt.label}</span>
                      </label>
                    ))}
                  </div>
                )}
              </div>
            );
          }

          if (widget.type === 'daterange') {
            return (
              <div key={widget.key} style={{ flex: '0 0 auto', display: 'flex', gap: '0.5rem', alignItems: 'flex-end' }}>
                <div>
                  <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '0.375rem', display: 'block', fontWeight: 500 }}>
                    From
                  </label>
                  <input
                    type="date"
                    className="form-input"
                    value={values[`${widget.key}From`] || ''}
                    onChange={(e) => onChange(`${widget.key}From`, e.target.value)}
                    style={{ width: '150px', height: '40px' }}
                  />
                </div>
                <div>
                  <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '0.375rem', display: 'block', fontWeight: 500 }}>
                    To
                  </label>
                  <input
                    type="date"
                    className="form-input"
                    value={values[`${widget.key}To`] || ''}
                    onChange={(e) => onChange(`${widget.key}To`, e.target.value)}
                    style={{ width: '150px', height: '40px' }}
                  />
                </div>
              </div>
            );
          }

          if (widget.type === 'toggle') {
            return (
              <div key={widget.key} style={{ flex: '0 0 auto', display: 'flex', alignItems: 'center', gap: '0.5rem', paddingBottom: '0.5rem' }}>
                <label className="toggle-switch" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={values[widget.key] || false}
                    onChange={(e) => onChange(widget.key, e.target.checked)}
                    style={{ width: '16px', height: '16px' }}
                  />
                  <span style={{ fontSize: '0.875rem' }}>{widget.label}</span>
                </label>
              </div>
            );
          }

          return null;
        })}

        <div style={{ flex: '0 0 auto', display: 'flex', gap: '0.5rem', alignItems: 'flex-end', paddingBottom: '0' }}>
          {onReset && activeFilterCount > 0 && (
            <button className="btn btn-secondary btn-sm" onClick={onReset}>
              <RotateCcw size={14} /> Reset
            </button>
          )}
          {onRefresh && (
            <button className="btn btn-secondary btn-sm" onClick={onRefresh}>
              <RotateCcw size={14} />
            </button>
          )}
        </div>
      </div>

      {quickFilters && quickFilters.length > 0 && (
        <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.75rem', flexWrap: 'wrap' }}>
          {quickFilters.map(qf => (
            <button
              key={qf.key}
              className={`btn btn-sm ${activeQuickFilter === qf.key ? 'btn-primary' : 'btn-secondary'}`}
              onClick={() => onQuickFilterClick?.(qf.key)}
              style={{ borderRadius: '999px' }}
            >
              {qf.label}
            </button>
          ))}
        </div>
      )}

      {lastRefresh && (
        <div style={{ fontSize: '0.625rem', color: 'var(--text-muted)', marginTop: '0.5rem' }}>
          Last updated: {format(lastRefresh, 'HH:mm:ss')}
          {activeFilterCount > 0 && ` • ${activeFilterCount} filter${activeFilterCount > 1 ? 's' : ''} applied`}
        </div>
      )}
    </div>
  );
}

export default FilterBar;
