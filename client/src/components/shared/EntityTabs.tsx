import React, { useState, ReactNode } from 'react';

export interface Tab {
  key: string;
  label: string;
  icon?: ReactNode;
  content: ReactNode;
  badge?: number;
  disabled?: boolean;
}

interface EntityTabsProps {
  tabs: Tab[];
  defaultTab?: string;
  onChange?: (tabKey: string) => void;
}

export function EntityTabs({ tabs, defaultTab, onChange }: EntityTabsProps) {
  const [activeTab, setActiveTab] = useState(defaultTab || tabs[0]?.key || '');

  const handleTabChange = (key: string) => {
    setActiveTab(key);
    onChange?.(key);
  };

  const activeTabContent = tabs.find(t => t.key === activeTab)?.content;

  return (
    <div className="card">
      <div style={{ 
        display: 'flex', 
        borderBottom: '1px solid var(--border)', 
        overflowX: 'auto',
        gap: '0'
      }}>
        {tabs.map(tab => (
          <button
            key={tab.key}
            onClick={() => !tab.disabled && handleTabChange(tab.key)}
            disabled={tab.disabled}
            style={{
              padding: '0.875rem 1.25rem',
              border: 'none',
              background: activeTab === tab.key ? 'var(--bg-primary)' : 'transparent',
              borderBottom: activeTab === tab.key ? '2px solid var(--primary)' : '2px solid transparent',
              color: tab.disabled 
                ? 'var(--text-muted)' 
                : activeTab === tab.key ? 'var(--primary)' : 'var(--text-secondary)',
              fontWeight: activeTab === tab.key ? 600 : 400,
              cursor: tab.disabled ? 'not-allowed' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              whiteSpace: 'nowrap',
              fontSize: '0.875rem',
              transition: 'all 0.15s ease',
              opacity: tab.disabled ? 0.5 : 1,
            }}
          >
            {tab.icon}
            {tab.label}
            {tab.badge !== undefined && tab.badge > 0 && (
              <span className="badge badge-primary" style={{ fontSize: '0.75rem' }}>{tab.badge}</span>
            )}
          </button>
        ))}
      </div>
      <div style={{ padding: '1.5rem' }}>
        {activeTabContent}
      </div>
    </div>
  );
}
