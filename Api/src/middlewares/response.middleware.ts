import { Response } from 'express';
import { IResponseHandler } from '../interfaces/common/middleware.interfaces';
import { IApiResponse } from '../types';

/**
 * Middleware para manejo estandarizado de respuestas HTTP
 * Implementa la interface IResponseHandler
 */
export class ResponseHandler implements IResponseHandler {
  
  // Propiedad para el middleware
  middleware?: () => any;

  /**
   * Envía una respuesta de éxito
   */
  success<T>(res: Response, data: T, message?: string): Response {
    return res.status(200).json({
      success: true,
      message: message || 'Operation completed successfully',
      data,
      timestamp: new Date().toISOString()
    });
  }

  /**
   * Envía una respuesta de éxito para creación
   */
  created<T>(res: Response, data: T, message?: string): Response {
    return res.status(201).json({
      success: true,
      message: message || 'Resource created successfully',
      data,
      timestamp: new Date().toISOString()
    });
  }

  /**
   * Envía una respuesta de éxito sin contenido
   */
  noContent(res: Response, message?: string): Response {
    return res.status(204).json({
      success: true,
      message: message || 'Operation completed successfully',
      data: null,
      timestamp: new Date().toISOString()
    });
  }

  /**
   * Envía una respuesta de error
   */
  error(res: Response, message: string, statusCode: number = 500, details?: any): Response {
    return res.status(statusCode).json({
      success: false,
      error: this.getErrorType(statusCode),
      message,
      details,
      timestamp: new Date().toISOString(),
      data: null
    });
  }

  /**
   * Envía una respuesta de validación fallida
   */
  validationError(res: Response, errors: string[]): Response {
    return res.status(400).json({
      success: false,
      error: 'Validation Error',
      message: 'Request validation failed',
      details: {
        errors,
        count: errors.length
      },
      timestamp: new Date().toISOString(),
      data: null
    });
  }

  /**
   * Envía una respuesta de no autorizado
   */
  unauthorized(res: Response, message: string = 'Authentication required'): Response {
    return res.status(401).json({
      success: false,
      error: 'Unauthorized',
      message,
      timestamp: new Date().toISOString(),
      data: null
    });
  }

  /**
   * Envía una respuesta de acceso prohibido
   */
  forbidden(res: Response, message: string = 'Access forbidden'): Response {
    return res.status(403).json({
      success: false,
      error: 'Forbidden',
      message,
      timestamp: new Date().toISOString(),
      data: null
    });
  }

  /**
   * Envía una respuesta de no encontrado
   */
  notFound(res: Response, message: string = 'Resource not found'): Response {
    return res.status(404).json({
      success: false,
      error: 'Not Found',
      message,
      timestamp: new Date().toISOString(),
      data: null
    });
  }

  /**
   * Envía una respuesta de conflicto
   */
  conflict(res: Response, message: string = 'Resource conflict'): Response {
    return res.status(409).json({
      success: false,
      error: 'Conflict',
      message,
      timestamp: new Date().toISOString(),
      data: null
    });
  }

  /**
   * Envía una respuesta de error interno del servidor
   */
  internalError(res: Response, message: string = 'Internal server error'): Response {
    return res.status(500).json({
      success: false,
      error: 'Internal Server Error',
      message,
      timestamp: new Date().toISOString(),
      data: null
    });
  }

  /**
   * Envía una respuesta paginada
   */
  paginated<T>(res: Response, data: T[], pagination: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  }, message?: string): Response {
    return res.status(200).json({
      success: true,
      message: message || 'Data retrieved successfully',
      data: {
        items: data,
        pagination
      },
      timestamp: new Date().toISOString()
    });
  }

  /**
   * Obtiene el tipo de error basado en el código de estado
   */
  private getErrorType(statusCode: number): string {
    switch (statusCode) {
      case 400: return 'Bad Request';
      case 401: return 'Unauthorized';
      case 403: return 'Forbidden';
      case 404: return 'Not Found';
      case 409: return 'Conflict';
      case 422: return 'Unprocessable Entity';
      case 429: return 'Too Many Requests';
      case 500: return 'Internal Server Error';
      case 502: return 'Bad Gateway';
      case 503: return 'Service Unavailable';
      default: return 'Error';
    }
  }
}

/**
 * Middleware para inyectar el response handler en res.locals
 */
export const injectResponseHandler = (req: any, res: any, next: any) => {
  res.locals.responseHandler = responseHandler;
  next();
};

/**
 * Extiende el tipo Response para incluir métodos de respuesta
 */
declare global {
  namespace Express {
    interface Response {
      success<T>(data: T, message?: string): Response;
      created<T>(data: T, message?: string): Response;
      error(message: string, statusCode?: number, details?: any): Response;
      validationError(errors: string[]): Response;
      unauthorized(message?: string): Response;
      forbidden(message?: string): Response;
      notFound(message?: string): Response;
    }
  }
}

/**
 * Middleware para extender el objeto Response con métodos de respuesta
 */
export const extendResponse = (req: any, res: any, next: any) => {
  const handler = new ResponseHandler();

  res.success = function<T>(data: T, message?: string) {
    return handler.success(this, data, message);
  };

  res.created = function<T>(data: T, message?: string) {
    return handler.created(this, data, message);
  };

  res.error = function(message: string, statusCode?: number, details?: any) {
    return handler.error(this, message, statusCode, details);
  };

  res.validationError = function(errors: string[]) {
    return handler.validationError(this, errors);
  };

  res.unauthorized = function(message?: string) {
    return handler.unauthorized(this, message);
  };

  res.forbidden = function(message?: string) {
    return handler.forbidden(this, message);
  };

  res.notFound = function(message?: string) {
    return handler.notFound(this, message);
  };

  next();
};

// Crear instancia global del response handler
export const responseHandler = new ResponseHandler();

// Método para usar como middleware
responseHandler.middleware = () => extendResponse;

export default responseHandler;