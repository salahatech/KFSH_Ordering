import { Link, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ChevronRight, Home } from 'lucide-react';

interface BreadcrumbItem {
  label: string;
  labelKey?: string;
  path?: string;
}

const routeConfig: Record<string, { labelKey: string; fallback: string }> = {
  '': { labelKey: 'nav.dashboard', fallback: 'Dashboard' },
  'orders': { labelKey: 'nav.orders', fallback: 'Orders' },
  'customers': { labelKey: 'nav.customers', fallback: 'Customers' },
  'products': { labelKey: 'nav.products', fallback: 'Products' },
  'materials': { labelKey: 'nav.materials', fallback: 'Materials' },
  'recipes': { labelKey: 'nav.recipes', fallback: 'Recipes' },
  'suppliers': { labelKey: 'nav.suppliers', fallback: 'Suppliers' },
  'purchase-orders': { labelKey: 'nav.purchaseOrders', fallback: 'Purchase Orders' },
  'warehouses': { labelKey: 'nav.warehouses', fallback: 'Warehouses' },
  'grn': { labelKey: 'nav.goodsReceiving', fallback: 'Goods Receiving' },
  'inventory': { labelKey: 'nav.inventory', fallback: 'Inventory' },
  'manufacturing': { labelKey: 'nav.manufacturing', fallback: 'Manufacturing' },
  'availability': { labelKey: 'nav.availability', fallback: 'Availability' },
  'reservations': { labelKey: 'nav.reservations', fallback: 'Reservations' },
  'planner': { labelKey: 'nav.planner', fallback: 'Planner' },
  'production-schedule': { labelKey: 'nav.productionSchedule', fallback: 'Production Schedule' },
  'batches': { labelKey: 'nav.batches', fallback: 'Batches' },
  'qc': { labelKey: 'nav.qc', fallback: 'Quality Control' },
  'oos-investigations': { labelKey: 'nav.oosInvestigations', fallback: 'OOS Investigations' },
  'release': { labelKey: 'nav.release', fallback: 'QP Release' },
  'dispensing': { labelKey: 'nav.dispensing', fallback: 'Dispensing' },
  'shipments': { labelKey: 'nav.shipments', fallback: 'Shipments' },
  'contracts': { labelKey: 'nav.contracts', fallback: 'Contracts' },
  'invoices': { labelKey: 'nav.invoices', fallback: 'Invoices' },
  'payments': { labelKey: 'nav.payments', fallback: 'Payments' },
  'enterprise-reports': { labelKey: 'nav.reports', fallback: 'Reports' },
  'users': { labelKey: 'nav.users', fallback: 'Users' },
  'roles': { labelKey: 'nav.roles', fallback: 'Roles' },
  'settings': { labelKey: 'nav.settings', fallback: 'Settings' },
  'audit': { labelKey: 'nav.auditLog', fallback: 'Audit Log' },
  'approvals': { labelKey: 'nav.approvals', fallback: 'Approvals' },
  'new': { labelKey: 'common.new', fallback: 'New' },
  'edit': { labelKey: 'common.edit', fallback: 'Edit' },
  'details': { labelKey: 'common.details', fallback: 'Details' },
};

export default function Breadcrumbs() {
  const location = useLocation();
  const { t } = useTranslation();

  const pathSegments = location.pathname.split('/').filter(Boolean);

  if (pathSegments.length === 0) {
    return null;
  }

  const breadcrumbs: BreadcrumbItem[] = [
    { label: t('nav.dashboard'), labelKey: 'nav.dashboard', path: '/' },
  ];

  let currentPath = '';
  pathSegments.forEach((segment, index) => {
    currentPath += `/${segment}`;

    const isUuid = /^[0-9a-f-]{36}$/i.test(segment);
    const isNumeric = /^\d+$/.test(segment);

    if (isUuid || isNumeric) {
      breadcrumbs.push({
        label: `#${segment.slice(0, 8)}...`,
        path: index === pathSegments.length - 1 ? undefined : currentPath,
      });
    } else {
      const config = routeConfig[segment];
      const label = config ? t(config.labelKey, config.fallback) : segment.charAt(0).toUpperCase() + segment.slice(1);
      breadcrumbs.push({
        label,
        labelKey: config?.labelKey,
        path: index === pathSegments.length - 1 ? undefined : currentPath,
      });
    }
  });

  if (breadcrumbs.length <= 1) {
    return null;
  }

  return (
    <nav
      aria-label="Breadcrumb"
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '0.5rem',
        padding: '0.75rem 0',
        fontSize: '0.875rem',
      }}
    >
      {breadcrumbs.map((item, index) => (
        <div key={index} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          {index > 0 && (
            <ChevronRight size={14} style={{ color: 'var(--text-muted)' }} />
          )}
          {item.path ? (
            <Link
              to={item.path}
              style={{
                color: 'var(--text-muted)',
                textDecoration: 'none',
                display: 'flex',
                alignItems: 'center',
                gap: '0.25rem',
              }}
            >
              {index === 0 && <Home size={14} />}
              <span>{item.label}</span>
            </Link>
          ) : (
            <span style={{ color: 'var(--text-primary)', fontWeight: 500 }}>
              {item.label}
            </span>
          )}
        </div>
      ))}
    </nav>
  );
}
