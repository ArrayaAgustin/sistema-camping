# Análisis Sistema Camping - Informe Completo
**Fecha:** 2026-02-25
**Proyecto:** sistema-camping / Api + Web

---

## 1. Lógica de negocio confirmada

### Entidades y relaciones
- **personas**: entidad raíz. Una sola por DNI, sin excepción. Tiene un `qr_code` único (UUID generado al crear, nunca cambia).
- **usuarios**: cuenta de acceso con rol. Apunta a `persona`. Un admin puede ver su carnet porque el carnet va por `id_persona`, no por rol.
- **afiliados**: datos sindicales/laborales. Apunta a `persona` (1:1 opcional). Puede venir del padrón o cargarse manualmente.
- **familiares**: relación `persona ↔ afiliado`. Una misma persona puede ser familiar de DOS afiliados distintos (tabla tiene `persona_id + afiliado_id`). Tiene flag `baja` para alta/baja del grupo familiar.
- **invitados**: permiso temporal para una persona. Si ya existe como invitado → editar fechas, no duplicar.

### Reglas clave
- Una persona puede ser afiliado Y familiar de otro afiliado al mismo tiempo.
- Para ser familiar es obligatorio asociarlo a un afiliado (buscar por DNI del titular).
- Formulario siempre verifica por DNI: si existe → editar con mismo `id_persona`. Si no existe como afiliado/familiar/invitado → INSERT en esa tabla con el `id_persona` que ya tenemos.
- Cuando se crea una persona nueva → se crea usuario automáticamente con `username=DNI`, `password=DNI`, `must_change_password=true`.
- Operador se asocia a uno o varios campings. Solo puede abrir caja de su camping asignado y solo si no hay caja abierta.
- Múltiples operadores pueden trabajar en el mismo camping/caja al mismo tiempo.
- **QR es permanente**: identifica a la persona. Las condiciones de acceso se evalúan AL MOMENTO del escaneo. El carnet no se reimprime aunque cambien las condiciones.
- **Lógica QR permisiva**: afiliado inactivo en sindicato PERO con invitado vigente → PASA. Se evalúa la condición más favorable.

---

## 2. Schema Prisma - Modelos completos

### personas
| Campo | Tipo | Notas |
|-------|------|-------|
| id | Int PK | autoincrement |
| dni | VarChar(8) UNIQUE | identificador principal |
| apellido | VarChar(100)? | |
| nombres | VarChar(100)? | |
| nombre_completo | VarChar(200)? | generado automáticamente |
| sexo | Enum(M,F,X)? | |
| fecha_nacimiento | Date? | |
| email | VarChar(100)? | |
| telefono | VarChar(50)? | |
| qr_code | VarChar(64) UNIQUE | UUID v4, generado al crear, nunca cambia |
| created_at, updated_at | timestamps | |

### afiliados
| Campo | Tipo | Notas |
|-------|------|-------|
| id | Int PK | |
| persona_id | FK→personas UNIQUE | 1:1 opcional, SetNull |
| cuil | VarChar(11) UNIQUE | identificador sindical |
| sexo | Enum(M,F,X) | requerido |
| tipo_afiliado | VarChar(50)? | |
| fecha_nacimiento | Date? | |
| categoria | VarChar(100)? | |
| situacion_sindicato | Enum(ACTIVO,BAJA) | default ACTIVO |
| situacion_obra_social | Enum(ACTIVO,BAJA) | default ACTIVO |
| domicilio, provincia, localidad | VarChar? | |
| empresa_cuit | VarChar(11)? | |
| empresa_nombre | VarChar(200)? | |
| codigo_postal | VarChar(10)? | |
| grupo_sanguineo | VarChar(5)? | |
| foto_url | VarChar(255)? | |
| padron_version_id | FK→padron_versiones? | |
| activo | Boolean | default true |

### familiares
| Campo | Tipo | Notas |
|-------|------|-------|
| id | Int PK | |
| persona_id | FK→personas? | SetNull |
| afiliado_id | FK→afiliados | Cascade delete |
| estudia | Boolean | default false |
| discapacitado | Boolean | default false |
| baja | Boolean | default false (baja del grupo familiar) |
| activo | Boolean | default true |

### invitados
| Campo | Tipo | Notas |
|-------|------|-------|
| id | Int PK | |
| persona_id | FK→personas | Cascade delete |
| vigente_desde | Date? | |
| vigente_hasta | Date? | |
| aplica_a_familia | Boolean | default true |
| activo | Boolean | default true |

### usuarios
| Campo | Tipo | Notas |
|-------|------|-------|
| id | Int PK | |
| username | VarChar(50) UNIQUE | = DNI al crear |
| password_hash | VarChar(255) | hash del DNI al crear |
| email | VarChar(100)? | |
| afiliado_id | FK→afiliados? | ⚠️ legacy, usar persona_id |
| persona_id | FK→personas UNIQUE | 1:1 con persona |
| must_change_password | Boolean | true al crear |
| activo | Boolean | default true |
| ultimo_acceso | Timestamp? | |

### usuario_roles
| Campo | Tipo | Notas |
|-------|------|-------|
| id | Int PK | |
| usuario_id | FK→usuarios Cascade | |
| rol_id | FK→roles Cascade | |
| camping_id | FK→campings? | NULL = acceso global (admin) |
| activo | Boolean | default true |
| UNIQUE | (usuario_id, rol_id, camping_id) | |

### roles
| Campo | Tipo | Notas |
|-------|------|-------|
| id | Int PK | |
| nombre | VarChar(50) UNIQUE | admin / operador / afiliado |
| permisos | JSON | array de strings de permisos |

### campings
| Campo | Tipo | Notas |
|-------|------|-------|
| id | Int PK | |
| nombre | VarChar(200) | |
| ubicacion, provincia, localidad | VarChar? | |
| telefono, email | VarChar? | |
| activo | Boolean | default true |

### visitas
| Campo | Tipo | Notas |
|-------|------|-------|
| id | Int PK | |
| uuid | VarChar(36) UNIQUE | para deduplicación en sync offline |
| persona_id | FK→personas? | |
| afiliado_id | FK→afiliados? | |
| camping_id | FK→campings | required |
| periodo_caja_id | FK→periodos_caja? | |
| usuario_registro_id | FK→usuarios | required |
| condicion_ingreso | Enum(AFILIADO,FAMILIAR,INVITADO,DESCONOCIDO) | |
| fecha_ingreso | Timestamp | default now |
| fecha_egreso | Timestamp? | |
| acompanantes | JSON? | |
| sincronizado | Boolean | ⚠️ bug: debería ser false cuando registro_offline=true |
| registro_offline | Boolean | default false |

### periodos_caja
| Campo | Tipo | Notas |
|-------|------|-------|
| id | Int PK | |
| camping_id | FK→campings | |
| usuario_apertura_id | FK→usuarios | |
| usuario_cierre_id | FK→usuarios? | |
| fecha_apertura | Timestamp | |
| fecha_cierre | Timestamp? | |
| total_visitas | Int | default 0 |
| activo | Boolean | default true |

### Otras tablas
- **padron_versiones**: versiones del padrón sindical importado
- **auditoria_padron**: log de cambios (INSERT/UPDATE/DELETE/IMPORT)
- **configuracion_sistema**: pares clave-valor de configuración
- **sync_logs**: log de sincronización offline

---

## 3. Estado del JWT y cookies

### Situación actual
El middleware (`auth.middleware.ts:30`) SÍ lee la cookie `camping-token`:
```typescript
const cookieToken = (req as any).cookies?.['camping-token'];
```
Pero el login NUNCA setea esa cookie. El JWT retornaba `'dummy-token'` (hardcodeado).

### Solución implementada
- `JwtUtil.generateToken()` / `JwtUtil.verifyToken()` con librería `jsonwebtoken`
- Login setea cookie httpOnly:
```typescript
res.cookie('camping-token', token, {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'lax',
  maxAge: 8 * 60 * 60 * 1000
});
```
- Logout limpia la cookie: `res.clearCookie('camping-token')`

---

## 4. QR Code

### Cómo funciona
- `qr_code` es un UUID v4 aleatorio generado con `crypto.randomUUID()` al crear la persona
- Se guarda en la DB y NUNCA cambia
- En el frontend se usa para generar la imagen QR visual (librería `qrcode`)
- El operador escanea → el UUID llega al backend → `GET /api/qr/:qr_code` resuelve quién es y si puede entrar

### Lógica de acceso (qr.service.ts)
```
1. Buscar persona por qr_code
2. Si no existe → DESCONOCIDO, denegar
3. Verificar condiciones (orden permisivo):
   a. ¿Invitado vigente (activo + fechas válidas)? → PASA
   b. ¿Afiliado activo en sindicato? → PASA
   c. ¿Familiar de afiliado activo y no está de baja? → PASA
   d. Ninguna condición → DENIEGA con razón específica
```

---

## 5. Endpoint central: POST /personas

Hace todo en una sola transacción atómica. Es el endpoint para el admin:

```
Input:
  dni (requerido)
  apellido, nombres, sexo, fecha_nacimiento, email, telefono
  afiliado?: { cuil, sexo, situacion_sindicato, situacion_obra_social, ... }
  familiar?: { afiliado_id, estudia, discapacitado, baja }
  invitado?: { vigente_desde, vigente_hasta, aplica_a_familia }
```

**Flujo:**
1. UPSERT persona por DNI (crea o actualiza)
2. UPSERT afiliado si viene en input
3. UPSERT familiar si viene en input (valida que el afiliado_id exista)
4. UPSERT invitado si viene en input
5. Retorna persona con todos sus datos relacionados

---

## 6. Endpoints conservar / deprecar

### Conservar
```
POST   /api/auth/login
POST   /api/auth/logout
GET    /api/auth/profile
POST   /api/auth/change-password
POST   /api/auth/reset-password (admin)
GET    /api/auth/validate

GET    /api/personas/search
GET    /api/personas/dni/:dni
GET    /api/personas/:id
POST   /api/personas          ← endpoint central
PUT    /api/personas/:id

GET    /api/afiliados/stats/padron
GET    /api/afiliados/version/padron
GET    /api/afiliados/export/padron

POST   /api/visitas
GET    /api/visitas/dia

POST   /api/periodos-caja/abrir
PUT    /api/periodos-caja/:id/cerrar
GET    /api/periodos-caja/activo
GET    /api/periodos-caja/historial

GET    /api/qr/:qr_code
```

### Deprecar (redundantes con /personas)
```
GET    /api/afiliados?q=...
GET    /api/afiliados/numero/:num
GET    /api/afiliados/documento/:dni
POST   /api/afiliados/search/advanced
GET    /api/afiliados/:id
PUT    /api/afiliados/:id
```

---

## 7. Fortalezas

### Backend
- Arquitectura limpia: Controller → Service → Prisma → DB
- TypeScript end-to-end con interfaces bien definidas
- RBAC con multi-tenancy por camping (`usuario_roles.camping_id`)
- Transacciones atómicas en operaciones críticas (personas upsert)
- Lógica QR con condición de ingreso bien implementada
- Sync offline con UUID para deduplicación

### Frontend
- React 19 + TypeScript + Vite + Tailwind (stack moderno)
- `AuthContext` con hook `useAuth()` bien estructurado
- `PrivateRoute` con verificación de roles
- `apiClient` centralizado con manejo de 401 automático

---

## 8. Problemas identificados y estado

### Backend
| Problema | Estado |
|----------|--------|
| JWT retornaba `'dummy-token'` | ✅ Corregido |
| Cookie httpOnly nunca se seteaba | ✅ Corregido |
| QR genera `"QR-{dni}"` predecible | ✅ Corregido a UUID v4 |
| `sincronizado` invertido en offline | Pendiente |
| `usuarios.service.ts` incompleto | Pendiente |
| Sin validación formato DNI/CUIL | Pendiente |

### Frontend
| Problema | Estado |
|----------|--------|
| `CredencialDigital.tsx` con datos demo | ✅ Corregido |
| `camping_id` hardcodeado a `1` | Pendiente |
| Sin selección de camping post-login | Pendiente |
| Sin lector QR | Pendiente |
| `Dashboard.tsx` con 947 líneas | Pendiente |
| `alert()` en lugar de toast | Pendiente |

---

## 9. Roadmap

### Fase 1 - Auth ✅
- JWT real con `jsonwebtoken`
- Cookie httpOnly `camping-token`

### Fase 2 - QR ✅
- `crypto.randomUUID()` en personas
- `CredencialDigital.tsx` con datos reales y QR visual

### Fase 3 - Admin panel (en curso)
- Flujo: buscar DNI → datos → afiliado/familiar/invitado colapsables
- CRUD usuarios + roles + campings

### Fase 4 - Operador
- Selección de camping post-login
- Lector QR (html5-qrcode)
- Control de ingreso verde/rojo con razón

### Fase 5 - Calidad
- Logger (winston/pino)
- Validaciones DNI/CUIL
- Dividir Dashboard.tsx
- Toast notifications
