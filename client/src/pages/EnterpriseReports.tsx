import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import api from '../lib/api';
import { 
  FileText, Boxes, Factory, ShoppingCart, ClipboardCheck, 
  Truck, Receipt, Building2, Package, Calendar, CreditCard, 
  Users, Filter, ChevronDown, ChevronRight, Search,
  FileSpreadsheet, File, X, Loader2, BarChart3, AlertCircle
} from 'lucide-react';
import { useToast } from '../components/ui/Toast';
import { PageHeader, KpiCard, FilterBar, type FilterWidget } from '../components/shared';

interface ReportCategory {
  id: string;
  name: string;
  icon: string;
}

interface ReportDefinition {
  key: string;
  name: string;
  description: string;
  category: string;
  allowedRoles: string[];
}

interface ColumnDefinition {
  key: string;
  label: string;
  type: string;
  sortable?: boolean;
  badgeMap?: Record<string, string>;
}

interface FilterDefinition {
  key: string;
  label: string;
  type: string;
  options?: { value: string; label: string }[];
  defaultValue?: any;
}

interface FullReportDefinition extends ReportDefinition {
  filters: FilterDefinition[];
  columns: ColumnDefinition[];
  drillDownRoute?: string;
}

interface ReportResult {
  data: any[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

const CATEGORY_ICONS: Record<string, any> = {
  inventory: Boxes,
  production: Factory,
  orders: ShoppingCart,
  quality: ClipboardCheck,
  dispensing: Package,
  logistics: Truck,
  finance: Receipt,
  customers: Building2,
  products: Package,
  planner: Calendar,
  payments: CreditCard,
  users: Users,
  audit: FileText,
};

const CATEGORY_COLORS: Record<string, 'primary' | 'success' | 'warning' | 'danger' | 'info' | 'default'> = {
  inventory: 'primary',
  production: 'warning',
  orders: 'info',
  quality: 'success',
  dispensing: 'primary',
  logistics: 'info',
  finance: 'success',
  customers: 'primary',
  products: 'default',
  planner: 'warning',
  payments: 'success',
  users: 'info',
  audit: 'default',
};

export default function EnterpriseReports() {
  const toast = useToast();
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [selectedReport, setSelectedReport] = useState<string | null>(null);
  const [filters, setFilters] = useState<Record<string, any>>({});
  const [page, setPage] = useState(1);
  const [showFilters, setShowFilters] = useState(true);
  const [exporting, setExporting] = useState<'excel' | 'pdf' | null>(null);

  const { data: categories = [] } = useQuery<ReportCategory[]>({
    queryKey: ['report-categories'],
    queryFn: async () => {
      const { data } = await api.get('/reports/enterprise/categories');
      return data;
    }
  });

  const { data: reports = [] } = useQuery<ReportDefinition[]>({
    queryKey: ['reports-list', selectedCategory],
    queryFn: async () => {
      const url = selectedCategory 
        ? `/reports/enterprise/list?category=${selectedCategory}`
        : '/reports/enterprise/list';
      const { data } = await api.get(url);
      return data;
    }
  });

  const { data: reportDefinition } = useQuery<FullReportDefinition>({
    queryKey: ['report-definition', selectedReport],
    queryFn: async () => {
      const { data } = await api.get(`/reports/enterprise/${selectedReport}/definition`);
      return data;
    },
    enabled: !!selectedReport
  });

  const { data: reportData, isLoading: loadingData, refetch } = useQuery<ReportResult>({
    queryKey: ['report-data', selectedReport, filters, page],
    queryFn: async () => {
      const { data } = await api.post(`/reports/enterprise/${selectedReport}/data`, {
        filters,
        page,
        pageSize: 25
      });
      return data;
    },
    enabled: !!selectedReport
  });

  const groupedReports = reports.reduce((acc, report) => {
    if (!acc[report.category]) acc[report.category] = [];
    acc[report.category].push(report);
    return acc;
  }, {} as Record<string, ReportDefinition[]>);

  const handleFilterChange = (key: string, value: any) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  const clearFilters = () => {
    setFilters({});
    setPage(1);
  };

  const handleExport = async (format: 'excel' | 'pdf') => {
    if (!selectedReport) return;
    setExporting(format);
    try {
      const response = await api.post(
        `/reports/enterprise/${selectedReport}/export/${format}`,
        { filters },
        { responseType: 'blob' }
      );
      
      const blob = new Blob([response.data], {
        type: format === 'excel' 
          ? 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
          : 'application/pdf'
      });
      
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${selectedReport}-${new Date().toISOString().slice(0, 10)}.${format === 'excel' ? 'xlsx' : 'pdf'}`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      
      toast.success('Export Complete', `Report exported to ${format.toUpperCase()}`);
    } catch (error) {
      toast.error('Export Failed', `Failed to export report to ${format.toUpperCase()}`);
    } finally {
      setExporting(null);
    }
  };

  const formatCellValue = (value: any, type: string): string => {
    if (value === null || value === undefined) return '-';
    
    switch (type) {
      case 'date':
        return new Date(value).toLocaleDateString();
      case 'datetime':
        return new Date(value).toLocaleString();
      case 'currency':
        return `SAR ${Number(value).toLocaleString(undefined, { minimumFractionDigits: 2 })}`;
      case 'number':
        return Number(value).toLocaleString();
      case 'percent':
        return `${value}%`;
      case 'boolean':
        return value ? 'Yes' : 'No';
      default:
        return String(value);
    }
  };

  const getStatusColor = (status: string, badgeMap?: Record<string, string>): string => {
    if (badgeMap && badgeMap[status]) return badgeMap[status];
    const defaultColors: Record<string, string> = {
      ACTIVE: 'success', APPROVED: 'success', COMPLETED: 'success', DELIVERED: 'success',
      PENDING: 'warning', IN_PROGRESS: 'warning', DRAFT: 'default',
      CANCELLED: 'danger', REJECTED: 'danger', FAILED: 'danger', EXPIRED: 'danger',
    };
    return defaultColors[status] || 'default';
  };

  const reportCount = reports.length;
  const categoryCount = categories.length;

  return (
    <div>
      <PageHeader
        title="Enterprise Reporting Center"
        subtitle="Generate and export comprehensive reports across all business areas"
        actions={
          selectedReport && (
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <button
                className="btn btn-secondary"
                onClick={() => setShowFilters(!showFilters)}
              >
                <Filter size={16} />
                Filters
              </button>
              <button
                className="btn btn-secondary"
                onClick={() => handleExport('excel')}
                disabled={exporting !== null}
              >
                {exporting === 'excel' ? <Loader2 size={16} className="animate-spin" /> : <FileSpreadsheet size={16} />}
                Excel
              </button>
              <button
                className="btn btn-secondary"
                onClick={() => handleExport('pdf')}
                disabled={exporting !== null}
              >
                {exporting === 'pdf' ? <Loader2 size={16} className="animate-spin" /> : <File size={16} />}
                PDF
              </button>
            </div>
          )
        }
      />

      {!selectedReport && (
        <div className="grid" style={{ gridTemplateColumns: 'repeat(4, 1fr)', gap: '1rem', marginBottom: '1.5rem' }}>
          <KpiCard
            title="Report Categories"
            value={categoryCount}
            icon={<BarChart3 size={20} />}
            color="primary"
          />
          <KpiCard
            title="Available Reports"
            value={reportCount}
            icon={<FileText size={20} />}
            color="info"
          />
          <KpiCard
            title="Selected Category"
            value={selectedCategory ? categories.find(c => c.id === selectedCategory)?.name || '-' : 'All'}
            icon={<Boxes size={20} />}
            color="default"
          />
          <KpiCard
            title="Quick Actions"
            value="Export"
            subtext="Select a report to export"
            icon={<FileSpreadsheet size={20} />}
            color="success"
          />
        </div>
      )}

      <div style={{ display: 'flex', gap: '1.5rem' }}>
        <div className="card" style={{ width: '280px', flexShrink: 0, padding: 0, overflow: 'hidden' }}>
          <div style={{ padding: '1rem', borderBottom: '1px solid var(--border)', background: 'var(--bg-secondary)' }}>
            <h3 style={{ fontSize: '0.875rem', fontWeight: 600, margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <BarChart3 size={16} />
              Report Categories
            </h3>
          </div>
          <div style={{ maxHeight: 'calc(100vh - 320px)', overflowY: 'auto', padding: '0.5rem' }}>
            {categories.map(category => {
              const Icon = CATEGORY_ICONS[category.id] || FileText;
              const isExpanded = selectedCategory === category.id;
              const categoryReports = groupedReports[category.id] || [];

              return (
                <div key={category.id} style={{ marginBottom: '0.25rem' }}>
                  <button
                    onClick={() => setSelectedCategory(isExpanded ? null : category.id)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.5rem',
                      width: '100%',
                      padding: '0.625rem 0.75rem',
                      border: 'none',
                      background: isExpanded ? 'var(--primary-light, #eff6ff)' : 'transparent',
                      textAlign: 'left',
                      cursor: 'pointer',
                      borderRadius: '6px',
                      color: isExpanded ? 'var(--primary)' : 'var(--text-primary)',
                      fontSize: '0.875rem',
                      fontWeight: 500,
                      transition: 'background 0.2s',
                    }}
                  >
                    <Icon size={16} />
                    <span style={{ flex: 1 }}>{category.name}</span>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginRight: '0.25rem' }}>
                      {categoryReports.length}
                    </span>
                    {isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                  </button>

                  {isExpanded && categoryReports.length > 0 && (
                    <div style={{ paddingLeft: '1.25rem', marginTop: '0.25rem' }}>
                      {categoryReports.map(report => (
                        <button
                          key={report.key}
                          onClick={() => {
                            setSelectedReport(report.key);
                            setFilters({});
                            setPage(1);
                          }}
                          style={{
                            display: 'block',
                            width: '100%',
                            padding: '0.5rem 0.75rem',
                            border: 'none',
                            background: selectedReport === report.key ? 'var(--primary)' : 'transparent',
                            textAlign: 'left',
                            cursor: 'pointer',
                            borderRadius: '4px',
                            color: selectedReport === report.key ? 'white' : 'var(--text-secondary)',
                            fontSize: '0.8125rem',
                            transition: 'all 0.2s',
                          }}
                        >
                          {report.name}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        <div style={{ flex: 1, minWidth: 0 }}>
          {!selectedReport ? (
            <div className="card" style={{ padding: '3rem', textAlign: 'center' }}>
              <BarChart3 size={48} style={{ color: 'var(--text-muted)', marginBottom: '1rem' }} />
              <h2 style={{ fontSize: '1.25rem', fontWeight: 600, marginBottom: '0.5rem' }}>
                Select a Report
              </h2>
              <p style={{ color: 'var(--text-muted)', marginBottom: '2rem' }}>
                Choose a category from the sidebar to view available reports
              </p>
              
              <div style={{ 
                display: 'grid', 
                gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', 
                gap: '1rem',
                maxWidth: '800px',
                margin: '0 auto'
              }}>
                {categories.slice(0, 8).map(category => {
                  const Icon = CATEGORY_ICONS[category.id] || FileText;
                  const color = CATEGORY_COLORS[category.id] || 'default';
                  const reportCountInCat = groupedReports[category.id]?.length || 0;
                  
                  return (
                    <button
                      key={category.id}
                      onClick={() => setSelectedCategory(category.id)}
                      className="card"
                      style={{
                        padding: '1.25rem',
                        border: selectedCategory === category.id ? '2px solid var(--primary)' : '1px solid var(--border)',
                        cursor: 'pointer',
                        textAlign: 'center',
                        transition: 'all 0.2s',
                      }}
                    >
                      <Icon size={24} style={{ color: `var(--${color === 'default' ? 'text-muted' : color})`, marginBottom: '0.5rem' }} />
                      <div style={{ fontSize: '0.8125rem', fontWeight: 500 }}>{category.name}</div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{reportCountInCat} reports</div>
                    </button>
                  );
                })}
              </div>
            </div>
          ) : (
            <>
              <div style={{ 
                display: 'flex', 
                justifyContent: 'space-between', 
                alignItems: 'flex-start', 
                marginBottom: '1rem' 
              }}>
                <div>
                  <h2 style={{ fontSize: '1.125rem', fontWeight: 600, margin: 0 }}>
                    {reportDefinition?.name || 'Loading...'}
                  </h2>
                  <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', margin: '0.25rem 0 0 0' }}>
                    {reportDefinition?.description}
                  </p>
                </div>
                <button
                  className="btn btn-secondary"
                  onClick={() => {
                    setSelectedReport(null);
                    setFilters({});
                  }}
                  style={{ fontSize: '0.8125rem' }}
                >
                  <X size={14} />
                  Close
                </button>
              </div>

              {showFilters && reportDefinition?.filters && reportDefinition.filters.length > 0 && (
                <div className="card" style={{ marginBottom: '1rem', padding: '1rem' }}>
                  <div style={{ 
                    display: 'grid', 
                    gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', 
                    gap: '1rem',
                    marginBottom: '1rem'
                  }}>
                    {reportDefinition.filters.map(filter => (
                      <div key={filter.key} className="form-group" style={{ margin: 0 }}>
                        <label className="form-label" style={{ fontSize: '0.75rem' }}>{filter.label}</label>
                        {filter.type === 'text' && (
                          <input
                            type="text"
                            className="form-input"
                            value={filters[filter.key] || ''}
                            onChange={(e) => handleFilterChange(filter.key, e.target.value)}
                            placeholder={`Enter ${filter.label.toLowerCase()}`}
                          />
                        )}
                        {filter.type === 'date' && (
                          <input
                            type="date"
                            className="form-input"
                            value={filters[filter.key] || ''}
                            onChange={(e) => handleFilterChange(filter.key, e.target.value)}
                          />
                        )}
                        {filter.type === 'number' && (
                          <input
                            type="number"
                            className="form-input"
                            value={filters[filter.key] || filter.defaultValue || ''}
                            onChange={(e) => handleFilterChange(filter.key, e.target.value)}
                          />
                        )}
                        {filter.type === 'select' && filter.options && (
                          <select
                            className="form-select"
                            value={filters[filter.key] || ''}
                            onChange={(e) => handleFilterChange(filter.key, e.target.value)}
                          >
                            <option value="">All</option>
                            {filter.options.map(opt => (
                              <option key={opt.value} value={opt.value}>{opt.label}</option>
                            ))}
                          </select>
                        )}
                      </div>
                    ))}
                  </div>
                  <div style={{ display: 'flex', gap: '0.5rem', paddingTop: '1rem', borderTop: '1px solid var(--border)' }}>
                    <button className="btn btn-primary" onClick={() => refetch()}>
                      <Search size={16} />
                      Apply Filters
                    </button>
                    <button className="btn btn-secondary" onClick={clearFilters}>
                      <X size={16} />
                      Clear
                    </button>
                  </div>
                </div>
              )}

              <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
                {loadingData ? (
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '3rem' }}>
                    <Loader2 size={32} className="animate-spin" style={{ color: 'var(--primary)' }} />
                    <p style={{ marginTop: '0.5rem', color: 'var(--text-muted)' }}>Loading report data...</p>
                  </div>
                ) : !reportData?.data.length ? (
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '3rem' }}>
                    <AlertCircle size={32} style={{ color: 'var(--text-muted)' }} />
                    <h3 style={{ margin: '1rem 0 0.5rem 0', color: 'var(--text-primary)' }}>No Data Found</h3>
                    <p style={{ color: 'var(--text-muted)' }}>Try adjusting your filters or select a different report</p>
                  </div>
                ) : (
                  <>
                    <div style={{ overflowX: 'auto' }}>
                      <table className="table">
                        <thead>
                          <tr>
                            {reportDefinition?.columns.map(col => (
                              <th key={col.key}>{col.label}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {reportData.data.map((row, idx) => (
                            <tr key={row.id || idx}>
                              {reportDefinition?.columns.map(col => (
                                <td key={col.key}>
                                  {col.type === 'badge' ? (
                                    <span className={`badge badge-${getStatusColor(row[col.key], col.badgeMap)}`}>
                                      {row[col.key]}
                                    </span>
                                  ) : (
                                    formatCellValue(row[col.key], col.type)
                                  )}
                                </td>
                              ))}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                    
                    <div style={{ 
                      display: 'flex', 
                      justifyContent: 'space-between', 
                      alignItems: 'center', 
                      padding: '1rem',
                      borderTop: '1px solid var(--border)',
                      fontSize: '0.875rem',
                      color: 'var(--text-muted)'
                    }}>
                      <span>
                        Showing {((page - 1) * 25) + 1} - {Math.min(page * 25, reportData.total)} of {reportData.total} records
                      </span>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                        <button
                          className="btn btn-secondary"
                          disabled={page <= 1}
                          onClick={() => setPage(p => p - 1)}
                          style={{ padding: '0.375rem 0.75rem' }}
                        >
                          Previous
                        </button>
                        <span>Page {page} of {reportData.totalPages}</span>
                        <button
                          className="btn btn-secondary"
                          disabled={page >= reportData.totalPages}
                          onClick={() => setPage(p => p + 1)}
                          style={{ padding: '0.375rem 0.75rem' }}
                        >
                          Next
                        </button>
                      </div>
                    </div>
                  </>
                )}
              </div>
            </>
          )}
        </div>
      </div>

      <style>{`
        .animate-spin {
          animation: spin 1s linear infinite;
        }

        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}
