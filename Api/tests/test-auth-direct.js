const { authenticateCredentials, generateTokenForUser } = require('./src/auth');

async function testAuthDirect() {
  console.log('🔐 Probando autenticación directa (sin API)...\n');
  
  try {
    const username = 'admin';
    const password = 'admin123';
    
    console.log(`📤 Verificando credenciales: ${username} / ${password}`);
    
    // Probar autenticación directa
    const user = await authenticateCredentials(username, password);
    
    if (!user) {
      console.log('❌ Autenticación fallida');
      return;
    }
    
    console.log('✅ Autenticación exitosa!');
    console.log('👤 Datos del usuario:');
    console.log(`   ID: ${user.id}`);
    console.log(`   Username: ${user.username}`);
    console.log(`   Email: ${user.email || 'No definido'}`);
    console.log(`   Afiliado ID: ${user.afiliado_id || 'No asignado'}`);
    console.log(`   Activo: ${user.activo ? 'Sí' : 'No'}`);
    
    // Generar token
    console.log('\n🎫 Generando token JWT...');
    const token = generateTokenForUser(user);
    
    if (token) {
      console.log('✅ Token generado exitosamente');
      console.log(`   Primeros 50 caracteres: ${token.substring(0, 50)}...`);
      console.log(`   Longitud total: ${token.length} caracteres`);
    } else {
      console.log('❌ Error generando token');
    }
    
    // Mostrar roles y permisos
    if (user.roles && user.roles.length > 0) {
      console.log('\n👑 Roles:');
      user.roles.forEach(role => {
        console.log(`   - ${role.nombre}: ${role.descripcion}`);
      });
    }
    
    if (user.permisos && user.permisos.length > 0) {
      console.log('\n🔑 Permisos:');
      user.permisos.forEach(permiso => {
        console.log(`   - ${permiso}`);
      });
    }
    
  } catch (error) {
    console.error('❌ Error en test directo:', error.message);
    console.error('Stack:', error.stack);
  }
}

testAuthDirect();