const axios = require('axios');

const API_URL = 'http://localhost:3001';

async function testLoginRoute() {
  console.log('🧪 Probando ruta POST /auth/login...\n');
  
  try {
    // Test con credenciales correctas
    console.log('✅ Test 1: Credenciales correctas');
    const response = await axios.post(`${API_URL}/auth/login`, {
      username: 'admin',
      password: 'admin123'
    }, {
      headers: { 'Content-Type': 'application/json' },
      timeout: 5000
    });
    
    console.log('📊 Respuesta exitosa:');
    console.log(`   Status: ${response.status}`);
    console.log(`   Success: ${response.data.success}`);
    console.log(`   Token: ${response.data.token ? 'Generado ✅' : 'No generado ❌'}`);
    console.log(`   Username: ${response.data.user?.username}`);
    console.log(`   Roles: ${JSON.stringify(response.data.user?.roles)}`);
    console.log(`   Permisos: ${JSON.stringify(response.data.user?.permisos)}`);
    console.log(`   Timestamp: ${response.data.timestamp}`);
    
    // Guardar token para futuras pruebas
    const token = response.data.token;
    
    console.log('\n🎫 Verificar token JWT:');
    if (token) {
      const parts = token.split('.');
      console.log(`   Header: ${parts[0]}`);
      console.log(`   Payload: ${parts[1]}`);
      console.log(`   Signature: ${parts[2]?.substring(0, 20)}...`);
      
      // Decodificar payload (sin verificar)
      try {
        const payload = JSON.parse(Buffer.from(parts[1], 'base64').toString());
        console.log('   Datos del token:');
        console.log(`     UserID: ${payload.userId}`);
        console.log(`     Username: ${payload.username}`);
        console.log(`     Expira: ${new Date(payload.exp * 1000).toLocaleString()}`);
      } catch (e) {
        console.log('   No se pudo decodificar el payload');
      }
    }
    
  } catch (error) {
    if (error.code === 'ECONNREFUSED') {
      console.log('❌ Error: No se pudo conectar al servidor');
      console.log('💡 Asegúrate de que el servidor esté corriendo:');
      console.log('   node src/server.js');
      return;
    }
    
    if (error.response) {
      console.log(`❌ Error ${error.response.status}:`);
      console.log(`   ${JSON.stringify(error.response.data, null, 2)}`);
    } else {
      console.log('❌ Error:', error.message);
    }
  }
  
  // Test con credenciales incorrectas
  try {
    console.log('\n❌ Test 2: Credenciales incorrectas');
    await axios.post(`${API_URL}/auth/login`, {
      username: 'admin',
      password: 'wrong-password'
    });
  } catch (error) {
    if (error.response && error.response.status === 401) {
      console.log('✅ Correctamente rechazado:', error.response.data.error);
    } else {
      console.log('❌ Error inesperado:', error.message);
    }
  }
  
  // Test sin credenciales
  try {
    console.log('\n❌ Test 3: Sin credenciales');
    await axios.post(`${API_URL}/auth/login`, {});
  } catch (error) {
    if (error.response && error.response.status === 400) {
      console.log('✅ Correctamente rechazado:', error.response.data.error);
    } else {
      console.log('❌ Error inesperado:', error.message);
    }
  }
}

// Ejecutar tests
testLoginRoute().then(() => {
  console.log('\n🏁 Tests completados');
});