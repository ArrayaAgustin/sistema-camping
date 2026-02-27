import { Router, Request } from 'express';
import { VisitasService } from '../services/visitas.service';
import { authenticateMiddleware, checkPermission } from '../middlewares/auth.middleware';

const router = Router();
const visitasService = new VisitasService();

// POST /visitas
router.post('/', authenticateMiddleware, checkPermission('create:visitas'), async (req: Request, res) => {
  const {
    afiliado_id,
    persona_id,
    camping_id,
    periodo_caja_id = null,
    acompanantes = null,
    observaciones = '',
    registro_offline = false
  } = req.body;

  if ((!afiliado_id && !persona_id) || !camping_id) {
    return res.status(400).json({ error: 'camping_id y (afiliado_id o persona_id) son requeridos' });
  }

  if (!req.user) {
    return res.status(401).json({ error: 'Usuario no autenticado' });
  }

  try {
    const result = await visitasService.createVisita({
      afiliado_id,
      persona_id,
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

// POST /visitas/batch
router.post('/batch', authenticateMiddleware, checkPermission('create:visitas'), async (req: Request, res) => {
  const { camping_id, periodo_caja_id = null, personas, observaciones = '', registro_offline = false } = req.body;

  if (!camping_id || !Array.isArray(personas) || personas.length === 0) {
    return res.status(400).json({ error: 'camping_id y personas[] son requeridos' });
  }

  if (!req.user) {
    return res.status(401).json({ error: 'Usuario no autenticado' });
  }

  try {
    const result = await visitasService.createVisitasBatch({
      camping_id,
      periodo_caja_id,
      personas,
      observaciones,
      registro_offline
    }, req.user.id);

    return res.json(result);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: 'Error al registrar visitas batch' });
  }
});

// GET /visitas/periodo/:id
router.get('/periodo/:id', authenticateMiddleware, checkPermission('read:visitas'), async (req: Request, res) => {
  const periodoId = parseInt(req.params.id, 10);

  if (!periodoId || isNaN(periodoId)) {
    return res.status(400).json({ error: 'periodo_id inválido' });
  }

  try {
    const visitas = await visitasService.getVisitasByPeriodo(periodoId);
    return res.json(visitas);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: 'Error al obtener visitas del período' });
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