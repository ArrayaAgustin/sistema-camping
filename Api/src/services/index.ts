/**
 * Barrel export para todos los servicios del sistema
 * Permite importar los servicios desde un solo punto
 */

// Servicios principales
export { AuthService, authService } from './auth.service';
export { AfiliadosService, afiliadosService } from './afiliados.service';
export { VisitasService, visitasService } from './visitas.service';
export { SyncService, syncService } from './sync.service';
export { PersonasService, personasService } from './personas.service';

// Re-exportar como default para retrocompatibilidad
export { default as AuthServiceDefault } from './auth.service';
export { default as AfiliadosServiceDefault } from './afiliados.service';
export { default as VisitasServiceDefault } from './visitas.service';
export { default as SyncServiceDefault } from './sync.service';
export { default as PersonasServiceDefault } from './personas.service';