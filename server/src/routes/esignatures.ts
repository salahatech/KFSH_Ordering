import { Router, Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import { authenticateToken } from '../middleware/auth';

const router = Router();
const prisma = new PrismaClient();

router.use(authenticateToken);

const SIGNATURE_MEANINGS: Record<string, string[]> = {
  BATCH_RELEASE: [
    'I confirm that this batch meets all release criteria',
    'I have reviewed and approve the batch for release',
    'Quality release approval',
  ],
  QC_APPROVAL: [
    'I confirm all QC tests have been completed and meet specifications',
    'QC review and approval',
    'Test results verified and approved',
  ],
  DEVIATION_APPROVAL: [
    'I have investigated and approve the deviation closure',
    'Deviation reviewed and closed',
    'CAPA actions verified complete',
  ],
  MASTERDATA_CHANGE: [
    'I approve this master data change',
    'Change reviewed and authorized',
    'Specification change approved',
  ],
  RECIPE_ACTIVATION: [
    'I approve this recipe for production use',
    'Recipe reviewed and activated',
    'Manufacturing formula authorized',
  ],
  PO_APPROVAL: [
    'I approve this purchase order',
    'Procurement approved',
  ],
  FINANCIAL_APPROVAL: [
    'I authorize this financial transaction',
    'Financial approval granted',
    'Payment/invoice approved',
  ],
  DISPENSING_APPROVAL: [
    'I confirm the dispensing is accurate and complete',
    'Dose verification and approval',
    'Patient dose released',
  ],
};

const VALID_SCOPES = Object.keys(SIGNATURE_MEANINGS);

router.get('/meanings/:scope', async (req: Request, res: Response) => {
  try {
    const { scope } = req.params;
    const meanings = SIGNATURE_MEANINGS[scope] || [];
    res.json(meanings);
  } catch (error) {
    console.error('Error fetching meanings:', error);
    res.status(500).json({ error: 'Failed to fetch signature meanings' });
  }
});

router.get('/scopes', async (req: Request, res: Response) => {
  try {
    const scopes = Object.keys(SIGNATURE_MEANINGS).map(scope => ({
      value: scope,
      label: scope.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
    }));
    res.json(scopes);
  } catch (error) {
    console.error('Error fetching scopes:', error);
    res.status(500).json({ error: 'Failed to fetch signature scopes' });
  }
});

router.post('/verify-password', async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id;
    const { password } = req.body;
    
    if (!password) {
      return res.status(400).json({ error: 'Password is required' });
    }
    
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, password: true, email: true, firstName: true, lastName: true },
    });
    
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    const isValid = await bcrypt.compare(password, user.password);
    
    if (!isValid) {
      await prisma.auditLog.create({
        data: {
          userId,
          action: 'ESIGNATURE_AUTH_FAILED',
          entityType: 'ESignature',
          entityId: 'verification',
          newValues: { reason: 'Invalid password provided for e-signature' },
        },
      });
      return res.status(401).json({ error: 'Invalid password' });
    }
    
    res.json({
      verified: true,
      user: {
        id: user.id,
        email: user.email,
        name: `${user.firstName} ${user.lastName}`,
      },
    });
  } catch (error) {
    console.error('Error verifying password:', error);
    res.status(500).json({ error: 'Failed to verify password' });
  }
});

router.post('/sign', async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id;
    const { password, scope, entityType, entityId, meaning, comment, metadata } = req.body;
    
    if (!password || !scope || !entityType || !entityId || !meaning) {
      return res.status(400).json({
        error: 'Password, scope, entityType, entityId, and meaning are required',
      });
    }
    
    if (!VALID_SCOPES.includes(scope)) {
      return res.status(400).json({ error: 'Invalid signature scope' });
    }
    
    const validMeanings = SIGNATURE_MEANINGS[scope] || [];
    if (!validMeanings.includes(meaning)) {
      return res.status(400).json({ 
        error: 'Invalid meaning for this scope. Please select from the approved meanings.',
        validMeanings,
      });
    }
    
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, password: true, email: true, firstName: true, lastName: true },
    });
    
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    const isValid = await bcrypt.compare(password, user.password);
    
    if (!isValid) {
      await prisma.auditLog.create({
        data: {
          userId,
          action: 'ESIGNATURE_AUTH_FAILED',
          entityType: 'ESignature',
          entityId,
          newValues: {
            scope,
            entityType,
            entityId,
            reason: 'Invalid password during e-signature attempt',
          },
        },
      });
      return res.status(401).json({ error: 'Invalid password - signature rejected' });
    }
    
    const existingSignature = await prisma.eSignature.findFirst({
      where: {
        scope,
        entityType,
        entityId,
        signedById: userId,
      },
    });
    
    if (existingSignature) {
      return res.status(400).json({
        error: 'You have already signed this record with the same scope',
      });
    }
    
    const signature = await prisma.eSignature.create({
      data: {
        scope,
        entityType,
        entityId,
        signedById: userId,
        meaning,
        comment,
        metadata: metadata || {},
      },
      include: {
        signedBy: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
          },
        },
      },
    });
    
    await prisma.auditLog.create({
      data: {
        userId,
        action: 'ESIGNATURE_CREATED',
        entityType: 'ESignature',
        entityId: signature.id,
        newValues: {
          scope,
          targetEntityType: entityType,
          targetEntityId: entityId,
          meaning,
          comment,
          signedAt: signature.signedAt,
        },
      },
    });
    
    res.status(201).json({
      success: true,
      signature: {
        id: signature.id,
        scope: signature.scope,
        entityType: signature.entityType,
        entityId: signature.entityId,
        meaning: signature.meaning,
        comment: signature.comment,
        signedAt: signature.signedAt,
        signedBy: {
          id: signature.signedBy.id,
          name: `${signature.signedBy.firstName} ${signature.signedBy.lastName}`,
          email: signature.signedBy.email,
        },
      },
    });
  } catch (error) {
    console.error('Error creating signature:', error);
    res.status(500).json({ error: 'Failed to create signature' });
  }
});

router.get('/entity/:entityType/:entityId', async (req: Request, res: Response) => {
  try {
    const { entityType, entityId } = req.params;
    const { scope } = req.query;
    
    const where: any = { entityType, entityId };
    if (scope) {
      where.scope = scope;
    }
    
    const signatures = await prisma.eSignature.findMany({
      where,
      include: {
        signedBy: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
          },
        },
      },
      orderBy: { signedAt: 'desc' },
    });
    
    res.json(signatures.map(sig => ({
      id: sig.id,
      scope: sig.scope,
      entityType: sig.entityType,
      entityId: sig.entityId,
      meaning: sig.meaning,
      comment: sig.comment,
      signedAt: sig.signedAt,
      signedBy: {
        id: sig.signedBy.id,
        name: `${sig.signedBy.firstName} ${sig.signedBy.lastName}`,
        email: sig.signedBy.email,
      },
      metadata: sig.metadata,
    })));
  } catch (error) {
    console.error('Error fetching signatures:', error);
    res.status(500).json({ error: 'Failed to fetch signatures' });
  }
});

router.get('/user/:userId', async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;
    const { limit = '20', offset = '0' } = req.query;
    
    const signatures = await prisma.eSignature.findMany({
      where: { signedById: userId },
      include: {
        signedBy: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
          },
        },
      },
      orderBy: { signedAt: 'desc' },
      take: parseInt(limit as string),
      skip: parseInt(offset as string),
    });
    
    const total = await prisma.eSignature.count({
      where: { signedById: userId },
    });
    
    res.json({
      signatures: signatures.map(sig => ({
        id: sig.id,
        scope: sig.scope,
        entityType: sig.entityType,
        entityId: sig.entityId,
        meaning: sig.meaning,
        comment: sig.comment,
        signedAt: sig.signedAt,
      })),
      total,
      limit: parseInt(limit as string),
      offset: parseInt(offset as string),
    });
  } catch (error) {
    console.error('Error fetching user signatures:', error);
    res.status(500).json({ error: 'Failed to fetch user signatures' });
  }
});

router.get('/verify/:signatureId', async (req: Request, res: Response) => {
  try {
    const { signatureId } = req.params;
    
    const signature = await prisma.eSignature.findUnique({
      where: { id: signatureId },
      include: {
        signedBy: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
            isActive: true,
          },
        },
      },
    });
    
    if (!signature) {
      return res.status(404).json({ error: 'Signature not found', valid: false });
    }
    
    res.json({
      valid: true,
      signature: {
        id: signature.id,
        scope: signature.scope,
        entityType: signature.entityType,
        entityId: signature.entityId,
        meaning: signature.meaning,
        comment: signature.comment,
        signedAt: signature.signedAt,
        signedBy: {
          id: signature.signedBy.id,
          name: `${signature.signedBy.firstName} ${signature.signedBy.lastName}`,
          email: signature.signedBy.email,
          isActive: signature.signedBy.isActive,
        },
      },
    });
  } catch (error) {
    console.error('Error verifying signature:', error);
    res.status(500).json({ error: 'Failed to verify signature' });
  }
});

router.get('/stats', async (req: Request, res: Response) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const [totalSignatures, todaySignatures, byScope] = await Promise.all([
      prisma.eSignature.count(),
      prisma.eSignature.count({
        where: { signedAt: { gte: today } },
      }),
      prisma.eSignature.groupBy({
        by: ['scope'],
        _count: { id: true },
      }),
    ]);
    
    res.json({
      total: totalSignatures,
      today: todaySignatures,
      byScope: byScope.map(item => ({
        scope: item.scope,
        count: item._count.id,
      })),
    });
  } catch (error) {
    console.error('Error fetching signature stats:', error);
    res.status(500).json({ error: 'Failed to fetch stats' });
  }
});

router.put('/:id', async (req: Request, res: Response) => {
  const userId = (req as any).user.id;
  
  await prisma.auditLog.create({
    data: {
      userId,
      action: 'ESIGNATURE_MODIFICATION_BLOCKED',
      entityType: 'ESignature',
      entityId: req.params.id,
      newValues: { 
        reason: 'Attempted to modify immutable e-signature record',
        requestBody: req.body,
      },
    },
  });
  
  return res.status(403).json({
    error: 'Electronic signatures are immutable and cannot be modified',
    code: 'ESIGNATURE_IMMUTABLE',
    gmpCompliance: 'GMP regulations require that electronic signatures remain unaltered after creation',
  });
});

router.patch('/:id', async (req: Request, res: Response) => {
  const userId = (req as any).user.id;
  
  await prisma.auditLog.create({
    data: {
      userId,
      action: 'ESIGNATURE_MODIFICATION_BLOCKED',
      entityType: 'ESignature',
      entityId: req.params.id,
      newValues: { 
        reason: 'Attempted to patch immutable e-signature record',
        requestBody: req.body,
      },
    },
  });
  
  return res.status(403).json({
    error: 'Electronic signatures are immutable and cannot be modified',
    code: 'ESIGNATURE_IMMUTABLE',
    gmpCompliance: 'GMP regulations require that electronic signatures remain unaltered after creation',
  });
});

router.delete('/:id', async (req: Request, res: Response) => {
  const userId = (req as any).user.id;
  
  await prisma.auditLog.create({
    data: {
      userId,
      action: 'ESIGNATURE_DELETION_BLOCKED',
      entityType: 'ESignature',
      entityId: req.params.id,
      newValues: { 
        reason: 'Attempted to delete immutable e-signature record',
      },
    },
  });
  
  return res.status(403).json({
    error: 'Electronic signatures are immutable and cannot be deleted',
    code: 'ESIGNATURE_IMMUTABLE',
    gmpCompliance: 'GMP regulations require that electronic signatures are permanently retained',
  });
});

export default router;
