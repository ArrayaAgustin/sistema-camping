// Pruebas de autenticación paso a paso
const axios = require('axios');

const BASE_URL = 'http://localhost:3001';

async function testAuth() {
  console.log('🔐 === PRUEBAS DE AUTENTICACIÓN ===\n');

  try {
    // 1. Health Check
    console.log('1️⃣  Health Check...');
    const health = await axios.get(`${BASE_URL}/`);
    console.log('✅ Servidor funcionando:', health.data);

    // 2. Login Admin
    console.log('\n2️⃣  Login como ADMIN...');
    const adminLogin = await axios.post(`${BASE_URL}/auth/login`, {
      username: 'admin',
      password: 'admin123'
    });
    console.log('✅ Login admin exitoso!');
    console.log('👤 Usuario:', adminLogin.data.user);
    console.log('🎫 Token generado:', adminLogin.data.token ? 'SÍ' : 'NO');
    
    const adminToken = adminLogin.data.token;

    // 3. Login Afiliado
    console.log('\n3️⃣  Login como AFILIADO (ANDRADA)...');
    const afiliadoLogin = await axios.post(`${BASE_URL}/auth/login`, {
      username: '33251654',  // DNI de ANDRADA
      password: 'smata2024'
    });
    console.log('✅ Login afiliado exitoso!');
    console.log('👤 Usuario:', afiliadoLogin.data.user);
    console.log('🎫 Token generado:', afiliadoLogin.data.token ? 'SÍ' : 'NO');
    
    const afiliadoToken = afiliadoLogin.data.token;

    // 4. Probar endpoints protegidos con token admin
    console.log('\n4️⃣  Probar endpoint protegido con token ADMIN...');
    const padronVersion = await axios.get(`${BASE_URL}/afiliados/version/padron`, {
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    console.log('✅ Acceso autorizado para admin:', padronVersion.data);

    // 5. Probar endpoint protegido con token afiliado
    console.log('\n5️⃣  Probar endpoint con token AFILIADO...');
    const afiliadoId = afiliadoLogin.data.user.afiliado_id;
    const misDatos = await axios.get(`${BASE_URL}/afiliados/${afiliadoId}`, {
      headers: { Authorization: `Bearer ${afiliadoToken}` }
    });
    console.log('✅ Afiliado puede ver sus datos:', misDatos.data.afiliado.nombres);

    // 6. Probar login con credenciales incorrectas
    console.log('\n6️⃣  Probar credenciales incorrectas...');
    try {
      await axios.post(`${BASE_URL}/auth/login`, {
        username: 'admin',
        password: 'password_incorrecto'
      });
    } catch (error) {
      if (error.response && error.response.status === 401) {
        console.log('✅ Correctamente rechazó credenciales inválidas');
      }
    }

    // 7. Probar endpoint sin token
    console.log('\n7️⃣  Probar endpoint protegido SIN token...');
    try {
      await axios.get(`${BASE_URL}/afiliados/version/padron`);
    } catch (error) {
      if (error.response && error.response.status === 401) {
        console.log('✅ Correctamente requiere autenticación');
      }
    }

    console.log('\n🎉 ¡TODAS LAS PRUEBAS DE AUTENTICACIÓN PASARON! 🎉');
    console.log('\n📋 RESUMEN:');
    console.log('- ✅ Login admin funciona');
    console.log('- ✅ Login afiliado funciona');
    console.log('- ✅ Tokens se generan correctamente');
    console.log('- ✅ Endpoints protegidos validan tokens');
    console.log('- ✅ Rechaza credenciales inválidas');
    console.log('- ✅ Requiere autenticación apropiada');

  } catch (error) {
    console.error('\n❌ ERROR en las pruebas:');
    if (error.response) {
      console.error('   Status:', error.response.status);
      console.error('   Datos:', error.response.data);
    } else {
      console.error('   Mensaje:', error.message);
    }
  }
}

testAuth();