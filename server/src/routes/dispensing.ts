import { Router, Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { authenticateToken } from '../middleware/auth.js';
import { createAuditLog } from '../middleware/audit.js';

const router = Router();
const prisma = new PrismaClient();

function generateDoseNumber(): string {
  const date = new Date();
  const dateStr = date.toISOString().slice(0, 10).replace(/-/g, '');
  const random = Math.random().toString(36).substring(2, 8).toUpperCase();
  return `DOSE-${dateStr}-${random}`;
}

router.get('/', authenticateToken, async (req: Request, res: Response): Promise<void> => {
  try {
    const { batchId, orderId, status, startDate, endDate } = req.query;
    
    const where: any = {};
    if (batchId) where.batchId = batchId;
    if (orderId) where.orderId = orderId;
    if (status) where.status = status;
    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) where.createdAt.gte = new Date(startDate as string);
      if (endDate) where.createdAt.lte = new Date(endDate as string);
    }

    const doseUnits = await prisma.doseUnit.findMany({
      where,
      include: {
        batch: { include: { product: true } },
        order: { include: { customer: true } },
        dispensedBy: { select: { id: true, firstName: true, lastName: true } },
        shipment: true,
      },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });

    res.json(doseUnits);
  } catch (error) {
    console.error('List dose units error:', error);
    res.status(500).json({ error: 'Failed to fetch dose units' });
  }
});

router.get('/batch/:batchId', authenticateToken, async (req: Request, res: Response): Promise<void> => {
  try {
    const { batchId } = req.params;

    const batch = await prisma.batch.findUnique({
      where: { id: batchId },
      include: {
        product: true,
        batchReleases: true,
        doseUnits: {
          include: {
            order: { include: { customer: true } },
            dispensedBy: { select: { id: true, firstName: true, lastName: true } },
          },
        },
        orders: { include: { customer: true } },
      },
    });

    if (!batch) {
      res.status(404).json({ error: 'Batch not found' });
      return;
    }

    const isReleased = batch.status === 'RELEASED' && batch.batchReleases.length > 0;
    const totalDispensed = batch.doseUnits.reduce((sum, d) => sum + (d.dispensedActivity || 0), 0);
    const remainingActivity = (batch.actualActivity || batch.targetActivity) - totalDispensed;

    res.json({
      batch,
      isReleased,
      totalDispensed,
      remainingActivity,
      doseUnits: batch.doseUnits,
      pendingOrders: batch.orders.filter(o => 
        !batch.doseUnits.some(d => d.orderId === o.id)
      ),
    });
  } catch (error) {
    console.error('Get batch dispensing info error:', error);
    res.status(500).json({ error: 'Failed to fetch batch dispensing info' });
  }
});

router.post('/', authenticateToken, async (req: Request, res: Response): Promise<void> => {
  try {
    const {
      batchId,
      orderId,
      patientReference,
      requestedActivity,
      calibrationTime,
      volume,
      containerType,
      notes,
    } = req.body;

    const batch = await prisma.batch.findUnique({
      where: { id: batchId },
      include: { batchReleases: true, product: true },
    });

    if (!batch) {
      res.status(404).json({ error: 'Batch not found' });
      return;
    }

    if (batch.status !== 'RELEASED' || batch.batchReleases.length === 0) {
      res.status(400).json({ error: 'Batch must be released before dispensing' });
      return;
    }

    const existingDoses = await prisma.doseUnit.findMany({
      where: { batchId },
    });
    const totalDispensed = existingDoses.reduce((sum, d) => sum + (d.dispensedActivity || d.requestedActivity), 0);
    const availableActivity = (batch.actualActivity || batch.targetActivity) - totalDispensed;

    if (requestedActivity > availableActivity) {
      res.status(400).json({ 
        error: `Insufficient activity. Available: ${availableActivity.toFixed(2)} ${batch.activityUnit}` 
      });
      return;
    }

    const doseUnit = await prisma.doseUnit.create({
      data: {
        doseNumber: generateDoseNumber(),
        batchId,
        orderId: orderId || null,
        patientReference: patientReference || null,
        requestedActivity,
        calibrationTime: calibrationTime ? new Date(calibrationTime) : batch.calibrationTime,
        activityUnit: batch.activityUnit,
        volume: volume || null,
        containerType: containerType || batch.product.packagingType,
        notes,
        status: 'CREATED',
      },
      include: {
        batch: { include: { product: true } },
        order: { include: { customer: true } },
      },
    });

    await createAuditLog(req.user?.userId, 'CREATE', 'DoseUnit', doseUnit.id, null, doseUnit, req);

    res.status(201).json(doseUnit);
  } catch (error) {
    console.error('Create dose unit error:', error);
    res.status(500).json({ error: 'Failed to create dose unit' });
  }
});

router.put('/:id/dispense', authenticateToken, async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { dispensedActivity, volume } = req.body;

    const doseUnit = await prisma.doseUnit.findUnique({
      where: { id },
      include: { batch: true },
    });

    if (!doseUnit) {
      res.status(404).json({ error: 'Dose unit not found' });
      return;
    }

    if (doseUnit.status !== 'CREATED' && doseUnit.status !== 'LABELED') {
      res.status(400).json({ error: 'Dose unit cannot be dispensed in current status' });
      return;
    }

    const updated = await prisma.doseUnit.update({
      where: { id },
      data: {
        dispensedActivity: dispensedActivity || doseUnit.requestedActivity,
        volume: volume || doseUnit.volume,
        dispensedById: req.user?.userId,
        dispensedAt: new Date(),
        status: 'DISPENSED',
      },
      include: {
        batch: { include: { product: true } },
        order: { include: { customer: true } },
        dispensedBy: { select: { id: true, firstName: true, lastName: true } },
      },
    });

    await createAuditLog(req.user?.userId, 'DISPENSE', 'DoseUnit', id, 
      { status: doseUnit.status }, { status: 'DISPENSED', dispensedActivity }, req);

    res.json(updated);
  } catch (error) {
    console.error('Dispense dose unit error:', error);
    res.status(500).json({ error: 'Failed to dispense dose unit' });
  }
});

router.put('/:id/label', authenticateToken, async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    const doseUnit = await prisma.doseUnit.findUnique({ where: { id } });

    if (!doseUnit) {
      res.status(404).json({ error: 'Dose unit not found' });
      return;
    }

    const updated = await prisma.doseUnit.update({
      where: { id },
      data: {
        labelPrinted: true,
        labelPrintedAt: new Date(),
        status: doseUnit.status === 'CREATED' ? 'LABELED' : doseUnit.status,
      },
      include: {
        batch: { include: { product: true } },
        order: { include: { customer: true } },
      },
    });

    await createAuditLog(req.user?.userId, 'LABEL_PRINT', 'DoseUnit', id, null, { labelPrinted: true }, req);

    res.json(updated);
  } catch (error) {
    console.error('Label dose unit error:', error);
    res.status(500).json({ error: 'Failed to update label status' });
  }
});

router.put('/:id/waste', authenticateToken, async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { reason } = req.body;

    const doseUnit = await prisma.doseUnit.findUnique({ where: { id } });

    if (!doseUnit) {
      res.status(404).json({ error: 'Dose unit not found' });
      return;
    }

    if (doseUnit.status === 'SHIPPED' || doseUnit.status === 'DELIVERED') {
      res.status(400).json({ error: 'Cannot waste shipped or delivered doses' });
      return;
    }

    const updated = await prisma.doseUnit.update({
      where: { id },
      data: {
        status: 'WASTED',
        notes: reason ? `${doseUnit.notes || ''}\nWasted: ${reason}`.trim() : doseUnit.notes,
      },
    });

    await createAuditLog(req.user?.userId, 'WASTE', 'DoseUnit', id, 
      { status: doseUnit.status }, { status: 'WASTED', reason }, req);

    res.json(updated);
  } catch (error) {
    console.error('Waste dose unit error:', error);
    res.status(500).json({ error: 'Failed to mark dose as wasted' });
  }
});

router.get('/:id', authenticateToken, async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    const doseUnit = await prisma.doseUnit.findUnique({
      where: { id },
      include: {
        batch: { include: { product: true, batchReleases: true } },
        order: { include: { customer: true } },
        dispensedBy: { select: { id: true, firstName: true, lastName: true } },
        shipment: true,
      },
    });

    if (!doseUnit) {
      res.status(404).json({ error: 'Dose unit not found' });
      return;
    }

    res.json(doseUnit);
  } catch (error) {
    console.error('Get dose unit error:', error);
    res.status(500).json({ error: 'Failed to fetch dose unit' });
  }
});

/**
 * @swagger
 * /dispensing/stats:
 *   get:
 *     summary: Get dispensing statistics
 *     tags: [Dispensing]
 *     responses:
 *       200:
 *         description: Dispensing statistics
 */
router.get('/stats', authenticateToken, async (req: Request, res: Response): Promise<void> => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const [releasedBatches, totalDoses, pending, dispensedToday, wasted, shipped] = await Promise.all([
      prisma.batch.count({ where: { status: 'RELEASED' } }),
      prisma.doseUnit.count(),
      prisma.doseUnit.count({ where: { status: { in: ['CREATED', 'LABELED'] } } }),
      prisma.doseUnit.count({ 
        where: { 
          status: 'DISPENSED',
          dispensedAt: { gte: today },
        } 
      }),
      prisma.doseUnit.count({ where: { status: 'WASTED' } }),
      prisma.doseUnit.count({ where: { status: 'SHIPPED' } }),
    ]);

    res.json({ releasedBatches, totalDoses, pending, dispensedToday, wasted, shipped });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch dispensing stats' });
  }
});

router.get('/:id/genealogy', authenticateToken, async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    
    const doseUnit = await prisma.doseUnit.findUnique({
      where: { id },
      include: {
        batch: {
          include: {
            product: true,
            batchReleases: { include: { releasedBy: { select: { id: true, firstName: true, lastName: true } } } },
            qcResults: { include: { testedBy: { select: { id: true, firstName: true, lastName: true } } } },
            materialLots: { include: { materialLot: true } },
          },
        },
        order: {
          include: {
            customer: true,
            reservation: { include: { window: true } },
          },
        },
        shipment: {
          include: {
            driver: true,
            proofOfDelivery: true,
            shipmentDoseUnits: true,
          },
        },
        dispensedBy: { select: { id: true, firstName: true, lastName: true } },
      },
    });

    if (!doseUnit) {
      res.status(404).json({ error: 'Dose unit not found' });
      return;
    }

    const genealogy = {
      doseUnit: {
        id: doseUnit.id,
        doseNumber: doseUnit.doseNumber,
        status: doseUnit.status,
        dispensedAt: doseUnit.dispensedAt,
        dispensedBy: doseUnit.dispensedBy,
        dispensedActivity: doseUnit.dispensedActivity,
        volume: doseUnit.volume,
        patientReference: doseUnit.patientReference,
        labelData: doseUnit.labelData,
        releaseInheritedFromBatch: doseUnit.releaseInheritedFromBatch,
      },
      batch: doseUnit.batch ? {
        id: doseUnit.batch.id,
        batchNumber: doseUnit.batch.batchNumber,
        status: doseUnit.batch.status,
        targetActivity: doseUnit.batch.targetActivity,
        actualActivity: doseUnit.batch.actualActivity,
        product: doseUnit.batch.product,
        releases: doseUnit.batch.batchReleases.map((r: any) => ({
          id: r.id,
          releaseType: r.releaseType,
          disposition: r.disposition,
          releasedBy: r.releasedBy,
          signatureTimestamp: r.signatureTimestamp,
          meaning: r.meaning,
        })),
        qcResults: doseUnit.batch.qcResults.map((qc: any) => ({
          id: qc.id,
          testName: qc.testName,
          result: qc.result,
          passed: qc.passed,
          testedAt: qc.testedAt,
          testedBy: qc.testedBy,
        })),
        materialLots: doseUnit.batch.materialLots.map((ml: any) => ({
          materialLot: ml.materialLot,
          quantityUsed: ml.quantityUsed,
        })),
      } : null,
      order: doseUnit.order ? {
        id: doseUnit.order.id,
        orderNumber: doseUnit.order.orderNumber,
        hospitalOrderReference: doseUnit.order.hospitalOrderReference,
        customer: doseUnit.order.customer,
        deliveryDate: doseUnit.order.deliveryDate,
        reservation: doseUnit.order.reservation,
      } : null,
      shipment: doseUnit.shipment ? {
        id: doseUnit.shipment.id,
        shipmentNumber: doseUnit.shipment.shipmentNumber,
        status: doseUnit.shipment.status,
        driver: doseUnit.shipment.driver,
        proofOfDelivery: doseUnit.shipment.proofOfDelivery,
      } : null,
      traceability: {
        doseUnitId: doseUnit.id,
        batchId: doseUnit.batchId,
        orderId: doseUnit.orderId,
        shipmentId: doseUnit.shipmentId,
        customerId: doseUnit.order?.customerId,
        productId: doseUnit.batch?.productId,
      },
    };

    res.json(genealogy);
  } catch (error) {
    console.error('Genealogy query error:', error);
    res.status(500).json({ error: 'Failed to fetch genealogy' });
  }
});

router.post('/:id/generate-label', authenticateToken, async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { format = 'ZPL' } = req.body;

    const doseUnit = await prisma.doseUnit.findUnique({
      where: { id },
      include: {
        batch: { include: { product: true } },
        order: { include: { customer: true } },
      },
    });

    if (!doseUnit) {
      res.status(404).json({ error: 'Dose unit not found' });
      return;
    }

    const labelData = {
      doseNumber: doseUnit.doseNumber,
      product: doseUnit.batch?.product?.name || 'Unknown',
      productCode: doseUnit.batch?.product?.code || 'N/A',
      batchNumber: doseUnit.batch?.batchNumber || 'N/A',
      activity: `${doseUnit.dispensedActivity || 0} mCi`,
      calibrationTime: doseUnit.calibrationTime ? new Date(doseUnit.calibrationTime).toISOString() : 'N/A',
      volume: doseUnit.volume ? `${doseUnit.volume} mL` : 'N/A',
      patientReference: doseUnit.patientReference || 'N/A',
      customer: doseUnit.order?.customer?.nameEn || 'N/A',
      expiryTime: doseUnit.batch?.product?.halfLifeMinutes 
        ? new Date(new Date(doseUnit.calibrationTime || Date.now()).getTime() + (doseUnit.batch.product.halfLifeMinutes * 6 * 60 * 1000)).toISOString()
        : 'N/A',
    };

    let labelOutput: string;
    if (format === 'ZPL') {
      labelOutput = `^XA
^FO50,50^A0N,30,30^FDRadioPharmaceutical Dose^FS
^FO50,100^A0N,25,25^FDDose: ${labelData.doseNumber}^FS
^FO50,130^A0N,25,25^FDProduct: ${labelData.product}^FS
^FO50,160^A0N,25,25^FDBatch: ${labelData.batchNumber}^FS
^FO50,190^A0N,25,25^FDActivity: ${labelData.activity}^FS
^FO50,220^A0N,25,25^FDCalibration: ${new Date(doseUnit.calibrationTime || Date.now()).toLocaleString()}^FS
^FO50,250^A0N,25,25^FDVolume: ${labelData.volume}^FS
^FO50,280^A0N,25,25^FDPatient Ref: ${labelData.patientReference}^FS
^FO50,310^A0N,25,25^FDFor: ${labelData.customer}^FS
^FO50,350^BCN,80,Y,N,N^FD${labelData.doseNumber}^FS
^XZ`;
    } else {
      labelOutput = JSON.stringify(labelData, null, 2);
    }

    await prisma.doseUnit.update({
      where: { id },
      data: { 
        status: 'LABELED',
        labelData: labelData as any,
      },
    });

    await createAuditLog(req.user?.userId, 'LABEL_GENERATED', 'DoseUnit', id, null, { format, labelData }, req);

    res.json({
      format,
      labelOutput,
      labelData,
      message: 'Label generated successfully',
    });
  } catch (error) {
    console.error('Label generation error:', error);
    res.status(500).json({ error: 'Failed to generate label' });
  }
});

export default router;
