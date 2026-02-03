import { Router, Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { authenticateToken } from '../middleware/auth';

const router = Router();
const prisma = new PrismaClient();

router.use(authenticateToken);

router.get('/', async (req: Request, res: Response) => {
  try {
    const { status, search } = req.query;
    
    const where: any = {};
    
    if (status) {
      where.status = status;
    }
    
    if (search) {
      where.OR = [
        { name: { contains: search as string, mode: 'insensitive' } },
        { code: { contains: search as string, mode: 'insensitive' } },
        { email: { contains: search as string, mode: 'insensitive' } },
      ];
    }
    
    const suppliers = await prisma.supplier.findMany({
      where,
      include: {
        contacts: {
          where: { isPrimary: true },
          take: 1,
        },
        _count: {
          select: {
            purchaseOrders: true,
            documents: true,
          },
        },
      },
      orderBy: { name: 'asc' },
    });
    
    res.json(suppliers);
  } catch (error) {
    console.error('Error fetching suppliers:', error);
    res.status(500).json({ error: 'Failed to fetch suppliers' });
  }
});

router.get('/stats', async (req: Request, res: Response) => {
  try {
    const [total, active, onHold, blocked] = await Promise.all([
      prisma.supplier.count(),
      prisma.supplier.count({ where: { status: 'ACTIVE' } }),
      prisma.supplier.count({ where: { status: 'ON_HOLD' } }),
      prisma.supplier.count({ where: { status: 'BLOCKED' } }),
    ]);
    
    res.json({ total, active, onHold, blocked });
  } catch (error) {
    console.error('Error fetching supplier stats:', error);
    res.status(500).json({ error: 'Failed to fetch stats' });
  }
});

router.get('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    
    const supplier = await prisma.supplier.findUnique({
      where: { id },
      include: {
        contacts: {
          orderBy: [{ isPrimary: 'desc' }, { name: 'asc' }],
        },
        documents: {
          orderBy: { createdAt: 'desc' },
        },
        purchaseOrders: {
          take: 10,
          orderBy: { createdAt: 'desc' },
          select: {
            id: true,
            poNumber: true,
            status: true,
            totalAmount: true,
            orderDate: true,
          },
        },
      },
    });
    
    if (!supplier) {
      return res.status(404).json({ error: 'Supplier not found' });
    }
    
    res.json(supplier);
  } catch (error) {
    console.error('Error fetching supplier:', error);
    res.status(500).json({ error: 'Failed to fetch supplier' });
  }
});

router.post('/', async (req: Request, res: Response) => {
  try {
    const {
      code,
      name,
      nameAr,
      email,
      phone,
      mobile,
      website,
      taxNumber,
      vatNumber,
      crNumber,
      bankName,
      bankBranch,
      bankAccountName,
      bankAccountNumber,
      bankIban,
      bankSwift,
      address,
      city,
      region,
      country,
      postalCode,
      paymentTermsDays,
      currencyCode,
      status,
      notes,
    } = req.body;
    
    if (!code || !name) {
      return res.status(400).json({ error: 'Code and name are required' });
    }
    
    const existing = await prisma.supplier.findUnique({ where: { code } });
    if (existing) {
      return res.status(400).json({ error: 'Supplier code already exists' });
    }
    
    const supplier = await prisma.supplier.create({
      data: {
        code,
        name,
        nameAr,
        email,
        phone,
        mobile,
        website,
        taxNumber,
        vatNumber,
        crNumber,
        bankName,
        bankBranch,
        bankAccountName,
        bankAccountNumber,
        bankIban,
        bankSwift,
        address,
        city,
        region,
        country,
        postalCode,
        paymentTermsDays: paymentTermsDays || 30,
        currencyCode: currencyCode || 'SAR',
        status: status || 'ACTIVE',
        notes,
      },
    });
    
    await prisma.auditLog.create({
      data: {
        userId: (req as any).user.id,
        action: 'CREATE',
        entityType: 'Supplier',
        entityId: supplier.id,
        newValues: supplier,
      },
    });
    
    res.status(201).json(supplier);
  } catch (error) {
    console.error('Error creating supplier:', error);
    res.status(500).json({ error: 'Failed to create supplier' });
  }
});

router.put('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const {
      name,
      nameAr,
      email,
      phone,
      mobile,
      website,
      taxNumber,
      vatNumber,
      crNumber,
      bankName,
      bankBranch,
      bankAccountName,
      bankAccountNumber,
      bankIban,
      bankSwift,
      address,
      city,
      region,
      country,
      postalCode,
      paymentTermsDays,
      currencyCode,
      status,
      notes,
    } = req.body;
    
    const existing = await prisma.supplier.findUnique({ where: { id } });
    if (!existing) {
      return res.status(404).json({ error: 'Supplier not found' });
    }
    
    const supplier = await prisma.supplier.update({
      where: { id },
      data: {
        name,
        nameAr,
        email,
        phone,
        mobile,
        website,
        taxNumber,
        vatNumber,
        crNumber,
        bankName,
        bankBranch,
        bankAccountName,
        bankAccountNumber,
        bankIban,
        bankSwift,
        address,
        city,
        region,
        country,
        postalCode,
        paymentTermsDays,
        currencyCode,
        status,
        notes,
      },
    });
    
    await prisma.auditLog.create({
      data: {
        userId: (req as any).user.id,
        action: 'UPDATE',
        entityType: 'Supplier',
        entityId: supplier.id,
        oldValues: existing,
        newValues: supplier,
      },
    });
    
    res.json(supplier);
  } catch (error) {
    console.error('Error updating supplier:', error);
    res.status(500).json({ error: 'Failed to update supplier' });
  }
});

router.patch('/:id/status', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { status, reason } = req.body;
    
    if (!['ACTIVE', 'ON_HOLD', 'BLOCKED'].includes(status)) {
      return res.status(400).json({ error: 'Invalid status' });
    }
    
    const existing = await prisma.supplier.findUnique({ where: { id } });
    if (!existing) {
      return res.status(404).json({ error: 'Supplier not found' });
    }
    
    const supplier = await prisma.supplier.update({
      where: { id },
      data: { status },
    });
    
    await prisma.auditLog.create({
      data: {
        userId: (req as any).user.id,
        action: 'STATUS_CHANGE',
        entityType: 'Supplier',
        entityId: supplier.id,
        oldValues: { status: existing.status },
        newValues: { status, reason },
      },
    });
    
    res.json(supplier);
  } catch (error) {
    console.error('Error updating supplier status:', error);
    res.status(500).json({ error: 'Failed to update status' });
  }
});

router.post('/:id/contacts', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { name, title, email, phone, mobile, isPrimary } = req.body;
    
    if (!name) {
      return res.status(400).json({ error: 'Contact name is required' });
    }
    
    if (isPrimary) {
      await prisma.supplierContact.updateMany({
        where: { supplierId: id },
        data: { isPrimary: false },
      });
    }
    
    const contact = await prisma.supplierContact.create({
      data: {
        supplierId: id,
        name,
        title,
        email,
        phone,
        mobile,
        isPrimary: isPrimary || false,
      },
    });
    
    res.status(201).json(contact);
  } catch (error) {
    console.error('Error creating contact:', error);
    res.status(500).json({ error: 'Failed to create contact' });
  }
});

router.put('/:id/contacts/:contactId', async (req: Request, res: Response) => {
  try {
    const { id, contactId } = req.params;
    const { name, title, email, phone, mobile, isPrimary, isActive } = req.body;
    
    if (isPrimary) {
      await prisma.supplierContact.updateMany({
        where: { supplierId: id, NOT: { id: contactId } },
        data: { isPrimary: false },
      });
    }
    
    const contact = await prisma.supplierContact.update({
      where: { id: contactId },
      data: { name, title, email, phone, mobile, isPrimary, isActive },
    });
    
    res.json(contact);
  } catch (error) {
    console.error('Error updating contact:', error);
    res.status(500).json({ error: 'Failed to update contact' });
  }
});

router.delete('/:id/contacts/:contactId', async (req: Request, res: Response) => {
  try {
    const { contactId } = req.params;
    
    await prisma.supplierContact.delete({
      where: { id: contactId },
    });
    
    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting contact:', error);
    res.status(500).json({ error: 'Failed to delete contact' });
  }
});

export default router;
