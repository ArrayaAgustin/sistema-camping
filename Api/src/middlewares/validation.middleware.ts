import { Request, Response, NextFunction } from 'express';
import { IValidationMiddleware } from '../interfaces/common/middleware.interfaces';
import { IApiResponse, IValidationResult } from '../types';

/**
 * Esquema básico para validación
 */
export interface IValidationSchema {
  [key: string]: {
    required?: boolean;
    type?: 'string' | 'number' | 'boolean' | 'email' | 'array' | 'object';
    minLength?: number;
    maxLength?: number;
    min?: number;
    max?: number;
    pattern?: RegExp;
    enum?: any[];
    custom?: (value: any) => boolean | string;
  };
}

/**
 * Middleware de validación - Implementa IValidationMiddleware
 */
export class ValidationMiddleware implements IValidationMiddleware {

  /**
   * Valida el cuerpo de la petición según un esquema
   */
  validateBody(schema: IValidationSchema) {
    return (req: Request, res: Response, next: NextFunction): void => {
      const errors = this.validateObject(req.body, schema, 'body');
      
      if (errors.length > 0) {
        res.status(400).json({
          success: false,
          error: 'Validation failed',
          message: 'Request body validation failed',
          details: errors,
          timestamp: new Date().toISOString()
        } as IApiResponse<null>);
        return;
      }
      
      next();
    };
  }

  /**
   * Valida los parámetros de la URL
   */
  validateParams(schema: IValidationSchema) {
    return (req: Request, res: Response, next: NextFunction): void => {
      const errors = this.validateObject(req.params, schema, 'params');
      
      if (errors.length > 0) {
        res.status(400).json({
          success: false,
          error: 'Validation failed',
          message: 'URL parameters validation failed',
          details: errors,
          timestamp: new Date().toISOString()
        } as IApiResponse<null>);
        return;
      }
      
      next();
    };
  }

  /**
   * Valida los query parameters
   */
  validateQuery(schema: IValidationSchema) {
    return (req: Request, res: Response, next: NextFunction): void => {
      const errors = this.validateObject(req.query, schema, 'query');
      
      if (errors.length > 0) {
        res.status(400).json({
          success: false,
          error: 'Validation failed',
          message: 'Query parameters validation failed',
          details: errors,
          timestamp: new Date().toISOString()
        } as IApiResponse<null>);
        return;
      }
      
      next();
    };
  }

  /**
   * Valida datos de login - Requerido por IValidationMiddleware
   */
  async validateLogin(req: Request, res: Response, next: NextFunction): Promise<void | Response> {
    const errors = this.validateObject(req.body, ValidationSchemas.login, 'body');
    
    if (errors.length > 0) {
      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        message: 'Login validation failed',
        details: errors,
        timestamp: new Date().toISOString()
      } as IApiResponse<null>);
    }
    
    next();
  }

  /**
   * Valida datos de registro - Requerido por IValidationMiddleware
   */
  async validateRegister(req: Request, res: Response, next: NextFunction): Promise<void | Response> {
    const errors = this.validateObject(req.body, ValidationSchemas.register, 'body');
    
    if (errors.length > 0) {
      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        message: 'Registration validation failed',
        details: errors,
        timestamp: new Date().toISOString()
      } as IApiResponse<null>);
    }
    
    next();
  }

  /**
   * Valida datos de afiliado - Requerido por IValidationMiddleware
   */
  async validateAfiliado(req: Request, res: Response, next: NextFunction): Promise<void | Response> {
    const errors = this.validateObject(req.body, ValidationSchemas.updateAfiliado, 'body');
    
    if (errors.length > 0) {
      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        message: 'Afiliado validation failed',
        details: errors,
        timestamp: new Date().toISOString()
      } as IApiResponse<null>);
    }
    
    next();
  }

  /**
   * Valida un objeto contra un esquema
   */
  private validateObject(obj: any, schema: IValidationSchema, source: string): string[] {
    const errors: string[] = [];
    
    // Verificar campos requeridos
    for (const [field, rules] of Object.entries(schema)) {
      const value = obj[field];
      
      if (rules.required && (value === undefined || value === null || value === '')) {
        errors.push(`${source}.${field} is required`);
        continue;
      }
      
      // Si el campo no es requerido y no está presente, continuar
      if (!rules.required && (value === undefined || value === null)) {
        continue;
      }
      
      // Validar tipo
      if (rules.type && !this.validateType(value, rules.type)) {
        errors.push(`${source}.${field} must be of type ${rules.type}`);
        continue;
      }
      
      // Validar longitud (para strings y arrays)
      if (rules.minLength !== undefined && value.length < rules.minLength) {
        errors.push(`${source}.${field} must be at least ${rules.minLength} characters long`);
      }
      
      if (rules.maxLength !== undefined && value.length > rules.maxLength) {
        errors.push(`${source}.${field} must be at most ${rules.maxLength} characters long`);
      }
      
      // Validar rango (para números)
      if (rules.min !== undefined && typeof value === 'number' && value < rules.min) {
        errors.push(`${source}.${field} must be at least ${rules.min}`);
      }
      
      if (rules.max !== undefined && typeof value === 'number' && value > rules.max) {
        errors.push(`${source}.${field} must be at most ${rules.max}`);
      }
      
      // Validar patrón
      if (rules.pattern && typeof value === 'string' && !rules.pattern.test(value)) {
        errors.push(`${source}.${field} has invalid format`);
      }
      
      // Validar enum
      if (rules.enum && !rules.enum.includes(value)) {
        errors.push(`${source}.${field} must be one of: ${rules.enum.join(', ')}`);
      }
      
      // Validación personalizada
      if (rules.custom) {
        const customResult = rules.custom(value);
        if (typeof customResult === 'string') {
          errors.push(`${source}.${field}: ${customResult}`);
        } else if (customResult === false) {
          errors.push(`${source}.${field} failed custom validation`);
        }
      }
    }
    
    return errors;
  }

  /**
   * Valida el tipo de un valor
   */
  private validateType(value: any, type: string): boolean {
    switch (type) {
      case 'string':
        return typeof value === 'string';
      case 'number':
        return typeof value === 'number' && !isNaN(value);
      case 'boolean':
        return typeof value === 'boolean';
      case 'email':
        return typeof value === 'string' && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
      case 'array':
        return Array.isArray(value);
      case 'object':
        return typeof value === 'object' && value !== null && !Array.isArray(value);
      default:
        return true;
    }
  }
}

/**
 * Esquemas de validación predefinidos para el sistema
 */
export const ValidationSchemas = {
  // Login
  login: {
    username: { required: true, type: 'string' as const, minLength: 3, maxLength: 50 },
    password: { required: true, type: 'string' as const, minLength: 6 }
  },

  // Registro de usuario
  register: {
    username: { required: true, type: 'string' as const, minLength: 3, maxLength: 50 },
    email: { required: false, type: 'email' as const },
    password: { required: true, type: 'string' as const, minLength: 6 },
    afiliado_id: { required: false, type: 'number' as const }
  },

  // Búsqueda de afiliados
  searchAfiliados: {
    q: { required: false, type: 'string' as const, maxLength: 100 },
    tipo: { required: false, type: 'string' as const, enum: ['general', 'dni', 'apellido', 'numero'] },
    limit: { required: false, type: 'number' as const, min: 1, max: 100 },
    offset: { required: false, type: 'number' as const, min: 0 }
  },

  // Parámetros ID
  idParam: {
    id: { 
      required: true, 
      type: 'string' as const,
      custom: (value: string) => {
        const num = parseInt(value, 10);
        return !isNaN(num) && num > 0 ? true : 'ID must be a positive number';
      }
    }
  },

  // Actualización de afiliado
  updateAfiliado: {
    apellido: { required: false, type: 'string' as const, minLength: 2, maxLength: 100 },
    nombres: { required: false, type: 'string' as const, minLength: 2, maxLength: 100 },
    documento: { required: false, type: 'string' as const, minLength: 7, maxLength: 20 },
    telefono: { required: false, type: 'string' as const, maxLength: 20 },
    email: { required: false, type: 'email' as const },
    domicilio: { required: false, type: 'string' as const, maxLength: 200 },
    activo: { required: false, type: 'boolean' as const }
  }
};

// Crear instancia del middleware
export const validationMiddleware = new ValidationMiddleware();

// Exportar funciones específicas
export const validateBody = validationMiddleware.validateBody.bind(validationMiddleware);
export const validateParams = validationMiddleware.validateParams.bind(validationMiddleware);
export const validateQuery = validationMiddleware.validateQuery.bind(validationMiddleware);

export default validationMiddleware;