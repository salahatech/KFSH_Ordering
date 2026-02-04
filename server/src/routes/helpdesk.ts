import { Router, Request, Response } from 'express';
import { PrismaClient, TicketStatus, TicketPriority, TicketCategory, TicketRequesterRole, TicketTeam, TicketMessageType, TicketMessageVisibility, TicketEventType, TicketTaskStatus } from '@prisma/client';
import { authenticateToken, requireRole } from '../middleware/auth.js';
import { sendNotification } from '../services/notification.js';

const router = Router();
const prisma = new PrismaClient();

async function generateTicketNo(): Promise<string> {
  const lastTicket = await prisma.supportTicket.findFirst({
    orderBy: { createdAt: 'desc' },
    select: { ticketNo: true }
  });
  
  let nextNum = 1;
  if (lastTicket?.ticketNo) {
    const match = lastTicket.ticketNo.match(/T-(\d+)/);
    if (match) {
      nextNum = parseInt(match[1], 10) + 1;
    }
  }
  
  return `T-${String(nextNum).padStart(6, '0')}`;
}

async function createTicketEvent(
  ticketId: string,
  eventType: TicketEventType,
  actorUserId: string,
  oldValue?: any,
  newValue?: any
) {
  await prisma.ticketEvent.create({
    data: {
      ticketId,
      eventType,
      actorUserId,
      oldValueJson: oldValue ? JSON.parse(JSON.stringify(oldValue)) : null,
      newValueJson: newValue ? JSON.parse(JSON.stringify(newValue)) : null,
    }
  });
}

async function getSlaSettings() {
  const settings = await prisma.systemConfig.findMany({
    where: {
      key: {
        startsWith: 'helpdesk_sla_'
      }
    }
  });
  
  const defaults: Record<string, { responseHours: number; resolveHours: number }> = {
    CRITICAL: { responseHours: 1, resolveHours: 4 },
    HIGH: { responseHours: 4, resolveHours: 24 },
    MEDIUM: { responseHours: 8, resolveHours: 48 },
    LOW: { responseHours: 24, resolveHours: 72 }
  };
  
  settings.forEach(s => {
    const match = s.key.match(/helpdesk_sla_(\w+)_(\w+)/);
    if (match) {
      const [, priority, type] = match;
      if (defaults[priority]) {
        if (type === 'response') defaults[priority].responseHours = parseInt(s.value, 10);
        if (type === 'resolve') defaults[priority].resolveHours = parseInt(s.value, 10);
      }
    }
  });
  
  return defaults;
}

function calculateSlaDates(priority: TicketPriority, slaSettings: Record<string, { responseHours: number; resolveHours: number }>) {
  const now = new Date();
  const setting = slaSettings[priority] || slaSettings.MEDIUM;
  
  return {
    slaResponseDueAt: new Date(now.getTime() + setting.responseHours * 60 * 60 * 1000),
    slaResolveDueAt: new Date(now.getTime() + setting.resolveHours * 60 * 60 * 1000)
  };
}

// =========================
// USER PORTAL ENDPOINTS
// =========================

router.get('/tickets', authenticateToken, async (req: Request, res: Response) => {
  try {
    const userId = req.user!.userId;
    const { status, category, search, page = '1', limit = '20' } = req.query;
    
    const where: any = {
      requesterUserId: userId
    };
    
    if (status) where.status = status as TicketStatus;
    if (category) where.category = category as TicketCategory;
    if (search) {
      where.OR = [
        { ticketNo: { contains: search as string, mode: 'insensitive' } },
        { subject: { contains: search as string, mode: 'insensitive' } }
      ];
    }
    
    const skip = (parseInt(page as string, 10) - 1) * parseInt(limit as string, 10);
    
    const [tickets, total] = await Promise.all([
      prisma.supportTicket.findMany({
        where,
        include: {
          assignedToUser: { select: { id: true, firstName: true, lastName: true } },
          customer: { select: { id: true, name: true } },
          _count: { select: { messages: true, attachments: true } }
        },
        orderBy: { lastActivityAt: 'desc' },
        skip,
        take: parseInt(limit as string, 10)
      }),
      prisma.supportTicket.count({ where })
    ]);
    
    res.json({
      tickets,
      pagination: {
        page: parseInt(page as string, 10),
        limit: parseInt(limit as string, 10),
        total,
        pages: Math.ceil(total / parseInt(limit as string, 10))
      }
    });
  } catch (error) {
    console.error('Error fetching user tickets:', error);
    res.status(500).json({ error: 'Failed to fetch tickets' });
  }
});

router.post('/tickets', authenticateToken, async (req: Request, res: Response) => {
  try {
    const userId = req.user!.userId;
    const { subject, description, category, priority = 'MEDIUM', relatedEntityType, relatedEntityId } = req.body;
    
    if (!subject || !description || !category) {
      return res.status(400).json({ error: 'Subject, description, and category are required' });
    }
    
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: { role: true, customer: true }
    });
    
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    let requesterRole: TicketRequesterRole = 'INTERNAL';
    if (user.customerId) {
      requesterRole = 'CUSTOMER';
    } else if (user.role.name === 'Driver') {
      requesterRole = 'TECHNICIAN';
    }
    
    const ticketNo = await generateTicketNo();
    const slaSettings = await getSlaSettings();
    const slaDates = calculateSlaDates(priority as TicketPriority, slaSettings);
    
    const ticket = await prisma.supportTicket.create({
      data: {
        ticketNo,
        subject,
        description,
        category: category as TicketCategory,
        priority: priority as TicketPriority,
        status: 'NEW',
        requesterUserId: userId,
        requesterRole,
        customerId: user.customerId,
        relatedEntityType,
        relatedEntityId,
        ...slaDates
      },
      include: {
        requesterUser: { select: { id: true, firstName: true, lastName: true, email: true } },
        customer: { select: { id: true, name: true } }
      }
    });
    
    await createTicketEvent(ticket.id, 'CREATED', userId, null, { ticketNo, subject, category, priority });
    
    await sendNotification({
      userId,
      type: 'SYSTEM',
      title: 'Ticket Created',
      message: `Your support ticket ${ticketNo} has been created. We will respond shortly.`,
      relatedId: ticket.id,
      relatedType: 'TICKET',
      category: 'system'
    });
    
    const supportUsers = await prisma.user.findMany({
      where: {
        role: { name: { in: ['Admin', 'Support'] } },
        isActive: true
      },
      select: { id: true }
    });
    
    for (const supportUser of supportUsers) {
      await sendNotification({
        userId: supportUser.id,
        type: 'SYSTEM',
        title: 'New Support Ticket',
        message: `New ticket ${ticketNo}: ${subject}`,
        relatedId: ticket.id,
        relatedType: 'TICKET',
        category: 'system'
      });
    }
    
    res.status(201).json(ticket);
  } catch (error) {
    console.error('Error creating ticket:', error);
    res.status(500).json({ error: 'Failed to create ticket' });
  }
});

router.get('/tickets/:id', authenticateToken, async (req: Request, res: Response) => {
  try {
    const userId = req.user!.userId;
    const { id } = req.params;
    
    const ticket = await prisma.supportTicket.findFirst({
      where: {
        id,
        requesterUserId: userId
      },
      include: {
        requesterUser: { select: { id: true, firstName: true, lastName: true, email: true } },
        assignedToUser: { select: { id: true, firstName: true, lastName: true } },
        customer: { select: { id: true, name: true } },
        messages: {
          where: { visibility: 'PUBLIC' },
          include: {
            createdByUser: { select: { id: true, firstName: true, lastName: true } },
            attachments: true
          },
          orderBy: { createdAt: 'asc' }
        },
        attachments: {
          where: { messageId: null },
          include: {
            uploadedByUser: { select: { id: true, firstName: true, lastName: true } }
          }
        }
      }
    });
    
    if (!ticket) {
      return res.status(404).json({ error: 'Ticket not found' });
    }
    
    res.json(ticket);
  } catch (error) {
    console.error('Error fetching ticket:', error);
    res.status(500).json({ error: 'Failed to fetch ticket' });
  }
});

router.post('/tickets/:id/reply', authenticateToken, async (req: Request, res: Response) => {
  try {
    const userId = req.user!.userId;
    const { id } = req.params;
    const { body } = req.body;
    
    if (!body || !body.trim()) {
      return res.status(400).json({ error: 'Message body is required' });
    }
    
    const ticket = await prisma.supportTicket.findFirst({
      where: {
        id,
        requesterUserId: userId
      }
    });
    
    if (!ticket) {
      return res.status(404).json({ error: 'Ticket not found' });
    }
    
    if (ticket.status === 'CLOSED' || ticket.status === 'CANCELLED') {
      return res.status(400).json({ error: 'Cannot reply to a closed or cancelled ticket' });
    }
    
    const message = await prisma.ticketMessage.create({
      data: {
        ticketId: id,
        messageType: 'PUBLIC_REPLY',
        body,
        visibility: 'PUBLIC',
        createdByUserId: userId
      },
      include: {
        createdByUser: { select: { id: true, firstName: true, lastName: true } }
      }
    });
    
    await prisma.supportTicket.update({
      where: { id },
      data: {
        lastActivityAt: new Date(),
        status: ticket.status === 'WAITING_FOR_USER' ? 'WAITING_FOR_ADMIN' : ticket.status
      }
    });
    
    await createTicketEvent(id, 'MESSAGE_ADDED', userId, null, { messageType: 'PUBLIC_REPLY' });
    
    if (ticket.assignedToUserId) {
      await sendNotification({
        userId: ticket.assignedToUserId,
        type: 'SYSTEM',
        title: 'New Reply on Ticket',
        message: `User replied to ticket ${ticket.ticketNo}`,
        relatedId: ticket.id,
        relatedType: 'TICKET',
        category: 'system'
      });
    }
    
    res.status(201).json(message);
  } catch (error) {
    console.error('Error adding reply:', error);
    res.status(500).json({ error: 'Failed to add reply' });
  }
});

// =========================
// ADMIN ENDPOINTS
// =========================

router.get('/admin/tickets', authenticateToken, requireRole('Admin', 'Sales'), async (req: Request, res: Response) => {
  try {
    const { status, priority, category, assignedTo, team, customerId, search, slaBreached, page = '1', limit = '20' } = req.query;
    
    const where: any = {};
    
    if (status) where.status = status as TicketStatus;
    if (priority) where.priority = priority as TicketPriority;
    if (category) where.category = category as TicketCategory;
    if (assignedTo) where.assignedToUserId = assignedTo as string;
    if (team) where.assignedTeam = team as TicketTeam;
    if (customerId) where.customerId = customerId as string;
    
    if (slaBreached === 'true') {
      where.OR = [
        { slaResponseDueAt: { lt: new Date() }, slaResponseMet: null },
        { slaResolveDueAt: { lt: new Date() }, slaResolveMet: null, status: { notIn: ['RESOLVED', 'CLOSED', 'CANCELLED'] } }
      ];
    }
    
    if (search) {
      where.AND = where.AND || [];
      where.AND.push({
        OR: [
          { ticketNo: { contains: search as string, mode: 'insensitive' } },
          { subject: { contains: search as string, mode: 'insensitive' } },
          { requesterUser: { email: { contains: search as string, mode: 'insensitive' } } }
        ]
      });
    }
    
    const skip = (parseInt(page as string, 10) - 1) * parseInt(limit as string, 10);
    
    const [tickets, total, stats] = await Promise.all([
      prisma.supportTicket.findMany({
        where,
        include: {
          requesterUser: { select: { id: true, firstName: true, lastName: true, email: true } },
          assignedToUser: { select: { id: true, firstName: true, lastName: true } },
          customer: { select: { id: true, name: true } },
          _count: { select: { messages: true, tasks: true } }
        },
        orderBy: [
          { priority: 'desc' },
          { lastActivityAt: 'desc' }
        ],
        skip,
        take: parseInt(limit as string, 10)
      }),
      prisma.supportTicket.count({ where }),
      Promise.all([
        prisma.supportTicket.count({ where: { status: 'NEW' } }),
        prisma.supportTicket.count({ where: { status: { in: ['OPEN', 'IN_PROGRESS'] } } }),
        prisma.supportTicket.count({
          where: {
            OR: [
              { slaResponseDueAt: { lt: new Date() }, slaResponseMet: null },
              { slaResolveDueAt: { lt: new Date() }, slaResolveMet: null, status: { notIn: ['RESOLVED', 'CLOSED', 'CANCELLED'] } }
            ]
          }
        }),
        prisma.supportTicket.count({ where: { assignedToUserId: null, status: { notIn: ['CLOSED', 'CANCELLED'] } } })
      ])
    ]);
    
    res.json({
      tickets,
      stats: {
        new: stats[0],
        open: stats[1],
        slaBreached: stats[2],
        unassigned: stats[3]
      },
      pagination: {
        page: parseInt(page as string, 10),
        limit: parseInt(limit as string, 10),
        total,
        pages: Math.ceil(total / parseInt(limit as string, 10))
      }
    });
  } catch (error) {
    console.error('Error fetching admin tickets:', error);
    res.status(500).json({ error: 'Failed to fetch tickets' });
  }
});

router.get('/admin/tickets/:id', authenticateToken, requireRole('Admin', 'Sales'), async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    
    const ticket = await prisma.supportTicket.findUnique({
      where: { id },
      include: {
        requesterUser: { select: { id: true, firstName: true, lastName: true, email: true, phone: true } },
        assignedToUser: { select: { id: true, firstName: true, lastName: true, email: true } },
        customer: { select: { id: true, name: true, email: true, phone: true } },
        messages: {
          include: {
            createdByUser: { select: { id: true, firstName: true, lastName: true } },
            attachments: true
          },
          orderBy: { createdAt: 'asc' }
        },
        attachments: {
          include: {
            uploadedByUser: { select: { id: true, firstName: true, lastName: true } }
          }
        },
        tasks: {
          include: {
            assignedToUser: { select: { id: true, firstName: true, lastName: true } }
          },
          orderBy: { createdAt: 'desc' }
        },
        events: {
          include: {
            actorUser: { select: { id: true, firstName: true, lastName: true } }
          },
          orderBy: { createdAt: 'desc' }
        }
      }
    });
    
    if (!ticket) {
      return res.status(404).json({ error: 'Ticket not found' });
    }
    
    res.json(ticket);
  } catch (error) {
    console.error('Error fetching admin ticket:', error);
    res.status(500).json({ error: 'Failed to fetch ticket' });
  }
});

router.patch('/admin/tickets/:id', authenticateToken, requireRole('Admin', 'Sales'), async (req: Request, res: Response) => {
  try {
    const userId = req.user!.userId;
    const { id } = req.params;
    const { status, priority, assignedToUserId, assignedTeam, slaResponseDueAt, slaResolveDueAt } = req.body;
    
    const ticket = await prisma.supportTicket.findUnique({ where: { id } });
    
    if (!ticket) {
      return res.status(404).json({ error: 'Ticket not found' });
    }
    
    const updates: any = {};
    const events: Array<{ type: TicketEventType; oldValue: any; newValue: any }> = [];
    
    if (status && status !== ticket.status) {
      updates.status = status;
      events.push({ type: 'STATUS_CHANGED', oldValue: { status: ticket.status }, newValue: { status } });
      
      if (status === 'CLOSED' || status === 'RESOLVED') {
        updates.closedAt = new Date();
        if (ticket.slaResolveDueAt && new Date() <= ticket.slaResolveDueAt) {
          updates.slaResolveMet = true;
        } else if (ticket.slaResolveDueAt) {
          updates.slaResolveMet = false;
        }
      }
    }
    
    if (priority && priority !== ticket.priority) {
      updates.priority = priority;
      events.push({ type: 'PRIORITY_CHANGED', oldValue: { priority: ticket.priority }, newValue: { priority } });
    }
    
    if (assignedToUserId !== undefined && assignedToUserId !== ticket.assignedToUserId) {
      updates.assignedToUserId = assignedToUserId || null;
      events.push({ type: 'ASSIGNED', oldValue: { assignedToUserId: ticket.assignedToUserId }, newValue: { assignedToUserId } });
      
      if (!ticket.slaResponseMet && ticket.slaResponseDueAt) {
        updates.slaResponseMet = new Date() <= ticket.slaResponseDueAt;
      }
    }
    
    if (assignedTeam !== undefined && assignedTeam !== ticket.assignedTeam) {
      updates.assignedTeam = assignedTeam || null;
    }
    
    if (slaResponseDueAt !== undefined || slaResolveDueAt !== undefined) {
      if (slaResponseDueAt) updates.slaResponseDueAt = new Date(slaResponseDueAt);
      if (slaResolveDueAt) updates.slaResolveDueAt = new Date(slaResolveDueAt);
      events.push({ type: 'SLA_SET', oldValue: { slaResponseDueAt: ticket.slaResponseDueAt, slaResolveDueAt: ticket.slaResolveDueAt }, newValue: { slaResponseDueAt, slaResolveDueAt } });
    }
    
    updates.lastActivityAt = new Date();
    
    const updatedTicket = await prisma.supportTicket.update({
      where: { id },
      data: updates,
      include: {
        requesterUser: { select: { id: true, firstName: true, lastName: true, email: true } },
        assignedToUser: { select: { id: true, firstName: true, lastName: true } }
      }
    });
    
    for (const event of events) {
      await createTicketEvent(id, event.type, userId, event.oldValue, event.newValue);
    }
    
    if (assignedToUserId && assignedToUserId !== ticket.assignedToUserId) {
      await sendNotification({
        userId: assignedToUserId,
        type: 'SYSTEM',
        title: 'Ticket Assigned',
        message: `Ticket ${ticket.ticketNo} has been assigned to you`,
        relatedId: ticket.id,
        relatedType: 'TICKET',
        category: 'system'
      });
    }
    
    if (status && status !== ticket.status) {
      await sendNotification({
        userId: ticket.requesterUserId,
        type: 'SYSTEM',
        title: 'Ticket Status Updated',
        message: `Your ticket ${ticket.ticketNo} status changed to ${status}`,
        relatedId: ticket.id,
        relatedType: 'TICKET',
        category: 'system'
      });
    }
    
    res.json(updatedTicket);
  } catch (error) {
    console.error('Error updating ticket:', error);
    res.status(500).json({ error: 'Failed to update ticket' });
  }
});

router.post('/admin/tickets/:id/reply', authenticateToken, requireRole('Admin', 'Sales'), async (req: Request, res: Response) => {
  try {
    const userId = req.user!.userId;
    const { id } = req.params;
    const { body } = req.body;
    
    if (!body || !body.trim()) {
      return res.status(400).json({ error: 'Message body is required' });
    }
    
    const ticket = await prisma.supportTicket.findUnique({ where: { id } });
    
    if (!ticket) {
      return res.status(404).json({ error: 'Ticket not found' });
    }
    
    const message = await prisma.ticketMessage.create({
      data: {
        ticketId: id,
        messageType: 'PUBLIC_REPLY',
        body,
        visibility: 'PUBLIC',
        createdByUserId: userId
      },
      include: {
        createdByUser: { select: { id: true, firstName: true, lastName: true } }
      }
    });
    
    const statusUpdate = ticket.status === 'NEW' ? 'OPEN' : 
                         ticket.status === 'WAITING_FOR_ADMIN' ? 'WAITING_FOR_USER' : 
                         ticket.status;
    
    await prisma.supportTicket.update({
      where: { id },
      data: {
        lastActivityAt: new Date(),
        status: statusUpdate
      }
    });
    
    await createTicketEvent(id, 'MESSAGE_ADDED', userId, null, { messageType: 'PUBLIC_REPLY' });
    
    await sendNotification({
      userId: ticket.requesterUserId,
      type: 'SYSTEM',
      title: 'New Reply on Your Ticket',
      message: `Support replied to your ticket ${ticket.ticketNo}`,
      relatedId: ticket.id,
      relatedType: 'TICKET',
      category: 'system'
    });
    
    res.status(201).json(message);
  } catch (error) {
    console.error('Error adding admin reply:', error);
    res.status(500).json({ error: 'Failed to add reply' });
  }
});

router.post('/admin/tickets/:id/internal-note', authenticateToken, requireRole('Admin', 'Sales'), async (req: Request, res: Response) => {
  try {
    const userId = req.user!.userId;
    const { id } = req.params;
    const { body } = req.body;
    
    if (!body || !body.trim()) {
      return res.status(400).json({ error: 'Note body is required' });
    }
    
    const ticket = await prisma.supportTicket.findUnique({ where: { id } });
    
    if (!ticket) {
      return res.status(404).json({ error: 'Ticket not found' });
    }
    
    const message = await prisma.ticketMessage.create({
      data: {
        ticketId: id,
        messageType: 'INTERNAL_NOTE',
        body,
        visibility: 'INTERNAL',
        createdByUserId: userId
      },
      include: {
        createdByUser: { select: { id: true, firstName: true, lastName: true } }
      }
    });
    
    await prisma.supportTicket.update({
      where: { id },
      data: { lastActivityAt: new Date() }
    });
    
    res.status(201).json(message);
  } catch (error) {
    console.error('Error adding internal note:', error);
    res.status(500).json({ error: 'Failed to add internal note' });
  }
});

// =========================
// TASK ENDPOINTS
// =========================

router.post('/admin/tickets/:id/tasks', authenticateToken, requireRole('Admin', 'Sales'), async (req: Request, res: Response) => {
  try {
    const userId = req.user!.userId;
    const { id } = req.params;
    const { title, description, priority = 'MEDIUM', assignedToUserId, dueAt } = req.body;
    
    if (!title) {
      return res.status(400).json({ error: 'Task title is required' });
    }
    
    const ticket = await prisma.supportTicket.findUnique({ where: { id } });
    
    if (!ticket) {
      return res.status(404).json({ error: 'Ticket not found' });
    }
    
    const task = await prisma.ticketTask.create({
      data: {
        ticketId: id,
        title,
        description,
        priority: priority as TicketPriority,
        assignedToUserId,
        dueAt: dueAt ? new Date(dueAt) : null
      },
      include: {
        assignedToUser: { select: { id: true, firstName: true, lastName: true } }
      }
    });
    
    await createTicketEvent(id, 'TASK_CREATED', userId, null, { taskId: task.id, title });
    
    if (assignedToUserId) {
      await sendNotification({
        userId: assignedToUserId,
        type: 'SYSTEM',
        title: 'Task Assigned',
        message: `New task "${title}" assigned to you for ticket ${ticket.ticketNo}`,
        relatedId: ticket.id,
        relatedType: 'TICKET',
        category: 'system'
      });
    }
    
    res.status(201).json(task);
  } catch (error) {
    console.error('Error creating task:', error);
    res.status(500).json({ error: 'Failed to create task' });
  }
});

router.patch('/admin/tasks/:taskId', authenticateToken, requireRole('Admin', 'Sales'), async (req: Request, res: Response) => {
  try {
    const userId = req.user!.userId;
    const { taskId } = req.params;
    const { status, title, description, priority, assignedToUserId, dueAt } = req.body;
    
    const task = await prisma.ticketTask.findUnique({
      where: { id: taskId },
      include: { ticket: true }
    });
    
    if (!task) {
      return res.status(404).json({ error: 'Task not found' });
    }
    
    const updates: any = {};
    
    if (status !== undefined) {
      updates.status = status;
      if (status === 'DONE') updates.completedAt = new Date();
    }
    if (title !== undefined) updates.title = title;
    if (description !== undefined) updates.description = description;
    if (priority !== undefined) updates.priority = priority;
    if (assignedToUserId !== undefined) updates.assignedToUserId = assignedToUserId || null;
    if (dueAt !== undefined) updates.dueAt = dueAt ? new Date(dueAt) : null;
    
    const updatedTask = await prisma.ticketTask.update({
      where: { id: taskId },
      data: updates,
      include: {
        assignedToUser: { select: { id: true, firstName: true, lastName: true } }
      }
    });
    
    await createTicketEvent(task.ticketId, 'TASK_UPDATED', userId, { taskId, oldStatus: task.status }, { taskId, newStatus: status });
    
    if (assignedToUserId && assignedToUserId !== task.assignedToUserId) {
      await sendNotification({
        userId: assignedToUserId,
        type: 'SYSTEM',
        title: 'Task Assigned',
        message: `Task "${task.title}" has been assigned to you`,
        relatedId: task.ticketId,
        relatedType: 'TICKET',
        category: 'system'
      });
    }
    
    res.json(updatedTask);
  } catch (error) {
    console.error('Error updating task:', error);
    res.status(500).json({ error: 'Failed to update task' });
  }
});

router.get('/admin/tasks', authenticateToken, requireRole('Admin', 'Sales'), async (req: Request, res: Response) => {
  try {
    const { status, assignedTo, ticketId, page = '1', limit = '20' } = req.query;
    
    const where: any = {};
    
    if (status) where.status = status as TicketTaskStatus;
    if (assignedTo) where.assignedToUserId = assignedTo as string;
    if (ticketId) where.ticketId = ticketId as string;
    
    const skip = (parseInt(page as string, 10) - 1) * parseInt(limit as string, 10);
    
    const [tasks, total] = await Promise.all([
      prisma.ticketTask.findMany({
        where,
        include: {
          ticket: { select: { id: true, ticketNo: true, subject: true } },
          assignedToUser: { select: { id: true, firstName: true, lastName: true } }
        },
        orderBy: [
          { dueAt: 'asc' },
          { priority: 'desc' }
        ],
        skip,
        take: parseInt(limit as string, 10)
      }),
      prisma.ticketTask.count({ where })
    ]);
    
    res.json({
      tasks,
      pagination: {
        page: parseInt(page as string, 10),
        limit: parseInt(limit as string, 10),
        total,
        pages: Math.ceil(total / parseInt(limit as string, 10))
      }
    });
  } catch (error) {
    console.error('Error fetching tasks:', error);
    res.status(500).json({ error: 'Failed to fetch tasks' });
  }
});

// =========================
// SUPPORT USERS LIST
// =========================

router.get('/admin/support-users', authenticateToken, requireRole('Admin', 'Sales'), async (req: Request, res: Response) => {
  try {
    const users = await prisma.user.findMany({
      where: {
        isActive: true,
        role: {
          name: { in: ['Admin', 'Support', 'Finance', 'Logistics', 'QC Officer', 'QP'] }
        }
      },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        role: { select: { name: true } }
      },
      orderBy: { firstName: 'asc' }
    });
    
    res.json(users);
  } catch (error) {
    console.error('Error fetching support users:', error);
    res.status(500).json({ error: 'Failed to fetch support users' });
  }
});

export default router;
