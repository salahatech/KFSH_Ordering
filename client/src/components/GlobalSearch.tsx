import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import {
  Search,
  X,
  ShoppingCart,
  FlaskConical,
  Building2,
  Package,
  Truck,
  Receipt,
  Users,
  FileText,
  Command,
} from 'lucide-react';
import api from '../lib/api';

interface SearchResult {
  id: string;
  type: 'order' | 'batch' | 'customer' | 'material' | 'shipment' | 'invoice' | 'user' | 'product';
  title: string;
  subtitle?: string;
  path: string;
}

const typeIcons: Record<string, typeof ShoppingCart> = {
  order: ShoppingCart,
  batch: FlaskConical,
  customer: Building2,
  material: Package,
  shipment: Truck,
  invoice: Receipt,
  user: Users,
  product: Package,
};

const typeLabels: Record<string, string> = {
  order: 'Order',
  batch: 'Batch',
  customer: 'Customer',
  material: 'Material',
  shipment: 'Shipment',
  invoice: 'Invoice',
  user: 'User',
  product: 'Product',
};

export default function GlobalSearch() {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();
  const { t } = useTranslation();

  const { data: results = [], isLoading } = useQuery<SearchResult[]>({
    queryKey: ['global-search', query],
    queryFn: async () => {
      if (query.length < 2) return [];
      try {
        const { data } = await api.get(`/search/global?q=${encodeURIComponent(query)}`);
        return data.results || [];
      } catch {
        return getMockResults(query);
      }
    },
    enabled: query.length >= 2,
    staleTime: 1000,
  });

  function getMockResults(q: string): SearchResult[] {
    const mockData: SearchResult[] = [
      { id: '1', type: 'order', title: 'O-2024-001', subtitle: 'Al Noor Hospital - FDG-18', path: '/orders/1' },
      { id: '2', type: 'order', title: 'O-2024-002', subtitle: 'King Faisal Hospital - Ga-68', path: '/orders/2' },
      { id: '3', type: 'batch', title: 'B-2024-001', subtitle: 'FDG-18 Production', path: '/batches/1' },
      { id: '4', type: 'customer', title: 'Al Noor Hospital', subtitle: 'Riyadh, Saudi Arabia', path: '/customers/1' },
      { id: '5', type: 'material', title: 'FDG-18', subtitle: 'Radiopharmaceutical', path: '/materials/1' },
      { id: '6', type: 'shipment', title: 'S-2024-001', subtitle: 'En Route to Al Noor', path: '/shipments/1' },
      { id: '7', type: 'invoice', title: 'INV-2024-001', subtitle: 'SAR 15,000', path: '/invoices/1' },
    ];
    const lowerQ = q.toLowerCase();
    return mockData.filter(r => 
      r.title.toLowerCase().includes(lowerQ) || 
      r.subtitle?.toLowerCase().includes(lowerQ)
    );
  }

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setIsOpen(true);
      }
      if (e.key === 'Escape') {
        setIsOpen(false);
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, []);

  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen]);

  useEffect(() => {
    setSelectedIndex(0);
  }, [results]);

  const handleKeyNavigation = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex(i => Math.min(i + 1, results.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex(i => Math.max(i - 1, 0));
    } else if (e.key === 'Enter' && results[selectedIndex]) {
      navigate(results[selectedIndex].path);
      setIsOpen(false);
      setQuery('');
    }
  };

  const handleResultClick = (result: SearchResult) => {
    navigate(result.path);
    setIsOpen(false);
    setQuery('');
  };

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem',
          padding: '0.5rem 0.75rem',
          background: 'var(--bg-secondary)',
          border: '1px solid var(--border)',
          borderRadius: '8px',
          cursor: 'pointer',
          color: 'var(--text-muted)',
          fontSize: '0.875rem',
          minWidth: '280px',
        }}
      >
        <Search size={16} />
        <span>Search...</span>
        <div style={{ 
          marginLeft: 'auto', 
          display: 'flex', 
          alignItems: 'center', 
          gap: '2px',
          opacity: 0.6,
        }}>
          <Command size={12} />
          <span style={{ fontSize: '0.75rem' }}>K</span>
        </div>
      </button>

      {isOpen && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.5)',
            zIndex: 1000,
            display: 'flex',
            alignItems: 'flex-start',
            justifyContent: 'center',
            paddingTop: '10vh',
          }}
          onClick={() => setIsOpen(false)}
        >
          <div
            style={{
              width: '100%',
              maxWidth: '600px',
              background: 'var(--bg-primary)',
              borderRadius: '12px',
              boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)',
              overflow: 'hidden',
            }}
            onClick={e => e.stopPropagation()}
          >
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.75rem',
              padding: '1rem',
              borderBottom: '1px solid var(--border)',
            }}>
              <Search size={20} style={{ color: 'var(--text-muted)' }} />
              <input
                ref={inputRef}
                type="text"
                value={query}
                onChange={e => setQuery(e.target.value)}
                onKeyDown={handleKeyNavigation}
                placeholder="Search orders, batches, customers, materials..."
                style={{
                  flex: 1,
                  border: 'none',
                  outline: 'none',
                  background: 'transparent',
                  fontSize: '1rem',
                  color: 'var(--text-primary)',
                }}
              />
              {query && (
                <button
                  onClick={() => setQuery('')}
                  style={{
                    background: 'none',
                    border: 'none',
                    padding: '0.25rem',
                    cursor: 'pointer',
                    color: 'var(--text-muted)',
                  }}
                >
                  <X size={16} />
                </button>
              )}
            </div>

            <div style={{ maxHeight: '400px', overflow: 'auto' }}>
              {query.length < 2 ? (
                <div style={{
                  padding: '2rem',
                  textAlign: 'center',
                  color: 'var(--text-muted)',
                }}>
                  <Search size={32} style={{ opacity: 0.3, marginBottom: '0.5rem' }} />
                  <div>Type at least 2 characters to search</div>
                </div>
              ) : isLoading ? (
                <div style={{ padding: '1.5rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                  Searching...
                </div>
              ) : results.length === 0 ? (
                <div style={{
                  padding: '2rem',
                  textAlign: 'center',
                  color: 'var(--text-muted)',
                }}>
                  <FileText size={32} style={{ opacity: 0.3, marginBottom: '0.5rem' }} />
                  <div>No results found for "{query}"</div>
                </div>
              ) : (
                results.map((result, index) => {
                  const Icon = typeIcons[result.type] || FileText;
                  return (
                    <div
                      key={`${result.type}-${result.id}`}
                      onClick={() => handleResultClick(result)}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.75rem',
                        padding: '0.875rem 1rem',
                        cursor: 'pointer',
                        background: index === selectedIndex ? 'var(--bg-secondary)' : 'transparent',
                        borderBottom: '1px solid var(--border)',
                      }}
                    >
                      <div style={{
                        width: '36px',
                        height: '36px',
                        borderRadius: '8px',
                        background: 'var(--bg-secondary)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}>
                        <Icon size={18} style={{ color: 'var(--primary)' }} />
                      </div>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontWeight: 500, color: 'var(--text-primary)' }}>
                          {result.title}
                        </div>
                        {result.subtitle && (
                          <div style={{ fontSize: '0.8125rem', color: 'var(--text-muted)' }}>
                            {result.subtitle}
                          </div>
                        )}
                      </div>
                      <span style={{
                        fontSize: '0.6875rem',
                        padding: '0.25rem 0.5rem',
                        borderRadius: '4px',
                        background: 'var(--bg-secondary)',
                        color: 'var(--text-muted)',
                        textTransform: 'uppercase',
                      }}>
                        {typeLabels[result.type]}
                      </span>
                    </div>
                  );
                })
              )}
            </div>

            <div style={{
              padding: '0.75rem 1rem',
              borderTop: '1px solid var(--border)',
              display: 'flex',
              justifyContent: 'space-between',
              fontSize: '0.75rem',
              color: 'var(--text-muted)',
            }}>
              <div style={{ display: 'flex', gap: '1rem' }}>
                <span>↑↓ Navigate</span>
                <span>↵ Select</span>
              </div>
              <span>ESC Close</span>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
