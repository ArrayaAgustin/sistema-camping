```markdown
# 🏕️ Sistema de Camping SMATA - API

API REST para la gestión del sistema de camping de SMATA, desarrollada con arquitectura limpia y tecnologías modernas.

## 🚀 Tecnologías

- **Backend**: Node.js + Express.js
- **ORM**: Prisma
- **Base de datos**: MySQL
- **Autenticación**: JWT (JSON Web Tokens)
- **Cache**: Redis (para sesiones y cache de consultas)
- **Jobs asíncronos**: Bull Queue + Redis
- **Validación**: Custom validators
- **Testing**: Scripts de prueba automatizados

## 📁 Estructura del Proyecto

```
Api/
├── src/                          # Código fuente principal
│   ├── config/                   # Configuración global
│   │   ├── env.js               # Variables de entorno
│   │   ├── prisma-config.js     # Configuración de Prisma Client
│   │   └── redis-config.js      # Configuración Redis (pendiente)
│   │
│   ├── controllers/             # Controladores (lógica HTTP)
│   │   ├── auth.controller.js   # Controlador de autenticación
│   │   ├── afiliados.controller.js # Controlador de afiliados
│   │   ├── visitas.controller.js    # Controlador de visitas (pendiente)
│   │   ├── campings.controller.js   # Controlador de campings (pendiente)
│   │   └── sync.controller.js       # Controlador de sincronización (pendiente)
│   │
│   ├── services/               # Servicios (lógica de negocio)
│   │   ├── auth.service.js     # Servicio de autenticación
│   │   ├── afiliados.service.js # Servicio de afiliados
│   │   ├── visitas.service.js   # Servicio de visitas (pendiente)
│   │   ├── cache.service.js     # Servicio de cache Redis (pendiente)
│   │   └── sync.service.js      # Servicio de sincronización (pendiente)
│   │
│   ├── middlewares/            # Middlewares personalizados
│   │   ├── auth.middleware.js  # Middleware de autenticación y autorización
│   │   ├── cache.middleware.js # Middleware de cache (pendiente)
│   │   └── rateLimiter.middleware.js # Rate limiting (pendiente)
│   │
│   ├── utils/                  # Utilidades y helpers
│   │   ├── hash.util.js        # Funciones de hashing (bcrypt)
│   │   ├── jwt.util.js         # Funciones JWT
│   │   ├── cache.util.js       # Utilidades de cache (pendiente)
│   │   └── validators.util.js   # Validadores personalizados (pendiente)
│   │
│   ├── jobs/                   # Trabajos asíncronos (pendiente)
│   │   ├── worker.js           # Worker principal
│   │   ├── sync.job.js         # Job de sincronización
│   │   ├── export.job.js       # Job de exportación
│   │   └── cleanup.job.js      # Job de limpieza
│   │
│   ├── routes/                 # Definición de rutas
│   │   ├── auth.routes.js      # Rutas de autenticación
│   │   ├── afiliados.routes.js # Rutas de afiliados
│   │   ├── visitas.js          # Rutas de visitas (legacy)
│   │   ├── sync.js             # Rutas de sincronización (legacy)
│   │   └── index.js            # Router principal
│   │
│   ├── models/                 # Modelos de datos
│   │   └── prisma/             # Schema y configuración de Prisma
│   │       ├── schema.prisma   # Definición del modelo de datos
│   │       ├── seed.js         # Datos iniciales
│   │       └── migrations/     # Migraciones de BD (auto-generadas)
│   │
│   ├── app.js                  # Configuración de Express
│   └── server.js               # Servidor Node.js
│
├── tests/                      # Scripts de testing
│   ├── README.md              # Documentación de tests
│   ├── unit/                  # Tests unitarios (pendiente)
│   ├── integration/           # Tests de integración (pendiente)
│   ├── verify-admin.js        # Verificar configuración de admin
│   ├── test-login-route.js    # Test de autenticación
│   ├── test-afiliados.js      # Test de afiliados
│   └── ... otros tests
│
├── docs/                      # Documentación adicional (pendiente)
│   ├── api.md                 # Documentación de API
│   ├── deployment.md          # Guía de despliegue
│   └── architecture.md        # Arquitectura del sistema
│
├── .env.example               # Ejemplo de variables de entorno
├── .gitignore                # Archivos ignorados por Git
├── Dockerfile                # Docker configuration (pendiente)
├── docker-compose.yml        # Docker Compose (pendiente)
├── package.json              # Dependencias y scripts
└── README.md                 # Este archivo
```

## ⚙️ Instalación y Configuración

### 1. Clonar el repositorio
```bash
git clone [url-del-repo]
cd sistema-camping/Api
```

### 2. Instalar dependencias
```bash
npm install
```

### 3. Configurar variables de entorno
```bash
cp .env.example .env
# Editar .env con tus configuraciones
```

Variables requeridas en `.env`:
```env
DATABASE_URL="mysql://usuario:password@localhost:3306/camping_db"
JWT_SECRET="tu-clave-secreta-muy-segura"
JWT_EXPIRES="8h"
PORT=3001
NODE_ENV=development
```

### 4. Configurar base de datos
```bash
# Generar cliente de Prisma
npm run prisma:generate

# Ejecutar migraciones (si es necesario)
npx prisma db push

# Cargar datos iniciales
node src/models/prisma/seed.js
```

### 5. Iniciar el servidor
```bash
# Desarrollo
npm run dev

# Producción
npm start
```

## 🛠️ Scripts Disponibles

```bash
# Servidor
npm start              # Iniciar en producción
npm run dev           # Iniciar en desarrollo (nodemon)

# Base de datos
npm run prisma:generate  # Generar cliente Prisma
npm run prisma:studio   # Abrir Prisma Studio

# Testing
npm test              # Ejecutar todos los tests principales
npm run test:auth     # Solo tests de autenticación
npm run test:afiliados # Solo tests de afiliados
npm run verify        # Verificar configuración de admin
```

## 🔐 Autenticación y Autorización

### Sistema de permisos por roles:
- **admin**: Acceso completo (`["all"]`)
- **operador**: Permisos específicos por funcionalidad
- **afiliado**: Solo acceso a sus propios datos (`["read:own"]`)

### Flujo de autenticación:
1. `POST /auth/login` → Obtener token JWT
2. Incluir token en headers: `Authorization: Bearer <token>`
3. Middleware verifica token y permisos automáticamente

## 📚 API Endpoints

### 🔐 Autenticación (`/auth`)
```http
POST   /auth/login        # Iniciar sesión
POST   /auth/create-user  # Crear usuario (admin)
GET    /auth/profile      # Obtener perfil
POST   /auth/refresh      # Renovar token
```

### 👥 Afiliados (`/afiliados`)
```http
GET    /afiliados                    # Buscar afiliados
GET    /afiliados/:id               # Obtener afiliado específico
GET    /afiliados/version/padron    # Versión del padrón
GET    /afiliados/stats/padron      # Estadísticas del padrón
```

### Parámetros de búsqueda:
- `tipo`: `dni`, `apellido`, `general`
- `q`: Término de búsqueda
- `limit`: Máximo de resultados (default: 20)

### 📝 Visitas y Sincronización
```http
# (Rutas legacy - pendientes de refactorización)
POST   /visitas          # Registrar visita online
GET    /visitas/dia      # Visitas por día y camping
POST   /sync/visitas     # Sincronizar lote de visitas (batch offline)
GET    /visitas/afiliado/:id  # Historial de visitas de un afiliado
```

### 🔄 Gestión de períodos
```http
# (Pendiente de implementación)
POST   /periodos/abrir   # Abrir período de caja
POST   /periodos/cerrar  # Cerrar período de caja
GET    /periodos/actual  # Obtener período actual
```

### 🏕️ Gestión de campings
```http
# (Pendiente de implementación)
GET    /campings         # Listar campings disponibles
GET    /campings/:id     # Obtener información de camping específico
```

## 🧪 Testing

### Verificar configuración inicial:
```bash
npm run verify
```

### Probar autenticación:
```bash
npm run test:auth
```

### Probar búsqueda de afiliados:
```bash
npm run test:afiliados
```

### Tests individuales:
```bash
node tests/test-login-route.js
node tests/test-afiliados.js
node tests/verify-admin.js
```

## 🏗️ Arquitectura

### Principios aplicados:
- **Separación de responsabilidades**: Controllers, Services, Routes
- **Inyección de dependencias**: Configuración centralizada
- **Middleware pattern**: Autenticación y autorización
- **Error handling**: Manejo centralizado de errores
- **Logging**: Sistema de logs estructurado

### Flujo de una petición:
```
Request → Route → Middleware → Controller → Service → Database
                     ↓
Response ← Error Handler ← Exception ←─────────────────┘
```

## 🔧 Desarrollo

### Estructura de commits:
- `feat:` Nueva funcionalidad
- `fix:` Corrección de bugs
- `refactor:` Refactorización de código
- `test:` Nuevos tests
- `docs:` Documentación

### Comandos útiles:
```bash
# Ver logs de Prisma
DEBUG=prisma:* npm start

# Regenerar cliente tras cambios en schema
npm run prisma:generate

# Explorar BD visualmente
npm run prisma:studio
```

## 🔄 Cache y Trabajos Asíncronos

### Redis Cache
- **Cache de consultas**: Afiliados frecuentemente consultados
- **Cache de sesiones**: Tokens JWT y datos de usuario
- **Cache de padrón**: Versión actual del padrón para acceso rápido

### Trabajos Asíncronos (Bull Queue)
```javascript
// Tipos de trabajos implementados:
- sync:visitas        // Procesamiento de lotes de visitas offline
- export:padron       // Exportación de padrón completo
- backup:database     // Backup periódico de datos críticos
- cleanup:logs        // Limpieza de logs antiguos
```

### Configuración Redis:
```env
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=optional
CACHE_TTL=3600        # Time to live en segundos
```

## 📋 Funcionalidades Pendientes

### 🏗️ Por implementar (Backlog):

#### 📊 **Dashboard y Reportes**
- [ ] Dashboard con métricas en tiempo real
- [ ] Reportes de visitantes por período
- [ ] Reportes de ocupación por camping
- [ ] Estadísticas de afiliados más activos
- [ ] Exportación de reportes (PDF/Excel)

#### 🔄 **Sistema de Sincronización Avanzado**
- [ ] Refactorizar rutas `/sync` con nueva arquitectura
- [ ] Implementar worker para procesamiento asíncrono
- [ ] Sistema de reintentos para fallos de sincronización
- [ ] Monitoreo de estado de sincronización
- [ ] Resolución de conflictos en sincronización

#### 🏕️ **Gestión de Campings**
- [ ] CRUD completo de campings
- [ ] Gestión de capacidades y disponibilidad
- [ ] Asignación de usuarios por camping
- [ ] Configuración de temporadas y tarifas

#### 💰 **Gestión Financiera**
- [ ] Módulo de períodos de caja completo
- [ ] Control de apertura/cierre de períodos
- [ ] Reconciliación de ingresos
- [ ] Integración con sistemas contables

#### 👥 **Gestión de Usuarios Avanzada**
- [ ] Perfiles de usuario expandidos
- [ ] Gestión de permisos granular
- [ ] Audit trail de acciones de usuarios
- [ ] Sistema de notificaciones

#### 📱 **API Enhancements**
- [ ] Versionado de API (v1, v2)
- [ ] Rate limiting por usuario/IP
- [ ] Swagger/OpenAPI documentation
- [ ] GraphQL endpoint opcional
- [ ] Websockets para updates en tiempo realz

#### 🔐 **Seguridad Avanzada**
- [ ] Refresh tokens
- [ ] Revocación de tokens
- [ ] 2FA (Two Factor Authentication)
- [ ] Auditoría de seguridad
- [ ] Encriptación de datos sensibles

#### 📧 **Comunicaciones**
- [ ] Sistema de emails automatizados
- [ ] Notificaciones push
- [ ] SMS para confirmaciones críticas
- [ ] Templates de comunicación

#### 🧪 **Testing y QA**
- [ ] Tests unitarios completos (Jest)
- [ ] Tests de integración
- [ ] Tests end-to-end
- [ ] Coverage reporting
- [ ] Performance testing

#### 🐳 **DevOps e Infraestructura**
- [ ] Dockerización completa
- [ ] Docker Compose para desarrollo
- [ ] CI/CD pipelines
- [ ] Monitoreo con Prometheus/Grafana
- [ ] Logging estructurado (Winston/ELK)

### ⚡ **Optimizaciones Técnicas**
- [ ] Paginación avanzada con cursors
- [ ] Compresión de responses
- [ ] CDN para assets estáticos
- [ ] Database indexing optimization
- [ ] Query optimization y profiling

### 🔌 **Integraciones**
- [ ] API de SMATA central
- [ ] Sistemas de pagos online
- [ ] Plataformas de reservas externas
- [ ] Servicios de geolocalización
- [ ] Integración con apps móviles

## 🚀 Despliegue

### Variables de entorno para producción:
```env
NODE_ENV=production
JWT_SECRET="clave-super-segura-en-produccion"
DATABASE_URL="mysql://user:pass@production-db:3306/db"
REDIS_URL="redis://user:pass@redis-server:6379"
PORT=3001
CORS_ORIGIN="https://camping.smata.org.ar"
```

### Docker Compose (Pendiente):
```yaml
version: '3.8'
services:
  api:
    build: .
    ports:
      - "3001:3001"
    depends_on:
      - mysql
      - redis
  
  mysql:
    image: mysql:8.0
    environment:
      MYSQL_DATABASE: camping_smata
      MYSQL_ROOT_PASSWORD: ${DB_PASSWORD}
  
  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"
  
  worker:
    build: .
    command: node src/jobs/worker.js
    depends_on:
      - redis
      - mysql
```

### Consideraciones de seguridad:
- Usar HTTPS en producción
- Implementar rate limiting
- Validar y sanitizar inputs
- Rotar JWT_SECRET regularmente
- Configurar CORS apropiadamente
- Backup automatizado de Redis y MySQL
- Monitoreo de recursos y alertas

## 📞 Soporte

Para reportar bugs o solicitar funcionalidades, crear un issue en el repositorio.

---

**Desarrollado para SMATA** 🏕️
