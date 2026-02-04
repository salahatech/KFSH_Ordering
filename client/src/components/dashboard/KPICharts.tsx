import { useMemo } from 'react';
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';

interface ChartData {
  name: string;
  value: number;
  [key: string]: any;
}

interface KPIChartProps {
  title: string;
  subtitle?: string;
  data: ChartData[];
  type: 'area' | 'bar' | 'line' | 'pie' | 'donut';
  dataKey?: string;
  colors?: string[];
  height?: number;
  trend?: { value: number; direction: 'up' | 'down' | 'flat' };
  target?: number;
}

const defaultColors = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4'];

function TrendIndicator({ value, direction }: { value: number; direction: 'up' | 'down' | 'flat' }) {
  const Icon = direction === 'up' ? TrendingUp : direction === 'down' ? TrendingDown : Minus;
  const color = direction === 'up' ? '#10b981' : direction === 'down' ? '#ef4444' : '#6b7280';
  
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', color }}>
      <Icon size={14} />
      <span style={{ fontSize: '0.75rem', fontWeight: 600 }}>{Math.abs(value)}%</span>
    </div>
  );
}

export function KPIChart({
  title,
  subtitle,
  data,
  type,
  dataKey = 'value',
  colors = defaultColors,
  height = 200,
  trend,
  target,
}: KPIChartProps) {
  const chartContent = useMemo(() => {
    switch (type) {
      case 'area':
        return (
          <ResponsiveContainer width="100%" height={height}>
            <AreaChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id={`gradient-${title}`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={colors[0]} stopOpacity={0.3}/>
                  <stop offset="95%" stopColor={colors[0]} stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis dataKey="name" tick={{ fontSize: 11 }} stroke="var(--text-muted)" />
              <YAxis tick={{ fontSize: 11 }} stroke="var(--text-muted)" />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: 'var(--bg-primary)', 
                  border: '1px solid var(--border)',
                  borderRadius: '8px',
                  fontSize: '12px',
                }} 
              />
              <Area 
                type="monotone" 
                dataKey={dataKey} 
                stroke={colors[0]} 
                strokeWidth={2}
                fill={`url(#gradient-${title})`} 
              />
              {target && (
                <Line 
                  type="monotone" 
                  dataKey={() => target} 
                  stroke="#ef4444" 
                  strokeDasharray="5 5" 
                  strokeWidth={1}
                  dot={false}
                />
              )}
            </AreaChart>
          </ResponsiveContainer>
        );
        
      case 'bar':
        return (
          <ResponsiveContainer width="100%" height={height}>
            <BarChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis dataKey="name" tick={{ fontSize: 11 }} stroke="var(--text-muted)" />
              <YAxis tick={{ fontSize: 11 }} stroke="var(--text-muted)" />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: 'var(--bg-primary)', 
                  border: '1px solid var(--border)',
                  borderRadius: '8px',
                  fontSize: '12px',
                }} 
              />
              <Bar dataKey={dataKey} fill={colors[0]} radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        );
        
      case 'line':
        return (
          <ResponsiveContainer width="100%" height={height}>
            <LineChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis dataKey="name" tick={{ fontSize: 11 }} stroke="var(--text-muted)" />
              <YAxis tick={{ fontSize: 11 }} stroke="var(--text-muted)" />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: 'var(--bg-primary)', 
                  border: '1px solid var(--border)',
                  borderRadius: '8px',
                  fontSize: '12px',
                }} 
              />
              <Line 
                type="monotone" 
                dataKey={dataKey} 
                stroke={colors[0]} 
                strokeWidth={2}
                dot={{ fill: colors[0], strokeWidth: 2 }}
              />
            </LineChart>
          </ResponsiveContainer>
        );
        
      case 'pie':
      case 'donut':
        return (
          <ResponsiveContainer width="100%" height={height}>
            <PieChart>
              <Pie
                data={data}
                cx="50%"
                cy="50%"
                innerRadius={type === 'donut' ? 50 : 0}
                outerRadius={70}
                paddingAngle={2}
                dataKey={dataKey}
              >
                {data.map((_, index) => (
                  <Cell key={`cell-${index}`} fill={colors[index % colors.length]} />
                ))}
              </Pie>
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: 'var(--bg-primary)', 
                  border: '1px solid var(--border)',
                  borderRadius: '8px',
                  fontSize: '12px',
                }} 
              />
              <Legend 
                wrapperStyle={{ fontSize: '11px' }}
                formatter={(value: string) => <span style={{ color: 'var(--text-secondary)' }}>{value}</span>}
              />
            </PieChart>
          </ResponsiveContainer>
        );
        
      default:
        return null;
    }
  }, [data, type, dataKey, colors, height, title, target]);

  return (
    <div className="card" style={{ padding: '1.25rem' }}>
      <div style={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'flex-start',
        marginBottom: '1rem' 
      }}>
        <div>
          <h3 style={{ 
            fontSize: '0.875rem', 
            fontWeight: 600, 
            color: 'var(--text-secondary)',
            margin: 0,
          }}>
            {title}
          </h3>
          {subtitle && (
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
              {subtitle}
            </span>
          )}
        </div>
        {trend && <TrendIndicator value={trend.value} direction={trend.direction} />}
      </div>
      {chartContent}
    </div>
  );
}

interface KPIChartsGridProps {
  throughputData?: ChartData[];
  qcPassRateData?: ChartData[];
  deliveryData?: ChartData[];
  orderDistribution?: ChartData[];
}

export function KPIChartsGrid({
  throughputData = [],
  qcPassRateData = [],
  deliveryData = [],
  orderDistribution = [],
}: KPIChartsGridProps) {
  return (
    <div style={{ 
      display: 'grid', 
      gridTemplateColumns: 'repeat(2, 1fr)', 
      gap: '1rem',
      marginBottom: '1.5rem',
    }}>
      <KPIChart
        title="Production Throughput"
        subtitle="Batches completed (last 7 days)"
        data={throughputData}
        type="area"
        colors={['#3b82f6']}
        trend={{ value: 12, direction: 'up' }}
      />
      <KPIChart
        title="QC Pass Rate"
        subtitle="First-time pass rate (%)"
        data={qcPassRateData}
        type="bar"
        colors={['#10b981']}
        target={95}
        trend={{ value: 2, direction: 'up' }}
      />
      <KPIChart
        title="On-Time Delivery"
        subtitle="Delivery performance (%)"
        data={deliveryData}
        type="line"
        colors={['#8b5cf6']}
        trend={{ value: 5, direction: 'up' }}
      />
      <KPIChart
        title="Order Distribution"
        subtitle="By status"
        data={orderDistribution}
        type="donut"
        colors={['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6']}
      />
    </div>
  );
}
