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
      width: 100,
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

    doc.rect(0, 0, 612, 120).fill('#f8fafc');

    doc.fontSize(22).fillColor('#1e3a5f').text('RadioPharma', 50, 35, { continued: true })
       .fillColor('#0d9488').text(' KSA', { continued: false });
    
    doc.fontSize(9).fillColor('#64748b')
       .text('Manufacturing Radiopharmaceuticals', 50, 62)
       .text('King Fahd Road, Riyadh, Saudi Arabia', 50, 75)
       .text('VAT: 300000000000003 | CR: 1010000000', 50, 88);

    doc.fontSize(26).fillColor('#1e3a5f').text('INVOICE', 400, 35, { align: 'right' });
    doc.fontSize(10).fillColor('#0d9488').text(invoice.invoiceNumber, 400, 65, { align: 'right' });

    const qrBuffer = Buffer.from(qrDataUrl.split(',')[1], 'base64');
    doc.image(qrBuffer, 490, 78, { width: 55 });

    const boxTop = 140;
    const boxHeight = 95;
    
    doc.rect(50, boxTop, 235, boxHeight).lineWidth(1).stroke('#e2e8f0');
    doc.rect(50, boxTop, 235, 20).fill('#f1f5f9');
    doc.fontSize(8).fillColor('#64748b').font('Helvetica-Bold').text('BILL TO', 60, boxTop + 6);
    doc.font('Helvetica');
    
    doc.fontSize(11).fillColor('#1e3a5f').text(invoice.customer.name, 60, boxTop + 28);
    
    let customerY = boxTop + 44;
    doc.fontSize(8).fillColor('#64748b');
    if (invoice.customer.email) {
      doc.text(invoice.customer.email, 60, customerY, { width: 215 });
      customerY += 12;
    }
    if (invoice.customer.phone) {
      doc.text(invoice.customer.phone, 60, customerY, { width: 215 });
      customerY += 12;
    }
    if (invoice.customer.address) {
      doc.text(invoice.customer.address, 60, customerY, { width: 215 });
    }

    doc.rect(305, boxTop, 240, boxHeight).lineWidth(1).stroke('#e2e8f0');
    doc.rect(305, boxTop, 240, 20).fill('#f1f5f9');
    doc.fontSize(8).fillColor('#64748b').font('Helvetica-Bold').text('INVOICE DETAILS', 315, boxTop + 6);
    doc.font('Helvetica');
    
    const detailsX1 = 315;
    const detailsX2 = 430;
    let detailsY = boxTop + 28;
    
    doc.fontSize(9).fillColor('#64748b');
    doc.text('Invoice Date:', detailsX1, detailsY);
    doc.fillColor('#1e293b').text(invoice.invoiceDate.toLocaleDateString('en-GB', { 
      day: '2-digit', month: 'short', year: 'numeric' 
    }), detailsX2, detailsY);
    detailsY += 14;
    
    doc.fillColor('#64748b').text('Due Date:', detailsX1, detailsY);
    doc.fillColor('#1e293b').text(invoice.dueDate.toLocaleDateString('en-GB', {
      day: '2-digit', month: 'short', year: 'numeric'
    }), detailsX2, detailsY);
    detailsY += 14;
    
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
    detailsY += 14;
    
    doc.fillColor('#64748b').text('Currency:', detailsX1, detailsY);
    doc.fillColor('#1e293b').text('SAR (Saudi Riyal)', detailsX2, detailsY);

    const tableTop = boxTop + boxHeight + 20;
    doc.rect(50, tableTop, 495, 24).fill('#1e3a5f');
    doc.fillColor('#ffffff').fontSize(8).font('Helvetica-Bold');
    doc.text('#', 58, tableTop + 8, { width: 25 });
    doc.text('Description', 83, tableTop + 8, { width: 200 });
    doc.text('Qty', 290, tableTop + 8, { width: 45, align: 'center' });
    doc.text('Unit Price', 340, tableTop + 8, { width: 65, align: 'right' });
    doc.text('Tax', 410, tableTop + 8, { width: 35, align: 'center' });
    doc.text('Total', 450, tableTop + 8, { width: 85, align: 'right' });

    let yPos = tableTop + 28;
    doc.font('Helvetica').fillColor('#334155');
    
    if (invoice.items.length === 0) {
      doc.rect(50, yPos - 2, 495, 22).fill('#f8fafc');
      doc.fontSize(8).fillColor('#94a3b8').text('No line items', 50, yPos + 4, { width: 495, align: 'center' });
      yPos += 26;
    } else {
      invoice.items.forEach((item, index) => {
        if (index % 2 === 0) {
          doc.rect(50, yPos - 2, 495, 22).fill('#f8fafc');
        }
        doc.fillColor('#334155').fontSize(8);
        doc.text((index + 1).toString(), 58, yPos, { width: 25 });
        doc.text(item.description, 83, yPos, { width: 200 });
        doc.text(item.quantity.toString(), 290, yPos, { width: 45, align: 'center' });
        doc.text(`SAR ${item.unitPrice.toFixed(2)}`, 340, yPos, { width: 65, align: 'right' });
        doc.text(`${item.taxPercent}%`, 410, yPos, { width: 35, align: 'center' });
        doc.fillColor('#1e293b').text(`SAR ${item.lineTotal.toFixed(2)}`, 450, yPos, { width: 85, align: 'right' });
        yPos += 22;
      });
    }

    doc.moveTo(50, yPos + 6).lineTo(545, yPos + 6).lineWidth(0.5).stroke('#e2e8f0');
    yPos += 22;

    const summaryX = 360;
    const valueX = 450;
    
    doc.fontSize(9).fillColor('#64748b');
    doc.text('Subtotal:', summaryX, yPos);
    doc.fillColor('#1e293b').text(`SAR ${invoice.subtotal.toFixed(2)}`, valueX, yPos, { width: 85, align: 'right' });
    yPos += 18;

    doc.fillColor('#64748b').text(`VAT (${invoice.items[0]?.taxPercent || 15}%):`, summaryX, yPos);
    doc.fillColor('#1e293b').text(`SAR ${invoice.taxAmount.toFixed(2)}`, valueX, yPos, { width: 85, align: 'right' });
    yPos += 18;

    if (invoice.discountAmount > 0) {
      doc.fillColor('#22c55e').text('Discount:', summaryX, yPos);
      doc.text(`- SAR ${invoice.discountAmount.toFixed(2)}`, valueX, yPos, { width: 85, align: 'right' });
      yPos += 18;
    }

    doc.rect(summaryX - 10, yPos, 195, 28).fill('#1e3a5f');
    doc.fillColor('#ffffff').fontSize(11).font('Helvetica-Bold');
    doc.text('TOTAL', summaryX, yPos + 8);
    doc.text(`SAR ${invoice.totalAmount.toFixed(2)}`, valueX, yPos + 8, { width: 85, align: 'right' });
    yPos += 38;

    doc.font('Helvetica');
    
    if (invoice.paidAmount > 0) {
      doc.fillColor('#22c55e').fontSize(9).text('Amount Paid:', summaryX, yPos);
      doc.text(`SAR ${invoice.paidAmount.toFixed(2)}`, valueX, yPos, { width: 85, align: 'right' });
      yPos += 18;

      const balance = invoice.totalAmount - invoice.paidAmount;
      if (balance > 0) {
        doc.rect(summaryX - 10, yPos - 2, 195, 22).fill('#fef2f2');
        doc.fillColor('#dc2626').text('Balance Due:', summaryX, yPos + 4);
        doc.text(`SAR ${balance.toFixed(2)}`, valueX, yPos + 4, { width: 85, align: 'right' });
        yPos += 28;
      }
    }

    if (invoice.payments.length > 0) {
      yPos += 12;
      doc.rect(50, yPos, 220, 20).fill('#f1f5f9');
      doc.fontSize(9).fillColor('#1e3a5f').font('Helvetica-Bold').text('Payment History', 60, yPos + 5);
      yPos += 26;
      doc.font('Helvetica').fontSize(8).fillColor('#64748b');
      invoice.payments.forEach(payment => {
        const paymentDate = payment.paymentDate.toLocaleDateString('en-GB', {
          day: '2-digit', month: 'short', year: 'numeric'
        });
        const method = payment.paymentMethod.replace(/_/g, ' ');
        doc.text(`${paymentDate}  |  ${method}  |  SAR ${payment.amount.toFixed(2)}`, 60, yPos);
        yPos += 12;
      });
    }

    const footerY = 720;
    doc.rect(50, footerY, 495, 65).fill('#f8fafc');
    doc.rect(50, footerY, 495, 1).fill('#e2e8f0');
    
    doc.fontSize(8).fillColor('#64748b');
    doc.font('Helvetica-Bold').text('Bank Details', 60, footerY + 10);
    doc.font('Helvetica').text('Saudi National Bank  |  Account: 1234567890  |  IBAN: SA0000000000001234567890', 60, footerY + 22, { width: 475 });
    
    doc.font('Helvetica-Bold').text('Terms & Conditions', 60, footerY + 40);
    doc.font('Helvetica').text('Payment due within 30 days. Late payments may incur interest at 1.5% per month. This is a computer-generated invoice.', 60, footerY + 52, { width: 475 });

    doc.end();
  } catch (error) {
    console.error('Generate invoice PDF error:', error);
    res.status(500).json({ error: 'Failed to generate PDF' });
  }
});

export default router;
