import { Router } from 'express';
import authRoutes from './auth.routes';
import afiliadosRoutes from './afiliados.routes';
import visitasRoutes from './visitas.routes';
import syncRoutes from './sync.routes';
import periodosCajaRoutes from './periodos-caja.routes';


// Importar rutas legacy (JavaScript) que aún no se han migrado
//const visitasRoutes = require('./visitas');
//const syncRoutes = require('./sync');

/**
 * Router principal que agrupa todas las rutas de la API
 */
const router = Router();

// Rutas de autenticación (TypeScript)
router.use('/auth', authRoutes);

// Rutas de afiliados (TypeScript) 
router.use('/afiliados', afiliadosRoutes);

// Rutas de visitas (TypeScript)
router.use('/visitas', visitasRoutes);

// Rutas de sincronización (TypeScript)
router.use('/sync', syncRoutes);

// Rutas de períodos de caja (TypeScript)
router.use('/periodos-caja', periodosCajaRoutes);

// Rutas legacy (JavaScript) - TODO: Migrar a TypeScript
//router.use('/visitas', visitasRoutes);
//router.use('/sync', syncRoutes);

// Ruta de health check
router.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    service: 'SMATA Camping API',
    version: '2.0.0',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    memory: process.memoryUsage(),
    routes: {
      auth: '/auth',
      afiliados: '/afiliados',
      visitas: '/visitas',
      sync: '/sync',
      periodosCaja: '/periodos-caja'
    }
  });
});

// Documentación de la API
router.get('/docs', (req, res) => {
  res.json({
    name: 'SMATA Camping API',
    version: '2.0.0',
    description: 'API para gestión de afiliados y servicios de camping SMATA',
    baseUrl: `${req.protocol}://${req.get('host')}`,
    endpoints: {
      auth: {
        login: 'POST /auth/login',
        register: 'POST /auth/register',
        profile: 'GET /auth/profile',
        logout: 'POST /auth/logout',
        refresh: 'POST /auth/refresh',
        changePassword: 'POST /auth/change-password',
        createUser: 'POST /auth/create-user (admin only)'
      },
      afiliados: {
        search: 'GET /afiliados',
        getById: 'GET /afiliados/:id',
        getByNumero: 'GET /afiliados/numero/:numeroAfiliado',
        getByDocumento: 'GET /afiliados/documento/:documento',
        advancedSearch: 'POST /afiliados/search/advanced',
        update: 'PUT /afiliados/:id',
        stats: 'GET /afiliados/stats/padron',
        version: 'GET /afiliados/version/padron'
      },
      visitas: {
        create: 'POST /visitas',
        getByDay: 'GET /visitas/dia?camping_id=X&fecha=YYYY-MM-DD'
      },
      sync: {
        syncVisitas: 'POST /sync/visitas'
      },
      periodosCaja: {
        abrir: 'POST /periodos-caja/abrir',
        cerrar: 'PUT /periodos-caja/:id/cerrar',
        activo: 'GET /periodos-caja/activo?camping_id=X',
        getPeriodo: 'GET /periodos-caja/:id',
        historial: 'GET /periodos-caja/historial?camping_id=X&limite=20'
      },
      util: {
        health: 'GET /health',
        docs: 'GET /docs'
      }
    },
    authentication: {
      type: 'JWT Bearer Token',
      header: 'Authorization: Bearer <token>',
      loginEndpoint: 'POST /auth/login'
    },
    rateLimiting: {
      login: '5 requests per 15 minutes',
      search: '30 requests per minute',
      api: '100 requests per 15 minutes',
      upload: '10 requests per minute'
    }
  });
});

export default router;