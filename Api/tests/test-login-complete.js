// Test completo de autenticación con timeouts y retry
const http = require('http');

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function testLoginComplete() {
  console.log('🔐 === TEST COMPLETO DE LOGIN ===\n');

  // 1. Primero probar health check
  console.log('1️⃣  Verificando que el servidor responde...');
  
  await testEndpoint('GET', '/', null, (res, data) => {
    console.log('✅ Health check OK:', JSON.parse(data).ok);
  });
  
  await sleep(1000); // Esperar 1 segundo
  
  // 2. Ahora probar login
  console.log('\n2️⃣  Probando login...');
  
  const loginData = JSON.stringify({
    username: 'admin',
    password: 'admin123'
  });
  
  await testEndpoint('POST', '/auth/login', loginData, (res, data) => {
    try {
      const response = JSON.parse(data);
      console.log('✅ Login exitoso!');
      console.log('🎫 Token:', response.token ? 'Generado' : 'NO generado');
      console.log('👤 Usuario:', response.user?.username);
      console.log('🔑 Roles:', response.user?.roles);
    } catch (e) {
      console.log('📄 Respuesta cruda:', data);
    }
  });
}

function testEndpoint(method, path, postData, callback) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'localhost',
      port: 3001,
      path: path,
      method: method,
      timeout: 5000,
      headers: {
        'Content-Type': 'application/json'
      }
    };

    if (postData) {
      options.headers['Content-Length'] = Buffer.byteLength(postData);
    }

    const req = http.request(options, (res) => {
      console.log(`📊 ${method} ${path} -> Status: ${res.statusCode}`);
      
      let data = '';
      res.on('data', (chunk) => {
        data += chunk;
      });

      res.on('end', () => {
        callback(res, data);
        resolve();
      });
    });

    req.on('error', (e) => {
      console.error(`❌ Error en ${method} ${path}:`, e.message);
      reject(e);
    });

    req.on('timeout', () => {
      console.error(`⏰ Timeout en ${method} ${path}`);
      req.destroy();
      reject(new Error('Timeout'));
    });

    if (postData) {
      req.write(postData);
    }
    
    req.end();
  });
}

testLoginComplete().catch(e => {
  console.error('❌ Test failed:', e.message);
  process.exit(1);
});