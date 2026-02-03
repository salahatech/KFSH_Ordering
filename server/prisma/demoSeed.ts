import { PrismaClient, ProductType, ProductionMethod, OrderStatus, BatchStatus, ShipmentStatus, InvoiceStatus, DoseUnitStatus, ReservationStatus, PaymentRequestStatus } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

type DemoMode = 'FULLY_COMPLETED' | 'LIVE_DEMO';
const DEMO_MODE: DemoMode = (process.env.DEMO_MODE as DemoMode) || 'LIVE_DEMO';

const today = new Date();
const tomorrow = new Date(today);
tomorrow.setDate(tomorrow.getDate() + 1);

function riyadhDate(daysOffset: number, hours: number, minutes: number = 0): Date {
  const d = new Date();
  d.setDate(d.getDate() + daysOffset);
  d.setHours(hours + 3, minutes, 0, 0);
  return d;
}

async function main() {
  console.log(`\n${'='.repeat(60)}`);
  console.log(`  RadioPharma OMS - Demo Data Seed`);
  console.log(`  Mode: ${DEMO_MODE}`);
  console.log(`${'='.repeat(60)}\n`);

  const hashedPassword = await bcrypt.hash('demo123', 10);

  console.log('1. Creating Company Settings...');
  await seedCompanySettings();

  console.log('2. Creating Cost Centers...');
  await seedCostCenters();

  console.log('3. Creating Geographic Data...');
  await seedGeographicData();

  console.log('4. Creating Roles and Permissions...');
  const roles = await seedRolesAndPermissions();

  console.log('5. Creating Demo Users...');
  const users = await seedDemoUsers(roles, hashedPassword);

  console.log('6. Creating Customers...');
  const customers = await seedCustomers(users);

  console.log('7. Creating Products with QC Templates...');
  const products = await seedProducts();

  console.log('8. Creating Equipment...');
  await seedEquipment();

  console.log('9. Creating Delivery Windows...');
  await seedDeliveryWindows();

  console.log('10. Creating Drivers...');
  const drivers = await seedDrivers(users, roles);

  console.log('11. Creating Time Standards...');
  await seedTimeStandards(products);

  console.log('12. Creating Warehouses...');
  await seedWarehouses();

  console.log('\n--- DEMO JOURNEY DATA ---\n');

  console.log('13. Creating Happy Path Journey...');
  await seedHappyPathJourney(users, customers, products, drivers);

  console.log('14. Creating Planner Demo Data...');
  await seedPlannerData(users, customers, products);

  console.log('15. Creating Additional Demo Cases...');
  await seedAdditionalCases(users, customers, products, drivers);

  printCredentials();
}

async function seedCompanySettings() {
  const settings = [
    { key: 'COMPANY_NAME', value: 'RadioPharma Demo Co.', category: 'company', description: 'Company name for invoices' },
    { key: 'COMPANY_NAME_AR', value: 'شركة راديو فارما التجريبية', category: 'company', description: 'Company name in Arabic' },
    { key: 'SELLER_VAT_NO', value: '310000000000003', category: 'company', description: 'VAT Registration Number (15 digits)' },
    { key: 'SELLER_CR_NO', value: '1010123456', category: 'company', description: 'Commercial Registration Number' },
    { key: 'COMPANY_ADDRESS', value: 'King Fahd Road, Al Olaya District, Riyadh 12244, Saudi Arabia', category: 'company' },
    { key: 'COMPANY_ADDRESS_AR', value: 'طريق الملك فهد، حي العليا، الرياض 12244، المملكة العربية السعودية', category: 'company' },
    { key: 'COMPANY_PHONE', value: '+966112345678', category: 'company' },
    { key: 'COMPANY_EMAIL', value: 'info@radiopharma-demo.com', category: 'company' },
    { key: 'INVOICE_GENERATION_TRIGGER', value: 'ON_DELIVERED', category: 'invoice', description: 'When to auto-generate invoices' },
    { key: 'INVOICE_AUTO_CLOSE', value: 'true', category: 'invoice', description: 'Auto-close paid invoices' },
    { key: 'DEFAULT_PAYMENT_TERMS_DAYS', value: '30', category: 'invoice' },
    { key: 'VAT_RATE', value: '15', category: 'tax', description: 'Default VAT rate (%)' },
    { key: 'DEMO_MODE', value: DEMO_MODE, category: 'system' },
  ];

  for (const s of settings) {
    await prisma.systemConfig.upsert({
      where: { key: s.key },
      update: { value: s.value },
      create: s,
    });
  }
}

async function seedCostCenters() {
  const costCenters = [
    { code: 'CC100', name: 'Production', description: 'Radiopharmaceutical production operations' },
    { code: 'CC110', name: 'QC Lab', description: 'Quality Control laboratory' },
    { code: 'CC120', name: 'Logistics', description: 'Delivery and logistics operations' },
    { code: 'CC200', name: 'Sales', description: 'Sales and customer service' },
    { code: 'CC300', name: 'Admin', description: 'Administrative overhead' },
  ];

  for (const cc of costCenters) {
    await prisma.systemConfig.upsert({
      where: { key: `COST_CENTER_${cc.code}` },
      update: { value: cc.name },
      create: { key: `COST_CENTER_${cc.code}`, value: cc.name, category: 'cost_center', description: cc.description },
    });
  }
}

async function seedGeographicData() {
  const sa = await prisma.settingCountry.upsert({
    where: { code: 'SA' },
    update: {},
    create: { code: 'SA', name: 'Saudi Arabia', nameAr: 'المملكة العربية السعودية', isActive: true },
  });

  const riyadhRegion = await prisma.settingRegion.upsert({
    where: { countryId_code: { countryId: sa.id, code: 'RIY' } },
    update: {},
    create: { countryId: sa.id, code: 'RIY', name: 'Riyadh Region', nameAr: 'منطقة الرياض' },
  });

  await prisma.settingCity.upsert({
    where: { countryId_code: { countryId: sa.id, code: 'RUH' } },
    update: {},
    create: { countryId: sa.id, regionId: riyadhRegion.id, code: 'RUH', name: 'Riyadh', nameAr: 'الرياض' },
  });

  await prisma.settingCity.upsert({
    where: { countryId_code: { countryId: sa.id, code: 'JED' } },
    update: {},
    create: { countryId: sa.id, code: 'JED', name: 'Jeddah', nameAr: 'جدة' },
  });

  await prisma.settingCity.upsert({
    where: { countryId_code: { countryId: sa.id, code: 'DMM' } },
    update: {},
    create: { countryId: sa.id, code: 'DMM', name: 'Dammam', nameAr: 'الدمام' },
  });
}

async function seedRolesAndPermissions() {
  const permissionNames = [
    'create_order', 'approve_order', 'schedule_batch', 'enter_qc_results', 'release_batch',
    'dispatch_shipment', 'view_reports', 'manage_users', 'manage_products', 'manage_customers',
    'manage_invoices', 'confirm_payments', 'view_dashboard', 'manage_drivers', 'deliver_shipment',
  ];

  const permissions = await Promise.all(
    permissionNames.map(name =>
      prisma.permission.upsert({
        where: { name },
        update: {},
        create: { name, description: `Permission to ${name.replace(/_/g, ' ')}` },
      })
    )
  );

  const permMap = Object.fromEntries(permissions.map(p => [p.name, p.id]));
  const allPerms = permissions.map(p => ({ id: p.id }));

  const roleConfigs = [
    { name: 'Admin', description: 'Full system access', permissions: allPerms },
    { name: 'Order Desk', description: 'Order validation and processing', permissions: ['create_order', 'approve_order', 'view_reports', 'manage_customers'].map(n => ({ id: permMap[n] })) },
    { name: 'Production Planner', description: 'Production planning and scheduling', permissions: ['schedule_batch', 'view_reports', 'view_dashboard'].map(n => ({ id: permMap[n] })) },
    { name: 'QC Analyst', description: 'Quality Control testing', permissions: ['enter_qc_results', 'view_reports', 'view_dashboard'].map(n => ({ id: permMap[n] })) },
    { name: 'Qualified Person', description: 'Batch release authority (QP)', permissions: ['release_batch', 'enter_qc_results', 'view_reports', 'view_dashboard'].map(n => ({ id: permMap[n] })) },
    { name: 'Logistics', description: 'Shipment and delivery coordination', permissions: ['dispatch_shipment', 'manage_drivers', 'view_reports', 'view_dashboard'].map(n => ({ id: permMap[n] })) },
    { name: 'Finance', description: 'Invoice and payment management', permissions: ['manage_invoices', 'confirm_payments', 'view_reports', 'view_dashboard'].map(n => ({ id: permMap[n] })) },
    { name: 'Customer', description: 'Customer portal access', permissions: ['create_order', 'view_reports'].map(n => ({ id: permMap[n] })) },
    { name: 'Driver', description: 'Driver portal access', permissions: ['deliver_shipment', 'view_dashboard'].map(n => ({ id: permMap[n] })) },
  ];

  const roles: Record<string, any> = {};
  for (const rc of roleConfigs) {
    roles[rc.name] = await prisma.role.upsert({
      where: { name: rc.name },
      update: { permissions: { set: rc.permissions } },
      create: { name: rc.name, description: rc.description, permissions: { connect: rc.permissions } },
    });
  }

  return roles;
}

async function seedDemoUsers(roles: Record<string, any>, hashedPassword: string) {
  const userConfigs = [
    { email: 'admin@demo.com', firstName: 'Ahmed', lastName: 'Admin', role: 'Admin' },
    { email: 'orderdesk@demo.com', firstName: 'Omar', lastName: 'Validator', role: 'Order Desk' },
    { email: 'planner@demo.com', firstName: 'Fahad', lastName: 'Planner', role: 'Production Planner' },
    { email: 'qc@demo.com', firstName: 'Qasim', lastName: 'Analyst', role: 'QC Analyst' },
    { email: 'qp@demo.com', firstName: 'Khalid', lastName: 'QPerson', role: 'Qualified Person' },
    { email: 'logistics@demo.com', firstName: 'Laith', lastName: 'Shipper', role: 'Logistics' },
    { email: 'finance@demo.com', firstName: 'Faisal', lastName: 'Finance', role: 'Finance' },
  ];

  const users: Record<string, any> = {};
  for (const uc of userConfigs) {
    users[uc.role] = await prisma.user.upsert({
      where: { email: uc.email },
      update: {},
      create: {
        email: uc.email,
        password: hashedPassword,
        firstName: uc.firstName,
        lastName: uc.lastName,
        roleId: roles[uc.role].id,
      },
    });
  }

  return users;
}

async function seedCustomers(users: Record<string, any>) {
  const customerRole = await prisma.role.findUnique({ where: { name: 'Customer' } });
  const hashedPassword = await bcrypt.hash('demo123', 10);

  const riyadhCity = await prisma.settingCity.findFirst({ where: { code: 'RUH' } });
  const sa = await prisma.settingCountry.findFirst({ where: { code: 'SA' } });
  const riyadhRegion = await prisma.settingRegion.findFirst({ where: { code: 'RIY' } });

  const customerA = await prisma.customer.upsert({
    where: { code: 'CUST-001' },
    update: {},
    create: {
      code: 'CUST-001',
      name: 'Al Noor Hospital',
      nameEn: 'Al Noor Hospital',
      nameAr: 'مستشفى النور',
      email: 'billing@alnoorhospital.sa',
      mobile: '+966512345678',
      phone: '+966112223344',
      crNumber: '1010567890',
      taxNumber: '310123456700003',
      fullAddress: 'King Fahd Road, Al Olaya District, Building 45, Riyadh 12244',
      shortAddress: 'RRRD1234',
      street: 'King Fahd Road',
      district: 'Al Olaya',
      buildingNo: '45',
      postalCode: '12244',
      cityId: riyadhCity?.id,
      regionId: riyadhRegion?.id,
      countryId: sa?.id,
      latitude: 24.7136,
      longitude: 46.6753,
      deliveryWindowStart: '08:00',
      deliveryWindowEnd: '17:00',
      preferredDeliveryTime: '10:00',
      travelTimeMinutes: 45,
      isActive: true,
    },
  });

  const portalUser1 = await prisma.user.upsert({
    where: { email: 'portal1@hospitaldemo.com' },
    update: { customerId: customerA.id },
    create: {
      email: 'portal1@hospitaldemo.com',
      password: hashedPassword,
      firstName: 'Nora',
      lastName: 'Nuclear',
      roleId: customerRole!.id,
      customerId: customerA.id,
    },
  });

  const portalUser2 = await prisma.user.upsert({
    where: { email: 'portal2@hospitaldemo.com' },
    update: { customerId: customerA.id },
    create: {
      email: 'portal2@hospitaldemo.com',
      password: hashedPassword,
      firstName: 'Billing',
      lastName: 'Manager',
      roleId: customerRole!.id,
      customerId: customerA.id,
    },
  });

  await prisma.customerContact.upsert({
    where: { id: 'contact-alnoor-primary' },
    update: {},
    create: {
      id: 'contact-alnoor-primary',
      customerId: customerA.id,
      name: 'Dr. Nadia Al-Rashid',
      title: 'Nuclear Medicine Department Head',
      email: 'nadia.rashid@alnoorhospital.sa',
      phone: '+966512345679',
      isPrimary: true,
    },
  });

  return { customerA, portalUser1, portalUser2 };
}

async function seedProducts() {
  const products: Record<string, any> = {};

  products['FDG'] = await prisma.product.upsert({
    where: { code: 'FDG-18' },
    update: {},
    create: {
      name: 'FDG (Fludeoxyglucose F-18)',
      code: 'FDG-18',
      productType: ProductType.PET,
      radionuclide: 'F-18',
      halfLifeMinutes: 109.8,
      shelfLifeMinutes: 600,
      minConcentration: 37,
      maxConcentration: 3700,
      standardDose: 10,
      doseUnit: 'mCi',
      productionMethod: ProductionMethod.CYCLOTRON,
      synthesisTimeMinutes: 45,
      qcTimeMinutes: 30,
      packagingTimeMinutes: 15,
      packagingType: 'Type A package',
      transportConstraints: 'Maintain 15-25°C',
      overagePercent: 15,
    },
  });

  const fdgTemplates = [
    { testName: 'Visual Inspection', testMethod: 'Visual', acceptanceCriteria: 'Clear, colorless, particulate-free', isRequired: true, sortOrder: 0 },
    { testName: 'pH', testMethod: 'pH meter', acceptanceCriteria: '4.5-8.5', minValue: 4.5, maxValue: 8.5, isRequired: true, sortOrder: 1 },
    { testName: 'Radiochemical Purity', testMethod: 'HPLC', acceptanceCriteria: '≥95%', minValue: 95, maxValue: 100, unit: '%', isRequired: true, sortOrder: 2 },
    { testName: 'Radionuclidic Identity', testMethod: 'Half-life measurement', acceptanceCriteria: '105-115 min', minValue: 105, maxValue: 115, unit: 'min', isRequired: true, sortOrder: 3 },
    { testName: 'Endotoxin', testMethod: 'LAL', acceptanceCriteria: '<175 EU/V', minValue: 0, maxValue: 175, unit: 'EU/V', isRequired: true, sortOrder: 4 },
    { testName: 'Sterility', testMethod: 'Membrane filtration', acceptanceCriteria: 'No growth', isRequired: true, sortOrder: 5 },
  ];

  for (const t of fdgTemplates) {
    await prisma.qCTemplate.upsert({
      where: { id: `fdg-qc-${t.sortOrder}` },
      update: {},
      create: { id: `fdg-qc-${t.sortOrder}`, productId: products['FDG'].id, ...t },
    });
  }

  products['TC99M-MDP'] = await prisma.product.upsert({
    where: { code: 'TC99M-MDP' },
    update: {},
    create: {
      name: 'Tc-99m MDP (Bone Scan)',
      code: 'TC99M-MDP',
      productType: ProductType.SPECT,
      radionuclide: 'Tc-99m',
      halfLifeMinutes: 360,
      shelfLifeMinutes: 480,
      standardDose: 25,
      doseUnit: 'mCi',
      productionMethod: ProductionMethod.GENERATOR,
      synthesisTimeMinutes: 30,
      qcTimeMinutes: 20,
      packagingTimeMinutes: 10,
      overagePercent: 10,
    },
  });

  products['I131'] = await prisma.product.upsert({
    where: { code: 'I-131' },
    update: {},
    create: {
      name: 'I-131 Sodium Iodide (Therapy)',
      code: 'I-131',
      productType: ProductType.THERAPY,
      radionuclide: 'I-131',
      halfLifeMinutes: 11520,
      shelfLifeMinutes: 43200,
      standardDose: 100,
      doseUnit: 'mCi',
      productionMethod: ProductionMethod.KIT,
      synthesisTimeMinutes: 15,
      qcTimeMinutes: 15,
      packagingTimeMinutes: 20,
      overagePercent: 5,
    },
  });

  return products;
}

async function seedEquipment() {
  const equipment = [
    { code: 'CYC-01', name: 'Cyclotron Unit 1', type: 'CYCLOTRON', location: 'Production Hall A' },
    { code: 'SYN-01', name: 'Synthesis Module 1', type: 'SYNTHESIS_MODULE', location: 'Hot Cell Bay 1' },
    { code: 'SYN-02', name: 'Synthesis Module 2', type: 'SYNTHESIS_MODULE', location: 'Hot Cell Bay 2' },
    { code: 'HC-01', name: 'Hot Cell 1', type: 'HOT_CELL', location: 'Dispensing Area' },
    { code: 'HC-02', name: 'Hot Cell 2', type: 'HOT_CELL', location: 'Dispensing Area' },
    { code: 'DISP-01', name: 'Dispensing Cell 1', type: 'DISPENSING_CELL', location: 'Dispensing Area' },
  ];

  for (const eq of equipment) {
    await prisma.equipment.upsert({
      where: { code: eq.code },
      update: {},
      create: eq,
    });
  }
}

async function seedDeliveryWindows() {
  for (let i = 0; i < 7; i++) {
    const windowDate = new Date();
    windowDate.setDate(windowDate.getDate() + i);
    windowDate.setHours(0, 0, 0, 0);

    const morningStart = new Date(windowDate);
    morningStart.setHours(8, 0, 0, 0);
    const morningEnd = new Date(windowDate);
    morningEnd.setHours(12, 0, 0, 0);

    await prisma.deliveryWindow.upsert({
      where: { date_startTime_endTime: { date: windowDate, startTime: morningStart, endTime: morningEnd } },
      update: {},
      create: {
        name: `Morning Window Day ${i + 1}`,
        date: windowDate,
        startTime: morningStart,
        endTime: morningEnd,
        capacityMinutes: 240,
        usedMinutes: 0,
        isActive: true,
      },
    });

    const afternoonStart = new Date(windowDate);
    afternoonStart.setHours(13, 0, 0, 0);
    const afternoonEnd = new Date(windowDate);
    afternoonEnd.setHours(17, 0, 0, 0);

    await prisma.deliveryWindow.upsert({
      where: { date_startTime_endTime: { date: windowDate, startTime: afternoonStart, endTime: afternoonEnd } },
      update: {},
      create: {
        name: `Afternoon Window Day ${i + 1}`,
        date: windowDate,
        startTime: afternoonStart,
        endTime: afternoonEnd,
        capacityMinutes: 240,
        usedMinutes: 0,
        isActive: true,
      },
    });
  }
}

async function seedDrivers(users: Record<string, any>, roles: Record<string, any>) {
  const hashedPassword = await bcrypt.hash('demo123', 10);

  const driverUser = await prisma.user.upsert({
    where: { email: 'driver1@demo.com' },
    update: {},
    create: {
      email: 'driver1@demo.com',
      password: hashedPassword,
      firstName: 'Mohammed',
      lastName: 'Driver',
      roleId: roles['Driver'].id,
    },
  });

  const driver1 = await prisma.driver.upsert({
    where: { id: 'driver-demo-1' },
    update: { userId: driverUser.id },
    create: {
      id: 'driver-demo-1',
      fullName: 'Mohammed Al-Harbi',
      mobile: '+966551234567',
      email: 'driver1@demo.com',
      nationalId: '1234567890',
      driverLicenseNo: 'DL-2024-12345',
      licenseExpiryDate: new Date('2026-12-31'),
      vehicleType: 'VAN',
      vehiclePlateNo: 'ABC 1234',
      vehicleModel: 'Toyota Hiace 2023',
      status: 'ACTIVE',
      userId: driverUser.id,
    },
  });

  for (let i = 0; i < 7; i++) {
    const availDate = new Date();
    availDate.setDate(availDate.getDate() + i);
    availDate.setHours(0, 0, 0, 0);

    await prisma.driverAvailability.upsert({
      where: { id: `driver1-avail-${i}` },
      update: {},
      create: {
        id: `driver1-avail-${i}`,
        driverId: driver1.id,
        date: availDate,
        startTime: '06:00',
        endTime: '18:00',
        isAvailable: true,
      },
    });
  }

  return { driver1, driverUser };
}

async function seedTimeStandards(products: Record<string, any>) {
  const standards = [
    { productId: products['FDG'].id, processType: 'DISPENSING', standardMinutes: 15, description: 'Time to dispense one FDG dose' },
    { productId: products['FDG'].id, processType: 'PACKAGING', standardMinutes: 10, description: 'Time to package one FDG dose' },
    { productId: products['TC99M-MDP'].id, processType: 'DISPENSING', standardMinutes: 10, description: 'Time to dispense one Tc-99m dose' },
    { productId: products['TC99M-MDP'].id, processType: 'PACKAGING', standardMinutes: 8, description: 'Time to package one Tc-99m dose' },
    { productId: products['I131'].id, processType: 'DISPENSING', standardMinutes: 20, description: 'Time to dispense one I-131 dose' },
    { productId: products['I131'].id, processType: 'PACKAGING', standardMinutes: 15, description: 'Time to package one I-131 dose' },
  ];

  for (const ts of standards) {
    await prisma.timeStandard.upsert({
      where: { productId_processType: { productId: ts.productId, processType: ts.processType } },
      update: {},
      create: ts,
    });
  }
}

async function seedWarehouses() {
  const warehouses = [
    { code: 'WH-RM', name: 'Raw Materials Warehouse', nameAr: 'مستودع المواد الخام', type: 'RAW_MATERIALS', address: 'Building A, Ground Floor' },
    { code: 'WH-QR', name: 'Quarantine Storage', nameAr: 'مستودع الحجر', type: 'QUARANTINE', address: 'Building A, Basement' },
    { code: 'WH-PROD', name: 'Production Area', nameAr: 'منطقة الإنتاج', type: 'PRODUCTION', address: 'Building B, Floor 1' },
    { code: 'WH-FG', name: 'Finished Goods', nameAr: 'مستودع المنتجات النهائية', type: 'FINISHED_GOODS', address: 'Building C, Floor 1' },
    { code: 'WH-COLD', name: 'Cold Storage', nameAr: 'التخزين البارد', type: 'COLD_STORAGE', address: 'Building A, Temperature Controlled', temperatureMin: 2, temperatureMax: 8 },
    { code: 'WH-RAD', name: 'Radioactive Storage', nameAr: 'مستودع المواد المشعة', type: 'RADIOACTIVE', address: 'Building D, Shielded Area', isRadioactive: true },
  ];

  for (const wh of warehouses) {
    const warehouse = await prisma.warehouse.upsert({
      where: { code: wh.code },
      update: {},
      create: wh as any,
    });

    if (wh.code === 'WH-RM') {
      const locations = [
        { warehouseId: warehouse.id, code: 'RM-A1-01', name: 'A1-01', zone: 'A', aisle: '1', rack: '01', shelf: '1', bin: '01' },
        { warehouseId: warehouse.id, code: 'RM-A1-02', name: 'A1-02', zone: 'A', aisle: '1', rack: '01', shelf: '2', bin: '01' },
        { warehouseId: warehouse.id, code: 'RM-A2-01', name: 'A2-01', zone: 'A', aisle: '2', rack: '01', shelf: '1', bin: '01' },
      ];
      for (const loc of locations) {
        await prisma.warehouseLocation.upsert({
          where: { warehouseId_code: { warehouseId: loc.warehouseId, code: loc.code } },
          update: {},
          create: loc,
        });
      }
    }

    if (wh.code === 'WH-FG') {
      const locations = [
        { warehouseId: warehouse.id, code: 'FG-A1-01', name: 'A1-01', zone: 'A', aisle: '1', rack: '01', shelf: '1', bin: '01' },
        { warehouseId: warehouse.id, code: 'FG-B1-01', name: 'B1-01', zone: 'B', aisle: '1', rack: '01', shelf: '1', bin: '01' },
      ];
      for (const loc of locations) {
        await prisma.warehouseLocation.upsert({
          where: { warehouseId_code: { warehouseId: loc.warehouseId, code: loc.code } },
          update: {},
          create: loc,
        });
      }
    }

    if (wh.code === 'WH-COLD') {
      const locations = [
        { warehouseId: warehouse.id, code: 'COLD-01', name: 'Cold 01', zone: 'COLD', aisle: '1', rack: '01', shelf: '1', bin: '01' },
        { warehouseId: warehouse.id, code: 'COLD-02', name: 'Cold 02', zone: 'COLD', aisle: '1', rack: '01', shelf: '2', bin: '01' },
      ];
      for (const loc of locations) {
        await prisma.warehouseLocation.upsert({
          where: { warehouseId_code: { warehouseId: loc.warehouseId, code: loc.code } },
          update: {},
          create: loc,
        });
      }
    }
  }
}

async function seedHappyPathJourney(users: Record<string, any>, customers: any, products: Record<string, any>, drivers: any) {
  const { customerA, portalUser1 } = customers;
  const { driver1 } = drivers;

  const deliveryTime = riyadhDate(1, 10, 30);
  const injectionTime = riyadhDate(1, 11, 0);

  const order = await prisma.order.upsert({
    where: { orderNumber: 'O-10001' },
    update: {},
    create: {
      orderNumber: 'O-10001',
      customerId: customerA.id,
      productId: products['FDG'].id,
      deliveryDate: deliveryTime,
      deliveryTimeStart: deliveryTime,
      deliveryTimeEnd: new Date(deliveryTime.getTime() + 30 * 60000),
      requestedActivity: 40,
      activityUnit: 'mCi',
      numberOfDoses: 4,
      injectionTime: injectionTime,
      patientCount: 4,
      specialNotes: 'Demo order - Happy path journey',
      status: DEMO_MODE === 'LIVE_DEMO' ? OrderStatus.DISPATCHED : OrderStatus.DELIVERED,
    },
  });

  const orderStatuses: OrderStatus[] = [
    OrderStatus.DRAFT, OrderStatus.SUBMITTED, OrderStatus.VALIDATED,
    OrderStatus.SCHEDULED, OrderStatus.IN_PRODUCTION, OrderStatus.QC_PENDING,
    OrderStatus.RELEASED, OrderStatus.DISPATCHED,
  ];
  if (DEMO_MODE === 'FULLY_COMPLETED') {
    orderStatuses.push(OrderStatus.DELIVERED);
  }

  let eventTime = new Date();
  eventTime.setHours(eventTime.getHours() - 24);

  for (let i = 0; i < orderStatuses.length; i++) {
    const fromStatus = i === 0 ? null : orderStatuses[i - 1];
    const toStatus = orderStatuses[i];
    
    await prisma.orderHistory.create({
      data: {
        orderId: order.id,
        fromStatus,
        toStatus,
        changedBy: users['Order Desk']?.id || users['Admin']?.id,
        changeNotes: `Order ${toStatus.toLowerCase().replace('_', ' ')}`,
        createdAt: new Date(eventTime),
      },
    });
    eventTime = new Date(eventTime.getTime() + 60 * 60000);
  }

  const equipment = await prisma.equipment.findFirst({ where: { type: 'SYNTHESIS_MODULE' } });
  const hotCell = await prisma.equipment.findFirst({ where: { type: 'HOT_CELL' } });

  const batch = await prisma.batch.upsert({
    where: { batchNumber: 'B-20001' },
    update: {},
    create: {
      batchNumber: 'B-20001',
      productId: products['FDG'].id,
      plannedStartTime: riyadhDate(1, 5, 0),
      plannedEndTime: riyadhDate(1, 7, 30),
      actualStartTime: riyadhDate(1, 5, 15),
      actualEndTime: riyadhDate(1, 7, 25),
      targetActivity: 50,
      actualActivity: 48,
      activityUnit: 'mCi',
      calibrationTime: riyadhDate(1, 7, 0),
      synthesisModuleId: equipment?.id,
      hotCellId: hotCell?.id,
      status: DEMO_MODE === 'LIVE_DEMO' ? BatchStatus.DISPATCHED : BatchStatus.CLOSED,
      notes: 'Demo batch - Happy path',
    },
  });

  await prisma.order.update({
    where: { id: order.id },
    data: { batchId: batch.id },
  });

  const batchStatuses: BatchStatus[] = [
    BatchStatus.PLANNED, BatchStatus.SCHEDULED, BatchStatus.IN_PRODUCTION,
    BatchStatus.PRODUCTION_COMPLETE, BatchStatus.QC_PENDING, BatchStatus.QC_IN_PROGRESS,
    BatchStatus.QC_PASSED, BatchStatus.QP_REVIEW, BatchStatus.RELEASED,
    BatchStatus.DISPENSING_IN_PROGRESS, BatchStatus.DISPENSED, BatchStatus.PACKED, BatchStatus.DISPATCHED,
  ];
  if (DEMO_MODE === 'FULLY_COMPLETED') {
    batchStatuses.push(BatchStatus.CLOSED);
  }

  eventTime = new Date();
  eventTime.setHours(eventTime.getHours() - 20);

  for (let i = 0; i < batchStatuses.length; i++) {
    const fromStatus = i === 0 ? null : batchStatuses[i - 1];
    const toStatus = batchStatuses[i];

    await prisma.batchEvent.create({
      data: {
        batchId: batch.id,
        eventType: 'STATUS_CHANGE',
        fromStatus,
        toStatus,
        actorId: users['Production Planner']?.id || users['Admin']?.id,
        note: `Batch ${toStatus.toLowerCase().replace('_', ' ')}`,
        createdAt: new Date(eventTime),
      },
    });
    eventTime = new Date(eventTime.getTime() + 30 * 60000);
  }

  const qcTemplates = await prisma.qCTemplate.findMany({ where: { productId: products['FDG'].id } });
  for (const template of qcTemplates) {
    await prisma.qCResult.upsert({
      where: { id: `qc-result-${batch.id}-${template.id}` },
      update: {},
      create: {
        id: `qc-result-${batch.id}-${template.id}`,
        batchId: batch.id,
        templateId: template.id,
        numericResult: template.minValue ? (template.minValue + (template.maxValue! - template.minValue) * 0.7) : null,
        textResult: template.minValue ? null : 'Pass',
        passed: true,
        status: 'PASSED',
        testedById: users['QC Analyst']?.id,
        testedAt: riyadhDate(1, 6, 30),
        notes: 'All tests passed',
      },
    });
  }

  await prisma.batchRelease.upsert({
    where: { id: `release-${batch.id}` },
    update: {},
    create: {
      id: `release-${batch.id}`,
      batchId: batch.id,
      releasedById: users['Qualified Person']?.id || users['Admin']?.id,
      releaseType: 'FULL',
      electronicSignature: 'ESIG-QP-20240101-001',
      signatureTimestamp: riyadhDate(1, 7, 0),
      reason: 'All QC tests passed, batch approved for release',
    },
  });

  const shipment = await prisma.shipment.upsert({
    where: { shipmentNumber: 'S-30001' },
    update: {},
    create: {
      shipmentNumber: 'S-30001',
      customerId: customerA.id,
      driverId: driver1.id,
      assignedAt: riyadhDate(1, 8, 0),
      scheduledPickupAt: riyadhDate(1, 9, 45),
      scheduledDeliveryAt: deliveryTime,
      deliveryAddress: customerA.fullAddress,
      deliveryLat: 24.7136,
      deliveryLng: 46.6753,
      priority: 'NORMAL',
      status: DEMO_MODE === 'LIVE_DEMO' ? ShipmentStatus.IN_TRANSIT : ShipmentStatus.DELIVERED,
      notes: 'Demo shipment - Happy path',
    },
  });

  await prisma.order.update({
    where: { id: order.id },
    data: { shipmentId: shipment.id },
  });

  for (let i = 1; i <= 4; i++) {
    await prisma.doseUnit.upsert({
      where: { doseNumber: `DOSE-10001-${i}` },
      update: {},
      create: {
        doseNumber: `DOSE-10001-${i}`,
        batchId: batch.id,
        orderId: order.id,
        shipmentId: shipment.id,
        patientReference: `PT-${1000 + i}`,
        requestedActivity: 10,
        dispensedActivity: 10.5,
        calibrationTime: riyadhDate(1, 11, 0),
        volume: 0.5,
        containerType: '10mL vial',
        labelPrinted: true,
        labelPrintedAt: riyadhDate(1, 8, 30),
        dispensedById: users['QC Analyst']?.id,
        dispensedAt: riyadhDate(1, 8, 15),
        status: DEMO_MODE === 'LIVE_DEMO' ? DoseUnitStatus.SHIPPED : DoseUnitStatus.DELIVERED,
      },
    });
  }

  const shipmentEvents = [
    { status: ShipmentStatus.PACKED, note: 'Package sealed and labeled', hours: -4 },
    { status: ShipmentStatus.ASSIGNED_TO_DRIVER, note: 'Assigned to Mohammed Al-Harbi', hours: -3 },
    { status: ShipmentStatus.ACCEPTED_BY_DRIVER, note: 'Driver accepted delivery assignment', hours: -2.5 },
    { status: ShipmentStatus.PICKED_UP, note: 'Package picked up from facility', hours: -2 },
    { status: ShipmentStatus.IN_TRANSIT, note: 'En route to Al Noor Hospital', hours: -1.5, lat: 24.72, lng: 46.68 },
  ];

  if (DEMO_MODE === 'FULLY_COMPLETED') {
    shipmentEvents.push(
      { status: ShipmentStatus.ARRIVED, note: 'Arrived at destination', hours: -0.5, lat: 24.7136, lng: 46.6753 },
      { status: ShipmentStatus.DELIVERED, note: 'Delivery completed successfully', hours: 0, lat: 24.7136, lng: 46.6753 }
    );
  }

  for (const se of shipmentEvents) {
    const eventCreatedAt = new Date();
    eventCreatedAt.setHours(eventCreatedAt.getHours() + se.hours);

    await prisma.shipmentEvent.create({
      data: {
        shipmentId: shipment.id,
        eventType: 'STATUS_CHANGE',
        toStatus: se.status,
        driverId: driver1.id,
        notes: se.note,
        latitude: (se as any).lat,
        longitude: (se as any).lng,
        createdAt: eventCreatedAt,
      },
    });
  }

  if (DEMO_MODE === 'FULLY_COMPLETED') {
    await prisma.proofOfDelivery.upsert({
      where: { shipmentId: shipment.id },
      update: {},
      create: {
        shipmentId: shipment.id,
        deliveredAt: new Date(),
        receiverName: 'Dr. Nadia Al-Rashid',
        receiverMobile: '+966512345679',
        receiverIdType: 'Staff ID',
        gpsLat: 24.7136,
        gpsLng: 46.6753,
        notes: 'Delivered to Nuclear Medicine Department',
        capturedByDriverId: driver1.id,
      },
    });
  }

  const invoiceDueDate = new Date();
  invoiceDueDate.setDate(invoiceDueDate.getDate() + 30);
  const unitPrice = 500;
  const subtotal = 4 * unitPrice;
  const taxAmount = subtotal * 0.15;
  const totalAmount = subtotal + taxAmount;

  const invoice = await prisma.invoice.upsert({
    where: { invoiceNumber: 'INV-40001' },
    update: {},
    create: {
      invoiceNumber: 'INV-40001',
      customerId: customerA.id,
      orderId: order.id,
      shipmentId: shipment.id,
      invoiceDate: new Date(),
      dueDate: invoiceDueDate,
      subtotal,
      taxAmount,
      totalAmount,
      paidAmount: DEMO_MODE === 'LIVE_DEMO' ? 0 : totalAmount,
      remainingAmount: DEMO_MODE === 'LIVE_DEMO' ? totalAmount : 0,
      currency: 'SAR',
      totalAmountSAR: totalAmount,
      allowPartialPayment: true,
      status: DEMO_MODE === 'LIVE_DEMO' ? InvoiceStatus.ISSUED_POSTED : InvoiceStatus.CLOSED_ARCHIVED,
      triggerSource: 'ON_DELIVERED',
      postedAt: new Date(),
      issuedAt: new Date(),
      closedAt: DEMO_MODE === 'FULLY_COMPLETED' ? new Date() : null,
    },
  });

  await prisma.invoiceItem.upsert({
    where: { id: `inv-item-40001-1` },
    update: {},
    create: {
      id: `inv-item-40001-1`,
      invoiceId: invoice.id,
      orderId: order.id,
      description: 'FDG (Fludeoxyglucose F-18) - 10 mCi per dose',
      productId: products['FDG'].id,
      quantity: 4,
      unitPrice,
      taxPercent: 15,
      lineTotal: subtotal,
    },
  });

  await prisma.invoiceEvent.create({
    data: {
      invoiceId: invoice.id,
      eventType: 'CREATED',
      description: 'Invoice created from delivered shipment',
      userId: users['Finance']?.id,
    },
  });

  await prisma.invoiceEvent.create({
    data: {
      invoiceId: invoice.id,
      eventType: 'ISSUED',
      description: 'Invoice issued and posted',
      userId: users['Finance']?.id,
    },
  });

  if (DEMO_MODE === 'FULLY_COMPLETED') {
    const halfPayment = totalAmount / 2;

    const pr1 = await prisma.paymentRequest.upsert({
      where: { id: 'pr-50001' },
      update: {},
      create: {
        id: 'pr-50001',
        invoiceId: invoice.id,
        customerId: customerA.id,
        amount: halfPayment,
        amountSAR: halfPayment,
        currency: 'SAR',
        paymentMethod: 'BANK_TRANSFER',
        referenceNumber: 'TRF-2024-001',
        notes: 'First partial payment',
        status: PaymentRequestStatus.CONFIRMED,
        submittedByUserId: portalUser1.id,
        reviewedAt: new Date(),
        reviewedByUserId: users['Finance']?.id,
      },
    });

    const rv1 = await prisma.receiptVoucher.upsert({
      where: { receiptNumber: 'RV-60001' },
      update: {},
      create: {
        receiptNumber: 'RV-60001',
        invoiceId: invoice.id,
        customerId: customerA.id,
        paymentRequestId: pr1.id,
        amount: halfPayment,
        amountSAR: halfPayment,
        currency: 'SAR',
        paymentMethod: 'BANK_TRANSFER',
        referenceNumber: 'TRF-2024-001',
        confirmedByUserId: users['Finance']?.id,
      },
    });

    await prisma.paymentRequest.update({
      where: { id: pr1.id },
      data: { receiptVoucherId: rv1.id },
    });

    const pr2 = await prisma.paymentRequest.upsert({
      where: { id: 'pr-50002' },
      update: {},
      create: {
        id: 'pr-50002',
        invoiceId: invoice.id,
        customerId: customerA.id,
        amount: halfPayment,
        amountSAR: halfPayment,
        currency: 'SAR',
        paymentMethod: 'BANK_TRANSFER',
        referenceNumber: 'TRF-2024-002',
        notes: 'Final payment',
        status: PaymentRequestStatus.CONFIRMED,
        submittedByUserId: portalUser1.id,
        reviewedAt: new Date(),
        reviewedByUserId: users['Finance']?.id,
      },
    });

    const rv2 = await prisma.receiptVoucher.upsert({
      where: { receiptNumber: 'RV-60002' },
      update: {},
      create: {
        receiptNumber: 'RV-60002',
        invoiceId: invoice.id,
        customerId: customerA.id,
        paymentRequestId: pr2.id,
        amount: halfPayment,
        amountSAR: halfPayment,
        currency: 'SAR',
        paymentMethod: 'BANK_TRANSFER',
        referenceNumber: 'TRF-2024-002',
        confirmedByUserId: users['Finance']?.id,
      },
    });

    await prisma.paymentRequest.update({
      where: { id: pr2.id },
      data: { receiptVoucherId: rv2.id },
    });

    await prisma.invoiceEvent.create({
      data: {
        invoiceId: invoice.id,
        eventType: 'PAYMENT_RECEIVED',
        description: `Partial payment received: SAR ${halfPayment.toFixed(2)}`,
        userId: users['Finance']?.id,
      },
    });

    await prisma.invoiceEvent.create({
      data: {
        invoiceId: invoice.id,
        eventType: 'PAID',
        description: 'Invoice fully paid',
        userId: users['Finance']?.id,
      },
    });

    await prisma.invoiceEvent.create({
      data: {
        invoiceId: invoice.id,
        eventType: 'CLOSED',
        description: 'Invoice closed and archived',
        userId: users['Finance']?.id,
      },
    });
  }

  await seedNotifications(users, customers, order, batch, shipment, invoice, drivers);

  console.log(`   Created Order: ${order.orderNumber}`);
  console.log(`   Created Batch: ${batch.batchNumber}`);
  console.log(`   Created Shipment: ${shipment.shipmentNumber}`);
  console.log(`   Created Invoice: ${invoice.invoiceNumber}`);
}

async function seedNotifications(users: Record<string, any>, customers: any, order: any, batch: any, shipment: any, invoice: any, drivers: any) {
  const { portalUser1 } = customers;
  const { driverUser } = drivers;

  const notifications = [
    { userId: portalUser1.id, type: 'ORDER_SUBMITTED', title: 'Order Submitted', message: `Your order ${order.orderNumber} has been submitted for processing.`, relatedId: order.id, relatedType: 'Order' },
    { userId: portalUser1.id, type: 'ORDER_VALIDATED', title: 'Order Validated', message: `Your order ${order.orderNumber} has been validated and scheduled for production.`, relatedId: order.id, relatedType: 'Order' },
    { userId: users['Logistics']?.id, type: 'BATCH_RELEASED', title: 'Batch Released', message: `Batch ${batch.batchNumber} has been released by QP and is ready for dispatch.`, relatedId: batch.id, relatedType: 'Batch' },
    { userId: driverUser?.id, type: 'DISPATCH_UPDATE', title: 'New Delivery Assigned', message: `You have been assigned shipment ${shipment.shipmentNumber} for delivery.`, relatedId: shipment.id, relatedType: 'Shipment' },
    { userId: portalUser1.id, type: 'DISPATCH_UPDATE', title: 'Order Dispatched', message: `Your order ${order.orderNumber} is now on its way!`, relatedId: shipment.id, relatedType: 'Shipment' },
    { userId: users['Finance']?.id, type: 'SYSTEM', title: 'Invoice Generated', message: `Invoice ${invoice.invoiceNumber} has been generated for order ${order.orderNumber}.`, relatedId: invoice.id, relatedType: 'Invoice' },
  ];

  if (DEMO_MODE === 'FULLY_COMPLETED') {
    notifications.push(
      { userId: portalUser1.id, type: 'DELIVERY_UPDATE', title: 'Order Delivered', message: `Your order ${order.orderNumber} has been delivered successfully.`, relatedId: order.id, relatedType: 'Order' },
      { userId: users['Finance']?.id, type: 'SYSTEM', title: 'Payment Received', message: `Payment received for invoice ${invoice.invoiceNumber}.`, relatedId: invoice.id, relatedType: 'Invoice' }
    );
  }

  for (const n of notifications) {
    if (!n.userId) continue;
    await prisma.notification.create({
      data: {
        userId: n.userId,
        type: n.type as any,
        title: n.title,
        message: n.message,
        relatedId: n.relatedId,
        relatedType: n.relatedType,
        isRead: false,
      },
    });
  }
}

async function seedPlannerData(users: Record<string, any>, customers: any, products: Record<string, any>) {
  const { customerA, customerB } = customers;
  
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  const plannerOrders = [
    {
      orderNumber: 'O-20001',
      customerId: customerA.id,
      productId: products['FDG'].id,
      deliveryHour: 9,
      deliveryMinute: 0,
      requestedActivity: 30,
      numberOfDoses: 3,
      patientCount: 3,
      specialNotes: 'Planner demo - FDG morning delivery',
    },
    {
      orderNumber: 'O-20002',
      customerId: customerA.id,
      productId: products['FDG'].id,
      deliveryHour: 10,
      deliveryMinute: 30,
      requestedActivity: 45,
      numberOfDoses: 4,
      patientCount: 4,
      specialNotes: 'Planner demo - FDG late morning',
    },
    {
      orderNumber: 'O-20003',
      customerId: customerB?.id || customerA.id,
      productId: products['FDG'].id,
      deliveryHour: 11,
      deliveryMinute: 0,
      requestedActivity: 25,
      numberOfDoses: 2,
      patientCount: 2,
      specialNotes: 'Planner demo - FDG different customer',
    },
    {
      orderNumber: 'O-20004',
      customerId: customerA.id,
      productId: products['TC99M-MDP'].id,
      deliveryHour: 14,
      deliveryMinute: 0,
      requestedActivity: 20,
      numberOfDoses: 2,
      patientCount: 2,
      specialNotes: 'Planner demo - Tc-99m afternoon',
    },
    {
      orderNumber: 'O-20005',
      customerId: customerB?.id || customerA.id,
      productId: products['TC99M-MDP'].id,
      deliveryHour: 15,
      deliveryMinute: 0,
      requestedActivity: 35,
      numberOfDoses: 3,
      patientCount: 3,
      specialNotes: 'Planner demo - Tc-99m late afternoon',
    },
  ];

  for (const orderData of plannerOrders) {
    const deliveryTime = new Date(today);
    deliveryTime.setHours(orderData.deliveryHour, orderData.deliveryMinute, 0, 0);
    
    const injectionTime = new Date(deliveryTime);
    injectionTime.setMinutes(injectionTime.getMinutes() + 30);

    await prisma.order.upsert({
      where: { orderNumber: orderData.orderNumber },
      update: {},
      create: {
        orderNumber: orderData.orderNumber,
        customerId: orderData.customerId,
        productId: orderData.productId,
        deliveryDate: deliveryTime,
        deliveryTimeStart: deliveryTime,
        deliveryTimeEnd: new Date(deliveryTime.getTime() + 30 * 60000),
        requestedActivity: orderData.requestedActivity,
        activityUnit: 'mCi',
        numberOfDoses: orderData.numberOfDoses,
        injectionTime: injectionTime,
        patientCount: orderData.patientCount,
        specialNotes: orderData.specialNotes,
        status: OrderStatus.VALIDATED,
      },
    });
  }

  const equipment = await prisma.equipment.findFirst({ where: { type: 'SYNTHESIS_MODULE' } });
  const hotCell = await prisma.equipment.findFirst({ where: { type: 'HOT_CELL' } });

  const scheduledBatches = [
    {
      batchNumber: 'B-30001',
      productId: products['FDG'].id,
      startHour: 6,
      startMinute: 0,
      endHour: 8,
      endMinute: 30,
      targetActivity: 60,
      status: BatchStatus.SCHEDULED,
      notes: 'Planner demo - FDG morning batch',
    },
    {
      batchNumber: 'B-30002',
      productId: products['TC99M-MDP'].id,
      startHour: 9,
      startMinute: 0,
      endHour: 11,
      endMinute: 0,
      targetActivity: 40,
      status: BatchStatus.IN_PRODUCTION,
      notes: 'Planner demo - Tc-99m in production',
    },
    {
      batchNumber: 'B-30003',
      productId: products['FDG'].id,
      startHour: 12,
      startMinute: 0,
      endHour: 14,
      endMinute: 30,
      targetActivity: 55,
      status: BatchStatus.QC_PENDING,
      notes: 'Planner demo - FDG awaiting QC',
    },
  ];

  for (const batchData of scheduledBatches) {
    const startTime = new Date(today);
    startTime.setHours(batchData.startHour, batchData.startMinute, 0, 0);
    
    const endTime = new Date(today);
    endTime.setHours(batchData.endHour, batchData.endMinute, 0, 0);

    await prisma.batch.upsert({
      where: { batchNumber: batchData.batchNumber },
      update: {},
      create: {
        batchNumber: batchData.batchNumber,
        productId: batchData.productId,
        plannedStartTime: startTime,
        plannedEndTime: endTime,
        targetActivity: batchData.targetActivity,
        activityUnit: 'mCi',
        calibrationTime: endTime,
        synthesisModuleId: equipment?.id,
        hotCellId: hotCell?.id,
        status: batchData.status,
        notes: batchData.notes,
      },
    });
  }

  console.log('   Created planner demo data:');
  console.log(`     - ${plannerOrders.length} orders in VALIDATED status for today`);
  console.log('     - Products: FDG (3 orders), Tc-99m MDP (2 orders)');
  console.log(`     - ${scheduledBatches.length} scheduled batches for today`);
}

async function seedAdditionalCases(users: Record<string, any>, customers: any, products: Record<string, any>, drivers: any) {
  const { customerA } = customers;

  const orderFailed = await prisma.order.upsert({
    where: { orderNumber: 'O-10002' },
    update: {},
    create: {
      orderNumber: 'O-10002',
      customerId: customerA.id,
      productId: products['TC99M-MDP'].id,
      deliveryDate: riyadhDate(2, 14, 0),
      deliveryTimeStart: riyadhDate(2, 14, 0),
      deliveryTimeEnd: riyadhDate(2, 14, 30),
      requestedActivity: 25,
      numberOfDoses: 1,
      status: OrderStatus.FAILED_QC,
      specialNotes: 'Demo - QC failed case',
    },
  });

  const batchFailed = await prisma.batch.upsert({
    where: { batchNumber: 'B-20002' },
    update: {},
    create: {
      batchNumber: 'B-20002',
      productId: products['TC99M-MDP'].id,
      plannedStartTime: riyadhDate(2, 10, 0),
      plannedEndTime: riyadhDate(2, 12, 0),
      targetActivity: 30,
      status: BatchStatus.FAILED_QC,
      notes: 'Demo - QC failed batch',
    },
  });

  await prisma.order.update({ where: { id: orderFailed.id }, data: { batchId: batchFailed.id } });

  const batchOnHold = await prisma.batch.upsert({
    where: { batchNumber: 'B-20003' },
    update: {},
    create: {
      batchNumber: 'B-20003',
      productId: products['I131'].id,
      plannedStartTime: riyadhDate(3, 8, 0),
      plannedEndTime: riyadhDate(3, 10, 0),
      targetActivity: 100,
      status: BatchStatus.ON_HOLD,
      notes: 'Demo - On hold for deviation investigation',
    },
  });

  const shipmentDelayed = await prisma.shipment.upsert({
    where: { shipmentNumber: 'S-30002' },
    update: {},
    create: {
      shipmentNumber: 'S-30002',
      customerId: customerA.id,
      scheduledDeliveryAt: riyadhDate(-1, 10, 0),
      status: ShipmentStatus.DELAYED,
      notes: 'Demo - Delayed shipment',
    },
  });

  const overdueInvoiceDate = new Date();
  overdueInvoiceDate.setDate(overdueInvoiceDate.getDate() - 45);
  const overdueDate = new Date();
  overdueDate.setDate(overdueDate.getDate() - 15);

  await prisma.invoice.upsert({
    where: { invoiceNumber: 'INV-40002' },
    update: {},
    create: {
      invoiceNumber: 'INV-40002',
      customerId: customerA.id,
      invoiceDate: overdueInvoiceDate,
      dueDate: overdueDate,
      subtotal: 2000,
      taxAmount: 300,
      totalAmount: 2300,
      paidAmount: 0,
      remainingAmount: 2300,
      currency: 'SAR',
      totalAmountSAR: 2300,
      status: InvoiceStatus.OVERDUE,
      triggerSource: 'ON_DELIVERED',
      issuedAt: overdueInvoiceDate,
      postedAt: overdueInvoiceDate,
    },
  });

  console.log('   Created additional demo cases:');
  console.log(`     - Order ${orderFailed.orderNumber}: QC Failed`);
  console.log(`     - Batch ${batchFailed.batchNumber}: QC Failed`);
  console.log(`     - Batch ${batchOnHold.batchNumber}: On Hold`);
  console.log(`     - Shipment ${shipmentDelayed.shipmentNumber}: Delayed`);
  console.log(`     - Invoice INV-40002: Overdue`);
}

function printCredentials() {
  console.log(`\n${'='.repeat(60)}`);
  console.log('  DEMO CREDENTIALS');
  console.log(`${'='.repeat(60)}`);
  console.log('\n  INTERNAL USERS (Password: demo123)');
  console.log('  ──────────────────────────────────');
  console.log('  admin@demo.com          Admin (Full access)');
  console.log('  orderdesk@demo.com      Order Desk / Validator');
  console.log('  planner@demo.com        Production Planner');
  console.log('  qc@demo.com             QC Analyst');
  console.log('  qp@demo.com             Qualified Person (QP)');
  console.log('  logistics@demo.com      Logistics Coordinator');
  console.log('  finance@demo.com        Finance Admin');
  console.log('  driver1@demo.com        Driver Portal');
  console.log('\n  CUSTOMER PORTAL USERS (Password: demo123)');
  console.log('  ──────────────────────────────────');
  console.log('  portal1@hospitaldemo.com  Al Noor Hospital (Order entry)');
  console.log('  portal2@hospitaldemo.com  Al Noor Hospital (Billing)');
  console.log('\n  DEMO JOURNEY');
  console.log('  ──────────────────────────────────');
  console.log('  Order:    O-10001');
  console.log('  Batch:    B-20001');
  console.log('  Shipment: S-30001');
  console.log('  Invoice:  INV-40001');
  if (DEMO_MODE === 'LIVE_DEMO') {
    console.log('\n  STATUS: LIVE_DEMO mode');
    console.log('  The shipment is IN_TRANSIT - you can complete delivery during demo!');
    console.log('  Invoice is ISSUED_POSTED - customer can submit payment during demo!');
  } else {
    console.log('\n  STATUS: FULLY_COMPLETED mode');
    console.log('  The entire journey is completed with payments and receipts.');
  }
  console.log(`\n${'='.repeat(60)}\n`);
}

main()
  .catch((e) => {
    console.error('Error seeding demo data:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
