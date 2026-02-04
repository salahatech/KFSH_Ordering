export interface TestUser {
  email: string;
  password: string;
  role: string;
  name: string;
}

export const TEST_USERS: Record<string, TestUser> = {
  customer: {
    email: 'portal1@hospitaldemo.com',
    password: 'demo123',
    role: 'CUSTOMER',
    name: 'Customer Portal User',
  },
  orderdesk: {
    email: 'orderdesk@demo.com',
    password: 'demo123',
    role: 'ORDER_DESK',
    name: 'Order Desk Validator',
  },
  planner: {
    email: 'planner@demo.com',
    password: 'demo123',
    role: 'PLANNER',
    name: 'Production Planner',
  },
  qc: {
    email: 'qc@demo.com',
    password: 'demo123',
    role: 'QC_ANALYST',
    name: 'QC Analyst',
  },
  qp: {
    email: 'qp@demo.com',
    password: 'demo123',
    role: 'QP',
    name: 'Qualified Person',
  },
  logistics: {
    email: 'logistics@demo.com',
    password: 'demo123',
    role: 'LOGISTICS',
    name: 'Logistics Coordinator',
  },
  driver: {
    email: 'driver1@demo.com',
    password: 'demo123',
    role: 'DRIVER',
    name: 'Delivery Driver',
  },
  finance: {
    email: 'finance@demo.com',
    password: 'demo123',
    role: 'FINANCE_ADMIN',
    name: 'Finance Admin',
  },
  admin: {
    email: 'admin@demo.com',
    password: 'demo123',
    role: 'ADMIN',
    name: 'System Admin',
  },
};

export const DEMO_ENTITIES = {
  customer: {
    id: 'demo-customer-1',
    name: 'Al Noor Hospital',
    nameAr: 'مستشفى النور',
  },
  order: {
    id: 'demo-order-1',
    number: 'O-10001',
  },
  batch: {
    id: 'demo-batch-1',
    number: 'B-20001',
  },
  shipment: {
    id: 'demo-shipment-1',
    number: 'S-30001',
  },
  invoice: {
    id: 'demo-invoice-1',
    number: 'INV-40001',
  },
};

export const EXPECTED_STATUSES = {
  order: {
    submitted: 'SUBMITTED',
    validated: 'VALIDATED',
    scheduled: 'SCHEDULED',
    inProduction: 'IN_PRODUCTION',
    qcPending: 'QC_PENDING',
    qcPassed: 'QC_PASSED',
    released: 'RELEASED',
    dispatched: 'DISPATCHED',
    delivered: 'DELIVERED',
  },
  batch: {
    created: 'CREATED',
    inProduction: 'IN_PRODUCTION',
    qcPending: 'QC_PENDING',
    qcPassed: 'QC_PASSED',
    released: 'RELEASED',
  },
  shipment: {
    packed: 'PACKED',
    assigned: 'ASSIGNED',
    inTransit: 'IN_TRANSIT',
    arrived: 'ARRIVED',
    delivered: 'DELIVERED',
  },
  invoice: {
    draft: 'DRAFT',
    pendingApproval: 'PENDING_APPROVAL',
    issuedPosted: 'ISSUED_POSTED',
    partiallyPaid: 'PARTIALLY_PAID',
    paid: 'PAID',
    closedArchived: 'CLOSED_ARCHIVED',
  },
};
