import { Router } from 'express';
import { afiliadosController } from '../controllers';
import { 
  authenticateMiddleware, 
  optionalAuth, 
  checkPermission, 
  searchRateLimit, 
  standardRateLimit, 
  uploadRateLimit, 
  validateParams, 
  validateQuery, 
  validateBody, 
  ValidationSchemas 
} from '../middlewares';

/**
 * Rutas de afiliados
 * Maneja búsquedas, consultas y gestión de afiliados y familiares
 */
const router = Router();

// GET /afiliados - Buscar afiliados (autenticación opcional para búsquedas públicas)
router.get('/', 
  optionalAuth,
  searchRateLimit,
  validateQuery(ValidationSchemas.searchAfiliados),
  afiliadosController.searchAfiliados
);

// GET /afiliados/stats/padron - Obtener estadísticas del padrón (antes de :id)
router.get('/stats/padron', 
  authenticateMiddleware, 
  checkPermission('read:afiliados', 'admin'), 
  standardRateLimit,
  afiliadosController.getPadronStats
);

// GET /afiliados/version/padron - Obtener versión del padrón (antes de :id)
router.get('/version/padron', 
  authenticateMiddleware, 
  standardRateLimit,
  afiliadosController.getPadronVersion
);

// GET /afiliados/numero/:numeroAfiliado - Buscar por número de afiliado
router.get('/numero/:numeroAfiliado', 
  optionalAuth,
  searchRateLimit,
  validateParams({
    numeroAfiliado: { required: true, type: 'string', minLength: 1, maxLength: 20 }
  }),
  afiliadosController.getAfiliadoByNumero
);

// GET /afiliados/documento/:documento - Buscar por documento
router.get('/documento/:documento', 
  optionalAuth,
  searchRateLimit,
  validateParams({
    documento: { required: true, type: 'string', minLength: 7, maxLength: 20 }
  }),
  afiliadosController.getAfiliadosByDocumento
);

// POST /afiliados/search/advanced - Búsqueda avanzada
router.post('/search/advanced', 
  optionalAuth,
  searchRateLimit,
  validateBody({
    text: { required: false, type: 'string', maxLength: 100 },
    estado: { required: false, type: 'string', enum: ['activo', 'inactivo', 'all'] },
    seccion: { required: false, type: 'string', maxLength: 50 },
    delegacion: { required: false, type: 'string', maxLength: 50 },
    fechaNacimientoDesde: { required: false, type: 'string' },
    fechaNacimientoHasta: { required: false, type: 'string' },
    page: { required: false, type: 'number', min: 1 },
    pageSize: { required: false, type: 'number', min: 1, max: 100 },
    sortBy: { required: false, type: 'string', enum: ['apellido', 'nombres', 'documento', 'fechaNacimiento'] },
    sortOrder: { required: false, type: 'string', enum: ['asc', 'desc'] }
  }),
  afiliadosController.advancedSearch
);

// GET /afiliados/:id - Obtener afiliado específico (debe ir al final)
router.get('/:id', 
  optionalAuth,
  searchRateLimit,
  validateParams(ValidationSchemas.idParam),
  afiliadosController.getAfiliadoById
);

// PUT /afiliados/:id - Actualizar afiliado
router.put('/:id', 
  authenticateMiddleware, 
  uploadRateLimit,
  validateParams(ValidationSchemas.idParam),
  validateBody(ValidationSchemas.updateAfiliado),
  afiliadosController.updateAfiliado
);

export default router;