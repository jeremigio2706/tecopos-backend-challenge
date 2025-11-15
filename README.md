# TecoPOS Backend Challenge

Sistema de microservicios backend construido con NestJS para gestión de cuentas bancarias, transacciones y webhooks con autenticación JWT.

## Tabla de Contenidos

- [Descripción](#descripción)
- [Arquitectura](#arquitectura)
- [Tecnologías](#tecnologías)
- [Estructura del Proyecto](#estructura-del-proyecto)
- [Requisitos Previos](#requisitos-previos)
- [Instalación](#instalación)
- [Configuración](#configuración)
- [Ejecución](#ejecución)
- [Testing](#testing)
- [API Endpoints](#api-endpoints)
- [Despliegue en Producción](#-despliegue-en-producción)
- [Características Implementadas](#características-implementadas)
- [Troubleshooting](#-troubleshooting)

---

## Descripción

Sistema de microservicios backend que implementa:

- **Autenticación y Autorización**: Sistema SSO con JWT
- **Gestión de Cuentas**: CRUD de cuentas bancarias con integración a MockAPI
- **Gestión de Transacciones**: Validación y procesamiento de transacciones financieras
- **Sistema de Webhooks**: Suscripciones y notificaciones de eventos
- **API Gateway**: Punto de entrada unificado con rate limiting y seguridad

## Arquitectura

El sistema está compuesto por 3 microservicios independientes:

```
┌─────────────────────────────────────────────────────────────┐
│                        API GATEWAY                           │
│              (Puerto 3000 - Punto de Entrada)               │
│         Rate Limiting, Helmet, CORS, JWT Validation         │
└───────────────────┬──────────────────┬──────────────────────┘
                    │                  │
        ┌───────────▼──────────┐  ┌───▼────────────────────┐
        │   SSO Service        │  │  Accounts Service      │
        │   (Puerto 3001)      │  │  (Puerto 3002)         │
        │                      │  │                        │
        │ - Registro           │  │ - Gestión Cuentas      │
        │ - Login              │  │ - Transacciones        │
        │ - JWT Tokens         │  │ - Webhooks             │
        │ - Users CRUD         │  │ - MockAPI Integration  │
        └──────────┬───────────┘  └────────────────────────┘
                   │
        ┌──────────▼───────────┐
        │  PostgreSQL DB       │
        │  (Puerto 5432)       │
        │  - Users             │
        │  - Refresh Tokens    │
        └──────────────────────┘
```

### Flujo de Comunicación

1. **Cliente** → API Gateway (autenticación)
2. **API Gateway** → SSO Service (validación JWT)
3. **API Gateway** → Accounts Service (operaciones de negocio)
4. **Accounts Service** → MockAPI (datos de cuentas/transacciones)
5. **Accounts Service** → Webhooks externos (notificaciones)

---

## Tecnologías

### Framework y Runtime
- **NestJS** v11.0.1 - Framework progresivo para Node.js
- **Node.js** - Runtime JavaScript
- **TypeScript** v5.7.3 - Superset de JavaScript con tipos

### Base de Datos y ORM
- **PostgreSQL** 15-alpine - Base de datos relacional
- **Prisma** v6.19.0 - ORM moderno para TypeScript

### Autenticación y Seguridad
- **Passport.js** v0.7.0 - Middleware de autenticación
- **JWT** (@nestjs/jwt v11.0.1) - JSON Web Tokens
- **bcrypt** v6.0.0 - Hash de contraseñas
- **Helmet** v8.1.0 - Seguridad HTTP headers

### Validación y Transformación
- **class-validator** v0.14.x - Validación de DTOs
- **class-transformer** v0.5.1 - Transformación de objetos

### HTTP y Comunicación
- **Axios** v1.13.2 - Cliente HTTP
- **@nestjs/axios** v4.0.1 - Integración Axios para NestJS

### Testing
- **Jest** v30.0.0 - Framework de testing
- **Supertest** v7.0.0 - Testing HTTP
- **@nestjs/testing** v11.0.1 - Utilidades de testing

### DevOps y Contenedores
- **Docker** - Contenedorización
- **Docker Compose** v3.8 - Orquestación de servicios

### Documentación
- **Swagger/OpenAPI** (@nestjs/swagger v11.2.1) - Documentación de API

### Otras Herramientas
- **ESLint** v9.18.0 - Linter de código
- **Prettier** v3.4.2 - Formateador de código
- **Rate Limiting** (@nestjs/throttler v6.4.0) - Control de tasa de peticiones

---

## Estructura del Proyecto

```
tecopos-backend-challenge/
├── docker-compose.yml              # Orquestación de servicios
├── package.json                    # Dependencias compartidas
├── .env                            # Variables de entorno
├── .env.example                    # Template de configuración
├── README.md                       # Este archivo
│
├── docker/                         # Configuraciones Docker
│
└── services/                       # Microservicios
    │
    ├── gateway/                    # 🚪 API Gateway
    │   └── gateway/
    │       ├── src/
    │       │   ├── main.ts         # Bootstrap del gateway
    │       │   ├── app.module.ts   # Módulo principal
    │       │   ├── auth/           # Autenticación JWT
    │       │   │   ├── guards/     # Guards de autenticación
    │       │   │   ├── strategies/ # JWT Strategy
    │       │   │   └── decorators/ # Decoradores personalizados
    │       │   ├── health/         # Health checks
    │       │   └── proxy/          # Controllers proxy
    │       │       ├── sso-proxy.controller.ts
    │       │       └── accounts-proxy.controller.ts
    │       ├── test/               # Tests E2E
    │       ├── Dockerfile.dev      # Dockerfile desarrollo
    │       └── package.json        # Dependencias
    │
    ├── sso/                        # SSO Service
    │   └── sso/
    │       ├── src/
    │       │   ├── main.ts         # Bootstrap del servicio
    │       │   ├── app.module.ts   # Módulo principal
    │       │   ├── auth/           # Autenticación
    │       │   │   ├── auth.controller.ts
    │       │   │   ├── auth.service.ts
    │       │   │   ├── auth.module.ts
    │       │   │   ├── dto/        # DTOs de auth
    │       │   │   └── strategies/ # Local & JWT strategies
    │       │   ├── users/          # Gestión de usuarios
    │       │   │   ├── users.controller.ts
    │       │   │   ├── users.service.ts
    │       │   │   ├── users.module.ts
    │       │   │   └── dto/        # DTOs de usuarios
    │       │   ├── database/       # Prisma setup
    │       │   │   ├── database.module.ts
    │       │   │   └── database.service.ts
    │       │   └── health/         # Health checks
    │       ├── prisma/
    │       │   ├── schema.prisma   # Modelo de datos
    │       │   └── migrations/     # Migraciones DB
    │       ├── test/               # Tests E2E
    │       ├── Dockerfile.dev      # Dockerfile desarrollo
    │       └── package.json        # Dependencias
    │
    └── accounts/                   # Accounts Service
        └── accounts/
            ├── src/
            │   ├── main.ts         # Bootstrap del servicio
            │   ├── app.module.ts   # Módulo principal
            │   ├── auth/           # Autenticación JWT
            │   │   ├── auth.module.ts
            │   │   ├── guards/     # JWT Guard
            │   │   ├── strategies/ # JWT Strategy
            │   │   ├── decorators/ # @CurrentUser
            │   │   └── interfaces/ # User interface
            │   ├── accounts/       # Gestión de cuentas
            │   │   ├── accounts.controller.ts
            │   │   ├── accounts.service.ts
            │   │   ├── accounts.module.ts
            │   │   └── dto/        # DTOs de cuentas
            │   ├── transactions/   # Gestión de transacciones
            │   │   ├── transactions.controller.ts
            │   │   ├── transactions.service.ts
            │   │   ├── transactions.module.ts
            │   │   └── dto/        # DTOs de transacciones
            │   ├── webhooks/       # Sistema de webhooks
            │   │   ├── webhooks.controller.ts
            │   │   ├── webhooks.service.ts
            │   │   ├── webhooks.module.ts
            │   │   └── dto/        # DTOs de webhooks
            │   ├── common/         # Utilidades compartidas
            │   │   ├── dto/        # DTOs comunes
            │   │   └── helpers/    # Funciones helper
            │   └── health/         # Health checks
            ├── test/               # Tests E2E
            │   ├── app.e2e-spec.ts
            │   └── full-flow.e2e-spec.ts
            ├── Dockerfile.dev      # Dockerfile desarrollo
            └── package.json        # Dependencias
```

---

## Requisitos Previos

- **Docker** >= 20.10
- **Docker Compose** >= 2.0
- **Node.js** >= 18.x (solo para desarrollo local sin Docker)
- **npm** >= 9.x (solo para desarrollo local sin Docker)

---

## Instalación

### 1. Clonar el Repositorio

```bash
git clone <repository-url>
cd tecopos-backend-challenge
```

### 2. Configurar Variables de Entorno

```bash
# Copiar el template de ejemplo
cp .env.example .env

# Editar el archivo .env con tus valores
nano .env  # o usa tu editor favorito
```

### 3. Configuración del Archivo `.env`

```bash
# Application
NODE_ENV=development

# Gateway Service
GATEWAY_PORT=3000
RATE_LIMIT_TTL=60        # Tiempo en segundos
RATE_LIMIT_MAX=10        # Máximo de peticiones

# SSO Service
SSO_PORT=3001
SSO_DB_NAME=tecopos_sso
SSO_DB_USER=tecopos_user
SSO_DB_PASSWORD=your_secure_password_here
SSO_DB_PORT=5432

# JWT Configuration
JWT_SECRET=your_super_secret_jwt_key_change_this
JWT_EXPIRES_IN=1h

# Accounts Service
ACCOUNTS_PORT=3002
MOCKAPI_URL=https://6914db823746c71fe049d9f3.mockapi.io/api/v1

# Webhooks
WEBHOOK_SECRET=your_webhook_secret_key
```

### 4. Instalar Dependencias (Opcional - Solo para desarrollo local)

```bash
# En el root del proyecto
npm install

# En cada microservicio
cd services/gateway/gateway && npm install
cd services/sso/sso && npm install
cd services/accounts/accounts && npm install
```

---

## 🏃 Ejecución

### Usando Docker Compose (Recomendado)

```bash
# Iniciar todos los servicios
docker-compose up -d

# Ver logs de todos los servicios
docker-compose logs -f

# Ver logs de un servicio específico
docker-compose logs -f gateway
docker-compose logs -f sso
docker-compose logs -f accounts

# Detener todos los servicios
docker-compose down

# Detener y eliminar volúmenes (incluye base de datos)
docker-compose down -v
```

### Ejecución Individual de Servicios (Desarrollo Local)

#### SSO Service

```bash
cd services/sso/sso

# Ejecutar migraciones de Prisma
npx prisma migrate dev

# Generar cliente de Prisma
npx prisma generate

# Iniciar en modo desarrollo
npm run start:dev
```

#### Accounts Service

```bash
cd services/accounts/accounts

# Iniciar en modo desarrollo
npm run start:dev
```

#### Gateway Service

```bash
cd services/gateway/gateway

# Iniciar en modo desarrollo
npm run start:dev
```

### Verificar que los Servicios Están Corriendo

```bash
# Health check del Gateway
curl http://localhost:3000/health

# Health check del SSO
curl http://localhost:3001/health

# Health check del Accounts
curl http://localhost:3002/health
```

---

## Testing

### Tests Unitarios

```bash
# SSO Service
cd services/sso/sso
npm test                  # Ejecutar todos los tests
npm run test:watch        # Modo watch
npm run test:cov          # Con cobertura

# Accounts Service
cd services/accounts/accounts
npm test                  # 29 tests unitarios
npm run test:watch
npm run test:cov

# Gateway Service
cd services/gateway/gateway
npm test
npm run test:watch
npm run test:cov
```

### Tests E2E (End-to-End)

```bash
# SSO Service E2E
cd services/sso/sso
npm run test:e2e

# Accounts Service E2E (Full Flow)
cd services/accounts/accounts
npm run test:e2e

# Gateway Service E2E
cd services/gateway/gateway
npm run test:e2e
```

### Resultados de Tests - Accounts Service

```
   Tests Unitarios: 29 passing
  - AccountsService: 8 tests
  - TransactionsService: 9 tests
  - WebhooksService: 12 tests

    Tests E2E: 18 passing, 3 skipped
  - Health Check: 1/1 ✓
  - Accounts Flow: 3/3 ✓
  - Transactions Flow: 3/6 ✓ (3 skipped - limitaciones MockAPI POST)
  - Webhooks Flow: 5/5 ✓
  - Validation Tests: 3/3 ✓
  - Integration Tests: 0/1 (1 skipped - limitaciones MockAPI POST)
  - Error Handling: 3/3 ✓
```

**Nota sobre tests skipped**: 3 tests E2E están marcados como `skipped` porque MockAPI no soporta operaciones POST para crear transacciones (servicio externo de solo lectura).

---

## API Endpoints

### SSO Service (Puerto 3001)

#### Autenticación

```bash
# Registro de usuario
POST /auth/register
Content-Type: application/json

{
  "username": "johndoe",
  "email": "john@example.com",
  "password": "SecurePass123!"
}

# Login
POST /auth/login
Content-Type: application/json

{
  "usernameOrEmail": "johndoe",
  "password": "SecurePass123!"
}
# Respuesta: { "accessToken": "...", "refreshToken": "..." }

# Refresh Token
POST /auth/refresh
Content-Type: application/json

{
  "refreshToken": "your_refresh_token"
}

# Logout
POST /auth/logout
Authorization: Bearer <token>
Content-Type: application/json

{
  "refreshToken": "your_refresh_token"
}
```

#### Usuarios

```bash
# Obtener perfil del usuario actual
GET /users/me
Authorization: Bearer <token>

# Listar todos los usuarios (admin)
GET /users
Authorization: Bearer <token>

# Obtener usuario por ID
GET /users/:id
Authorization: Bearer <token>

# Actualizar usuario
PATCH /users/:id
Authorization: Bearer <token>
Content-Type: application/json

{
  "email": "newemail@example.com"
}

# Eliminar usuario
DELETE /users/:id
Authorization: Bearer <token>
```

### Accounts Service (Puerto 3002)

#### Cuentas

```bash
# Listar cuentas
GET /accounts
Authorization: Bearer <token>

# Obtener cuenta por ID
GET /accounts/:id
Authorization: Bearer <token>

# Obtener balance de cuenta
GET /accounts/:id/balance
Authorization: Bearer <token>
```

#### Transacciones

```bash
# Crear transacción (deposit/withdrawal)
POST /transactions
Authorization: Bearer <token>
Content-Type: application/json

{
  "accountId": "1",
  "amount": 100.50,
  "type": "deposit",
  "currency": "USD",
  "description": "Depósito inicial"
}

# Obtener transacción por ID
GET /transactions/:id
Authorization: Bearer <token>

# Listar transacciones con paginación
GET /transactions?page=1&limit=10&accountId=1
Authorization: Bearer <token>
```

#### Webhooks

```bash
# Suscribirse a webhooks
POST /webhooks/subscribe
Authorization: Bearer <token>
Content-Type: application/json

{
  "url": "https://your-domain.com/webhook",
  "events": ["transaction.created", "account.updated"],
  "secret": "your_webhook_secret"
}

# Listar webhooks del usuario
GET /webhooks
Authorization: Bearer <token>

# Cancelar suscripción
DELETE /webhooks/:id
Authorization: Bearer <token>
```

### Gateway (Puerto 3000)

El Gateway actúa como proxy y expone todos los endpoints anteriores de forma unificada:

```bash
# Formato de endpoints del Gateway
http://localhost:3000/sso/*        → Redirige a SSO Service
http://localhost:3000/accounts/*   → Redirige a Accounts Service
http://localhost:3000/health       → Health check del Gateway
```

**Ejemplo de uso a través del Gateway:**

```bash
# Registro a través del Gateway
POST http://localhost:3000/sso/auth/register

# Login a través del Gateway
POST http://localhost:3000/sso/auth/login

# Obtener cuentas a través del Gateway
GET http://localhost:3000/accounts
Authorization: Bearer <token>

# Crear transacción a través del Gateway
POST http://localhost:3000/accounts/transactions
Authorization: Bearer <token>
```

### Documentación Interactiva (Swagger)

Una vez que los servicios estén corriendo, puedes acceder a la documentación interactiva:

- **Gateway**: http://localhost:3000/api
- **SSO Service**: http://localhost:3001/api
- **Accounts Service**: http://localhost:3002/api

---

## Características Implementadas

### Funcionalidades Core

- [x] **Arquitectura de Microservicios** con comunicación HTTP
- [x] **API Gateway** con proxy inteligente a servicios
- [x] **Autenticación JWT** con refresh tokens
- [x] **Sistema SSO** completo (registro, login, logout)
- [x] **Gestión de Usuarios** con CRUD completo
- [x] **Base de datos PostgreSQL** con Prisma ORM
- [x] **Gestión de Cuentas** con integración a MockAPI
- [x] **Sistema de Transacciones** con validaciones
- [x] **Sistema de Webhooks** para notificaciones
- [x] **Health Checks** en todos los servicios
- [x] **Dockerización** completa con Docker Compose

### Seguridad

- [x] **JWT Authentication** con guards de NestJS
- [x] **Password Hashing** con bcrypt
- [x] **Helmet** para headers de seguridad
- [x] **CORS** configurado
- [x] **Rate Limiting** en Gateway
- [x] **Input Validation** con class-validator
- [x] **Environment Variables** para configuración sensible

### Validaciones

- [x] **DTOs con class-validator** en todos los endpoints
- [x] **Validación de códigos de moneda ISO 4217**
- [x] **Validación de rangos de montos** (0.01 - 1,000,000)
- [x] **Validación de longitud de descripciones**
- [x] **Validación de URLs** en webhooks
- [x] **Validación de eventos** en webhooks
- [x] **Validación de tipos de transacciones**

### Testing

- [x] **Tests Unitarios** para todos los servicios
- [x] **Tests E2E** para flujos completos
- [x] **Mocks de servicios externos** (MockAPI)
- [x] **Coverage reports** con Jest
- [x] **Tests de validación** de DTOs
- [x] **Tests de autenticación** y autorización

### DevOps

- [x] **Dockerfile multi-stage** para desarrollo
- [x] **Docker Compose** con healthchecks
- [x] **Hot Reload** en modo desarrollo
- [x] **Variables de entorno** configurables
- [x] **Logs estructurados**
- [x] **Restart policies** en contenedores

### Documentación

- [x] **Swagger/OpenAPI** en todos los servicios
- [x] **DTOs documentados** con decoradores
- [x] **README completo** con ejemplos
- [x] **Comentarios en código**
- [x] **Ejemplos de uso** de API

---

##  Notas Importantes

### MockAPI Limitations

El servicio **Accounts** utiliza MockAPI (https://mockapi.io) para simular datos de cuentas y transacciones. Esta API externa tiene las siguientes limitaciones:

- **Operaciones GET**: Funcionan correctamente
- **Operaciones POST**: No soportadas para transacciones (solo lectura)
- Por esta razón, 3 tests E2E están marcados como `skipped`

**Tests afectados:**
1. `POST /transactions should create a deposit transaction`
2. `GET /transactions should return transactions with pagination`
3. Integration test `should create transaction and trigger webhook notification`

**Solución futura**: Implementar base de datos propia para transacciones o usar MockAPI con permisos de escritura.

### Webhooks Testing

Los webhooks se almacenan en memoria (in-memory storage). Para testing real de webhooks, puedes usar servicios como:

- **webhook.site** - Para recibir webhooks de prueba
- **ngrok** - Para exponer tu servidor local
- **requestbin** - Para inspeccionar webhooks

Ejemplo de webhook payload:

```json
{
  "event": "transaction.created",
  "timestamp": "2025-11-14T04:00:00.000Z",
  "data": {
    "transactionId": "123",
    "accountId": "1",
    "amount": 100.50,
    "type": "deposit",
    "currency": "USD"
  }
}
```

### Rate Limiting

El Gateway implementa rate limiting con la siguiente configuración por defecto:

- **TTL**: 60 segundos
- **Max Requests**: 10 peticiones por TTL
- Configurable vía variables de entorno `RATE_LIMIT_TTL` y `RATE_LIMIT_MAX`

### Prisma Migrations

Si necesitas crear o modificar la base de datos:

```bash
cd services/sso/sso

# Crear una nueva migración
npx prisma migrate dev --name nombre_migracion

# Aplicar migraciones
npx prisma migrate deploy

# Ver el estado de migraciones
npx prisma migrate status

# Abrir Prisma Studio (UI para explorar la DB)
npx prisma studio
```

### Hot Reload en Docker

Los Dockerfiles de desarrollo (`Dockerfile.dev`) están configurados con volúmenes para habilitar hot reload:

```yaml
volumes:
  - ./services/accounts/accounts/src:/app/src
```

Cualquier cambio en el código fuente se reflejará automáticamente sin necesidad de reconstruir el contenedor.

---

## Comandos Útiles

### Docker

```bash
# Reconstruir servicios después de cambios en package.json
docker-compose up -d --build

# Ver estado de servicios
docker-compose ps

# Ejecutar comando en contenedor
docker-compose exec sso sh
docker-compose exec accounts sh
docker-compose exec gateway sh

# Ver logs en tiempo real
docker-compose logs -f --tail=100

# Limpiar todo (contenedores, volúmenes, redes)
docker-compose down -v --remove-orphans
docker system prune -a
```

### Base de Datos

```bash
# Conectarse a PostgreSQL
docker-compose exec postgres-sso psql -U tecopos_user -d tecopos_sso

# Backup de base de datos
docker-compose exec postgres-sso pg_dump -U tecopos_user tecopos_sso > backup.sql

# Restaurar base de datos
docker-compose exec -T postgres-sso psql -U tecopos_user tecopos_sso < backup.sql
```

### Testing Específico

```bash
# Ejecutar un test específico
cd services/accounts/accounts
npm test -- accounts.service.spec.ts

# Ejecutar test E2E específico
npm run test:e2e -- full-flow.e2e-spec.ts

# Ver cobertura de código
npm run test:cov
open coverage/lcov-report/index.html
```

---

## 🚀 Despliegue en Producción

### Render.com (Recomendado)

El proyecto incluye un archivo `render.yaml` para despliegue automático en Render.com.

#### Despliegue Rápido

1. **Fork/Clone** este repositorio en tu cuenta de GitHub
2. Ve a [Render Dashboard](https://dashboard.render.com)
3. Click en **"New +"** → **"Blueprint"**
4. Conecta tu repositorio
5. Click en **"Apply"** - Render desplegará automáticamente:
   - ✅ PostgreSQL Database
   - ✅ SSO Service
   - ✅ Accounts Service
   - ✅ Gateway Service

#### URLs de Producción

Después del despliegue, tus servicios estarán disponibles en:

- **Gateway**: `https://tecopos-gateway.onrender.com`
- **SSO**: `https://tecopos-sso.onrender.com`
- **Accounts**: `https://tecopos-accounts.onrender.com`

#### Configuración Manual

Si prefieres configurar cada servicio individualmente, consulta la guía completa en:

📖 **[DEPLOYMENT.md](./DEPLOYMENT.md)** - Guía detallada de despliegue en Render

La guía incluye:
- Despliegue paso a paso de cada servicio
- Configuración de variables de entorno
- Configuración de base de datos PostgreSQL
- Pruebas del sistema desplegado
- Troubleshooting de problemas comunes
- Optimizaciones para producción

#### Verificar Despliegue

```bash
# Health checks
curl https://tecopos-gateway.onrender.com/health
curl https://tecopos-sso.onrender.com/health
curl https://tecopos-accounts.onrender.com/health

# Prueba de registro
curl -X POST https://tecopos-gateway.onrender.com/sso/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "username": "testuser",
    "email": "test@example.com",
    "password": "SecurePass123!"
  }'
```

#### Notas Importantes

- ⚠️ El **plan gratuito** de Render duerme los servicios después de 15 minutos de inactividad
- ⚠️ Primera petición después de dormir puede tardar ~30 segundos
- 💡 Para producción real, considera el **plan Starter ($7/mes por servicio)**
- 🔒 Las variables `JWT_SECRET` y `WEBHOOK_SECRET` se generan automáticamente

### Otras Plataformas

El proyecto también puede desplegarse en:

- **Railway**: Similar a Render, usa los Dockerfiles incluidos
- **Fly.io**: Soporta Docker multi-service
- **AWS ECS/Fargate**: Para despliegues enterprise
- **Google Cloud Run**: Despliegue de contenedores serverless
- **Azure Container Instances**: Alternativa de Microsoft

Para estas plataformas, usa los Dockerfiles de producción ubicados en cada servicio.

---

## Troubleshooting

### Puerto ya en uso

```bash
# Verificar qué proceso usa el puerto
lsof -i :3000
lsof -i :3001
lsof -i :3002

# Matar proceso en puerto específico
kill -9 $(lsof -t -i:3000)
```

### Prisma Client no generado

```bash
cd services/sso/sso
npx prisma generate
```

### Docker Compose no levanta servicios

```bash
# Ver logs detallados
docker-compose logs

# Recrear contenedores desde cero
docker-compose down -v
docker-compose up -d --build --force-recreate
```

### Tests E2E fallan

```bash
# Asegurarse de que los servicios estén corriendo
docker-compose ps

# Verificar conectividad con MockAPI
curl https://6914db823746c71fe049d9f3.mockapi.io/api/v1/accounts

# Limpiar módulos y reinstalar
rm -rf node_modules package-lock.json
npm install
```

---

## Soporte y Contacto

Para preguntas, problemas o sugerencias:

- **Issues**: [GitHub Issues](https://github.com/tu-usuario/tecopos-backend-challenge/issues)
- **Email**: tu-email@example.com

---

## Licencia

Este proyecto está bajo la licencia **UNLICENSED** - ver el archivo LICENSE para más detalles.

---

## Agradecimientos

- **NestJS Team** - Por el excelente framework
- **Prisma Team** - Por el mejor ORM de TypeScript
- **MockAPI** - Por el servicio de API mock gratuito

---

**Desarrollado con usando NestJS y TypeScript**

