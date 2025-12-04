const express = require('express');
const router = express.Router();
const prisma = require('../prisma');
const { authenticateMiddleware, checkPermission } = require('../auth');

// POST /sync/visitas
// body: { campingId, visitas: [ { uuid, afiliadoId, periodoCajaId, acompanantes, observaciones, fechaIngreso } ] }
router.post('/visitas', authenticateMiddleware, checkPermission('sync:visitas','create:visitas'), async (req, res) => {
  const { visitas, campingId } = req.body;
  if (!Array.isArray(visitas) || !campingId) return res.status(400).json({ error: 'visitas(array) y campingId requeridos' });

  let sincronizadas = 0;
  let errores = 0;

  // Procesar en serie (puedes paralelizar con Promise.all con control de concurrency)
  for (const item of visitas) {
    try {
      // comprobar si existe uuid
      const exists = await prisma.visitas.findUnique({ where: { uuid: item.uuid } });
      if (exists) continue;

      await prisma.visitas.create({
        data: {
          uuid: item.uuid,
          afiliado_id: item.afiliadoId,
          camping_id: campingId,
          periodo_caja_id: item.periodoCajaId || null,
          usuario_registro_id: req.user.userId,
          fecha_ingreso: item.fechaIngreso ? new Date(item.fechaIngreso) : undefined,
          acompanantes: item.acompanantes ? JSON.stringify(item.acompanantes) : '[]',
          observaciones: item.observaciones || '',
          registro_offline: true,
          sincronizado: true
        }
      });
      sincronizadas++;
      // actualizar periodo si aplica
      if (item.periodoCajaId) {
        await prisma.periodos_caja.updateMany({
          where: { id: item.periodoCajaId },
          data: { total_visitas: { increment: 1 } }
        });
      }
    } catch (err) {
      console.error('error sync item', item.uuid, err);
      errores++;
    }
  }

  // registrar log de sincronización
  await prisma.sync_logs.create({
    data: {
      usuario_id: req.user.userId,
      camping_id: campingId,
      tipo: 'batch',
      registros_sincronizados: sincronizadas,
      estado: errores === 0 ? 'success' : sincronizadas > 0 ? 'partial' : 'failed',
      detalles: { total: visitas.length, sincronizadas, errores }
    }
  });

  return res.json({ sincronizadas, errores });
});

module.exports = router;