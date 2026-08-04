import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { UnauthorizedError, ForbiddenError } from '../shared/errors/index';
import env from '../config/env';

export interface AuthRequest extends Request {
  user?: { id: string; role: string };
}

export const authGuard = (req: AuthRequest, res: Response, next: NextFunction): void => {
  const authHeader = req.headers.authorization;
  
  if (!authHeader?.startsWith('Bearer ')) {
    throw new UnauthorizedError('Token manquant');
  }

  const token = authHeader.split(' ')[1];

  try {
    const decoded = jwt.verify(token, env.JWT_SECRET) as { id: string; role?: string };
    req.user = { id: decoded.id, role: decoded.role || 'USER' };
    next();
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) {
      throw new UnauthorizedError('Token expiré');
    }
    throw new UnauthorizedError('Token invalide');
  }
};

export const adminGuard = (req: AuthRequest, _res: Response, next: NextFunction): void => {
  if (!req.user) {
    throw new UnauthorizedError('Authentification requise');
  }
  if (req.user.role !== 'ADMIN') {
    throw new ForbiddenError('Accès réservé aux administrateurs');
  }
  next();
};
