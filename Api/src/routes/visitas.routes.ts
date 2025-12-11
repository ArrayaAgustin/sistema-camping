import { Router, Request } from 'express';
import { VisitasService } from '../services/visitas.service';
import { authenticateMiddleware, checkPermission } from '../middlewares/auth.middleware';

const router = Router();
const visitasService = new VisitasService();

// POST /visitas
router.post('/', authenticateMiddleware, checkPermission('create:visitas'), async (req: Request, res) => {
  const {
    afiliado_id,
    camping_id,
    periodo_caja_id = null,
    acompanantes = null,
    observaciones = '',
    registro_offline = false
  } = req.body;

  if (!afiliado_id || !camping_id) {
    return res.status(400).json({ error: 'afiliado_id y camping_id son requeridos' });
  }

  if (!req.user) {
    return res.status(401).json({ error: 'Usuario no autenticado' });
  }

  try {
    const result = await visitasService.createVisita({
      afiliado_id,
      camping_id,
      periodo_caja_id,
      acompanantes,
      observaciones,
      registro_offline
    }, req.user.id);

    return res.json(result);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: 'Error al registrar visita' });
  }
});

// GET /visitas/dia
router.get('/dia', authenticateMiddleware, checkPermission('read:visitas'), async (req: Request, res) => {
  const campingId = req.query.camping_id ? parseInt(req.query.camping_id as string, 10) : undefined;
  const fecha = req.query.fecha ? String(req.query.fecha) : new Date().toISOString().slice(0, 10);

  if (!campingId) {
    return res.status(400).json({ error: 'camping_id requerido' });
  }

  try {
    const visitas = await visitasService.getVisitasByDay(campingId, fecha);
    return res.json(visitas);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: 'Error al obtener visitas' });
  }
});

export default router;