import express, { Request, Response, NextFunction } from 'express';
import morgan from 'morgan';
import cookieParser from 'cookie-parser';
import cors from 'cors';
import { config } from './config';

// Importar router principal (incluye todas las rutas)
import apiRoutes from './routes';

// Middleware para respuestas extendidas
import { extendResponse } from './middlewares';
import { qrController } from 'controllers';

/**
 * Configuración principal de la aplicación Express
 */
const app = express();

// Middlewares globales
app.use(morgan(config.LOG_LEVEL));
app.use(cors({
  origin: function (origin, callback) {
    // Permitir requests sin origen (como apps móviles) o desde los orígenes permitidos
    const allowedOrigins = [
      'http://localhost:5173',
      'http://127.0.0.1:5173', 
      'http://localhost:3000',
      'http://127.0.0.1:3000',
      'http://localhost:5174',
      'http://127.0.0.1:5174'
    ];
    
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      console.log('🚫 CORS blocked origin:', origin);
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH', 'HEAD'],
  allowedHeaders: [
    'Content-Type',
    'Authorization', 
    'x-api-key',
    'Accept',
    'Origin',
    'X-Requested-With',
    'Access-Control-Request-Method',
    'Access-Control-Request-Headers'
  ],
  exposedHeaders: ['Content-Length', 'X-Foo', 'X-Bar'],
  optionsSuccessStatus: 200,
  preflightContinue: false
}));

// Middleware adicional para CORS manual
app.use((req: Request, res: Response, next: NextFunction) => {
  const origin = req.headers.origin;
  const allowedOrigins = [
    'http://localhost:5173',
    'http://127.0.0.1:5173', 
    'http://localhost:3000',
    'http://127.0.0.1:3000',
    'http://localhost:5174',
    'http://127.0.0.1:5174'
  ];

  if (!origin || allowedOrigins.includes(origin)) {
    res.header('Access-Control-Allow-Origin', origin || '*');
  }
  
  res.header('Access-Control-Allow-Credentials', 'true');
  res.header('Access-Control-Allow-Methods', 'GET,PUT,POST,DELETE,OPTIONS,PATCH,HEAD');
  res.header('Access-Control-Allow-Headers', 'Content-Type,Authorization,x-api-key,Accept,Origin,X-Requested-With,Access-Control-Request-Method,Access-Control-Request-Headers');
  res.header('Access-Control-Max-Age', '86400'); // 24 hours
  
  if (req.method === 'OPTIONS') {
    console.log('🔧 Handling OPTIONS preflight for:', req.originalUrl);
    res.sendStatus(200);
  } else {
    next();
  }
});

app.use(express.json({ 
  limit: '2mb',
  strict: true,
  type: 'application/json'
}));

app.use(cookieParser());

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
console.log('   📝 /api/visitas/* (TypeScript ✅)');
console.log('   🔄 /api/sync/* (TypeScript ✅)');
console.log('   💰 /api/periodos-caja/* (Turnos/Caja ✅)');
console.log('   📊 /api/health (Health check)');
console.log('   📚 /api/docs (Documentación)');
console.log('   📚 /api/qr (QR)');

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
      info: '/api/info',
      qr: '/qr'
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