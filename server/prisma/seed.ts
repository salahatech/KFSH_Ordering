import { PrismaClient, ProductType, ProductionMethod, OrderStatus, WorkflowEntityType, Prisma } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding database...');

  const permissions = await Promise.all([
    prisma.permission.upsert({
      where: { name: 'create_order' },
      update: {},
      create: { name: 'create_order', description: 'Create new orders' },
    }),
    prisma.permission.upsert({
      where: { name: 'approve_order' },
      update: {},
      create: { name: 'approve_order', description: 'Approve orders' },
    }),
    prisma.permission.upsert({
      where: { name: 'schedule_batch' },
      update: {},
      create: { name: 'schedule_batch', description: 'Schedule production batches' },
    }),
    prisma.permission.upsert({
      where: { name: 'enter_qc_results' },
      update: {},
      create: { name: 'enter_qc_results', description: 'Enter QC test results' },
    }),
    prisma.permission.upsert({
      where: { name: 'release_batch' },
      update: {},
      create: { name: 'release_batch', description: 'Release batches (QP)' },
    }),
    prisma.permission.upsert({
      where: { name: 'dispatch_shipment' },
      update: {},
      create: { name: 'dispatch_shipment', description: 'Dispatch shipments' },
    }),
    prisma.permission.upsert({
      where: { name: 'view_reports' },
      update: {},
      create: { name: 'view_reports', description: 'View reports' },
    }),
    prisma.permission.upsert({
      where: { name: 'manage_users' },
      update: {},
      create: { name: 'manage_users', description: 'Manage users' },
    }),
    prisma.permission.upsert({
      where: { name: 'manage_products' },
      update: {},
      create: { name: 'manage_products', description: 'Manage products' },
    }),
    prisma.permission.upsert({
      where: { name: 'manage_customers' },
      update: {},
      create: { name: 'manage_customers', description: 'Manage customers' },
    }),
  ]);

  const allPermissionIds = permissions.map(p => ({ id: p.id }));

  const adminRole = await prisma.role.upsert({
    where: { name: 'Admin' },
    update: { permissions: { set: allPermissionIds } },
    create: {
      name: 'Admin',
      description: 'Full system access',
      permissions: { connect: allPermissionIds },
    },
  });

  const salesRole = await prisma.role.upsert({
    where: { name: 'Sales' },
    update: {},
    create: {
      name: 'Sales',
      description: 'Sales and Order Desk',
      permissions: {
        connect: permissions.filter(p => ['create_order', 'approve_order', 'view_reports', 'manage_customers'].includes(p.name)).map(p => ({ id: p.id })),
      },
    },
  });

  const plannerRole = await prisma.role.upsert({
    where: { name: 'Production Planner' },
    update: {},
    create: {
      name: 'Production Planner',
      description: 'Production planning and scheduling',
      permissions: {
        connect: permissions.filter(p => ['schedule_batch', 'view_reports'].includes(p.name)).map(p => ({ id: p.id })),
      },
    },
  });

  const qcRole = await prisma.role.upsert({
    where: { name: 'QC Analyst' },
    update: {},
    create: {
      name: 'QC Analyst',
      description: 'Quality Control testing',
      permissions: {
        connect: permissions.filter(p => ['enter_qc_results', 'view_reports'].includes(p.name)).map(p => ({ id: p.id })),
      },
    },
  });

  const qpRole = await prisma.role.upsert({
    where: { name: 'Qualified Person' },
    update: {},
    create: {
      name: 'Qualified Person',
      description: 'Batch release authority',
      permissions: {
        connect: permissions.filter(p => ['release_batch', 'enter_qc_results', 'view_reports'].includes(p.name)).map(p => ({ id: p.id })),
      },
    },
  });

  const logisticsRole = await prisma.role.upsert({
    where: { name: 'Logistics' },
    update: {},
    create: {
      name: 'Logistics',
      description: 'Courier and logistics',
      permissions: {
        connect: permissions.filter(p => ['dispatch_shipment', 'view_reports'].includes(p.name)).map(p => ({ id: p.id })),
      },
    },
  });

  const customerRole = await prisma.role.upsert({
    where: { name: 'Customer' },
    update: {},
    create: {
      name: 'Customer',
      description: 'Customer portal access',
      permissions: {
        connect: permissions.filter(p => ['create_order'].includes(p.name)).map(p => ({ id: p.id })),
      },
    },
  });

  const driverRole = await prisma.role.upsert({
    where: { name: 'Driver' },
    update: {},
    create: {
      name: 'Driver',
      description: 'Driver portal access for deliveries',
      permissions: {
        connect: permissions.filter(p => ['dispatch_shipment'].includes(p.name)).map(p => ({ id: p.id })),
      },
    },
  });

  const hashedPassword = await bcrypt.hash('admin123', 10);
  
  const adminUser = await prisma.user.upsert({
    where: { email: 'admin@radiopharma.com' },
    update: {},
    create: {
      email: 'admin@radiopharma.com',
      password: hashedPassword,
      firstName: 'System',
      lastName: 'Admin',
      roleId: adminRole.id,
    },
  });

  await prisma.user.upsert({
    where: { email: 'sales@radiopharma.com' },
    update: {},
    create: {
      email: 'sales@radiopharma.com',
      password: hashedPassword,
      firstName: 'Sarah',
      lastName: 'Sales',
      roleId: salesRole.id,
    },
  });

  await prisma.user.upsert({
    where: { email: 'planner@radiopharma.com' },
    update: {},
    create: {
      email: 'planner@radiopharma.com',
      password: hashedPassword,
      firstName: 'Peter',
      lastName: 'Planner',
      roleId: plannerRole.id,
    },
  });

  await prisma.user.upsert({
    where: { email: 'qc@radiopharma.com' },
    update: {},
    create: {
      email: 'qc@radiopharma.com',
      password: hashedPassword,
      firstName: 'Quinn',
      lastName: 'Quality',
      roleId: qcRole.id,
    },
  });

  await prisma.user.upsert({
    where: { email: 'qp@radiopharma.com' },
    update: {},
    create: {
      email: 'qp@radiopharma.com',
      password: hashedPassword,
      firstName: 'Quincy',
      lastName: 'Person',
      roleId: qpRole.id,
    },
  });

  await prisma.user.upsert({
    where: { email: 'logistics@radiopharma.com' },
    update: {},
    create: {
      email: 'logistics@radiopharma.com',
      password: hashedPassword,
      firstName: 'Larry',
      lastName: 'Logistics',
      roleId: logisticsRole.id,
    },
  });

  await prisma.user.upsert({
    where: { email: 'customer@radiopharma.com' },
    update: {},
    create: {
      email: 'customer@radiopharma.com',
      password: hashedPassword,
      firstName: 'Chris',
      lastName: 'Customer',
      roleId: customerRole.id,
    },
  });

  console.log('Created demo users for all roles');

  const products = await Promise.all([
    prisma.product.upsert({
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
        qcTemplates: {
          create: [
            { testName: 'Visual Inspection', testMethod: 'Visual', acceptanceCriteria: 'Clear, colorless, particulate-free', isRequired: true, sortOrder: 0 },
            { testName: 'pH', testMethod: 'pH meter', acceptanceCriteria: '4.5-8.5', minValue: 4.5, maxValue: 8.5, isRequired: true, sortOrder: 1 },
            { testName: 'Radiochemical Purity', testMethod: 'HPLC', acceptanceCriteria: '≥95%', minValue: 95, maxValue: 100, unit: '%', isRequired: true, sortOrder: 2 },
            { testName: 'Radionuclidic Identity', testMethod: 'Half-life measurement', acceptanceCriteria: '105-115 min', minValue: 105, maxValue: 115, unit: 'min', isRequired: true, sortOrder: 3 },
            { testName: 'Endotoxin', testMethod: 'LAL', acceptanceCriteria: '<175 EU/V', minValue: 0, maxValue: 175, unit: 'EU/V', isRequired: true, sortOrder: 4 },
            { testName: 'Sterility', testMethod: 'Membrane filtration', acceptanceCriteria: 'No growth', isRequired: true, sortOrder: 5 },
          ],
        },
      },
    }),
    prisma.product.upsert({
      where: { code: 'NAF-18' },
      update: {},
      create: {
        name: 'Sodium Fluoride F-18',
        code: 'NAF-18',
        productType: ProductType.PET,
        radionuclide: 'F-18',
        halfLifeMinutes: 109.8,
        shelfLifeMinutes: 480,
        standardDose: 5,
        doseUnit: 'mCi',
        productionMethod: ProductionMethod.CYCLOTRON,
        synthesisTimeMinutes: 30,
        qcTimeMinutes: 25,
        packagingTimeMinutes: 15,
        overagePercent: 12,
        qcTemplates: {
          create: [
            { testName: 'Visual Inspection', testMethod: 'Visual', acceptanceCriteria: 'Clear, colorless', isRequired: true, sortOrder: 0 },
            { testName: 'pH', testMethod: 'pH meter', acceptanceCriteria: '4.5-8.0', minValue: 4.5, maxValue: 8.0, isRequired: true, sortOrder: 1 },
            { testName: 'Radiochemical Purity', testMethod: 'TLC', acceptanceCriteria: '≥95%', minValue: 95, maxValue: 100, unit: '%', isRequired: true, sortOrder: 2 },
          ],
        },
      },
    }),
    prisma.product.upsert({
      where: { code: 'TC99M-MDP' },
      update: {},
      create: {
        name: 'Tc-99m MDP (Bone Scan)',
        code: 'TC99M-MDP',
        productType: ProductType.SPECT,
        radionuclide: 'Tc-99m',
        halfLifeMinutes: 360.6,
        shelfLifeMinutes: 360,
        standardDose: 25,
        doseUnit: 'mCi',
        productionMethod: ProductionMethod.GENERATOR,
        synthesisTimeMinutes: 20,
        qcTimeMinutes: 20,
        packagingTimeMinutes: 10,
        overagePercent: 10,
        qcTemplates: {
          create: [
            { testName: 'Visual Inspection', testMethod: 'Visual', acceptanceCriteria: 'Clear solution', isRequired: true, sortOrder: 0 },
            { testName: 'Radiochemical Purity', testMethod: 'TLC', acceptanceCriteria: '≥90%', minValue: 90, maxValue: 100, unit: '%', isRequired: true, sortOrder: 1 },
            { testName: 'Mo-99 Breakthrough', testMethod: 'Dose calibrator', acceptanceCriteria: '<0.15 µCi/mCi', minValue: 0, maxValue: 0.15, unit: 'µCi/mCi', isRequired: true, sortOrder: 2 },
          ],
        },
      },
    }),
    prisma.product.upsert({
      where: { code: 'TC99M-DTPA' },
      update: {},
      create: {
        name: 'Tc-99m DTPA (Renal)',
        code: 'TC99M-DTPA',
        productType: ProductType.SPECT,
        radionuclide: 'Tc-99m',
        halfLifeMinutes: 360.6,
        shelfLifeMinutes: 360,
        standardDose: 15,
        doseUnit: 'mCi',
        productionMethod: ProductionMethod.GENERATOR,
        synthesisTimeMinutes: 20,
        qcTimeMinutes: 20,
        packagingTimeMinutes: 10,
        overagePercent: 10,
        qcTemplates: {
          create: [
            { testName: 'Visual Inspection', testMethod: 'Visual', acceptanceCriteria: 'Clear solution', isRequired: true, sortOrder: 0 },
            { testName: 'Radiochemical Purity', testMethod: 'TLC', acceptanceCriteria: '≥90%', minValue: 90, maxValue: 100, unit: '%', isRequired: true, sortOrder: 1 },
          ],
        },
      },
    }),
    prisma.product.upsert({
      where: { code: 'I-131-CAP' },
      update: {},
      create: {
        name: 'Iodine-131 Capsules',
        code: 'I-131-CAP',
        productType: ProductType.THERAPY,
        radionuclide: 'I-131',
        halfLifeMinutes: 11606.4,
        shelfLifeMinutes: 43200,
        standardDose: 100,
        doseUnit: 'mCi',
        productionMethod: ProductionMethod.KIT,
        synthesisTimeMinutes: 15,
        qcTimeMinutes: 30,
        packagingTimeMinutes: 20,
        packagingType: 'Lead shielded container',
        transportConstraints: 'Type B package required for high activities',
        overagePercent: 5,
        qcTemplates: {
          create: [
            { testName: 'Visual Inspection', testMethod: 'Visual', acceptanceCriteria: 'Intact capsule', isRequired: true, sortOrder: 0 },
            { testName: 'Activity Assay', testMethod: 'Dose calibrator', acceptanceCriteria: '±10% of stated activity', minValue: 90, maxValue: 110, unit: '%', isRequired: true, sortOrder: 1 },
          ],
        },
      },
    }),
    prisma.product.upsert({
      where: { code: 'LU-177-DOTATATE' },
      update: {},
      create: {
        name: 'Lu-177 DOTATATE (Lutathera)',
        code: 'LU-177-DOTATATE',
        productType: ProductType.THERAPY,
        radionuclide: 'Lu-177',
        halfLifeMinutes: 9590.4,
        shelfLifeMinutes: 28800,
        standardDose: 200,
        doseUnit: 'mCi',
        productionMethod: ProductionMethod.KIT,
        synthesisTimeMinutes: 60,
        qcTimeMinutes: 45,
        packagingTimeMinutes: 20,
        packagingType: 'Lead shielded vial',
        overagePercent: 8,
        qcTemplates: {
          create: [
            { testName: 'Visual Inspection', testMethod: 'Visual', acceptanceCriteria: 'Clear, colorless to slightly yellow', isRequired: true, sortOrder: 0 },
            { testName: 'pH', testMethod: 'pH meter', acceptanceCriteria: '4.0-8.0', minValue: 4.0, maxValue: 8.0, isRequired: true, sortOrder: 1 },
            { testName: 'Radiochemical Purity', testMethod: 'HPLC', acceptanceCriteria: '≥95%', minValue: 95, maxValue: 100, unit: '%', isRequired: true, sortOrder: 2 },
            { testName: 'Peptide Content', testMethod: 'HPLC', acceptanceCriteria: '40-60 µg', minValue: 40, maxValue: 60, unit: 'µg', isRequired: true, sortOrder: 3 },
          ],
        },
      },
    }),
  ]);

  const customers = await Promise.all([
    prisma.customer.upsert({
      where: { code: 'METRO-001' },
      update: {},
      create: {
        name: 'Metro General Hospital',
        nameEn: 'Metro General Hospital',
        nameAr: 'مستشفى مترو العام',
        code: 'METRO-001',
        fullAddress: '500 Medical Center Drive, Springfield, Riyadh, Saudi Arabia',
        address: '500 Medical Center Drive, Springfield, Riyadh, Saudi Arabia',
        postalCode: '12345',
        mobile: '+966501234567',
        phone: '+966112345678',
        email: 'nuclear.med@metrogen.com',
        crNumber: '1010123456',
        taxNumber: '300012345600003',
        latitude: 24.7136,
        longitude: 46.6753,
        licenseNumber: 'MOH-12-34567-01',
        licenseExpiryDate: new Date('2027-06-30'),
        deliveryWindowStart: '06:00',
        deliveryWindowEnd: '18:00',
        preferredDeliveryTime: '07:00',
        travelTimeMinutes: 45,
        permittedProducts: {
          create: products.map(p => ({ productId: p.id })),
        },
        contacts: {
          create: [
            { name: 'Dr. Sarah Chen', title: 'Nuclear Medicine Director', email: 'schen@metrogen.com', phone: '+966501234568', isPrimary: true },
          ],
        },
      },
    }),
    prisma.customer.upsert({
      where: { code: 'UNIV-002' },
      update: {},
      create: {
        name: 'University Medical Center',
        nameEn: 'University Medical Center',
        nameAr: 'المركز الطبي الجامعي',
        code: 'UNIV-002',
        fullAddress: '1000 University Avenue, Al Malaz, Riyadh, Saudi Arabia',
        address: '1000 University Avenue, Al Malaz, Riyadh, Saudi Arabia',
        postalCode: '11432',
        mobile: '+966502345678',
        phone: '+966112345679',
        email: 'radiology@umc.edu.sa',
        crNumber: '1010234567',
        taxNumber: '300023456700004',
        latitude: 24.6872,
        longitude: 46.7224,
        licenseNumber: 'MOH-12-34567-02',
        licenseExpiryDate: new Date('2026-12-31'),
        deliveryWindowStart: '05:30',
        deliveryWindowEnd: '20:00',
        preferredDeliveryTime: '06:30',
        travelTimeMinutes: 90,
        permittedProducts: {
          create: products.map(p => ({ productId: p.id })),
        },
        contacts: {
          create: [
            { name: 'Prof. James Wilson', title: 'Chief Radiologist', email: 'jwilson@umc.edu.sa', phone: '+966502345679', isPrimary: true },
          ],
        },
      },
    }),
    prisma.customer.upsert({
      where: { code: 'COMM-003' },
      update: {},
      create: {
        name: 'Community Health Center',
        nameEn: 'Community Health Center',
        nameAr: 'مركز الصحة المجتمعي',
        code: 'COMM-003',
        fullAddress: '250 Main Street, Al Olaya, Riyadh, Saudi Arabia',
        address: '250 Main Street, Al Olaya, Riyadh, Saudi Arabia',
        postalCode: '11321',
        mobile: '+966503456789',
        phone: '+966112345680',
        email: 'imaging@commhealth.org.sa',
        crNumber: '1010345678',
        taxNumber: '300034567800005',
        latitude: 24.7007,
        longitude: 46.7025,
        licenseNumber: 'MOH-12-34567-03',
        licenseExpiryDate: new Date('2026-09-15'),
        deliveryWindowStart: '07:00',
        deliveryWindowEnd: '16:00',
        preferredDeliveryTime: '08:00',
        travelTimeMinutes: 30,
        permittedProducts: {
          create: products.filter(p => p.productType === 'SPECT').map(p => ({ productId: p.id })),
        },
        contacts: {
          create: [
            { name: 'Mary Johnson', title: 'Nuclear Tech Supervisor', email: 'mjohnson@commhealth.org.sa', phone: '+966503456790', isPrimary: true },
          ],
        },
      },
    }),
    prisma.customer.upsert({
      where: { code: 'ONCO-004' },
      update: {},
      create: {
        name: 'Regional Cancer Center',
        nameEn: 'Regional Cancer Center',
        nameAr: 'مركز السرطان الإقليمي',
        code: 'ONCO-004',
        fullAddress: '800 Cancer Care Lane, Al Khobar, Eastern Province, Saudi Arabia',
        address: '800 Cancer Care Lane, Al Khobar, Eastern Province, Saudi Arabia',
        postalCode: '31952',
        mobile: '+966504567890',
        phone: '+966138765432',
        email: 'nuclear@regcancer.org.sa',
        crNumber: '2050456789',
        taxNumber: '300045678900006',
        latitude: 26.2890,
        longitude: 50.1956,
        licenseNumber: 'MOH-12-34567-04',
        licenseExpiryDate: new Date('2027-03-31'),
        deliveryWindowStart: '06:00',
        deliveryWindowEnd: '17:00',
        preferredDeliveryTime: '07:30',
        travelTimeMinutes: 60,
        permittedProducts: {
          create: products.filter(p => p.productType === 'PET' || p.productType === 'THERAPY').map(p => ({ productId: p.id })),
        },
        contacts: {
          create: [
            { name: 'Dr. Robert Lee', title: 'Medical Director', email: 'rlee@regcancer.org.sa', phone: '+966504567891', isPrimary: true },
          ],
        },
      },
    }),
    prisma.customer.upsert({
      where: { code: 'HEART-005' },
      update: {},
      create: {
        name: 'Heartland Cardiology',
        nameEn: 'Heartland Cardiology',
        nameAr: 'مركز القلب',
        code: 'HEART-005',
        fullAddress: '450 Heart Drive, Jeddah, Makkah Province, Saudi Arabia',
        address: '450 Heart Drive, Jeddah, Makkah Province, Saudi Arabia',
        postalCode: '21442',
        mobile: '+966505678901',
        phone: '+966126543210',
        email: 'nuclear@heartlandcardio.com.sa',
        crNumber: '4030567890',
        taxNumber: '300056789000007',
        latitude: 21.4858,
        longitude: 39.1925,
        licenseNumber: 'MOH-12-34567-05',
        licenseExpiryDate: new Date('2026-08-20'),
        deliveryWindowStart: '06:30',
        deliveryWindowEnd: '15:00',
        preferredDeliveryTime: '07:00',
        travelTimeMinutes: 40,
        permittedProducts: {
          create: products.filter(p => ['TC99M-MDP', 'TC99M-DTPA'].includes(p.code)).map(p => ({ productId: p.id })),
        },
        contacts: {
          create: [
            { name: 'Dr. Emily Heart', title: 'Cardiologist', email: 'eheart@heartlandcardio.com.sa', phone: '+966505678902', isPrimary: true },
          ],
        },
      },
    }),
  ]);

  const equipment = await Promise.all([
    prisma.equipment.upsert({
      where: { code: 'CYC-01' },
      update: {},
      create: { name: 'Cyclotron 1', code: 'CYC-01', type: 'Cyclotron', location: 'Building A' },
    }),
    prisma.equipment.upsert({
      where: { code: 'SYN-01' },
      update: {},
      create: { name: 'Synthesis Module 1', code: 'SYN-01', type: 'Synthesis', location: 'Hot Lab 1' },
    }),
    prisma.equipment.upsert({
      where: { code: 'SYN-02' },
      update: {},
      create: { name: 'Synthesis Module 2', code: 'SYN-02', type: 'Synthesis', location: 'Hot Lab 1' },
    }),
    prisma.equipment.upsert({
      where: { code: 'HC-01' },
      update: {},
      create: { name: 'Hot Cell 1', code: 'HC-01', type: 'HotCell', location: 'Hot Lab 1' },
    }),
    prisma.equipment.upsert({
      where: { code: 'HC-02' },
      update: {},
      create: { name: 'Hot Cell 2', code: 'HC-02', type: 'HotCell', location: 'Hot Lab 2' },
    }),
    prisma.equipment.upsert({
      where: { code: 'GEN-01' },
      update: {},
      create: { name: 'Tc-99m Generator 1', code: 'GEN-01', type: 'Generator', location: 'Dispensing Room' },
    }),
  ]);

  await Promise.all([
    prisma.systemConfig.upsert({
      where: { key: 'default_overage_percent' },
      update: {},
      create: { key: 'default_overage_percent', value: '10', dataType: 'number', category: 'production' },
    }),
    prisma.systemConfig.upsert({
      where: { key: 'default_qc_time_minutes' },
      update: {},
      create: { key: 'default_qc_time_minutes', value: '30', dataType: 'number', category: 'production' },
    }),
    prisma.systemConfig.upsert({
      where: { key: 'rapid_release_enabled' },
      update: {},
      create: { key: 'rapid_release_enabled', value: 'true', dataType: 'boolean', category: 'qc' },
    }),
    prisma.systemConfig.upsert({
      where: { key: 'notification_email_enabled' },
      update: {},
      create: { key: 'notification_email_enabled', value: 'true', dataType: 'boolean', category: 'notifications' },
    }),
  ]);

  // Create sample orders (15 orders across different statuses)
  // Valid OrderStatus: DRAFT, SUBMITTED, VALIDATED, SCHEDULED, IN_PRODUCTION, QC_PENDING, RELEASED, DISPATCHED, DELIVERED, CANCELLED, REJECTED, FAILED_QC, REWORK
  const today = new Date();
  const orderData = [
    { customer: customers[0], product: products[0], status: 'DELIVERED', daysOffset: -5, activity: 10 },
    { customer: customers[1], product: products[0], status: 'DELIVERED', daysOffset: -4, activity: 15 },
    { customer: customers[0], product: products[1], status: 'DELIVERED', daysOffset: -3, activity: 8 },
    { customer: customers[2], product: products[2], status: 'DELIVERED', daysOffset: -3, activity: 25 },
    { customer: customers[3], product: products[0], status: 'DELIVERED', daysOffset: -2, activity: 12 },
    { customer: customers[1], product: products[3], status: 'DISPATCHED', daysOffset: -1, activity: 20 },
    { customer: customers[0], product: products[0], status: 'DISPATCHED', daysOffset: -1, activity: 10 },
    { customer: customers[4], product: products[2], status: 'RELEASED', daysOffset: 0, activity: 30 },
    { customer: customers[2], product: products[1], status: 'QC_PENDING', daysOffset: 0, activity: 15 },
    { customer: customers[3], product: products[0], status: 'IN_PRODUCTION', daysOffset: 0, activity: 18 },
    { customer: customers[0], product: products[0], status: 'SCHEDULED', daysOffset: 1, activity: 10 },
    { customer: customers[1], product: products[2], status: 'SCHEDULED', daysOffset: 1, activity: 25 },
    { customer: customers[4], product: products[3], status: 'VALIDATED', daysOffset: 2, activity: 15 },
    { customer: customers[2], product: products[0], status: 'SUBMITTED', daysOffset: 3, activity: 12 },
    { customer: customers[3], product: products[4], status: 'DRAFT', daysOffset: 3, activity: 100 },
  ];

  const orders = [];
  for (let i = 0; i < orderData.length; i++) {
    const data = orderData[i];
    const deliveryDate = new Date(today);
    deliveryDate.setDate(deliveryDate.getDate() + data.daysOffset);
    deliveryDate.setHours(8, 0, 0, 0);
    
    const deliveryTimeStart = new Date(deliveryDate);
    deliveryTimeStart.setHours(7, 0, 0, 0);
    const deliveryTimeEnd = new Date(deliveryDate);
    deliveryTimeEnd.setHours(9, 0, 0, 0);
    
    const orderNumber = `ORD-${String(2024001 + i).padStart(7, '0')}`;
    
    const order = await prisma.order.upsert({
      where: { orderNumber },
      update: {},
      create: {
        orderNumber,
        customerId: data.customer.id,
        productId: data.product.id,
        requestedActivity: data.activity,
        deliveryDate: deliveryDate,
        deliveryTimeStart: deliveryTimeStart,
        deliveryTimeEnd: deliveryTimeEnd,
        status: data.status as OrderStatus,
        specialNotes: `Sample order for ${data.product.name}`,
      },
    });
    orders.push(order);
  }

  // Create batches for orders that are in production or beyond (12 batches)
  const batchOrders = orders.filter(o => 
    ['IN_PRODUCTION', 'QC_PENDING', 'RELEASED', 'DISPATCHED', 'DELIVERED'].includes(o.status)
  );

  const batches = [];
  for (let i = 0; i < batchOrders.length; i++) {
    const order = batchOrders[i];
    const product = products.find(p => p.id === order.productId)!;
    const batchNumber = `BTH-${new Date().getFullYear()}-${String(1001 + i).padStart(4, '0')}`;
    
    const batchStatus = order.status === 'IN_PRODUCTION' ? 'IN_PRODUCTION' :
                        order.status === 'QC_PENDING' ? 'QC_PASSED' :
                        ['RELEASED', 'DISPATCHED', 'DELIVERED'].includes(order.status) ? 'RELEASED' : 'PLANNED';
    
    const plannedStartTime = new Date(order.deliveryDate);
    plannedStartTime.setMinutes(plannedStartTime.getMinutes() - (product.synthesisTimeMinutes + product.qcTimeMinutes + product.packagingTimeMinutes));
    const plannedEndTime = new Date(order.deliveryDate);
    plannedEndTime.setMinutes(plannedEndTime.getMinutes() - product.packagingTimeMinutes);
    
    const batch = await prisma.batch.upsert({
      where: { batchNumber },
      update: {},
      create: {
        batchNumber,
        productId: product.id,
        status: batchStatus,
        plannedStartTime,
        plannedEndTime,
        targetActivity: order.requestedActivity * 1.1,
        synthesisModuleId: equipment.find(e => e.type === 'Synthesis')?.id,
        hotCellId: equipment.find(e => e.type === 'HotCell')?.id,
        notes: `Production batch for order ${order.orderNumber}`,
        orders: { connect: { id: order.id } },
        operators: { create: { userId: adminUser.id, role: 'Lead Operator' } },
      },
    });
    batches.push(batch);
  }

  // Create additional batches specifically for QC and QP Release demo data
  const qcDemoBatchData = [
    { product: products[0], status: 'QC_PENDING', notes: 'Awaiting quality control testing' },
    { product: products[0], status: 'QC_IN_PROGRESS', notes: 'QC testing in progress - Visual inspection complete' },
    { product: products[1], status: 'QC_IN_PROGRESS', notes: 'QC testing in progress - pH and visual done' },
    { product: products[2], status: 'QC_PASSED', notes: 'All QC tests passed - awaiting QP review' },
    { product: products[0], status: 'QP_REVIEW', notes: 'QC complete - pending Qualified Person release' },
    { product: products[1], status: 'QP_REVIEW', notes: 'Rapid release requested - urgent delivery' },
    { product: products[3], status: 'FAILED_QC', notes: 'Failed radiochemical purity test - under investigation' },
    { product: products[0], status: 'QC_PENDING', notes: 'Production complete - samples sent to QC lab' },
  ];

  for (let i = 0; i < qcDemoBatchData.length; i++) {
    const data = qcDemoBatchData[i];
    const batchNumber = `BTH-${new Date().getFullYear()}-${String(2001 + i).padStart(4, '0')}`;
    const startTime = new Date();
    startTime.setHours(startTime.getHours() - (i + 1));
    const endTime = new Date();
    endTime.setHours(endTime.getHours() + 2);
    
    const batch = await prisma.batch.upsert({
      where: { batchNumber },
      update: {},
      create: {
        batchNumber,
        productId: data.product.id,
        status: data.status as any,
        plannedStartTime: startTime,
        plannedEndTime: endTime,
        actualStartTime: startTime,
        actualEndTime: ['QC_PENDING', 'QC_IN_PROGRESS', 'QC_PASSED', 'QP_REVIEW', 'FAILED_QC'].includes(data.status) ? new Date() : null,
        targetActivity: 15 + Math.floor(Math.random() * 20),
        actualActivity: 14 + Math.floor(Math.random() * 18),
        synthesisModuleId: equipment.find(e => e.type === 'Synthesis')?.id,
        hotCellId: equipment.find(e => e.type === 'HotCell')?.id,
        notes: data.notes,
        operators: { create: { userId: adminUser.id, role: 'Lead Operator' } },
      },
    });
    batches.push(batch);
  }

  // Create QC results with varying statuses for demo
  for (let i = 0; i < batches.length; i++) {
    const batch = batches[i];
    const product = products.find(p => p.id === batch.productId)!;
    const templates = await prisma.qCTemplate.findMany({ where: { productId: product.id } });
    
    // Determine how complete the QC should be based on batch status
    const isQcPending = batch.status === 'QC_PENDING';
    const isQcInProgress = batch.status === 'QC_IN_PROGRESS';
    const isFailedQc = batch.status === 'FAILED_QC';
    const isQcComplete = ['QC_PASSED', 'QP_REVIEW', 'RELEASED', 'DISPENSING_IN_PROGRESS', 'DISPENSED', 'PACKED', 'DISPATCHED', 'CLOSED'].includes(batch.status);
    
    for (let j = 0; j < templates.length; j++) {
      const template = templates[j];
      
      // For QC_PENDING batches, create pending results
      if (isQcPending) {
        await prisma.qCResult.create({
          data: {
            batchId: batch.id,
            templateId: template.id,
            status: 'PENDING',
          },
        });
        continue;
      }
      
      // For QC_IN_PROGRESS batches, complete only some tests
      if (isQcInProgress && j >= templates.length / 2) {
        await prisma.qCResult.create({
          data: {
            batchId: batch.id,
            templateId: template.id,
            status: j === Math.floor(templates.length / 2) ? 'IN_PROGRESS' : 'PENDING',
          },
        });
        continue;
      }
      
      // For failed batches, make one test fail
      const shouldFail = isFailedQc && j === 1;
      const passed = shouldFail ? false : Math.random() > 0.02;
      
      let numericResult = null;
      if (template.minValue !== null && template.maxValue !== null) {
        const range = template.maxValue - template.minValue;
        if (shouldFail) {
          // Generate an out-of-spec result
          numericResult = template.minValue - (range * 0.1);
        } else {
          numericResult = template.minValue + (range * 0.3) + (Math.random() * range * 0.4);
        }
      }
      
      await prisma.qCResult.create({
        data: {
          batchId: batch.id,
          templateId: template.id,
          numericResult,
          textResult: passed ? 'Pass' : 'Fail',
          passed,
          status: passed ? 'PASSED' : 'FAILED',
          testedAt: new Date(Date.now() - Math.random() * 3600000),
          testedById: adminUser.id,
          notes: shouldFail ? 'Out of specification - investigation required' : undefined,
        },
      });
    }
  }

  // Create batch releases for released batches
  const releasedBatches = batches.filter(b => b.status === 'RELEASED');
  for (let i = 0; i < releasedBatches.length; i++) {
    const batch = releasedBatches[i];
    
    await prisma.batchRelease.create({
      data: {
        batchId: batch.id,
        releasedById: adminUser.id,
        releaseType: i % 3 === 0 ? 'RAPID' : 'FULL',
        disposition: 'RELEASE',
        electronicSignature: `QP-${adminUser.email}-${Date.now()}-${i}`,
        signatureTimestamp: new Date(Date.now() - i * 3600000),
        meaning: 'I certify that this batch meets all quality specifications and is suitable for human use.',
        reason: `Batch ${batch.batchNumber} released for distribution after successful QC review`,
      },
    });
  }

  // Create shipments for dispatched/delivered orders (10 shipments)
  const shippedOrders = orders.filter(o => ['DISPATCHED', 'DELIVERED'].includes(o.status));
  for (let i = 0; i < shippedOrders.length; i++) {
    const order = shippedOrders[i];
    const customer = customers.find(c => c.id === order.customerId)!;
    
    const departureTime = new Date(order.deliveryDate);
    departureTime.setMinutes(departureTime.getMinutes() - customer.travelTimeMinutes);
    
    const shipmentNumber = `SHP-${new Date().getFullYear()}-${String(5001 + i).padStart(4, '0')}`;
    
    await prisma.shipment.upsert({
      where: { shipmentNumber },
      update: {},
      create: {
        shipmentNumber,
        customerId: customer.id,
        status: order.status === 'DELIVERED' ? 'DELIVERED' : 'IN_TRANSIT',
        courierName: ['John Driver', 'Mike Transport', 'Sarah Courier', 'Tom Logistics'][i % 4],
        vehicleInfo: `VAN-${100 + (i % 5)}`,
        scheduledDepartureTime: departureTime,
        actualDepartureTime: departureTime,
        expectedArrivalTime: order.deliveryDate,
        actualArrivalTime: order.status === 'DELIVERED' ? order.deliveryDate : null,
        activityAtDispatch: order.requestedActivity * 1.05,
        activityAtDelivery: order.status === 'DELIVERED' ? order.requestedActivity : null,
        receiverName: order.status === 'DELIVERED' ? 'Reception Staff' : null,
        receiverSignature: order.status === 'DELIVERED' ? `SIG-${Date.now()}` : null,
        notes: order.status === 'DELIVERED' ? 'Delivered successfully' : 'In transit',
        orders: { connect: { id: order.id } },
      },
    });
  }

  // Create audit logs for activity tracking (10 entries)
  const auditActions = [
    { action: 'CREATE', entityType: 'Order' },
    { action: 'UPDATE', entityType: 'Order' },
    { action: 'CREATE', entityType: 'Batch' },
    { action: 'UPDATE', entityType: 'Batch' },
    { action: 'CREATE', entityType: 'QCResult' },
    { action: 'CREATE', entityType: 'BatchRelease' },
    { action: 'CREATE', entityType: 'Shipment' },
    { action: 'UPDATE', entityType: 'Shipment' },
    { action: 'UPDATE', entityType: 'Customer' },
    { action: 'LOGIN', entityType: 'User' },
  ];

  for (let i = 0; i < auditActions.length; i++) {
    const logTime = new Date();
    logTime.setHours(logTime.getHours() - (auditActions.length - i));
    
    await prisma.auditLog.create({
      data: {
        user: { connect: { id: adminUser.id } },
        action: auditActions[i].action,
        entityType: auditActions[i].entityType,
        entityId: orders[i % orders.length].id,
        ipAddress: '192.168.1.100',
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
        createdAt: logTime,
      },
    });
  }

  // Create notifications (10 notifications)
  // Valid types: ORDER_SUBMITTED, ORDER_VALIDATED, SCHEDULE_CHANGED, QC_PASSED, QC_FAILED, BATCH_RELEASED, DISPATCH_UPDATE, DELIVERY_UPDATE, SYSTEM
  const notificationTypes = [
    { type: 'ORDER_SUBMITTED', title: 'New Order Submitted', message: 'A new order has been submitted' },
    { type: 'ORDER_VALIDATED', title: 'Order Validated', message: 'Order has been validated' },
    { type: 'SCHEDULE_CHANGED', title: 'Schedule Changed', message: 'Production schedule has been updated' },
    { type: 'QC_PASSED', title: 'QC Passed', message: 'Quality control testing passed' },
    { type: 'BATCH_RELEASED', title: 'Batch Released', message: 'Batch has been released by QP' },
    { type: 'DISPATCH_UPDATE', title: 'Dispatch Update', message: 'Shipment has been dispatched' },
    { type: 'DELIVERY_UPDATE', title: 'Delivery Update', message: 'Package has been delivered' },
    { type: 'SYSTEM', title: 'License Expiring Soon', message: 'Customer license expires in 30 days' },
    { type: 'SYSTEM', title: 'Low Inventory Alert', message: 'Generator running low' },
    { type: 'SYSTEM', title: 'Maintenance Due', message: 'Equipment maintenance scheduled' },
  ];

  for (let i = 0; i < notificationTypes.length; i++) {
    const notifTime = new Date();
    notifTime.setHours(notifTime.getHours() - i);
    
    await prisma.notification.create({
      data: {
        user: { connect: { id: adminUser.id } },
        type: notificationTypes[i].type as any,
        title: notificationTypes[i].title,
        message: notificationTypes[i].message,
        isRead: i > 5,
        createdAt: notifTime,
      },
    });
  }

  // Create contracts for customers (skip if already exist)
  const existingContracts = await prisma.contract.findMany();
  const contractsData = [];
  if (existingContracts.length === 0) {
    for (let i = 0; i < customers.length; i++) {
      const startDate = new Date();
      startDate.setMonth(startDate.getMonth() - 3);
      const endDate = new Date();
      endDate.setFullYear(endDate.getFullYear() + 1);
      
      const contract = await prisma.contract.create({
        data: {
          contractNumber: `CTR-${String(i + 1).padStart(4, '0')}`,
          name: `Annual Supply Agreement - ${customers[i].name}`,
          customerId: customers[i].id,
          startDate,
          endDate,
          status: 'ACTIVE',
          paymentTermsDays: [15, 30, 45, 60][i % 4],
          creditLimit: [50000, 100000, 200000, null][i % 4],
          discountPercent: [0, 5, 10, 15][i % 4],
        },
      });
      contractsData.push(contract);

      // Add product pricing for this contract
      for (let j = 0; j < Math.min(3, products.length); j++) {
        const basePrice = 500;
        await prisma.contractPriceItem.create({
          data: {
            contract: { connect: { id: contract.id } },
            product: { connect: { id: products[j].id } },
            unitPrice: basePrice * (1 - contract.discountPercent / 100),
            priceUnit: 'per_dose',
            discountPercent: 0,
          },
        });
      }
    }
    console.log(`Created ${contractsData.length} contracts with pricing`);
  } else {
    console.log(`Contracts already exist (${existingContracts.length}), skipping...`);
    contractsData.push(...existingContracts);
  }

  // Create delivery windows for the next 30 days (skip if already exist)
  const existingWindows = await prisma.deliveryWindow.findMany();
  const deliveryWindowsData = [];
  if (existingWindows.length === 0) {
    for (let day = 0; day < 30; day++) {
      const windowDate = new Date();
      windowDate.setDate(windowDate.getDate() + day);
      windowDate.setHours(0, 0, 0, 0);
      
      // Skip weekends
      if (windowDate.getDay() === 0 || windowDate.getDay() === 6) continue;
      
      const startTime = new Date(windowDate);
      startTime.setHours(8, 0, 0, 0);
      
      const endTime = new Date(windowDate);
      endTime.setHours(17, 0, 0, 0);
      
      const window = await prisma.deliveryWindow.create({
        data: {
          name: `Delivery Window - ${windowDate.toISOString().split('T')[0]}`,
          date: windowDate,
          startTime,
          endTime,
          capacityMinutes: 480, // 8 hours
          usedMinutes: 0,
          isActive: true,
        },
      });
      deliveryWindowsData.push(window);
    }
    console.log(`Created ${deliveryWindowsData.length} delivery windows`);
  } else {
    console.log(`Delivery windows already exist (${existingWindows.length}), skipping...`);
  }

  // Create invoices for delivered orders (skip if already exist)
  const existingInvoices = await prisma.invoice.findMany();
  const deliveredOrders = orders.filter(o => o.status === 'DELIVERED');
  const invoicesData = [];
  if (existingInvoices.length === 0 && deliveredOrders.length > 0) {
    for (let i = 0; i < Math.min(5, deliveredOrders.length); i++) {
      const order = deliveredOrders[i];
      const invoiceDate = new Date();
      invoiceDate.setDate(invoiceDate.getDate() - (i * 7)); // Stagger invoice dates
      
      const dueDate = new Date(invoiceDate);
      dueDate.setDate(dueDate.getDate() + 30);

      const product = products.find(p => p.id === order.productId);
      const unitPrice = 500;
      const lineTotal = order.requestedActivity * unitPrice;
      const taxRate = 0;
      const taxAmount = lineTotal * taxRate;
      const totalAmount = lineTotal + taxAmount;
      
      const customerContract = contractsData.find(c => c.customerId === order.customerId);

      const invoice = await prisma.invoice.create({
        data: {
          invoiceNumber: `INV-${String(i + 1).padStart(5, '0')}`,
          customerId: order.customerId,
          contractId: customerContract?.id || null,
          invoiceDate,
          dueDate,
          status: i === 0 ? 'PAID' : (i === 1 ? 'ISSUED_POSTED' : 'DRAFT'),
          subtotal: lineTotal,
          taxAmount,
          discountAmount: 0,
          totalAmount,
          paidAmount: i === 0 ? totalAmount : 0,
          currency: 'USD',
          items: {
            create: {
              orderId: order.id,
              productId: product?.id,
              description: `${product?.name} - ${order.requestedActivity} ${order.activityUnit}`,
              quantity: order.requestedActivity,
              unitPrice,
              lineTotal,
            },
          },
        },
      });

      // Add payment for paid invoice
      if (i === 0) {
        await prisma.payment.create({
          data: {
            invoiceId: invoice.id,
            amount: totalAmount,
            paymentDate: new Date(),
            paymentMethod: 'BANK_TRANSFER',
            referenceNumber: `PAY-${Date.now()}`,
          },
        });
      }

      invoicesData.push(invoice);
    }
    console.log(`Created ${invoicesData.length} invoices`);
  } else {
    console.log(`Invoices already exist (${existingInvoices.length}), skipping...`);
  }

  // Create workflow definitions with approval steps
  const workflowDefinitions = [
    {
      name: 'Order Approval',
      entityType: 'ORDER' as WorkflowEntityType,
      triggerStatus: 'SUBMITTED',
      description: 'Approval workflow for new orders',
      steps: [
        { stepName: 'Sales Review', roleNames: ['Sales', 'Admin'], description: 'Review order details and customer license' },
        { stepName: 'Production Planning Approval', roleNames: ['Production Planner', 'Admin'], description: 'Confirm production capacity' },
      ],
    },
    {
      name: 'Batch Release Approval',
      entityType: 'BATCH' as WorkflowEntityType,
      triggerStatus: 'QC_PASSED',
      description: 'QP release approval for batches',
      steps: [
        { stepName: 'QC Manager Review', roleNames: ['QC Analyst', 'Admin'], description: 'Verify all QC results' },
        { stepName: 'QP Release', roleNames: ['Qualified Person', 'Admin'], description: 'Final release decision' },
      ],
    },
    {
      name: 'Shipment Dispatch Approval',
      entityType: 'SHIPMENT' as WorkflowEntityType,
      triggerStatus: 'ASSIGNED',
      description: 'Approval for dispatching shipments',
      steps: [
        { stepName: 'Logistics Approval', roleNames: ['Logistics', 'Admin'], description: 'Confirm vehicle and route' },
      ],
    },
    {
      name: 'Customer Onboarding',
      entityType: 'CUSTOMER' as WorkflowEntityType,
      description: 'Approval for new customer accounts',
      steps: [
        { stepName: 'License Verification', roleNames: ['Sales', 'Admin'], description: 'Verify customer license' },
        { stepName: 'Admin Approval', roleNames: ['Admin'], description: 'Final approval for new customer' },
      ],
    },
    {
      name: 'Product Change Approval',
      entityType: 'PRODUCT' as WorkflowEntityType,
      description: 'Approval for product modifications',
      steps: [
        { stepName: 'QA Review', roleNames: ['QC Analyst', 'Admin'], description: 'Review product changes' },
        { stepName: 'Regulatory Approval', roleNames: ['Admin'], description: 'Regulatory compliance check' },
      ],
    },
  ];

  for (const wfDef of workflowDefinitions) {
    const existingWorkflow = await prisma.workflowDefinition.findUnique({
      where: { name: wfDef.name },
    });

    if (!existingWorkflow) {
      const workflow = await prisma.workflowDefinition.create({
        data: {
          name: wfDef.name,
          entityType: wfDef.entityType,
          triggerStatus: wfDef.triggerStatus || null,
          description: wfDef.description,
          isActive: true,
          requiresAllSteps: true,
        },
      });

      for (let i = 0; i < wfDef.steps.length; i++) {
        const stepDef = wfDef.steps[i];
        const role = await prisma.role.findFirst({
          where: { name: { in: stepDef.roleNames } },
        });

        if (role) {
          await prisma.approvalStep.create({
            data: {
              workflowId: workflow.id,
              stepOrder: i + 1,
              stepName: stepDef.stepName,
              description: stepDef.description,
              approverRoleId: role.id,
              isRequired: true,
            },
          });
        }
      }

      console.log(`Created workflow: ${wfDef.name}`);
    }
  }

  // Seed Settings Data
  console.log('Seeding settings data...');

  // Countries
  const saudiArabia = await prisma.settingCountry.upsert({
    where: { code: 'SA' },
    update: {},
    create: { code: 'SA', name: 'Saudi Arabia', nameAr: 'المملكة العربية السعودية' },
  });
  
  await prisma.settingCountry.upsert({
    where: { code: 'AE' },
    update: {},
    create: { code: 'AE', name: 'United Arab Emirates', nameAr: 'الإمارات العربية المتحدة' },
  });
  
  await prisma.settingCountry.upsert({
    where: { code: 'BH' },
    update: {},
    create: { code: 'BH', name: 'Bahrain', nameAr: 'البحرين' },
  });
  
  await prisma.settingCountry.upsert({
    where: { code: 'KW' },
    update: {},
    create: { code: 'KW', name: 'Kuwait', nameAr: 'الكويت' },
  });

  // Saudi Regions (create first so cities can reference them)
  const regionsData = [
    { code: 'CENT', name: 'Central Region', nameAr: 'المنطقة الوسطى' },
    { code: 'WEST', name: 'Western Region', nameAr: 'المنطقة الغربية' },
    { code: 'EAST', name: 'Eastern Region', nameAr: 'المنطقة الشرقية' },
    { code: 'NORT', name: 'Northern Region', nameAr: 'المنطقة الشمالية' },
    { code: 'SOUT', name: 'Southern Region', nameAr: 'المنطقة الجنوبية' },
  ];

  const regions: Record<string, any> = {};
  for (const region of regionsData) {
    regions[region.code] = await prisma.settingRegion.upsert({
      where: { countryId_code: { countryId: saudiArabia.id, code: region.code } },
      update: {},
      create: { countryId: saudiArabia.id, ...region },
    });
  }

  // Saudi Cities (with region references)
  const citiesData = [
    { code: 'RUH', name: 'Riyadh', nameAr: 'الرياض', regionCode: 'CENT' },
    { code: 'JED', name: 'Jeddah', nameAr: 'جدة', regionCode: 'WEST' },
    { code: 'DMM', name: 'Dammam', nameAr: 'الدمام', regionCode: 'EAST' },
    { code: 'MKK', name: 'Mecca', nameAr: 'مكة المكرمة', regionCode: 'WEST' },
    { code: 'MED', name: 'Medina', nameAr: 'المدينة المنورة', regionCode: 'WEST' },
    { code: 'KHO', name: 'Khobar', nameAr: 'الخبر', regionCode: 'EAST' },
    { code: 'TAB', name: 'Tabuk', nameAr: 'تبوك', regionCode: 'NORT' },
    { code: 'ABH', name: 'Abha', nameAr: 'أبها', regionCode: 'SOUT' },
  ];

  for (const city of citiesData) {
    const { regionCode, ...cityData } = city;
    await prisma.settingCity.upsert({
      where: { countryId_code: { countryId: saudiArabia.id, code: city.code } },
      update: { regionId: regions[regionCode].id },
      create: { countryId: saudiArabia.id, regionId: regions[regionCode].id, ...cityData },
    });
  }

  // Customer Categories
  const categories = [
    { code: 'GOV', name: 'Government Hospital', nameAr: 'مستشفى حكومي', description: 'Government-funded healthcare facilities' },
    { code: 'PRI', name: 'Private Hospital', nameAr: 'مستشفى خاص', description: 'Private healthcare facilities' },
    { code: 'UNI', name: 'University Hospital', nameAr: 'مستشفى جامعي', description: 'Academic medical centers' },
    { code: 'MIL', name: 'Military Hospital', nameAr: 'مستشفى عسكري', description: 'Military healthcare facilities' },
    { code: 'CLI', name: 'Clinic', nameAr: 'عيادة', description: 'Outpatient clinics and imaging centers' },
  ];

  for (const cat of categories) {
    await prisma.settingCategory.upsert({
      where: { code: cat.code },
      update: {},
      create: cat,
    });
  }

  // Couriers
  const courier1 = await prisma.settingCourier.upsert({
    where: { code: 'MED01' },
    update: {},
    create: { code: 'MED01', name: 'Medical Express', nameAr: 'ميديكال إكسبرس', phone: '+966 11 234 5678', email: 'dispatch@medexpress.sa' },
  });

  const courier2 = await prisma.settingCourier.upsert({
    where: { code: 'RAD01' },
    update: {},
    create: { code: 'RAD01', name: 'RadioPharma Fleet', nameAr: 'أسطول راديوفارما', phone: '+966 11 987 6543', email: 'fleet@radiopharma.sa' },
  });

  // Vehicles
  await prisma.settingVehicle.upsert({
    where: { plateNumber: 'ABC 1234' },
    update: {},
    create: { courierId: courier1.id, plateNumber: 'ABC 1234', vehicleType: 'Van', model: 'Toyota Hiace 2024', capacity: '50 packages' },
  });

  await prisma.settingVehicle.upsert({
    where: { plateNumber: 'XYZ 5678' },
    update: {},
    create: { courierId: courier1.id, plateNumber: 'XYZ 5678', vehicleType: 'Car', model: 'Honda CR-V 2023', capacity: '20 packages' },
  });

  await prisma.settingVehicle.upsert({
    where: { plateNumber: 'RAD 0001' },
    update: {},
    create: { courierId: courier2.id, plateNumber: 'RAD 0001', vehicleType: 'Van', model: 'Mercedes Sprinter 2024', capacity: '100 packages' },
  });

  // Dose Units
  const doseUnits = [
    { code: 'mCi', name: 'Millicurie', symbol: 'mCi', description: 'Unit of radioactivity (1 mCi = 37 MBq)' },
    { code: 'MBq', name: 'Megabecquerel', symbol: 'MBq', description: 'SI unit of radioactivity' },
    { code: 'GBq', name: 'Gigabecquerel', symbol: 'GBq', description: 'SI unit of radioactivity (1 GBq = 1000 MBq)' },
    { code: 'Ci', name: 'Curie', symbol: 'Ci', description: 'Unit of radioactivity (1 Ci = 1000 mCi)' },
    { code: 'kBq', name: 'Kilobecquerel', symbol: 'kBq', description: 'SI unit of radioactivity (1 kBq = 0.001 MBq)' },
  ];

  for (const du of doseUnits) {
    await prisma.settingDoseUnit.upsert({
      where: { code: du.code },
      update: {},
      create: du,
    });
  }

  // Product Types
  const productTypes = [
    { code: 'PET', name: 'PET Tracer', nameAr: 'متتبع بت', description: 'Positron Emission Tomography tracers' },
    { code: 'SPECT', name: 'SPECT Tracer', nameAr: 'متتبع سبكت', description: 'Single Photon Emission Computed Tomography tracers' },
    { code: 'THER', name: 'Therapeutic', nameAr: 'علاجي', description: 'Therapeutic radiopharmaceuticals' },
    { code: 'DIAG', name: 'Diagnostic', nameAr: 'تشخيصي', description: 'Diagnostic radiopharmaceuticals' },
  ];

  for (const pt of productTypes) {
    await prisma.settingProductType.upsert({
      where: { code: pt.code },
      update: {},
      create: pt,
    });
  }

  // Production Methods
  const productionMethods = [
    { code: 'CYCL', name: 'Cyclotron Production', nameAr: 'إنتاج السيكلوترون', description: 'Production using cyclotron particle accelerator' },
    { code: 'GEN', name: 'Generator Elution', nameAr: 'استخلاص المولد', description: 'Production from radionuclide generator' },
    { code: 'REAC', name: 'Reactor Production', nameAr: 'إنتاج المفاعل', description: 'Production using nuclear reactor' },
    { code: 'SYNTH', name: 'Chemical Synthesis', nameAr: 'التركيب الكيميائي', description: 'Production through chemical synthesis' },
  ];

  for (const pm of productionMethods) {
    await prisma.settingProductionMethod.upsert({
      where: { code: pm.code },
      update: {},
      create: pm,
    });
  }

  // Currencies (SAR as default)
  await prisma.settingCurrency.upsert({
    where: { code: 'SAR' },
    update: {},
    create: { code: 'SAR', name: 'Saudi Riyal', nameAr: 'ريال سعودي', symbol: 'ر.س', exchangeRate: 1.0, isDefault: true },
  });

  await prisma.settingCurrency.upsert({
    where: { code: 'USD' },
    update: {},
    create: { code: 'USD', name: 'US Dollar', nameAr: 'دولار أمريكي', symbol: '$', exchangeRate: 0.2666, isDefault: false },
  });

  await prisma.settingCurrency.upsert({
    where: { code: 'EUR' },
    update: {},
    create: { code: 'EUR', name: 'Euro', nameAr: 'يورو', symbol: '€', exchangeRate: 0.2450, isDefault: false },
  });

  await prisma.settingCurrency.upsert({
    where: { code: 'AED' },
    update: {},
    create: { code: 'AED', name: 'UAE Dirham', nameAr: 'درهم إماراتي', symbol: 'د.إ', exchangeRate: 0.9790, isDefault: false },
  });

  console.log('Settings data seeded.');

  // Demo Reservations
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  tomorrow.setHours(7, 0, 0, 0);

  const dayAfter = new Date();
  dayAfter.setDate(dayAfter.getDate() + 2);
  dayAfter.setHours(8, 0, 0, 0);

  const threeDays = new Date();
  threeDays.setDate(threeDays.getDate() + 3);
  threeDays.setHours(6, 30, 0, 0);

  const fourDays = new Date();
  fourDays.setDate(fourDays.getDate() + 4);
  fourDays.setHours(9, 0, 0, 0);

  const fiveDays = new Date();
  fiveDays.setDate(fiveDays.getDate() + 5);
  fiveDays.setHours(7, 30, 0, 0);

  const reservations = await Promise.all([
    prisma.reservation.upsert({
      where: { reservationNumber: 'RES-2024-0001' },
      update: {},
      create: {
        reservationNumber: 'RES-2024-0001',
        customerId: customers[0].id,
        productId: products[0].id,
        requestedDate: tomorrow,
        requestedActivity: 15.0,
        activityUnit: 'mCi',
        estimatedMinutes: 45,
        numberOfDoses: 2,
        status: 'CONFIRMED',
        notes: 'Morning PET scan scheduled',
        createdById: adminUser.id,
      },
    }),
    prisma.reservation.upsert({
      where: { reservationNumber: 'RES-2024-0002' },
      update: {},
      create: {
        reservationNumber: 'RES-2024-0002',
        customerId: customers[1].id,
        productId: products[0].id,
        requestedDate: tomorrow,
        requestedActivity: 10.0,
        activityUnit: 'mCi',
        estimatedMinutes: 30,
        numberOfDoses: 1,
        status: 'TENTATIVE',
        notes: 'Awaiting patient confirmation',
        createdById: adminUser.id,
      },
    }),
    prisma.reservation.upsert({
      where: { reservationNumber: 'RES-2024-0003' },
      update: {},
      create: {
        reservationNumber: 'RES-2024-0003',
        customerId: customers[2].id,
        productId: products[2].id,
        requestedDate: dayAfter,
        requestedActivity: 25.0,
        activityUnit: 'mCi',
        estimatedMinutes: 40,
        numberOfDoses: 3,
        status: 'CONFIRMED',
        notes: 'Bone scan for multiple patients',
        createdById: adminUser.id,
      },
    }),
    prisma.reservation.upsert({
      where: { reservationNumber: 'RES-2024-0004' },
      update: {},
      create: {
        reservationNumber: 'RES-2024-0004',
        customerId: customers[3].id,
        productId: products[5].id,
        requestedDate: threeDays,
        requestedActivity: 200.0,
        activityUnit: 'mCi',
        estimatedMinutes: 120,
        numberOfDoses: 1,
        status: 'TENTATIVE',
        notes: 'Lu-177 therapy session',
        createdById: adminUser.id,
      },
    }),
    prisma.reservation.upsert({
      where: { reservationNumber: 'RES-2024-0005' },
      update: {},
      create: {
        reservationNumber: 'RES-2024-0005',
        customerId: customers[0].id,
        productId: products[1].id,
        requestedDate: fourDays,
        requestedActivity: 5.0,
        activityUnit: 'mCi',
        estimatedMinutes: 30,
        numberOfDoses: 1,
        status: 'CONFIRMED',
        notes: 'NaF bone scan',
        createdById: adminUser.id,
      },
    }),
    prisma.reservation.upsert({
      where: { reservationNumber: 'RES-2024-0006' },
      update: {},
      create: {
        reservationNumber: 'RES-2024-0006',
        customerId: customers[4].id,
        productId: products[3].id,
        requestedDate: fiveDays,
        requestedActivity: 15.0,
        activityUnit: 'mCi',
        estimatedMinutes: 35,
        numberOfDoses: 2,
        status: 'CONFIRMED',
        notes: 'Renal function study',
        createdById: adminUser.id,
      },
    }),
  ]);

  console.log(`Created ${reservations.length} demo reservations.`);

  // Production Time Standards (Recipes) for FDG product
  const timeStandards = await Promise.all([
    prisma.timeStandard.upsert({
      where: { productId_processType: { productId: products[0].id, processType: 'BOMBARDMENT' } },
      update: {},
      create: {
        productId: products[0].id,
        processType: 'BOMBARDMENT',
        doseForm: 'Liquid',
        standardMinutes: 60,
        description: 'Cyclotron target bombardment for F-18 production',
        isActive: true,
      },
    }),
    prisma.timeStandard.upsert({
      where: { productId_processType: { productId: products[0].id, processType: 'SYNTHESIS' } },
      update: {},
      create: {
        productId: products[0].id,
        processType: 'SYNTHESIS',
        doseForm: 'Liquid',
        standardMinutes: 45,
        description: 'FDG synthesis in automated module',
        isActive: true,
      },
    }),
    prisma.timeStandard.upsert({
      where: { productId_processType: { productId: products[0].id, processType: 'PURIFICATION' } },
      update: {},
      create: {
        productId: products[0].id,
        processType: 'PURIFICATION',
        doseForm: 'Liquid',
        standardMinutes: 15,
        description: 'HPLC purification and sterile filtration',
        isActive: true,
      },
    }),
    prisma.timeStandard.upsert({
      where: { productId_processType: { productId: products[0].id, processType: 'QC_TESTING' } },
      update: {},
      create: {
        productId: products[0].id,
        processType: 'QC_TESTING',
        doseForm: 'Liquid',
        standardMinutes: 30,
        description: 'Quality control testing (pH, RCP, endotoxin, sterility)',
        isActive: true,
      },
    }),
    prisma.timeStandard.upsert({
      where: { productId_processType: { productId: products[0].id, processType: 'DISPENSING' } },
      update: {},
      create: {
        productId: products[0].id,
        processType: 'DISPENSING',
        doseForm: 'Liquid',
        standardMinutes: 10,
        description: 'Dose dispensing into patient vials',
        isActive: true,
      },
    }),
    prisma.timeStandard.upsert({
      where: { productId_processType: { productId: products[0].id, processType: 'PACKAGING' } },
      update: {},
      create: {
        productId: products[0].id,
        processType: 'PACKAGING',
        doseForm: 'Liquid',
        standardMinutes: 15,
        description: 'Packaging and labeling for transport',
        isActive: true,
      },
    }),
  ]);

  console.log(`Created ${timeStandards.length} time standards (production recipe) for FDG.`);

  // Create Suppliers for Procurement
  const existingSuppliers = await prisma.supplier.count();
  if (existingSuppliers === 0) {
    const suppliersData = [
      {
        code: 'SUP-001',
        name: 'PharmaChem International',
        nameAr: 'فارماكيم الدولية',
        email: 'sales@pharmachem.com',
        phone: '+966112223333',
        mobile: '+966501112222',
        website: 'https://www.pharmachem.com',
        taxNumber: '300011112200001',
        vatNumber: 'SA300011112200001',
        crNumber: '1010111222',
        address: '123 Industrial City',
        city: 'Riyadh',
        region: 'Riyadh',
        country: 'Saudi Arabia',
        postalCode: '11111',
        paymentTermsDays: 30,
        status: 'ACTIVE',
      },
      {
        code: 'SUP-002',
        name: 'Isotope Solutions Ltd',
        email: 'orders@isotopesolutions.com',
        phone: '+442071234567',
        website: 'https://www.isotopesolutions.com',
        address: '45 Science Park',
        city: 'Cambridge',
        country: 'United Kingdom',
        postalCode: 'CB1 2AB',
        paymentTermsDays: 45,
        status: 'ACTIVE',
      },
      {
        code: 'SUP-003',
        name: 'Medical Supplies Gulf',
        nameAr: 'مستلزمات طبية الخليج',
        email: 'info@medgulf.sa',
        phone: '+966138889999',
        mobile: '+966503334444',
        address: '789 Medical District',
        city: 'Dammam',
        region: 'Eastern Province',
        country: 'Saudi Arabia',
        postalCode: '31111',
        paymentTermsDays: 30,
        status: 'ACTIVE',
      },
    ];

    await Promise.all(
      suppliersData.map(sup =>
        prisma.supplier.create({ data: sup as any })
      )
    );
    console.log(`Created ${suppliersData.length} demo suppliers.`);
  } else {
    console.log(`Suppliers already exist (${existingSuppliers}), skipping...`);
  }

  // Create Materials for BOM
  const materialsData = [
    { code: 'MAT-O18-WATER', name: 'O-18 Enriched Water', category: 'TARGET_MATERIAL', unit: 'mL', isRadioactive: false, storageConditions: 'Room temperature, sealed container' },
    { code: 'MAT-FDG-PREC', name: 'FDG Precursor (Mannose Triflate)', category: 'REAGENT', unit: 'mg', isRadioactive: false, storageConditions: '-20°C, anhydrous' },
    { code: 'MAT-NaCl-INJ', name: 'Sodium Chloride 0.9% Injection', category: 'REAGENT', unit: 'mL', isRadioactive: false },
    { code: 'MAT-ETHANOL', name: 'Ethanol USP Grade', category: 'SOLVENT', unit: 'mL', isRadioactive: false },
    { code: 'MAT-ACETONITRILE', name: 'Acetonitrile HPLC Grade', category: 'SOLVENT', unit: 'mL', isRadioactive: false, hazardClass: 'Flammable' },
    { code: 'MAT-FILTER-022', name: 'Sterile Filter 0.22µm', category: 'FILTER', unit: 'pcs', isRadioactive: false },
    { code: 'MAT-VIAL-10ML', name: 'Sterile Vial 10mL', category: 'CONTAINER', unit: 'pcs', isRadioactive: false },
    { code: 'MAT-VIAL-30ML', name: 'Sterile Vial 30mL', category: 'CONTAINER', unit: 'pcs', isRadioactive: false },
    { code: 'MAT-SEPTUM', name: 'Rubber Septum', category: 'PACKAGING', unit: 'pcs', isRadioactive: false },
    { code: 'MAT-KRYPTOFIX', name: 'Kryptofix 2.2.2', category: 'REAGENT', unit: 'mg', isRadioactive: false, hazardClass: 'Toxic' },
    { code: 'MAT-K2CO3', name: 'Potassium Carbonate', category: 'REAGENT', unit: 'mg', isRadioactive: false },
    { code: 'MAT-HCl', name: 'Hydrochloric Acid 1M', category: 'REAGENT', unit: 'mL', isRadioactive: false, hazardClass: 'Corrosive' },
  ];

  const existingMaterials = await prisma.material.count();
  if (existingMaterials === 0) {
    const materials = await Promise.all(
      materialsData.map(mat => 
        prisma.material.create({
          data: {
            code: mat.code,
            name: mat.name,
            category: mat.category as any,
            unit: mat.unit,
            isRadioactive: mat.isRadioactive,
            storageConditions: mat.storageConditions,
            hazardClass: mat.hazardClass,
            status: 'ACTIVE',
          },
        })
      )
    );
    console.log(`Created ${materials.length} demo materials for BOM.`);

    // Create Recipes for products
    const fdgProduct = products.find(p => p.code === 'FDG-18');
    if (fdgProduct && materials.length > 0) {
      const o18Water = materials.find(m => m.code === 'MAT-O18-WATER');
      const precursor = materials.find(m => m.code === 'MAT-FDG-PREC');
      const saline = materials.find(m => m.code === 'MAT-NaCl-INJ');
      const filter = materials.find(m => m.code === 'MAT-FILTER-022');
      const vial = materials.find(m => m.code === 'MAT-VIAL-10ML');

      const fdgRecipe = await prisma.recipe.create({
        data: {
          code: 'RCP-FDG-001',
          name: 'FDG Standard Synthesis',
          productId: fdgProduct.id,
          version: 1,
          status: 'ACTIVE',
          description: 'Standard synthesis protocol for F-18 FDG production',
          yieldQuantity: 500,
          yieldUnit: 'mCi',
          yieldTolerance: 10,
          synthesisTimeMinutes: 45,
          totalTimeMinutes: 90,
          equipmentRequirements: 'FASTlab or TRACERlab FX-FDG synthesis module, Hot cell with laminar flow',
          safetyPrecautions: 'Follow radiation safety protocols. Use shielding for all F-18 handling.',
          activatedAt: new Date(),
          effectiveDate: new Date(),
          components: {
            create: [
              { materialId: o18Water!.id, sequence: 1, quantity: 2.5, unit: 'mL', isCritical: true, additionNotes: 'Target water for cyclotron irradiation' },
              { materialId: precursor!.id, sequence: 2, quantity: 40, unit: 'mg', isCritical: true, additionNotes: 'Loaded into synthesis module' },
              { materialId: saline!.id, sequence: 3, quantity: 10, unit: 'mL', isCritical: false, additionNotes: 'For final formulation' },
              { materialId: filter!.id, sequence: 4, quantity: 1, unit: 'pcs', isCritical: true, additionNotes: 'Terminal sterilization' },
              { materialId: vial!.id, sequence: 5, quantity: 1, unit: 'pcs', isCritical: false, additionNotes: 'Product vial' },
            ],
          },
          steps: {
            create: [
              { stepNumber: 1, title: 'Target Irradiation', description: 'Irradiate O-18 enriched water target in cyclotron', durationMinutes: 30, qualityCheckpoint: false },
              { stepNumber: 2, title: 'F-18 Transfer', description: 'Transfer F-18 fluoride to synthesis module', durationMinutes: 5, qualityCheckpoint: false },
              { stepNumber: 3, title: 'Nucleophilic Fluorination', description: 'Perform nucleophilic substitution with precursor', durationMinutes: 15, temperature: '85°C', qualityCheckpoint: false },
              { stepNumber: 4, title: 'Hydrolysis', description: 'Hydrolyze protecting groups', durationMinutes: 10, qualityCheckpoint: false },
              { stepNumber: 5, title: 'Purification', description: 'HPLC or SPE purification', durationMinutes: 15, qualityCheckpoint: true, checkpointCriteria: 'Check radiochemical purity >95%' },
              { stepNumber: 6, title: 'Sterile Filtration', description: 'Pass through 0.22µm filter into product vial', durationMinutes: 5, qualityCheckpoint: true, checkpointCriteria: 'Visual inspection for clarity' },
            ],
          },
        },
      });
      console.log(`Created FDG recipe: ${fdgRecipe.code} v${fdgRecipe.version}`);
    }
  } else {
    console.log(`Materials already exist (${existingMaterials}), skipping material/recipe seeding...`);
  }

  // ==================== WAREHOUSES DEMO DATA ====================
  console.log('Creating Warehouse demo data...');
  const existingWarehouses = await prisma.warehouse.count();
  let warehouses: any[] = [];
  if (existingWarehouses === 0) {
    const warehouseData = [
      { code: 'WH-RAW', name: 'Raw Materials Warehouse', nameAr: 'مستودع المواد الخام', type: 'RAW_MATERIALS', temperatureMin: 15, temperatureMax: 25, humidityMin: 30, humidityMax: 60, requiresQC: true },
      { code: 'WH-QRN', name: 'Quarantine Warehouse', nameAr: 'مستودع الحجر', type: 'QUARANTINE', temperatureMin: 15, temperatureMax: 25, requiresQC: true },
      { code: 'WH-PROD', name: 'Production Warehouse', nameAr: 'مستودع الإنتاج', type: 'PRODUCTION', temperatureMin: 18, temperatureMax: 22, requiresQC: false },
      { code: 'WH-FG', name: 'Finished Goods Warehouse', nameAr: 'مستودع المنتجات النهائية', type: 'FINISHED_GOODS', temperatureMin: 15, temperatureMax: 25, requiresQC: true },
      { code: 'WH-COLD', name: 'Cold Storage', nameAr: 'التخزين البارد', type: 'COLD_STORAGE', temperatureMin: 2, temperatureMax: 8, humidityMin: 20, humidityMax: 50, requiresQC: true },
      { code: 'WH-RAD', name: 'Radioactive Storage', nameAr: 'مستودع المواد المشعة', type: 'RADIOACTIVE', isRadioactive: true, requiresQC: true },
    ];

    warehouses = await Promise.all(
      warehouseData.map(async (wh) => {
        const warehouse = await prisma.warehouse.create({ data: wh as any });
        await prisma.warehouseLocation.createMany({
          data: [
            { warehouseId: warehouse.id, code: `${wh.code}-A1`, name: 'Zone A - Rack 1', zone: 'A', aisle: '1', rack: '1' },
            { warehouseId: warehouse.id, code: `${wh.code}-A2`, name: 'Zone A - Rack 2', zone: 'A', aisle: '1', rack: '2' },
            { warehouseId: warehouse.id, code: `${wh.code}-B1`, name: 'Zone B - Rack 1', zone: 'B', aisle: '2', rack: '1' },
          ],
        });
        return warehouse;
      })
    );
    console.log(`Created ${warehouses.length} demo warehouses with locations.`);
  } else {
    warehouses = await prisma.warehouse.findMany();
    console.log(`Warehouses already exist (${existingWarehouses}), skipping...`);
  }

  // ==================== PURCHASE ORDERS DEMO DATA ====================
  console.log('Creating Purchase Order demo data...');
  const existingPOs = await prisma.purchaseOrder.count();
  let purchaseOrders: any[] = [];
  if (existingPOs === 0) {
    const allSuppliers = await prisma.supplier.findMany();
    const allMaterials = await prisma.material.findMany();
    
    if (allSuppliers.length > 0 && allMaterials.length > 0) {
      const poData = [
        { poNumber: 'PO-2026-001', supplierId: allSuppliers[0].id, status: 'APPROVED', expectedDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) },
        { poNumber: 'PO-2026-002', supplierId: allSuppliers[1 % allSuppliers.length].id, status: 'SENT', expectedDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000) },
        { poNumber: 'PO-2026-003', supplierId: allSuppliers[0].id, status: 'RECEIVED', expectedDate: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000) },
        { poNumber: 'PO-2026-004', supplierId: allSuppliers[2 % allSuppliers.length].id, status: 'DRAFT', expectedDate: new Date(Date.now() + 21 * 24 * 60 * 60 * 1000) },
        { poNumber: 'PO-2026-005', supplierId: allSuppliers[0].id, status: 'PENDING_APPROVAL', expectedDate: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000) },
      ];

      for (const po of poData) {
        const items = allMaterials.slice(0, 3).map((mat, idx) => ({
          lineNumber: idx + 1,
          itemCode: mat.code,
          itemName: mat.name,
          description: mat.name,
          orderedQty: (idx + 1) * 10,
          unit: mat.unit,
          unitPrice: new Prisma.Decimal((idx + 1) * 50),
          totalPrice: new Prisma.Decimal((idx + 1) * 10 * (idx + 1) * 50),
        }));
        
        const subtotal = items.reduce((sum, item) => sum + Number(item.totalPrice), 0);
        const taxAmount = subtotal * 0.15;
        
        const createdPO = await prisma.purchaseOrder.create({
          data: {
            poNumber: po.poNumber,
            supplierId: po.supplierId,
            status: po.status as any,
            expectedDate: po.expectedDate,
            subtotal: new Prisma.Decimal(subtotal),
            taxAmount: new Prisma.Decimal(taxAmount),
            totalAmount: new Prisma.Decimal(subtotal + taxAmount),
            paymentTermsDays: 30,
            items: { create: items },
            createdById: adminUser.id,
          },
        });
        purchaseOrders.push(createdPO);
      }
      console.log(`Created ${purchaseOrders.length} demo purchase orders.`);
    }
  } else {
    purchaseOrders = await prisma.purchaseOrder.findMany();
    console.log(`Purchase orders already exist (${existingPOs}), skipping...`);
  }

  // ==================== GOODS RECEIVING NOTES DEMO DATA ====================
  console.log('Creating GRN demo data...');
  const existingGRNs = await prisma.goodsReceivedNote.count();
  let grns: any[] = [];
  if (existingGRNs === 0 && purchaseOrders.length > 0) {
    const receivedPO = purchaseOrders.find((po: any) => po.status === 'RECEIVED');
    const approvedPO = purchaseOrders.find((po: any) => po.status === 'APPROVED');
    
    if (receivedPO) {
      const poWithItems = await prisma.purchaseOrder.findUnique({ where: { id: receivedPO.id }, include: { items: true } });
      if (poWithItems && poWithItems.items.length > 0) {
        const grn = await prisma.goodsReceivedNote.create({
          data: {
            grnNumber: 'GRN-2026-001',
            poId: receivedPO.id,
            supplierId: receivedPO.supplierId,
            status: 'APPROVED',
            receivedById: adminUser.id,
            approvedById: adminUser.id,
            approvedAt: new Date(),
            deliveryNoteNumber: 'DN-12345',
            items: {
              create: poWithItems.items.map((item: any) => ({
                poItemId: item.id,
                receivedQty: item.orderedQty,
                acceptedQty: item.orderedQty,
                rejectedQty: 0,
                unit: item.unit,
                status: 'RELEASED',
                lotNumber: `LOT-${Date.now()}`,
                expiryDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
              })),
            },
          },
        });
        grns.push(grn);
      }
    }

    if (approvedPO) {
      const poWithItems = await prisma.purchaseOrder.findUnique({ where: { id: approvedPO.id }, include: { items: true } });
      if (poWithItems && poWithItems.items.length > 0) {
        const grn = await prisma.goodsReceivedNote.create({
          data: {
            grnNumber: 'GRN-2026-002',
            poId: approvedPO.id,
            supplierId: approvedPO.supplierId,
            status: 'PENDING_QC',
            receivedById: adminUser.id,
            deliveryNoteNumber: 'DN-12346',
            items: {
              create: poWithItems.items.slice(0, 2).map((item: any) => ({
                poItemId: item.id,
                receivedQty: item.orderedQty - 2,
                acceptedQty: 0,
                rejectedQty: 0,
                unit: item.unit,
                status: 'QUARANTINE',
                lotNumber: `LOT-${Date.now() + 1}`,
              })),
            },
          },
        });
        grns.push(grn);
      }
    }
    console.log(`Created ${grns.length} demo GRNs.`);
  } else {
    console.log(`GRNs already exist (${existingGRNs}), skipping...`);
  }

  // ==================== STOCK/INVENTORY DEMO DATA ====================
  console.log('Creating Stock/Inventory demo data...');
  const existingStock = await prisma.stockItem.count();
  const allWarehouses = await prisma.warehouse.findMany();
  if (existingStock === 0 && allWarehouses.length > 0) {
    const allMaterials = await prisma.material.findMany();
    const rawWarehouse = allWarehouses.find((w: any) => w.code === 'WH-RAW' || w.code === 'WH-RM' || w.type === 'RAW_MATERIALS');
    const coldWarehouse = allWarehouses.find((w: any) => w.code === 'WH-COLD' || w.type === 'COLD_STORAGE');
    const quarantineWarehouse = allWarehouses.find((w: any) => w.code === 'WH-QRN' || w.code === 'WH-QR' || w.type === 'QUARANTINE');
    
    if (rawWarehouse && allMaterials.length > 0) {
      const stockData = [
        { materialId: allMaterials[0].id, warehouseId: rawWarehouse.id, quantity: 500, lotNumber: 'LOT-2026-001', status: 'AVAILABLE' },
        { materialId: allMaterials[1]?.id || allMaterials[0].id, warehouseId: rawWarehouse.id, quantity: 250, lotNumber: 'LOT-2026-002', status: 'AVAILABLE' },
        { materialId: allMaterials[2]?.id || allMaterials[0].id, warehouseId: coldWarehouse?.id || rawWarehouse.id, quantity: 1000, lotNumber: 'LOT-2026-003', status: 'AVAILABLE' },
        { materialId: allMaterials[3]?.id || allMaterials[0].id, warehouseId: quarantineWarehouse?.id || rawWarehouse.id, quantity: 100, lotNumber: 'LOT-2026-004', status: 'QUARANTINE' },
        { materialId: allMaterials[4]?.id || allMaterials[0].id, warehouseId: rawWarehouse.id, quantity: 50, lotNumber: 'LOT-2026-005', status: 'RESERVED', reservedQty: 20 },
      ];

      await Promise.all(
        stockData.map((stock) =>
          prisma.stockItem.create({
            data: {
              materialId: stock.materialId,
              warehouseId: stock.warehouseId,
              quantity: stock.quantity,
              availableQty: stock.quantity - (stock.reservedQty || 0),
              reservedQty: stock.reservedQty || 0,
              unit: 'EA',
              lotNumber: stock.lotNumber,
              status: stock.status as any,
              expiryDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
              receivedDate: new Date(),
            },
          })
        )
      );
      console.log(`Created ${stockData.length} demo stock items.`);
    }
  } else {
    console.log(`Stock items already exist (${existingStock}), skipping...`);
  }

  // ==================== BATCH RECORDS (Manufacturing Execution) DEMO DATA ====================
  console.log('Creating Batch Record demo data...');
  const existingBatchRecords = await prisma.batchRecord.count();
  if (existingBatchRecords === 0 && batches.length > 0) {
    const activeRecipe = await prisma.recipe.findFirst({ where: { status: 'ACTIVE' }, include: { steps: true } });
    
    if (activeRecipe) {
      const batchRecordData = [
        { batch: batches[0], status: 'IN_PROGRESS', startedAt: new Date(Date.now() - 2 * 60 * 60 * 1000) },
        { batch: batches[1], status: 'DRAFT', startedAt: null },
        { batch: batches[2], status: 'APPROVED', startedAt: new Date(Date.now() - 24 * 60 * 60 * 1000), completedAt: new Date(Date.now() - 20 * 60 * 60 * 1000) },
      ];

      for (const brData of batchRecordData) {
        if (!brData.batch) continue;
        
        const existingBR = await prisma.batchRecord.findUnique({ where: { batchId: brData.batch.id } });
        if (existingBR) continue;

        const batchRecord = await prisma.batchRecord.create({
          data: {
            batchId: brData.batch.id,
            recipeId: activeRecipe.id,
            recipeVersion: activeRecipe.version,
            status: brData.status as any,
            plannedYield: activeRecipe.yieldQuantity || 500,
            actualYield: brData.status === 'APPROVED' ? (activeRecipe.yieldQuantity || 500) * 0.95 : null,
            yieldUnit: activeRecipe.yieldUnit || 'mCi',
            startedAt: brData.startedAt,
            completedAt: brData.completedAt,
            startedById: brData.startedAt ? adminUser.id : null,
            completedById: brData.completedAt ? adminUser.id : null,
            reviewedById: brData.status === 'APPROVED' ? adminUser.id : null,
            approvedById: brData.status === 'APPROVED' ? adminUser.id : null,
            reviewedAt: brData.status === 'APPROVED' ? new Date(Date.now() - 18 * 60 * 60 * 1000) : null,
            approvedAt: brData.status === 'APPROVED' ? new Date(Date.now() - 16 * 60 * 60 * 1000) : null,
          },
        });

        const stepStatuses = brData.status === 'APPROVED' 
          ? ['COMPLETED', 'COMPLETED', 'COMPLETED', 'COMPLETED', 'COMPLETED', 'COMPLETED']
          : brData.status === 'IN_PROGRESS'
          ? ['COMPLETED', 'COMPLETED', 'IN_PROGRESS', 'PENDING', 'PENDING', 'PENDING']
          : ['PENDING', 'PENDING', 'PENDING', 'PENDING', 'PENDING', 'PENDING'];

        await Promise.all(
          activeRecipe.steps.map((step, idx) =>
            prisma.batchRecordStep.create({
              data: {
                batchRecordId: batchRecord.id,
                recipeStepId: step.id,
                stepNumber: step.stepNumber,
                title: step.title,
                description: step.description || '',
                instructions: step.description,
                status: stepStatuses[idx] as any || 'PENDING',
                plannedDuration: step.durationMinutes,
                actualDuration: stepStatuses[idx] === 'COMPLETED' ? (step.durationMinutes || 10) + Math.floor(Math.random() * 5) : null,
                isQualityCheckpoint: step.qualityCheckpoint,
                checkpointCriteria: step.checkpointCriteria,
                checkpointPassed: stepStatuses[idx] === 'COMPLETED' && step.qualityCheckpoint ? true : null,
                startedAt: stepStatuses[idx] !== 'PENDING' ? new Date(Date.now() - (6 - idx) * 30 * 60 * 1000) : null,
                completedAt: stepStatuses[idx] === 'COMPLETED' ? new Date(Date.now() - (5 - idx) * 30 * 60 * 1000) : null,
                executedById: stepStatuses[idx] !== 'PENDING' ? adminUser.id : null,
              },
            })
          )
        );
      }
      console.log(`Created batch records for manufacturing execution demo.`);
    }
  } else {
    console.log(`Batch records already exist (${existingBatchRecords}), skipping...`);
  }

  // ==================== PAYMENT REQUESTS DEMO DATA ====================
  console.log('Creating Payment Request demo data...');
  const existingPaymentRequests = await prisma.paymentRequest.count();
  if (existingPaymentRequests === 0) {
    const invoicesForPayments = await prisma.invoice.findMany({ 
      include: { customer: true },
      take: 5 
    });
    
    if (invoicesForPayments.length > 0) {
      const paymentMethods = ['BANK_TRANSFER', 'CREDIT_CARD', 'CASH', 'CHECK'];
      const paymentRequestData = [
        { 
          invoice: invoicesForPayments[0], 
          amount: Number(invoicesForPayments[0]?.totalAmount) * 0.5 || 5000,
          status: 'PENDING_CONFIRMATION',
          paymentMethod: 'BANK_TRANSFER',
          referenceNumber: 'TRF-2026-001',
          notes: 'Partial payment for invoice'
        },
        { 
          invoice: invoicesForPayments[1] || invoicesForPayments[0], 
          amount: Number(invoicesForPayments[1]?.totalAmount || invoicesForPayments[0]?.totalAmount) || 3500,
          status: 'PENDING_CONFIRMATION',
          paymentMethod: 'CREDIT_CARD',
          referenceNumber: 'CC-2026-002',
          notes: 'Full payment via credit card'
        },
        { 
          invoice: invoicesForPayments[2] || invoicesForPayments[0], 
          amount: 2500,
          status: 'CONFIRMED',
          paymentMethod: 'BANK_TRANSFER',
          referenceNumber: 'TRF-2026-003',
          notes: 'Payment confirmed by finance'
        },
        { 
          invoice: invoicesForPayments[3] || invoicesForPayments[0], 
          amount: 1500,
          status: 'REJECTED',
          paymentMethod: 'CHECK',
          referenceNumber: 'CHK-2026-004',
          notes: 'Check payment submitted',
          rejectionReason: 'Check returned by bank - insufficient funds'
        },
        { 
          invoice: invoicesForPayments[4] || invoicesForPayments[0], 
          amount: 4200,
          status: 'PENDING_CONFIRMATION',
          paymentMethod: 'CASH',
          referenceNumber: 'CASH-2026-005',
          notes: 'Cash payment at office'
        },
      ];

      for (const pr of paymentRequestData) {
        if (!pr.invoice) continue;
        await prisma.paymentRequest.create({
          data: {
            invoiceId: pr.invoice.id,
            customerId: pr.invoice.customerId,
            amount: pr.amount,
            amountSAR: pr.amount,
            currency: 'SAR',
            paymentMethod: pr.paymentMethod,
            referenceNumber: pr.referenceNumber,
            notes: pr.notes,
            status: pr.status as any,
            submittedByUserId: adminUser.id,
            reviewedAt: pr.status !== 'PENDING_CONFIRMATION' ? new Date() : null,
            reviewedByUserId: pr.status !== 'PENDING_CONFIRMATION' ? adminUser.id : null,
            rejectionReason: pr.rejectionReason,
          },
        });
      }
      console.log(`Created ${paymentRequestData.length} demo payment requests.`);
    } else {
      console.log('No invoices available for payment requests, skipping...');
    }
  } else {
    console.log(`Payment requests already exist (${existingPaymentRequests}), skipping...`);
  }

  // ==================== APPROVAL INBOX DEMO DATA ====================
  console.log('Creating Approval Inbox demo data...');

  // Create Workflow Definitions
  const orderApprovalWorkflow = await prisma.workflowDefinition.upsert({
    where: { name: 'Order Approval Workflow' },
    update: {},
    create: {
      name: 'Order Approval Workflow',
      entityType: 'ORDER',
      triggerStatus: 'PENDING',
      description: 'Approval workflow for new orders requiring manager sign-off',
      isActive: true,
      requiresAllSteps: true,
    },
  });

  const batchReleaseWorkflow = await prisma.workflowDefinition.upsert({
    where: { name: 'Batch Release Workflow' },
    update: {},
    create: {
      name: 'Batch Release Workflow',
      entityType: 'BATCH_RELEASE',
      triggerStatus: 'QC_COMPLETE',
      description: 'QP release approval for manufactured batches',
      isActive: true,
      requiresAllSteps: true,
    },
  });

  const customerOnboardingWorkflow = await prisma.workflowDefinition.upsert({
    where: { name: 'Customer Onboarding Workflow' },
    update: {},
    create: {
      name: 'Customer Onboarding Workflow',
      entityType: 'CUSTOMER',
      triggerStatus: 'PENDING_APPROVAL',
      description: 'Approval workflow for new customer registration',
      isActive: true,
      requiresAllSteps: false,
    },
  });

  const productChangeWorkflow = await prisma.workflowDefinition.upsert({
    where: { name: 'Product Change Workflow' },
    update: {},
    create: {
      name: 'Product Change Workflow',
      entityType: 'PRODUCT',
      triggerStatus: 'CHANGE_REQUESTED',
      description: 'Approval for product specification changes',
      isActive: true,
      requiresAllSteps: true,
    },
  });

  // Create Approval Steps for each workflow
  const orderStep1 = await prisma.approvalStep.upsert({
    where: { workflowId_stepOrder: { workflowId: orderApprovalWorkflow.id, stepOrder: 1 } },
    update: {},
    create: {
      workflowId: orderApprovalWorkflow.id,
      stepOrder: 1,
      stepName: 'Sales Manager Review',
      description: 'Initial review by sales manager for pricing and availability',
      approverRoleId: salesRole.id,
      timeoutHours: 24,
      isRequired: true,
    },
  });

  const orderStep2 = await prisma.approvalStep.upsert({
    where: { workflowId_stepOrder: { workflowId: orderApprovalWorkflow.id, stepOrder: 2 } },
    update: {},
    create: {
      workflowId: orderApprovalWorkflow.id,
      stepOrder: 2,
      stepName: 'Production Planning Check',
      description: 'Verify production capacity and scheduling',
      approverRoleId: plannerRole.id,
      timeoutHours: 48,
      isRequired: true,
    },
  });

  const batchStep1 = await prisma.approvalStep.upsert({
    where: { workflowId_stepOrder: { workflowId: batchReleaseWorkflow.id, stepOrder: 1 } },
    update: {},
    create: {
      workflowId: batchReleaseWorkflow.id,
      stepOrder: 1,
      stepName: 'QC Manager Review',
      description: 'Review all QC test results for compliance',
      approverRoleId: qcRole.id,
      timeoutHours: 4,
      isRequired: true,
    },
  });

  const batchStep2 = await prisma.approvalStep.upsert({
    where: { workflowId_stepOrder: { workflowId: batchReleaseWorkflow.id, stepOrder: 2 } },
    update: {},
    create: {
      workflowId: batchReleaseWorkflow.id,
      stepOrder: 2,
      stepName: 'Qualified Person Release',
      description: 'Final batch release by Qualified Person',
      approverRoleId: qpRole.id,
      timeoutHours: 2,
      isRequired: true,
    },
  });

  const customerStep1 = await prisma.approvalStep.upsert({
    where: { workflowId_stepOrder: { workflowId: customerOnboardingWorkflow.id, stepOrder: 1 } },
    update: {},
    create: {
      workflowId: customerOnboardingWorkflow.id,
      stepOrder: 1,
      stepName: 'Admin Verification',
      description: 'Verify customer credentials and documentation',
      approverRoleId: adminRole.id,
      timeoutHours: 72,
      isRequired: true,
    },
  });

  const productStep1 = await prisma.approvalStep.upsert({
    where: { workflowId_stepOrder: { workflowId: productChangeWorkflow.id, stepOrder: 1 } },
    update: {},
    create: {
      workflowId: productChangeWorkflow.id,
      stepOrder: 1,
      stepName: 'QA Review',
      description: 'Quality Assurance review for product changes',
      approverRoleId: qcRole.id,
      timeoutHours: 48,
      isRequired: true,
    },
  });

  // Create Demo Approval Requests
  const approvalRequests = [];

  // Order approval request (pending at step 1)
  if (orders.length > 0) {
    const orderRequest1 = await prisma.approvalRequest.create({
      data: {
        workflowId: orderApprovalWorkflow.id,
        entityType: 'ORDER',
        entityId: orders[0].id,
        requestedById: adminUser.id,
        currentStepOrder: 1,
        status: 'PENDING',
        priority: 'HIGH',
        dueDate: new Date(Date.now() + 24 * 60 * 60 * 1000),
        notes: 'Urgent order from major hospital - expedited review requested',
      },
    });
    approvalRequests.push(orderRequest1);

    if (orders.length > 1) {
      const orderRequest2 = await prisma.approvalRequest.create({
        data: {
          workflowId: orderApprovalWorkflow.id,
          entityType: 'ORDER',
          entityId: orders[1].id,
          requestedById: adminUser.id,
          currentStepOrder: 1,
          status: 'PENDING',
          priority: 'NORMAL',
          dueDate: new Date(Date.now() + 48 * 60 * 60 * 1000),
          notes: 'Standard order requiring capacity verification',
        },
      });
      approvalRequests.push(orderRequest2);
    }

    if (orders.length > 2) {
      // Order at step 2 (approved by sales, pending production)
      const orderRequest3 = await prisma.approvalRequest.create({
        data: {
          workflowId: orderApprovalWorkflow.id,
          entityType: 'ORDER',
          entityId: orders[2].id,
          requestedById: adminUser.id,
          currentStepOrder: 2,
          status: 'PENDING',
          priority: 'NORMAL',
          notes: 'Passed sales review, awaiting production scheduling',
        },
      });
      approvalRequests.push(orderRequest3);

      // Add approval action for step 1
      await prisma.approvalAction.create({
        data: {
          approvalRequestId: orderRequest3.id,
          stepId: orderStep1.id,
          actionById: adminUser.id,
          action: 'APPROVED',
          comments: 'Pricing confirmed, customer in good standing',
          actionAt: new Date(Date.now() - 2 * 60 * 60 * 1000),
        },
      });
    }
  }

  // Batch release approval requests
  if (batches.length > 0) {
    const batchRequest1 = await prisma.approvalRequest.create({
      data: {
        workflowId: batchReleaseWorkflow.id,
        entityType: 'BATCH_RELEASE',
        entityId: batches[0].id,
        requestedById: adminUser.id,
        currentStepOrder: 1,
        status: 'PENDING',
        priority: 'URGENT',
        dueDate: new Date(Date.now() + 4 * 60 * 60 * 1000),
        notes: 'FDG batch ready for QC review - delivery deadline approaching',
      },
    });
    approvalRequests.push(batchRequest1);

    if (batches.length > 1) {
      // Batch at step 2 (awaiting QP release)
      const batchRequest2 = await prisma.approvalRequest.create({
        data: {
          workflowId: batchReleaseWorkflow.id,
          entityType: 'BATCH_RELEASE',
          entityId: batches[1].id,
          requestedById: adminUser.id,
          currentStepOrder: 2,
          status: 'PENDING',
          priority: 'HIGH',
          notes: 'QC approved, awaiting Qualified Person release',
        },
      });
      approvalRequests.push(batchRequest2);

      await prisma.approvalAction.create({
        data: {
          approvalRequestId: batchRequest2.id,
          stepId: batchStep1.id,
          actionById: adminUser.id,
          action: 'APPROVED',
          comments: 'All QC tests passed. Radiochemical purity 98.5%, pH 7.2',
          actionAt: new Date(Date.now() - 1 * 60 * 60 * 1000),
        },
      });
    }
  }

  // Customer onboarding approval request
  if (customers.length > 0) {
    const customerRequest = await prisma.approvalRequest.create({
      data: {
        workflowId: customerOnboardingWorkflow.id,
        entityType: 'CUSTOMER',
        entityId: customers[0].id,
        requestedById: adminUser.id,
        currentStepOrder: 1,
        status: 'PENDING',
        priority: 'NORMAL',
        notes: 'New hospital registration - verify licensing documentation',
      },
    });
    approvalRequests.push(customerRequest);
  }

  // Product change approval request
  if (products.length > 0) {
    const productRequest = await prisma.approvalRequest.create({
      data: {
        workflowId: productChangeWorkflow.id,
        entityType: 'PRODUCT',
        entityId: products[0].id,
        requestedById: adminUser.id,
        currentStepOrder: 1,
        status: 'PENDING',
        priority: 'LOW',
        notes: 'Proposed shelf life extension based on stability data',
      },
    });
    approvalRequests.push(productRequest);
  }

  // Create one rejected request for history
  if (orders.length > 3) {
    const rejectedRequest = await prisma.approvalRequest.create({
      data: {
        workflowId: orderApprovalWorkflow.id,
        entityType: 'ORDER',
        entityId: orders[3].id,
        requestedById: adminUser.id,
        currentStepOrder: 1,
        status: 'REJECTED',
        priority: 'NORMAL',
        completedAt: new Date(Date.now() - 24 * 60 * 60 * 1000),
        notes: 'Order rejected - insufficient credit limit',
      },
    });

    await prisma.approvalAction.create({
      data: {
        approvalRequestId: rejectedRequest.id,
        stepId: orderStep1.id,
        actionById: adminUser.id,
        action: 'REJECTED',
        comments: 'Customer has exceeded credit limit. Please resolve outstanding invoices before resubmitting.',
        actionAt: new Date(Date.now() - 24 * 60 * 60 * 1000),
      },
    });
  }

  console.log(`Created ${approvalRequests.length} approval requests for Approval Inbox demo.`);

  // ============ Seed Announcements ============
  console.log('Creating demo announcements...');

  const announcementNow = new Date();
  const announcementTomorrow = new Date(announcementNow.getTime() + 24 * 60 * 60 * 1000);
  
  // Active INFO announcement for all users
  const welcomeAnnouncement = await prisma.announcement.upsert({
    where: { id: 'announcement-welcome' },
    update: {},
    create: {
      id: 'announcement-welcome',
      title: 'Welcome to the New RadioPharma Portal',
      body: 'We are excited to announce the launch of our updated portal with improved features including real-time order tracking, enhanced reporting capabilities, and a new mobile-friendly interface. Please explore the new features and let us know if you have any feedback.',
      severity: 'INFO',
      publishMode: 'IMMEDIATE',
      status: 'ACTIVE',
      startAt: announcementNow,
      isPublished: true,
      createdById: adminUser.id,
    },
  });

  // Scheduled WARNING announcement for tomorrow
  const maintenanceAnnouncement = await prisma.announcement.upsert({
    where: { id: 'announcement-maintenance' },
    update: {},
    create: {
      id: 'announcement-maintenance',
      title: 'Scheduled System Maintenance',
      body: 'Please be advised that we will be performing scheduled maintenance on the system. During this time, some features may be temporarily unavailable. We apologize for any inconvenience.',
      severity: 'WARNING',
      publishMode: 'SCHEDULED',
      status: 'SCHEDULED',
      startAt: announcementTomorrow,
      endAt: new Date(announcementTomorrow.getTime() + 4 * 60 * 60 * 1000),
      isPublished: true,
      createdById: adminUser.id,
    },
  });

  // CRITICAL announcement for QC Analysts
  const qcAnnouncement = await prisma.announcement.upsert({
    where: { id: 'announcement-qc-safety' },
    update: {},
    create: {
      id: 'announcement-qc-safety',
      title: 'Important: Updated QC Safety Protocols',
      body: 'All QC Analysts must review and acknowledge the updated safety protocols for handling radioactive materials. The new guidelines are effective immediately. Please contact your supervisor if you have any questions.',
      severity: 'CRITICAL',
      publishMode: 'IMMEDIATE',
      status: 'ACTIVE',
      startAt: announcementNow,
      isPublished: true,
      createdById: adminUser.id,
    },
  });

  // Add audience targeting for QC announcement
  await prisma.announcementAudience.upsert({
    where: { id: 'audience-qc-safety' },
    update: {},
    create: {
      id: 'audience-qc-safety',
      announcementId: qcAnnouncement.id,
      audienceType: 'ROLE',
      roleCode: 'QC Analyst',
    },
  });

  console.log('Created 3 demo announcements.');

  // Create demo support tickets
  const customerUserForTicket = await prisma.user.findFirst({
    where: { email: 'customer@radiopharma.com' },
  });

  if (customerUserForTicket) {
    const ticket1 = await prisma.supportTicket.upsert({
      where: { id: 'ticket-demo-1' },
      update: {},
      create: {
        id: 'ticket-demo-1',
        ticketNo: 'TKT-000001',
        subject: 'Question about order delivery time',
        description: 'I placed an order yesterday and wanted to know the expected delivery time. The order number is ORD-000001.',
        category: 'ORDER',
        priority: 'MEDIUM',
        status: 'NEW',
        requesterUserId: customerUserForTicket.id,
        requesterRole: 'CUSTOMER',
      },
    });

    await prisma.ticketMessage.upsert({
      where: { id: 'msg-demo-1' },
      update: {},
      create: {
        id: 'msg-demo-1',
        ticketId: ticket1.id,
        createdByUserId: customerUserForTicket.id,
        messageType: 'PUBLIC_REPLY',
        body: 'I placed an order yesterday and wanted to know the expected delivery time. The order number is ORD-000001.',
        visibility: 'PUBLIC',
      },
    });

    await prisma.ticketEvent.upsert({
      where: { id: 'event-demo-1' },
      update: {},
      create: {
        id: 'event-demo-1',
        ticketId: ticket1.id,
        actorUserId: customerUserForTicket.id,
        eventType: 'CREATED',
      },
    });

    const ticket2 = await prisma.supportTicket.upsert({
      where: { id: 'ticket-demo-2' },
      update: {},
      create: {
        id: 'ticket-demo-2',
        ticketNo: 'TKT-000002',
        subject: 'Invoice discrepancy',
        description: 'The invoice amount does not match what was quoted. Please review.',
        category: 'INVOICE',
        priority: 'HIGH',
        status: 'IN_PROGRESS',
        requesterUserId: customerUserForTicket.id,
        requesterRole: 'CUSTOMER',
        assignedToUserId: adminUser.id,
        assignedTeam: 'FINANCE',
      },
    });

    await prisma.ticketMessage.upsert({
      where: { id: 'msg-demo-2' },
      update: {},
      create: {
        id: 'msg-demo-2',
        ticketId: ticket2.id,
        createdByUserId: customerUserForTicket.id,
        messageType: 'PUBLIC_REPLY',
        body: 'The invoice amount does not match what was quoted. Please review.',
        visibility: 'PUBLIC',
      },
    });

    await prisma.ticketMessage.upsert({
      where: { id: 'msg-demo-3' },
      update: {},
      create: {
        id: 'msg-demo-3',
        ticketId: ticket2.id,
        createdByUserId: adminUser.id,
        messageType: 'PUBLIC_REPLY',
        body: 'Thank you for bringing this to our attention. We are reviewing the invoice and will get back to you shortly.',
        visibility: 'PUBLIC',
      },
    });

    await prisma.ticketEvent.upsert({
      where: { id: 'event-demo-2' },
      update: {},
      create: {
        id: 'event-demo-2',
        ticketId: ticket2.id,
        actorUserId: customerUserForTicket.id,
        eventType: 'CREATED',
      },
    });

    await prisma.ticketEvent.upsert({
      where: { id: 'event-demo-3' },
      update: {},
      create: {
        id: 'event-demo-3',
        ticketId: ticket2.id,
        actorUserId: adminUser.id,
        eventType: 'STATUS_CHANGED',
        oldValueJson: { status: 'NEW' },
        newValueJson: { status: 'IN_PROGRESS' },
      },
    });

    await prisma.ticketTask.upsert({
      where: { id: 'task-demo-1' },
      update: {},
      create: {
        id: 'task-demo-1',
        ticketId: ticket2.id,
        title: 'Review invoice calculation',
        description: 'Check the original quote and compare with generated invoice',
        status: 'IN_PROGRESS',
        priority: 'HIGH',
        assignedToUserId: adminUser.id,
      },
    });

    console.log('Created 2 demo support tickets with messages, events, and tasks.');
  }

  // Seed QC Test Definitions and Product QC Templates
  console.log('Seeding QC Test Definitions and Product QC Templates...');
  
  // Define standard QC test definitions based on existing QCTemplate data
  const qcTestDefinitions = [
    { code: 'VIS-INSP', nameEn: 'Visual Inspection', nameAr: 'الفحص البصري', resultType: 'PASS_FAIL', methodEn: 'Visual examination', methodAr: 'الفحص البصري' },
    { code: 'PH-TEST', nameEn: 'pH', nameAr: 'درجة الحموضة', resultType: 'NUMERIC', unit: '', methodEn: 'pH meter', methodAr: 'مقياس الحموضة' },
    { code: 'RAD-PURITY', nameEn: 'Radiochemical Purity', nameAr: 'النقاء الإشعاعي الكيميائي', resultType: 'NUMERIC', unit: '%', methodEn: 'HPLC/TLC', methodAr: 'كروماتوغرافيا' },
    { code: 'RAD-IDENTITY', nameEn: 'Radionuclidic Identity', nameAr: 'الهوية النووية', resultType: 'NUMERIC', unit: 'min', methodEn: 'Half-life measurement', methodAr: 'قياس فترة نصف العمر' },
    { code: 'MO99-BREAK', nameEn: 'Mo-99 Breakthrough', nameAr: 'اختراق الموليبدينوم-99', resultType: 'NUMERIC', unit: 'µCi/mCi', methodEn: 'Dose calibrator', methodAr: 'معاير الجرعة' },
    { code: 'ACT-ASSAY', nameEn: 'Activity Assay', nameAr: 'فحص النشاط الإشعاعي', resultType: 'NUMERIC', unit: '%', methodEn: 'Dose calibrator', methodAr: 'معاير الجرعة' },
    { code: 'PEPTIDE-CONT', nameEn: 'Peptide Content', nameAr: 'محتوى الببتيد', resultType: 'NUMERIC', unit: 'µg', methodEn: 'HPLC', methodAr: 'كروماتوغرافيا سائلة عالية الأداء' },
    { code: 'ENDOTOXIN', nameEn: 'Endotoxin', nameAr: 'الذيفان الداخلي', resultType: 'NUMERIC', unit: 'EU/mL', methodEn: 'LAL test', methodAr: 'اختبار LAL' },
    { code: 'STERILITY', nameEn: 'Sterility', nameAr: 'العقامة', resultType: 'PASS_FAIL', methodEn: 'Membrane filtration', methodAr: 'الترشيح الغشائي' },
  ];

  const createdTestDefs: { [key: string]: any } = {};
  for (const def of qcTestDefinitions) {
    const testDef = await prisma.qcTestDefinition.upsert({
      where: { code: def.code },
      update: {},
      create: {
        code: def.code,
        nameEn: def.nameEn,
        nameAr: def.nameAr,
        resultType: def.resultType as any,
        unit: def.unit,
        methodEn: def.methodEn,
        methodAr: def.methodAr,
        isActive: true,
      },
    });
    createdTestDefs[def.code] = testDef;
  }
  console.log(`Created ${Object.keys(createdTestDefs).length} QC test definitions.`);

  // Create ProductQcTemplates from existing QCTemplate data for each product
  const allProducts = await prisma.product.findMany({
    include: {
      qcTemplates: { orderBy: { sortOrder: 'asc' } },
    },
  });

  // Map old test names to new test definition codes
  const testNameToCode: { [key: string]: string } = {
    'Visual Inspection': 'VIS-INSP',
    'pH': 'PH-TEST',
    'Radiochemical Purity': 'RAD-PURITY',
    'Radionuclidic Identity': 'RAD-IDENTITY',
    'Mo-99 Breakthrough': 'MO99-BREAK',
    'Activity Assay': 'ACT-ASSAY',
    'Peptide Content': 'PEPTIDE-CONT',
    'Endotoxin': 'ENDOTOXIN',
    'Sterility': 'STERILITY',
  };

  let templatesCreated = 0;
  for (const product of allProducts) {
    if (product.qcTemplates.length === 0) continue;

    // Check if product already has a ProductQcTemplate
    const existingTemplate = await prisma.productQcTemplate.findFirst({
      where: { productId: product.id },
    });
    if (existingTemplate) continue;

    // Create new ProductQcTemplate
    const template = await prisma.productQcTemplate.create({
      data: {
        productId: product.id,
        version: 1,
        status: 'ACTIVE',
        effectiveFrom: new Date(),
        notes: `Migrated from legacy QC templates for ${product.name}`,
      },
    });

    // Create template lines from old QCTemplate entries
    for (let i = 0; i < product.qcTemplates.length; i++) {
      const oldTemplate = product.qcTemplates[i];
      const testCode = testNameToCode[oldTemplate.testName];
      const testDef = testCode ? createdTestDefs[testCode] : null;

      if (!testDef) {
        console.log(`  Skipping unknown test: ${oldTemplate.testName}`);
        continue;
      }

      // Create spec rule if numeric criteria exist
      let specRuleId: string | null = null;
      if (oldTemplate.minValue !== null || oldTemplate.maxValue !== null) {
        const specRule = await prisma.qcSpecRule.create({
          data: {
            ruleType: oldTemplate.minValue !== null && oldTemplate.maxValue !== null ? 'RANGE' : 
                      oldTemplate.minValue !== null ? 'MIN' : 'MAX',
            minValue: oldTemplate.minValue,
            maxValue: oldTemplate.maxValue,
            unit: oldTemplate.unit || testDef.unit,
            textCriteriaEn: oldTemplate.acceptanceCriteria,
          },
        });
        specRuleId = specRule.id;
      }

      await prisma.productQcTemplateLine.create({
        data: {
          templateId: template.id,
          testDefinitionId: testDef.id,
          displayOrder: i,
          isRequired: oldTemplate.isRequired,
          specRuleId,
          criteriaTextOverrideEn: oldTemplate.acceptanceCriteria,
          allowManualPassFail: false,
          attachmentRequired: false,
        },
      });
    }

    templatesCreated++;
    console.log(`  Created ProductQcTemplate for ${product.name} with ${product.qcTemplates.length} tests.`);
  }
  console.log(`Created ${templatesCreated} ProductQcTemplates.`);

  console.log('Seed completed successfully!');
  console.log('Admin user: admin@radiopharma.com / admin123');
  console.log(`Created: ${orders.length} orders, ${batches.length} batches, ${releasedBatches.length} releases, ${shippedOrders.length} shipments`);
}

main()
  .catch((e) => {
    console.error('Seed error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
