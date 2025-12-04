import { PrismaClient, Prisma } from '@prisma/client';
import { config } from './env';

/**
 * Configuración del cliente Prisma
 */
const prismaConfig: Prisma.PrismaClientOptions = {
  log: config.NODE_ENV === 'development' 
    ? ['query', 'info', 'warn', 'error'] 
    : ['error'],
  errorFormat: 'pretty',
};

/**
 * Clase singleton para manejar la conexión a la base de datos
 */
class PrismaManager {
  private static instance: PrismaClient | null = null;
  private static isConnected: boolean = false;

  /**
   * Obtiene la instancia única del cliente Prisma
   */
  static getInstance(): PrismaClient {
    if (!PrismaManager.instance) {
      PrismaManager.instance = new PrismaClient(prismaConfig);
      PrismaManager.setupEventHandlers();
      PrismaManager.connect();
    }
    
    return PrismaManager.instance;
  }

  /**
   * Establece conexión con la base de datos
   */
  private static async connect(): Promise<void> {
    if (!PrismaManager.instance || PrismaManager.isConnected) {
      return;
    }

    try {
      await PrismaManager.instance.$connect();
      PrismaManager.isConnected = true;
      console.log('✅ Database connected successfully');
      
      // Verificar conexión con una consulta simple
      await PrismaManager.instance.$queryRaw`SELECT 1`;
      
    } catch (error) {
      console.error('❌ Database connection failed:', error);
      process.exit(1);
    }
  }

  /**
   * Cierra la conexión con la base de datos
   */
  static async disconnect(): Promise<void> {
    if (PrismaManager.instance && PrismaManager.isConnected) {
      await PrismaManager.instance.$disconnect();
      PrismaManager.isConnected = false;
      console.log('📋 Database connection closed');
    }
  }

  /**
   * Configura los manejadores de eventos para cierre de aplicación
   */
  private static setupEventHandlers(): void {
    // Manejar cierre de la aplicación
    process.on('beforeExit', async () => {
      await PrismaManager.disconnect();
    });
    
    process.on('SIGINT', async () => {
      await PrismaManager.disconnect();
      process.exit(0);
    });

    process.on('SIGTERM', async () => {
      await PrismaManager.disconnect();
      process.exit(0);
    });

    // Manejar errores no capturados
    process.on('unhandledRejection', (reason, promise) => {
      console.error('❌ Unhandled Rejection at:', promise, 'reason:', reason);
      PrismaManager.disconnect().finally(() => process.exit(1));
    });

    process.on('uncaughtException', (error) => {
      console.error('❌ Uncaught Exception:', error);
      PrismaManager.disconnect().finally(() => process.exit(1));
    });
  }

  /**
   * Obtiene el estado de la conexión
   */
  static getConnectionStatus(): boolean {
    return PrismaManager.isConnected;
  }

  /**
   * Ejecuta un health check de la base de datos
   */
  static async healthCheck(): Promise<boolean> {
    try {
      if (!PrismaManager.instance) {
        return false;
      }
      
      await PrismaManager.instance.$queryRaw`SELECT 1`;
      return true;
    } catch (error) {
      console.error('❌ Database health check failed:', error);
      return false;
    }
  }
}

// Crear y exportar la instancia única
export const prisma = PrismaManager.getInstance();

// Exportar funciones utilitarias
export const getPrismaClient = (): PrismaClient => PrismaManager.getInstance();
export const disconnectPrisma = (): Promise<void> => PrismaManager.disconnect();
export const isConnected = (): boolean => PrismaManager.getConnectionStatus();
export const healthCheck = (): Promise<boolean> => PrismaManager.healthCheck();

export default prisma;