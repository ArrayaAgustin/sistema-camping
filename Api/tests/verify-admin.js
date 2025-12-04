const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt');

const prisma = new PrismaClient();

async function checkAdminUser() {
  console.log('🔍 Verificando usuario admin en la base de datos...\n');
  
  try {
    // Buscar usuario admin
    const admin = await prisma.usuarios.findUnique({
      where: { username: 'admin' },
      include: {
        UsuarioRoles: {
          include: {
            Role: true
          }
        },
        Afiliado: true
      }
    });
    
    if (!admin) {
      console.log('❌ Usuario admin NO encontrado en la base de datos');
      console.log('💡 Necesitas crear el usuario admin primero');
      return;
    }
    
    console.log('✅ Usuario admin encontrado:');
    console.log(`   ID: ${admin.id}`);
    console.log(`   Username: ${admin.username}`);
    console.log(`   Email: ${admin.email || 'No definido'}`);
    console.log(`   Afiliado ID: ${admin.afiliado_id || 'No asignado'}`);
    console.log(`   Activo: ${admin.activo ? 'Sí' : 'No'}`);
    console.log(`   Creado: ${admin.created_at}`);
    
    // Verificar hash de contraseña
    console.log('\n🔐 Verificando contraseña...');
    const passwordMatch = await bcrypt.compare('admin123', admin.password_hash);
    console.log(`   Hash en DB: ${admin.password_hash.substring(0, 20)}...`);
    console.log(`   Contraseña 'admin123' coincide: ${passwordMatch ? '✅ SÍ' : '❌ NO'}`);
    
    // Mostrar roles
    if (admin.UsuarioRoles && admin.UsuarioRoles.length > 0) {
      console.log('\n👑 Roles asignados:');
      admin.UsuarioRoles.forEach(ur => {
        if (ur.Role) {
          console.log(`   - ${ur.Role.nombre} (ID: ${ur.Role.id})`);
          console.log(`     Descripción: ${ur.Role.descripcion || 'No definida'}`);
          
          // Mostrar permisos del rol (están en JSON)
          if (ur.Role.permisos) {
            console.log('     Permisos JSON:');
            console.log(`       ${JSON.stringify(ur.Role.permisos, null, 8)}`);
          } else {
            console.log('     Sin permisos definidos');
          }
          
          console.log(`     Activo: ${ur.activo ? 'Sí' : 'No'}`);
          console.log(`     Camping ID: ${ur.camping_id || 'Todos'}`);
        }
      });
    } else {
      console.log('\n⚠️  Sin roles asignados');
    }
    
    // Sugerencias si hay problemas
    if (!admin.activo) {
      console.log('\n⚠️  PROBLEMA: Usuario inactivo');
      console.log('   Ejecuta: UPDATE usuarios SET activo = true WHERE username = "admin";');
    }
    
    if (!passwordMatch) {
      console.log('\n⚠️  PROBLEMA: Contraseña no coincide');
      console.log('   El hash en la DB no corresponde a "admin123"');
      console.log('   Regenera el hash con el script test-auth.js');
    }
    
  } catch (error) {
    console.error('❌ Error verificando usuario:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkAdminUser();