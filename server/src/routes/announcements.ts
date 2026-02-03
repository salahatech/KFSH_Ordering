import { Router, Request, Response } from 'express';
import { PrismaClient, AnnouncementSeverity, AnnouncementPublishMode, AnnouncementStatus, AnnouncementAudienceType } from '@prisma/client';
import { authenticateToken, requireRole } from '../middleware/auth.js';

const router = Router();
const prisma = new PrismaClient();

// ==================== ADMIN ENDPOINTS ====================

// GET /admin/announcements - List all announcements
router.get('/admin/announcements', authenticateToken, requireRole('Admin'), async (req: Request, res: Response) => {
  try {
    const { status, severity, search } = req.query;

    const where: any = {};
    if (status) where.status = status;
    if (severity) where.severity = severity;
    if (search) {
      where.OR = [
        { title: { contains: search as string, mode: 'insensitive' } },
        { body: { contains: search as string, mode: 'insensitive' } }
      ];
    }

    const announcements = await prisma.announcement.findMany({
      where,
      include: {
        createdBy: { select: { id: true, firstName: true, lastName: true, email: true } },
        audiences: {
          include: {
            customer: { select: { id: true, name: true, code: true } },
            user: { select: { id: true, firstName: true, lastName: true, email: true } }
          }
        },
        _count: { select: { deliveries: true } }
      },
      orderBy: { createdAt: 'desc' }
    });

    // Compute and persist status changes based on current time
    const now = new Date();
    const statusUpdates: { id: string; newStatus: AnnouncementStatus }[] = [];

    const updatedAnnouncements = announcements.map(a => {
      let computedStatus = a.status;
      if (a.isPublished) {
        if (a.endAt && new Date(a.endAt) < now) {
          computedStatus = AnnouncementStatus.EXPIRED;
        } else if (a.startAt && new Date(a.startAt) <= now) {
          computedStatus = AnnouncementStatus.ACTIVE;
        } else if (a.startAt && new Date(a.startAt) > now) {
          computedStatus = AnnouncementStatus.SCHEDULED;
        }
      }
      // Track status changes for persistence
      if (computedStatus !== a.status) {
        statusUpdates.push({ id: a.id, newStatus: computedStatus });
      }
      return { ...a, computedStatus, status: computedStatus };
    });

    // Persist status changes in background
    if (statusUpdates.length > 0) {
      Promise.all(
        statusUpdates.map(u =>
          prisma.announcement.update({
            where: { id: u.id },
            data: { status: u.newStatus }
          })
        )
      ).catch(err => console.error('Error persisting announcement status updates:', err));
    }

    res.json(updatedAnnouncements);
  } catch (error) {
    console.error('Error fetching announcements:', error);
    res.status(500).json({ error: 'Failed to fetch announcements' });
  }
});

// GET /admin/announcements/:id - Get single announcement
router.get('/admin/announcements/:id', authenticateToken, requireRole('Admin'), async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const announcement = await prisma.announcement.findUnique({
      where: { id },
      include: {
        createdBy: { select: { id: true, firstName: true, lastName: true, email: true } },
        audiences: {
          include: {
            customer: { select: { id: true, name: true, code: true } },
            user: { select: { id: true, firstName: true, lastName: true, email: true } }
          }
        },
        deliveries: {
          include: {
            user: { select: { id: true, firstName: true, lastName: true, email: true } }
          },
          take: 50
        },
        _count: { select: { deliveries: true } }
      }
    });

    if (!announcement) {
      return res.status(404).json({ error: 'Announcement not found' });
    }

    res.json(announcement);
  } catch (error) {
    console.error('Error fetching announcement:', error);
    res.status(500).json({ error: 'Failed to fetch announcement' });
  }
});

// POST /admin/announcements - Create announcement
router.post('/admin/announcements', authenticateToken, requireRole('Admin'), async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id;
    const {
      title,
      body,
      severity = 'INFO',
      publishMode = 'IMMEDIATE',
      startAt,
      endAt,
      audiences = [],
      sendEmail = false,
      sendSms = false,
      sendWhatsapp = false
    } = req.body;

    if (!title || !body) {
      return res.status(400).json({ error: 'Title and body are required' });
    }

    // Validate dates
    if (publishMode === 'SCHEDULED' && !startAt) {
      return res.status(400).json({ error: 'Start date is required for scheduled announcements' });
    }
    if (startAt && endAt && new Date(startAt) >= new Date(endAt)) {
      return res.status(400).json({ error: 'End date must be after start date' });
    }

    const announcement = await prisma.announcement.create({
      data: {
        title,
        body,
        severity: severity as AnnouncementSeverity,
        publishMode: publishMode as AnnouncementPublishMode,
        status: AnnouncementStatus.DRAFT,
        startAt: startAt ? new Date(startAt) : null,
        endAt: endAt ? new Date(endAt) : null,
        sendEmail,
        sendSms,
        sendWhatsapp,
        createdById: userId,
        audiences: {
          create: audiences.map((a: any) => ({
            audienceType: a.audienceType as AnnouncementAudienceType,
            roleCode: a.roleCode || null,
            customerId: a.customerId || null,
            userId: a.userId || null
          }))
        }
      },
      include: {
        audiences: true,
        createdBy: { select: { id: true, firstName: true, lastName: true } }
      }
    });

    // Audit log
    await prisma.auditLog.create({
      data: {
        userId,
        action: 'ANNOUNCEMENT_CREATED',
        entityType: 'Announcement',
        entityId: announcement.id,
        newValues: { title, severity, publishMode }
      }
    });

    res.status(201).json(announcement);
  } catch (error) {
    console.error('Error creating announcement:', error);
    res.status(500).json({ error: 'Failed to create announcement' });
  }
});

// PUT /admin/announcements/:id - Update announcement
router.put('/admin/announcements/:id', authenticateToken, requireRole('Admin'), async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id;
    const { id } = req.params;
    const {
      title,
      body,
      severity,
      publishMode,
      startAt,
      endAt,
      audiences,
      sendEmail,
      sendSms,
      sendWhatsapp
    } = req.body;

    const existing = await prisma.announcement.findUnique({ where: { id } });
    if (!existing) {
      return res.status(404).json({ error: 'Announcement not found' });
    }

    // Don't allow editing published announcements that are already active
    if (existing.isPublished && existing.status === 'ACTIVE') {
      return res.status(400).json({ error: 'Cannot edit an active announcement' });
    }

    // Validate dates
    const newStartAt = startAt ? new Date(startAt) : existing.startAt;
    const newEndAt = endAt ? new Date(endAt) : existing.endAt;
    if (newStartAt && newEndAt && newStartAt >= newEndAt) {
      return res.status(400).json({ error: 'End date must be after start date' });
    }

    // Update audiences if provided
    if (audiences) {
      await prisma.announcementAudience.deleteMany({ where: { announcementId: id } });
      await prisma.announcementAudience.createMany({
        data: audiences.map((a: any) => ({
          announcementId: id,
          audienceType: a.audienceType as AnnouncementAudienceType,
          roleCode: a.roleCode || null,
          customerId: a.customerId || null,
          userId: a.userId || null
        }))
      });
    }

    const announcement = await prisma.announcement.update({
      where: { id },
      data: {
        ...(title && { title }),
        ...(body && { body }),
        ...(severity && { severity: severity as AnnouncementSeverity }),
        ...(publishMode && { publishMode: publishMode as AnnouncementPublishMode }),
        ...(startAt !== undefined && { startAt: startAt ? new Date(startAt) : null }),
        ...(endAt !== undefined && { endAt: endAt ? new Date(endAt) : null }),
        ...(sendEmail !== undefined && { sendEmail }),
        ...(sendSms !== undefined && { sendSms }),
        ...(sendWhatsapp !== undefined && { sendWhatsapp })
      },
      include: {
        audiences: true,
        createdBy: { select: { id: true, firstName: true, lastName: true } }
      }
    });

    await prisma.auditLog.create({
      data: {
        userId,
        action: 'ANNOUNCEMENT_UPDATED',
        entityType: 'Announcement',
        entityId: id,
        newValues: { title, severity }
      }
    });

    res.json(announcement);
  } catch (error) {
    console.error('Error updating announcement:', error);
    res.status(500).json({ error: 'Failed to update announcement' });
  }
});

// POST /admin/announcements/:id/publish - Publish announcement
router.post('/admin/announcements/:id/publish', authenticateToken, requireRole('Admin'), async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id;
    const { id } = req.params;

    const announcement = await prisma.announcement.findUnique({
      where: { id },
      include: { audiences: true }
    });

    if (!announcement) {
      return res.status(404).json({ error: 'Announcement not found' });
    }

    if (announcement.isPublished) {
      return res.status(400).json({ error: 'Announcement is already published' });
    }

    const now = new Date();
    let status: AnnouncementStatus;
    let startAt = announcement.startAt;

    if (announcement.publishMode === 'IMMEDIATE') {
      status = AnnouncementStatus.ACTIVE;
      startAt = now;
    } else {
      if (announcement.startAt && new Date(announcement.startAt) <= now) {
        status = AnnouncementStatus.ACTIVE;
      } else {
        status = AnnouncementStatus.SCHEDULED;
      }
    }

    const updated = await prisma.announcement.update({
      where: { id },
      data: {
        isPublished: true,
        status,
        startAt
      }
    });

    // If active now, deliver to recipients
    if (status === AnnouncementStatus.ACTIVE) {
      await deliverAnnouncement(id, announcement.audiences);
    }

    await prisma.auditLog.create({
      data: {
        userId,
        action: 'ANNOUNCEMENT_PUBLISHED',
        entityType: 'Announcement',
        entityId: id,
        newValues: { status, publishMode: announcement.publishMode }
      }
    });

    res.json(updated);
  } catch (error) {
    console.error('Error publishing announcement:', error);
    res.status(500).json({ error: 'Failed to publish announcement' });
  }
});

// POST /admin/announcements/:id/unpublish - Unpublish announcement
router.post('/admin/announcements/:id/unpublish', authenticateToken, requireRole('Admin'), async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id;
    const { id } = req.params;

    const announcement = await prisma.announcement.update({
      where: { id },
      data: {
        isPublished: false,
        status: AnnouncementStatus.DRAFT
      }
    });

    await prisma.auditLog.create({
      data: {
        userId,
        action: 'ANNOUNCEMENT_UNPUBLISHED',
        entityType: 'Announcement',
        entityId: id
      }
    });

    res.json(announcement);
  } catch (error) {
    console.error('Error unpublishing announcement:', error);
    res.status(500).json({ error: 'Failed to unpublish announcement' });
  }
});

// DELETE /admin/announcements/:id - Delete announcement
router.delete('/admin/announcements/:id', authenticateToken, requireRole('Admin'), async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id;
    const { id } = req.params;

    await prisma.announcement.delete({ where: { id } });

    await prisma.auditLog.create({
      data: {
        userId,
        action: 'ANNOUNCEMENT_DELETED',
        entityType: 'Announcement',
        entityId: id
      }
    });

    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting announcement:', error);
    res.status(500).json({ error: 'Failed to delete announcement' });
  }
});

// POST /admin/announcements/:id/duplicate - Duplicate announcement
router.post('/admin/announcements/:id/duplicate', authenticateToken, requireRole('Admin'), async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id;
    const { id } = req.params;

    const original = await prisma.announcement.findUnique({
      where: { id },
      include: { audiences: true }
    });

    if (!original) {
      return res.status(404).json({ error: 'Announcement not found' });
    }

    const duplicate = await prisma.announcement.create({
      data: {
        title: `${original.title} (Copy)`,
        body: original.body,
        severity: original.severity,
        publishMode: original.publishMode,
        status: AnnouncementStatus.DRAFT,
        sendEmail: original.sendEmail,
        sendSms: original.sendSms,
        sendWhatsapp: original.sendWhatsapp,
        createdById: userId,
        audiences: {
          create: original.audiences.map(a => ({
            audienceType: a.audienceType,
            roleCode: a.roleCode,
            customerId: a.customerId,
            userId: a.userId
          }))
        }
      },
      include: { audiences: true }
    });

    res.json(duplicate);
  } catch (error) {
    console.error('Error duplicating announcement:', error);
    res.status(500).json({ error: 'Failed to duplicate announcement' });
  }
});

// ==================== USER ENDPOINTS ====================

// GET /announcements/active - Get active announcements for current user
router.get('/active', authenticateToken, async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    const now = new Date();

    // Find announcements that are published and currently active
    // Include SCHEDULED announcements that have passed their startAt time (auto-activate)
    const activeAnnouncements = await prisma.announcement.findMany({
      where: {
        isPublished: true,
        OR: [
          // Already marked ACTIVE
          { status: AnnouncementStatus.ACTIVE },
          // SCHEDULED but startAt has passed (auto-activate)
          {
            status: AnnouncementStatus.SCHEDULED,
            startAt: { lte: now }
          }
        ],
        // Not expired
        AND: [
          {
            OR: [
              { endAt: { gte: now } },
              { endAt: null }
            ]
          }
        ]
      },
      include: {
        audiences: true,
        deliveries: {
          where: { userId: user.id }
        }
      },
      orderBy: [
        { severity: 'desc' },
        { startAt: 'desc' }
      ]
    });

    // Auto-activate scheduled announcements that have reached their start time
    const scheduledToActivate = activeAnnouncements.filter(
      a => a.status === AnnouncementStatus.SCHEDULED && a.startAt && new Date(a.startAt) <= now
    );
    if (scheduledToActivate.length > 0) {
      await Promise.all(
        scheduledToActivate.map(a =>
          prisma.announcement.update({
            where: { id: a.id },
            data: { status: AnnouncementStatus.ACTIVE }
          })
        )
      );
    }

    // Filter by audience targeting
    const userRole = user.role?.name;
    const userCustomerId = user.customerId;

    const relevantAnnouncements = activeAnnouncements.filter(a => {
      // Check if already dismissed by this user
      const delivery = a.deliveries.find(d => d.userId === user.id);
      if (delivery?.isDismissed) return false;

      // If no audiences defined, it's for everyone
      if (a.audiences.length === 0) return true;

      // Check audience targeting
      return a.audiences.some(audience => {
        if (audience.audienceType === 'USER' && audience.userId === user.id) return true;
        if (audience.audienceType === 'ROLE' && audience.roleCode === userRole) return true;
        if (audience.audienceType === 'CUSTOMER') {
          if (audience.customerId === userCustomerId) return true;
          if (!audience.customerId && userCustomerId) return true; // All customers
        }
        return false;
      });
    });

    // Remove internal data before sending
    const sanitized = relevantAnnouncements.map(a => ({
      id: a.id,
      title: a.title,
      body: a.body,
      severity: a.severity,
      startAt: a.startAt,
      endAt: a.endAt,
      isRead: a.deliveries.find(d => d.userId === user.id)?.isRead || false,
      createdAt: a.createdAt
    }));

    res.json(sanitized);
  } catch (error) {
    console.error('Error fetching active announcements:', error);
    res.status(500).json({ error: 'Failed to fetch announcements' });
  }
});

// POST /announcements/:id/read - Mark announcement as read
router.post('/:id/read', authenticateToken, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id;
    const { id } = req.params;

    await prisma.announcementDelivery.upsert({
      where: {
        announcementId_userId: { announcementId: id, userId }
      },
      update: {
        isRead: true,
        readAt: new Date()
      },
      create: {
        announcementId: id,
        userId,
        isRead: true,
        readAt: new Date()
      }
    });

    res.json({ success: true });
  } catch (error) {
    console.error('Error marking announcement as read:', error);
    res.status(500).json({ error: 'Failed to mark as read' });
  }
});

// POST /announcements/:id/dismiss - Dismiss announcement for current user
router.post('/:id/dismiss', authenticateToken, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id;
    const { id } = req.params;

    await prisma.announcementDelivery.upsert({
      where: {
        announcementId_userId: { announcementId: id, userId }
      },
      update: {
        isDismissed: true,
        dismissedAt: new Date()
      },
      create: {
        announcementId: id,
        userId,
        isDismissed: true,
        dismissedAt: new Date()
      }
    });

    res.json({ success: true });
  } catch (error) {
    console.error('Error dismissing announcement:', error);
    res.status(500).json({ error: 'Failed to dismiss announcement' });
  }
});

// ==================== HELPER FUNCTIONS ====================

async function deliverAnnouncement(announcementId: string, audiences: any[]) {
  try {
    const announcement = await prisma.announcement.findUnique({
      where: { id: announcementId }
    });

    if (!announcement) return;

    // Get all target users based on audience
    const targetUserIds = new Set<string>();

    for (const audience of audiences) {
      if (audience.audienceType === 'USER' && audience.userId) {
        targetUserIds.add(audience.userId);
      } else if (audience.audienceType === 'ROLE' && audience.roleCode) {
        const roleUsers = await prisma.user.findMany({
          where: { role: { name: audience.roleCode }, isActive: true },
          select: { id: true }
        });
        roleUsers.forEach(u => targetUserIds.add(u.id));
      } else if (audience.audienceType === 'CUSTOMER') {
        if (audience.customerId) {
          const customerUsers = await prisma.user.findMany({
            where: { customerId: audience.customerId, isActive: true },
            select: { id: true }
          });
          customerUsers.forEach(u => targetUserIds.add(u.id));
        } else {
          // All customer users
          const allCustomerUsers = await prisma.user.findMany({
            where: { customerId: { not: null }, isActive: true },
            select: { id: true }
          });
          allCustomerUsers.forEach(u => targetUserIds.add(u.id));
        }
      }
    }

    // If no audience defined, deliver to all active users
    if (audiences.length === 0) {
      const allUsers = await prisma.user.findMany({
        where: { isActive: true },
        select: { id: true }
      });
      allUsers.forEach(u => targetUserIds.add(u.id));
    }

    // Create delivery records and notifications
    const deliveryData = Array.from(targetUserIds).map(userId => ({
      announcementId,
      userId,
      deliveredAt: new Date()
    }));

    // Batch upsert deliveries
    for (const d of deliveryData) {
      await prisma.announcementDelivery.upsert({
        where: {
          announcementId_userId: { announcementId: d.announcementId, userId: d.userId }
        },
        update: {},
        create: d
      });
    }

    // Create in-app notifications
    const notificationData = Array.from(targetUserIds).map(userId => ({
      userId,
      type: 'ANNOUNCEMENT_PUBLISHED' as const,
      title: announcement.title,
      message: announcement.body.substring(0, 120) + (announcement.body.length > 120 ? '...' : ''),
      linkUrl: `/notifications?type=announcements`,
      isRead: false,
      severity: announcement.severity === 'CRITICAL' ? 'CRITICAL' : 
                announcement.severity === 'WARNING' ? 'WARNING' : 'INFO'
    }));

    await prisma.notification.createMany({
      data: notificationData as any,
      skipDuplicates: true
    });

    console.log(`Delivered announcement ${announcementId} to ${targetUserIds.size} users`);
  } catch (error) {
    console.error('Error delivering announcement:', error);
  }
}

// Scheduled job to activate scheduled announcements
export async function processScheduledAnnouncements() {
  try {
    const now = new Date();

    // Find scheduled announcements that should now be active
    const toActivate = await prisma.announcement.findMany({
      where: {
        isPublished: true,
        status: AnnouncementStatus.SCHEDULED,
        startAt: { lte: now }
      },
      include: { audiences: true }
    });

    for (const announcement of toActivate) {
      await prisma.announcement.update({
        where: { id: announcement.id },
        data: { status: AnnouncementStatus.ACTIVE }
      });
      await deliverAnnouncement(announcement.id, announcement.audiences);
      console.log(`Activated scheduled announcement: ${announcement.id}`);
    }

    // Find active announcements that should now be expired
    const toExpire = await prisma.announcement.findMany({
      where: {
        isPublished: true,
        status: AnnouncementStatus.ACTIVE,
        endAt: { lt: now }
      }
    });

    for (const announcement of toExpire) {
      await prisma.announcement.update({
        where: { id: announcement.id },
        data: { status: AnnouncementStatus.EXPIRED }
      });
      console.log(`Expired announcement: ${announcement.id}`);
    }
  } catch (error) {
    console.error('Error processing scheduled announcements:', error);
  }
}

export default router;
