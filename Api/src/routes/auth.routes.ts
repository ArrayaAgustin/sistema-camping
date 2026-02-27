import { Router } from 'express';
import { authController } from '../controllers';
import { 
  authenticateMiddleware, 
  requireAdmin, 
  loginRateLimit, 
  standardRateLimit, 
  validateBody, 
  validateParams, 
  ValidationSchemas 
} from '../middlewares';

/**
 * Rutas de autenticación
 * Maneja login, registro, perfiles y gestión de usuarios
 */
const router = Router();

// POST /auth/login - Autenticar usuario
router.post('/login', 
  loginRateLimit,
  validateBody(ValidationSchemas.login),
  authController.login
);

// POST /auth/register - Registrar nuevo usuario (público)
router.post('/register', 
  standardRateLimit,
  validateBody(ValidationSchemas.register),
  authController.register
);

// POST /auth/create-user - Crear usuario (solo admin)
router.post('/create-user', 
  authenticateMiddleware, 
  requireAdmin,
  standardRateLimit,
  validateBody({
    username: { required: true, type: 'string', minLength: 3, maxLength: 50 },
    email: { required: true, type: 'email' },
    afiliado_id: { required: false, type: 'number' },
    persona_id: { required: false, type: 'number' },
    activo: { required: false, type: 'boolean' }
  }),
  authController.createUser
);

// GET /auth/profile - Obtener perfil del usuario autenticado
router.get('/profile', 
  authenticateMiddleware, 
  standardRateLimit,
  authController.getProfile
);

// POST /auth/logout - Cerrar sesión
router.post('/logout', 
  authenticateMiddleware, 
  standardRateLimit,
  authController.logout
);

// POST /auth/refresh - Renovar token JWT
router.post('/refresh', 
  authenticateMiddleware, 
  standardRateLimit,
  authController.refreshToken
);

// POST /auth/change-password - Cambiar contraseña
router.post('/change-password', 
  authenticateMiddleware, 
  standardRateLimit,
  validateBody({
    currentPassword: { required: false, type: 'string' },
    newPassword: { required: true, type: 'string', minLength: 6 }
  }),
  authController.changePassword
);

// POST /auth/reset-password - Resetear contraseña al DNI (admin)
router.post('/reset-password',
  authenticateMiddleware,
  requireAdmin,
  standardRateLimit,
  validateBody({
    userId: { required: false, type: 'number' },
    username: { required: false, type: 'string', minLength: 3, maxLength: 50 }
  }),
  authController.resetPassword
);

export default router;