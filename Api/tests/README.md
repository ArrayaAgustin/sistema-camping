# 🧪 Tests del Sistema de Camping

Esta carpeta contiene todos los scripts de testing y debugging para la API del sistema de camping.

## 📋 Archivos de Test

### 🔐 **Autenticación**
- **`test-auth.js`** - Genera hash de contraseña para testing
- **`test-auth-direct.js`** - Prueba autenticación directa sin HTTP
- **`test-admin-login.js`** - Test completo de login HTTP del usuario admin
- **`test-login-route.js`** - Test completo de la ruta `/auth/login` con casos positivos y negativos
- **`test-login-complete.js`** - Test de login completo
- **`test-login-direct.js`** - Test de login directo
- **`test-login-simple.js`** - Test de login simplificado

### 👥 **Afiliados**
- **`test-afiliados.js`** - Test completo de todas las rutas de afiliados
- **`test-apellido-cadena.js`** - Test específico para buscar apellido "CADENA"

### 🔍 **Verificación y Debug**
- **`verify-admin.js`** - Verifica que el usuario admin esté configurado correctamente en la BD
- **`debug-users.js`** - Script para debug de usuarios
- **`fix-admin-password.js`** - Script para arreglar contraseña de admin

## 🚀 Como usar los tests

### Pre-requisitos
1. Servidor corriendo: `npm start` o `node src/server.js`
2. Base de datos configurada con usuario admin

### Ejecutar tests específicos

```bash
# Verificar configuración de admin
node tests/verify-admin.js

# Probar login completo
node tests/test-login-route.js

# Probar búsqueda de afiliados
node tests/test-afiliados.js

# Buscar apellido específico
node tests/test-apellido-cadena.js
```

### Tests más importantes

1. **`verify-admin.js`** - Siempre ejecutar primero para verificar configuración
2. **`test-login-route.js`** - Verificar que la autenticación HTTP funcione
3. **`test-afiliados.js`** - Verificar que el padrón de afiliados esté accesible

## 📊 Orden recomendado de testing

```bash
# 1. Verificar BD y usuario admin
node tests/verify-admin.js

# 2. Probar autenticación
node tests/test-login-route.js

# 3. Probar padrón de afiliados  
node tests/test-afiliados.js
```

## 🔧 Configuración

Los tests asumen:
- **API URL**: http://localhost:3001
- **Usuario admin**: admin / admin123
- **Base de datos**: Configurada según `.env`

## 📝 Notas

- Todos los tests requieren que el servidor esté corriendo
- Los tests de afiliados requieren autenticación válida
- Los archivos `debug-*` y `fix-*` son para resolución de problemas específicos