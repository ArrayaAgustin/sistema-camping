# Documentación de Endpoints - Sistema Camping

## Resumen de Pruebas Realizadas

Este documento contiene la documentación completa de los endpoints probados en el sistema de camping, incluyendo ejemplos de requests y responses.

---

## 1. Autenticación

### POST /auth/login
**Descripción**: Autenticación de usuarios del sistema.

**Request**:
```powershell
$loginData = @{
    username = "admin"
    password = "admin123"
} | ConvertTo-Json

Invoke-WebRequest -Uri "http://localhost:3001/api/auth/login" -Method POST -Body $loginData -ContentType "application/json"
```

**Response exitosa**:
```json
{
  "success": true,
  "message": "Login exitoso",
  "data": {
    "user": {
      "id": 1,
      "username": "admin",
      "rol": "admin",
      "activo": true
    },
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6MSwidXNlcm5hbWUiOiJhZG1pbiIsInJvbCI6ImFkbWluIiwiaWF0IjoxNzMzMzE0NTg4LCJleHAiOjE3MzMzMTgxODh9.ZtYOQN2GKHfvZuGsGMKZIBfIvyWKTMLkpLvfWz1LuY4"
  }
}
```

**Configuración de headers para requests posteriores**:
```powershell
$headers = @{
    'Authorization' = "Bearer $($token)"
    'Content-Type' = 'application/json'
}
```

---

## 2. Períodos de Caja

### POST /periodos-caja/abrir
**Descripción**: Abre un nuevo período de caja para un camping específico.

**Request**:
```powershell
$periodoData = @{
    camping_id = 1
    observaciones = "Inicio de turno - período de prueba"
} | ConvertTo-Json

Invoke-WebRequest -Uri "http://localhost:3001/api/periodos-caja/abrir" -Method POST -Body $periodoData -Headers $headers
```

**Response exitosa**:
```json
{
  "success": true,
  "message": "Período de caja abierto exitosamente",
  "data": {
    "periodo": {
      "id": 1,
      "camping_id": 1,
      "usuario_id": 1,
      "fecha_apertura": "2024-12-04T15:36:28.000Z",
      "fecha_cierre": null,
      "total_visitas": 0,
      "estado": "abierto",
      "observaciones": "Inicio de turno - período de prueba"
    }
  }
}
```

### GET /periodos-caja/activo
**Descripción**: Obtiene el período de caja activo para un camping.

**Request**:
```powershell
Invoke-WebRequest -Uri "http://localhost:3001/api/periodos-caja/activo?camping_id=1" -Method GET -Headers $headers
```

**Response exitosa**:
```json
{
  "success": true,
  "data": {
    "periodo": {
      "id": 1,
      "camping_id": 1,
      "usuario_id": 1,
      "fecha_apertura": "2024-12-04T15:36:28.000Z",
      "fecha_cierre": null,
      "total_visitas": 1,
      "estado": "abierto",
      "observaciones": "Inicio de turno - período de prueba",
      "usuario": {
        "id": 1,
        "username": "admin"
      }
    }
  }
}
```

---

## 3. Visitas

### POST /visitas
**Descripción**: Registra una nueva visita al camping.

**Request**:
```powershell
$visitaData = @{
    afiliado_id = 1
    camping_id = 1
    periodo_caja_id = 1
    acompanantes = 3
    observaciones = "Visita familiar de fin de semana"
    registro_offline = $false
} | ConvertTo-Json

Invoke-WebRequest -Uri "http://localhost:3001/api/visitas" -Method POST -Body $visitaData -Headers $headers
```

**Response exitosa**:
```json
{
  "success": true,
  "message": "Visita registrada exitosamente",
  "data": {
    "visita": {
      "id": 1,
      "uuid": "ebe3b537-8ddf-4c0a-89ed-fa69d7d56ba6",
      "afiliado_id": 1,
      "camping_id": 1,
      "periodo_caja_id": 1,
      "usuario_id": 1,
      "fecha_ingreso": "2024-12-04T15:49:53.000Z",
      "acompanantes": 3,
      "observaciones": "Visita familiar de fin de semana",
      "registro_offline": false,
      "sincronizado": true
    }
  }
}
```

### GET /visitas/dia
**Descripción**: Obtiene las visitas de un día específico para un camping.

**Request**:
```powershell
Invoke-WebRequest -Uri "http://localhost:3001/api/visitas/dia?camping_id=1&fecha=2024-12-04" -Method GET -Headers $headers
```

**Response exitosa**:
```json
{
  "success": true,
  "data": {
    "visitas": [
      {
        "id": 1,
        "uuid": "ebe3b537-8ddf-4c0a-89ed-fa69d7d56ba6",
        "afiliado_id": 1,
        "camping_id": 1,
        "periodo_caja_id": 1,
        "usuario_id": 1,
        "fecha_ingreso": "2024-12-04T15:49:53.000Z",
        "acompanantes": 3,
        "observaciones": "Visita familiar de fin de semana",
        "registro_offline": false,
        "sincronizado": true,
        "afiliado": {
          "nombre": "Juan",
          "apellido": "Pérez",
          "numero_afiliado": "12345"
        },
        "usuario": {
          "username": "admin"
        }
      }
    ],
    "total": 1,
    "fecha": "2024-12-04"
  }
}
```

---

## 4. Validaciones y Funcionalidades del Sistema

### Actualización Automática de Contadores
Cuando se registra una visita, el sistema automáticamente:
- Incrementa el contador `total_visitas` del período de caja activo
- Mantiene la integridad referencial entre visitas y períodos

**Verificación del contador**:
```powershell
# Consultar el total de visitas del período activo
$response = Invoke-WebRequest -Uri "http://localhost:3001/api/periodos-caja/activo?camping_id=1" -Method GET -Headers $headers
($response.Content | ConvertFrom-Json).data.periodo.total_visitas
```

### Sistema de Autenticación
- **JWT Tokens**: Todos los endpoints protegidos requieren un token Bearer válido
- **Permisos granulares**: Cada endpoint verifica permisos específicos (create:visitas, read:visitas, etc.)
- **Manejo de errores**: Respuestas 401 (no autenticado) y 403 (sin permisos)

### Validaciones de Datos
- **Campos requeridos**: afiliado_id, camping_id para visitas
- **Tipos de datos**: Validación automática de tipos en TypeScript
- **Estados consistentes**: Solo puede haber un período activo por camping

---

## 5. Flujo de Trabajo Típico

1. **Login del usuario**:
   ```
   POST /auth/login → Obtener token JWT
   ```

2. **Abrir período de caja**:
   ```
   POST /periodos-caja/abrir → Crear período activo para el día
   ```

3. **Registrar visitas**:
   ```
   POST /visitas → Registrar cada ingreso al camping
   ```

4. **Consultar visitas del día**:
   ```
   GET /visitas/dia → Ver todas las visitas registradas
   ```

5. **Verificar estado del período**:
   ```
   GET /periodos-caja/activo → Confirmar totales y estado
   ```

---

## 6. Códigos de Estado HTTP

- **200**: Operación exitosa
- **400**: Error en los datos enviados (campos faltantes, formatos incorrectos)
- **401**: Usuario no autenticado (token faltante o inválido)
- **403**: Usuario sin permisos suficientes
- **500**: Error interno del servidor

---

## 7. Estructura de Respuestas

Todas las respuestas siguen el mismo formato:

```json
{
  "success": boolean,
  "message": "string",
  "data": {
    // Datos específicos del endpoint
  },
  "error": "string" // Solo en caso de error
}
```

---

---

## 8. Afiliados

### GET /afiliados (Búsqueda)
**Descripción**: Busca afiliados según criterios específicos.

**Request**:
```powershell
$response = Invoke-WebRequest -Uri "http://localhost:3001/api/afiliados?q=ANDRADA&tipo=apellido&limit=3" -Method GET -Headers $headers
```

**Response exitosa**:
```json
{
  "success": true,
  "message": "Found 1 afiliados",
  "data": [
    {
      "id": 1,
      "cuil": "20332516540",
      "dni": "33251654",
      "apellido": "ANDRADA",
      "nombres": "GABRIEL OSCAR",
      "numeroAfiliado": "20332516540",
      "numero_afiliado": "20332516540",
      "documento": "33251654",
      "sexo": "M",
      "tipo_afiliado": "SMATA y OSMATA",
      "fecha_nacimiento": "1987-09-12T00:00:00.000Z",
      "categoria": "TRABAJANDO, APORTA POR DGI",
      "situacion_sindicato": "ACTIVO",
      "situacion_obra_social": "ACTIVO",
      "domicilio": "AV.RENAULT 1020",
      "provincia": "Córdoba",
      "localidad": "CORDOBA",
      "empresa_cuit": "30503317814",
      "empresa_nombre": "RENAULT ARGENTINA S.A.",
      "codigo_postal": "5020",
      "activo": true,
      "created_at": "2025-12-02T09:23:26.000Z",
      "updated_at": "2025-12-03T10:08:21.000Z"
    }
  ]
}
```

### GET /afiliados/version/padron
**Descripción**: Obtiene la versión actual del padrón para verificar actualizaciones.

**Request**:
```powershell
$response = Invoke-WebRequest -Uri "http://localhost:3001/api/afiliados/version/padron" -Method GET -Headers $headers
```

**Response exitosa**:
```json
{
  "success": true,
  "message": "Padron version retrieved successfully",
  "data": {
    "id": 1,
    "version": "2025-01-PRUEBA",
    "fecha_actualizacion": "2025-12-02T09:23:26.000Z",
    "total_afiliados": 5,
    "total_familiares": 7,
    "total_registros": 12,
    "descripcion": "Padrón de prueba con 5 afiliados",
    "activo": true
  }
}
```

### GET /afiliados/export/padron
**Descripción**: Exporta el padrón completo para sincronización offline con sistema de caché inteligente.

**Request básico**:
```powershell
$response = Invoke-WebRequest -Uri "http://localhost:3001/api/afiliados/export/padron" -Method GET -Headers $headers
```

**Request con caché inteligente**:
```powershell
# Solo descarga si hay versión más nueva que la del cliente
$response = Invoke-WebRequest -Uri "http://localhost:3001/api/afiliados/export/padron?version=2024-01-OLD&only_if_newer=true" -Method GET -Headers $headers
```

**Response exitosa**:
```json
{
  "success": true,
  "message": "Padron exported successfully with 5 afiliados",
  "data": {
    "afiliados": [/* array con todos los afiliados */],
    "total": 5,
    "version": "2025-01-PRUEBA",
    "fecha_actualizacion": "2025-12-02T09:23:26.000Z",
    "timestamp": "2025-12-04T20:50:56.516Z",
    "incluye_inactivos": false
  }
}
```

---

## 9. Sistema de Caché Inteligente para Offline

### Flujo de Sincronización Optimizado:

1. **Verificar versión**:
   ```javascript
   const versionResponse = await fetch('/api/afiliados/version/padron');
   const serverVersion = await versionResponse.json();
   ```

2. **Comparar con versión local**:
   ```javascript
   const localVersion = localStorage.getItem('padron_version');
   if (localVersion !== serverVersion.data.version) {
     // Necesita actualización
   }
   ```

3. **Descarga inteligente**:
   ```javascript
   const response = await fetch(`/api/afiliados/export/padron?version=${localVersion}&only_if_newer=true`);
   ```

4. **Guardar en IndexedDB**:
   ```javascript
   if (!response.data.up_to_date) {
     await saveToIndexedDB(response.data.afiliados);
     localStorage.setItem('padron_version', response.data.version);
   }
   ```

---

## 10. Tipos de Búsqueda de Afiliados

- **tipo=apellido**: Busca por apellido (ej: "ANDRADA")
- **tipo=dni**: Busca por número de documento (ej: "33251654")  
- **tipo=general**: Busca en apellido, nombre y DNI simultáneamente

---

## 11. Códigos de Estado y Optimizaciones

### Caché HTTP:
- **304 Not Modified**: Cuando la versión del cliente está actualizada
- **200 OK**: Cuando hay datos nuevos para descargar

### Optimizaciones implementadas:
- ✅ **Versionado de padrón**: Evita descargas innecesarias
- ✅ **Búsqueda por tipos**: Consultas específicas más rápidas  
- ✅ **Límites configurables**: Control de volumen de datos
- ✅ **Campos completos**: Toda la información necesaria para offline

---

*Documentación actualizada: 4 de diciembre de 2024*
*Estado del sistema: ✅ Operativo - Endpoints probados y validados*
*Funcionalidades implementadas: ✅ Autenticación, ✅ Períodos de Caja, ✅ Visitas, ✅ Afiliados, ✅ Caché Inteligente*