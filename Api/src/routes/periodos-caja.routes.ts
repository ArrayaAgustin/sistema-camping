import { Router, Request } from 'express';
import { PeriodosCajaService } from '../services/periodos-caja.service';
import { authenticateMiddleware, checkPermission } from '../middlewares/auth.middleware';

const router = Router();
const periodosCajaService = new PeriodosCajaService();

// POST /periodos-caja/abrir - Abrir nuevo período de caja
router.post('/abrir', authenticateMiddleware, checkPermission('manage:caja'), async (req: Request, res) => {
  const { camping_id, observaciones } = req.body;

  if (!camping_id) {
    return res.status(400).json({ 
      success: false,
      error: 'camping_id es requerido' 
    });
  }

  if (!req.user) {
    return res.status(401).json({ 
      success: false,
      error: 'Usuario no autenticado' 
    });
  }

  try {
    const result = await periodosCajaService.abrirPeriodo({
      camping_id,
      observaciones
    }, req.user.id);

    return res.status(201).json(result);
  } catch (error: any) {
    console.error('Error al abrir período:', error);
    return res.status(400).json({ 
      success: false,
      error: error.message 
    });
  }
});

// PUT /periodos-caja/:id/cerrar - Cerrar período de caja
router.put('/:id/cerrar', authenticateMiddleware, checkPermission('manage:caja'), async (req: Request, res) => {
  const periodoId = parseInt(req.params.id, 10);
  const { observaciones } = req.body;

  if (!periodoId || isNaN(periodoId)) {
    return res.status(400).json({ 
      success: false,
      error: 'ID de período inválido' 
    });
  }

  if (!req.user) {
    return res.status(401).json({ 
      success: false,
      error: 'Usuario no autenticado' 
    });
  }

  try {
    const result = await periodosCajaService.cerrarPeriodo(periodoId, {
      observaciones
    }, req.user.id);

    return res.json(result);
  } catch (error: any) {
    console.error('Error al cerrar período:', error);
    return res.status(400).json({ 
      success: false,
      error: error.message 
    });
  }
});

// GET /periodos-caja/activo?camping_id=X - Obtener período activo
router.get('/activo', authenticateMiddleware, checkPermission('read:caja'), async (req: Request, res) => {
  const campingId = req.query.camping_id ? parseInt(req.query.camping_id as string, 10) : undefined;

  if (!campingId || isNaN(campingId)) {
    return res.status(400).json({ 
      success: false,
      error: 'camping_id es requerido y debe ser un número válido' 
    });
  }

  try {
    const periodo = await periodosCajaService.getPeriodoActivo(campingId);

    if (!periodo) {
      return res.json({ 
        success: true,
        periodo: null,
        message: 'No hay período de caja activo en este camping'
      });
    }

    return res.json({ 
      success: true,
      periodo,
      message: 'Período activo encontrado'
    });
  } catch (error: any) {
    console.error('Error al obtener período activo:', error);
    return res.status(500).json({ 
      success: false,
      error: 'Error interno del servidor' 
    });
  }
});

// GET /periodos-caja/:id - Obtener período por ID
router.get('/:id', authenticateMiddleware, checkPermission('read:caja'), async (req: Request, res) => {
  const periodoId = parseInt(req.params.id, 10);

  if (!periodoId || isNaN(periodoId)) {
    return res.status(400).json({ 
      success: false,
      error: 'ID de período inválido' 
    });
  }

  try {
    const periodo = await periodosCajaService.getPeriodoById(periodoId);

    if (!periodo) {
      return res.status(404).json({ 
        success: false,
        error: 'Período de caja no encontrado' 
      });
    }

    return res.json({ 
      success: true,
      periodo,
      message: 'Período encontrado'
    });
  } catch (error: any) {
    console.error('Error al obtener período:', error);
    return res.status(500).json({ 
      success: false,
      error: 'Error interno del servidor' 
    });
  }
});

// GET /periodos-caja/historial?camping_id=X&limite=20 - Obtener historial de períodos
router.get('/historial', authenticateMiddleware, checkPermission('read:caja'), async (req: Request, res) => {
  const campingId = req.query.camping_id ? parseInt(req.query.camping_id as string, 10) : undefined;
  const limite = req.query.limite ? parseInt(req.query.limite as string, 10) : 20;

  if (!campingId || isNaN(campingId)) {
    return res.status(400).json({ 
      success: false,
      error: 'camping_id es requerido y debe ser un número válido' 
    });
  }

  try {
    const periodos = await periodosCajaService.getHistorialPeriodos(campingId, limite);

    return res.json({ 
      success: true,
      periodos,
      total: periodos.length,
      message: 'Historial obtenido exitosamente'
    });
  } catch (error: any) {
    console.error('Error al obtener historial:', error);
    return res.status(500).json({ 
      success: false,
      error: 'Error interno del servidor' 
    });
  }
});

export default router;