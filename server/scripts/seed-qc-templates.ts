import { PrismaClient, QcTestResultType, QcSpecRuleType, QcTemplateStatus } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding QC Test Definitions and Product QC Templates...');

  const qcTestDefinitions = [
    { code: 'VIS-INSP', nameEn: 'Visual Inspection', nameAr: 'الفحص البصري', resultType: QcTestResultType.PASS_FAIL, methodEn: 'Visual examination', methodAr: 'الفحص البصري', unit: null },
    { code: 'PH-TEST', nameEn: 'pH', nameAr: 'درجة الحموضة', resultType: QcTestResultType.NUMERIC, unit: '', methodEn: 'pH meter', methodAr: 'مقياس الحموضة' },
    { code: 'RAD-PURITY', nameEn: 'Radiochemical Purity', nameAr: 'النقاء الإشعاعي الكيميائي', resultType: QcTestResultType.NUMERIC, unit: '%', methodEn: 'HPLC/TLC', methodAr: 'كروماتوغرافيا' },
    { code: 'RAD-IDENTITY', nameEn: 'Radionuclidic Identity', nameAr: 'الهوية النووية', resultType: QcTestResultType.NUMERIC, unit: 'min', methodEn: 'Half-life measurement', methodAr: 'قياس فترة نصف العمر' },
    { code: 'MO99-BREAK', nameEn: 'Mo-99 Breakthrough', nameAr: 'اختراق الموليبدينوم-99', resultType: QcTestResultType.NUMERIC, unit: 'µCi/mCi', methodEn: 'Dose calibrator', methodAr: 'معاير الجرعة' },
    { code: 'ACT-ASSAY', nameEn: 'Activity Assay', nameAr: 'فحص النشاط الإشعاعي', resultType: QcTestResultType.NUMERIC, unit: '%', methodEn: 'Dose calibrator', methodAr: 'معاير الجرعة' },
    { code: 'PEPTIDE-CONT', nameEn: 'Peptide Content', nameAr: 'محتوى الببتيد', resultType: QcTestResultType.NUMERIC, unit: 'µg', methodEn: 'HPLC', methodAr: 'كروماتوغرافيا سائلة عالية الأداء' },
    { code: 'ENDOTOXIN', nameEn: 'Endotoxin', nameAr: 'الذيفان الداخلي', resultType: QcTestResultType.NUMERIC, unit: 'EU/mL', methodEn: 'LAL test', methodAr: 'اختبار LAL' },
    { code: 'STERILITY', nameEn: 'Sterility', nameAr: 'العقامة', resultType: QcTestResultType.PASS_FAIL, methodEn: 'Membrane filtration', methodAr: 'الترشيح الغشائي', unit: null },
    { code: 'FILTER-INTG', nameEn: 'Filter Integrity', nameAr: 'سلامة المرشح', resultType: QcTestResultType.PASS_FAIL, methodEn: 'Bubble point test', methodAr: 'اختبار نقطة الفقاعة', unit: null },
  ];

  const createdTestDefs: { [key: string]: any } = {};
  for (const def of qcTestDefinitions) {
    const testDef = await prisma.qcTestDefinition.upsert({
      where: { code: def.code },
      update: {
        nameEn: def.nameEn,
        nameAr: def.nameAr,
        resultType: def.resultType,
        unit: def.unit,
        methodEn: def.methodEn,
        methodAr: def.methodAr,
      },
      create: {
        code: def.code,
        nameEn: def.nameEn,
        nameAr: def.nameAr,
        resultType: def.resultType,
        unit: def.unit,
        methodEn: def.methodEn,
        methodAr: def.methodAr,
        isActive: true,
      },
    });
    createdTestDefs[def.code] = testDef;
  }
  console.log(`Created/Updated ${Object.keys(createdTestDefs).length} QC test definitions.`);

  const allProducts = await prisma.product.findMany({
    include: {
      qcTemplates: { orderBy: { sortOrder: 'asc' } },
    },
  });

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
    'Filter Integrity': 'FILTER-INTG',
  };

  let templatesCreated = 0;
  for (const product of allProducts) {
    if (product.qcTemplates.length === 0) {
      console.log(`  Skipping ${product.name} - no QC templates found.`);
      continue;
    }

    const existingTemplate = await prisma.productQcTemplate.findFirst({
      where: { productId: product.id, status: QcTemplateStatus.ACTIVE },
    });
    
    if (existingTemplate) {
      console.log(`  Skipping ${product.name} - already has an active ProductQcTemplate.`);
      continue;
    }

    const maxVersion = await prisma.productQcTemplate.aggregate({
      where: { productId: product.id },
      _max: { version: true },
    });
    const nextVersion = (maxVersion._max.version || 0) + 1;

    await prisma.productQcTemplate.updateMany({
      where: { productId: product.id, status: QcTemplateStatus.ACTIVE },
      data: { status: QcTemplateStatus.RETIRED, effectiveTo: new Date() },
    });

    const template = await prisma.productQcTemplate.create({
      data: {
        productId: product.id,
        version: nextVersion,
        status: QcTemplateStatus.ACTIVE,
        effectiveFrom: new Date(),
        notes: `Migrated from legacy QC templates for ${product.name}`,
      },
    });

    let linesCreated = 0;
    for (let i = 0; i < product.qcTemplates.length; i++) {
      const oldTemplate = product.qcTemplates[i];
      const testCode = testNameToCode[oldTemplate.testName];
      const testDef = testCode ? createdTestDefs[testCode] : null;

      if (!testDef) {
        console.log(`    Skipping unknown test: ${oldTemplate.testName}`);
        continue;
      }

      const existingLine = await prisma.productQcTemplateLine.findUnique({
        where: {
          templateId_testDefinitionId: {
            templateId: template.id,
            testDefinitionId: testDef.id,
          },
        },
      });
      if (existingLine) continue;

      let specRuleId: string | null = null;
      if (oldTemplate.minValue !== null || oldTemplate.maxValue !== null) {
        let ruleType: QcSpecRuleType;
        if (oldTemplate.minValue !== null && oldTemplate.maxValue !== null) {
          ruleType = QcSpecRuleType.RANGE;
        } else if (oldTemplate.minValue !== null) {
          ruleType = QcSpecRuleType.MIN;
        } else {
          ruleType = QcSpecRuleType.MAX;
        }

        const specRule = await prisma.qcSpecRule.create({
          data: {
            ruleType,
            minValue: oldTemplate.minValue,
            maxValue: oldTemplate.maxValue,
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
      linesCreated++;
    }

    templatesCreated++;
    console.log(`  Created ProductQcTemplate v${nextVersion} for ${product.name} with ${linesCreated} tests.`);
  }

  console.log(`\nSummary:`);
  console.log(`  - QC Test Definitions: ${Object.keys(createdTestDefs).length}`);
  console.log(`  - Product QC Templates created: ${templatesCreated}`);
  console.log('Done!');
}

main()
  .catch((e) => {
    console.error('Error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
