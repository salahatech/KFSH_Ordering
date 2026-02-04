import express, { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { authenticateToken } from '../middleware/auth.js';
import PDFDocument from 'pdfkit';
import QRCode from 'qrcode';

const router = express.Router();
const prisma = new PrismaClient();

function createZatcaTlv(sellerName: string, vatNumber: string, timestamp: string, total: number, vat: number): string {
  const toTlv = (tag: number, value: string): Buffer => {
    const valueBuffer = Buffer.from(value, 'utf-8');
    const length = valueBuffer.length;
    return Buffer.concat([Buffer.from([tag, length]), valueBuffer]);
  };

  const tlvData = Buffer.concat([
    toTlv(1, sellerName),
    toTlv(2, vatNumber),
    toTlv(3, timestamp),
    toTlv(4, total.toFixed(2)),
    toTlv(5, vat.toFixed(2)),
  ]);

  return tlvData.toString('base64');
}

function formatStatus(status: string): string {
  const statusMap: Record<string, string> = {
    DRAFT: 'Draft',
    PENDING_APPROVAL: 'Pending Approval',
    ISSUED_POSTED: 'Issued',
    SENT: 'Sent',
    PARTIALLY_PAID: 'Partially Paid',
    PAID: 'Paid',
    OVERDUE: 'Overdue',
    CANCELLED_VOIDED: 'Cancelled',
    CLOSED_ARCHIVED: 'Closed',
  };
  return statusMap[status] || status.replace(/_/g, ' ');
}

router.get('/:id', authenticateToken, async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const user = (req as any).user;

    const invoice = await prisma.invoice.findFirst({
      where: { id },
      include: {
        customer: true,
        items: { include: { product: true } },
        payments: { orderBy: { paymentDate: 'desc' } },
      },
    });

    if (!invoice) {
      res.status(404).json({ error: 'Invoice not found' });
      return;
    }

    const isCustomer = user.customerId != null;
    const isCustomerOwner = user.customerId === invoice.customerId;
    const hasStaffPermission = user.permissions?.some((p: any) => 
      p.resource === 'invoices' && (p.action === 'read' || p.action === 'manage')
    );
    
    if (isCustomer && !isCustomerOwner) {
      res.status(403).json({ error: 'Access denied' });
      return;
    }
    
    if (!isCustomer && !hasStaffPermission) {
      res.status(403).json({ error: 'Access denied - insufficient permissions' });
      return;
    }

    const sellerName = 'RadioPharma KSA';
    const vatNumber = '300000000000003';
    const ksaDate = new Date(invoice.invoiceDate);
    ksaDate.setHours(ksaDate.getHours() + 3);
    const timestamp = ksaDate.toISOString().replace('Z', '+03:00');
    const total = invoice.totalAmount;
    const vat = invoice.taxAmount;

    const zatcaBase64 = createZatcaTlv(sellerName, vatNumber, timestamp, total, vat);
    const qrDataUrl = await QRCode.toDataURL(zatcaBase64, { 
      width: 120,
      margin: 1,
      errorCorrectionLevel: 'M',
    });

    const doc = new PDFDocument({ 
      size: 'A4',
      margin: 50,
      info: {
        Title: `Invoice ${invoice.invoiceNumber}`,
        Author: 'RadioPharma OMS',
      }
    });

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `inline; filename="invoice-${invoice.invoiceNumber}.pdf"`);
    doc.pipe(res);

    doc.rect(0, 0, 612, 130).fill('#f8fafc');

    doc.fontSize(24).fillColor('#1e3a5f').text('RadioPharma', 50, 40, { continued: true })
       .fillColor('#0d9488').text(' KSA', { continued: false });
    
    doc.fontSize(9).fillColor('#64748b')
       .text('Manufacturing Radiopharmaceuticals', 50, 70)
       .text('King Fahd Road, Riyadh, Saudi Arabia', 50, 84)
       .text('VAT: 300000000000003 | CR: 1010000000', 50, 98);

    doc.fontSize(28).fillColor('#1e3a5f').text('INVOICE', 380, 40, { align: 'right' });
    doc.fontSize(11).fillColor('#0d9488').text(invoice.invoiceNumber, 380, 75, { align: 'right' });

    const qrBuffer = Buffer.from(qrDataUrl.split(',')[1], 'base64');
    doc.image(qrBuffer, 480, 90, { width: 70 });

    doc.rect(50, 150, 240, 100).lineWidth(1).stroke('#e2e8f0');
    doc.rect(50, 150, 240, 22).fill('#f1f5f9');
    doc.fontSize(9).fillColor('#64748b').text('BILL TO', 60, 157);
    
    doc.fontSize(12).fillColor('#1e3a5f').text(invoice.customer.name, 60, 180);
    
    let customerY = 198;
    if (invoice.customer.email) {
      doc.fontSize(9).fillColor('#64748b').text(invoice.customer.email, 60, customerY);
      customerY += 14;
    }
    if (invoice.customer.phone) {
      doc.text(invoice.customer.phone, 60, customerY);
      customerY += 14;
    }
    if (invoice.customer.address) {
      doc.text(invoice.customer.address, 60, customerY, { width: 220 });
    }

    doc.rect(310, 150, 235, 100).lineWidth(1).stroke('#e2e8f0');
    doc.rect(310, 150, 235, 22).fill('#f1f5f9');
    doc.fontSize(9).fillColor('#64748b').text('INVOICE DETAILS', 320, 157);
    
    const detailsX1 = 320;
    const detailsX2 = 440;
    let detailsY = 180;
    
    doc.fontSize(9).fillColor('#64748b');
    doc.text('Invoice Date:', detailsX1, detailsY);
    doc.fillColor('#1e293b').text(invoice.invoiceDate.toLocaleDateString('en-GB', { 
      day: '2-digit', month: 'short', year: 'numeric' 
    }), detailsX2, detailsY);
    detailsY += 16;
    
    doc.fillColor('#64748b').text('Due Date:', detailsX1, detailsY);
    doc.fillColor('#1e293b').text(invoice.dueDate.toLocaleDateString('en-GB', {
      day: '2-digit', month: 'short', year: 'numeric'
    }), detailsX2, detailsY);
    detailsY += 16;
    
    doc.fillColor('#64748b').text('Status:', detailsX1, detailsY);
    const statusColors: Record<string, string> = {
      PAID: '#22c55e',
      CLOSED_ARCHIVED: '#22c55e',
      PARTIALLY_PAID: '#f59e0b',
      ISSUED_POSTED: '#3b82f6',
      SENT: '#3b82f6',
      OVERDUE: '#ef4444',
      DRAFT: '#6b7280',
    };
    doc.fillColor(statusColors[invoice.status] || '#6b7280').text(formatStatus(invoice.status), detailsX2, detailsY);
    detailsY += 16;
    
    doc.fillColor('#64748b').text('Currency:', detailsX1, detailsY);
    doc.fillColor('#1e293b').text('SAR (Saudi Riyal)', detailsX2, detailsY);

    const tableTop = 275;
    doc.rect(50, tableTop, 495, 28).fill('#1e3a5f');
    doc.fillColor('#ffffff').fontSize(9).font('Helvetica-Bold');
    doc.text('#', 60, tableTop + 9, { width: 25 });
    doc.text('Description', 85, tableTop + 9, { width: 220 });
    doc.text('Qty', 305, tableTop + 9, { width: 40, align: 'center' });
    doc.text('Unit Price', 345, tableTop + 9, { width: 70, align: 'right' });
    doc.text('Tax', 420, tableTop + 9, { width: 40, align: 'center' });
    doc.text('Total', 465, tableTop + 9, { width: 70, align: 'right' });

    let yPos = tableTop + 32;
    doc.font('Helvetica').fillColor('#334155');
    
    invoice.items.forEach((item, index) => {
      if (index % 2 === 0) {
        doc.rect(50, yPos - 4, 495, 24).fill('#f8fafc');
        doc.fillColor('#334155');
      }
      doc.fontSize(9);
      doc.text((index + 1).toString(), 60, yPos, { width: 25 });
      doc.text(item.description, 85, yPos, { width: 220 });
      doc.text(item.quantity.toString(), 305, yPos, { width: 40, align: 'center' });
      doc.text(`SAR ${item.unitPrice.toFixed(2)}`, 345, yPos, { width: 70, align: 'right' });
      doc.text(`${item.taxPercent}%`, 420, yPos, { width: 40, align: 'center' });
      doc.fillColor('#1e293b').text(`SAR ${item.lineTotal.toFixed(2)}`, 465, yPos, { width: 70, align: 'right' });
      doc.fillColor('#334155');
      yPos += 24;
    });

    doc.moveTo(50, yPos + 8).lineTo(545, yPos + 8).lineWidth(0.5).stroke('#e2e8f0');
    yPos += 25;

    const summaryX = 370;
    const valueX = 465;
    
    doc.fontSize(9).fillColor('#64748b');
    doc.text('Subtotal:', summaryX, yPos);
    doc.fillColor('#1e293b').text(`SAR ${invoice.subtotal.toFixed(2)}`, valueX, yPos, { width: 70, align: 'right' });
    yPos += 20;

    doc.fillColor('#64748b').text(`VAT (${invoice.items[0]?.taxPercent || 15}%):`, summaryX, yPos);
    doc.fillColor('#1e293b').text(`SAR ${invoice.taxAmount.toFixed(2)}`, valueX, yPos, { width: 70, align: 'right' });
    yPos += 20;

    if (invoice.discountAmount > 0) {
      doc.fillColor('#22c55e').text('Discount:', summaryX, yPos);
      doc.text(`- SAR ${invoice.discountAmount.toFixed(2)}`, valueX, yPos, { width: 70, align: 'right' });
      yPos += 20;
    }

    doc.rect(summaryX - 10, yPos, 185, 30).fill('#1e3a5f');
    doc.fillColor('#ffffff').fontSize(12).font('Helvetica-Bold');
    doc.text('TOTAL', summaryX, yPos + 9);
    doc.text(`SAR ${invoice.totalAmount.toFixed(2)}`, valueX, yPos + 9, { width: 70, align: 'right' });
    yPos += 40;

    doc.font('Helvetica');
    
    if (invoice.paidAmount > 0) {
      doc.fillColor('#22c55e').fontSize(9).text('Amount Paid:', summaryX, yPos);
      doc.text(`SAR ${invoice.paidAmount.toFixed(2)}`, valueX, yPos, { width: 70, align: 'right' });
      yPos += 20;

      const balance = invoice.totalAmount - invoice.paidAmount;
      if (balance > 0) {
        doc.rect(summaryX - 10, yPos - 2, 185, 24).fill('#fef2f2');
        doc.fillColor('#dc2626').text('Balance Due:', summaryX, yPos + 5);
        doc.text(`SAR ${balance.toFixed(2)}`, valueX, yPos + 5, { width: 70, align: 'right' });
        yPos += 30;
      }
    }

    if (invoice.payments.length > 0) {
      yPos += 15;
      doc.rect(50, yPos, 250, 22).fill('#f1f5f9');
      doc.fontSize(10).fillColor('#1e3a5f').font('Helvetica-Bold').text('Payment History', 60, yPos + 6);
      yPos += 28;
      doc.font('Helvetica').fontSize(8).fillColor('#64748b');
      invoice.payments.forEach(payment => {
        const paymentDate = payment.paymentDate.toLocaleDateString('en-GB', {
          day: '2-digit', month: 'short', year: 'numeric'
        });
        const method = payment.paymentMethod.replace(/_/g, ' ');
        doc.text(`${paymentDate}  •  ${method}  •  SAR ${payment.amount.toFixed(2)}`, 60, yPos);
        yPos += 14;
      });
    }

    const footerY = 730;
    doc.rect(50, footerY, 495, 70).fill('#f8fafc');
    doc.rect(50, footerY, 495, 1).fill('#e2e8f0');
    
    doc.fontSize(8).fillColor('#64748b');
    doc.font('Helvetica-Bold').text('Bank Details', 60, footerY + 12);
    doc.font('Helvetica').text('Saudi National Bank  |  Account: 1234567890  |  IBAN: SA0000000000001234567890', 60, footerY + 24, { width: 475 });
    
    doc.font('Helvetica-Bold').text('Terms & Conditions', 60, footerY + 42);
    doc.font('Helvetica').text('Payment due within 30 days. Late payments may incur interest at 1.5% per month. This is a computer-generated invoice.', 60, footerY + 54, { width: 475 });

    doc.fontSize(7).fillColor('#94a3b8').text('ZATCA e-Invoice QR', 480, 162, { width: 70, align: 'center' });

    doc.end();
  } catch (error) {
    console.error('Generate invoice PDF error:', error);
    res.status(500).json({ error: 'Failed to generate PDF' });
  }
});

export default router;
