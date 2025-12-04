// Seed básico: roles y admin + offline user
// Ejecutar: node prisma/seed.js
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt');

const prisma = new PrismaClient();

async function main() {
  const rolesData = [
    { nombre: 'admin', descripcion: 'Administrador del sistema', permisos: JSON.stringify(['all']) },
    { nombre: 'camping', descripcion: 'Responsable de camping', permisos: JSON.stringify(['read:afiliados','create:visitas','read:visitas','create:periodo','close:periodo','sync:visitas']) },
    { nombre: 'afiliado', descripcion: 'Afiliado del sindicato', permisos: JSON.stringify(['read:own','read:qr','read:historial']) }
  ];

  for (const r of rolesData) {
    await prisma.roles.upsert({
      where: { nombre: r.nombre },
      update: { descripcion: r.descripcion, permisos: r.permisos },
      create: r
    });
  }

  // admin user
  const adminHash = await bcrypt.hash('admin123', 10);
  const admin = await prisma.usuarios.upsert({
    where: { username: 'admin' },
    update: { password_hash: adminHash, activo: true },
    create: { username: 'admin', password_hash: adminHash, email: 'admin@smata.local', activo: true }
  });

  const adminRole = await prisma.roles.findUnique({ where: { nombre: 'admin' }});
  await prisma.usuario_roles.upsert({
    where: { id: 1 },
    update: { usuario_id: admin.id, rol_id: adminRole.id, activo: true },
    create: { usuario_id: admin.id, rol_id: adminRole.id, activo: true }
  });

  // offline user
  const offHash = await bcrypt.hash('offline123', 10);
  const off = await prisma.usuarios.upsert({
    where: { username: 'offline_generic' },
    update: { password_hash: offHash, activo: true },
    create: { username: 'offline_generic', password_hash: offHash, email: 'offline@sistema.local', activo: true }
  });

  const campingRole = await prisma.roles.findUnique({ where: { nombre: 'camping' }});
  await prisma.usuario_roles.upsert({
    where: { id: 2 },
    update: { usuario_id: off.id, rol_id: campingRole.id, activo: true },
    create: { usuario_id: off.id, rol_id: campingRole.id, activo: true }
  });

  console.log('Seed finalizado');
}

main()
  .catch(e => { console.error(e); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); });