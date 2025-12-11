/**
 * Barrel export para todas las interfaces del sistema
 * Organizadas por módulos para mejor mantenibilidad
 */

// Interfaces de autenticación
export * from './auth';

// Interfaces de afiliados
export * from './afiliados';

// Interfaces de visitas
export * from './visitas';

// Interfaces comunes (middlewares, utilidades)
export * from './common';

// Re-exportar tipos comunes para conveniencia
export * from '../types';