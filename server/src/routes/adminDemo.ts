import { Router, Request, Response } from 'express';
import { PrismaClient, ShipmentStatus, OrderStatus, BatchStatus, DoseUnitStatus, InvoiceStatus, PaymentRequestStatus } from '@prisma/client';
import { authenticateToken, requireRole } from '../middleware/auth';

const router = Router();
const prisma = new PrismaClient();

router.use(authenticateToken);
router.use(requireRole(['Admin']));

router.get('/status', async (req: Request, res: Response) => {
  try {
    const demoConfig = await prisma.systemConfig.findUnique({ where: { key: 'DEMO_MODE' } });
    const order = await prisma.order.findUnique({ where: { orderNumber: 'O-10001' } });
    const shipment = await prisma.shipment.findUnique({ where: { shipmentNumber: 'S-30001' } });
    const invoice = await prisma.invoice.findUnique({ where: { invoiceNumber: 'INV-40001' } });
    
    res.json({
      demoMode: demoConfig?.value || 'UNKNOWN',
      mainJourney: {
        order: order ? { number: order.orderNumber, status: order.status } : null,
        shipment: shipment ? { number: shipment.shipmentNumber, status: shipment.status } : null,
        invoice: invoice ? { number: invoice.invoiceNumber, status: invoice.status, paidAmount: invoice.paidAmount, remainingAmount: invoice.remainingAmount } : null,
      },
      availableActions: getAvailableActions(shipment?.status, invoice?.status),
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to get demo status' });
  }
});

function getAvailableActions(shipmentStatus?: ShipmentStatus | null, invoiceStatus?: InvoiceStatus | null): string[] {
  const actions: string[] = [];
  
  if (shipmentStatus === ShipmentStatus.IN_TRANSIT) {
    actions.push('mark-arrived', 'mark-delivered');
  } else if (shipmentStatus === ShipmentStatus.ARRIVED) {
    actions.push('mark-delivered');
  }
  
  if (invoiceStatus === InvoiceStatus.ISSUED_POSTED || invoiceStatus === InvoiceStatus.PARTIALLY_PAID) {
    actions.push('create-payment-request', 'confirm-payment');
  }
  
  if (invoiceStatus === InvoiceStatus.PAID) {
    actions.push('close-invoice');
  }
  
  return actions;
}

router.post('/actions/mark-arrived', async (req: Request, res: Response) => {
  try {
    const shipment = await prisma.shipment.findUnique({ where: { shipmentNumber: 'S-30001' } });
    if (!shipment) return res.status(404).json({ error: 'Demo shipment not found' });
    if (shipment.status !== ShipmentStatus.IN_TRANSIT) {
      return res.status(400).json({ error: `Cannot mark as arrived. Current status: ${shipment.status}` });
    }

    await prisma.$transaction([
      prisma.shipment.update({
        where: { id: shipment.id },
        data: { 
          status: ShipmentStatus.ARRIVED,
          actualArrivalTime: new Date(),
          currentLocationLat: 24.7136,
          currentLocationLng: 46.6753,
        },
      }),
      prisma.shipmentEvent.create({
        data: {
          shipmentId: shipment.id,
          eventType: 'STATUS_CHANGE',
          fromStatus: ShipmentStatus.IN_TRANSIT,
          toStatus: ShipmentStatus.ARRIVED,
          notes: 'Demo action: Arrived at destination',
          latitude: 24.7136,
          longitude: 46.6753,
        },
      }),
    ]);

    res.json({ success: true, message: 'Shipment marked as ARRIVED', newStatus: ShipmentStatus.ARRIVED });
  } catch (error) {
    console.error('Error marking shipment arrived:', error);
    res.status(500).json({ error: 'Failed to mark shipment as arrived' });
  }
});

router.post('/actions/mark-delivered', async (req: Request, res: Response) => {
  try {
    const shipment = await prisma.shipment.findUnique({ 
      where: { shipmentNumber: 'S-30001' },
      include: { orders: true, doseUnits: true },
    });
    if (!shipment) return res.status(404).json({ error: 'Demo shipment not found' });
    if (shipment.status !== ShipmentStatus.IN_TRANSIT && shipment.status !== ShipmentStatus.ARRIVED) {
      return res.status(400).json({ error: `Cannot mark as delivered. Current status: ${shipment.status}` });
    }

    const driver = await prisma.driver.findFirst({ where: { id: 'driver-demo-1' } });

    await prisma.$transaction([
      prisma.shipment.update({
        where: { id: shipment.id },
        data: { status: ShipmentStatus.DELIVERED },
      }),
      prisma.shipmentEvent.create({
        data: {
          shipmentId: shipment.id,
          eventType: 'STATUS_CHANGE',
          fromStatus: shipment.status,
          toStatus: ShipmentStatus.DELIVERED,
          notes: 'Demo action: Delivery completed successfully',
          latitude: 24.7136,
          longitude: 46.6753,
        },
      }),
      prisma.proofOfDelivery.upsert({
        where: { shipmentId: shipment.id },
        update: { deliveredAt: new Date() },
        create: {
          shipmentId: shipment.id,
          deliveredAt: new Date(),
          receiverName: 'Dr. Nadia Al-Rashid',
          receiverMobile: '+966512345679',
          receiverIdType: 'Staff ID',
          gpsLat: 24.7136,
          gpsLng: 46.6753,
          notes: 'Demo delivery completed',
          capturedByDriverId: driver?.id,
        },
      }),
      ...shipment.orders.map(order => 
        prisma.order.update({
          where: { id: order.id },
          data: { status: OrderStatus.DELIVERED },
        })
      ),
      ...shipment.orders.map(order =>
        prisma.orderHistory.create({
          data: {
            orderId: order.id,
            fromStatus: order.status,
            toStatus: OrderStatus.DELIVERED,
            changeNotes: 'Demo action: Order delivered',
          },
        })
      ),
      ...shipment.doseUnits.map(dose =>
        prisma.doseUnit.update({
          where: { id: dose.id },
          data: { status: DoseUnitStatus.DELIVERED },
        })
      ),
    ]);

    const customer = await prisma.customer.findFirst({ where: { code: 'CUST-001' } });
    const portalUsers = await prisma.user.findMany({ where: { customerId: customer?.id } });
    
    for (const user of portalUsers) {
      await prisma.notification.create({
        data: {
          userId: user.id,
          type: 'DELIVERY_UPDATE',
          title: 'Order Delivered',
          message: `Your order has been delivered successfully.`,
          relatedId: shipment.id,
          relatedType: 'Shipment',
        },
      });
    }

    res.json({ success: true, message: 'Shipment and orders marked as DELIVERED', newStatus: ShipmentStatus.DELIVERED });
  } catch (error) {
    console.error('Error marking shipment delivered:', error);
    res.status(500).json({ error: 'Failed to mark shipment as delivered' });
  }
});

router.post('/actions/create-payment-request', async (req: Request, res: Response) => {
  try {
    const { amount, isPartial = true } = req.body;
    
    const invoice = await prisma.invoice.findUnique({ where: { invoiceNumber: 'INV-40001' } });
    if (!invoice) return res.status(404).json({ error: 'Demo invoice not found' });
    if (invoice.status !== InvoiceStatus.ISSUED_POSTED && invoice.status !== InvoiceStatus.PARTIALLY_PAID) {
      return res.status(400).json({ error: `Cannot create payment request. Invoice status: ${invoice.status}` });
    }

    const paymentAmount = amount || (isPartial ? invoice.remainingAmount / 2 : invoice.remainingAmount);
    
    const existingRequests = await prisma.paymentRequest.count({ where: { invoiceId: invoice.id } });
    const requestNumber = `PR-DEMO-${existingRequests + 1}`;

    const customer = await prisma.customer.findFirst({ where: { code: 'CUST-001' } });
    const portalUser = await prisma.user.findFirst({ where: { email: 'portal1@hospitaldemo.com' } });

    const paymentRequest = await prisma.paymentRequest.create({
      data: {
        invoiceId: invoice.id,
        customerId: customer!.id,
        amount: paymentAmount,
        amountSAR: paymentAmount,
        currency: 'SAR',
        paymentMethod: 'BANK_TRANSFER',
        referenceNumber: `TRF-DEMO-${Date.now()}`,
        notes: 'Demo payment request',
        status: PaymentRequestStatus.PENDING_CONFIRMATION,
        submittedByUserId: portalUser?.id,
      },
    });

    const financeUsers = await prisma.user.findMany({ 
      where: { role: { name: { in: ['Finance', 'Admin'] } } } 
    });
    
    for (const user of financeUsers) {
      await prisma.notification.create({
        data: {
          userId: user.id,
          type: 'SYSTEM',
          title: 'Payment Request Submitted',
          message: `Payment request for SAR ${paymentAmount.toFixed(2)} requires confirmation.`,
          relatedId: paymentRequest.id,
          relatedType: 'PaymentRequest',
        },
      });
    }

    res.json({ 
      success: true, 
      message: `Payment request created for SAR ${paymentAmount.toFixed(2)}`,
      paymentRequest: { id: paymentRequest.id, amount: paymentAmount, status: paymentRequest.status },
    });
  } catch (error) {
    console.error('Error creating payment request:', error);
    res.status(500).json({ error: 'Failed to create payment request' });
  }
});

router.post('/actions/confirm-payment', async (req: Request, res: Response) => {
  try {
    const { paymentRequestId } = req.body;
    const userId = (req as any).user?.id;

    let paymentRequest;
    if (paymentRequestId) {
      paymentRequest = await prisma.paymentRequest.findUnique({ where: { id: paymentRequestId } });
    } else {
      paymentRequest = await prisma.paymentRequest.findFirst({
        where: { 
          invoice: { invoiceNumber: 'INV-40001' },
          status: PaymentRequestStatus.PENDING_CONFIRMATION,
        },
        orderBy: { createdAt: 'asc' },
      });
    }

    if (!paymentRequest) return res.status(404).json({ error: 'No pending payment request found' });

    const invoice = await prisma.invoice.findUnique({ where: { id: paymentRequest.invoiceId } });
    if (!invoice) return res.status(404).json({ error: 'Invoice not found' });

    const newPaidAmount = invoice.paidAmount + paymentRequest.amount;
    const newRemainingAmount = invoice.totalAmount - newPaidAmount;
    const isFullyPaid = newRemainingAmount <= 0.01;

    const receiptCount = await prisma.receiptVoucher.count({ where: { invoiceId: invoice.id } });
    const receiptNumber = `RV-DEMO-${receiptCount + 1}`;

    const [receipt] = await prisma.$transaction([
      prisma.receiptVoucher.create({
        data: {
          receiptNumber,
          invoiceId: invoice.id,
          customerId: paymentRequest.customerId,
          paymentRequestId: paymentRequest.id,
          amount: paymentRequest.amount,
          amountSAR: paymentRequest.amountSAR,
          currency: paymentRequest.currency,
          paymentMethod: paymentRequest.paymentMethod,
          referenceNumber: paymentRequest.referenceNumber,
          confirmedByUserId: userId,
        },
      }),
      prisma.paymentRequest.update({
        where: { id: paymentRequest.id },
        data: { 
          status: PaymentRequestStatus.CONFIRMED,
          reviewedAt: new Date(),
          reviewedByUserId: userId,
        },
      }),
      prisma.invoice.update({
        where: { id: invoice.id },
        data: {
          paidAmount: newPaidAmount,
          remainingAmount: newRemainingAmount,
          status: isFullyPaid ? InvoiceStatus.PAID : InvoiceStatus.PARTIALLY_PAID,
        },
      }),
      prisma.invoiceEvent.create({
        data: {
          invoiceId: invoice.id,
          eventType: 'PAYMENT_RECEIVED',
          description: `Payment confirmed: SAR ${paymentRequest.amount.toFixed(2)}`,
          userId,
        },
      }),
      prisma.payment.create({
        data: {
          invoiceId: invoice.id,
          amount: paymentRequest.amount,
          amountSAR: paymentRequest.amountSAR,
          paymentMethod: paymentRequest.paymentMethod,
          referenceNumber: paymentRequest.referenceNumber,
        },
      }),
    ]);

    const portalUsers = await prisma.user.findMany({ where: { customerId: paymentRequest.customerId } });
    for (const user of portalUsers) {
      await prisma.notification.create({
        data: {
          userId: user.id,
          type: 'SYSTEM',
          title: 'Payment Confirmed',
          message: `Your payment of SAR ${paymentRequest.amount.toFixed(2)} has been confirmed. Receipt: ${receiptNumber}`,
          relatedId: receipt.id,
          relatedType: 'ReceiptVoucher',
        },
      });
    }

    res.json({ 
      success: true, 
      message: `Payment confirmed. Receipt: ${receiptNumber}`,
      receipt: { number: receiptNumber, amount: paymentRequest.amount },
      invoice: { paidAmount: newPaidAmount, remainingAmount: newRemainingAmount, status: isFullyPaid ? 'PAID' : 'PARTIALLY_PAID' },
    });
  } catch (error) {
    console.error('Error confirming payment:', error);
    res.status(500).json({ error: 'Failed to confirm payment' });
  }
});

router.post('/actions/close-invoice', async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id;
    const invoice = await prisma.invoice.findUnique({ where: { invoiceNumber: 'INV-40001' } });
    if (!invoice) return res.status(404).json({ error: 'Demo invoice not found' });
    if (invoice.status !== InvoiceStatus.PAID) {
      return res.status(400).json({ error: `Cannot close invoice. Current status: ${invoice.status}` });
    }

    await prisma.$transaction([
      prisma.invoice.update({
        where: { id: invoice.id },
        data: { status: InvoiceStatus.CLOSED_ARCHIVED, closedAt: new Date() },
      }),
      prisma.invoiceEvent.create({
        data: {
          invoiceId: invoice.id,
          eventType: 'CLOSED',
          description: 'Invoice closed and archived',
          userId,
        },
      }),
    ]);

    res.json({ success: true, message: 'Invoice closed and archived', newStatus: InvoiceStatus.CLOSED_ARCHIVED });
  } catch (error) {
    console.error('Error closing invoice:', error);
    res.status(500).json({ error: 'Failed to close invoice' });
  }
});

router.post('/actions/create-logistics-shipments', async (req: Request, res: Response) => {
  try {
    const customer = await prisma.customer.findFirst({ where: { code: 'CUST-001' } });
    if (!customer) {
      return res.status(400).json({ error: 'Demo customer not found. Please seed demo data first.' });
    }

    const products = await prisma.product.findMany({ take: 3 });
    if (products.length === 0) {
      return res.status(400).json({ error: 'No products found. Please seed demo data first.' });
    }

    const drivers = await prisma.driver.findMany({ where: { status: 'ACTIVE' }, take: 3 });
    
    const existingShipmentCount = await prisma.shipment.count();
    const baseNumber = 50000 + existingShipmentCount;

    const shipmentsToCreate = [
      {
        shipmentNumber: `S-${baseNumber + 1}`,
        status: ShipmentStatus.PACKED,
        priority: 'URGENT',
        deliveryAddress: 'King Faisal Specialist Hospital, Riyadh',
        deliveryLat: 24.7136,
        deliveryLng: 46.6753,
        scheduledDeliveryAt: new Date(Date.now() + 2 * 60 * 60 * 1000),
        driverNotes: 'Handle with care - Time-critical radioactive material',
      },
      {
        shipmentNumber: `S-${baseNumber + 2}`,
        status: ShipmentStatus.PACKED,
        priority: 'NORMAL',
        deliveryAddress: 'Prince Sultan Military Medical City, Riyadh',
        deliveryLat: 24.6877,
        deliveryLng: 46.7219,
        scheduledDeliveryAt: new Date(Date.now() + 4 * 60 * 60 * 1000),
        driverNotes: 'Deliver to Nuclear Medicine Dept - Building C',
      },
      {
        shipmentNumber: `S-${baseNumber + 3}`,
        status: ShipmentStatus.PACKED,
        priority: 'NORMAL',
        deliveryAddress: 'King Khalid University Hospital, Riyadh',
        deliveryLat: 24.7243,
        deliveryLng: 46.6392,
        scheduledDeliveryAt: new Date(Date.now() + 6 * 60 * 60 * 1000),
        driverNotes: 'Reception at main entrance - Call before arrival',
      },
    ];

    const createdShipments = [];

    for (let i = 0; i < shipmentsToCreate.length; i++) {
      const shipmentData = shipmentsToCreate[i];
      const product = products[i % products.length];
      
      const existingOrderCount = await prisma.order.count();
      const orderNumber = `O-${60000 + existingOrderCount + 1}`;

      const order = await prisma.order.create({
        data: {
          orderNumber,
          customerId: customer.id,
          productId: product.id,
          numberOfDoses: Math.floor(Math.random() * 3) + 1,
          requestedActivity: 100 + Math.floor(Math.random() * 200),
          deliveryDate: shipmentData.scheduledDeliveryAt,
          deliveryTimeStart: shipmentData.scheduledDeliveryAt,
          deliveryTimeEnd: new Date(shipmentData.scheduledDeliveryAt.getTime() + 60 * 60 * 1000),
          status: OrderStatus.DISPATCHED,
          hospitalOrderReference: `HOS-REF-${Date.now().toString().slice(-6)}`,
        },
      });

      const shipment = await prisma.shipment.create({
        data: {
          shipmentNumber: shipmentData.shipmentNumber,
          customerId: customer.id,
          status: shipmentData.status,
          priority: shipmentData.priority as any,
          deliveryAddress: shipmentData.deliveryAddress,
          deliveryLat: shipmentData.deliveryLat,
          deliveryLng: shipmentData.deliveryLng,
          scheduledDeliveryAt: shipmentData.scheduledDeliveryAt,
          driverNotes: shipmentData.driverNotes,
          orders: {
            connect: { id: order.id },
          },
        },
        include: { customer: true, orders: { include: { product: true } } },
      });

      await prisma.order.update({
        where: { id: order.id },
        data: { shipmentId: shipment.id },
      });

      await prisma.shipmentEvent.create({
        data: {
          shipmentId: shipment.id,
          eventType: 'STATUS_CHANGE',
          fromStatus: null,
          toStatus: ShipmentStatus.PACKED,
          notes: 'Shipment packed and ready for driver assignment',
        },
      });

      createdShipments.push({
        id: shipment.id,
        shipmentNumber: shipment.shipmentNumber,
        status: shipment.status,
        priority: shipment.priority,
        customer: customer.nameEn || customer.name,
        deliveryAddress: shipment.deliveryAddress,
        scheduledDeliveryAt: shipment.scheduledDeliveryAt,
        orderCount: 1,
      });
    }

    res.json({
      success: true,
      message: `Created ${createdShipments.length} shipments ready for driver assignment`,
      shipments: createdShipments,
      availableDrivers: drivers.map(d => ({ id: d.id, name: d.fullName, vehicle: d.vehicleType })),
      nextStep: 'Go to Logistics > Shipments to assign drivers to these shipments',
    });
  } catch (error) {
    console.error('Error creating logistics shipments:', error);
    res.status(500).json({ error: 'Failed to create logistics shipments' });
  }
});

router.post('/seed', async (req: Request, res: Response) => {
  try {
    const { spawn } = require('child_process');
    const mode = req.body.mode || 'LIVE_DEMO';
    
    const child = spawn('npm', ['run', 'seed:demo'], {
      cwd: process.cwd(),
      env: { ...process.env, DEMO_MODE: mode },
    });

    let output = '';
    child.stdout.on('data', (data: Buffer) => { output += data.toString(); });
    child.stderr.on('data', (data: Buffer) => { output += data.toString(); });

    child.on('close', (code: number) => {
      if (code === 0) {
        res.json({ success: true, message: 'Demo data seeded successfully', output });
      } else {
        res.status(500).json({ success: false, error: 'Seed failed', output });
      }
    });
  } catch (error) {
    console.error('Error running seed:', error);
    res.status(500).json({ error: 'Failed to run demo seed' });
  }
});

export default router;
