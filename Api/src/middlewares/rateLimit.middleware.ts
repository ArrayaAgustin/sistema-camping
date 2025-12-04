import { Request, Response, NextFunction } from 'express';
import { IRateLimitMiddleware } from '../interfaces/common/middleware.interfaces';
import { IApiResponse, IRateLimitConfig, IRateLimitState } from '../types';

/**
 * Nota: IRateLimitConfig está definido en @/types
 * Extensión local para funcionalidades adicionales
 */
interface ILocalRateLimitConfig extends IRateLimitConfig {
  skipSuccessfulRequests?: boolean;
  skipFailedRequests?: boolean;
  keyGenerator?: (req: Request) => string;
}

/**
 * Almacén en memoria para rate limiting
 */
class InMemoryStore {
  private store = new Map<string, { count: number; resetTime: number }>();

  increment(key: string, windowMs: number): { count: number; resetTime: number } {
    const now = Date.now();
    const record = this.store.get(key);

    if (!record || now > record.resetTime) {
      // Crear nuevo registro o resetear expirado
      const newRecord = { count: 1, resetTime: now + windowMs };
      this.store.set(key, newRecord);
      return newRecord;
    }

    // Incrementar contador existente
    record.count++;
    this.store.set(key, record);
    return record;
  }

  reset(key: string): void {
    this.store.delete(key);
  }

  cleanup(): void {
    const now = Date.now();
    const entries = Array.from(this.store.entries());
    for (const [key, record] of entries) {
      if (now > record.resetTime) {
        this.store.delete(key);
      }
    }
  }
}

/**
 * Middleware de Rate Limiting - Implementa IRateLimitMiddleware
 */
export class RateLimitMiddleware implements IRateLimitMiddleware {
  private store = new InMemoryStore();

  constructor() {
    // Limpiar registros expirados cada 5 minutos
    setInterval(() => {
      this.store.cleanup();
    }, 5 * 60 * 1000);
  }

  /**
   * Aplica límites de rate limiting estándar
   */
  async standardLimit(req: Request, res: Response, next: NextFunction): Promise<void | Response> {
    return this.applyRateLimit({
      windowMs: 15 * 60 * 1000, // 15 minutos
      maxRequests: 100,           // 100 requests por ventana
      message: 'Too many requests, please try again later'
    })(req, res, next);
  }

  /**
   * Aplica límites de rate limiting estricto
   */
  async strictLimit(req: Request, res: Response, next: NextFunction): Promise<void | Response> {
    return this.applyRateLimit({
      windowMs: 15 * 60 * 1000, // 15 minutos
      maxRequests: 20,           // 20 requests por ventana
      message: 'Rate limit exceeded. Please wait before making more requests'
    })(req, res, next);
  }

  /**
   * Límite específico para login - Requerido por IRateLimitMiddleware
   */
  async loginLimit(req: Request, res: Response, next: NextFunction): Promise<void | Response> {
    return this.applyRateLimit({
      windowMs: 15 * 60 * 1000, // 15 minutos
      maxRequests: 5,            // 5 intentos de login por ventana
      message: 'Too many login attempts. Please wait 15 minutes before trying again'
    })(req, res, next);
  }

  /**
   * Límite para búsquedas - Requerido por IRateLimitMiddleware
   */
  async searchLimit(req: Request, res: Response, next: NextFunction): Promise<void | Response> {
    return this.applyRateLimit({
      windowMs: 1 * 60 * 1000,   // 1 minuto
      maxRequests: 30,           // 30 búsquedas por minuto
      message: 'Too many search requests. Please wait before searching again'
    })(req, res, next);
  }

  /**
   * Límite para uploads - Requerido por IRateLimitMiddleware
   */
  async uploadLimit(req: Request, res: Response, next: NextFunction): Promise<void | Response> {
    return this.applyRateLimit({
      windowMs: 5 * 60 * 1000,   // 5 minutos
      maxRequests: 10,           // 10 uploads por ventana
      message: 'Upload limit exceeded. Please wait before uploading more files'
    })(req, res, next);
  }

  /**
   * Crea un middleware de rate limiting personalizado
   */
  createRateLimit(config: IRateLimitConfig) {
    return this.applyRateLimit(config);
  }

  /**
   * Aplica rate limiting con configuración específica
   */
  private applyRateLimit(config: IRateLimitConfig | ILocalRateLimitConfig) {
    return async (req: Request, res: Response, next: NextFunction): Promise<void | Response> => {
      try {
        // Generar clave única para el cliente
        const localConfig = config as ILocalRateLimitConfig;
        const key = localConfig.keyGenerator ? localConfig.keyGenerator(req) : this.getClientKey(req);
        
        // Incrementar contador
        const { count, resetTime } = this.store.increment(key, config.windowMs);
        
        // Agregar headers informativos
        res.set({
          'X-RateLimit-Limit': config.maxRequests.toString(),
          'X-RateLimit-Remaining': Math.max(0, config.maxRequests - count).toString(),
          'X-RateLimit-Reset': new Date(resetTime).toISOString()
        });

        // Verificar si se excedió el límite
        if (count > config.maxRequests) {
          const retryAfter = Math.ceil((resetTime - Date.now()) / 1000);
          
          res.set('Retry-After', retryAfter.toString());
          
          return res.status(429).json({
            success: false,
            error: 'Rate limit exceeded',
            message: config.message,
            details: {
              limit: config.maxRequests,
              current: count,
              resetTime: new Date(resetTime).toISOString(),
              retryAfter: `${retryAfter} seconds`
            },
            timestamp: new Date().toISOString()
          } as IApiResponse<null>);
        }

        next();
        
      } catch (error: any) {
        console.error('Rate limiting error:', error);
        // En caso de error, permitir el request pero logearlo
        next();
      }
    };
  }

  /**
   * Genera una clave única para identificar al cliente
   */
  private getClientKey(req: Request): string {
    // Priorizar usuario autenticado, luego IP
    if (req.user?.id) {
      return `user:${req.user.id}`;
    }
    
    // Obtener IP real considerando proxies
    const ip = req.ip || 
              req.connection.remoteAddress || 
              (req.headers['x-forwarded-for'] as string)?.split(',')[0] ||
              (req.headers['x-real-ip'] as string) ||
              'unknown';
    
    return `ip:${ip}`;
  }

  /**
   * Resetea el contador para una clave específica
   */
  resetLimit(key: string): void {
    this.store.reset(key);
  }
}

/**
 * Rate limits predefinidos para diferentes endpoints
 */
export const RateLimitConfigs = {
  // Login - Muy restrictivo para prevenir ataques de fuerza bruta
  login: {
    windowMs: 15 * 60 * 1000, // 15 minutos
    maxRequests: 5,            // 5 intentos por ventana
    message: 'Too many login attempts. Please try again in 15 minutes',
    skipSuccessfulRequests: true // No contar logins exitosos
  },

  // API general - Límite estándar
  api: {
    windowMs: 15 * 60 * 1000, // 15 minutos
    maxRequests: 100,          // 100 requests por ventana
    message: 'API rate limit exceeded. Please slow down your requests'
  },

  // Búsquedas - Límite medio
  search: {
    windowMs: 1 * 60 * 1000,  // 1 minuto
    maxRequests: 30,           // 30 búsquedas por minuto
    message: 'Search rate limit exceeded. Please wait before searching again'
  },

  // Upload/Update - Más restrictivo
  upload: {
    windowMs: 1 * 60 * 1000,  // 1 minuto
    maxRequests: 10,           // 10 uploads por minuto
    message: 'Upload rate limit exceeded. Please wait before uploading again'
  }
};

// Crear instancia del middleware
export const rateLimitMiddleware = new RateLimitMiddleware();

// Exportar límites específicos comúnmente usados
export const standardRateLimit = rateLimitMiddleware.standardLimit.bind(rateLimitMiddleware);
export const strictRateLimit = rateLimitMiddleware.strictLimit.bind(rateLimitMiddleware);

// Crear middlewares específicos para diferentes casos
export const loginRateLimit = rateLimitMiddleware.createRateLimit(RateLimitConfigs.login);
export const apiRateLimit = rateLimitMiddleware.createRateLimit(RateLimitConfigs.api);
export const searchRateLimit = rateLimitMiddleware.createRateLimit(RateLimitConfigs.search);
export const uploadRateLimit = rateLimitMiddleware.createRateLimit(RateLimitConfigs.upload);

export default rateLimitMiddleware;