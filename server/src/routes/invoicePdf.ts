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

    doc.fontSize(20).fillColor('#1e3a5f').text('RadioPharma', 50, 50, { continued: true })
       .fillColor('#0d9488').text(' KSA', { continued: false });
    
    doc.fontSize(9).fillColor('#666666')
       .text('Manufacturing Radiopharmaceuticals', 50, 75)
       .text('King Fahd Road, Riyadh, Saudi Arabia', 50, 87)
       .text('VAT: 300000000000003 | CR: 1010000000', 50, 99);

    doc.fontSize(24).fillColor('#1e3a5f').text('TAX INVOICE', 400, 50, { align: 'right' });
    doc.fontSize(12).fillColor('#666666').text(invoice.invoiceNumber, 400, 78, { align: 'right' });

    const qrBuffer = Buffer.from(qrDataUrl.split(',')[1], 'base64');
    doc.image(qrBuffer, 460, 100, { width: 80 });
    doc.fontSize(7).fillColor('#999999').text('ZATCA e-Invoice QR', 460, 185, { width: 80, align: 'center' });

    doc.rect(50, 210, 250, 80).stroke('#e5e7eb');
    doc.fontSize(9).fillColor('#666666').text('BILL TO:', 60, 220);
    doc.fontSize(11).fillColor('#1e3a5f').text(invoice.customer.nameEn || invoice.customer.name, 60, 235);
    if (invoice.customer.nameAr) {
      doc.font('Helvetica').fontSize(10).text(invoice.customer.nameAr, 60, 250);
    }
    doc.fontSize(9).fillColor('#666666');
    if (invoice.customer.address) doc.text(invoice.customer.address, 60, 265, { width: 230 });

    doc.rect(320, 210, 225, 80).stroke('#e5e7eb');
    doc.fontSize(9).fillColor('#666666');
    doc.text('Invoice Date:', 330, 220);
    doc.text(invoice.invoiceDate.toLocaleDateString('en-GB'), 420, 220);
    doc.text('Due Date:', 330, 237);
    doc.text(invoice.dueDate.toLocaleDateString('en-GB'), 420, 237);
    doc.text('Status:', 330, 254);
    const statusColors: Record<string, string> = {
      PAID: '#22c55e',
      PARTIALLY_PAID: '#eab308',
      SENT: '#f97316',
      DRAFT: '#6b7280',
    };
    doc.fillColor(statusColors[invoice.status] || '#6b7280').text(invoice.status, 420, 254);
    doc.fillColor('#666666').text('Currency:', 330, 271);
    doc.text(invoice.currency, 420, 271);

    const tableTop = 310;
    doc.rect(50, tableTop, 495, 25).fill('#1e3a5f');
    doc.fillColor('#ffffff').fontSize(9);
    doc.text('#', 60, tableTop + 8, { width: 30 });
    doc.text('Description', 90, tableTop + 8, { width: 200 });
    doc.text('Qty', 300, tableTop + 8, { width: 40, align: 'center' });
    doc.text('Unit Price', 350, tableTop + 8, { width: 70, align: 'right' });
    doc.text('Tax %', 430, tableTop + 8, { width: 40, align: 'right' });
    doc.text('Total', 480, tableTop + 8, { width: 55, align: 'right' });

    let yPos = tableTop + 30;
    doc.fillColor('#333333');
    invoice.items.forEach((item, index) => {
      if (index % 2 === 0) {
        doc.rect(50, yPos - 5, 495, 22).fill('#f9fafb');
        doc.fillColor('#333333');
      }
      doc.fontSize(9);
      doc.text((index + 1).toString(), 60, yPos, { width: 30 });
      doc.text(item.description, 90, yPos, { width: 200 });
      doc.text(item.quantity.toString(), 300, yPos, { width: 40, align: 'center' });
      doc.text(`SAR ${item.unitPrice.toFixed(2)}`, 350, yPos, { width: 70, align: 'right' });
      doc.text(`${item.taxPercent}%`, 430, yPos, { width: 40, align: 'right' });
      doc.text(`SAR ${item.lineTotal.toFixed(2)}`, 480, yPos, { width: 55, align: 'right' });
      yPos += 22;
    });

    doc.moveTo(50, yPos + 5).lineTo(545, yPos + 5).stroke('#e5e7eb');
    yPos += 20;

    const summaryX = 380;
    doc.fontSize(9).fillColor('#666666');
    doc.text('Subtotal:', summaryX, yPos);
    doc.fillColor('#333333').text(`SAR ${invoice.subtotal.toFixed(2)}`, 480, yPos, { width: 55, align: 'right' });
    yPos += 18;

    doc.fillColor('#666666').text(`VAT (${invoice.items[0]?.taxPercent || 15}%):`, summaryX, yPos);
    doc.fillColor('#333333').text(`SAR ${invoice.taxAmount.toFixed(2)}`, 480, yPos, { width: 55, align: 'right' });
    yPos += 18;

    if (invoice.discountAmount > 0) {
      doc.fillColor('#22c55e').text('Discount:', summaryX, yPos);
      doc.text(`- SAR ${invoice.discountAmount.toFixed(2)}`, 480, yPos, { width: 55, align: 'right' });
      yPos += 18;
    }

    doc.rect(summaryX - 10, yPos, 185, 25).fill('#1e3a5f');
    doc.fillColor('#ffffff').fontSize(11);
    doc.text('TOTAL:', summaryX, yPos + 7);
    doc.text(`SAR ${invoice.totalAmount.toFixed(2)}`, 480, yPos + 7, { width: 55, align: 'right' });
    yPos += 35;

    if (invoice.paidAmount > 0) {
      doc.fillColor('#22c55e').fontSize(9).text('Paid:', summaryX, yPos);
      doc.text(`SAR ${invoice.paidAmount.toFixed(2)}`, 480, yPos, { width: 55, align: 'right' });
      yPos += 18;

      const balance = invoice.totalAmount - invoice.paidAmount;
      if (balance > 0) {
        doc.fillColor('#f97316').text('Balance Due:', summaryX, yPos);
        doc.text(`SAR ${balance.toFixed(2)}`, 480, yPos, { width: 55, align: 'right' });
        yPos += 18;
      }
    }

    if (invoice.payments.length > 0) {
      yPos += 20;
      doc.fontSize(10).fillColor('#1e3a5f').text('Payment History', 50, yPos);
      yPos += 15;
      doc.fontSize(8).fillColor('#666666');
      invoice.payments.forEach(payment => {
        doc.text(`${payment.paymentDate.toLocaleDateString('en-GB')} - ${payment.paymentMethod.replace('_', ' ')} - SAR ${payment.amount.toFixed(2)}`, 50, yPos);
        yPos += 12;
      });
    }

    doc.rect(50, 750, 495, 50).fill('#f3f4f6');
    doc.fontSize(8).fillColor('#666666');
    doc.text('Bank Details: Saudi National Bank | Account: 1234567890 | IBAN: SA0000000000001234567890', 60, 760, { width: 475 });
    doc.text('Payment Terms: Net 30 days | Late payments may incur interest at 1.5% per month', 60, 775, { width: 475 });
    doc.text('This is a computer-generated invoice and is valid without signature.', 60, 790, { width: 475 });

    doc.end();
  } catch (error) {
    console.error('Generate invoice PDF error:', error);
    res.status(500).json({ error: 'Failed to generate PDF' });
  }
});

export default router;
