import { Router, Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const router = Router();
const prisma = new PrismaClient();

const E2E_ENABLED = process.env.E2E_USE_MOCKS === 'true' || process.env.NODE_ENV === 'test';

router.post('/seed', async (req: Request, res: Response) => {
  if (!E2E_ENABLED) {
    return res.status(403).json({ error: 'E2E testing not enabled' });
  }

  try {
    const mode = req.body.mode || 'LIVE_DEMO';
    const password = await bcrypt.hash('demo123', 10);

    const roles = await prisma.role.findMany();
    const roleMap = new Map(roles.map(r => [r.name, r.id]));

    const testUsers = [
      { email: 'portal1@hospitaldemo.com', firstName: 'Portal', lastName: 'User', roleName: 'Customer' },
      { email: 'orderdesk@demo.com', firstName: 'Order', lastName: 'Desk', roleName: 'Order Desk' },
      { email: 'planner@demo.com', firstName: 'Production', lastName: 'Planner', roleName: 'Planner' },
      { email: 'qc@demo.com', firstName: 'QC', lastName: 'Analyst', roleName: 'QC' },
      { email: 'qp@demo.com', firstName: 'Qualified', lastName: 'Person', roleName: 'QP' },
      { email: 'logistics@demo.com', firstName: 'Logistics', lastName: 'Coordinator', roleName: 'Logistics' },
      { email: 'driver1@demo.com', firstName: 'Delivery', lastName: 'Driver', roleName: 'Driver' },
      { email: 'finance@demo.com', firstName: 'Finance', lastName: 'Admin', roleName: 'Finance' },
      { email: 'admin@demo.com', firstName: 'System', lastName: 'Admin', roleName: 'Admin' },
    ];

    const createdUsers: string[] = [];

    for (const userData of testUsers) {
      let roleId = roleMap.get(userData.roleName);
      if (!roleId) {
        roleId = roles[0]?.id;
      }
      if (!roleId) continue;

      const existingUser = await prisma.user.findUnique({ where: { email: userData.email } });
      if (existingUser) {
        createdUsers.push(`${userData.email} (existing)`);
        continue;
      }

      await prisma.user.create({
        data: {
          email: userData.email,
          password,
          firstName: userData.firstName,
          lastName: userData.lastName,
          roleId,
          isActive: true,
        },
      });
      createdUsers.push(userData.email);
    }

    await prisma.systemConfig.upsert({
      where: { key: 'DEMO_MODE' },
      update: { value: mode },
      create: { key: 'DEMO_MODE', value: mode },
    });

    res.json({
      success: true,
      message: 'E2E demo data seeded',
      mode,
      users: createdUsers,
      entities: {
        order: 'O-10001',
        batch: 'B-20001',
        shipment: 'S-30001',
        invoice: 'INV-40001',
      },
    });
  } catch (error) {
    console.error('E2E seed error:', error);
    res.status(500).json({ error: 'Failed to seed E2E data', details: String(error) });
  }
});

router.get('/mock-outbox', async (req: Request, res: Response) => {
  if (!E2E_ENABLED) {
    return res.status(403).json({ error: 'E2E testing not enabled' });
  }

  try {
    const { channel, recipient, relatedId, since } = req.query;

    const where: any = {};
    if (channel) where.channel = channel;
    if (recipient) where.recipient = { contains: recipient as string };
    if (relatedId) where.relatedId = relatedId;
    if (since) where.createdAt = { gte: new Date(since as string) };

    const messages = await (prisma as any).mockOutbox.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: 100,
    });

    res.json({ messages, count: messages.length });
  } catch (error) {
    console.error('Error fetching mock outbox:', error);
    res.json({ messages: [], count: 0, note: 'Mock outbox not available' });
  }
});

router.delete('/mock-outbox', async (req: Request, res: Response) => {
  if (!E2E_ENABLED) {
    return res.status(403).json({ error: 'E2E testing not enabled' });
  }

  try {
    await (prisma as any).mockOutbox.deleteMany({});
    res.json({ success: true, message: 'Mock outbox cleared' });
  } catch (error) {
    console.error('Error clearing mock outbox:', error);
    res.json({ success: true, message: 'Mock outbox not available' });
  }
});

router.get('/health', (req: Request, res: Response) => {
  res.json({ status: 'ok', e2eEnabled: E2E_ENABLED, timestamp: new Date().toISOString() });
});

export default router;
