/**
 * Interfaces comunes para middlewares
 */
import { Request, Response, NextFunction } from 'express';
import { IApiResponse } from '../../types';

/**
 * Interface para middleware de autenticación
 */
export interface IAuthMiddleware {
  authenticate(req: Request, res: Response, next: NextFunction): Promise<void | Response>;
  requirePermission(...permissions: string[]): (req: Request, res: Response, next: NextFunction) => Promise<void | Response>;
  requireRole(...roles: string[]): (req: Request, res: Response, next: NextFunction) => Promise<void | Response>;
  optionalAuth(req: Request, res: Response, next: NextFunction): Promise<void>;
  requireAdmin(req: Request, res: Response, next: NextFunction): Promise<void | Response>;
}

/**
 * Interface para middleware de validación
 */
export interface IValidationMiddleware {
  validateLogin(req: Request, res: Response, next: NextFunction): Promise<void | Response>;
  validateRegister(req: Request, res: Response, next: NextFunction): Promise<void | Response>;
  validateAfiliado(req: Request, res: Response, next: NextFunction): Promise<void | Response>;
}

/**
 * Interface para middleware de rate limiting
 */
export interface IRateLimitMiddleware {
  standardLimit(req: Request, res: Response, next: NextFunction): Promise<void | Response>;
  strictLimit(req: Request, res: Response, next: NextFunction): Promise<void | Response>;
  loginLimit(req: Request, res: Response, next: NextFunction): Promise<void | Response>;
  searchLimit(req: Request, res: Response, next: NextFunction): Promise<void | Response>;
  uploadLimit(req: Request, res: Response, next: NextFunction): Promise<void | Response>;
}

/**
 * Interface para manejador de respuestas
 */
export interface IResponseHandler {
  success<T>(res: Response, data: T, message?: string): Response;
  created<T>(res: Response, data: T, message?: string): Response;
  error(res: Response, message: string, statusCode?: number, details?: any): Response;
  validationError(res: Response, errors: string[]): Response;
  unauthorized(res: Response, message?: string): Response;
  forbidden(res: Response, message?: string): Response;
  notFound(res: Response, message?: string): Response;
  internalError(res: Response, message?: string): Response;
}