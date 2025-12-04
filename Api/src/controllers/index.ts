/**
 * Barrel export para todos los controladores del sistema
 */

// Controladores principales
export { AuthController, authController } from './auth.controller';
export { AfiliadosController, afiliadosController } from './afiliados.controller';

// Re-exportar como default para retrocompatibilidad
export { default as AuthControllerDefault } from './auth.controller';
export { default as AfiliadosControllerDefault } from './afiliados.controller';