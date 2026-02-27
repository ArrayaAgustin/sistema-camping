import { Router } from 'express';
import { campingsController } from '../controllers/campings.controller';
import { authenticateMiddleware, checkPermission, standardRateLimit } from '../middlewares';

const router = Router();

// GET /campings - Lista pública (sin auth) para el Home
router.get('/', standardRateLimit, (req, res) => campingsController.getAll(req, res));

// GET /campings/admin - Lista completa incluyendo inactivos (solo admin)
router.get('/admin',
  authenticateMiddleware,
  checkPermission('admin'),
  standardRateLimit,
  (req, res) => campingsController.getAllAdmin(req, res)
);

// POST /campings - Crear camping (solo admin)
router.post('/',
  authenticateMiddleware,
  checkPermission('admin'),
  standardRateLimit,
  (req, res) => campingsController.create(req, res)
);

// PUT /campings/:id - Actualizar camping (solo admin)
router.put('/:id',
  authenticateMiddleware,
  checkPermission('admin'),
  standardRateLimit,
  (req, res) => campingsController.update(req, res)
);

export default router;
