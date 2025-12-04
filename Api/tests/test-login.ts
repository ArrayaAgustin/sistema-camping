import axios from "axios";

const API_URL = "http://localhost:3001/api";


async function testAdminLogin() {
  console.log("🧪 Probando login del usuario admin...\n");

  try {
    // Credenciales
    const adminCredentials = {
      username: "admin",
      password: "admin123"
    };

    console.log("📤 Enviando credenciales:");
    console.log(`   Usuario: ${adminCredentials.username}`);
    console.log(`   Password: ${adminCredentials.password}\n`);

    // Hacer POST al login
    const response = await axios.post(`${API_URL}/auth/login`, adminCredentials, {
      headers: { "Content-Type": "application/json" }
    });

    console.log("✅ Login exitoso!");
    console.log("📄 Respuesta del servidor:");
    console.log("   Status:", response.status);
    console.log("   Token:", response.data.token ? "Generado ✅" : "No generado ❌");
    console.log("   Usuario:", response.data.user);

    if (response.data.user) {
      console.log("\n👤 Datos del usuario:");
      console.log(`   ID: ${response.data.user.id}`);
      console.log(`   Username: ${response.data.user.username}`);
      console.log(`   Afiliado ID: ${response.data.user.afiliado_id || "No asignado"}`);
      console.log(`   Roles: ${JSON.stringify(response.data.user.roles)}`);
      console.log(`   Permisos: ${JSON.stringify(response.data.user.permisos)}`);
    }

    if (response.data.token) {
      console.log("\n🎫 Token JWT (primeros 50 chars):");
      console.log(`   ${response.data.token.substring(0, 50)}...`);
    }

  } catch (error: any) {
    console.log("❌ Error en el login:");

    if (error.response) {
      console.log("   Status:", error.response.status);
      console.log("   Error:", error.response.data);
    } else if (error.request) {
      console.log("   No se pudo conectar al servidor.");
    } else {
      console.log("   Error:", error.message);
    }
  }
}

testAdminLogin();
