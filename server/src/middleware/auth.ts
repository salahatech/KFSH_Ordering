import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export interface JwtPayload {
  userId: string;
  email: string;
  roleId: string;
  roleName: string;
}

declare global {
  namespace Express {
    interface Request {
      user?: JwtPayload;
    }
  }
}

export const authenticateToken = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  const authHeader = req.headers.authorization;
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    res.status(401).json({ error: 'Access token required' });
    return;
  }

  try {
    const secret = process.env.JWT_SECRET;
    if (!secret) {
      console.error('CRITICAL: JWT_SECRET environment variable is not set');
      res.status(500).json({ error: 'Server configuration error' });
      return;
    }
    const decoded = jwt.verify(token, secret) as JwtPayload;
    req.user = decoded;
    next();
  } catch (error) {
    res.status(403).json({ error: 'Invalid or expired token' });
  }
};

export const requirePermission = (permissionName: string) => {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    if (!req.user) {
      res.status(401).json({ error: 'Authentication required' });
      return;
    }

    try {
      const role = await prisma.role.findUnique({
        where: { id: req.user.roleId },
        include: { permissions: true },
      });

      if (!role) {
        res.status(403).json({ error: 'Role not found' });
        return;
      }

      const hasPermission = role.permissions.some((p) => p.name === permissionName);
      if (!hasPermission) {
        res.status(403).json({ error: `Permission '${permissionName}' required` });
        return;
      }

      next();
    } catch (error) {
      res.status(500).json({ error: 'Permission check failed' });
    }
  };
};

export const requireRole = (...roleNames: string[]) => {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    if (!req.user) {
      res.status(401).json({ error: 'Authentication required' });
      return;
    }

    if (!roleNames.includes(req.user.roleName)) {
      res.status(403).json({ error: `Role ${roleNames.join(' or ')} required` });
      return;
    }

    next();
  };
};
