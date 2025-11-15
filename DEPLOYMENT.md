# Guía de Despliegue en Render

Esta guía te ayudará a desplegar el sistema completo de TecoPOS Backend Challenge en Render.com.

## Requisitos Previos

1. **Cuenta en Render**: Crea una cuenta gratuita en [render.com](https://render.com)
2. **Repositorio Git**: Tu código debe estar en un repositorio de GitHub, GitLab o Bitbucket
3. **Variables de Entorno**: Revisa el archivo `.env.example` para conocer las variables necesarias

## Arquitectura de Despliegue

El sistema se despliega con los siguientes componentes:

```
┌─────────────────────────────────────────────────────────┐
│                  RENDER PLATFORM                         │
├─────────────────────────────────────────────────────────┤
│                                                          │
│  ┌──────────────┐      ┌──────────────┐               │
│  │   Gateway    │─────►│ SSO Service  │               │
│  │  (Web Svc)   │      │  (Web Svc)   │               │
│  └──────┬───────┘      └──────┬───────┘               │
│         │                     │                         │
│         │              ┌──────▼───────┐                │
│         │              │  PostgreSQL  │                │
│         │              │  (Database)  │                │
│         │              └──────────────┘                │
│         │                                               │
│         ▼                                               │
│  ┌──────────────┐                                      │
│  │   Accounts   │                                      │
│  │  (Web Svc)   │───► MockAPI (Externo)               │
│  └──────────────┘                                      │
│                                                          │
└─────────────────────────────────────────────────────────┘
```

## Método 1: Despliegue Automático con Blueprint

### Paso 1: Conectar Repositorio

1. Ve a [Render Dashboard](https://dashboard.render.com)
2. Click en **"New +"** → **"Blueprint"**
3. Conecta tu repositorio de GitHub/GitLab/Bitbucket
4. Selecciona el repositorio `tecopos-backend-challenge`

### Paso 2: Render Detectará Automáticamente

Render leerá el archivo `render.yaml` y configurará:
- Base de datos PostgreSQL
- Gateway Service
- SSO Service
- Accounts Service
- Variables de entorno
- Health checks

### Paso 3: Configurar Variables de Entorno (Opcional)

Render generará automáticamente las variables secretas (`JWT_SECRET`, `WEBHOOK_SECRET`), pero puedes personalizarlas:

1. Ve a cada servicio en el Dashboard
2. Click en **"Environment"**
3. Edita las variables si es necesario:
   - `MOCKAPI_URL`: Puedes usar tu propia MockAPI
   - `RATE_LIMIT_MAX`: Ajustar límite de peticiones
   - `JWT_EXPIRES_IN`: Tiempo de expiración del token

### Paso 4: Desplegar

1. Click en **"Apply"** o **"Create Blueprint"**
2. Render comenzará a construir y desplegar los servicios
3. Espera 5-10 minutos para el despliegue inicial

### Paso 5: Verificar Despliegue

Una vez que todos los servicios estén en estado **"Live"**:

```bash
# Health check del Gateway
curl https://tecopos-gateway.onrender.com/health

# Health check del SSO
curl https://tecopos-sso.onrender.com/health

# Health check del Accounts
curl https://tecopos-accounts.onrender.com/health
```

## Método 2: Despliegue Manual

Si prefieres más control, puedes desplegar cada servicio manualmente:

### 1. Crear Base de Datos PostgreSQL

1. En Render Dashboard, click **"New +"** → **"PostgreSQL"**
2. Configuración:
   - **Name**: `tecopos-postgres-sso`
   - **Database**: `tecopos_sso`
   - **User**: `tecopos_user`
   - **Region**: Oregon (o tu preferencia)
   - **Plan**: Free
3. Click **"Create Database"**
4. Guarda la **Internal Database URL** (la usarás en el SSO Service)

### 2. Desplegar SSO Service

1. Click **"New +"** → **"Web Service"**
2. Conecta tu repositorio
3. Configuración:
   - **Name**: `tecopos-sso`
   - **Runtime**: Docker
   - **Branch**: `main` (o `develop`)
   - **Root Directory**: `services/sso/sso`
   - **Dockerfile Path**: `./Dockerfile`
   - **Plan**: Free
4. Variables de entorno:
   ```
   NODE_ENV=production
   PORT=3001
   DATABASE_URL=<Internal Database URL de PostgreSQL>
   JWT_SECRET=<genera_un_secret_fuerte>
   JWT_EXPIRES_IN=1h
   ```
5. Build Command: `npx prisma generate && npm run build`
6. Start Command: `npx prisma migrate deploy && node dist/src/main`
7. Health Check Path: `/health`
8. Click **"Create Web Service"**

### 3. Desplegar Accounts Service

1. Click **"New +"** → **"Web Service"**
2. Conecta tu repositorio
3. Configuración:
   - **Name**: `tecopos-accounts`
   - **Runtime**: Docker
   - **Branch**: `main`
   - **Root Directory**: `services/accounts/accounts`
   - **Dockerfile Path**: `./Dockerfile`
   - **Plan**: Free
4. Variables de entorno:
   ```
   NODE_ENV=production
   PORT=3002
   SSO_SERVICE_URL=https://tecopos-sso.onrender.com
   MOCKAPI_URL=https://6914db823746c71fe049d9f3.mockapi.io/api/v1
   JWT_SECRET=<mismo_secret_que_SSO>
   WEBHOOK_SECRET=<genera_otro_secret_fuerte>
   ```
5. Health Check Path: `/health`
6. Click **"Create Web Service"**

### 4. Desplegar Gateway

1. Click **"New +"** → **"Web Service"**
2. Conecta tu repositorio
3. Configuración:
   - **Name**: `tecopos-gateway`
   - **Runtime**: Docker
   - **Branch**: `main`
   - **Root Directory**: `services/gateway/gateway`
   - **Dockerfile Path**: `./Dockerfile`
   - **Plan**: Free
4. Variables de entorno:
   ```
   NODE_ENV=production
   PORT=3000
   SSO_SERVICE_URL=https://tecopos-sso.onrender.com
   ACCOUNTS_SERVICE_URL=https://tecopos-accounts.onrender.com
   RATE_LIMIT_TTL=60
   RATE_LIMIT_MAX=100
   JWT_SECRET=<mismo_secret_que_SSO>
   ```
5. Health Check Path: `/health`
6. Click **"Create Web Service"**

## URLs de los Servicios

Después del despliegue, tus servicios estarán disponibles en:

- **Gateway**: `https://tecopos-gateway.onrender.com`
- **SSO**: `https://tecopos-sso.onrender.com`
- **Accounts**: `https://tecopos-accounts.onrender.com`
- **Database**: Internal URL (solo accesible entre servicios)

## Probar el Despliegue

### 1. Registrar un Usuario

```bash
curl -X POST https://tecopos-gateway.onrender.com/sso/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "username": "testuser",
    "email": "test@example.com",
    "password": "SecurePass123!"
  }'
```

### 2. Login

```bash
curl -X POST https://tecopos-gateway.onrender.com/sso/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "usernameOrEmail": "testuser",
    "password": "SecurePass123!"
  }'
```

Respuesta:
```json
{
  "accessToken": "eyJhbGc...",
  "refreshToken": "eyJhbGc..."
}
```

### 3. Obtener Cuentas

```bash
TOKEN="<tu_access_token>"

curl -X GET https://tecopos-gateway.onrender.com/accounts \
  -H "Authorization: Bearer $TOKEN"
```

### 4. Crear Transacción

```bash
curl -X POST https://tecopos-gateway.onrender.com/accounts/transactions \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "accountId": "1",
    "type": "deposit",
    "amount": 100.50,
    "currency": "USD",
    "description": "Test deposit"
  }'
```

## Monitoreo y Logs

### Ver Logs en Render

1. Ve a tu servicio en el Dashboard
2. Click en la pestaña **"Logs"**
3. Logs en tiempo real de tu aplicación

### Métricas

Render proporciona métricas automáticas:
- CPU Usage
- Memory Usage
- HTTP Response Times
- Request Count

## ⚡ Optimizaciones para Producción

### 1. Upgrade a Plan Paid (Opcional)

El plan gratuito tiene limitaciones:
- Los servicios se duermen después de 15 min de inactividad
- 750 horas de ejecución/mes (compartidas entre servicios)
- Build time limitado

**Recomendación**: Para producción real, considera el plan **Starter ($7/mes por servicio)**

### 2. Configurar Custom Domain

1. Ve a tu servicio Gateway
2. Click en **"Settings"** → **"Custom Domains"**
3. Añade tu dominio: `api.tudominio.com`
4. Configura el DNS según las instrucciones

### 3. Habilitar Auto-Deploy

Por defecto, Render hace auto-deploy en cada push a la rama configurada:
- Push a `main` → Deploy automático
- Rollback automático si el health check falla

### 4. Configurar Redis (Opcional)

Para mejorar performance de rate limiting:

1. Añade un servicio Redis en Render
2. Actualiza Gateway para usar Redis en lugar de memoria

## Seguridad en Producción

### Variables de Entorno Secretas

**NUNCA** commits los valores reales de:
- `JWT_SECRET`
- `WEBHOOK_SECRET`
- `DATABASE_URL`
- `SSO_DB_PASSWORD`

Usa las variables generadas automáticamente por Render o configúralas en el Dashboard.

### CORS Configuration

Actualiza la configuración de CORS en el Gateway para tu dominio:

```typescript
// services/gateway/gateway/src/main.ts
app.enableCors({
  origin: ['https://tuapp.com', 'https://www.tuapp.com'],
  credentials: true,
});
```

### Rate Limiting

Ajusta los límites según tu caso de uso:
- `RATE_LIMIT_MAX=100` (100 requests por minuto)
- `RATE_LIMIT_TTL=60` (ventana de 60 segundos)

## Troubleshooting

### Servicio no inicia

1. **Revisa los logs**: Dashboard → Service → Logs
2. **Verifica variables de entorno**: Todas las requeridas están configuradas?
3. **Health check falla**: Verifica la ruta `/health` en cada servicio

### Base de datos no conecta

1. **DATABASE_URL correcta**: Debe ser la Internal URL
2. **Migraciones**: Verifica que `prisma migrate deploy` se ejecutó
3. **Prisma Client**: Verifica que `prisma generate` se ejecutó en build

### Gateway no encuentra servicios

1. **SSO_SERVICE_URL**: Debe ser `https://tecopos-sso.onrender.com`
2. **ACCOUNTS_SERVICE_URL**: Debe ser `https://tecopos-accounts.onrender.com`
3. **Networking**: Los servicios en Render pueden comunicarse por HTTPS

### Servicio se duerme (Free Plan)

**Solución temporal**: Usa un servicio de "keep-alive":
- [UptimeRobot](https://uptimerobot.com) (gratis)
- Cron job que haga ping cada 10 minutos

**Solución permanente**: Upgrade a plan Starter

## 📞 Soporte

- **Render Docs**: https://render.com/docs
- **Render Community**: https://community.render.com
- **Status Page**: https://status.render.com

## ¡Listo!

Tu sistema TecoPOS Backend está desplegado en producción. Puedes comenzar a:
- Conectar tu frontend
- Configurar webhooks reales
- Monitorear el performance
- Escalar según necesidad

---

**Nota**: Este despliegue usa el plan gratuito de Render. Para aplicaciones en producción con tráfico real, considera upgradar a un plan de pago.
