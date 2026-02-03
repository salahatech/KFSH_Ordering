import { Router, Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { authenticateToken } from '../middleware/auth';

const router = Router();
const prisma = new PrismaClient();

router.use(authenticateToken);

router.get('/:batchRecordId/equipment', async (req: Request, res: Response) => {
  try {
    const usages = await (prisma as any).batchEquipmentUsage.findMany({
      where: { batchRecordId: req.params.batchRecordId },
      include: {
        equipment: true,
        operatedBy: { select: { id: true, firstName: true, lastName: true } }
      },
      orderBy: { startTime: 'asc' }
    });

    res.json(usages);
  } catch (error) {
    console.error('Error fetching equipment usages:', error);
    res.status(500).json({ error: 'Failed to fetch equipment usages' });
  }
});

router.post('/:batchRecordId/equipment', async (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId;
    const { batchRecordId } = req.params;
    const { equipmentId, batchRecordStepId, purpose, startTime, endTime, parameters, notes } = req.body;

    const batchRecord = await (prisma as any).batchRecord.findUnique({
      where: { id: batchRecordId }
    });
    if (!batchRecord) {
      return res.status(404).json({ error: 'Batch record not found' });
    }
    if (batchRecord.status !== 'IN_PROGRESS') {
      return res.status(400).json({ error: 'Batch record must be IN_PROGRESS to log equipment usage' });
    }

    const equipment = await prisma.equipment.findUnique({ where: { id: equipmentId } });
    if (!equipment) {
      return res.status(404).json({ error: 'Equipment not found' });
    }

    const usage = await (prisma as any).batchEquipmentUsage.create({
      data: {
        batchRecordId,
        batchRecordStepId,
        equipmentId,
        equipmentCode: equipment.code,
        equipmentName: equipment.name,
        purpose,
        startTime: startTime ? new Date(startTime) : new Date(),
        endTime: endTime ? new Date(endTime) : null,
        parameters,
        notes,
        operatedById: userId
      },
      include: {
        equipment: true,
        operatedBy: { select: { id: true, firstName: true, lastName: true } }
      }
    });

    await prisma.auditLog.create({
      data: {
        userId,
        action: 'CREATE',
        entityType: 'BatchEquipmentUsage',
        entityId: usage.id,
        newValues: { equipmentId, batchRecordId, purpose }
      }
    });

    res.status(201).json(usage);
  } catch (error) {
    console.error('Error logging equipment usage:', error);
    res.status(500).json({ error: 'Failed to log equipment usage' });
  }
});

router.patch('/:batchRecordId/equipment/:usageId', async (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId;
    const { batchRecordId, usageId } = req.params;
    const updates = req.body;

    const usage = await (prisma as any).batchEquipmentUsage.findFirst({
      where: { id: usageId, batchRecordId }
    });

    if (!usage) {
      return res.status(404).json({ error: 'Equipment usage not found' });
    }

    const batchRecord = await (prisma as any).batchRecord.findUnique({ where: { id: batchRecordId } });
    if (batchRecord.status !== 'IN_PROGRESS') {
      return res.status(400).json({ error: 'Cannot modify equipment usage on a batch record not IN_PROGRESS' });
    }

    if (updates.endTime) {
      updates.endTime = new Date(updates.endTime);
    }

    const updated = await (prisma as any).batchEquipmentUsage.update({
      where: { id: usageId },
      data: updates,
      include: {
        equipment: true,
        operatedBy: { select: { id: true, firstName: true, lastName: true } }
      }
    });

    await prisma.auditLog.create({
      data: {
        userId,
        action: 'UPDATE',
        entityType: 'BatchEquipmentUsage',
        entityId: usageId,
        oldValues: usage,
        newValues: updates
      }
    });

    res.json(updated);
  } catch (error) {
    console.error('Error updating equipment usage:', error);
    res.status(500).json({ error: 'Failed to update equipment usage' });
  }
});

router.post('/:batchRecordId/equipment/:usageId/end', async (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId;
    const { batchRecordId, usageId } = req.params;
    const { notes } = req.body;

    const usage = await (prisma as any).batchEquipmentUsage.findFirst({
      where: { id: usageId, batchRecordId }
    });

    if (!usage) {
      return res.status(404).json({ error: 'Equipment usage not found' });
    }
    if (usage.endTime) {
      return res.status(400).json({ error: 'Equipment usage already ended' });
    }

    const updated = await (prisma as any).batchEquipmentUsage.update({
      where: { id: usageId },
      data: {
        endTime: new Date(),
        notes: notes || usage.notes
      },
      include: {
        equipment: true,
        operatedBy: { select: { id: true, firstName: true, lastName: true } }
      }
    });

    await prisma.auditLog.create({
      data: {
        userId,
        action: 'UPDATE',
        entityType: 'BatchEquipmentUsage',
        entityId: usageId,
        oldValues: { endTime: null },
        newValues: { endTime: updated.endTime }
      }
    });

    res.json(updated);
  } catch (error) {
    console.error('Error ending equipment usage:', error);
    res.status(500).json({ error: 'Failed to end equipment usage' });
  }
});

router.get('/available', async (req: Request, res: Response) => {
  try {
    const equipment = await prisma.equipment.findMany({
      where: { isAvailable: true },
      orderBy: { name: 'asc' }
    });

    res.json(equipment);
  } catch (error) {
    console.error('Error fetching available equipment:', error);
    res.status(500).json({ error: 'Failed to fetch available equipment' });
  }
});

export default router;
