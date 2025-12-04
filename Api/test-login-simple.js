// Prueba simple de login
const axios = require('axios');

async function simpleTest() {
  console.log('🔍 Probando login básico...\n');
  
  try {
    console.log('📡 Intentando conectar a http://localhost:3001...');
    
    const response = await axios({
      method: 'post',
      url: 'http://localhost:3001/auth/login',
      data: {
        username: 'admin',
        password: 'admin123'
      },
      timeout: 10000,
      headers: {
        'Content-Type': 'application/json'
      }
    });
    
    console.log('✅ ¡Login exitoso!');
    console.log('📊 Status:', response.status);
    console.log('👤 Usuario:', response.data.user?.username);
    console.log('🔑 Token:', response.data.token ? 'Generado' : 'No generado');
    
  } catch (error) {
    console.error('❌ Error detallado:');
    
    if (error.code) {
      console.error('   Código error:', error.code);
    }
    
    if (error.response) {
      console.error('   HTTP Status:', error.response.status);
      console.error('   Respuesta:', error.response.data);
    } else if (error.request) {
      console.error('   Sin respuesta del servidor');
    } else {
      console.error('   Error configuración:', error.message);
    }
  }
}

simpleTest();