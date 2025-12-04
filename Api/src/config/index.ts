/**
 * Barrel export para toda la configuración del sistema
 */

export { config, type IAppConfig } from './env';
export { 
  prisma, 
  getPrismaClient, 
  disconnectPrisma, 
  isConnected, 
  healthCheck 
} from './prisma-config';

// Re-exportar como default para retrocompatibilidad
export { default as envConfig } from './env';
export { default as prismaClient } from './prisma-config';