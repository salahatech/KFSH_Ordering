import { Router, Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';

const router = Router();
const prisma = new PrismaClient();

router.get('/', async (req: Request, res: Response) => {
  try {
    const { productId, status, search, activeOnly } = req.query;
    
    const where: any = {};
    
    if (productId) where.productId = productId;
    if (status) where.status = status;
    if (activeOnly === 'true') where.status = 'ACTIVE';
    
    if (search) {
      where.OR = [
        { code: { contains: search as string, mode: 'insensitive' } },
        { name: { contains: search as string, mode: 'insensitive' } },
        { description: { contains: search as string, mode: 'insensitive' } },
      ];
    }
    
    const recipes = await prisma.recipe.findMany({
      where,
      include: {
        product: {
          select: {
            id: true,
            code: true,
            name: true,
            productType: true,
          },
        },
        createdBy: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
          },
        },
        activatedBy: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
          },
        },
        _count: {
          select: {
            components: true,
            steps: true,
            batches: true,
          },
        },
      },
      orderBy: [{ code: 'asc' }, { version: 'desc' }],
    });
    
    res.json(recipes);
  } catch (error) {
    console.error('Error fetching recipes:', error);
    res.status(500).json({ error: 'Failed to fetch recipes' });
  }
});

router.get('/statuses', async (req: Request, res: Response) => {
  try {
    const statuses = [
      { value: 'DRAFT', label: 'Draft', color: 'var(--text-muted)' },
      { value: 'PENDING_APPROVAL', label: 'Pending Approval', color: 'var(--warning)' },
      { value: 'ACTIVE', label: 'Active', color: 'var(--success)' },
      { value: 'SUPERSEDED', label: 'Superseded', color: 'var(--text-muted)' },
      { value: 'OBSOLETE', label: 'Obsolete', color: 'var(--error)' },
    ];
    res.json(statuses);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch statuses' });
  }
});

router.get('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    
    const recipe = await prisma.recipe.findUnique({
      where: { id },
      include: {
        product: true,
        createdBy: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
        activatedBy: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
        supersededBy: {
          select: {
            id: true,
            code: true,
            version: true,
            status: true,
          },
        },
        supersedes: {
          select: {
            id: true,
            code: true,
            version: true,
            status: true,
          },
        },
        components: {
          include: {
            material: {
              select: {
                id: true,
                code: true,
                name: true,
                category: true,
                unit: true,
                isRadioactive: true,
              },
            },
          },
          orderBy: { sequence: 'asc' },
        },
        steps: {
          orderBy: { stepNumber: 'asc' },
        },
        batches: {
          take: 10,
          orderBy: { createdAt: 'desc' },
          select: {
            id: true,
            batchNumber: true,
            status: true,
            plannedStartTime: true,
          },
        },
      },
    });
    
    if (!recipe) {
      return res.status(404).json({ error: 'Recipe not found' });
    }
    
    res.json(recipe);
  } catch (error) {
    console.error('Error fetching recipe:', error);
    res.status(500).json({ error: 'Failed to fetch recipe' });
  }
});

router.post('/', async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id;
    const { components, steps, ...data } = req.body;
    
    const existingVersions = await prisma.recipe.findMany({
      where: { code: data.code },
      orderBy: { version: 'desc' },
      take: 1,
    });
    
    const version = existingVersions.length > 0 ? existingVersions[0].version + 1 : 1;
    
    const recipe = await prisma.recipe.create({
      data: {
        code: data.code,
        name: data.name,
        productId: data.productId,
        version,
        status: 'DRAFT',
        description: data.description,
        yieldQuantity: data.yieldQuantity,
        yieldUnit: data.yieldUnit,
        yieldTolerance: data.yieldTolerance || 5,
        synthesisTimeMinutes: data.synthesisTimeMinutes,
        totalTimeMinutes: data.totalTimeMinutes,
        specialInstructions: data.specialInstructions,
        safetyPrecautions: data.safetyPrecautions,
        equipmentRequirements: data.equipmentRequirements,
        qualityNotes: data.qualityNotes,
        createdById: userId,
        components: components?.length > 0 ? {
          create: components.map((comp: any, index: number) => ({
            materialId: comp.materialId,
            sequence: comp.sequence || index + 1,
            quantity: comp.quantity,
            unit: comp.unit,
            tolerancePercent: comp.tolerancePercent || 5,
            isOptional: comp.isOptional || false,
            isCritical: comp.isCritical || false,
            additionNotes: comp.additionNotes,
            processingNotes: comp.processingNotes,
          })),
        } : undefined,
        steps: steps?.length > 0 ? {
          create: steps.map((step: any, index: number) => ({
            stepNumber: step.stepNumber || index + 1,
            title: step.title,
            description: step.description,
            durationMinutes: step.durationMinutes,
            temperature: step.temperature,
            pressure: step.pressure,
            equipmentRequired: step.equipmentRequired,
            safetyNotes: step.safetyNotes,
            qualityCheckpoint: step.qualityCheckpoint || false,
            checkpointCriteria: step.checkpointCriteria,
          })),
        } : undefined,
      },
      include: {
        product: {
          select: {
            id: true,
            code: true,
            name: true,
          },
        },
        components: {
          include: {
            material: {
              select: {
                id: true,
                code: true,
                name: true,
              },
            },
          },
        },
        steps: true,
      },
    });
    
    await prisma.auditLog.create({
      data: {
        userId,
        action: 'RECIPE_CREATED',
        entityType: 'Recipe',
        entityId: recipe.id,
        newValues: { code: recipe.code, version: recipe.version, productId: recipe.productId },
      },
    });
    
    res.status(201).json(recipe);
  } catch (error) {
    console.error('Error creating recipe:', error);
    res.status(500).json({ error: 'Failed to create recipe' });
  }
});

router.put('/:id', async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id;
    const { id } = req.params;
    const { components, steps, ...data } = req.body;
    
    const existing = await prisma.recipe.findUnique({
      where: { id },
      include: { components: true, steps: true },
    });
    
    if (!existing) {
      return res.status(404).json({ error: 'Recipe not found' });
    }
    
    if (existing.status === 'ACTIVE' || existing.status === 'SUPERSEDED') {
      return res.status(400).json({
        error: 'Cannot modify an active or superseded recipe. Create a new version instead.',
      });
    }
    
    await prisma.$transaction(async (tx) => {
      if (components !== undefined) {
        await tx.recipeComponent.deleteMany({ where: { recipeId: id } });
        if (components.length > 0) {
          await tx.recipeComponent.createMany({
            data: components.map((comp: any, index: number) => ({
              recipeId: id,
              materialId: comp.materialId,
              sequence: comp.sequence || index + 1,
              quantity: comp.quantity,
              unit: comp.unit,
              tolerancePercent: comp.tolerancePercent || 5,
              isOptional: comp.isOptional || false,
              isCritical: comp.isCritical || false,
              additionNotes: comp.additionNotes,
              processingNotes: comp.processingNotes,
            })),
          });
        }
      }
      
      if (steps !== undefined) {
        await tx.recipeStep.deleteMany({ where: { recipeId: id } });
        if (steps.length > 0) {
          await tx.recipeStep.createMany({
            data: steps.map((step: any, index: number) => ({
              recipeId: id,
              stepNumber: step.stepNumber || index + 1,
              title: step.title,
              description: step.description,
              durationMinutes: step.durationMinutes,
              temperature: step.temperature,
              pressure: step.pressure,
              equipmentRequired: step.equipmentRequired,
              safetyNotes: step.safetyNotes,
              qualityCheckpoint: step.qualityCheckpoint || false,
              checkpointCriteria: step.checkpointCriteria,
            })),
          });
        }
      }
      
      await tx.recipe.update({
        where: { id },
        data: {
          name: data.name,
          description: data.description,
          yieldQuantity: data.yieldQuantity,
          yieldUnit: data.yieldUnit,
          yieldTolerance: data.yieldTolerance,
          synthesisTimeMinutes: data.synthesisTimeMinutes,
          totalTimeMinutes: data.totalTimeMinutes,
          specialInstructions: data.specialInstructions,
          safetyPrecautions: data.safetyPrecautions,
          equipmentRequirements: data.equipmentRequirements,
          qualityNotes: data.qualityNotes,
        },
      });
    });
    
    const recipe = await prisma.recipe.findUnique({
      where: { id },
      include: {
        product: {
          select: {
            id: true,
            code: true,
            name: true,
          },
        },
        components: {
          include: {
            material: {
              select: {
                id: true,
                code: true,
                name: true,
              },
            },
          },
        },
        steps: true,
      },
    });
    
    await prisma.auditLog.create({
      data: {
        userId,
        action: 'RECIPE_UPDATED',
        entityType: 'Recipe',
        entityId: id,
        oldValues: { status: existing.status },
        newValues: { updated: true },
      },
    });
    
    res.json(recipe);
  } catch (error) {
    console.error('Error updating recipe:', error);
    res.status(500).json({ error: 'Failed to update recipe' });
  }
});

router.post('/:id/submit-for-approval', async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id;
    const { id } = req.params;
    
    const recipe = await prisma.recipe.findUnique({
      where: { id },
      include: {
        components: true,
      },
    });
    
    if (!recipe) {
      return res.status(404).json({ error: 'Recipe not found' });
    }
    
    if (recipe.status !== 'DRAFT') {
      return res.status(400).json({ error: 'Only draft recipes can be submitted for approval' });
    }
    
    if (recipe.components.length === 0) {
      return res.status(400).json({ error: 'Recipe must have at least one component (BOM item)' });
    }
    
    const updated = await prisma.recipe.update({
      where: { id },
      data: { status: 'PENDING_APPROVAL' },
    });
    
    await prisma.auditLog.create({
      data: {
        userId,
        action: 'RECIPE_SUBMITTED_FOR_APPROVAL',
        entityType: 'Recipe',
        entityId: id,
        newValues: { status: 'PENDING_APPROVAL' },
      },
    });
    
    res.json(updated);
  } catch (error) {
    console.error('Error submitting recipe for approval:', error);
    res.status(500).json({ error: 'Failed to submit recipe for approval' });
  }
});

router.post('/:id/activate', async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id;
    const { id } = req.params;
    const { signatureId, effectiveDate } = req.body;
    
    if (!signatureId) {
      return res.status(400).json({ error: 'E-signature is required to activate a recipe' });
    }
    
    const recipe = await prisma.recipe.findUnique({
      where: { id },
      include: {
        components: true,
      },
    });
    
    if (!recipe) {
      return res.status(404).json({ error: 'Recipe not found' });
    }
    
    if (recipe.status !== 'PENDING_APPROVAL') {
      return res.status(400).json({ error: 'Only recipes pending approval can be activated' });
    }
    
    const currentActive = await prisma.recipe.findFirst({
      where: {
        code: recipe.code,
        status: 'ACTIVE',
      },
    });
    
    await prisma.$transaction(async (tx) => {
      if (currentActive) {
        await tx.recipe.update({
          where: { id: currentActive.id },
          data: { status: 'SUPERSEDED' },
        });
      }
      
      await tx.recipe.update({
        where: { id },
        data: {
          status: 'ACTIVE',
          activatedById: userId,
          activatedAt: new Date(),
          activationSignatureId: signatureId,
          effectiveDate: effectiveDate ? new Date(effectiveDate) : new Date(),
          supersededById: currentActive?.id || null,
        },
      });
    });
    
    await prisma.auditLog.create({
      data: {
        userId,
        action: 'RECIPE_ACTIVATED',
        entityType: 'Recipe',
        entityId: id,
        newValues: {
          status: 'ACTIVE',
          signatureId,
          supersededRecipeId: currentActive?.id,
        },
      },
    });
    
    const updated = await prisma.recipe.findUnique({
      where: { id },
      include: {
        product: true,
        activatedBy: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
          },
        },
      },
    });
    
    res.json(updated);
  } catch (error) {
    console.error('Error activating recipe:', error);
    res.status(500).json({ error: 'Failed to activate recipe' });
  }
});

router.post('/:id/create-new-version', async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id;
    const { id } = req.params;
    
    const source = await prisma.recipe.findUnique({
      where: { id },
      include: {
        components: true,
        steps: true,
      },
    });
    
    if (!source) {
      return res.status(404).json({ error: 'Recipe not found' });
    }
    
    const latestVersion = await prisma.recipe.findFirst({
      where: { code: source.code },
      orderBy: { version: 'desc' },
    });
    
    const newVersion = (latestVersion?.version || 0) + 1;
    
    const newRecipe = await prisma.recipe.create({
      data: {
        code: source.code,
        name: source.name,
        productId: source.productId,
        version: newVersion,
        status: 'DRAFT',
        description: source.description,
        yieldQuantity: source.yieldQuantity,
        yieldUnit: source.yieldUnit,
        yieldTolerance: source.yieldTolerance,
        synthesisTimeMinutes: source.synthesisTimeMinutes,
        totalTimeMinutes: source.totalTimeMinutes,
        specialInstructions: source.specialInstructions,
        safetyPrecautions: source.safetyPrecautions,
        equipmentRequirements: source.equipmentRequirements,
        qualityNotes: source.qualityNotes,
        createdById: userId,
        components: {
          create: source.components.map((comp) => ({
            materialId: comp.materialId,
            sequence: comp.sequence,
            quantity: comp.quantity,
            unit: comp.unit,
            tolerancePercent: comp.tolerancePercent,
            isOptional: comp.isOptional,
            isCritical: comp.isCritical,
            additionNotes: comp.additionNotes,
            processingNotes: comp.processingNotes,
          })),
        },
        steps: {
          create: source.steps.map((step) => ({
            stepNumber: step.stepNumber,
            title: step.title,
            description: step.description,
            durationMinutes: step.durationMinutes,
            temperature: step.temperature,
            pressure: step.pressure,
            equipmentRequired: step.equipmentRequired,
            safetyNotes: step.safetyNotes,
            qualityCheckpoint: step.qualityCheckpoint,
            checkpointCriteria: step.checkpointCriteria,
          })),
        },
      },
      include: {
        product: true,
        components: {
          include: {
            material: {
              select: {
                id: true,
                code: true,
                name: true,
              },
            },
          },
        },
        steps: true,
      },
    });
    
    await prisma.auditLog.create({
      data: {
        userId,
        action: 'RECIPE_VERSION_CREATED',
        entityType: 'Recipe',
        entityId: newRecipe.id,
        newValues: {
          code: newRecipe.code,
          version: newRecipe.version,
          sourceRecipeId: id,
        },
      },
    });
    
    res.status(201).json(newRecipe);
  } catch (error) {
    console.error('Error creating new recipe version:', error);
    res.status(500).json({ error: 'Failed to create new recipe version' });
  }
});

router.post('/:id/obsolete', async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id;
    const { id } = req.params;
    const { reason } = req.body;
    
    const recipe = await prisma.recipe.findUnique({
      where: { id },
    });
    
    if (!recipe) {
      return res.status(404).json({ error: 'Recipe not found' });
    }
    
    if (recipe.status === 'ACTIVE') {
      return res.status(400).json({
        error: 'Cannot mark an active recipe as obsolete. Activate a new version first.',
      });
    }
    
    const updated = await prisma.recipe.update({
      where: { id },
      data: { status: 'OBSOLETE' },
    });
    
    await prisma.auditLog.create({
      data: {
        userId,
        action: 'RECIPE_OBSOLETED',
        entityType: 'Recipe',
        entityId: id,
        newValues: { status: 'OBSOLETE', reason },
      },
    });
    
    res.json(updated);
  } catch (error) {
    console.error('Error marking recipe as obsolete:', error);
    res.status(500).json({ error: 'Failed to mark recipe as obsolete' });
  }
});

router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id;
    const { id } = req.params;
    
    const recipe = await prisma.recipe.findUnique({
      where: { id },
      include: {
        _count: {
          select: { batches: true },
        },
      },
    });
    
    if (!recipe) {
      return res.status(404).json({ error: 'Recipe not found' });
    }
    
    if (recipe.status !== 'DRAFT') {
      return res.status(400).json({
        error: 'Only draft recipes can be deleted. Consider marking it as obsolete instead.',
      });
    }
    
    if (recipe._count.batches > 0) {
      return res.status(400).json({
        error: 'Cannot delete recipe that has been used in production batches.',
      });
    }
    
    await prisma.recipe.delete({
      where: { id },
    });
    
    await prisma.auditLog.create({
      data: {
        userId,
        action: 'RECIPE_DELETED',
        entityType: 'Recipe',
        entityId: id,
        oldValues: { code: recipe.code, version: recipe.version },
      },
    });
    
    res.json({ message: 'Recipe deleted successfully' });
  } catch (error) {
    console.error('Error deleting recipe:', error);
    res.status(500).json({ error: 'Failed to delete recipe' });
  }
});

export default router;
