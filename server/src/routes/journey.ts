import { Router, Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { authenticateToken } from '../middleware/auth';

const router = Router();
const prisma = new PrismaClient();

interface JourneyEvent {
  id: string;
  type: string;
  entityType: 'order' | 'batch' | 'shipment' | 'doseUnit' | 'qcTest' | 'release';
  entityId: string;
  title: string;
  description?: string;
  timestamp: string;
  actor?: string;
  actorRole?: string;
  fromStatus?: string;
  toStatus?: string;
  note?: string;
  metadata?: Record<string, any>;
  severity: 'info' | 'success' | 'warning' | 'error';
}

const getSeverity = (toStatus?: string): 'info' | 'success' | 'warning' | 'error' => {
  if (!toStatus) return 'info';
  if (['DELIVERED', 'RELEASED', 'QC_PASSED', 'CLOSED', 'DISPENSED', 'COMPLETED'].includes(toStatus)) return 'success';
  if (['FAILED_QC', 'REJECTED', 'CANCELLED', 'DELAYED', 'DAMAGED', 'RETURNED'].includes(toStatus)) return 'error';
  if (['ON_HOLD', 'DEVIATION_OPEN', 'QC_PENDING', 'QP_REVIEW'].includes(toStatus)) return 'warning';
  return 'info';
};

const formatEventTitle = (type: string, fromStatus?: string, toStatus?: string): string => {
  if (type === 'STATUS_CHANGE' && toStatus) {
    return `Status changed to ${toStatus.replace(/_/g, ' ')}`;
  }
  if (type === 'CREATED') return 'Created';
  return type.replace(/_/g, ' ');
};

router.get('/orders/:id/journey', authenticateToken, async (req: Request, res: Response): Promise<void> => {
  try {
    const order: any = await prisma.order.findUnique({
      where: { id: req.params.id },
      include: {
        customer: true,
        product: true,
        batch: {
          include: {
            events: {
              include: { actor: true },
              orderBy: { createdAt: 'asc' },
            },
            qcResults: true,
            batchReleases: {
              include: { releasedBy: true },
            },
          },
        },
        doseUnits: true,
        shipment: true,
      },
    });

    if (!order) {
      res.status(404).json({ error: 'Order not found' });
      return;
    }

    const user = (req as any).user;
    if (user.customerId && order.customerId !== user.customerId) {
      res.status(403).json({ error: 'Access denied' });
      return;
    }

    const events: JourneyEvent[] = [];

    events.push({
      id: `order-created-${order.id}`,
      type: 'CREATED',
      entityType: 'order',
      entityId: order.id,
      title: 'Order created',
      description: `Order ${order.orderNumber} created for ${order.customer?.name}`,
      timestamp: order.createdAt.toISOString(),
      severity: 'info',
    });

    if (order.batch) {
      events.push({
        id: `batch-assigned-${order.batch.id}`,
        type: 'BATCH_ASSIGNED',
        entityType: 'batch',
        entityId: order.batch.id,
        title: 'Assigned to batch',
        description: `Order assigned to batch ${order.batch.batchNumber}`,
        timestamp: order.batch.createdAt.toISOString(),
        severity: 'info',
      });

      for (const event of order.batch.events || []) {
        events.push({
          id: event.id,
          type: event.eventType,
          entityType: 'batch',
          entityId: order.batch.id,
          title: formatEventTitle(event.eventType, event.fromStatus || undefined, event.toStatus || undefined),
          timestamp: event.createdAt.toISOString(),
          actor: event.actor ? `${event.actor.firstName} ${event.actor.lastName}` : undefined,
          actorRole: event.actorRole || undefined,
          fromStatus: event.fromStatus || undefined,
          toStatus: event.toStatus || undefined,
          note: event.note || undefined,
          metadata: event.metadata as Record<string, any> || undefined,
          severity: getSeverity(event.toStatus || undefined),
        });
      }

      for (const release of order.batch.batchReleases || []) {
        if (!release.releasedAt) continue;
        events.push({
          id: release.id,
          type: release.disposition === 'RELEASED' ? 'RELEASED' : release.disposition === 'REJECTED' ? 'REJECTED' : 'ON_HOLD',
          entityType: 'release',
          entityId: release.id,
          title: `QP ${release.disposition.toLowerCase()}`,
          description: release.comments || undefined,
          timestamp: release.releasedAt.toISOString(),
          actor: release.releasedBy ? `${release.releasedBy.firstName} ${release.releasedBy.lastName}` : undefined,
          actorRole: 'QP',
          severity: release.disposition === 'RELEASED' ? 'success' : release.disposition === 'REJECTED' ? 'error' : 'warning',
        });
      }
    }

    if (order.doseUnits && order.doseUnits.length > 0) {
      const dispensedDoses = order.doseUnits.filter((d: any) => d.status === 'DISPENSED' || d.status === 'SHIPPED');
      if (dispensedDoses.length > 0) {
        events.push({
          id: `doses-dispensed-${order.id}`,
          type: 'DOSES_DISPENSED',
          entityType: 'doseUnit',
          entityId: order.id,
          title: 'Doses dispensed',
          description: `${dispensedDoses.length} dose(s) dispensed`,
          timestamp: dispensedDoses[0].updatedAt.toISOString(),
          severity: 'success',
        });
      }
    }

    if (order.shipment) {
      events.push({
        id: `shipment-created-${order.shipment.id}`,
        type: 'SHIPMENT_CREATED',
        entityType: 'shipment',
        entityId: order.shipment.id,
        title: 'Shipment created',
        description: `Shipment ${order.shipment.shipmentNumber}`,
        timestamp: order.shipment.createdAt.toISOString(),
        severity: 'info',
      });

      if (order.shipment.status === 'DISPATCHED' || order.shipment.status === 'IN_TRANSIT' || order.shipment.status === 'DELIVERED') {
        events.push({
          id: `shipment-dispatched-${order.shipment.id}`,
          type: 'DISPATCHED',
          entityType: 'shipment',
          entityId: order.shipment.id,
          title: 'Dispatched',
          timestamp: order.shipment.actualPickupTime?.toISOString() || order.shipment.updatedAt.toISOString(),
          severity: 'info',
        });
      }

      if (order.shipment.status === 'DELIVERED') {
        events.push({
          id: `shipment-delivered-${order.shipment.id}`,
          type: 'DELIVERED',
          entityType: 'shipment',
          entityId: order.shipment.id,
          title: 'Delivered',
          timestamp: order.shipment.actualDeliveryTime?.toISOString() || order.shipment.updatedAt.toISOString(),
          severity: 'success',
        });
      }
    }

    events.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

    const linkedRecords = {
      batch: order.batch ? { id: order.batch.id, batchNumber: order.batch.batchNumber, status: order.batch.status } : null,
      shipment: order.shipment ? { id: order.shipment.id, shipmentNumber: order.shipment.shipmentNumber, status: order.shipment.status } : null,
      doseUnits: order.doseUnits?.map((d: any) => ({ id: d.id, doseNumber: d.doseNumber, status: d.status })) || [],
    };

    res.json({
      order: {
        id: order.id,
        orderNumber: order.orderNumber,
        status: order.status,
        customer: order.customer?.name,
        product: order.product?.name,
        productCode: order.product?.code,
        numberOfDoses: order.numberOfDoses,
        requestedActivity: order.requestedActivity,
        activityUnit: order.activityUnit,
        hospitalOrderReference: order.hospitalOrderReference,
        specialNotes: order.specialNotes,
        deliveryDate: order.deliveryDate,
        deliveryTimeStart: order.deliveryTimeStart,
        deliveryTimeEnd: order.deliveryTimeEnd,
        deliveryTime: order.deliveryTimeStart,
        shipmentId: order.shipmentId,
        estimatedDispatchTime: order.shipment?.scheduledPickupTime,
        estimatedDeliveryTime: order.shipment?.estimatedDeliveryTime,
      },
      events,
      linkedRecords,
      milestones: [
        { key: 'SUBMITTED', label: 'Submitted', completed: order.status !== 'DRAFT' },
        { key: 'VALIDATED', label: 'Validated', completed: ['VALIDATED', 'SCHEDULED', 'IN_PRODUCTION', 'QC_PENDING', 'RELEASED', 'DISPATCHED', 'DELIVERED'].includes(order.status) },
        { key: 'SCHEDULED', label: 'Scheduled', completed: ['SCHEDULED', 'IN_PRODUCTION', 'QC_PENDING', 'RELEASED', 'DISPATCHED', 'DELIVERED'].includes(order.status) },
        { key: 'IN_PRODUCTION', label: 'Production', completed: ['QC_PENDING', 'RELEASED', 'DISPATCHED', 'DELIVERED'].includes(order.status) },
        { key: 'QC_PENDING', label: 'QC', completed: ['RELEASED', 'DISPATCHED', 'DELIVERED'].includes(order.status) },
        { key: 'RELEASED', label: 'Released', completed: ['RELEASED', 'DISPATCHED', 'DELIVERED'].includes(order.status) },
        { key: 'DISPATCHED', label: 'Dispatched', completed: ['DISPATCHED', 'DELIVERED'].includes(order.status) },
        { key: 'DELIVERED', label: 'Delivered', completed: order.status === 'DELIVERED' },
      ],
    });
  } catch (error) {
    console.error('Error fetching order journey:', error);
    res.status(500).json({ error: 'Failed to fetch order journey' });
  }
});

router.get('/batches/:id/journey', authenticateToken, async (req: Request, res: Response): Promise<void> => {
  try {
    const batch: any = await prisma.batch.findUnique({
      where: { id: req.params.id },
      include: {
        product: true,
        orders: {
          include: {
            customer: true,
            shipment: true,
          },
        },
        doseUnits: true,
        qcResults: {
          include: { testedBy: true },
        },
        batchReleases: {
          include: { releasedBy: true },
        },
        events: {
          include: { actor: true },
          orderBy: { createdAt: 'asc' },
        },
      },
    });

    if (!batch) {
      res.status(404).json({ error: 'Batch not found' });
      return;
    }

    const events: JourneyEvent[] = [];

    events.push({
      id: `batch-created-${batch.id}`,
      type: 'CREATED',
      entityType: 'batch',
      entityId: batch.id,
      title: 'Batch created',
      description: `Batch ${batch.batchNumber} created for ${batch.product?.name}`,
      timestamp: batch.createdAt.toISOString(),
      severity: 'info',
    });

    for (const event of batch.events || []) {
      events.push({
        id: event.id,
        type: event.eventType,
        entityType: 'batch',
        entityId: batch.id,
        title: formatEventTitle(event.eventType, event.fromStatus || undefined, event.toStatus || undefined),
        timestamp: event.createdAt.toISOString(),
        actor: event.actor ? `${event.actor.firstName} ${event.actor.lastName}` : undefined,
        actorRole: event.actorRole || undefined,
        fromStatus: event.fromStatus || undefined,
        toStatus: event.toStatus || undefined,
        note: event.note || undefined,
        metadata: event.metadata as Record<string, any> || undefined,
        severity: getSeverity(event.toStatus || undefined),
      });
    }

    for (const qcResult of batch.qcResults || []) {
      events.push({
        id: qcResult.id,
        type: 'QC_TEST_ENTERED',
        entityType: 'qcTest',
        entityId: qcResult.id,
        title: `QC test: ${qcResult.testName}`,
        description: qcResult.passed ? 'Passed' : 'Failed',
        timestamp: qcResult.testedAt.toISOString(),
        actor: qcResult.testedBy ? `${qcResult.testedBy.firstName} ${qcResult.testedBy.lastName}` : undefined,
        actorRole: 'QC Analyst',
        severity: qcResult.passed ? 'success' : 'error',
      });
    }

    for (const release of batch.batchReleases || []) {
      events.push({
        id: release.id,
        type: release.disposition,
        entityType: 'release',
        entityId: release.id,
        title: `QP ${release.disposition.toLowerCase()}`,
        description: release.comments || undefined,
        timestamp: release.releasedAt.toISOString(),
        actor: release.releasedBy ? `${release.releasedBy.firstName} ${release.releasedBy.lastName}` : undefined,
        actorRole: 'QP',
        severity: release.disposition === 'RELEASED' ? 'success' : release.disposition === 'REJECTED' ? 'error' : 'warning',
      });
    }

    events.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

    const shipments = batch.orders?.filter((o: any) => o.shipment).map((o: any) => o.shipment) || [];
    const uniqueShipments = [...new Map(shipments.map((s: any) => [s.id, s])).values()];

    const linkedRecords = {
      orders: batch.orders?.map((o: any) => ({ id: o.id, orderNumber: o.orderNumber, status: o.status, customer: o.customer?.name })) || [],
      doseUnits: batch.doseUnits?.map((d: any) => ({ id: d.id, doseNumber: d.doseNumber, status: d.status })) || [],
      shipments: uniqueShipments.map((s: any) => ({ id: s.id, shipmentNumber: s.shipmentNumber, status: s.status })),
    };

    const isCompleted = (statuses: string[]) => statuses.includes(batch.status);

    res.json({
      batch: {
        id: batch.id,
        batchNumber: batch.batchNumber,
        status: batch.status,
        product: batch.product?.name,
        targetActivity: batch.targetActivity,
        actualActivity: batch.actualActivity,
        plannedStartTime: batch.plannedStartTime,
        actualStartTime: batch.actualStartTime,
      },
      events,
      linkedRecords,
      milestones: [
        { key: 'PLANNED', label: 'Planned', completed: batch.status !== 'PLANNED' },
        { key: 'IN_PRODUCTION', label: 'Production', completed: isCompleted(['PRODUCTION_COMPLETE', 'QC_PENDING', 'QC_IN_PROGRESS', 'QC_PASSED', 'QP_REVIEW', 'RELEASED', 'DISPENSING_IN_PROGRESS', 'DISPENSED', 'PACKED', 'DISPATCHED', 'CLOSED']) },
        { key: 'QC_PENDING', label: 'QC', completed: isCompleted(['QC_PASSED', 'QP_REVIEW', 'RELEASED', 'DISPENSING_IN_PROGRESS', 'DISPENSED', 'PACKED', 'DISPATCHED', 'CLOSED']) },
        { key: 'QP_REVIEW', label: 'QP Review', completed: isCompleted(['RELEASED', 'DISPENSING_IN_PROGRESS', 'DISPENSED', 'PACKED', 'DISPATCHED', 'CLOSED']) },
        { key: 'RELEASED', label: 'Released', completed: isCompleted(['RELEASED', 'DISPENSING_IN_PROGRESS', 'DISPENSED', 'PACKED', 'DISPATCHED', 'CLOSED']) },
        { key: 'DISPENSED', label: 'Dispensed', completed: isCompleted(['DISPENSED', 'PACKED', 'DISPATCHED', 'CLOSED']) },
        { key: 'DISPATCHED', label: 'Dispatched', completed: isCompleted(['DISPATCHED', 'CLOSED']) },
        { key: 'CLOSED', label: 'Closed', completed: batch.status === 'CLOSED' },
      ],
    });
  } catch (error) {
    console.error('Error fetching batch journey:', error);
    res.status(500).json({ error: 'Failed to fetch batch journey' });
  }
});

router.get('/shipments/:id/journey', authenticateToken, async (req: Request, res: Response): Promise<void> => {
  try {
    const shipment: any = await prisma.shipment.findUnique({
      where: { id: req.params.id },
      include: {
        courier: true,
        customer: true,
        orders: {
          include: {
            customer: true,
            product: true,
            batch: true,
            doseUnits: true,
          },
        },
      },
    });

    if (!shipment) {
      res.status(404).json({ error: 'Shipment not found' });
      return;
    }

    const events: JourneyEvent[] = [];

    events.push({
      id: `shipment-created-${shipment.id}`,
      type: 'CREATED',
      entityType: 'shipment',
      entityId: shipment.id,
      title: 'Shipment created',
      description: `Shipment ${shipment.shipmentNumber} created`,
      timestamp: shipment.createdAt.toISOString(),
      severity: 'info',
    });

    if (['PACKED', 'DISPATCHED', 'IN_TRANSIT', 'DELIVERED'].includes(shipment.status)) {
      events.push({
        id: `shipment-packed-${shipment.id}`,
        type: 'PACKED',
        entityType: 'shipment',
        entityId: shipment.id,
        title: 'Packed',
        timestamp: shipment.updatedAt.toISOString(),
        severity: 'info',
      });
    }

    if (['DISPATCHED', 'IN_TRANSIT', 'DELIVERED'].includes(shipment.status) && shipment.actualPickupTime) {
      events.push({
        id: `shipment-dispatched-${shipment.id}`,
        type: 'DISPATCHED',
        entityType: 'shipment',
        entityId: shipment.id,
        title: 'Dispatched',
        timestamp: shipment.actualPickupTime.toISOString(),
        severity: 'info',
      });
    }

    if (shipment.status === 'DELIVERED' && shipment.actualDeliveryTime) {
      events.push({
        id: `shipment-delivered-${shipment.id}`,
        type: 'DELIVERED',
        entityType: 'shipment',
        entityId: shipment.id,
        title: 'Delivered',
        timestamp: shipment.actualDeliveryTime.toISOString(),
        severity: 'success',
      });
    }

    events.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

    const allDoseUnits = shipment.orders?.flatMap((o: any) => o.doseUnits || []) || [];
    const batches = shipment.orders?.filter((o: any) => o.batch).map((o: any) => o.batch) || [];
    const uniqueBatches = [...new Map(batches.map((b: any) => [b.id, b])).values()];

    const linkedRecords = {
      orders: shipment.orders?.map((o: any) => ({ id: o.id, orderNumber: o.orderNumber, status: o.status, customer: o.customer?.name })) || [],
      batches: uniqueBatches.map((b: any) => ({ id: b.id, batchNumber: b.batchNumber, status: b.status })),
      doseUnits: allDoseUnits.map((d: any) => ({ id: d.id, doseNumber: d.doseNumber, status: d.status })),
    };

    res.json({
      shipment: {
        id: shipment.id,
        shipmentNumber: shipment.shipmentNumber,
        status: shipment.status,
        courier: shipment.courier?.name,
        customer: shipment.customer?.name,
        scheduledPickupTime: shipment.scheduledPickupTime,
        actualPickupTime: shipment.actualPickupTime,
        estimatedDeliveryTime: shipment.estimatedDeliveryTime,
        actualDeliveryTime: shipment.actualDeliveryTime,
      },
      events,
      linkedRecords,
      milestones: [
        { key: 'PENDING', label: 'Created', completed: shipment.status !== 'PENDING' },
        { key: 'PACKED', label: 'Packed', completed: ['PACKED', 'DISPATCHED', 'IN_TRANSIT', 'DELIVERED'].includes(shipment.status) },
        { key: 'DISPATCHED', label: 'Dispatched', completed: ['DISPATCHED', 'IN_TRANSIT', 'DELIVERED'].includes(shipment.status) },
        { key: 'IN_TRANSIT', label: 'In Transit', completed: ['IN_TRANSIT', 'DELIVERED'].includes(shipment.status) },
        { key: 'DELIVERED', label: 'Delivered', completed: shipment.status === 'DELIVERED' },
      ],
    });
  } catch (error) {
    console.error('Error fetching shipment journey:', error);
    res.status(500).json({ error: 'Failed to fetch shipment journey' });
  }
});

router.get('/events', authenticateToken, async (req: Request, res: Response): Promise<void> => {
  try {
    const { entityType, entityId, limit = '50' } = req.query;
    const limitNum = parseInt(limit as string);

    if (!entityType || !entityId) {
      res.status(400).json({ error: 'entityType and entityId are required' });
      return;
    }

    if (entityType === 'batch') {
      const batchEvents = await prisma.batchEvent.findMany({
        where: { batchId: entityId as string },
        include: { actor: true },
        orderBy: { createdAt: 'desc' },
        take: limitNum,
      });
      
      res.json(batchEvents.map(e => ({
        ...e,
        entityType: 'batch',
        actorName: e.actor ? `${e.actor.firstName} ${e.actor.lastName}` : null,
      })));
      return;
    }

    res.json([]);
  } catch (error) {
    console.error('Error fetching events:', error);
    res.status(500).json({ error: 'Failed to fetch events' });
  }
});

export default router;
