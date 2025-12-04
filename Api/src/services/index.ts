/**
 * Barrel export para todos los servicios del sistema
 * Permite importar los servicios desde un solo punto
 */

// Servicios principales
export { AuthService, authService } from './auth.service';
export { AfiliadosService, afiliadosService } from './afiliados.service';

// Re-exportar como default para retrocompatibilidad
export { default as AuthServiceDefault } from './auth.service';
export { default as AfiliadosServiceDefault } from './afiliados.service';