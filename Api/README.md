```markdown
# Camping SMATA — Backend (Prisma + Express + Redis queue)

Este repositorio contiene el backend mínimo listo para arrancar con:
- Node.js + Express
- Prisma (MySQL) como ORM
- Redis + Bull para procesamiento asíncrono de sincronizaciones (batches offline)
- Autenticación JWT y permisos por rol
- Seed para crear roles y usuarios base

Estructura principal
- backend/
  - Dockerfile
  - package.json
  - prisma/
    - schema.prisma
    - seed.js
  - src/
    - server.js
    - prisma.js
    - auth.js
    - config/
      - redis.js
    - routes/
      - auth.js
      - afiliados.js
      - visitas.js
      - sync.js
    - services/
      - syncService.js
    - jobs/
      - syncWorker.js

Quickstart local (sin Docker)
1. Copiar este directorio `backend/` a tu máquina.
2. Crear `.env` basado en `.env.example` y ajustar:
   - DATABASE_URL (MySQL)
   - REDIS_HOST / REDIS_PORT (Redis)
   - JWT_SECRET
3. Instalar dependencias:
   npm install
4. Generar client Prisma:
   npx prisma generate
5. Si ya tienes la BD creada: opcionalmente ejecutar:
   npx prisma db pull
6. Ejecutar seed para roles y usuarios base:
   node prisma/seed.js
7. Iniciar Redis (si no lo tienes): por ejemplo `redis-server` o vía Docker.
8. Levantar la API:
   npm run dev
9. Levantar worker (procesador async):
   node src/jobs/syncWorker.js

Quickstart con Docker Compose (sugerencia)
- Puedes crear un `docker-compose.yml` con servicios: mysql, redis, backend.
- Backend debe exponer el puerto `3000` y tener las env vars conectadas.

Endpoints principales (resumen)
- POST /auth/login { username, password } -> { token, user }
- POST /auth/create-user (admin) -> crear usuario
- GET /afiliados?tipo=dni|apellido|general&q=...&limit=20 (perm: read:afiliados)
- GET /afiliados/:id (perm: read:afiliados | read:own)
- GET /afiliados/version/padron (cualquier usuario autenticado)
- POST /visitas (perm: create:visitas) -> registar visita online
- GET /visitas/dia?camping_id=1&fecha=YYYY-MM-DD (perm: read:visitas)
- POST /sync/visitas (perm: sync:visitas or create:visitas) -> recibe batch de visitas; en este diseño encola job en Redis para procesamiento asíncrono

Autenticación y permisos
- JWT en Authorization: Bearer <token>
- Al hacer login se construye token con roles y permisos derivados de `roles.permisos` (JSON array)
- Middleware `checkPermission(...)` valida permisos (o `all`)

Sincronización Offline (diseño)
- Front guarda visitas localmente (IndexedDB) cuando está offline.
- Cuando recupera conexión, envía POST /sync/visitas con array de visitas.
- Endpoint encola job en Redis (Bull). Worker procesa de forma asíncrona: inserta visitas, actualiza periodos, registra `sync_logs`.
- Cada visita debe traer `uuid` (idempotencia): si existe el uuid se omite.

Notas de seguridad y producción
- Usar HTTPS (reverse proxy).
- Proteger `JWT_SECRET`.
- Considerar `refresh tokens` y revocación de tokens.
- Agregar rate-limit, validaciones, sanitización.
- Implementar monitorización del worker (reintentos, DLQ).

Qué sigue
- Si querés, te genero `docker-compose.yml` con MySQL + Redis + backend.
- También puedo generar una colección Postman/Insomnia con ejemplos.
- Puedo adaptar rutas para llamar SPs existentes (CALL sp_...) si preferís delegar la lógica al DB.
