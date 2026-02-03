import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import api from '../lib/api';
import { 
  FileText, Boxes, Factory, ShoppingCart, ClipboardCheck, 
  Truck, Receipt, Building2, Package, Calendar, CreditCard, 
  Users, Filter, ChevronDown, ChevronRight, Search,
  FileSpreadsheet, File, X, Loader2
} from 'lucide-react';
import { useToast } from '../components/ui/Toast';

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
    enabled: !!selectedReport,
  });

  const { data: reportData, isLoading: loadingData, refetch } = useQuery<ReportResult>({
    queryKey: ['report-data', selectedReport, filters, page],
    queryFn: async () => {
      const { data } = await api.post(`/reports/enterprise/${selectedReport}/data`, {
        filters,
        page,
        pageSize: 50,
      });
      return data;
    },
    enabled: !!selectedReport,
  });

  const handleExport = async (format: 'excel' | 'pdf') => {
    if (!selectedReport) return;
    setExporting(format);
    try {
      const response = await api.post(
        `/reports/enterprise/${selectedReport}/export/${format}`,
        { filters },
        { responseType: 'blob' }
      );
      const blob = new Blob([response.data]);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${selectedReport}-${new Date().toISOString().slice(0, 10)}.${format === 'excel' ? 'xlsx' : 'pdf'}`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
      toast.success('Export Complete', `Report exported to ${format.toUpperCase()} successfully`);
    } catch (error) {
      toast.error('Export Failed', 'Failed to export report');
    } finally {
      setExporting(null);
    }
  };

  const handleFilterChange = (key: string, value: any) => {
    setFilters(prev => ({ ...prev, [key]: value }));
    setPage(1);
  };

  const clearFilters = () => {
    setFilters({});
    setPage(1);
  };

  const formatValue = (value: any, column: ColumnDefinition) => {
    if (value === null || value === undefined) return '-';
    
    switch (column.type) {
      case 'date':
        return new Date(value).toLocaleDateString();
      case 'datetime':
        return new Date(value).toLocaleString();
      case 'currency':
        return `$${Number(value).toFixed(2)}`;
      case 'percent':
        return `${value}%`;
      case 'badge':
        const badgeClass = column.badgeMap?.[value] || 'default';
        const badgeClasses: Record<string, string> = {
          success: 'status-badge-released',
          warning: 'status-badge-pending',
          danger: 'status-badge-cancelled',
          info: 'status-badge-in-progress',
          default: 'status-badge',
        };
        return <span className={badgeClasses[badgeClass] || 'status-badge'}>{value}</span>;
      default:
        return String(value);
    }
  };

  const groupedReports = reports.reduce((acc, report) => {
    if (!acc[report.category]) acc[report.category] = [];
    acc[report.category].push(report);
    return acc;
  }, {} as Record<string, ReportDefinition[]>);

  return (
    <div className="reports-layout">
      <div className="reports-sidebar">
        <div className="sidebar-header">
          <FileText size={20} />
          <h2>Enterprise Reports</h2>
        </div>

        <div className="sidebar-content">
          {categories.map(category => {
            const Icon = CATEGORY_ICONS[category.id] || FileText;
            const isExpanded = selectedCategory === category.id;
            const categoryReports = groupedReports[category.id] || [];

            return (
              <div key={category.id} className="category-section">
                <button
                  className={`category-header ${isExpanded ? 'expanded' : ''}`}
                  onClick={() => setSelectedCategory(isExpanded ? null : category.id)}
                >
                  <Icon size={16} />
                  <span>{category.name}</span>
                  {isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                </button>

                {isExpanded && categoryReports.length > 0 && (
                  <div className="category-reports">
                    {categoryReports.map(report => (
                      <button
                        key={report.key}
                        className={`report-item ${selectedReport === report.key ? 'active' : ''}`}
                        onClick={() => {
                          setSelectedReport(report.key);
                          setFilters({});
                          setPage(1);
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

      <div className="reports-main">
        {!selectedReport ? (
          <div className="reports-welcome">
            <FileText size={48} className="welcome-icon" />
            <h2>Enterprise Reporting Center</h2>
            <p>Select a report category from the sidebar to get started</p>
            <div className="category-grid">
              {categories.slice(0, 6).map(category => {
                const Icon = CATEGORY_ICONS[category.id] || FileText;
                return (
                  <button
                    key={category.id}
                    className="category-card"
                    onClick={() => setSelectedCategory(category.id)}
                  >
                    <Icon size={24} />
                    <span>{category.name}</span>
                  </button>
                );
              })}
            </div>
          </div>
        ) : (
          <>
            <div className="report-header">
              <div className="report-title">
                <h1>{reportDefinition?.name || 'Loading...'}</h1>
                <p>{reportDefinition?.description}</p>
              </div>
              <div className="report-actions">
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
            </div>

            {showFilters && reportDefinition?.filters && reportDefinition.filters.length > 0 && (
              <div className="report-filters card">
                <div className="filters-grid">
                  {reportDefinition.filters.map(filter => (
                    <div key={filter.key} className="filter-field">
                      <label>{filter.label}</label>
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
                <div className="filter-actions">
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

            <div className="report-results card">
              {loadingData ? (
                <div className="loading-state">
                  <Loader2 size={32} className="animate-spin" />
                  <p>Loading report data...</p>
                </div>
              ) : reportData && reportData.data.length > 0 ? (
                <>
                  <div className="table-container">
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
                              <td key={col.key}>{formatValue(row[col.key], col)}</td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <div className="report-pagination">
                    <span>
                      Showing {((page - 1) * 50) + 1} to {Math.min(page * 50, reportData.total)} of {reportData.total} records
                    </span>
                    <div className="pagination-buttons">
                      <button
                        className="btn btn-secondary"
                        onClick={() => setPage(p => Math.max(1, p - 1))}
                        disabled={page === 1}
                      >
                        Previous
                      </button>
                      <span className="page-number">Page {page} of {reportData.totalPages}</span>
                      <button
                        className="btn btn-secondary"
                        onClick={() => setPage(p => Math.min(reportData.totalPages, p + 1))}
                        disabled={page >= reportData.totalPages}
                      >
                        Next
                      </button>
                    </div>
                  </div>
                </>
              ) : (
                <div className="empty-state">
                  <FileText size={48} />
                  <h3>No Data Found</h3>
                  <p>Try adjusting your filters or select a different date range</p>
                </div>
              )}
            </div>
          </>
        )}
      </div>

      <style>{`
        .reports-layout {
          display: flex;
          height: calc(100vh - 64px);
          overflow: hidden;
        }

        .reports-sidebar {
          width: 280px;
          min-width: 280px;
          background: var(--card-bg);
          border-right: 1px solid var(--border-color);
          display: flex;
          flex-direction: column;
          overflow: hidden;
        }

        .sidebar-header {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          padding: 1rem 1.25rem;
          border-bottom: 1px solid var(--border-color);
          background: var(--card-bg);
        }

        .sidebar-header h2 {
          font-size: 1rem;
          font-weight: 600;
          margin: 0;
        }

        .sidebar-content {
          flex: 1;
          overflow-y: auto;
          padding: 0.5rem;
        }

        .category-section {
          margin-bottom: 0.25rem;
        }

        .category-header {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          width: 100%;
          padding: 0.625rem 0.75rem;
          border: none;
          background: transparent;
          text-align: left;
          cursor: pointer;
          border-radius: 6px;
          color: var(--text-primary);
          font-size: 0.875rem;
          font-weight: 500;
          transition: background 0.2s;
        }

        .category-header:hover {
          background: var(--hover-bg);
        }

        .category-header.expanded {
          background: var(--primary-light);
          color: var(--primary-color);
        }

        .category-header span {
          flex: 1;
        }

        .category-reports {
          padding-left: 1.25rem;
          margin-top: 0.25rem;
        }

        .report-item {
          display: block;
          width: 100%;
          padding: 0.5rem 0.75rem;
          border: none;
          background: transparent;
          text-align: left;
          cursor: pointer;
          border-radius: 4px;
          color: var(--text-secondary);
          font-size: 0.8125rem;
          transition: all 0.2s;
        }

        .report-item:hover {
          background: var(--hover-bg);
          color: var(--text-primary);
        }

        .report-item.active {
          background: var(--primary-color);
          color: white;
        }

        .reports-main {
          flex: 1;
          overflow-y: auto;
          padding: 1.5rem;
          background: var(--page-bg);
        }

        .reports-welcome {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          height: 100%;
          text-align: center;
          padding: 2rem;
        }

        .welcome-icon {
          color: var(--text-muted);
          margin-bottom: 1rem;
        }

        .reports-welcome h2 {
          font-size: 1.5rem;
          margin-bottom: 0.5rem;
        }

        .reports-welcome p {
          color: var(--text-secondary);
          margin-bottom: 2rem;
        }

        .category-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 1rem;
          max-width: 600px;
        }

        .category-card {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 0.75rem;
          padding: 1.5rem;
          background: var(--card-bg);
          border: 1px solid var(--border-color);
          border-radius: 8px;
          cursor: pointer;
          transition: all 0.2s;
        }

        .category-card:hover {
          border-color: var(--primary-color);
          transform: translateY(-2px);
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
        }

        .category-card span {
          font-size: 0.875rem;
          font-weight: 500;
          color: var(--text-primary);
        }

        .report-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          margin-bottom: 1rem;
        }

        .report-title h1 {
          font-size: 1.25rem;
          font-weight: 600;
          margin: 0 0 0.25rem 0;
        }

        .report-title p {
          color: var(--text-secondary);
          font-size: 0.875rem;
          margin: 0;
        }

        .report-actions {
          display: flex;
          gap: 0.5rem;
        }

        .report-filters {
          margin-bottom: 1rem;
          padding: 1rem;
        }

        .filters-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
          gap: 1rem;
          margin-bottom: 1rem;
        }

        .filter-field label {
          display: block;
          font-size: 0.75rem;
          font-weight: 500;
          color: var(--text-secondary);
          margin-bottom: 0.375rem;
        }

        .filter-actions {
          display: flex;
          gap: 0.5rem;
          padding-top: 1rem;
          border-top: 1px solid var(--border-color);
        }

        .report-results {
          padding: 0;
          overflow: hidden;
        }

        .table-container {
          overflow-x: auto;
        }

        .loading-state,
        .empty-state {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 3rem;
          color: var(--text-muted);
        }

        .loading-state p,
        .empty-state p {
          margin-top: 0.5rem;
          color: var(--text-secondary);
        }

        .empty-state h3 {
          margin: 1rem 0 0.5rem 0;
          color: var(--text-primary);
        }

        .report-pagination {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 1rem;
          border-top: 1px solid var(--border-color);
          font-size: 0.875rem;
          color: var(--text-secondary);
        }

        .pagination-buttons {
          display: flex;
          align-items: center;
          gap: 0.75rem;
        }

        .page-number {
          padding: 0 0.5rem;
        }

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
