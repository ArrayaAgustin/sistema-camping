import { Request, Response, NextFunction } from 'express';
import { JwtUtil } from '../utils/jwt.util';
import { authService } from '../services/auth.service';
import { IAuthMiddleware } from '../interfaces/common/middleware.interfaces';
import { IUser, IApiResponse, IJwtPayload, IAuthenticatedUser, Permission, Role } from '../types';

/**
 * Extensión del tipo Request para incluir propiedades de autenticación
 */
declare global {
  namespace Express {
    interface Request {
      user?: IAuthenticatedUser;
      token?: string;
    }
  }
}

/**
 * Middleware de autenticación - Implementa IAuthMiddleware
 */
export class AuthMiddleware implements IAuthMiddleware {

  /**
   * Verifica el token JWT y autentica al usuario
   */
  async verifyToken(req: Request, res: Response, next: NextFunction): Promise<void | Response> {
    try {
      const authHeader = req.headers.authorization;
      const cookieToken = (req as any).cookies?.['camping-token'] as string | undefined;
      
      if (!authHeader && !cookieToken) {
        return res.status(401).json({ 
          success: false,
          error: 'Token missing',
          message: 'Authorization header is required',
          timestamp: new Date().toISOString()
        } as IApiResponse<null>);
      }

      const token = authHeader ? JwtUtil.extractTokenFromHeader(authHeader) : cookieToken;
      
      if (!token) {
        return res.status(401).json({ 
          success: false,
          error: 'Token invalid format',
          message: 'Expected format: Bearer <token>',
          timestamp: new Date().toISOString()
        } as IApiResponse<null>);
      }

      // Verificar token
      const decoded = JwtUtil.verifyToken(token);
      
      // Obtener datos actualizados del usuario
      const user = await authService.getUserById(decoded.userId);
      
      if (!user) {
        return res.status(401).json({ 
          success: false,
          error: 'User not found',
          message: 'Token is valid but user no longer exists',
          timestamp: new Date().toISOString()
        } as IApiResponse<null>);
      }

      if (!user.activo) {
        return res.status(401).json({ 
          success: false,
          error: 'User inactive',
          message: 'User account has been deactivated',
          timestamp: new Date().toISOString()
        } as IApiResponse<null>);
      }

      // Convertir IUser a IAuthenticatedUser de forma segura
      req.user = {
        ...user,
        activo: user.activo ?? false // Asegurar que activo sea boolean
      } as IAuthenticatedUser;
      req.token = token;
      
      next();
      
    } catch (error: any) {
      console.error('Authentication error:', {
        message: error.message,
        stack: error.stack,
        url: req.url,
        method: req.method,
        timestamp: new Date().toISOString()
      });
      
      if (error.message.includes('expired')) {
        return res.status(401).json({ 
          success: false,
          error: 'Token expired',
          message: 'Please login again',
          timestamp: new Date().toISOString()
        } as IApiResponse<null>);
      }
      
      return res.status(401).json({ 
        success: false,
        error: 'Token invalid',
        message: 'Authentication failed',
        timestamp: new Date().toISOString()
      } as IApiResponse<null>);
    }
  }

  /**
   * Verifica que el usuario tenga permisos de administrador
   */
  async requireAdmin(req: Request, res: Response, next: NextFunction): Promise<void | Response> {
    try {
      if (!req.user) {
        return res.status(401).json({ 
          success: false,
          error: 'Authentication required',
          message: 'User not authenticated',
          timestamp: new Date().toISOString()
        } as IApiResponse<null>);
      }

      const userPermissions = req.user.permisos || [];
      
      // Verificar permisos de administrador
      if (!userPermissions.includes(Permission.ALL) && !userPermissions.includes(Permission.ADMIN)) {
        return res.status(403).json({ 
          success: false,
          error: 'Insufficient permissions',
          message: 'Administrator privileges required',
          timestamp: new Date().toISOString()
        } as IApiResponse<null>);
      }

      next();
      
    } catch (error: any) {
      console.error('Admin authorization error:', error.message);
      return res.status(500).json({ 
        success: false,
        error: 'Authorization check failed',
        message: 'Internal server error',
        timestamp: new Date().toISOString()
      } as IApiResponse<null>);
    }
  }

  /**
   * Middleware opcional de autenticación (no falla si no hay token)
   */
  async optionalAuth(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const authHeader = req.headers.authorization;
      const cookieToken = (req as any).cookies?.['camping-token'] as string | undefined;
      
      if (!authHeader && !cookieToken) {
        // No hay token, continuar sin usuario
        return next();
      }

      const token = authHeader ? JwtUtil.extractTokenFromHeader(authHeader) : cookieToken;
      
      if (!token) {
        // Token con formato inválido, continuar sin usuario
        return next();
      }

      // Intentar verificar token
      const decoded = JwtUtil.verifyToken(token);
      const user = await authService.getUserById(decoded.userId);
      
      if (user && user.activo) {
        req.user = {
          ...user,
          activo: user.activo ?? false
        } as IAuthenticatedUser;
        req.token = token;
      }
      
      next();
      
    } catch (error) {
      // Cualquier error en autenticación opcional simplemente continúa sin usuario
      console.warn('Optional auth failed (continuing without user):', error);
      next();
    }
  }

  /**
   * Método authenticate requerido por IAuthMiddleware
   * Alias para verifyToken para compatibilidad con la interfaz
   */
  async authenticate(req: Request, res: Response, next: NextFunction): Promise<void | Response> {
    return this.verifyToken(req, res, next);
  }

  /**
   * Método requirePermission requerido por IAuthMiddleware
   */
  requirePermission(...permissions: string[]) {
    return async (req: Request, res: Response, next: NextFunction): Promise<void | Response> => {
      try {
        if (!req.user) {
          return res.status(401).json({ 
            success: false,
            error: 'Authentication required',
            message: 'User not authenticated',
            timestamp: new Date().toISOString()
          } as IApiResponse<null>);
        }

        const userPermissions = req.user.permisos || [];
        
        // Admin tiene todos los permisos
        if (userPermissions.includes(Permission.ALL)) {
          return next();
        }

        // Verificar permisos específicos
        const hasPermission = permissions.some(permission => 
          userPermissions.some(userPerm => userPerm === permission)
        );

        if (!hasPermission) {
          return res.status(403).json({ 
            success: false,
            error: 'Insufficient permissions',
            message: `Required permissions: ${permissions.join(', ')}`,
            timestamp: new Date().toISOString()
          } as IApiResponse<null>);
        }

        next();
        
      } catch (error: any) {
        console.error('Permission check error:', error.message);
        return res.status(500).json({ 
          success: false,
          error: 'Permission check failed',
          message: 'Internal server error',
          timestamp: new Date().toISOString()
        } as IApiResponse<null>);
      }
    };
  }

  /**
   * Método requireRole requerido por IAuthMiddleware
   */
  requireRole(...roles: string[]) {
    return async (req: Request, res: Response, next: NextFunction): Promise<void | Response> => {
      try {
        if (!req.user) {
          return res.status(401).json({ 
            success: false,
            error: 'Authentication required',
            message: 'User not authenticated',
            timestamp: new Date().toISOString()
          } as IApiResponse<null>);
        }

        const userRoles = req.user.roles || [];
        
        // Verificar roles específicos
        const hasRole = roles.some(role => 
          userRoles.some(userRole => userRole === role)
        );

        if (!hasRole) {
          return res.status(403).json({ 
            success: false,
            error: 'Insufficient role',
            message: `Required roles: ${roles.join(', ')}`,
            timestamp: new Date().toISOString()
          } as IApiResponse<null>);
        }

        next();
        
      } catch (error: any) {
        console.error('Role check error:', error.message);
        return res.status(500).json({ 
          success: false,
          error: 'Role check failed',
          message: 'Internal server error',
          timestamp: new Date().toISOString()
        } as IApiResponse<null>);
      }
    };
  }
}

/**
 * Middleware de autorización - verifica permisos específicos
 */
export const checkPermission = (...requiredPermissions: string[]) => {
  return async (req: Request, res: Response, next: NextFunction): Promise<void | Response> => {
    try {
      if (!req.user) {
        return res.status(401).json({ 
          success: false,
          error: 'Authentication required',
          message: 'User not authenticated',
          timestamp: new Date().toISOString()
        } as IApiResponse<null>);
      }

      const userPermissions = req.user.permisos || [];
      
      // Si tiene permiso 'all', puede hacer todo
      if (userPermissions.includes(Permission.ALL)) {
        return next();
      }

      // Verificar si tiene al menos uno de los permisos requeridos
      const hasPermission = requiredPermissions.some(permission => 
        userPermissions.some(userPerm => userPerm === permission)
      );

      if (!hasPermission) {
        return res.status(403).json({ 
          success: false,
          error: 'Insufficient permissions',
          message: `Required permissions: ${requiredPermissions.join(' or ')}`,
          details: {
            required: requiredPermissions,
            userPermissions: userPermissions
          },
          timestamp: new Date().toISOString()
        } as IApiResponse<null>);
      }

      next();
      
    } catch (error: any) {
      console.error('Authorization error:', error.message);
      return res.status(500).json({ 
        success: false,
        error: 'Authorization check failed',
        message: 'Internal server error',
        timestamp: new Date().toISOString()
      } as IApiResponse<null>);
    }
  };
};

/**
 * Middleware para verificar ownership (acceso a recursos propios)
 */
export const checkOwnership = (getResourceOwnerId: (req: Request) => Promise<number | null>) => {
  return async (req: Request, res: Response, next: NextFunction): Promise<void | Response> => {
    try {
      if (!req.user) {
        return res.status(401).json({ 
          success: false,
          error: 'Authentication required',
          message: 'User not authenticated',
          timestamp: new Date().toISOString()
        } as IApiResponse<null>);
      }

      // Si tiene permisos admin, puede acceder a todo
      if (req.user.permisos.includes(Permission.ALL) || req.user.permisos.includes(Permission.ADMIN)) {
        return next();
      }

      // Obtener ID del propietario del recurso
      const resourceOwnerId = await getResourceOwnerId(req);
      
      if (!resourceOwnerId) {
        return res.status(404).json({ 
          success: false,
          error: 'Resource not found',
          message: 'The requested resource does not exist',
          timestamp: new Date().toISOString()
        } as IApiResponse<null>);
      }

      // Verificar si es el propietario
      if (req.user.afiliado_id !== resourceOwnerId) {
        return res.status(403).json({ 
          success: false,
          error: 'Access denied',
          message: 'You can only access your own resources',
          timestamp: new Date().toISOString()
        } as IApiResponse<null>);
      }

      next();
      
    } catch (error: any) {
      console.error('Ownership check error:', error.message);
      return res.status(500).json({ 
        success: false,
        error: 'Ownership check failed',
        message: 'Internal server error',
        timestamp: new Date().toISOString()
      } as IApiResponse<null>);
    }
  };
};

/**
 * Middleware para verificar roles específicos
 */
export const checkRole = (...requiredRoles: string[]) => {
  return async (req: Request, res: Response, next: NextFunction): Promise<void | Response> => {
    try {
      if (!req.user) {
        return res.status(401).json({ 
          success: false,
          error: 'Authentication required',
          message: 'User not authenticated',
          timestamp: new Date().toISOString()
        } as IApiResponse<null>);
      }

      const userRoles = req.user.roles || [];
      
      // Verificar si tiene al menos uno de los roles requeridos
      const hasRole = requiredRoles.some(role => userRoles.some(userRole => userRole === role));

      if (!hasRole) {
        return res.status(403).json({ 
          success: false,
          error: 'Insufficient role',
          message: `Required roles: ${requiredRoles.join(' or ')}`,
          details: {
            required: requiredRoles,
            userRoles: userRoles
          },
          timestamp: new Date().toISOString()
        } as IApiResponse<null>);
      }

      next();
      
    } catch (error: any) {
      console.error('Role check error:', error.message);
      return res.status(500).json({ 
        success: false,
        error: 'Role check failed',
        message: 'Internal server error',
        timestamp: new Date().toISOString()
      } as IApiResponse<null>);
    }
  };
};

// Crear instancia del middleware
export const authMiddleware = new AuthMiddleware();

// Exportar funciones específicas para retrocompatibilidad
export const authenticateMiddleware = authMiddleware.verifyToken.bind(authMiddleware);
export const requireAdmin = authMiddleware.requireAdmin.bind(authMiddleware);
export const optionalAuth = authMiddleware.optionalAuth.bind(authMiddleware);

export default authMiddleware;