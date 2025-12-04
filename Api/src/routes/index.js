// Index de todas las rutas - Centraliza la importación
const express = require('express');
const prisma = require('../prisma');

// Importar todas las rutas
const authRoutes = require('./auth');
const afiliadosRoutes = require('./afiliados');
const visitasRoutes = require('./visitas');
const syncRoutes = require('./sync');

// Función para configurar todas las rutas
function setupRoutes(app) {
  // Configurar rutas con sus prefijos
  app.use('/auth', authRoutes);
  app.use('/afiliados', afiliadosRoutes);
  app.use('/visitas', visitasRoutes);
  app.use('/sync', syncRoutes);
  
  // Health check con estado de BD
  app.get('/', async (req, res) => {
    let dbStatus = 'unknown';
    let dbInfo = null;
    
    try {
      // Probar conexión con consulta simple
      const result = await prisma.$queryRaw`SELECT 1 as ping`;
      dbStatus = 'connected';
      
      // Obtener información básica de la BD
      const [userCount, afiliadosCount, visitasCount] = await Promise.all([
        prisma.usuarios.count(),
        prisma.afiliados.count(),
        prisma.visitas.count()
      ]);
      
      dbInfo = {
        usuarios: userCount,
        afiliados: afiliadosCount,
        visitas: visitasCount
      };
    } catch (error) {
      dbStatus = 'disconnected';
      dbInfo = { error: error.message };
    }
    
    res.json({ 
      ok: dbStatus === 'connected', 
      env: process.env.NODE_ENV || 'dev',
      timestamp: new Date().toISOString(),
      uptime: Math.floor(process.uptime()),
      database: {
        status: dbStatus,
        info: dbInfo
      },
      endpoints: {
        auth: '/auth/login, /auth/create-user',
        afiliados: '/afiliados, /afiliados/:id',
        visitas: '/visitas, /visitas/dia',
        sync: '/sync/visitas'
      }
    });
  });

  // Ruta para endpoints no encontrados
  app.use('*', (req, res) => {
    res.status(404).json({ 
      error: 'Endpoint not found',
      path: req.originalUrl,
      method: req.method
    });
  });

  console.log('📋 Rutas configuradas:');
  console.log('   🔐 /auth/*');
  console.log('   👥 /afiliados/*');
  console.log('   📝 /visitas/*'); 
  console.log('   🔄 /sync/*');
}

module.exports = { setupRoutes };