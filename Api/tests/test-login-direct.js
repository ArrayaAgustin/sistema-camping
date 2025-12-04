// Test directo del login sin dependencias externas
const http = require('http');

function testLogin() {
  console.log('🔐 Probando login directo...\n');

  const postData = JSON.stringify({
    username: 'admin',
    password: 'admin123'
  });

  const options = {
    hostname: 'localhost',
    port: 3001,
    path: '/auth/login',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(postData)
    }
  };

  const req = http.request(options, (res) => {
    console.log(`📊 Status: ${res.statusCode}`);
    console.log(`📋 Headers:`, res.headers);

    let data = '';
    res.on('data', (chunk) => {
      data += chunk;
    });

    res.on('end', () => {
      try {
        const response = JSON.parse(data);
        console.log('\n✅ Respuesta del login:');
        console.log('🎫 Token:', response.token ? 'Generado ✅' : 'NO generado ❌');
        console.log('👤 Usuario:', response.user);
        console.log('🔑 Roles:', response.user?.roles);
        console.log('🛡️  Permisos:', response.user?.permisos);
      } catch (e) {
        console.log('\n📄 Respuesta cruda:');
        console.log(data);
      }
    });
  });

  req.on('error', (e) => {
    console.error('❌ Error:', e.message);
  });

  req.write(postData);
  req.end();
}

testLogin();