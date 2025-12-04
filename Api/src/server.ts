import 'module-alias/register';
import { config } from './config';
import app from './app';

/**
 * Servidor principal de la API
 */

// Manejo de errores no capturados
process.on('uncaughtException', (err: Error) => {
  console.error('❌ Uncaught Exception:', err.message);
  console.error('Stack:', err.stack);
  
  if (config.NODE_ENV === 'production') {
    console.log('🔄 Restarting server due to uncaught exception...');
    process.exit(1);
  }
});

process.on('unhandledRejection', (err: Error | any) => {
  console.error('❌ Unhandled Rejection:', err.message || err);
  console.error('Stack:', err.stack);
  
  if (config.NODE_ENV === 'production') {
    console.log('🔄 Restarting server due to unhandled rejection...');
    process.exit(1);
  }
});

// Iniciar servidor
const server = app.listen(config.PORT, () => {
  console.log(`🚀 API listening on port ${config.PORT}`);
  console.log(`🌍 Environment: ${config.NODE_ENV}`);
  console.log(`📊 Health: http://localhost:${config.PORT}/`);
  console.log(`🔐 Login: POST http://localhost:${config.PORT}/auth/login`);
  console.log(`👥 Afiliados: GET http://localhost:${config.PORT}/afiliados`);
  
  if (config.NODE_ENV === 'development') {
    console.log('🔧 Development mode - detailed error reporting enabled');
    console.log('📍 Available endpoints:');
    console.log('   - GET  / (Health check)');
    console.log('   - POST /auth/login (Authentication)');
    console.log('   - GET  /auth/profile (User profile)');
    console.log('   - GET  /afiliados (Search affiliates)');
    console.log('   - GET  /afiliados/:id (Get affiliate by ID)');
  }
});

// Configurar timeout del servidor
server.timeout = 30000; // 30 segundos

// Manejo de cierre graceful
const gracefulShutdown = (signal: string) => {
  console.log(`📋 ${signal} received, shutting down gracefully...`);
  server.close(async () => {
    console.log('🔴 Server closed');
    
    // Cerrar conexiones de base de datos
    try {
      const { disconnectPrisma } = await import('./config');
      await disconnectPrisma();
    } catch (error) {
      console.error('❌ Error closing database connection:', error);
    }
    
    process.exit(0);
  });

  // Forzar cierre después de 10 segundos
  setTimeout(() => {
    console.error('❌ Could not close connections in time, forcefully shutting down');
    process.exit(1);
  }, 10000);
};

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

export default server;