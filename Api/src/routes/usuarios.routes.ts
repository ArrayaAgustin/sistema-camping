import { Router } from 'express';
import usuariosService from '../services/usuarios.service';
import { authenticateMiddleware, requireAdmin } from '../middlewares';

const router = Router();

// GET /usuarios/catalogo - Roles y campings disponibles (admin)
router.get('/catalogo',
  authenticateMiddleware,
  requireAdmin,
  async (_req, res) => {
    try {
      const catalogo = await usuariosService.getCatalogo();
      return res.json({ success: true, data: catalogo });
    } catch (error: any) {
      return res.status(500).json({ error: error.message });
    }
  }
);

// Crear usuario a partir de persona existente (admin)
router.post('/',
  authenticateMiddleware,
  requireAdmin,
  async (req, res) => {
    try {
      const { personaId, dni } = req.body;
      if (!personaId || !dni) {
        return res.status(400).json({ error: 'personaId y dni son requeridos' });
      }
      const usuario = await usuariosService.createUsuarioFromPersona({ personaId, dni });
      return res.json(usuario);
    } catch (error: any) {
      return res.status(400).json({ error: error.message });
    }
  }
);

// Asignar rol a usuario (admin)
router.post('/roles',
  authenticateMiddleware,
  requireAdmin,
  async (req, res) => {
    try {
      const { usuarioId, rolId, campingId } = req.body;
      if (!usuarioId) {
        return res.status(400).json({ error: 'usuarioId es requerido' });
      }
      const usuarioRol = await usuariosService.asignarRolUsuario({ usuarioId, rolId, campingId });
      return res.json(usuarioRol);
    } catch (error: any) {
      return res.status(400).json({ error: error.message });
    }
  }
);

export default router;
