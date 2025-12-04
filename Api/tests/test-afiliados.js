const axios = require('axios');

const API_URL = 'http://localhost:3001';

async function testAfiliadosRoutes() {
  console.log('🧪 Probando rutas de afiliados...\n');
  
  let token = null;
  
  try {
    // Paso 1: Obtener token de admin
    console.log('🔐 Paso 1: Autenticarse como admin');
    const loginResponse = await axios.post(`${API_URL}/auth/login`, {
      username: 'admin',
      password: 'admin123'
    });
    
    token = loginResponse.data.token;
    console.log('✅ Token obtenido exitosamente\n');
    
    const headers = {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    };
    
    // Paso 2: Obtener versión del padrón
    console.log('📊 Paso 2: Obtener información del padrón');
    try {
      const versionResponse = await axios.get(`${API_URL}/afiliados/version/padron`, { headers });
      console.log('✅ Información del padrón:');
      const padron = versionResponse.data;
      console.log(`   Versión: ${padron?.version || 'No definida'}`);
      console.log(`   Fecha actualización: ${padron?.fecha_actualizacion || 'No definida'}`);
      console.log(`   Total afiliados: ${padron?.total_afiliados || 0}`);
      console.log(`   Total familiares: ${padron?.total_familiares || 0}`);
      console.log(`   Activo: ${padron?.activo ? 'Sí' : 'No'}`);
    } catch (error) {
      console.log('⚠️  No se pudo obtener la versión del padrón');
    }
    
    // Paso 3: Búsqueda general de afiliados (primeros 5)
    console.log('\n👥 Paso 3: Obtener afiliados (general, primeros 5)');
    try {
      const afiliadosResponse = await axios.get(`${API_URL}/afiliados?limit=5`, { headers });
      const afiliados = afiliadosResponse.data;
      
      console.log(`✅ Encontrados ${afiliados.length} afiliados:`);
      afiliados.forEach((afiliado, index) => {
        console.log(`   ${index + 1}. ${afiliado.apellido}, ${afiliado.nombres}`);
        console.log(`      DNI: ${afiliado.dni} | CUIL: ${afiliado.cuil}`);
        console.log(`      Familiares: ${afiliado.Familiares?.length || 0}`);
        if (afiliado.empresa_nombre) {
          console.log(`      Empresa: ${afiliado.empresa_nombre}`);
        }
      });
    } catch (error) {
      console.log('❌ Error obteniendo afiliados:', error.response?.data || error.message);
    }
    
    // Paso 4: Búsqueda por apellido
    console.log('\n🔍 Paso 4: Búsqueda por apellido (apellidos que empiecen con "A")');
    try {
      const apellidoResponse = await axios.get(`${API_URL}/afiliados?tipo=apellido&q=A&limit=3`, { headers });
      const afiliados = apellidoResponse.data;
      
      console.log(`✅ Encontrados ${afiliados.length} afiliados con apellido que empieza con "A":`);
      afiliados.forEach((afiliado, index) => {
        console.log(`   ${index + 1}. ${afiliado.apellido}, ${afiliado.nombres} (DNI: ${afiliado.dni})`);
      });
    } catch (error) {
      console.log('❌ Error en búsqueda por apellido:', error.response?.data || error.message);
    }
    
    // Paso 5: Búsqueda por DNI (si tenemos algún DNI de ejemplo)
    console.log('\n🆔 Paso 5: Búsqueda por DNI');
    try {
      // Primero obtener un DNI de ejemplo
      const ejemploResponse = await axios.get(`${API_URL}/afiliados?limit=1`, { headers });
      const ejemploAfiliados = ejemploResponse.data;
      
      if (ejemploAfiliados.length > 0) {
        const dniEjemplo = ejemploAfiliados[0].dni;
        console.log(`   Buscando DNI: ${dniEjemplo}`);
        
        const dniResponse = await axios.get(`${API_URL}/afiliados?tipo=dni&q=${dniEjemplo}`, { headers });
        const afiliado = dniResponse.data[0];
        
        if (afiliado) {
          console.log('✅ Afiliado encontrado:');
          console.log(`   Nombre completo: ${afiliado.apellido}, ${afiliado.nombres}`);
          console.log(`   DNI: ${afiliado.dni} | CUIL: ${afiliado.cuil}`);
          console.log(`   Email: ${afiliado.email || 'No definido'}`);
          console.log(`   Teléfono: ${afiliado.telefono || 'No definido'}`);
          console.log(`   Situación sindicato: ${afiliado.situacion_sindicato}`);
          console.log(`   Familiares: ${afiliado.Familiares?.length || 0}`);
          
          if (afiliado.Familiares && afiliado.Familiares.length > 0) {
            console.log('   👶 Familiares:');
            afiliado.Familiares.forEach((familiar, idx) => {
              console.log(`     ${idx + 1}. ${familiar.nombre} (DNI: ${familiar.dni || 'No definido'})`);
            });
          }
        }
      } else {
        console.log('⚠️  No hay afiliados disponibles para buscar por DNI');
      }
    } catch (error) {
      console.log('❌ Error en búsqueda por DNI:', error.response?.data || error.message);
    }
    
    // Paso 6: Obtener detalles de un afiliado específico
    console.log('\n📋 Paso 6: Obtener detalles de afiliado específico');
    try {
      const ejemploResponse = await axios.get(`${API_URL}/afiliados?limit=1`, { headers });
      const ejemploAfiliados = ejemploResponse.data;
      
      if (ejemploAfiliados.length > 0) {
        const afiliadoId = ejemploAfiliados[0].id;
        console.log(`   Obteniendo detalles del afiliado ID: ${afiliadoId}`);
        
        const detalleResponse = await axios.get(`${API_URL}/afiliados/${afiliadoId}`, { headers });
        const detalle = detalleResponse.data;
        
        console.log('✅ Detalles completos:');
        console.log(`   Afiliado: ${detalle.afiliado.apellido}, ${detalle.afiliado.nombres}`);
        console.log(`   Categoría: ${detalle.afiliado.categoria || 'No definida'}`);
        console.log(`   Domicilio: ${detalle.afiliado.domicilio || 'No definido'}`);
        console.log(`   Provincia: ${detalle.afiliado.provincia || 'No definida'}`);
        console.log(`   Total familiares: ${detalle.familiares?.length || 0}`);
      }
    } catch (error) {
      console.log('❌ Error obteniendo detalles:', error.response?.data || error.message);
    }
    
  } catch (error) {
    if (error.code === 'ECONNREFUSED') {
      console.log('❌ Error: No se pudo conectar al servidor');
      console.log('💡 Asegúrate de que el servidor esté corriendo en puerto 3001');
      return;
    }
    
    console.log('❌ Error general:', error.message);
    if (error.response) {
      console.log('   Status:', error.response.status);
      console.log('   Data:', error.response.data);
    }
  }
}

// Ejecutar tests
testAfiliadosRoutes().then(() => {
  console.log('\n🏁 Tests de afiliados completados');
}).catch(error => {
  console.error('❌ Error fatal:', error.message);
});