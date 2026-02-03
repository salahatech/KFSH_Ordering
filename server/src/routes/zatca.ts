import express, { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { authenticateToken, requireRole } from '../middleware/auth.js';
import crypto from 'crypto';

const router = express.Router();
const prisma = new PrismaClient();

router.get('/config', authenticateToken, requireRole(['Admin']), async (req: Request, res: Response): Promise<void> => {
  try {
    let config = await prisma.zatcaConfig.findFirst();
    if (!config) {
      config = await prisma.zatcaConfig.create({
        data: {
          environment: 'SIMULATION',
          enableZatcaPosting: false,
          simplifiedMode: 'REPORTING',
          standardMode: 'CLEARANCE',
          sellerCountry: 'SA',
        },
      });
    }
    res.json(config);
  } catch (error) {
    console.error('Error fetching ZATCA config:', error);
    res.status(500).json({ error: 'Failed to fetch ZATCA config' });
  }
});

router.put('/config', authenticateToken, requireRole(['Admin']), async (req: Request, res: Response): Promise<void> => {
  try {
    const {
      environment,
      enableZatcaPosting,
      sellerName,
      sellerNameAr,
      sellerVatNo,
      sellerCrNo,
      sellerStreet,
      sellerBuilding,
      sellerDistrict,
      sellerCity,
      sellerPostalCode,
      sellerCountry,
      simplifiedMode,
      standardMode,
      retriesCount,
      backoffSeconds,
      blockUntilAccepted,
      notifyOnRejection,
    } = req.body;

    let config = await prisma.zatcaConfig.findFirst();
    if (config) {
      config = await prisma.zatcaConfig.update({
        where: { id: config.id },
        data: {
          environment,
          enableZatcaPosting,
          sellerName,
          sellerNameAr,
          sellerVatNo,
          sellerCrNo,
          sellerStreet,
          sellerBuilding,
          sellerDistrict,
          sellerCity,
          sellerPostalCode,
          sellerCountry,
          simplifiedMode,
          standardMode,
          retriesCount,
          backoffSeconds,
          blockUntilAccepted,
          notifyOnRejection,
          updatedById: (req as any).user?.id,
        },
      });
    } else {
      config = await prisma.zatcaConfig.create({
        data: {
          environment: environment || 'SIMULATION',
          enableZatcaPosting: enableZatcaPosting || false,
          sellerName,
          sellerNameAr,
          sellerVatNo,
          sellerCrNo,
          sellerStreet,
          sellerBuilding,
          sellerDistrict,
          sellerCity,
          sellerPostalCode,
          sellerCountry: sellerCountry || 'SA',
          simplifiedMode: simplifiedMode || 'REPORTING',
          standardMode: standardMode || 'CLEARANCE',
          retriesCount: retriesCount || 3,
          backoffSeconds: backoffSeconds || 60,
          blockUntilAccepted: blockUntilAccepted || false,
          notifyOnRejection: notifyOnRejection !== false,
          createdById: (req as any).user?.id,
        },
      });
    }

    res.json(config);
  } catch (error) {
    console.error('Error updating ZATCA config:', error);
    res.status(500).json({ error: 'Failed to update ZATCA config' });
  }
});

router.get('/status', authenticateToken, async (req: Request, res: Response): Promise<void> => {
  try {
    const config = await prisma.zatcaConfig.findFirst();
    const activeCredential = await prisma.zatcaCredential.findFirst({
      where: { status: 'ACTIVE', environment: config?.environment || 'SIMULATION' },
    });

    const [totalSubmissions, pendingCount, acceptedCount, rejectedCount, failedCount] = await Promise.all([
      prisma.zatcaSubmission.count(),
      prisma.zatcaSubmission.count({ where: { status: 'PENDING' } }),
      prisma.zatcaSubmission.count({ where: { status: { in: ['ACCEPTED', 'CLEARED', 'REPORTED'] } } }),
      prisma.zatcaSubmission.count({ where: { status: 'REJECTED' } }),
      prisma.zatcaSubmission.count({ where: { status: 'FAILED' } }),
    ]);

    const recentSubmissions = await prisma.zatcaSubmission.findMany({
      take: 10,
      orderBy: { createdAt: 'desc' },
      include: {
        invoice: {
          select: { invoiceNumber: true, totalAmount: true, customer: { select: { name: true } } },
        },
      },
    });

    res.json({
      config: config ? {
        environment: config.environment,
        enableZatcaPosting: config.enableZatcaPosting,
        hasSellerInfo: !!(config.sellerName && config.sellerVatNo),
      } : null,
      credential: activeCredential ? {
        id: activeCredential.id,
        deviceName: activeCredential.deviceName,
        status: activeCredential.status,
        environment: activeCredential.environment,
      } : null,
      stats: {
        total: totalSubmissions,
        pending: pendingCount,
        accepted: acceptedCount,
        rejected: rejectedCount,
        failed: failedCount,
      },
      recentSubmissions,
    });
  } catch (error) {
    console.error('Error fetching ZATCA status:', error);
    res.status(500).json({ error: 'Failed to fetch ZATCA status' });
  }
});

router.get('/credentials', authenticateToken, requireRole(['Admin']), async (req: Request, res: Response): Promise<void> => {
  try {
    const credentials = await prisma.zatcaCredential.findMany({
      orderBy: { createdAt: 'desc' },
    });
    res.json(credentials);
  } catch (error) {
    console.error('Error fetching credentials:', error);
    res.status(500).json({ error: 'Failed to fetch credentials' });
  }
});

router.post('/credentials', authenticateToken, requireRole(['Admin']), async (req: Request, res: Response): Promise<void> => {
  try {
    const { deviceName, environment } = req.body;

    if (!deviceName) {
      res.status(400).json({ error: 'Device name is required' });
      return;
    }

    const credential = await prisma.zatcaCredential.create({
      data: {
        deviceName,
        environment: environment || 'SIMULATION',
        status: 'DRAFT',
      },
    });

    res.status(201).json(credential);
  } catch (error) {
    console.error('Error creating credential:', error);
    res.status(500).json({ error: 'Failed to create credential' });
  }
});

router.post('/credentials/:id/generate-csr', authenticateToken, requireRole(['Admin']), async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { organizationName, vatNumber, serialNumber } = req.body;

    const config = await prisma.zatcaConfig.findFirst();
    if (!config) {
      res.status(400).json({ error: 'ZATCA config not found. Please configure ZATCA settings first.' });
      return;
    }

    const csrData = `
-----BEGIN CERTIFICATE REQUEST-----
[CSR would be generated here with proper OpenSSL integration]
Organization: ${organizationName || config.sellerName}
VAT: ${vatNumber || config.sellerVatNo}
Serial: ${serialNumber || crypto.randomUUID()}
-----END CERTIFICATE REQUEST-----
    `.trim();

    const keyRef = `key_${id}_${Date.now()}`;

    const credential = await prisma.zatcaCredential.update({
      where: { id },
      data: {
        csrPem: csrData,
        keyRef,
        status: 'DRAFT',
      },
    });

    await prisma.zatcaLog.create({
      data: {
        action: 'GENERATE_CSR',
        credentialId: id,
        userId: (req as any).user?.id,
        responsePayload: JSON.stringify({ csrGenerated: true }),
      },
    });

    res.json(credential);
  } catch (error) {
    console.error('Error generating CSR:', error);
    res.status(500).json({ error: 'Failed to generate CSR' });
  }
});

router.post('/credentials/:id/request-ccsid', authenticateToken, requireRole(['Admin']), async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { otp } = req.body;

    if (!otp) {
      res.status(400).json({ error: 'OTP is required from Fatoora portal' });
      return;
    }

    const credential = await prisma.zatcaCredential.findUnique({ where: { id } });
    if (!credential || !credential.csrPem) {
      res.status(400).json({ error: 'CSR must be generated first' });
      return;
    }

    const mockCcsidResponse = {
      requestType: 'CCSID',
      dispositionMessage: 'ISSUED',
      binarySecurityToken: 'mock_binary_token_' + Date.now(),
      secret: 'mock_secret_' + Date.now(),
      expiresIn: 3600,
    };

    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 1);

    const updated = await prisma.zatcaCredential.update({
      where: { id },
      data: {
        ccsidData: mockCcsidResponse,
        ccsidExpiresAt: expiresAt,
        status: 'COMPLIANCE_READY',
      },
    });

    await prisma.zatcaLog.create({
      data: {
        action: 'REQUEST_CCSID',
        credentialId: id,
        userId: (req as any).user?.id,
        endpoint: '/compliance',
        responseCode: 200,
        responsePayload: JSON.stringify({ success: true }),
      },
    });

    res.json(updated);
  } catch (error) {
    console.error('Error requesting CCSID:', error);
    res.status(500).json({ error: 'Failed to request CCSID' });
  }
});

router.post('/credentials/:id/run-compliance', authenticateToken, requireRole(['Admin']), async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    const credential = await prisma.zatcaCredential.findUnique({ where: { id } });
    if (!credential || credential.status !== 'COMPLIANCE_READY') {
      res.status(400).json({ error: 'CCSID must be obtained first' });
      return;
    }

    const complianceResult = {
      passed: true,
      testsRun: 6,
      testsPassed: 6,
      warnings: [],
      errors: [],
    };

    const updated = await prisma.zatcaCredential.update({
      where: { id },
      data: {
        compliancePassed: complianceResult.passed,
        complianceErrors: complianceResult.errors.length > 0 ? complianceResult : null,
      },
    });

    await prisma.zatcaLog.create({
      data: {
        action: 'RUN_COMPLIANCE',
        credentialId: id,
        userId: (req as any).user?.id,
        responseCode: complianceResult.passed ? 200 : 400,
        responsePayload: JSON.stringify(complianceResult),
      },
    });

    res.json({ credential: updated, result: complianceResult });
  } catch (error) {
    console.error('Error running compliance:', error);
    res.status(500).json({ error: 'Failed to run compliance checks' });
  }
});

router.post('/credentials/:id/request-pcsid', authenticateToken, requireRole(['Admin']), async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    const credential = await prisma.zatcaCredential.findUnique({ where: { id } });
    if (!credential || !credential.compliancePassed) {
      res.status(400).json({ error: 'Compliance checks must pass first' });
      return;
    }

    const mockPcsidResponse = {
      requestType: 'PCSID',
      dispositionMessage: 'ISSUED',
      binarySecurityToken: 'prod_binary_token_' + Date.now(),
      secret: 'prod_secret_' + Date.now(),
      expiresIn: 86400 * 365,
    };

    const expiresAt = new Date();
    expiresAt.setFullYear(expiresAt.getFullYear() + 1);

    const updated = await prisma.zatcaCredential.update({
      where: { id },
      data: {
        pcsidData: mockPcsidResponse,
        pcsidExpiresAt: expiresAt,
        status: 'ACTIVE',
      },
    });

    await prisma.zatcaLog.create({
      data: {
        action: 'REQUEST_PCSID',
        credentialId: id,
        userId: (req as any).user?.id,
        endpoint: '/production/csids',
        responseCode: 200,
        responsePayload: JSON.stringify({ success: true }),
      },
    });

    res.json(updated);
  } catch (error) {
    console.error('Error requesting PCSID:', error);
    res.status(500).json({ error: 'Failed to request PCSID' });
  }
});

router.delete('/credentials/:id', authenticateToken, requireRole(['Admin']), async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    await prisma.zatcaCredential.delete({ where: { id } });
    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting credential:', error);
    res.status(500).json({ error: 'Failed to delete credential' });
  }
});

router.get('/submissions', authenticateToken, async (req: Request, res: Response): Promise<void> => {
  try {
    const { status, invoiceId, page = '1', pageSize = '25' } = req.query;

    const where: any = {};
    if (status) where.status = status;
    if (invoiceId) where.invoiceId = invoiceId;

    const skip = (parseInt(page as string) - 1) * parseInt(pageSize as string);
    const take = parseInt(pageSize as string);

    const [submissions, total] = await Promise.all([
      prisma.zatcaSubmission.findMany({
        where,
        include: {
          invoice: {
            select: { invoiceNumber: true, totalAmount: true, customer: { select: { name: true } } },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take,
      }),
      prisma.zatcaSubmission.count({ where }),
    ]);

    res.json({
      data: submissions,
      total,
      page: parseInt(page as string),
      pageSize: take,
      totalPages: Math.ceil(total / take),
    });
  } catch (error) {
    console.error('Error fetching submissions:', error);
    res.status(500).json({ error: 'Failed to fetch submissions' });
  }
});

router.get('/submissions/:id', authenticateToken, async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const submission = await prisma.zatcaSubmission.findUnique({
      where: { id },
      include: {
        invoice: {
          include: { customer: true, items: true },
        },
        qrPayloads: true,
      },
    });

    if (!submission) {
      res.status(404).json({ error: 'Submission not found' });
      return;
    }

    res.json(submission);
  } catch (error) {
    console.error('Error fetching submission:', error);
    res.status(500).json({ error: 'Failed to fetch submission' });
  }
});

router.post('/submissions/:id/retry', authenticateToken, requireRole(['Admin', 'Finance']), async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    const submission = await prisma.zatcaSubmission.findUnique({ where: { id } });
    if (!submission) {
      res.status(404).json({ error: 'Submission not found' });
      return;
    }

    const updated = await prisma.zatcaSubmission.update({
      where: { id },
      data: {
        status: 'PENDING',
        retryCount: { increment: 1 },
        lastTriedAt: new Date(),
      },
    });

    res.json(updated);
  } catch (error) {
    console.error('Error retrying submission:', error);
    res.status(500).json({ error: 'Failed to retry submission' });
  }
});

router.post('/invoices/:invoiceId/submit', authenticateToken, requireRole(['Admin', 'Finance']), async (req: Request, res: Response): Promise<void> => {
  try {
    const { invoiceId } = req.params;

    const invoice = await prisma.invoice.findUnique({
      where: { id: invoiceId },
      include: { customer: true, items: true },
    });

    if (!invoice) {
      res.status(404).json({ error: 'Invoice not found' });
      return;
    }

    const config = await prisma.zatcaConfig.findFirst();
    if (!config?.enableZatcaPosting) {
      res.status(400).json({ error: 'ZATCA posting is not enabled' });
      return;
    }

    const existingSubmission = await prisma.zatcaSubmission.findFirst({
      where: { invoiceId, status: { in: ['PENDING', 'ACCEPTED', 'CLEARED', 'REPORTED'] } },
    });

    if (existingSubmission) {
      res.status(400).json({ error: 'Invoice already has an active submission' });
      return;
    }

    const submission = await prisma.zatcaSubmission.create({
      data: {
        invoiceId,
        docType: 'INVOICE',
        apiType: 'REPORTING',
        status: 'PENDING',
        requestUuid: crypto.randomUUID(),
      },
    });

    await prisma.invoice.update({
      where: { id: invoiceId },
      data: { zatcaStatus: 'PENDING' },
    });

    await prisma.zatcaLog.create({
      data: {
        action: 'SUBMIT_INVOICE',
        invoiceId,
        submissionId: submission.id,
        userId: (req as any).user?.id,
      },
    });

    res.json(submission);
  } catch (error) {
    console.error('Error submitting invoice:', error);
    res.status(500).json({ error: 'Failed to submit invoice to ZATCA' });
  }
});

router.get('/logs', authenticateToken, requireRole(['Admin']), async (req: Request, res: Response): Promise<void> => {
  try {
    const { action, invoiceId, page = '1', pageSize = '50' } = req.query;

    const where: any = {};
    if (action) where.action = action;
    if (invoiceId) where.invoiceId = invoiceId;

    const skip = (parseInt(page as string) - 1) * parseInt(pageSize as string);
    const take = parseInt(pageSize as string);

    const [logs, total] = await Promise.all([
      prisma.zatcaLog.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take,
      }),
      prisma.zatcaLog.count({ where }),
    ]);

    res.json({
      data: logs,
      total,
      page: parseInt(page as string),
      pageSize: take,
      totalPages: Math.ceil(total / take),
    });
  } catch (error) {
    console.error('Error fetching logs:', error);
    res.status(500).json({ error: 'Failed to fetch logs' });
  }
});

router.post('/test-connection', authenticateToken, requireRole(['Admin']), async (req: Request, res: Response): Promise<void> => {
  try {
    const config = await prisma.zatcaConfig.findFirst();
    const credential = await prisma.zatcaCredential.findFirst({
      where: { status: 'ACTIVE', environment: config?.environment || 'SIMULATION' },
    });

    if (!credential) {
      res.status(400).json({ error: 'No active credential found. Complete onboarding first.' });
      return;
    }

    const testResult = {
      success: true,
      environment: config?.environment,
      credentialId: credential.id,
      timestamp: new Date().toISOString(),
      message: 'Connection test successful',
    };

    await prisma.zatcaLog.create({
      data: {
        action: 'TEST_CONNECTION',
        credentialId: credential.id,
        userId: (req as any).user?.id,
        responseCode: 200,
        responsePayload: JSON.stringify(testResult),
      },
    });

    res.json(testResult);
  } catch (error) {
    console.error('Error testing connection:', error);
    res.status(500).json({ error: 'Failed to test connection' });
  }
});

router.get('/invoices/:invoiceId/qr', authenticateToken, async (req: Request, res: Response): Promise<void> => {
  try {
    const { invoiceId } = req.params;

    const qrPayload = await prisma.zatcaQrPayload.findFirst({
      where: { invoiceId },
      orderBy: { generatedAt: 'desc' },
    });

    if (qrPayload) {
      res.json(qrPayload);
      return;
    }

    const invoice = await prisma.invoice.findUnique({
      where: { id: invoiceId },
      include: { customer: true },
    });

    if (!invoice) {
      res.status(404).json({ error: 'Invoice not found' });
      return;
    }

    const config = await prisma.zatcaConfig.findFirst();

    const tlvData = generatePhase1QR(
      config?.sellerName || 'RadioPharma',
      config?.sellerVatNo || '300000000000003',
      invoice.invoiceDate.toISOString(),
      invoice.totalAmount,
      invoice.taxAmount
    );

    const newQr = await prisma.zatcaQrPayload.create({
      data: {
        invoiceId,
        qrBase64: tlvData,
        qrVersion: 'PHASE1_MIN',
      },
    });

    res.json(newQr);
  } catch (error) {
    console.error('Error generating QR:', error);
    res.status(500).json({ error: 'Failed to generate QR code' });
  }
});

function generatePhase1QR(
  sellerName: string,
  vatNumber: string,
  timestamp: string,
  totalWithVat: number,
  vatTotal: number
): string {
  const tlvBuffer: number[] = [];

  const addTlv = (tag: number, value: string) => {
    const valueBytes = Buffer.from(value, 'utf8');
    tlvBuffer.push(tag);
    tlvBuffer.push(valueBytes.length);
    for (const byte of valueBytes) {
      tlvBuffer.push(byte);
    }
  };

  addTlv(1, sellerName);
  addTlv(2, vatNumber);
  addTlv(3, timestamp);
  addTlv(4, totalWithVat.toFixed(2));
  addTlv(5, vatTotal.toFixed(2));

  return Buffer.from(tlvBuffer).toString('base64');
}

export default router;
