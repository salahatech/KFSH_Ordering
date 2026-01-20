import { Request, Response, NextFunction } from 'express';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function createAuditLog(
  userId: string | undefined,
  action: string,
  entityType: string,
  entityId: string | undefined,
  oldValues: any,
  newValues: any,
  req?: Request
): Promise<void> {
  try {
    await prisma.auditLog.create({
      data: {
        userId,
        action,
        entityType,
        entityId,
        oldValues,
        newValues,
        ipAddress: req?.ip,
        userAgent: req?.headers['user-agent'],
      },
    });
  } catch (error) {
    console.error('Failed to create audit log:', error);
  }
}

export const auditMiddleware = (action: string, entityType: string) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    const originalJson = res.json.bind(res);
    
    res.json = (body: any) => {
      if (res.statusCode >= 200 && res.statusCode < 300) {
        createAuditLog(
          req.user?.userId,
          action,
          entityType,
          body?.id || req.params?.id,
          null,
          body,
          req
        );
      }
      return originalJson(body);
    };
    
    next();
  };
};
