import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import api from '../lib/api';
import { format, subDays } from 'date-fns';
import { 
  FileText, Boxes, Factory, ShoppingCart, ClipboardCheck, 
  Truck, Receipt, Building2, Package, Calendar, CreditCard, 
  Users, Filter, ChevronDown, ChevronRight, Search,
  FileSpreadsheet, File, X, Loader2, BarChart3, AlertCircle,
  ArrowLeft, TrendingUp, CheckCircle, Clock, PieChart as PieChartIcon
} from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { useToast } from '../components/ui/Toast';
import { PageHeader } from '../components/shared';

const CHART_COLORS = ['#2563eb', '#22c55e', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4'];

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

type ViewMode = 'dashboard' | 'reports';

export default function EnterpriseReports() {
  const toast = useToast();
  const [viewMode, setViewMode] = useState<ViewMode>('dashboard');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [selectedReport, setSelectedReport] = useState<string | null>(null);
  const [filters, setFilters] = useState<Record<string, any>>({});
  const [page, setPage] = useState(1);
  const [showFilters, setShowFilters] = useState(true);
  const [exporting, setExporting] = useState<'excel' | 'pdf' | null>(null);
  
  const [dateRange, setDateRange] = useState({
    fromDate: format(subDays(new Date(), 7), 'yyyy-MM-dd'),
    toDate: format(new Date(), 'yyyy-MM-dd'),
  });

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

  const { data: dailyProduction } = useQuery({
    queryKey: ['daily-production', dateRange],
    queryFn: async () => {
      const { data } = await api.get('/reports/daily-production', { params: dateRange });
      return data;
    },
    enabled: viewMode === 'dashboard'
  });

  const { data: onTimeDelivery } = useQuery({
    queryKey: ['on-time-delivery', dateRange],
    queryFn: async () => {
      const { data } = await api.get('/reports/on-time-delivery', { params: dateRange });
      return data;
    },
    enabled: viewMode === 'dashboard'
  });

  const { data: qcPassRate } = useQuery({
    queryKey: ['qc-pass-rate', dateRange],
    queryFn: async () => {
      const { data } = await api.get('/reports/qc-pass-rate', { params: dateRange });
      return data;
    },
    enabled: viewMode === 'dashboard'
  });

  const { data: capacityUtilization } = useQuery({
    queryKey: ['capacity-utilization', dateRange],
    queryFn: async () => {
      const { data } = await api.get('/reports/capacity-utilization', { params: dateRange });
      return data;
    },
    enabled: viewMode === 'dashboard'
  });

  const { data: orderTurnaround } = useQuery({
    queryKey: ['order-turnaround', dateRange],
    queryFn: async () => {
      const { data } = await api.get('/reports/order-turnaround', { params: dateRange });
      return data;
    },
    enabled: viewMode === 'dashboard'
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

  const handleSelectReport = (reportKey: string) => {
    if (selectedReport === reportKey) {
      setSelectedReport(null);
    } else {
      setSelectedReport(reportKey);
      setFilters({});
      setPage(1);
    }
  };

  const handleSelectCategory = (categoryId: string) => {
    if (selectedCategory === categoryId) {
      setSelectedCategory(null);
      setSelectedReport(null);
    } else {
      setSelectedCategory(categoryId);
      setSelectedReport(null);
      setFilters({});
    }
  };

  const currentCategoryReports = selectedCategory ? (groupedReports[selectedCategory] || []) : [];
  const currentCategoryName = categories.find(c => c.id === selectedCategory)?.name || '';

  return (
    <div>
      <PageHeader
        title="Enterprise Reporting Center"
        subtitle="Analytics dashboard and comprehensive reports across all business areas"
      />

      <div style={{ 
        display: 'flex', 
        gap: '0.25rem', 
        marginBottom: '1.5rem',
        borderBottom: '1px solid var(--border)',
        paddingBottom: '0'
      }}>
        <button
          onClick={() => { setViewMode('dashboard'); setSelectedCategory(null); setSelectedReport(null); }}
          style={{
            padding: '0.75rem 1.25rem',
            border: 'none',
            background: 'transparent',
            cursor: 'pointer',
            fontSize: '0.9375rem',
            fontWeight: 500,
            color: viewMode === 'dashboard' ? 'var(--primary)' : 'var(--text-muted)',
            borderBottom: viewMode === 'dashboard' ? '2px solid var(--primary)' : '2px solid transparent',
            marginBottom: '-1px',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            transition: 'all 0.2s'
          }}
        >
          <BarChart3 size={18} />
          Analytics Dashboard
        </button>
        <button
          onClick={() => { setViewMode('reports'); setSelectedCategory(null); setSelectedReport(null); }}
          style={{
            padding: '0.75rem 1.25rem',
            border: 'none',
            background: 'transparent',
            cursor: 'pointer',
            fontSize: '0.9375rem',
            fontWeight: 500,
            color: viewMode === 'reports' ? 'var(--primary)' : 'var(--text-muted)',
            borderBottom: viewMode === 'reports' ? '2px solid var(--primary)' : '2px solid transparent',
            marginBottom: '-1px',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            transition: 'all 0.2s'
          }}
        >
          <FileText size={18} />
          Report Categories
        </button>
      </div>

      {viewMode === 'dashboard' && (
        <div>
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '1rem' }}>
            <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
              <Calendar size={18} style={{ color: 'var(--text-muted)' }} />
              <input
                type="date"
                className="form-input"
                style={{ width: 'auto', padding: '0.375rem 0.625rem' }}
                value={dateRange.fromDate}
                onChange={(e) => setDateRange({ ...dateRange, fromDate: e.target.value })}
              />
              <span style={{ color: 'var(--text-muted)' }}>to</span>
              <input
                type="date"
                className="form-input"
                style={{ width: 'auto', padding: '0.375rem 0.625rem' }}
                value={dateRange.toDate}
                onChange={(e) => setDateRange({ ...dateRange, toDate: e.target.value })}
              />
            </div>
          </div>

          <div className="grid grid-4" style={{ marginBottom: '1.5rem' }}>
            <div className="card stat-card">
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                <Truck size={20} color="var(--primary)" />
                <span className="stat-label">On-Time Delivery</span>
              </div>
              <div className="stat-value">{onTimeDelivery?.onTimeRate || 0}%</div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                {onTimeDelivery?.onTime || 0} of {onTimeDelivery?.totalDelivered || 0} deliveries
              </div>
            </div>

            <div className="card stat-card">
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                <CheckCircle size={20} color="var(--success)" />
                <span className="stat-label">QC Pass Rate</span>
              </div>
              <div className="stat-value">{qcPassRate?.passRate || 0}%</div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                {qcPassRate?.passed || 0} passed, {qcPassRate?.failed || 0} failed
              </div>
            </div>

            <div className="card stat-card">
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                <Clock size={20} color="var(--warning)" />
                <span className="stat-label">Avg Turnaround</span>
              </div>
              <div className="stat-value">{orderTurnaround?.averageTurnaroundHours || 0}h</div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                Order to delivery
              </div>
            </div>

            <div className="card stat-card">
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                <TrendingUp size={20} color="var(--info)" />
                <span className="stat-label">Total Orders</span>
              </div>
              <div className="stat-value">{orderTurnaround?.totalOrders || 0}</div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                Delivered in period
              </div>
            </div>
          </div>

          <div className="grid grid-2" style={{ marginBottom: '1.5rem' }}>
            <div className="card">
              <div style={{ padding: '1rem 1.5rem', borderBottom: '1px solid var(--border)' }}>
                <h3 style={{ fontWeight: 600, margin: 0 }}>Daily Production Summary</h3>
              </div>
              <div style={{ padding: '1.5rem', height: '300px' }}>
                {dailyProduction?.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={dailyProduction}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="date" tickFormatter={(val) => format(new Date(val), 'MMM dd')} />
                      <YAxis />
                      <Tooltip />
                      <Bar dataKey="totalBatches" fill="#2563eb" name="Batches" />
                      <Bar dataKey="totalOrders" fill="#22c55e" name="Orders" />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'var(--text-muted)' }}>
                    No production data for this period
                  </div>
                )}
              </div>
            </div>

            <div className="card">
              <div style={{ padding: '1rem 1.5rem', borderBottom: '1px solid var(--border)' }}>
                <h3 style={{ fontWeight: 600, margin: 0 }}>QC Pass Rate by Product</h3>
              </div>
              <div style={{ padding: '1.5rem', height: '300px' }}>
                {qcPassRate?.byProduct && Object.keys(qcPassRate.byProduct).length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={Object.entries(qcPassRate.byProduct).map(([name, stats]: [string, any]) => ({
                          name,
                          value: stats.passed,
                        }))}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={({ name, percent }: { name: string; percent?: number }) => 
                          `${name} (${((percent || 0) * 100).toFixed(0)}%)`
                        }
                        outerRadius={100}
                        fill="#8884d8"
                        dataKey="value"
                      >
                        {Object.entries(qcPassRate.byProduct).map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'var(--text-muted)' }}>
                    No QC data for this period
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="card">
            <div style={{ padding: '1rem 1.5rem', borderBottom: '1px solid var(--border)' }}>
              <h3 style={{ fontWeight: 600, margin: 0 }}>Capacity Utilization</h3>
            </div>
            <div style={{ padding: 0 }}>
              {capacityUtilization?.length > 0 ? (
                <table className="table">
                  <thead>
                    <tr>
                      <th>Equipment</th>
                      <th>Type</th>
                      <th>Batches</th>
                      <th>Minutes Used</th>
                      <th>Utilization</th>
                    </tr>
                  </thead>
                  <tbody>
                    {capacityUtilization.map((item: any) => (
                      <tr key={item.equipment}>
                        <td style={{ fontWeight: 500 }}>{item.equipment}</td>
                        <td>{item.type}</td>
                        <td>{item.batchCount}</td>
                        <td>{item.minutesUsed.toFixed(0)} min</td>
                        <td>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <div style={{
                              width: '100px',
                              height: '8px',
                              background: 'var(--bg-tertiary)',
                              borderRadius: '4px',
                              overflow: 'hidden',
                            }}>
                              <div style={{
                                width: `${item.utilizationPercent}%`,
                                height: '100%',
                                background: parseFloat(item.utilizationPercent) > 80 ? 'var(--success)' : 'var(--primary)',
                                borderRadius: '4px',
                              }} />
                            </div>
                            <span>{item.utilizationPercent}%</span>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                  No capacity data for this period
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {viewMode === 'reports' && !selectedCategory && (
        <div>
          <div className="card" style={{ padding: '2rem', marginBottom: '1.5rem', textAlign: 'center' }}>
            <FileText size={40} style={{ color: 'var(--primary)', marginBottom: '1rem' }} />
            <h2 style={{ fontSize: '1.25rem', fontWeight: 600, marginBottom: '0.5rem' }}>
              Select a Report Category
            </h2>
            <p style={{ color: 'var(--text-muted)', margin: 0 }}>
              Choose a category below to view available reports
            </p>
          </div>

          <div style={{ 
            display: 'grid', 
            gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', 
            gap: '1rem' 
          }}>
            {categories.map(category => {
              const Icon = CATEGORY_ICONS[category.id] || FileText;
              const color = CATEGORY_COLORS[category.id] || 'default';
              const reportCount = groupedReports[category.id]?.length || 0;
              
              return (
                <button
                  key={category.id}
                  onClick={() => handleSelectCategory(category.id)}
                  className="card"
                  style={{
                    padding: '1.5rem',
                    border: '1px solid var(--border)',
                    cursor: 'pointer',
                    textAlign: 'center',
                    transition: 'all 0.2s',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.borderColor = 'var(--primary)';
                    e.currentTarget.style.transform = 'translateY(-2px)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.borderColor = 'var(--border)';
                    e.currentTarget.style.transform = 'translateY(0)';
                  }}
                >
                  <div style={{ 
                    width: '48px', 
                    height: '48px', 
                    borderRadius: '12px', 
                    background: `var(--${color === 'default' ? 'bg-secondary' : color + '-light'}, var(--bg-secondary))`,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    margin: '0 auto 0.75rem'
                  }}>
                    <Icon size={24} style={{ color: `var(--${color === 'default' ? 'text-muted' : color})` }} />
                  </div>
                  <div style={{ fontSize: '0.9375rem', fontWeight: 600, marginBottom: '0.25rem' }}>{category.name}</div>
                  <div style={{ fontSize: '0.8125rem', color: 'var(--text-muted)' }}>{reportCount} reports</div>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {viewMode === 'reports' && selectedCategory && (
        <div>
          <div style={{ 
            display: 'flex', 
            alignItems: 'center', 
            gap: '0.75rem',
            marginBottom: '1.5rem',
            paddingBottom: '1rem',
            borderBottom: '1px solid var(--border)'
          }}>
            <button
              className="btn btn-secondary"
              onClick={() => { setSelectedCategory(null); setSelectedReport(null); }}
              style={{ padding: '0.375rem 0.625rem' }}
            >
              <ArrowLeft size={16} />
            </button>
            {(() => {
              const Icon = CATEGORY_ICONS[selectedCategory] || FileText;
              return <Icon size={24} style={{ color: 'var(--primary)' }} />;
            })()}
            <div>
              <h2 style={{ fontSize: '1.125rem', fontWeight: 600, margin: 0 }}>{currentCategoryName}</h2>
              <p style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', margin: 0 }}>
                {currentCategoryReports.length} reports available - click a report to view data
              </p>
            </div>
          </div>

          {currentCategoryReports.length === 0 ? (
            <div className="card" style={{ padding: '3rem', textAlign: 'center' }}>
              <AlertCircle size={32} style={{ color: 'var(--text-muted)', marginBottom: '1rem' }} />
              <h3 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '0.5rem' }}>No Reports Available</h3>
              <p style={{ color: 'var(--text-muted)' }}>
                There are no reports in this category or you don't have access to them.
              </p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {currentCategoryReports.map(report => {
                const isSelected = selectedReport === report.key;
                const CategoryIcon = CATEGORY_ICONS[selectedCategory] || FileText;
                
                return (
                  <div key={report.key} className="card" style={{ padding: 0, overflow: 'hidden' }}>
                    <button
                      onClick={() => handleSelectReport(report.key)}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '1rem',
                        width: '100%',
                        padding: '1rem 1.25rem',
                        border: 'none',
                        background: isSelected ? 'var(--primary-light, #eff6ff)' : 'transparent',
                        textAlign: 'left',
                        cursor: 'pointer',
                        transition: 'background 0.2s',
                      }}
                    >
                      <div style={{ 
                        padding: '0.625rem', 
                        borderRadius: '8px', 
                        background: isSelected ? 'var(--primary)' : 'var(--bg-secondary)',
                        color: isSelected ? 'white' : 'var(--text-muted)'
                      }}>
                        <CategoryIcon size={20} />
                      </div>
                      <div style={{ flex: 1 }}>
                        <div style={{ 
                          fontSize: '0.9375rem', 
                          fontWeight: 600, 
                          color: isSelected ? 'var(--primary)' : 'var(--text-primary)',
                          marginBottom: '0.125rem'
                        }}>
                          {report.name}
                        </div>
                        <div style={{ fontSize: '0.8125rem', color: 'var(--text-muted)' }}>
                          {report.description}
                        </div>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        {isSelected && (
                          <span style={{ 
                            fontSize: '0.75rem', 
                            color: 'var(--primary)',
                            fontWeight: 500
                          }}>
                            Viewing
                          </span>
                        )}
                        {isSelected ? <ChevronDown size={18} /> : <ChevronRight size={18} />}
                      </div>
                    </button>

                    {isSelected && (
                      <div style={{ borderTop: '1px solid var(--border)' }}>
                        <div style={{ 
                          display: 'flex', 
                          justifyContent: 'space-between', 
                          alignItems: 'center',
                          padding: '1rem 1.25rem',
                          background: 'var(--bg-secondary)',
                          borderBottom: '1px solid var(--border)'
                        }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                            <button
                              className={`btn ${showFilters ? 'btn-primary' : 'btn-secondary'}`}
                              onClick={() => setShowFilters(!showFilters)}
                              style={{ padding: '0.5rem 0.75rem' }}
                            >
                              <Filter size={14} />
                              Filters
                              {Object.keys(filters).filter(k => filters[k]).length > 0 && (
                                <span style={{ 
                                  marginLeft: '0.375rem',
                                  padding: '0.125rem 0.375rem',
                                  borderRadius: '10px',
                                  fontSize: '0.6875rem',
                                  background: showFilters ? 'white' : 'var(--primary)',
                                  color: showFilters ? 'var(--primary)' : 'white'
                                }}>
                                  {Object.keys(filters).filter(k => filters[k]).length}
                                </span>
                              )}
                            </button>
                            {reportData && (
                              <span style={{ fontSize: '0.8125rem', color: 'var(--text-muted)' }}>
                                {reportData.total} records found
                              </span>
                            )}
                          </div>
                          <div style={{ display: 'flex', gap: '0.5rem' }}>
                            <button
                              className="btn btn-secondary"
                              onClick={() => handleExport('excel')}
                              disabled={exporting !== null || !reportData?.data.length}
                              style={{ padding: '0.5rem 0.75rem' }}
                            >
                              {exporting === 'excel' ? (
                                <Loader2 size={14} className="animate-spin" />
                              ) : (
                                <FileSpreadsheet size={14} />
                              )}
                              Excel
                            </button>
                            <button
                              className="btn btn-secondary"
                              onClick={() => handleExport('pdf')}
                              disabled={exporting !== null || !reportData?.data.length}
                              style={{ padding: '0.5rem 0.75rem' }}
                            >
                              {exporting === 'pdf' ? (
                                <Loader2 size={14} className="animate-spin" />
                              ) : (
                                <File size={14} />
                              )}
                              PDF
                            </button>
                          </div>
                        </div>

                        {showFilters && reportDefinition?.filters && reportDefinition.filters.length > 0 && (
                          <div style={{ 
                            padding: '1rem 1.25rem',
                            background: 'var(--bg-secondary)',
                            borderBottom: '1px solid var(--border)'
                          }}>
                            <div style={{ 
                              display: 'grid', 
                              gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', 
                              gap: '0.75rem',
                              marginBottom: '0.75rem'
                            }}>
                              {reportDefinition.filters.map(filter => (
                                <div key={filter.key} className="form-group" style={{ margin: 0 }}>
                                  <label className="form-label" style={{ fontSize: '0.6875rem', marginBottom: '0.25rem' }}>
                                    {filter.label}
                                  </label>
                                  {filter.type === 'text' && (
                                    <input
                                      type="text"
                                      className="form-input"
                                      style={{ padding: '0.375rem 0.625rem', fontSize: '0.8125rem' }}
                                      value={filters[filter.key] || ''}
                                      onChange={(e) => handleFilterChange(filter.key, e.target.value)}
                                      placeholder={`Enter ${filter.label.toLowerCase()}`}
                                    />
                                  )}
                                  {filter.type === 'date' && (
                                    <input
                                      type="date"
                                      className="form-input"
                                      style={{ padding: '0.375rem 0.625rem', fontSize: '0.8125rem' }}
                                      value={filters[filter.key] || ''}
                                      onChange={(e) => handleFilterChange(filter.key, e.target.value)}
                                    />
                                  )}
                                  {filter.type === 'number' && (
                                    <input
                                      type="number"
                                      className="form-input"
                                      style={{ padding: '0.375rem 0.625rem', fontSize: '0.8125rem' }}
                                      value={filters[filter.key] || filter.defaultValue || ''}
                                      onChange={(e) => handleFilterChange(filter.key, e.target.value)}
                                    />
                                  )}
                                  {filter.type === 'select' && filter.options && (
                                    <select
                                      className="form-select"
                                      style={{ padding: '0.375rem 0.625rem', fontSize: '0.8125rem' }}
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
                            <div style={{ display: 'flex', gap: '0.5rem' }}>
                              <button 
                                className="btn btn-primary" 
                                onClick={() => refetch()}
                                style={{ padding: '0.375rem 0.75rem', fontSize: '0.8125rem' }}
                              >
                                <Search size={14} />
                                Apply
                              </button>
                              <button 
                                className="btn btn-secondary" 
                                onClick={clearFilters}
                                style={{ padding: '0.375rem 0.75rem', fontSize: '0.8125rem' }}
                              >
                                <X size={14} />
                                Clear
                              </button>
                            </div>
                          </div>
                        )}

                        {loadingData ? (
                          <div style={{ 
                            display: 'flex', 
                            flexDirection: 'column', 
                            alignItems: 'center', 
                            justifyContent: 'center', 
                            padding: '3rem' 
                          }}>
                            <Loader2 size={32} className="animate-spin" style={{ color: 'var(--primary)' }} />
                            <p style={{ marginTop: '0.75rem', color: 'var(--text-muted)' }}>Loading report data...</p>
                          </div>
                        ) : !reportData?.data.length ? (
                          <div style={{ 
                            display: 'flex', 
                            flexDirection: 'column', 
                            alignItems: 'center', 
                            justifyContent: 'center', 
                            padding: '3rem' 
                          }}>
                            <AlertCircle size={32} style={{ color: 'var(--text-muted)' }} />
                            <h3 style={{ margin: '1rem 0 0.5rem 0', fontSize: '1rem', color: 'var(--text-primary)' }}>
                              No Data Found
                            </h3>
                            <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>
                              Try adjusting your filters to see results
                            </p>
                          </div>
                        ) : (
                          <>
                            <div style={{ overflowX: 'auto' }}>
                              <table className="table">
                                <thead>
                                  <tr>
                                    {reportDefinition?.columns.map(col => (
                                      <th key={col.key} style={{ fontSize: '0.75rem' }}>{col.label}</th>
                                    ))}
                                  </tr>
                                </thead>
                                <tbody>
                                  {reportData.data.map((row, idx) => (
                                    <tr key={row.id || idx}>
                                      {reportDefinition?.columns.map(col => (
                                        <td key={col.key} style={{ fontSize: '0.8125rem' }}>
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
                              padding: '0.75rem 1.25rem',
                              borderTop: '1px solid var(--border)',
                              fontSize: '0.8125rem',
                              color: 'var(--text-muted)',
                              background: 'var(--bg-secondary)'
                            }}>
                              <span>
                                Showing {((page - 1) * 25) + 1} - {Math.min(page * 25, reportData.total)} of {reportData.total}
                              </span>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                <button
                                  className="btn btn-secondary"
                                  disabled={page <= 1}
                                  onClick={() => setPage(p => p - 1)}
                                  style={{ padding: '0.25rem 0.5rem', fontSize: '0.75rem' }}
                                >
                                  Previous
                                </button>
                                <span style={{ padding: '0 0.5rem' }}>
                                  Page {page} of {reportData.totalPages}
                                </span>
                                <button
                                  className="btn btn-secondary"
                                  disabled={page >= reportData.totalPages}
                                  onClick={() => setPage(p => p + 1)}
                                  style={{ padding: '0.25rem 0.5rem', fontSize: '0.75rem' }}
                                >
                                  Next
                                </button>
                              </div>
                            </div>
                          </>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

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
