import { Router, Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { authenticateToken } from '../middleware/auth.js';
import { createAuditLog } from '../middleware/audit.js';

const router = Router();
const prisma = new PrismaClient();

function generateContractNumber(): string {
  const date = new Date();
  const year = date.getFullYear();
  const random = Math.random().toString(36).substring(2, 8).toUpperCase();
  return `CON-${year}-${random}`;
}

router.get('/', authenticateToken, async (req: Request, res: Response): Promise<void> => {
  try {
    const { customerId, status, includeExpired } = req.query;

    const where: any = {};
    if (customerId) where.customerId = customerId;
    if (status) where.status = status;
    if (includeExpired !== 'true') {
      where.OR = [
        { status: 'ACTIVE' },
        { status: 'DRAFT' },
      ];
    }

    const contracts = await prisma.contract.findMany({
      where,
      include: {
        customer: true,
        priceItems: { include: { product: true } },
        _count: { select: { invoices: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    res.json(contracts);
  } catch (error) {
    console.error('List contracts error:', error);
    res.status(500).json({ error: 'Failed to fetch contracts' });
  }
});

router.post('/', authenticateToken, async (req: Request, res: Response): Promise<void> => {
  try {
    const {
      customerId,
      name,
      startDate,
      endDate,
      paymentTermsDays,
      creditLimit,
      discountPercent,
      notes,
      priceItems,
    } = req.body;

    const contract = await prisma.contract.create({
      data: {
        contractNumber: generateContractNumber(),
        customerId,
        name,
        startDate: new Date(startDate),
        endDate: new Date(endDate),
        paymentTermsDays: paymentTermsDays || 30,
        creditLimit,
        discountPercent: discountPercent || 0,
        status: 'DRAFT',
        notes,
        priceItems: priceItems ? {
          create: priceItems.map((item: any) => ({
            productId: item.productId,
            unitPrice: item.unitPrice,
            priceUnit: item.priceUnit || 'per mCi',
            minimumQuantity: item.minimumQuantity,
            discountPercent: item.discountPercent || 0,
            isActive: true,
          })),
        } : undefined,
      },
      include: {
        customer: true,
        priceItems: { include: { product: true } },
      },
    });

    await createAuditLog(req.user?.userId, 'CREATE', 'Contract', contract.id, null, contract, req);

    res.status(201).json(contract);
  } catch (error) {
    console.error('Create contract error:', error);
    res.status(500).json({ error: 'Failed to create contract' });
  }
});

router.put('/:id', authenticateToken, async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const {
      name,
      startDate,
      endDate,
      paymentTermsDays,
      creditLimit,
      discountPercent,
      notes,
    } = req.body;

    const contract = await prisma.contract.update({
      where: { id },
      data: {
        name,
        startDate: startDate ? new Date(startDate) : undefined,
        endDate: endDate ? new Date(endDate) : undefined,
        paymentTermsDays,
        creditLimit,
        discountPercent,
        notes,
      },
      include: {
        customer: true,
        priceItems: { include: { product: true } },
      },
    });

    await createAuditLog(req.user?.userId, 'UPDATE', 'Contract', id, null, req.body, req);

    res.json(contract);
  } catch (error) {
    console.error('Update contract error:', error);
    res.status(500).json({ error: 'Failed to update contract' });
  }
});

router.put('/:id/activate', authenticateToken, async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    const contract = await prisma.contract.findUnique({ where: { id } });

    if (!contract) {
      res.status(404).json({ error: 'Contract not found' });
      return;
    }

    if (contract.status !== 'DRAFT') {
      res.status(400).json({ error: 'Only draft contracts can be activated' });
      return;
    }

    const updated = await prisma.contract.update({
      where: { id },
      data: { status: 'ACTIVE' },
      include: { customer: true, priceItems: { include: { product: true } } },
    });

    await createAuditLog(req.user?.userId, 'ACTIVATE', 'Contract', id, 
      { status: 'DRAFT' }, { status: 'ACTIVE' }, req);

    res.json(updated);
  } catch (error) {
    console.error('Activate contract error:', error);
    res.status(500).json({ error: 'Failed to activate contract' });
  }
});

router.put('/:id/terminate', authenticateToken, async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { reason } = req.body;

    const contract = await prisma.contract.findUnique({ where: { id } });

    if (!contract) {
      res.status(404).json({ error: 'Contract not found' });
      return;
    }

    const updated = await prisma.contract.update({
      where: { id },
      data: { 
        status: 'TERMINATED',
        notes: reason ? `${contract.notes || ''}\nTerminated: ${reason}`.trim() : contract.notes,
      },
    });

    await createAuditLog(req.user?.userId, 'TERMINATE', 'Contract', id, 
      { status: contract.status }, { status: 'TERMINATED', reason }, req);

    res.json(updated);
  } catch (error) {
    console.error('Terminate contract error:', error);
    res.status(500).json({ error: 'Failed to terminate contract' });
  }
});

router.post('/:id/price-items', authenticateToken, async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { productId, unitPrice, priceUnit, minimumQuantity, discountPercent } = req.body;

    const priceItem = await prisma.contractPriceItem.create({
      data: {
        contractId: id,
        productId,
        unitPrice,
        priceUnit: priceUnit || 'per mCi',
        minimumQuantity,
        discountPercent: discountPercent || 0,
        isActive: true,
      },
      include: { product: true },
    });

    res.status(201).json(priceItem);
  } catch (error) {
    console.error('Add price item error:', error);
    res.status(500).json({ error: 'Failed to add price item' });
  }
});

router.put('/:id/price-items/:itemId', authenticateToken, async (req: Request, res: Response): Promise<void> => {
  try {
    const { itemId } = req.params;
    const { unitPrice, priceUnit, minimumQuantity, discountPercent, isActive } = req.body;

    const priceItem = await prisma.contractPriceItem.update({
      where: { id: itemId },
      data: {
        unitPrice,
        priceUnit,
        minimumQuantity,
        discountPercent,
        isActive,
      },
      include: { product: true },
    });

    res.json(priceItem);
  } catch (error) {
    console.error('Update price item error:', error);
    res.status(500).json({ error: 'Failed to update price item' });
  }
});

router.delete('/:id/price-items/:itemId', authenticateToken, async (req: Request, res: Response): Promise<void> => {
  try {
    const { id, itemId } = req.params;

    const contract = await prisma.contract.findUnique({ where: { id } });
    if (!contract) {
      res.status(404).json({ error: 'Contract not found' });
      return;
    }

    if (contract.status !== 'DRAFT') {
      res.status(400).json({ error: 'Can only delete price items from draft contracts' });
      return;
    }

    await prisma.contractPriceItem.delete({
      where: { id: itemId },
    });

    await createAuditLog(req.user?.userId, 'DELETE', 'ContractPriceItem', itemId, null, null, req);

    res.json({ success: true });
  } catch (error) {
    console.error('Delete price item error:', error);
    res.status(500).json({ error: 'Failed to delete price item' });
  }
});

router.get('/customer/:customerId/pricing', authenticateToken, async (req: Request, res: Response): Promise<void> => {
  try {
    const { customerId } = req.params;
    const { productId } = req.query;

    const activeContract = await prisma.contract.findFirst({
      where: {
        customerId,
        status: 'ACTIVE',
        startDate: { lte: new Date() },
        endDate: { gte: new Date() },
      },
      include: {
        priceItems: {
          where: productId ? { productId: productId as string, isActive: true } : { isActive: true },
          include: { product: true },
        },
      },
    });

    if (!activeContract) {
      res.json({ hasContract: false, pricing: [] });
      return;
    }

    res.json({
      hasContract: true,
      contract: {
        id: activeContract.id,
        name: activeContract.name,
        discountPercent: activeContract.discountPercent,
        paymentTermsDays: activeContract.paymentTermsDays,
        creditLimit: activeContract.creditLimit,
      },
      pricing: activeContract.priceItems,
    });
  } catch (error) {
    console.error('Get customer pricing error:', error);
    res.status(500).json({ error: 'Failed to fetch customer pricing' });
  }
});

router.get('/:id', authenticateToken, async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    const contract = await prisma.contract.findUnique({
      where: { id },
      include: {
        customer: true,
        priceItems: { include: { product: true } },
        invoices: { take: 10, orderBy: { createdAt: 'desc' } },
      },
    });

    if (!contract) {
      res.status(404).json({ error: 'Contract not found' });
      return;
    }

    res.json(contract);
  } catch (error) {
    console.error('Get contract error:', error);
    res.status(500).json({ error: 'Failed to fetch contract' });
  }
});

export default router;
