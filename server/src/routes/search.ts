import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import { authenticateToken } from '../middleware/auth.js';

const router = Router();
const prisma = new PrismaClient();

interface SearchResult {
  id: string;
  type: 'order' | 'batch' | 'customer' | 'material' | 'shipment' | 'invoice' | 'product' | 'supplier';
  title: string;
  subtitle?: string;
  path: string;
}

router.get('/global', authenticateToken, async (req, res) => {
  try {
    const { q } = req.query;
    
    if (!q || typeof q !== 'string' || q.length < 2) {
      return res.json({ results: [] });
    }

    const query = q.toLowerCase();
    const results: SearchResult[] = [];

    const [orders, batches, customers, materials, shipments, invoices, products, suppliers] = await Promise.all([
      prisma.order.findMany({
        where: {
          OR: [
            { orderNumber: { contains: query, mode: 'insensitive' } },
            { customer: { name: { contains: query, mode: 'insensitive' } } },
            { product: { name: { contains: query, mode: 'insensitive' } } },
          ],
        },
        include: { customer: true, product: true },
        take: 5,
      }),
      prisma.batch.findMany({
        where: {
          OR: [
            { batchNumber: { contains: query, mode: 'insensitive' } },
            { product: { name: { contains: query, mode: 'insensitive' } } },
          ],
        },
        include: { product: true },
        take: 5,
      }),
      prisma.customer.findMany({
        where: {
          OR: [
            { name: { contains: query, mode: 'insensitive' } },
            { code: { contains: query, mode: 'insensitive' } },
            { email: { contains: query, mode: 'insensitive' } },
            { mobile: { contains: query, mode: 'insensitive' } },
          ],
        },
        take: 5,
      }),
      prisma.material.findMany({
        where: {
          OR: [
            { name: { contains: query, mode: 'insensitive' } },
            { code: { contains: query, mode: 'insensitive' } },
          ],
        },
        take: 5,
      }),
      prisma.shipment.findMany({
        where: {
          OR: [
            { shipmentNumber: { contains: query, mode: 'insensitive' } },
            { customer: { name: { contains: query, mode: 'insensitive' } } },
          ],
        },
        include: { customer: true },
        take: 5,
      }),
      prisma.invoice.findMany({
        where: {
          OR: [
            { invoiceNumber: { contains: query, mode: 'insensitive' } },
            { customer: { name: { contains: query, mode: 'insensitive' } } },
          ],
        },
        include: { customer: true },
        take: 5,
      }),
      prisma.product.findMany({
        where: {
          OR: [
            { name: { contains: query, mode: 'insensitive' } },
            { code: { contains: query, mode: 'insensitive' } },
          ],
        },
        take: 5,
      }),
      prisma.supplier.findMany({
        where: {
          OR: [
            { name: { contains: query, mode: 'insensitive' } },
            { code: { contains: query, mode: 'insensitive' } },
          ],
        },
        take: 5,
      }),
    ]);

    orders.forEach(order => {
      results.push({
        id: order.id,
        type: 'order',
        title: order.orderNumber,
        subtitle: `${order.customer?.name || 'Unknown'} - ${order.product?.name || 'Unknown'}`,
        path: `/orders/${order.id}/journey`,
      });
    });

    batches.forEach(batch => {
      results.push({
        id: batch.id,
        type: 'batch',
        title: batch.batchNumber,
        subtitle: batch.product?.name || 'Unknown Product',
        path: `/batches/${batch.id}/journey`,
      });
    });

    customers.forEach(customer => {
      results.push({
        id: customer.id,
        type: 'customer',
        title: customer.name,
        subtitle: customer.code || customer.email || '',
        path: `/customers/${customer.id}`,
      });
    });

    materials.forEach(material => {
      results.push({
        id: material.id,
        type: 'material',
        title: material.name,
        subtitle: material.code || '',
        path: `/materials/${material.id}`,
      });
    });

    shipments.forEach(shipment => {
      results.push({
        id: shipment.id,
        type: 'shipment',
        title: shipment.shipmentNumber,
        subtitle: shipment.customer?.name || 'Unknown Customer',
        path: `/shipments/${shipment.id}`,
      });
    });

    invoices.forEach(invoice => {
      results.push({
        id: invoice.id,
        type: 'invoice',
        title: invoice.invoiceNumber,
        subtitle: `${invoice.customer?.name || 'Unknown'} - SAR ${invoice.totalAmount.toLocaleString()}`,
        path: `/invoices/${invoice.id}`,
      });
    });

    products.forEach(product => {
      results.push({
        id: product.id,
        type: 'product',
        title: product.name,
        subtitle: product.code || '',
        path: `/products/${product.id}`,
      });
    });

    suppliers.forEach(supplier => {
      results.push({
        id: supplier.id,
        type: 'supplier',
        title: supplier.name,
        subtitle: supplier.code || '',
        path: `/suppliers/${supplier.id}`,
      });
    });

    results.sort((a, b) => {
      const aTitle = a.title.toLowerCase();
      const bTitle = b.title.toLowerCase();
      const aExact = aTitle === query;
      const bExact = bTitle === query;
      if (aExact && !bExact) return -1;
      if (!aExact && bExact) return 1;
      const aStarts = aTitle.startsWith(query);
      const bStarts = bTitle.startsWith(query);
      if (aStarts && !bStarts) return -1;
      if (!aStarts && bStarts) return 1;
      return 0;
    });

    res.json({ results: results.slice(0, 15) });
  } catch (error) {
    console.error('Global search error:', error);
    res.status(500).json({ error: 'Search failed' });
  }
});

export default router;
