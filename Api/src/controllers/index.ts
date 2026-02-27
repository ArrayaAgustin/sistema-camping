/**
 * Barrel export para todos los controladores del sistema
 */

// Controladores principales
export { AuthController, authController } from './auth.controller';
export { AfiliadosController, afiliadosController } from './afiliados.controller';
export { QRController, qrController } from './qr.controller';
export { PersonasController, personasController } from './personas.controller';

// Re-exportar como default para retrocompatibilidad
export { default as AuthControllerDefault } from './auth.controller';
export { default as AfiliadosControllerDefault } from './afiliados.controller';
export { default as QRControllerDefault } from './qr.controller';
export { default as PersonasControllerDefault } from './personas.controller';
