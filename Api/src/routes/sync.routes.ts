import { Router, Request } from 'express';
import { SyncService } from '../services/sync.service';
import { authenticateMiddleware, checkPermission } from '../middlewares/auth.middleware';

const router = Router();
const syncService = new SyncService();

// POST /sync/visitas
router.post('/visitas', authenticateMiddleware, checkPermission('sync:visitas', 'create:visitas'), async (req: Request, res) => {
  const { visitas, campingId } = req.body;

  if (!Array.isArray(visitas) || !campingId) {
    return res.status(400).json({ error: 'visitas(array) y campingId requeridos' });
  }

  if (!req.user) {
    return res.status(401).json({ error: 'Usuario no autenticado' });
  }

  try {
    const result = await syncService.syncVisitas({ visitas, campingId }, req.user.id);
    return res.json(result);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: 'Error al sincronizar visitas' });
  }
});

export default router;