const express = require('express');
const router = express.Router();
const { authenticateCredentials, generateTokenForUser } = require('../auth');
const prisma = require('../prisma');
const bcrypt = require('bcrypt');

// POST /auth/login
router.post('/login', async (req, res) => {
  console.log('🔐 Login attempt:', req.body?.username);
  const { username, password } = req.body;
  if (!username || !password) return res.status(400).json({ error: 'username & password required' });
  try {
    console.log('🔍 Authenticating user...');
    const user = await authenticateCredentials(username, password);
    if (!user) {
      console.log('❌ Invalid credentials for:', username);
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    console.log('✅ User authenticated:', user.username);
    const token = generateTokenForUser(user);
    console.log('🎫 Token generated successfully');
    return res.json({ token, user: { id: user.id, username: user.username, afiliado_id: user.afiliado_id, roles: user.roles, permisos: user.permisos } });
  } catch (err) {
    console.error('❌ Login error:', err);
    return res.status(500).json({ error: 'server error' });
  }
});

// POST /auth/create-user (admin) -> create user and assign role
router.post('/create-user', async (req, res) => {
  // body: { username, password, afiliado_id, email, role_id }
  const { username, password, afiliado_id, email, role_id } = req.body;
  if (!username || !password) return res.status(400).json({ error: 'username & password required' });
  try {
    const hash = await bcrypt.hash(password, 10);
    const u = await prisma.usuarios.create({
      data: { username, password_hash: hash, email: email || null, afiliado_id: afiliado_id || null, activo: true }
    });
    if (role_id) {
      await prisma.usuario_roles.create({ data: { usuario_id: u.id, rol_id: role_id, activo: true } });
    }
    return res.status(201).json({ userId: u.id });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'error creating user' });
  }
});

module.exports = router;