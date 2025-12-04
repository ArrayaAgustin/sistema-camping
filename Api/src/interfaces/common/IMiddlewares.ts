import { Request, Response, NextFunction } from 'express';
import { IApiResponse } from '../../types';

/**
 * Interfaces comunes para middlewares y utilidades
 */

/**
 * Interface para middleware de autenticación
 */
export interface IAuthMiddleware {
  /**
   * Verifica el token JWT y autentica al usuario
   */
  verifyToken(req: Request, res: Response, next: NextFunction): Promise<void | Response>;
  
  /**
   * Verifica que el usuario tenga permisos de administrador
   */
  requireAdmin(req: Request, res: Response, next: NextFunction): Promise<void | Response>;
  
  /**
   * Middleware opcional de autenticación (no falla si no hay token)
   */
  optionalAuth(req: Request, res: Response, next: NextFunction): Promise<void>;
}

/**
 * Interface para middleware de validación
 */
export interface IValidationMiddleware {
  /**
   * Valida el cuerpo de la petición según un esquema
   */
  validateBody(schema: any): (req: Request, res: Response, next: NextFunction) => void;
  
  /**
   * Valida los parámetros de la URL
   */
  validateParams(schema: any): (req: Request, res: Response, next: NextFunction) => void;
  
  /**
   * Valida los query parameters
   */
  validateQuery(schema: any): (req: Request, res: Response, next: NextFunction) => void;
}

/**
 * Interface para middleware de rate limiting
 */
export interface IRateLimitMiddleware {
  /**
   * Aplica límites de rate limiting estándar
   */
  standardLimit(req: Request, res: Response, next: NextFunction): Promise<void | Response>;
  
  /**
   * Aplica límites de rate limiting estricto
   */
  strictLimit(req: Request, res: Response, next: NextFunction): Promise<void | Response>;
}

/**
 * Interface para respuestas HTTP estándar
 */
export interface IResponseHandler {
  /**
   * Envía una respuesta de éxito
   */
  success<T>(res: Response, data: T, message?: string): Response<IApiResponse<T>>;
  
  /**
   * Envía una respuesta de error
   */
  error(res: Response, message: string, statusCode?: number, details?: any): Response<IApiResponse<null>>;
  
  /**
   * Envía una respuesta de validación fallida
   */
  validationError(res: Response, errors: string[]): Response<IApiResponse<null>>;
  
  /**
   * Envía una respuesta de no autorizado
   */
  unauthorized(res: Response, message?: string): Response<IApiResponse<null>>;
  
  /**
   * Envía una respuesta de no encontrado
   */
  notFound(res: Response, message?: string): Response<IApiResponse<null>>;
}