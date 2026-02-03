import { PrismaClient } from '@prisma/client';
import { getReportByKey } from './report-definitions.js';

const prisma = new PrismaClient();

export interface ReportQuery {
  filters: Record<string, any>;
  page: number;
  pageSize: number;
  sortField?: string;
  sortDirection?: 'asc' | 'desc';
}

export interface ReportResult {
  data: any[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
  summary?: Record<string, any>;
}

export async function executeReport(reportKey: string, query: ReportQuery): Promise<ReportResult> {
  const report = getReportByKey(reportKey);
  if (!report) {
    throw new Error(`Report not found: ${reportKey}`);
  }

  const { filters, page, pageSize, sortField, sortDirection } = query;
  const skip = (page - 1) * pageSize;

  switch (reportKey) {
    case 'inventory-balance':
      return executeInventoryBalance(filters, skip, pageSize, sortField, sortDirection);
    case 'inventory-aging':
      return executeInventoryAging(filters, skip, pageSize, sortField, sortDirection);
    case 'batch-status-summary':
      return executeBatchStatusSummary(filters, skip, pageSize, sortField, sortDirection);
    case 'batch-yield':
      return executeBatchYield(filters, skip, pageSize, sortField, sortDirection);
    case 'orders-by-status':
      return executeOrdersByStatus(filters, skip, pageSize, sortField, sortDirection);
    case 'reservation-utilization':
      return executeReservationUtilization(filters, skip, pageSize, sortField, sortDirection);
    case 'qc-pass-fail-rate':
      return executeQCPassFailRate(filters, skip, pageSize, sortField, sortDirection);
    case 'oos-oot-report':
      return executeOOSReport(filters, skip, pageSize, sortField, sortDirection);
    case 'shipments-status':
      return executeShipmentsStatus(filters, skip, pageSize, sortField, sortDirection);
    case 'otif-report':
      return executeOTIFReport(filters, skip, pageSize, sortField, sortDirection);
    case 'ar-aging':
      return executeARaging(filters, skip, pageSize, sortField, sortDirection);
    case 'invoices-by-status':
      return executeInvoicesByStatus(filters, skip, pageSize, sortField, sortDirection);
    case 'revenue-by-product':
      return executeRevenueByProduct(filters, skip, pageSize, sortField, sortDirection);
    case 'customer-master-list':
      return executeCustomerMasterList(filters, skip, pageSize, sortField, sortDirection);
    case 'contract-expiry':
      return executeContractExpiry(filters, skip, pageSize, sortField, sortDirection);
    case 'capacity-utilization':
      return executeCapacityUtilization(filters, skip, pageSize, sortField, sortDirection);
    case 'payment-requests-pending':
      return executePaymentRequestsPending(filters, skip, pageSize, sortField, sortDirection);
    case 'user-list':
      return executeUserList(filters, skip, pageSize, sortField, sortDirection);
    case 'audit-log':
      return executeAuditLog(filters, skip, pageSize, sortField, sortDirection);
    case 'dispensing-daily':
      return executeDispensingDaily(filters, skip, pageSize, sortField, sortDirection);
    case 'product-catalog':
      return executeProductCatalog(filters, skip, pageSize, sortField, sortDirection);
    default:
      throw new Error(`Report executor not implemented: ${reportKey}`);
  }
}

async function executeInventoryBalance(filters: any, skip: number, take: number, sortField?: string, sortDir?: string): Promise<ReportResult> {
  const where: any = {};
  if (filters.materialId) where.materialId = filters.materialId;
  if (filters.warehouseId) where.warehouseId = filters.warehouseId;
  if (filters.status) where.status = filters.status;
  if (filters.lotNumber) where.lotNumber = { contains: filters.lotNumber, mode: 'insensitive' };

  const [stocks, total] = await Promise.all([
    prisma.stockItem.findMany({
      where,
      include: { material: true, warehouse: true },
      skip,
      take,
      orderBy: sortField ? { [sortField]: sortDir || 'asc' } : { createdAt: 'desc' },
    }),
    prisma.stockItem.count({ where }),
  ]);

  const data = stocks.map(s => ({
    id: s.id,
    materialCode: s.material.code,
    materialName: s.material.name,
    lotNumber: s.lotNumber || '-',
    warehouseName: s.warehouse.name,
    location: s.location?.code || '-',
    quantity: s.quantity,
    unit: s.unit,
    status: s.status,
    expiryDate: s.expiryDate,
  }));

  return { data, total, page: Math.floor(skip / take) + 1, pageSize: take, totalPages: Math.ceil(total / take) };
}

async function executeInventoryAging(filters: any, skip: number, take: number, sortField?: string, sortDir?: string): Promise<ReportResult> {
  const expiryDays = filters.expiryDays || 30;
  const expiryDate = new Date();
  expiryDate.setDate(expiryDate.getDate() + expiryDays);

  const where: any = {
    expiryDate: { lte: expiryDate },
    status: { not: 'EXPIRED' },
  };
  if (filters.warehouseId) where.warehouseId = filters.warehouseId;

  const [stocks, total] = await Promise.all([
    prisma.stockItem.findMany({
      where,
      include: { material: true, warehouse: true },
      skip,
      take,
      orderBy: { expiryDate: 'asc' },
    }),
    prisma.stockItem.count({ where }),
  ]);

  const now = new Date();
  const data = stocks.map(s => {
    const daysToExpiry = s.expiryDate ? Math.ceil((s.expiryDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)) : 999;
    const ageInDays = s.receivedDate ? Math.floor((now.getTime() - s.receivedDate.getTime()) / (1000 * 60 * 60 * 24)) : 0;
    return {
      id: s.id,
      materialCode: s.material.code,
      materialName: s.material.name,
      lotNumber: s.lotNumber || '-',
      quantity: s.quantity,
      expiryDate: s.expiryDate,
      daysToExpiry,
      ageInDays,
      status: daysToExpiry <= 0 ? 'EXPIRED' : daysToExpiry <= 7 ? 'CRITICAL' : daysToExpiry <= 30 ? 'WARNING' : 'OK',
    };
  });

  return { data, total, page: Math.floor(skip / take) + 1, pageSize: take, totalPages: Math.ceil(total / take) };
}

async function executeBatchStatusSummary(filters: any, skip: number, take: number, sortField?: string, sortDir?: string): Promise<ReportResult> {
  const where: any = {};
  if (filters.productId) where.productId = filters.productId;
  if (filters.status) where.status = filters.status;
  if (filters.dateFrom) where.plannedStartTime = { ...where.plannedStartTime, gte: new Date(filters.dateFrom) };
  if (filters.dateTo) where.plannedStartTime = { ...where.plannedStartTime, lte: new Date(filters.dateTo) };

  const [batches, total] = await Promise.all([
    prisma.batch.findMany({
      where,
      include: { product: true },
      skip,
      take,
      orderBy: sortField ? { [sortField]: sortDir || 'desc' } : { plannedStartTime: 'desc' },
    }),
    prisma.batch.count({ where }),
  ]);

  const data = batches.map(b => ({
    id: b.id,
    batchNumber: b.batchNumber,
    productName: b.product.name,
    productionDate: b.plannedStartTime,
    plannedQuantity: b.targetActivity || 0,
    actualQuantity: b.actualActivity || 0,
    yieldPercent: b.targetActivity ? Math.round((b.actualActivity || 0) / b.targetActivity * 100) : 0,
    status: b.status,
    calibrationTime: b.calibrationTime,
  }));

  return { data, total, page: Math.floor(skip / take) + 1, pageSize: take, totalPages: Math.ceil(total / take) };
}

async function executeBatchYield(filters: any, skip: number, take: number, sortField?: string, sortDir?: string): Promise<ReportResult> {
  const where: any = { actualActivity: { not: null } };
  if (filters.productId) where.productId = filters.productId;
  if (filters.dateFrom) where.plannedStartTime = { ...where.plannedStartTime, gte: new Date(filters.dateFrom) };
  if (filters.dateTo) where.plannedStartTime = { ...where.plannedStartTime, lte: new Date(filters.dateTo) };

  const [batches, total] = await Promise.all([
    prisma.batch.findMany({
      where,
      include: { product: true },
      skip,
      take,
      orderBy: { plannedStartTime: 'desc' },
    }),
    prisma.batch.count({ where }),
  ]);

  const data = batches.map(b => ({
    id: b.id,
    batchNumber: b.batchNumber,
    productName: b.product.name,
    productionDate: b.plannedStartTime,
    plannedQuantity: b.targetActivity || 0,
    actualQuantity: b.actualActivity || 0,
    variance: (b.actualActivity || 0) - (b.targetActivity || 0),
    yieldPercent: b.targetActivity ? Math.round((b.actualActivity || 0) / b.targetActivity * 100) : 0,
  }));

  return { data, total, page: Math.floor(skip / take) + 1, pageSize: take, totalPages: Math.ceil(total / take) };
}

async function executeOrdersByStatus(filters: any, skip: number, take: number, sortField?: string, sortDir?: string): Promise<ReportResult> {
  const where: any = {};
  if (filters.customerId) where.customerId = filters.customerId;
  if (filters.productId) where.productId = filters.productId;
  if (filters.status) where.status = filters.status;
  if (filters.dateFrom) where.deliveryDate = { ...where.deliveryDate, gte: new Date(filters.dateFrom) };
  if (filters.dateTo) where.deliveryDate = { ...where.deliveryDate, lte: new Date(filters.dateTo) };

  const [orders, total] = await Promise.all([
    prisma.order.findMany({
      where,
      include: { customer: true, product: true },
      skip,
      take,
      orderBy: sortField ? { [sortField]: sortDir || 'desc' } : { deliveryDate: 'desc' },
    }),
    prisma.order.count({ where }),
  ]);

  const data = orders.map(o => ({
    id: o.id,
    orderNumber: o.orderNumber,
    customerName: o.customer.name,
    productName: o.product.name,
    deliveryDate: o.deliveryDate,
    requestedActivity: o.requestedActivity,
    numberOfDoses: o.numberOfDoses,
    status: o.status,
    createdAt: o.createdAt,
  }));

  return { data, total, page: Math.floor(skip / take) + 1, pageSize: take, totalPages: Math.ceil(total / take) };
}

async function executeReservationUtilization(filters: any, skip: number, take: number, sortField?: string, sortDir?: string): Promise<ReportResult> {
  const where: any = {};
  if (filters.status) where.status = filters.status;
  if (filters.dateFrom) where.requestedDate = { ...where.requestedDate, gte: new Date(filters.dateFrom) };
  if (filters.dateTo) where.requestedDate = { ...where.requestedDate, lte: new Date(filters.dateTo) };

  const [reservations, total] = await Promise.all([
    prisma.reservation.findMany({
      where,
      include: { customer: true, product: true, window: true },
      skip,
      take,
      orderBy: { requestedDate: 'desc' },
    }),
    prisma.reservation.count({ where }),
  ]);

  const data = reservations.map(r => ({
    id: r.id,
    reservationNumber: r.reservationNumber,
    customerName: r.customer.name,
    productName: r.product.name,
    requestedDate: r.requestedDate,
    windowName: r.window?.name || '-',
    estimatedMinutes: r.estimatedMinutes,
    status: r.status,
  }));

  return { data, total, page: Math.floor(skip / take) + 1, pageSize: take, totalPages: Math.ceil(total / take) };
}

async function executeQCPassFailRate(filters: any, skip: number, take: number, sortField?: string, sortDir?: string): Promise<ReportResult> {
  const where: any = {};
  if (filters.dateFrom) where.testedAt = { ...where.testedAt, gte: new Date(filters.dateFrom) };
  if (filters.dateTo) where.testedAt = { ...where.testedAt, lte: new Date(filters.dateTo) };

  const [results, total] = await Promise.all([
    prisma.testResult.findMany({
      where,
      include: { testSpec: true, sample: { include: { batch: { include: { product: true } } } }, analyst: true },
      skip,
      take,
      orderBy: { testedAt: 'desc' },
    }),
    prisma.testResult.count({ where }),
  ]);

  const data = results.map(r => ({
    id: r.id,
    batchNumber: r.sample?.batch?.batchNumber || '-',
    productName: r.sample?.batch?.product?.name || '-',
    testName: r.testSpec?.name || '-',
    result: r.result,
    value: r.numericValue?.toString() || r.textValue || '-',
    specification: r.testSpec?.specification || '-',
    testedAt: r.testedAt,
    testedBy: r.analyst ? `${r.analyst.firstName} ${r.analyst.lastName}` : '-',
  }));

  return { data, total, page: Math.floor(skip / take) + 1, pageSize: take, totalPages: Math.ceil(total / take) };
}

async function executeOOSReport(filters: any, skip: number, take: number, sortField?: string, sortDir?: string): Promise<ReportResult> {
  const where: any = {};
  if (filters.caseType) where.caseType = filters.caseType;
  if (filters.status) where.status = filters.status;
  if (filters.priority) where.priority = filters.priority;
  if (filters.dateFrom) where.createdAt = { ...where.createdAt, gte: new Date(filters.dateFrom) };
  if (filters.dateTo) where.createdAt = { ...where.createdAt, lte: new Date(filters.dateTo) };

  const [investigations, total] = await Promise.all([
    prisma.oOSCase.findMany({
      where,
      include: { batch: true, testResult: { include: { testSpec: true } } },
      skip,
      take,
      orderBy: { createdAt: 'desc' },
    }),
    prisma.oOSCase.count({ where }),
  ]);

  const data = investigations.map(i => ({
    id: i.id,
    caseNumber: i.caseNumber,
    caseType: i.caseType,
    batchNumber: i.batch?.batchNumber || '-',
    testName: i.testResult?.testSpec?.name || '-',
    priority: i.priority,
    status: i.status,
    deviationPercent: i.deviationPercent,
    createdAt: i.createdAt,
  }));

  return { data, total, page: Math.floor(skip / take) + 1, pageSize: take, totalPages: Math.ceil(total / take) };
}

async function executeShipmentsStatus(filters: any, skip: number, take: number, sortField?: string, sortDir?: string): Promise<ReportResult> {
  const where: any = {};
  if (filters.status) where.status = filters.status;
  if (filters.driverId) where.driverId = filters.driverId;
  if (filters.dateFrom) where.scheduledDeliveryAt = { ...where.scheduledDeliveryAt, gte: new Date(filters.dateFrom) };
  if (filters.dateTo) where.scheduledDeliveryAt = { ...where.scheduledDeliveryAt, lte: new Date(filters.dateTo) };

  const [shipments, total] = await Promise.all([
    prisma.shipment.findMany({
      where,
      include: { customer: true, driver: true, orders: true },
      skip,
      take,
      orderBy: { scheduledDeliveryAt: 'desc' },
    }),
    prisma.shipment.count({ where }),
  ]);

  const data = shipments.map(s => ({
    id: s.id,
    shipmentNumber: s.shipmentNumber,
    orderNumber: s.orders.map(o => o.orderNumber).join(', ') || '-',
    customerName: s.customer.name,
    driverName: s.driver?.fullName || '-',
    scheduledDate: s.scheduledDeliveryAt,
    actualDeliveryDate: s.actualArrivalTime,
    status: s.status,
  }));

  return { data, total, page: Math.floor(skip / take) + 1, pageSize: take, totalPages: Math.ceil(total / take) };
}

async function executeOTIFReport(filters: any, skip: number, take: number, sortField?: string, sortDir?: string): Promise<ReportResult> {
  const where: any = { status: 'DELIVERED' };
  if (filters.customerId) where.customerId = filters.customerId;
  if (filters.dateFrom) where.scheduledDeliveryAt = { ...where.scheduledDeliveryAt, gte: new Date(filters.dateFrom) };
  if (filters.dateTo) where.scheduledDeliveryAt = { ...where.scheduledDeliveryAt, lte: new Date(filters.dateTo) };

  const [shipments, total] = await Promise.all([
    prisma.shipment.findMany({
      where,
      include: { customer: true },
      skip,
      take,
      orderBy: { scheduledDeliveryAt: 'desc' },
    }),
    prisma.shipment.count({ where }),
  ]);

  const data = shipments.map(s => {
    const onTime = s.actualArrivalTime && s.scheduledDeliveryAt && s.actualArrivalTime <= s.scheduledDeliveryAt;
    const inFull = true;
    return {
      id: s.id,
      shipmentNumber: s.shipmentNumber,
      customerName: s.customer.name,
      scheduledDate: s.scheduledDeliveryAt,
      actualDeliveryDate: s.actualArrivalTime,
      onTime: onTime ? 'YES' : 'NO',
      inFull: inFull ? 'YES' : 'NO',
      otif: onTime && inFull ? 'YES' : 'NO',
    };
  });

  return { data, total, page: Math.floor(skip / take) + 1, pageSize: take, totalPages: Math.ceil(total / take) };
}

async function executeARaging(filters: any, skip: number, take: number, sortField?: string, sortDir?: string): Promise<ReportResult> {
  const asOfDate = filters.asOfDate ? new Date(filters.asOfDate) : new Date();
  const where: any = { status: { in: ['ISSUED', 'PARTIALLY_PAID', 'OVERDUE'] } };
  if (filters.customerId) where.customerId = filters.customerId;

  const invoices = await prisma.invoice.findMany({
    where,
    include: { customer: true },
  });

  const customerAging: Record<string, any> = {};

  for (const inv of invoices) {
    const customerId = inv.customerId;
    const customerName = inv.customer.name;
    const balance = Number(inv.totalAmount) - Number(inv.paidAmount || 0);
    const daysPastDue = Math.max(0, Math.floor((asOfDate.getTime() - inv.dueDate.getTime()) / (1000 * 60 * 60 * 24)));

    if (!customerAging[customerId]) {
      customerAging[customerId] = { id: customerId, customerName, current: 0, days30: 0, days60: 0, days90: 0, over90: 0, total: 0 };
    }

    if (daysPastDue <= 0) customerAging[customerId].current += balance;
    else if (daysPastDue <= 30) customerAging[customerId].days30 += balance;
    else if (daysPastDue <= 60) customerAging[customerId].days60 += balance;
    else if (daysPastDue <= 90) customerAging[customerId].days90 += balance;
    else customerAging[customerId].over90 += balance;
    customerAging[customerId].total += balance;
  }

  const data = Object.values(customerAging);
  const total = data.length;

  return { data: data.slice(skip, skip + take), total, page: Math.floor(skip / take) + 1, pageSize: take, totalPages: Math.ceil(total / take) };
}

async function executeInvoicesByStatus(filters: any, skip: number, take: number, sortField?: string, sortDir?: string): Promise<ReportResult> {
  const where: any = {};
  if (filters.customerId) where.customerId = filters.customerId;
  if (filters.status) where.status = filters.status;
  if (filters.dateFrom) where.invoiceDate = { ...where.invoiceDate, gte: new Date(filters.dateFrom) };
  if (filters.dateTo) where.invoiceDate = { ...where.invoiceDate, lte: new Date(filters.dateTo) };

  const [invoices, total] = await Promise.all([
    prisma.invoice.findMany({
      where,
      include: { customer: true },
      skip,
      take,
      orderBy: { invoiceDate: 'desc' },
    }),
    prisma.invoice.count({ where }),
  ]);

  const data = invoices.map(i => ({
    id: i.id,
    invoiceNumber: i.invoiceNumber,
    customerName: i.customer.name,
    invoiceDate: i.invoiceDate,
    dueDate: i.dueDate,
    subtotal: Number(i.subtotal),
    vatAmount: Number(i.taxAmount || 0),
    totalAmount: Number(i.totalAmount),
    paidAmount: Number(i.paidAmount || 0),
    balance: Number(i.totalAmount) - Number(i.paidAmount || 0),
    status: i.status,
  }));

  return { data, total, page: Math.floor(skip / take) + 1, pageSize: take, totalPages: Math.ceil(total / take) };
}

async function executeRevenueByProduct(filters: any, skip: number, take: number, sortField?: string, sortDir?: string): Promise<ReportResult> {
  const where: any = { status: { not: 'CANCELLED' } };
  if (filters.dateFrom) where.deliveryDate = { ...where.deliveryDate, gte: new Date(filters.dateFrom) };
  if (filters.dateTo) where.deliveryDate = { ...where.deliveryDate, lte: new Date(filters.dateTo) };

  const orders = await prisma.order.findMany({
    where,
    include: { product: true },
  });

  const productRevenue: Record<string, any> = {};
  let totalRevenue = 0;

  for (const o of orders) {
    const productId = o.productId;
    const revenue = Number(o.unitPrice || 0) * (o.numberOfDoses || 1);
    totalRevenue += revenue;

    if (!productRevenue[productId]) {
      productRevenue[productId] = {
        id: productId,
        productCode: o.product.code,
        productName: o.product.name,
        orderCount: 0,
        totalQuantity: 0,
        revenue: 0,
      };
    }
    productRevenue[productId].orderCount++;
    productRevenue[productId].totalQuantity += o.numberOfDoses || 0;
    productRevenue[productId].revenue += revenue;
  }

  const data = Object.values(productRevenue).map((p: any) => ({
    ...p,
    revenuePercent: totalRevenue > 0 ? Math.round(p.revenue / totalRevenue * 100) : 0,
  }));

  data.sort((a: any, b: any) => b.revenue - a.revenue);
  const total = data.length;

  return { data: data.slice(skip, skip + take), total, page: Math.floor(skip / take) + 1, pageSize: take, totalPages: Math.ceil(total / take) };
}

async function executeCustomerMasterList(filters: any, skip: number, take: number, sortField?: string, sortDir?: string): Promise<ReportResult> {
  const where: any = {};
  if (filters.isActive !== undefined) where.isActive = filters.isActive === 'true';
  if (filters.regionId) where.regionId = filters.regionId;

  const [customers, total] = await Promise.all([
    prisma.customer.findMany({
      where,
      include: { city: true },
      skip,
      take,
      orderBy: { name: 'asc' },
    }),
    prisma.customer.count({ where }),
  ]);

  const data = customers.map(c => ({
    id: c.id,
    code: c.code,
    name: c.name,
    nameAr: c.nameAr || '-',
    phone: c.phone || '-',
    email: c.email || '-',
    city: c.city?.name || '-',
    creditLimit: Number(c.creditLimit || 0),
    isActive: c.isActive ? 'Active' : 'Inactive',
  }));

  return { data, total, page: Math.floor(skip / take) + 1, pageSize: take, totalPages: Math.ceil(total / take) };
}

async function executeContractExpiry(filters: any, skip: number, take: number, sortField?: string, sortDir?: string): Promise<ReportResult> {
  const expiryDays = filters.expiryDays || 30;
  const expiryDate = new Date();
  expiryDate.setDate(expiryDate.getDate() + expiryDays);

  const where: any = { endDate: { lte: expiryDate } };
  if (filters.status) where.status = filters.status;

  const [contracts, total] = await Promise.all([
    prisma.contract.findMany({
      where,
      include: { customer: true },
      skip,
      take,
      orderBy: { endDate: 'asc' },
    }),
    prisma.contract.count({ where }),
  ]);

  const now = new Date();
  const data = contracts.map(c => ({
    id: c.id,
    contractNumber: c.contractNumber,
    customerName: c.customer.name,
    startDate: c.startDate,
    endDate: c.endDate,
    daysToExpiry: Math.ceil((c.endDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)),
    totalValue: Number(c.value || 0),
    status: c.status,
  }));

  return { data, total, page: Math.floor(skip / take) + 1, pageSize: take, totalPages: Math.ceil(total / take) };
}

async function executeCapacityUtilization(filters: any, skip: number, take: number, sortField?: string, sortDir?: string): Promise<ReportResult> {
  const where: any = { isActive: true };
  if (filters.dateFrom) where.date = { ...where.date, gte: new Date(filters.dateFrom) };
  if (filters.dateTo) where.date = { ...where.date, lte: new Date(filters.dateTo) };

  const [windows, total] = await Promise.all([
    prisma.deliveryWindow.findMany({
      where,
      include: { reservations: { where: { status: { in: ['TENTATIVE', 'CONFIRMED'] } } } },
      skip,
      take,
      orderBy: { date: 'asc' },
    }),
    prisma.deliveryWindow.count({ where }),
  ]);

  const data = windows.map(w => ({
    id: w.id,
    date: w.date,
    windowName: w.name,
    capacityMinutes: w.capacityMinutes,
    usedMinutes: w.usedMinutes,
    availableMinutes: w.capacityMinutes - w.usedMinutes,
    utilizationPercent: Math.round(w.usedMinutes / w.capacityMinutes * 100),
    reservationCount: w.reservations.length,
  }));

  return { data, total, page: Math.floor(skip / take) + 1, pageSize: take, totalPages: Math.ceil(total / take) };
}

async function executePaymentRequestsPending(filters: any, skip: number, take: number, sortField?: string, sortDir?: string): Promise<ReportResult> {
  const where: any = { status: 'PENDING' };
  if (filters.customerId) where.customerId = filters.customerId;

  const [payments, total] = await Promise.all([
    prisma.paymentRequest.findMany({
      where,
      include: { customer: true },
      skip,
      take,
      orderBy: { createdAt: 'desc' },
    }),
    prisma.paymentRequest.count({ where }),
  ]);

  const data = payments.map(p => ({
    id: p.id,
    paymentNumber: p.requestNumber,
    customerName: p.customer.name,
    amount: Number(p.amount),
    paymentMethod: p.paymentMethod,
    submittedAt: p.createdAt,
    status: p.status,
  }));

  return { data, total, page: Math.floor(skip / take) + 1, pageSize: take, totalPages: Math.ceil(total / take) };
}

async function executeUserList(filters: any, skip: number, take: number, sortField?: string, sortDir?: string): Promise<ReportResult> {
  const where: any = {};
  if (filters.roleId) where.roleId = filters.roleId;
  if (filters.isActive !== undefined) where.isActive = filters.isActive === 'true';

  const [users, total] = await Promise.all([
    prisma.user.findMany({
      where,
      include: { role: true, customer: true },
      skip,
      take,
      orderBy: { firstName: 'asc' },
    }),
    prisma.user.count({ where }),
  ]);

  const data = users.map(u => ({
    id: u.id,
    name: `${u.firstName} ${u.lastName}`,
    email: u.email,
    roleName: u.role?.name || '-',
    customerName: u.customer?.name || '-',
    lastLogin: null,
    isActive: u.isActive ? 'Active' : 'Inactive',
    createdAt: u.createdAt,
  }));

  return { data, total, page: Math.floor(skip / take) + 1, pageSize: take, totalPages: Math.ceil(total / take) };
}

async function executeAuditLog(filters: any, skip: number, take: number, sortField?: string, sortDir?: string): Promise<ReportResult> {
  const where: any = {};
  if (filters.entityType) where.entityType = filters.entityType;
  if (filters.action) where.action = filters.action;
  if (filters.userId) where.userId = filters.userId;
  if (filters.dateFrom) where.createdAt = { ...where.createdAt, gte: new Date(filters.dateFrom) };
  if (filters.dateTo) where.createdAt = { ...where.createdAt, lte: new Date(filters.dateTo) };

  const [logs, total] = await Promise.all([
    prisma.auditLog.findMany({
      where,
      skip,
      take,
      orderBy: { createdAt: 'desc' },
    }),
    prisma.auditLog.count({ where }),
  ]);

  const userIds = logs.map(l => l.userId).filter(Boolean) as string[];
  const users = userIds.length > 0 ? await prisma.user.findMany({ where: { id: { in: userIds } } }) : [];
  const userMap = new Map(users.map(u => [u.id, `${u.firstName} ${u.lastName}`]));

  const data = logs.map(l => ({
    id: l.id,
    timestamp: l.createdAt,
    userName: l.userId ? userMap.get(l.userId) || 'Unknown' : 'System',
    action: l.action,
    entityType: l.entityType,
    entityId: l.entityId || '-',
    description: '-',
    ipAddress: l.ipAddress || '-',
  }));

  return { data, total, page: Math.floor(skip / take) + 1, pageSize: take, totalPages: Math.ceil(total / take) };
}

async function executeDispensingDaily(filters: any, skip: number, take: number, sortField?: string, sortDir?: string): Promise<ReportResult> {
  const where: any = { dispensedAt: { not: null } };
  if (filters.dateFrom) where.dispensedAt = { ...where.dispensedAt, gte: new Date(filters.dateFrom) };
  if (filters.dateTo) where.dispensedAt = { ...where.dispensedAt, lte: new Date(filters.dateTo) };

  const doses = await prisma.doseUnit.findMany({
    where,
    include: { batch: { include: { product: true } } },
  });

  const dailyData: Record<string, any> = {};

  for (const d of doses) {
    const dateKey = d.dispensedAt!.toISOString().slice(0, 10);
    const productName = d.batch.product.name;
    const key = `${dateKey}-${d.batch.productId}`;

    if (!dailyData[key]) {
      dailyData[key] = {
        id: key,
        date: d.dispensedAt,
        productName,
        batchCount: new Set(),
        doseCount: 0,
        totalActivity: 0,
        wasteCount: 0,
      };
    }
    dailyData[key].batchCount.add(d.batchId);
    dailyData[key].doseCount++;
    dailyData[key].totalActivity += Number(d.dispensedActivity || 0);
    if (d.status === 'WASTED') dailyData[key].wasteCount++;
  }

  const data = Object.values(dailyData).map((d: any) => ({
    ...d,
    batchCount: d.batchCount.size,
  }));

  data.sort((a: any, b: any) => new Date(b.date).getTime() - new Date(a.date).getTime());
  const total = data.length;

  return { data: data.slice(skip, skip + take), total, page: Math.floor(skip / take) + 1, pageSize: take, totalPages: Math.ceil(total / take) };
}

async function executeProductCatalog(filters: any, skip: number, take: number, sortField?: string, sortDir?: string): Promise<ReportResult> {
  const where: any = {};
  if (filters.isActive !== undefined) where.isActive = filters.isActive === 'true';

  const [products, total] = await Promise.all([
    prisma.product.findMany({
      where,
      skip,
      take,
      orderBy: { name: 'asc' },
    }),
    prisma.product.count({ where }),
  ]);

  const data = products.map(p => ({
    id: p.id,
    code: p.code,
    name: p.name,
    nameAr: p.nameAr || '-',
    categoryName: p.productType || '-',
    halfLife: p.halfLifeMinutes,
    unitPrice: Number(p.unitPrice || 0),
    isActive: p.isActive ? 'Active' : 'Inactive',
  }));

  return { data, total, page: Math.floor(skip / take) + 1, pageSize: take, totalPages: Math.ceil(total / take) };
}
