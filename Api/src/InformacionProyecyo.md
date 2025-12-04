# Resumen de la API — Camping SMATA (Arquitectura, lógica y flujo)

Este documento resume la lógica, estructura y comportamiento que debe resolver la API backend del proyecto: responsabilidades principales, autenticación/autorización, sincronización offline, trabajo asincrónico, mapeo a la base de datos y prácticas recomendadas para desarrollo/despliegue.

---

## 1. Propósito / Objetivos
- Exponer una API REST segura para gestionar:
  - padrón de afiliados (busquedas, detalle, QR),
  - familiares,
  - usuarios y roles/permisos,
  - campings, periodos de caja y visitas.
- Soportar trabajo offline en el frontend y sincronizar cambios (visitas) de forma idempotente.
- Mantener lógica crítica (contadores, logs de sync) persistente y auditada.
- Facilitar escalado: colas para procesamiento asíncrono, separando ingesta de procesamiento.

---

## 2. Arquitectura general
- Node.js + Express como servidor HTTP.
- Prisma como ORM (cliente tipado) sobre MySQL.
- Redis + Bull (cola) para procesar sincronización batch en background (worker).
- Endpoints REST organizados por recursos (auth, afiliados, visitas, sync, admin).
- Procedimientos almacenados opcionales para lógica pesada (se pueden usar con prisma.$queryRaw).

Estructura de carpetas (resumida)
- prisma/                   -> schema.prisma, seed.js
- src/
  - server.js               -> arranque de la app
  - prisma.js               -> cliente Prisma
  - auth.js                 -> helpers y middlewares auth/perm
  - routes/                 -> auth, afiliados, visitas, sync, admin...
  - services/               -> lógica de negocio (p.ej. syncService)
  - jobs/                   -> workers (syncWorker.js)
  - config/                 -> redis.js, logger, etc.
- scripts/                  -> scripts útiles (introspect, backup)

---

## 3. Modelos principales (resumen)
- padron_versiones: control de versiones del padrón (version, totales).
- afiliados: datos personales, empresa, qr_code, padron_version_id.
- familiares: relación con afiliado (ON DELETE CASCADE).
- usuarios: credenciales, afiliado_id (opcional), password_hash (bcrypt).
- roles, usuario_roles: permisos (JSON) y relación N:N.
- campings, periodos_caja, visitas, sync_logs, auditoria_padron.

Prisma mapea las tablas con @map/@@map si el naming difiere.

---

## 4. Autenticación y autorización
- Autenticación: JWT (HS256) firmado con `JWT_SECRET`.
  - Payload mínimo en token: userId, username, afiliadoId, roles[], permisos[].
  - Tiempo de expiración configurable (JWT_EXPIRES).
- Login:
  - POST /auth/login { username, password } -> valida bcrypt.compare(password, password_hash) y devuelve token.
- Middleware:
  - authenticateMiddleware: valida Bearer token en `Authorization: Bearer <token>`.
  - checkPermission(...perms): autoriza por permisos. Permiso especial `all` bypass.
- Roles:
  - roles.permisos es un JSON array con strings (p.ej. `create:visitas`, `read:afiliados`, `sync:visitas`).
  - Al login se consolidan permisos activos de todos los roles asignados.

Buenas prácticas:
- No guardar passwords en JWT.
- Usar HTTPS en producción.
- Considerar refresh tokens si necesitas sesiones persistentes.

---

## 5. Endpoints clave (resumen)
- Auth
  - POST /auth/login
  - POST /auth/create-user (admin)
- Afiliados
  - GET /afiliados?tipo=dni|apellido|general&q=...&limit=...
  - GET /afiliados/:id
  - GET /afiliados/version/padron
- Visitas
  - POST /visitas (registrar visita online)
  - GET /visitas/dia?camping_id=...&fecha=YYYY-MM-DD
- Sync (offline)
  - POST /sync/visitas -> encola job asíncrono (202 Accepted) para procesar batch
- Admin (opcional)
  - Endpoints para abrir/cerrar periodos, gestionar roles, revisar logs de sync

Cada endpoint debe validar input y sanitizar datos.

---

## 6. Flujo de sincronización offline (diseño)
1. Frontend (offline):
   - Guarda visitas localmente (IndexedDB) con UUID (v4) por visita.
   - Marca visitas como `pending` hasta sincronizarlas.
2. Recupera conexión -> POST /sync/visitas { campingId, visitas: [...] } con Authorization header.
3. API:
   - Valida token y permisos.
   - Encola un job en Bull (Redis) con payload { visitas, campingId, usuarioId }.
   - Responde 202 Accepted con jobId.
4. Worker (syncWorker):
   - Procesa job: inserta visitas (prisma.visitas.create), ignora UUIDs ya existentes (idempotencia).
   - Actualiza periodos_caja.total_visitas cuando corresponde.
   - Inserta sync_logs con métricas (sincronizadas/errores) y estado (success/partial/failed).
5. Frontend:
   - Consulta status del job (opcional) o asume éxito cuando recibe confirmación del worker (si se implementa callback/endpoint).
   - Borra localmente los UUIDs sincronizados o los marca como done.

Consideraciones:
- Para lotes pequeños se puede procesar en la request, pero para escalabilidad usar cola.
- Job debe ser reintentable y con backoff. Registrar errores y DLQ (dead-letter queue) si excede reintentos.

---

## 7. Colas y trabajo asíncrono
- Cola: Bull (o BullMQ) usando Redis.
- Producer: enqueueSyncBatch(visitas, campingId, usuarioId) -> syncQueue.add(...)
- Worker: syncQueue.process(concurrency, handler)
- Retries/backoff: attempts: 3, backoff: 5s (configurable en job)
- Observability:
  - Logs en consola / archivo.
  - sync_logs en DB para auditoría.
  - Opcional: UI para ver jobs pendientes/completados (Arena/ Bull Board).

---

## 8. Idempotencia y seguridad de datos
- Idempotencia basada en `visitas.uuid` (UNIQUE).
- Validar/normalizar datos entrantes (dni, UUID, fechas).
- Evitar inserciones duplicadas verificando existencia por UUID.
- Registrar auditoría (auditoria_padron) para cambios importantes (IMPORT, UPDATE, DELETE).

---

## 9. Integración con la base (Prisma)

### 9.1 Cliente tipado y flujo de trabajo
Prisma genera automáticamente un **cliente tipado** que actúa como traductor inteligente entre JavaScript y MySQL:

**¿Qué hace `npx prisma generate`?**
- Lee `schema.prisma` y crea código JavaScript en `node_modules/@prisma/client/`
- Genera clases, métodos y tipos que coinciden exactamente con tu BD
- Provee autocompletado, validaciones y detección de errores en tiempo de desarrollo
- Elimina la necesidad de escribir SQL manualmente para operaciones comunes

### 9.2 Flujo de trabajo recomendado:
```bash
# 1. Introspección: Lee tu BD MySQL y actualiza schema.prisma
npx prisma db pull

# 2. Generación: Crea el cliente tipado basado en el schema
npx prisma generate

# 3. (Opcional) Interfaz gráfica para explorar datos
npx prisma studio

# 4. (Opcional) Crear migraciones para cambios futuros
npx prisma migrate dev --name descripcion_cambio
```

### 9.3 Cuándo ejecutar cada comando:
- **`prisma db pull`**: 
  - Después de cambios manuales en la BD (nuevas tablas, columnas, etc.)
  - Al configurar el proyecto por primera vez
  - Para sincronizar schema con BD existente
- **`prisma generate`**:
  - **OBLIGATORIO** después de `prisma db pull`
  - Después de modificar `schema.prisma` manualmente
  - Después de `npm install` en proyectos nuevos
  - Cuando el cliente da errores de "not initialized"

### 9.4 Diferencias entre archivos de conexión:
```javascript
// ❌ src/db.js (MySQL directo - NO USAR con Prisma)
const mysql = require('mysql2/promise');
const pool = mysql.createPool({...}); // Conexión manual, sin tipado

// ✅ src/prisma.js (Cliente Prisma - USAR ESTE)
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient(); // Cliente tipado, conexión automática
```

**¿Por qué no usar db.js con Prisma?**
- Prisma maneja su propia conexión usando `DATABASE_URL` del .env
- El cliente tipado incluye pooling, retry logic y optimizaciones automáticas
- db.js es código redundante que puede causar confusión y conexiones duplicadas
- Prisma ya provee `$queryRaw` para consultas SQL personalizadas cuando se necesiten

### 9.5 Procedimientos almacenados:
- Se pueden usar via `prisma.$queryRaw` o `prisma.$executeRaw`
- Ejemplo: `await prisma.$queryRaw\`CALL sp_buscar_afiliado(${criterio}, ${tipo}, ${limit})\``
- Para lógica simple: reescribir en Node.js/Prisma
- Para lógica compleja: mantener en MySQL pero llamar via Prisma

---

## 10. Seguridad y buenas prácticas
- HTTPS obligatorio en producción.
- No comitear .env (usar .gitignore).
- Guardar secrets en secret manager (GitHub Secrets, Vault).
- Rate limit, body size limit, validación de esquemas (zod/JOI/express-validator).
- Escapar/parametrizar queries raw.
- Policies de CORS restrictivas por entorno.
- Revisar permisos antes de exponer endpoints sensibles.

---

## 11. Despliegue y operaciones
- Orquestación sugerida: Docker Compose (MySQL, Redis, backend) o Kubernetes.
- Variables de entorno: DATABASE_URL, JWT_SECRET, REDIS_*.
- Worker ejecutándose como servicio separado (replicado según carga).
- CI: generar Prisma client, ejecutar linters, tests básicos.
- Backups: mysqldump periódicos y snapshot del volumen DB.

Ejemplo docker-compose (alto nivel):
- services:
  - mysql (volumen, init.sql)
  - redis
  - backend (app)
  - worker (mismo image que backend o proceso separado)

---

## 12. Herramientas y scripts útiles

### 12.1 Scripts de Prisma (agregar a package.json):
```json
{
  "scripts": {
    "prisma:pull": "prisma db pull",
    "prisma:generate": "prisma generate", 
    "prisma:studio": "prisma studio",
    "prisma:introspect": "prisma db pull && prisma generate",
    "prisma:reset": "prisma migrate reset --force"
  }
}
```

### 12.2 Scripts de desarrollo:
- `npm run prisma:introspect` -> ejecuta `db pull` + `generate` en secuencia
- `npm run prisma:studio` -> interfaz web para explorar/editar datos
- `node prisma/seed.js` -> seed inicial (roles, admin, offline user)
- `npm run dev` -> levantar server en modo dev (nodemon)

### 12.3 Scripts de operaciones:
- `node src/jobs/syncWorker.js` -> correr worker localmente
- Backup: `mysqldump` o script bash en `scripts/`
- `npm run prisma:reset` -> resetear BD y aplicar seed (CUIDADO: borra datos)

---

## 13. Pruebas / Ejemplos rápidos (curl)
- Login:
  - POST /auth/login { "username":"admin", "password":"admin123" } -> { token }
- Registrar visita (online):
  - POST /visitas Authorization: Bearer <token> body { afiliado_id, camping_id, ... }
- Encolar sync:
  - POST /sync/visitas Authorization: Bearer <token> body { campingId, visitas: [ { uuid, afiliadoId, ... } ] }

---

## 14. Observabilidad y monitoreo
- Logs estructurados (morgan + logger) para requests.
- Guardar eventos clave en DB (sync_logs, auditoria_padron).
- Integrar métricas básicas (Prometheus) y health checks (GET /).
- Monitor Redis/Bull (Bull Board / Arena) para jobs.

---

## 15. Roadmap mínimo para evolucionar
1. Validaciones robustas (zod / express-validator).
2. Collection Postman / OpenAPI spec (documentación automática).
3. UI de administración básica (padrones, jobs, logs).
4. Mecanismo de refresh tokens y revocación segura.
5. Tests E2E + contract tests para endpoints críticos.
6. Baseline migration con prisma migrate y CI integrado.
7. TLS, secret manager y despliegue con docker-compose / k8s.

---

## 16. Puntos habituales / FAQ

### 16.1 Prisma y base de datos:
- **¿Cuándo regenerar el cliente?** -> Después de `db pull`, cambios en `schema.prisma`, o `npm install`
- **¿Por qué error "client not initialized"?** -> Ejecutar `npx prisma generate`
- **¿db.js vs prisma.js?** -> Usar solo `prisma.js`, db.js es redundante con Prisma
- **¿Cómo hacer consultas SQL complejas?** -> `prisma.$queryRaw` para SELECT, `prisma.$executeRaw` para INSERT/UPDATE/DELETE

### 16.2 Autenticación y datos:
- **¿Dónde se guardan las contraseñas?** -> `usuarios.password_hash` (bcrypt)
- **¿Cómo se evita duplicar visitas?** -> `visitas.uuid` único, worker verifica existencia
- **¿Qué pasa si falla el worker?** -> Bull reintenta, luego marca job fallido; revisar sync_logs para detalles
- **¿Cómo auditar importaciones?** -> `auditoria_padron` y `sync_logs`

### 16.3 Desarrollo:
- **¿Cómo ver los datos gráficamente?** -> `npm run prisma:studio`
- **¿Cómo sincronizar schema con BD?** -> `npm run prisma:introspect`
- **¿Cómo resetear datos de prueba?** -> `npm run prisma:reset` (CUIDADO: borra todo)

---

Si querés, te preparo:
- un documento OpenAPI (spec) básico con los endpoints principales,
- la colección Postman/Insomnia con ejemplos,
- o el `docker-compose.yml` para levantar MySQL+Redis+backend localmente y una guía paso a paso para deploy.

¿Con qué querés que siga ahora?