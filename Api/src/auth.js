// Auth helpers using Prisma
const prisma = require('./prisma');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'cambiame_en_produccion';
const JWT_EXPIRES = process.env.JWT_EXPIRES || '8h';

async function authenticateCredentials(username, password) {
  const user = await prisma.usuarios.findUnique({ where: { username } });
  if (!user) return null;
  const match = await bcrypt.compare(password, user.password_hash);
  if (!match) return null;

  // load active roles
  const ur = await prisma.usuario_roles.findMany({
    where: { usuario_id: user.id, activo: true },
    include: { Role: true }
  });

  const roles = ur.map(r => r.Role.nombre);
  const permisosSet = new Set();
  for (const r of ur) {
    if (r.Role && r.Role.permisos) {
      try {
        const perms = JSON.parse(r.Role.permisos);
        if (Array.isArray(perms)) perms.forEach(p => permisosSet.add(p));
      } catch (e) {
        // ignore parse errors
      }
    }
  }

  const permisos = Array.from(permisosSet);

  return {
    id: user.id,
    username: user.username,
    email: user.email,
    afiliado_id: user.afiliado_id,
    roles,
    permisos
  };
}

function generateTokenForUser(user) {
  const payload = {
    userId: user.id,
    username: user.username,
    afiliadoId: user.afiliado_id,
    roles: user.roles,
    permisos: user.permisos
  };
  return jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES });
}

function authenticateMiddleware(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader) return res.status(401).json({ error: 'Token missing' });
  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    return next();
  } catch (err) {
    return res.status(401).json({ error: 'Token invalid' });
  }
}

function checkPermission(...required) {
  return (req, res, next) => {
    const permisos = req.user?.permisos || [];
    if (permisos.includes('all')) return next();
    const ok = required.some(r => permisos.includes(r));
    if (!ok) return res.status(403).json({ error: 'Sin permisos suficientes', required });
    next();
  };
}

module.exports = {
  authenticateCredentials,
  generateTokenForUser,
  authenticateMiddleware,
  checkPermission
};