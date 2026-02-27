import { Router } from 'express';
import { personasController } from '../controllers/personas.controller';
import { authenticateMiddleware, checkPermission, standardRateLimit, validateBody, validateParams, validateQuery, ValidationSchemas } from '../middlewares';

/**
 * Rutas de personas
 */
const router = Router();

// GET /personas/me - Persona del usuario autenticado (solo requiere auth, no read:personas)
router.get('/me',
  authenticateMiddleware,
  checkPermission('read:own', 'read:personas', 'admin'),
  standardRateLimit,
  personasController.getMyPersona
);

// GET /personas/search - Búsqueda unificada
router.get('/search',
  authenticateMiddleware,
  checkPermission('read:personas', 'admin'),
  standardRateLimit,
  validateQuery(ValidationSchemas.searchPersonas),
  personasController.searchPersonas
);

// GET /personas/titular?dni=... - Buscar afiliado titular por DNI
router.get('/titular',
  authenticateMiddleware,
  checkPermission('read:personas', 'admin'),
  standardRateLimit,
  validateQuery(ValidationSchemas.searchTitular),
  personasController.getTitularByDni
);

// GET /personas/dni/:dni - Detalle completo por DNI
router.get('/dni/:dni',
  authenticateMiddleware,
  checkPermission('read:personas', 'admin'),
  standardRateLimit,
  validateParams(ValidationSchemas.dniParam),
  personasController.getPersonaByDni
);

// GET /personas/:id - Detalle completo
router.get('/:id',
  authenticateMiddleware,
  checkPermission('read:personas', 'admin'),
  standardRateLimit,
  validateParams(ValidationSchemas.idParam),
  personasController.getPersonaById
);

// POST /personas - Alta de persona (identidad base)
router.post('/',
  authenticateMiddleware,
  checkPermission('create:personas', 'admin'),
  standardRateLimit,
  validateBody(ValidationSchemas.createPersona),
  personasController.createPersona
);

// PUT /personas/:id - Editar persona
router.put('/:id',
  authenticateMiddleware,
  checkPermission('update:personas', 'admin'),
  standardRateLimit,
  validateParams(ValidationSchemas.idParam),
  validateBody(ValidationSchemas.updatePersona),
  personasController.updatePersona
);

export default router;
