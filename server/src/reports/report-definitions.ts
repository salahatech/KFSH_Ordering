export interface ReportDefinition {
  key: string;
  name: string;
  description: string;
  category: string;
  allowedRoles: string[];
  filters: FilterDefinition[];
  columns: ColumnDefinition[];
  defaultSort?: { field: string; direction: 'asc' | 'desc' };
  drillDownEntity?: string;
  drillDownRoute?: string;
}

export interface FilterDefinition {
  key: string;
  label: string;
  type: 'text' | 'select' | 'date' | 'dateRange' | 'number' | 'boolean';
  options?: { value: string; label: string }[];
  defaultValue?: any;
}

export interface ColumnDefinition {
  key: string;
  label: string;
  type: 'text' | 'number' | 'date' | 'datetime' | 'currency' | 'badge' | 'percent';
  sortable?: boolean;
  width?: string;
  badgeMap?: Record<string, string>;
}

export const REPORT_CATEGORIES = [
  { id: 'inventory', name: 'Inventory & Warehouse', icon: 'Boxes' },
  { id: 'production', name: 'Production & Batches', icon: 'Factory' },
  { id: 'orders', name: 'Orders & Reservations', icon: 'ShoppingCart' },
  { id: 'quality', name: 'Quality & QP Release', icon: 'ClipboardCheck' },
  { id: 'dispensing', name: 'Dispensing', icon: 'Syringe' },
  { id: 'logistics', name: 'Logistics & Deliveries', icon: 'Truck' },
  { id: 'finance', name: 'Finance & Invoicing', icon: 'Receipt' },
  { id: 'customers', name: 'Customers & Contracts', icon: 'Building2' },
  { id: 'products', name: 'Products & Pricing', icon: 'Package' },
  { id: 'planner', name: 'Planner & Capacity', icon: 'Calendar' },
  { id: 'payments', name: 'Payments & Approvals', icon: 'CreditCard' },
  { id: 'users', name: 'Users & Security', icon: 'Users' },
  { id: 'audit', name: 'Audit & Compliance', icon: 'FileText' },
];

export const REPORT_DEFINITIONS: ReportDefinition[] = [
  {
    key: 'inventory-balance',
    name: 'Inventory Balance Report',
    description: 'Current stock levels by item, lot, bin, and status',
    category: 'inventory',
    allowedRoles: ['ADMIN', 'INVENTORY', 'WAREHOUSE', 'PRODUCTION'],
    filters: [
      { key: 'materialId', label: 'Material', type: 'select' },
      { key: 'warehouseId', label: 'Warehouse', type: 'select' },
      { key: 'status', label: 'Status', type: 'select', options: [
        { value: 'AVAILABLE', label: 'Available' },
        { value: 'QUARANTINE', label: 'Quarantine' },
        { value: 'RESERVED', label: 'Reserved' },
        { value: 'ON_HOLD', label: 'On Hold' },
        { value: 'EXPIRED', label: 'Expired' },
      ]},
      { key: 'lotNumber', label: 'Lot Number', type: 'text' },
    ],
    columns: [
      { key: 'materialCode', label: 'Material Code', type: 'text', sortable: true },
      { key: 'materialName', label: 'Material Name', type: 'text', sortable: true },
      { key: 'lotNumber', label: 'Lot Number', type: 'text', sortable: true },
      { key: 'warehouseName', label: 'Warehouse', type: 'text', sortable: true },
      { key: 'location', label: 'Location', type: 'text' },
      { key: 'quantity', label: 'Quantity', type: 'number', sortable: true },
      { key: 'unit', label: 'Unit', type: 'text' },
      { key: 'status', label: 'Status', type: 'badge', badgeMap: {
        'AVAILABLE': 'success', 'QUARANTINE': 'warning', 'RESERVED': 'info',
        'ON_HOLD': 'default', 'EXPIRED': 'danger'
      }},
      { key: 'expiryDate', label: 'Expiry Date', type: 'date', sortable: true },
    ],
    defaultSort: { field: 'materialName', direction: 'asc' },
    drillDownEntity: 'Stock',
    drillDownRoute: '/inventory',
  },
  {
    key: 'inventory-aging',
    name: 'Inventory Aging & Expiry',
    description: 'Stock aging analysis and expiry tracking',
    category: 'inventory',
    allowedRoles: ['ADMIN', 'INVENTORY', 'WAREHOUSE', 'QC'],
    filters: [
      { key: 'warehouseId', label: 'Warehouse', type: 'select' },
      { key: 'expiryDays', label: 'Expiring Within (Days)', type: 'number', defaultValue: 30 },
    ],
    columns: [
      { key: 'materialCode', label: 'Material Code', type: 'text', sortable: true },
      { key: 'materialName', label: 'Material Name', type: 'text', sortable: true },
      { key: 'lotNumber', label: 'Lot Number', type: 'text' },
      { key: 'quantity', label: 'Quantity', type: 'number' },
      { key: 'expiryDate', label: 'Expiry Date', type: 'date', sortable: true },
      { key: 'daysToExpiry', label: 'Days to Expiry', type: 'number', sortable: true },
      { key: 'ageInDays', label: 'Age (Days)', type: 'number', sortable: true },
      { key: 'status', label: 'Status', type: 'badge' },
    ],
    defaultSort: { field: 'daysToExpiry', direction: 'asc' },
  },
  {
    key: 'batch-status-summary',
    name: 'Batch Status Summary',
    description: 'Overview of all batches by status',
    category: 'production',
    allowedRoles: ['ADMIN', 'PRODUCTION', 'QC', 'QP'],
    filters: [
      { key: 'productId', label: 'Product', type: 'select' },
      { key: 'status', label: 'Status', type: 'select' },
      { key: 'dateFrom', label: 'From Date', type: 'date' },
      { key: 'dateTo', label: 'To Date', type: 'date' },
    ],
    columns: [
      { key: 'batchNumber', label: 'Batch Number', type: 'text', sortable: true },
      { key: 'productName', label: 'Product', type: 'text', sortable: true },
      { key: 'productionDate', label: 'Production Date', type: 'date', sortable: true },
      { key: 'plannedQuantity', label: 'Planned Qty', type: 'number' },
      { key: 'actualQuantity', label: 'Actual Qty', type: 'number' },
      { key: 'yieldPercent', label: 'Yield %', type: 'percent' },
      { key: 'status', label: 'Status', type: 'badge' },
      { key: 'calibrationTime', label: 'Calibration Time', type: 'datetime' },
    ],
    defaultSort: { field: 'productionDate', direction: 'desc' },
    drillDownEntity: 'Batch',
    drillDownRoute: '/batches',
  },
  {
    key: 'batch-yield',
    name: 'Batch Yield Report',
    description: 'Planned vs actual yield analysis',
    category: 'production',
    allowedRoles: ['ADMIN', 'PRODUCTION', 'QC'],
    filters: [
      { key: 'productId', label: 'Product', type: 'select' },
      { key: 'dateFrom', label: 'From Date', type: 'date' },
      { key: 'dateTo', label: 'To Date', type: 'date' },
    ],
    columns: [
      { key: 'batchNumber', label: 'Batch Number', type: 'text', sortable: true },
      { key: 'productName', label: 'Product', type: 'text' },
      { key: 'productionDate', label: 'Date', type: 'date', sortable: true },
      { key: 'plannedQuantity', label: 'Planned', type: 'number' },
      { key: 'actualQuantity', label: 'Actual', type: 'number' },
      { key: 'variance', label: 'Variance', type: 'number' },
      { key: 'yieldPercent', label: 'Yield %', type: 'percent', sortable: true },
    ],
    defaultSort: { field: 'productionDate', direction: 'desc' },
  },
  {
    key: 'orders-by-status',
    name: 'Orders by Status',
    description: 'All orders grouped by current status',
    category: 'orders',
    allowedRoles: ['ADMIN', 'SALES', 'CUSTOMER_SERVICE', 'PRODUCTION'],
    filters: [
      { key: 'customerId', label: 'Customer', type: 'select' },
      { key: 'productId', label: 'Product', type: 'select' },
      { key: 'status', label: 'Status', type: 'select' },
      { key: 'dateFrom', label: 'From Date', type: 'date' },
      { key: 'dateTo', label: 'To Date', type: 'date' },
    ],
    columns: [
      { key: 'orderNumber', label: 'Order #', type: 'text', sortable: true },
      { key: 'customerName', label: 'Customer', type: 'text', sortable: true },
      { key: 'productName', label: 'Product', type: 'text' },
      { key: 'deliveryDate', label: 'Delivery Date', type: 'date', sortable: true },
      { key: 'requestedActivity', label: 'Activity', type: 'number' },
      { key: 'numberOfDoses', label: 'Doses', type: 'number' },
      { key: 'status', label: 'Status', type: 'badge' },
      { key: 'createdAt', label: 'Created', type: 'datetime', sortable: true },
    ],
    defaultSort: { field: 'deliveryDate', direction: 'desc' },
    drillDownEntity: 'Order',
    drillDownRoute: '/orders',
  },
  {
    key: 'reservation-utilization',
    name: 'Reservation Utilization',
    description: 'Reserved vs committed capacity minutes',
    category: 'orders',
    allowedRoles: ['ADMIN', 'SALES', 'PRODUCTION'],
    filters: [
      { key: 'dateFrom', label: 'From Date', type: 'date' },
      { key: 'dateTo', label: 'To Date', type: 'date' },
      { key: 'status', label: 'Status', type: 'select' },
    ],
    columns: [
      { key: 'reservationNumber', label: 'Reservation #', type: 'text', sortable: true },
      { key: 'customerName', label: 'Customer', type: 'text' },
      { key: 'productName', label: 'Product', type: 'text' },
      { key: 'requestedDate', label: 'Requested Date', type: 'date', sortable: true },
      { key: 'windowName', label: 'Window', type: 'text' },
      { key: 'estimatedMinutes', label: 'Minutes', type: 'number' },
      { key: 'status', label: 'Status', type: 'badge' },
    ],
    defaultSort: { field: 'requestedDate', direction: 'desc' },
  },
  {
    key: 'qc-pass-fail-rate',
    name: 'QC Pass/Fail Rate',
    description: 'Quality control test results summary',
    category: 'quality',
    allowedRoles: ['ADMIN', 'QC', 'QP'],
    filters: [
      { key: 'productId', label: 'Product', type: 'select' },
      { key: 'dateFrom', label: 'From Date', type: 'date' },
      { key: 'dateTo', label: 'To Date', type: 'date' },
    ],
    columns: [
      { key: 'batchNumber', label: 'Batch #', type: 'text', sortable: true },
      { key: 'productName', label: 'Product', type: 'text' },
      { key: 'testName', label: 'Test Name', type: 'text' },
      { key: 'result', label: 'Result', type: 'badge' },
      { key: 'value', label: 'Value', type: 'text' },
      { key: 'specification', label: 'Specification', type: 'text' },
      { key: 'testedAt', label: 'Tested At', type: 'datetime', sortable: true },
      { key: 'testedBy', label: 'Tested By', type: 'text' },
    ],
    defaultSort: { field: 'testedAt', direction: 'desc' },
  },
  {
    key: 'oos-oot-report',
    name: 'OOS/OOT Investigations',
    description: 'Out of specification and out of trend cases',
    category: 'quality',
    allowedRoles: ['ADMIN', 'QC', 'QP'],
    filters: [
      { key: 'caseType', label: 'Case Type', type: 'select', options: [
        { value: 'OOS', label: 'Out of Specification' },
        { value: 'OOT', label: 'Out of Trend' },
        { value: 'OOE', label: 'Out of Expectation' },
      ]},
      { key: 'status', label: 'Status', type: 'select' },
      { key: 'priority', label: 'Priority', type: 'select' },
      { key: 'dateFrom', label: 'From Date', type: 'date' },
      { key: 'dateTo', label: 'To Date', type: 'date' },
    ],
    columns: [
      { key: 'caseNumber', label: 'Case #', type: 'text', sortable: true },
      { key: 'caseType', label: 'Type', type: 'badge' },
      { key: 'batchNumber', label: 'Batch #', type: 'text' },
      { key: 'testName', label: 'Test', type: 'text' },
      { key: 'priority', label: 'Priority', type: 'badge' },
      { key: 'status', label: 'Status', type: 'badge' },
      { key: 'deviationPercent', label: 'Deviation %', type: 'percent' },
      { key: 'createdAt', label: 'Opened', type: 'date', sortable: true },
    ],
    defaultSort: { field: 'createdAt', direction: 'desc' },
    drillDownEntity: 'OOSInvestigation',
    drillDownRoute: '/oos-investigations',
  },
  {
    key: 'shipments-status',
    name: 'Shipments Status Report',
    description: 'All shipments by current status',
    category: 'logistics',
    allowedRoles: ['ADMIN', 'LOGISTICS', 'CUSTOMER_SERVICE'],
    filters: [
      { key: 'status', label: 'Status', type: 'select' },
      { key: 'driverId', label: 'Driver', type: 'select' },
      { key: 'dateFrom', label: 'From Date', type: 'date' },
      { key: 'dateTo', label: 'To Date', type: 'date' },
    ],
    columns: [
      { key: 'shipmentNumber', label: 'Shipment #', type: 'text', sortable: true },
      { key: 'orderNumber', label: 'Order #', type: 'text' },
      { key: 'customerName', label: 'Customer', type: 'text', sortable: true },
      { key: 'driverName', label: 'Driver', type: 'text' },
      { key: 'scheduledDate', label: 'Scheduled', type: 'datetime', sortable: true },
      { key: 'actualDeliveryDate', label: 'Delivered', type: 'datetime' },
      { key: 'status', label: 'Status', type: 'badge' },
    ],
    defaultSort: { field: 'scheduledDate', direction: 'desc' },
    drillDownEntity: 'Shipment',
    drillDownRoute: '/shipments',
  },
  {
    key: 'otif-report',
    name: 'On-Time-In-Full (OTIF)',
    description: 'Delivery performance metrics',
    category: 'logistics',
    allowedRoles: ['ADMIN', 'LOGISTICS', 'MANAGEMENT'],
    filters: [
      { key: 'customerId', label: 'Customer', type: 'select' },
      { key: 'dateFrom', label: 'From Date', type: 'date' },
      { key: 'dateTo', label: 'To Date', type: 'date' },
    ],
    columns: [
      { key: 'shipmentNumber', label: 'Shipment #', type: 'text' },
      { key: 'customerName', label: 'Customer', type: 'text', sortable: true },
      { key: 'scheduledDate', label: 'Scheduled', type: 'datetime' },
      { key: 'actualDeliveryDate', label: 'Actual', type: 'datetime' },
      { key: 'onTime', label: 'On Time', type: 'badge' },
      { key: 'inFull', label: 'In Full', type: 'badge' },
      { key: 'otif', label: 'OTIF', type: 'badge' },
    ],
    defaultSort: { field: 'scheduledDate', direction: 'desc' },
  },
  {
    key: 'ar-aging',
    name: 'AR Aging Report',
    description: 'Accounts receivable aging by customer',
    category: 'finance',
    allowedRoles: ['ADMIN', 'FINANCE'],
    filters: [
      { key: 'customerId', label: 'Customer', type: 'select' },
      { key: 'asOfDate', label: 'As Of Date', type: 'date' },
    ],
    columns: [
      { key: 'customerName', label: 'Customer', type: 'text', sortable: true },
      { key: 'current', label: 'Current', type: 'currency' },
      { key: 'days30', label: '1-30 Days', type: 'currency' },
      { key: 'days60', label: '31-60 Days', type: 'currency' },
      { key: 'days90', label: '61-90 Days', type: 'currency' },
      { key: 'over90', label: '90+ Days', type: 'currency' },
      { key: 'total', label: 'Total', type: 'currency', sortable: true },
    ],
    defaultSort: { field: 'total', direction: 'desc' },
  },
  {
    key: 'invoices-by-status',
    name: 'Invoices by Status',
    description: 'All invoices grouped by status',
    category: 'finance',
    allowedRoles: ['ADMIN', 'FINANCE'],
    filters: [
      { key: 'customerId', label: 'Customer', type: 'select' },
      { key: 'status', label: 'Status', type: 'select' },
      { key: 'dateFrom', label: 'From Date', type: 'date' },
      { key: 'dateTo', label: 'To Date', type: 'date' },
    ],
    columns: [
      { key: 'invoiceNumber', label: 'Invoice #', type: 'text', sortable: true },
      { key: 'customerName', label: 'Customer', type: 'text', sortable: true },
      { key: 'invoiceDate', label: 'Date', type: 'date', sortable: true },
      { key: 'dueDate', label: 'Due Date', type: 'date' },
      { key: 'subtotal', label: 'Subtotal', type: 'currency' },
      { key: 'vatAmount', label: 'VAT', type: 'currency' },
      { key: 'totalAmount', label: 'Total', type: 'currency', sortable: true },
      { key: 'paidAmount', label: 'Paid', type: 'currency' },
      { key: 'balance', label: 'Balance', type: 'currency' },
      { key: 'status', label: 'Status', type: 'badge' },
    ],
    defaultSort: { field: 'invoiceDate', direction: 'desc' },
    drillDownEntity: 'Invoice',
    drillDownRoute: '/invoices',
  },
  {
    key: 'revenue-by-product',
    name: 'Revenue by Product',
    description: 'Sales revenue breakdown by product',
    category: 'finance',
    allowedRoles: ['ADMIN', 'FINANCE', 'MANAGEMENT'],
    filters: [
      { key: 'dateFrom', label: 'From Date', type: 'date' },
      { key: 'dateTo', label: 'To Date', type: 'date' },
    ],
    columns: [
      { key: 'productCode', label: 'Product Code', type: 'text', sortable: true },
      { key: 'productName', label: 'Product Name', type: 'text', sortable: true },
      { key: 'orderCount', label: 'Orders', type: 'number' },
      { key: 'totalQuantity', label: 'Quantity', type: 'number' },
      { key: 'revenue', label: 'Revenue', type: 'currency', sortable: true },
      { key: 'revenuePercent', label: '% of Total', type: 'percent' },
    ],
    defaultSort: { field: 'revenue', direction: 'desc' },
  },
  {
    key: 'customer-master-list',
    name: 'Customer Master List',
    description: 'All customers with key information',
    category: 'customers',
    allowedRoles: ['ADMIN', 'SALES', 'CUSTOMER_SERVICE'],
    filters: [
      { key: 'isActive', label: 'Status', type: 'select', options: [
        { value: 'true', label: 'Active' },
        { value: 'false', label: 'Inactive' },
      ]},
      { key: 'regionId', label: 'Region', type: 'select' },
    ],
    columns: [
      { key: 'code', label: 'Code', type: 'text', sortable: true },
      { key: 'name', label: 'Name', type: 'text', sortable: true },
      { key: 'nameAr', label: 'Arabic Name', type: 'text' },
      { key: 'phone', label: 'Phone', type: 'text' },
      { key: 'email', label: 'Email', type: 'text' },
      { key: 'city', label: 'City', type: 'text' },
      { key: 'creditLimit', label: 'Credit Limit', type: 'currency' },
      { key: 'isActive', label: 'Status', type: 'badge' },
    ],
    defaultSort: { field: 'name', direction: 'asc' },
    drillDownEntity: 'Customer',
    drillDownRoute: '/customers',
  },
  {
    key: 'contract-expiry',
    name: 'Contract Expiry Report',
    description: 'Contracts expiring soon or expired',
    category: 'customers',
    allowedRoles: ['ADMIN', 'SALES', 'FINANCE'],
    filters: [
      { key: 'expiryDays', label: 'Expiring Within (Days)', type: 'number', defaultValue: 30 },
      { key: 'status', label: 'Status', type: 'select' },
    ],
    columns: [
      { key: 'contractNumber', label: 'Contract #', type: 'text', sortable: true },
      { key: 'customerName', label: 'Customer', type: 'text', sortable: true },
      { key: 'startDate', label: 'Start Date', type: 'date' },
      { key: 'endDate', label: 'End Date', type: 'date', sortable: true },
      { key: 'daysToExpiry', label: 'Days to Expiry', type: 'number' },
      { key: 'totalValue', label: 'Value', type: 'currency' },
      { key: 'status', label: 'Status', type: 'badge' },
    ],
    defaultSort: { field: 'endDate', direction: 'asc' },
  },
  {
    key: 'capacity-utilization',
    name: 'Capacity Utilization',
    description: 'Daily/weekly capacity usage analysis',
    category: 'planner',
    allowedRoles: ['ADMIN', 'PRODUCTION', 'PLANNER'],
    filters: [
      { key: 'dateFrom', label: 'From Date', type: 'date' },
      { key: 'dateTo', label: 'To Date', type: 'date' },
    ],
    columns: [
      { key: 'date', label: 'Date', type: 'date', sortable: true },
      { key: 'windowName', label: 'Window', type: 'text' },
      { key: 'capacityMinutes', label: 'Capacity', type: 'number' },
      { key: 'usedMinutes', label: 'Used', type: 'number' },
      { key: 'availableMinutes', label: 'Available', type: 'number' },
      { key: 'utilizationPercent', label: 'Utilization %', type: 'percent', sortable: true },
      { key: 'reservationCount', label: 'Reservations', type: 'number' },
    ],
    defaultSort: { field: 'date', direction: 'asc' },
  },
  {
    key: 'payment-requests-pending',
    name: 'Payment Requests Pending',
    description: 'Payments awaiting approval',
    category: 'payments',
    allowedRoles: ['ADMIN', 'FINANCE'],
    filters: [
      { key: 'customerId', label: 'Customer', type: 'select' },
    ],
    columns: [
      { key: 'paymentNumber', label: 'Payment #', type: 'text', sortable: true },
      { key: 'customerName', label: 'Customer', type: 'text', sortable: true },
      { key: 'amount', label: 'Amount', type: 'currency', sortable: true },
      { key: 'paymentMethod', label: 'Method', type: 'text' },
      { key: 'submittedAt', label: 'Submitted', type: 'datetime', sortable: true },
      { key: 'status', label: 'Status', type: 'badge' },
    ],
    defaultSort: { field: 'submittedAt', direction: 'desc' },
  },
  {
    key: 'user-list',
    name: 'User List & Roles',
    description: 'All system users with their roles',
    category: 'users',
    allowedRoles: ['ADMIN'],
    filters: [
      { key: 'roleId', label: 'Role', type: 'select' },
      { key: 'isActive', label: 'Status', type: 'select', options: [
        { value: 'true', label: 'Active' },
        { value: 'false', label: 'Inactive' },
      ]},
    ],
    columns: [
      { key: 'name', label: 'Name', type: 'text', sortable: true },
      { key: 'email', label: 'Email', type: 'text', sortable: true },
      { key: 'roleName', label: 'Role', type: 'text' },
      { key: 'customerName', label: 'Linked Customer', type: 'text' },
      { key: 'lastLogin', label: 'Last Login', type: 'datetime', sortable: true },
      { key: 'isActive', label: 'Status', type: 'badge' },
      { key: 'createdAt', label: 'Created', type: 'date' },
    ],
    defaultSort: { field: 'name', direction: 'asc' },
  },
  {
    key: 'audit-log',
    name: 'Full Audit Log',
    description: 'Complete audit trail of all system changes',
    category: 'audit',
    allowedRoles: ['ADMIN'],
    filters: [
      { key: 'entityType', label: 'Entity Type', type: 'select' },
      { key: 'action', label: 'Action', type: 'select', options: [
        { value: 'CREATE', label: 'Create' },
        { value: 'UPDATE', label: 'Update' },
        { value: 'DELETE', label: 'Delete' },
        { value: 'STATUS_CHANGE', label: 'Status Change' },
      ]},
      { key: 'userId', label: 'User', type: 'select' },
      { key: 'dateFrom', label: 'From Date', type: 'date' },
      { key: 'dateTo', label: 'To Date', type: 'date' },
    ],
    columns: [
      { key: 'timestamp', label: 'Timestamp', type: 'datetime', sortable: true },
      { key: 'userName', label: 'User', type: 'text', sortable: true },
      { key: 'action', label: 'Action', type: 'badge' },
      { key: 'entityType', label: 'Entity', type: 'text', sortable: true },
      { key: 'entityId', label: 'Entity ID', type: 'text' },
      { key: 'description', label: 'Description', type: 'text' },
      { key: 'ipAddress', label: 'IP Address', type: 'text' },
    ],
    defaultSort: { field: 'timestamp', direction: 'desc' },
  },
  {
    key: 'dispensing-daily',
    name: 'Dose Units Dispensed per Day',
    description: 'Daily dispensing activity summary',
    category: 'dispensing',
    allowedRoles: ['ADMIN', 'DISPENSING', 'PRODUCTION'],
    filters: [
      { key: 'productId', label: 'Product', type: 'select' },
      { key: 'dateFrom', label: 'From Date', type: 'date' },
      { key: 'dateTo', label: 'To Date', type: 'date' },
    ],
    columns: [
      { key: 'date', label: 'Date', type: 'date', sortable: true },
      { key: 'productName', label: 'Product', type: 'text' },
      { key: 'batchCount', label: 'Batches', type: 'number' },
      { key: 'doseCount', label: 'Doses Dispensed', type: 'number', sortable: true },
      { key: 'totalActivity', label: 'Total Activity', type: 'number' },
      { key: 'wasteCount', label: 'Waste Units', type: 'number' },
    ],
    defaultSort: { field: 'date', direction: 'desc' },
  },
  {
    key: 'product-catalog',
    name: 'Product Catalog',
    description: 'Complete product master list',
    category: 'products',
    allowedRoles: ['ADMIN', 'SALES', 'PRODUCTION'],
    filters: [
      { key: 'categoryId', label: 'Category', type: 'select' },
      { key: 'isActive', label: 'Status', type: 'select', options: [
        { value: 'true', label: 'Active' },
        { value: 'false', label: 'Inactive' },
      ]},
    ],
    columns: [
      { key: 'code', label: 'Code', type: 'text', sortable: true },
      { key: 'name', label: 'Name', type: 'text', sortable: true },
      { key: 'nameAr', label: 'Arabic Name', type: 'text' },
      { key: 'categoryName', label: 'Category', type: 'text' },
      { key: 'halfLife', label: 'Half-Life (min)', type: 'number' },
      { key: 'unitPrice', label: 'Unit Price', type: 'currency' },
      { key: 'isActive', label: 'Status', type: 'badge' },
    ],
    defaultSort: { field: 'name', direction: 'asc' },
    drillDownEntity: 'Product',
    drillDownRoute: '/products',
  },
];

export function getReportByKey(key: string): ReportDefinition | undefined {
  return REPORT_DEFINITIONS.find(r => r.key === key);
}

export function getReportsByCategory(category: string): ReportDefinition[] {
  return REPORT_DEFINITIONS.filter(r => r.category === category);
}
