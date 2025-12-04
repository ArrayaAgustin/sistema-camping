import * as jwt from 'jsonwebtoken';
import { config } from '../config/env';
import { IJwtPayload, IUser } from '../types';

/**
 * Utilidades para manejo de tokens JWT
 */
export class JwtUtil {
  /**
   * Genera un token JWT para un usuario
   * @param user - Datos del usuario
   * @returns Token JWT
   */
  static generateToken(user: IUser): string {
    if (!user || !user.id) {
      throw new Error('User data is required to generate token');
    }
    
    const payload: IJwtPayload = {
      userId: user.id,
      username: user.username,
      afiliadoId: user.afiliado_id,
      roles: user.roles || [],
      permisos: user.permisos || []
    };
    
    return jwt.sign(payload, config.JWT_SECRET, { 
      expiresIn: config.JWT_EXPIRES as any
    });
  }

  /**
   * Verifica y decodifica un token JWT
   * @param token - Token JWT
   * @returns Payload decodificado
   */
  static verifyToken(token: string): IJwtPayload {
    if (!token) {
      throw new Error('Token is required');
    }
    
    try {
      return jwt.verify(token, config.JWT_SECRET) as IJwtPayload;
    } catch (error) {
      if (error instanceof jwt.TokenExpiredError) {
        throw new Error('Token has expired');
      } else if (error instanceof jwt.JsonWebTokenError) {
        throw new Error('Invalid token');
      } else {
        throw new Error('Token verification failed');
      }
    }
  }

  /**
   * Decodifica un token sin verificar (solo para debugging)
   * @param token - Token JWT
   * @returns Payload decodificado
   */
  static decodeToken(token: string): IJwtPayload | null {
    if (!token) {
      throw new Error('Token is required');
    }
    
    return jwt.decode(token) as IJwtPayload;
  }

  /**
   * Extrae el token del header Authorization
   * @param authHeader - Header de autorización
   * @returns Token extraído o null
   */
  static extractTokenFromHeader(authHeader: string | undefined): string | null {
    if (!authHeader) {
      return null;
    }
    
    const parts = authHeader.split(' ');
    if (parts.length !== 2 || parts[0] !== 'Bearer') {
      return null;
    }
    
    return parts[1];
  }

  /**
   * Verifica si un token está próximo a vencer
   * @param decodedToken - Token decodificado
   * @param thresholdMinutes - Umbral en minutos (default: 30)
   * @returns True si está próximo a vencer
   */
  static isTokenNearExpiry(decodedToken: IJwtPayload, thresholdMinutes: number = 30): boolean {
    if (!decodedToken || !decodedToken.exp) {
      return true;
    }
    
    const now = Math.floor(Date.now() / 1000);
    const threshold = thresholdMinutes * 60;
    
    return (decodedToken.exp - now) < threshold;
  }

  /**
   * Genera un refresh token con mayor duración
   * @param user - Datos del usuario
   * @returns Refresh token JWT
   */
  static generateRefreshToken(user: IUser): string {
    if (!user || !user.id) {
      throw new Error('User data is required to generate refresh token');
    }
    
    const payload: Partial<IJwtPayload> = {
      userId: user.id,
      username: user.username,
      type: 'refresh'
    };
    
    return jwt.sign(payload, config.JWT_SECRET, { 
      expiresIn: '7d' as any // Refresh token dura 7 días
    });
  }
}

export default JwtUtil;