import { Router } from 'express';
import {  qrController} from '../controllers';
import {
  optionalAuth,
  standardRateLimit,
  validateParams
} from '../middlewares';

/**
 * Rutas de resolución de QR
 * Devuelve la identidad asociada a un código QR
 */
const router = Router();

/**
 * GET /qr/:qr
 * Resuelve un QR y devuelve persona + tipo (afiliado / familiar / invitado)
 *
 * Auth opcional:
 * - Puede ser usado por lectores públicos
 * - Si hay usuario logueado, luego se validan permisos en capas superiores
 */
router.get(
  '/dni/:dni',
  optionalAuth,
  standardRateLimit,
  validateParams({
    dni: { required: true, type: 'string', minLength: 6, maxLength: 20 }
  }),
  (req, res) => qrController.resolveByDNI(req, res)
);

router.get(
  '/:qr',
  optionalAuth,
  standardRateLimit,
  validateParams({
    qr: { required: true, type: 'string', minLength: 3, maxLength: 255 }
  }),
  qrController.resolveQR
);

export default router;
