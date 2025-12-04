const axios = require('axios');

const API_URL = 'http://localhost:3001';

async function testApellidoCadena() {
  console.log('🧪 Probando búsqueda de afiliados con apellido "MACALUSO"...\n');
  
  try {
    // Paso 1: Obtener token de admin
    console.log('🔐 Obteniendo token de admin...');
    const loginResponse = await axios.post(`${API_URL}/auth/login`, {
      username: 'admin',
      password: 'admin123'
    });
    
    const token = loginResponse.data.token;
    console.log('✅ Token obtenido\n');
    
    const headers = {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    };
    
    // Paso 2: Buscar por apellido ANDRADA
    console.log('🔍 Buscando afiliados con apellido "MACALUSO"...');
    
    const response = await axios.get(`${API_URL}/afiliados?tipo=apellido&q=MACALUSO&limit=10`, { headers });
    const afiliados = response.data;
    
    console.log(`📊 Resultados: ${afiliados.length} afiliados encontrados\n`);
    
    if (afiliados.length === 0) {
      console.log('⚠️  No se encontraron afiliados con apellido MACALUSO');
      console.log('💡 Verificando si hay afiliados en la base de datos...');
      
      // Buscar cualquier afiliado para verificar que la DB tiene datos
      const testResponse = await axios.get(`${API_URL}/afiliados?limit=5`, { headers });
      const testAfiliados = testResponse.data;
      
      if (testAfiliados.length > 0) {
        console.log(`✅ La base de datos tiene ${testAfiliados.length} afiliados disponibles`);
        console.log('   Algunos ejemplos de apellidos:');
        testAfiliados.forEach((afiliado, index) => {
          console.log(`   ${index + 1}. ${afiliado.apellido}, ${afiliado.nombres}`);
        });
      } else {
        console.log('❌ La base de datos no tiene afiliados cargados');
      }
      return;
    }
    
    // Mostrar resultados encontrados
    afiliados.forEach((afiliado, index) => {
      console.log(`👤 ${index + 1}. ${afiliado.apellido}, ${afiliado.nombres}`);
      console.log(`   DNI: ${afiliado.dni}`);
      console.log(`   CUIL: ${afiliado.cuil}`);
      console.log(`   Email: ${afiliado.email || 'No definido'}`);
      console.log(`   Teléfono: ${afiliado.telefono || 'No definido'}`);
      console.log(`   Situación: ${afiliado.situacion_sindicato || 'No definida'}`);
      console.log(`   Empresa: ${afiliado.empresa_nombre || 'No definida'}`);
      console.log(`   Familiares: ${afiliado.Familiares?.length || 0}`);
      
      if (afiliado.Familiares && afiliado.Familiares.length > 0) {
        console.log('   👶 Familiares:');
        afiliado.Familiares.forEach((familiar, idx) => {
          console.log(`     ${idx + 1}. ${familiar.nombre} ${familiar.dni ? `(DNI: ${familiar.dni})` : ''}`);
        });
      }
      console.log(''); // Línea en blanco
    });
    
    // También probar búsqueda general que incluya "MACALUSO"
    console.log('🔍 Búsqueda general (incluye apellido, nombres y DNI) con "MACALUSO"...');
    const generalResponse = await axios.get(`${API_URL}/afiliados?tipo=general&q=MACALUSO&limit=10`, { headers });
    const generalAfiliados = generalResponse.data;
    
    console.log(`📊 Búsqueda general: ${generalAfiliados.length} resultados`);
    
    if (generalAfiliados.length > 0 && generalAfiliados.length !== afiliados.length) {
      console.log('   (Estos incluyen coincidencias en nombres y otros campos)');
      generalAfiliados.forEach((afiliado, index) => {
        console.log(`   ${index + 1}. ${afiliado.apellido}, ${afiliado.nombres} (DNI: ${afiliado.dni})`);
      });
    }
    
  } catch (error) {
    if (error.code === 'ECONNREFUSED') {
      console.log('❌ Error: No se pudo conectar al servidor');
      console.log('💡 Asegúrate de que el servidor esté corriendo en puerto 3001');
      return;
    }
    
    if (error.response) {
      console.log(`❌ Error ${error.response.status}:`);
      console.log(`   ${JSON.stringify(error.response.data, null, 2)}`);
      
      if (error.response.status === 401) {
        console.log('💡 Problema de autenticación - verifica el token');
      } else if (error.response.status === 403) {
        console.log('💡 El usuario admin no tiene permisos para leer afiliados');
      }
    } else {
      console.log('❌ Error:', error.message);
    }
  }
}

// Ejecutar test
testApellidoCadena().then(() => {
  console.log('🏁 Test completado');
});