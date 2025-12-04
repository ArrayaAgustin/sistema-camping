/**
 * Barrel export para todos los middlewares del sistema
 * Organizados por funcionalidad para fácil importación
 */

// Middleware de autenticación
export {
  AuthMiddleware,
  authMiddleware,
  authenticateMiddleware,
  requireAdmin,
  optionalAuth,
  checkPermission,
  checkOwnership,
  checkRole
} from './auth.middleware';

// Middleware de validación
export {
  ValidationMiddleware,
  validationMiddleware,
  validateBody,
  validateParams,
  validateQuery,
  ValidationSchemas,
  type IValidationSchema
} from './validation.middleware';

// Middleware de rate limiting
export {
  RateLimitMiddleware,
  rateLimitMiddleware
} from './rateLimit.middleware';

// Middleware de respuestas
export {
  ResponseHandler,
  responseHandler,
  injectResponseHandler,
  extendResponse
} from './response.middleware';

// Importar instancias para middlewares combinados
import { authMiddleware } from './auth.middleware';
import { rateLimitMiddleware } from './rateLimit.middleware';

// Aliases para compatibilidad
export const standardRateLimit = rateLimitMiddleware.standardLimit.bind(rateLimitMiddleware);
export const strictRateLimit = rateLimitMiddleware.strictLimit.bind(rateLimitMiddleware);
export const loginRateLimit = rateLimitMiddleware.loginLimit.bind(rateLimitMiddleware);
export const searchRateLimit = rateLimitMiddleware.searchLimit.bind(rateLimitMiddleware);
export const uploadRateLimit = rateLimitMiddleware.uploadLimit.bind(rateLimitMiddleware);

// Middlewares combinados para casos comunes
export const commonMiddlewares = {
  // Middleware básico para APIs protegidas
  protected: [authMiddleware.verifyToken.bind(authMiddleware), standardRateLimit],
  
  // Middleware para rutas de administrador
  admin: [authMiddleware.verifyToken.bind(authMiddleware), authMiddleware.requireAdmin.bind(authMiddleware), strictRateLimit],
  
  // Middleware para login con rate limiting estricto
  login: [loginRateLimit],
  
  // Middleware para búsquedas con rate limiting específico
  search: [authMiddleware.optionalAuth.bind(authMiddleware), searchRateLimit],
  
  // Middleware para operaciones de escritura
  write: [authMiddleware.verifyToken.bind(authMiddleware), uploadRateLimit]
};

// Re-exportar interfaces para conveniencia
export * from '../interfaces/common';