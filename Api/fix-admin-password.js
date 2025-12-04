const prisma = require('./src/prisma');
const bcrypt = require('bcrypt');

async function fixAdminPassword() {
  try {
    console.log('🔧 Arreglando password del admin...');
    
    // Generar nuevo hash para "admin123"
    const newHash = await bcrypt.hash('admin123', 10);
    console.log('🔐 Nuevo hash generado para "admin123"');
    
    // Actualizar en la base de datos
    const result = await prisma.usuarios.update({
      where: { username: 'admin' },
      data: { password_hash: newHash }
    });
    
    console.log('✅ Password del admin actualizada correctamente');
    
    // Probar que funciona
    const isValid = await bcrypt.compare('admin123', newHash);
    console.log(`🧪 Verificación: ${isValid ? '✅ CORRECTO' : '❌ ERROR'}`);
    
    console.log('\n🎯 Ahora puedes hacer login con:');
    console.log('   Username: admin');
    console.log('   Password: admin123');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
  
  process.exit();
}

fixAdminPassword();