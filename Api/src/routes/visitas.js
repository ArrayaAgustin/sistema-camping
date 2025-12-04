const express = require('express');
const router = express.Router();
const prisma = require('../prisma');
const { authenticateMiddleware, checkPermission } = require('../auth');
const { v4: uuidv4 } = require('uuid');

// POST /visitas
router.post('/', authenticateMiddleware, checkPermission('create:visitas'), async (req, res) => {
  const {
    afiliado_id,
    camping_id,
    periodo_caja_id = null,
    acompanantes = null,
    observaciones = '',
    registro_offline = false
  } = req.body;
  if (!afiliado_id || !camping_id) return res.status(400).json({ error: 'afiliado_id y camping_id son requeridos' });

  const uuid = uuidv4();
  try {
    const visita = await prisma.visitas.create({
      data: {
        uuid,
        afiliado_id,
        camping_id,
        periodo_caja_id,
        usuario_registro_id: req.user.userId,
        acompanantes: acompanantes ? JSON.stringify(acompanantes) : '[]',
        observaciones,
        registro_offline,
        sincronizado: !registro_offline
      }
    });

    // actualizar total_visitas si periodo_caja_id presente (no transaccional, adapt según necesidad)
    if (periodo_caja_id) {
      await prisma.periodos_caja.updateMany({
        where: { id: periodo_caja_id },
        data: { total_visitas: { increment: 1 } }
      });
    }

    return res.json({ visita_id: visita.id, uuid });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'error al registrar visita' });
  }
});

// GET /visitas/dia?camping_id=1&fecha=YYYY-MM-DD
router.get('/dia', authenticateMiddleware, checkPermission('read:visitas'), async (req, res) => {
  const campingId = parseInt(req.query.camping_id, 10);
  const fecha = req.query.fecha || new Date().toISOString().slice(0,10);
  if (!campingId) return res.status(400).json({ error: 'camping_id requerido' });

  try {
    const fechaInicio = new Date(fecha + 'T00:00:00.000Z');
    const fechaFin = new Date(fecha + 'T23:59:59.999Z');
    
    const visitas = await prisma.visitas.findMany({
      where: {
        camping_id: campingId,
        fecha_ingreso: {
          gte: fechaInicio,
          lte: fechaFin
        }
      },
      include: {
        Afiliado: {
          select: {
            dni: true,
            apellido: true,
            nombres: true,
            situacion_sindicato: true,
            situacion_obra_social: true
          }
        }
      },
      orderBy: {
        fecha_ingreso: 'desc'
      }
    });
    return res.json(visitas);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'server error' });
  }
});

module.exports = router;