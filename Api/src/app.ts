import express, { Request, Response, NextFunction } from 'express';
import morgan from 'morgan';
import cors from 'cors';
import { config } from './config';

// Importar router principal (incluye todas las rutas)
import apiRoutes from './routes';

// Middleware para respuestas extendidas
import { extendResponse } from './middlewares';

/**
 * Configuración principal de la aplicación Express
 */
const app = express();

// Middlewares globales
app.use(morgan(config.LOG_LEVEL));
app.use(cors({
  origin: config.CORS_ORIGIN,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'x-api-key'],
}));

app.use(express.json({ 
  limit: '2mb',
  strict: true,
  type: 'application/json'
}));

app.use(express.urlencoded({ 
  extended: true,
  limit: '2mb'
}));

// Security middleware
app.use((req: Request, res: Response, next: NextFunction) => {
  // Remove sensitive headers
  res.removeHeader('x-powered-by');
  
  // Add security headers
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  
  next();
});

// Extend response object with utility methods
app.use(extendResponse);

// Health check endpoint
app.get('/', (req: Request, res: Response) => {
  res.json({
    status: 'ok',
    service: 'SMATA Camping API',
    version: '2.0.0',
    timestamp: new Date().toISOString(),
    environment: config.NODE_ENV,
    uptime: process.uptime(),
    memory: process.memoryUsage()
  });
});

// Configurar todas las rutas de la API
app.use('/api', apiRoutes);

// Mantener endpoint raíz para backward compatibility
app.use('/auth', apiRoutes);
app.use('/afiliados', apiRoutes);

// Log de rutas configuradas
console.log('📋 Rutas configuradas:');
console.log('   🔗 /api/* (Todas las rutas bajo /api)');
console.log('   🔐 /api/auth/* (Autenticación)');
console.log('   👥 /api/afiliados/* (Afiliados)');
console.log('   📝 /api/visitas/* (Legacy)');
console.log('   🔄 /api/sync/* (Legacy)');
console.log('   📊 /api/health (Health check)');
console.log('   📚 /api/docs (Documentación)');

// Middleware de manejo de errores 404
app.use('*', (req: Request, res: Response) => {
  res.status(404).json({
    error: 'Route not found',
    details: `${req.method} ${req.originalUrl} not found`,
    availableRoutes: {
      auth: '/auth',
      afiliados: '/afiliados', 
      visitas: '/visitas',
      sync: '/sync',
      health: '/',
      info: '/api/info'
    },
    timestamp: new Date().toISOString()
  });
});

// Middleware de manejo de errores globales
app.use((err: Error & { status?: number; name?: string }, req: Request, res: Response, next: NextFunction) => {
  console.error('❌ Unhandled error:', {
    message: err.message,
    stack: err.stack,
    url: req.url,
    method: req.method,
    timestamp: new Date().toISOString()
  });
  
  // Error de JSON malformado
  if (err instanceof SyntaxError && err.status === 400 && 'body' in err) {
    return res.status(400).json({
      error: 'Invalid JSON',
      details: 'Request body contains invalid JSON',
      timestamp: new Date().toISOString()
    });
  }
  
  // Error de validación de tipos
  if (err.name === 'ValidationError') {
    return res.status(400).json({
      error: 'Validation Error',
      details: err.message,
      timestamp: new Date().toISOString()
    });
  }
  
  // Error de autenticación
  if (err.name === 'UnauthorizedError') {
    return res.status(401).json({
      error: 'Unauthorized',
      details: 'Invalid authentication credentials',
      timestamp: new Date().toISOString()
    });
  }
  
  // Error genérico
  return res.status(500).json({
    error: 'Internal server error',
    details: config.NODE_ENV === 'development' ? err.message : 'Something went wrong',
    timestamp: new Date().toISOString(),
    requestId: req.headers['x-request-id'] || 'unknown'
  });
});

export default app;