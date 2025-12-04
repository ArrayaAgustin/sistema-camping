const express = require('express');
const router = express.Router();
const prisma = require('../prisma');
const { authenticateMiddleware, checkPermission } = require('../auth');

// GET /afiliados?tipo=dni|apellido|general&q=...&limit=20
router.get('/', authenticateMiddleware, checkPermission('read:afiliados'), async (req, res) => {
  const tipo = req.query.tipo || 'general';
  const q = req.query.q || req.query.dni || '';
  const limit = parseInt(req.query.limit, 10) || 20;

  try {
    if (tipo === 'dni') {
      const a = await prisma.afiliados.findMany({
        where: { dni: q, activo: true },
        take: limit,
        include: { Familiares: { where: { activo: true } } }
      });
      return res.json(a);
    }

    if (tipo === 'apellido') {
      const a = await prisma.afiliados.findMany({
        where: { apellido: { startsWith: q.toUpperCase() }, activo: true },
        take: limit,
        orderBy: [{ apellido: 'asc' }, { nombres: 'asc' }],
        include: { Familiares: { where: { activo: true } } }
      });
      return res.json(a);
    }

    // general: simple search on apellido/nombres/dni
    const a = await prisma.afiliados.findMany({
      where: {
        activo: true,
        OR: [
          { apellido: { contains: q.toUpperCase() } },
          { nombres: { contains: q.toUpperCase() } },
          { dni: { contains: q } }
        ]
      },
      orderBy: [
        { apellido: 'asc' },
        { nombres: 'asc' }
      ],
      take: limit,
      include: { Familiares: { where: { activo: true } } }
    });
    return res.json(a);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'server error' });
  }
});

// GET /afiliados/:id -> afiliado + familiares
router.get('/:id', authenticateMiddleware, async (req, res) => {
  const id = parseInt(req.params.id, 10);
  if (!id) return res.status(400).json({ error: 'invalid id' });

  // allow owner (read:own) or read:afiliados
  const user = req.user;
  const isOwner = user?.afiliadoId && user.afiliadoId === id;
  const hasPermission = (req.user.permisos || []).includes('read:afiliados') || ((req.user.permisos || []).includes('read:own') && isOwner);
  if (!hasPermission) return res.status(403).json({ error: 'Sin permisos' });

  try {
    const afiliado = await prisma.afiliados.findUnique({ where: { id }, include: { Familiares: true } });
    if (!afiliado) return res.status(404).json({ error: 'Afiliado no encontrado' });
    return res.json({ afiliado, familiares: afiliado.Familiares || [] });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'server error' });
  }
});

// GET /afiliados/version/padron
router.get('/version/padron', authenticateMiddleware, async (req, res) => {
  try {
    const ver = await prisma.padron_versiones.findFirst({ where: { activo: true }, orderBy: { fecha_actualizacion: 'desc' } });
    return res.json(ver);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'server error' });
  }
});

module.exports = router;