import bcrypt from 'bcrypt';
import { config } from '../config/env';
import { IValidationResult } from '../types';

/**
 * Utilidades para manejo de hashing y validación de contraseñas
 */
export class HashUtil {
  /**
   * Genera un hash de una contraseña
   * @param password - Contraseña en texto plano
   * @returns Hash de la contraseña
   */
  static async hashPassword(password: string): Promise<string> {
    if (!password) {
      throw new Error('Password is required');
    }
    
    return await bcrypt.hash(password, config.BCRYPT_ROUNDS);
  }

  /**
   * Compara una contraseña con su hash
   * @param password - Contraseña en texto plano
   * @param hash - Hash para comparar
   * @returns True si coinciden
   */
  static async comparePassword(password: string, hash: string): Promise<boolean> {
    if (!password || !hash) {
      return false;
    }
    
    return await bcrypt.compare(password, hash);
  }

  /**
   * Valida que una contraseña cumpla con los requisitos mínimos
   * @param password - Contraseña a validar
   * @returns Resultado de la validación
   */
  static validatePassword(password: string): IValidationResult {
    const errors: string[] = [];
    
    if (!password) {
      errors.push('Password is required');
    } else {
      if (password.length < 6) {
        errors.push('Password must be at least 6 characters long');
      }
      
      if (password.length > 100) {
        errors.push('Password must be less than 100 characters long');
      }
      
      // Validaciones adicionales de seguridad
      if (!/[a-z]/.test(password)) {
        errors.push('Password must contain at least one lowercase letter');
      }
      
      if (!/[A-Z]/.test(password)) {
        errors.push('Password must contain at least one uppercase letter');
      }
      
      if (!/[0-9]/.test(password)) {
        errors.push('Password must contain at least one number');
      }
    }
    
    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * Genera una contraseña aleatoria segura
   * @param length - Longitud de la contraseña (default: 12)
   * @returns Contraseña generada
   */
  static generateSecurePassword(length: number = 12): string {
    const lowercase = 'abcdefghijklmnopqrstuvwxyz';
    const uppercase = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    const numbers = '0123456789';
    const symbols = '!@#$%^&*()_+-=[]{}|;:,.<>?';
    
    const allChars = lowercase + uppercase + numbers + symbols;
    let password = '';
    
    // Asegurar que tenga al menos un carácter de cada tipo
    password += lowercase[Math.floor(Math.random() * lowercase.length)];
    password += uppercase[Math.floor(Math.random() * uppercase.length)];
    password += numbers[Math.floor(Math.random() * numbers.length)];
    password += symbols[Math.floor(Math.random() * symbols.length)];
    
    // Completar el resto con caracteres aleatorios
    for (let i = password.length; i < length; i++) {
      password += allChars[Math.floor(Math.random() * allChars.length)];
    }
    
    // Mezclar los caracteres
    return password.split('').sort(() => Math.random() - 0.5).join('');
  }

  /**
   * Verifica la fortaleza de una contraseña
   * @param password - Contraseña a evaluar
   * @returns Nivel de fortaleza (weak, medium, strong)
   */
  static getPasswordStrength(password: string): 'weak' | 'medium' | 'strong' {
    if (!password) return 'weak';
    
    let score = 0;
    
    // Longitud
    if (password.length >= 8) score++;
    if (password.length >= 12) score++;
    
    // Variedad de caracteres
    if (/[a-z]/.test(password)) score++;
    if (/[A-Z]/.test(password)) score++;
    if (/[0-9]/.test(password)) score++;
    if (/[^A-Za-z0-9]/.test(password)) score++;
    
    if (score <= 2) return 'weak';
    if (score <= 4) return 'medium';
    return 'strong';
  }
}

export default HashUtil;