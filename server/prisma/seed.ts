import { PrismaClient, ProductType, ProductionMethod, OrderStatus, WorkflowEntityType } from '@prisma/client';
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

  // Create QC results for batches that have passed QC (10+ results)
  const qcBatches = batches.filter((_, i) => i < 10);
  for (let i = 0; i < qcBatches.length; i++) {
    const batch = qcBatches[i];
    const product = products.find(p => p.id === batch.productId)!;
    const templates = await prisma.qCTemplate.findMany({ where: { productId: product.id } });
    
    for (const template of templates) {
      const passed = Math.random() > 0.05; // 95% pass rate
      let numericResult = null;
      if (template.minValue !== null && template.maxValue !== null) {
        const range = template.maxValue - template.minValue;
        numericResult = template.minValue + (range * 0.3) + (Math.random() * range * 0.4);
      }
      
      await prisma.qCResult.create({
        data: {
          batchId: batch.id,
          templateId: template.id,
          numericResult,
          textResult: passed ? 'Pass' : 'Fail',
          passed,
          status: 'PASSED',
          testedAt: new Date(),
          testedById: adminUser.id,
        },
      });
    }
  }

  // Create batch releases for released batches (8 releases)
  const releasedBatches = batches.filter(b => b.status === 'RELEASED');
  for (let i = 0; i < releasedBatches.length; i++) {
    const batch = releasedBatches[i];
    
    await prisma.batchRelease.create({
      data: {
        batchId: batch.id,
        releasedById: adminUser.id,
        releaseType: i % 3 === 0 ? 'RAPID' : 'FULL',
        electronicSignature: `QP-${adminUser.email}-${Date.now()}`,
        signatureTimestamp: new Date(),
        reason: `Batch ${batch.batchNumber} released for distribution`,
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
        const basePrice = products[j].defaultPrice || 500;
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
      const unitPrice = product?.defaultPrice || 500;
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
          status: i === 0 ? 'PAID' : (i === 1 ? 'SENT' : 'DRAFT'),
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
