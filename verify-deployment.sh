#!/bin/bash

# ======================================
# TECOPOS BACKEND CHALLENGE
# Script de Verificación de Despliegue
# ======================================

set -e

# Colores para output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# URLs de los servicios (ajusta según tu despliegue)
GATEWAY_URL="${GATEWAY_URL:-https://tecopos-gateway.onrender.com}"
SSO_URL="${SSO_URL:-https://tecopos-sso.onrender.com}"
ACCOUNTS_URL="${ACCOUNTS_URL:-https://tecopos-accounts.onrender.com}"

echo -e "${BLUE}======================================${NC}"
echo -e "${BLUE}TecoPOS Backend - Verificación de Despliegue${NC}"
echo -e "${BLUE}======================================${NC}\n"

# Función para verificar health check
check_health() {
    local service_name=$1
    local url=$2
    
    echo -e "${YELLOW}Verificando $service_name...${NC}"
    
    response=$(curl -s -o /dev/null -w "%{http_code}" "$url/health" || echo "000")
    
    if [ "$response" = "200" ]; then
        echo -e "${GREEN}✓ $service_name está funcionando correctamente${NC}\n"
        return 0
    else
        echo -e "${RED}✗ $service_name no responde (HTTP $response)${NC}\n"
        return 1
    fi
}

# Función para registrar usuario de prueba
register_test_user() {
    echo -e "${YELLOW}Registrando usuario de prueba...${NC}"
    
    response=$(curl -s -X POST "$GATEWAY_URL/sso/auth/register" \
        -H "Content-Type: application/json" \
        -d '{
            "username": "testuser_'$(date +%s)'",
            "email": "test'$(date +%s)'@example.com",
            "password": "SecurePass123!"
        }')
    
    if echo "$response" | grep -q "id"; then
        echo -e "${GREEN}✓ Usuario registrado exitosamente${NC}"
        echo -e "Response: $response\n"
        return 0
    else
        echo -e "${RED}✗ Error al registrar usuario${NC}"
        echo -e "Response: $response\n"
        return 1
    fi
}

# Función para hacer login
login_test() {
    echo -e "${YELLOW}Probando login...${NC}"
    
    # Primero registrar usuario
    username="testuser_"$(date +%s)
    email="test"$(date +%s)"@example.com"
    password="SecurePass123!"
    
    register_response=$(curl -s -X POST "$GATEWAY_URL/sso/auth/register" \
        -H "Content-Type: application/json" \
        -d "{
            \"username\": \"$username\",
            \"email\": \"$email\",
            \"password\": \"$password\"
        }")
    
    # Luego hacer login
    login_response=$(curl -s -X POST "$GATEWAY_URL/sso/auth/login" \
        -H "Content-Type: application/json" \
        -d "{
            \"usernameOrEmail\": \"$username\",
            \"password\": \"$password\"
        }")
    
    if echo "$login_response" | grep -q "accessToken"; then
        echo -e "${GREEN}✓ Login exitoso${NC}"
        ACCESS_TOKEN=$(echo "$login_response" | grep -o '"accessToken":"[^"]*"' | cut -d'"' -f4)
        echo -e "Access Token: ${ACCESS_TOKEN:0:50}...\n"
        return 0
    else
        echo -e "${RED}✗ Error al hacer login${NC}"
        echo -e "Response: $login_response\n"
        return 1
    fi
}

# Función para obtener cuentas
get_accounts() {
    local token=$1
    
    echo -e "${YELLOW}Obteniendo cuentas...${NC}"
    
    response=$(curl -s -X GET "$GATEWAY_URL/accounts" \
        -H "Authorization: Bearer $token")
    
    if echo "$response" | grep -q "id"; then
        echo -e "${GREEN}✓ Cuentas obtenidas exitosamente${NC}"
        echo -e "Response: $response\n"
        return 0
    else
        echo -e "${RED}✗ Error al obtener cuentas${NC}"
        echo -e "Response: $response\n"
        return 1
    fi
}

# Ejecutar verificaciones
echo -e "${BLUE}1. Health Checks${NC}\n"
gateway_ok=0
sso_ok=0
accounts_ok=0

check_health "Gateway" "$GATEWAY_URL" && gateway_ok=1
check_health "SSO Service" "$SSO_URL" && sso_ok=1
check_health "Accounts Service" "$ACCOUNTS_URL" && accounts_ok=1

# Verificar si todos los servicios están funcionando
if [ $gateway_ok -eq 1 ] && [ $sso_ok -eq 1 ] && [ $accounts_ok -eq 1 ]; then
    echo -e "${GREEN}✓ Todos los servicios están funcionando${NC}\n"
else
    echo -e "${RED}✗ Algunos servicios no están respondiendo${NC}"
    echo -e "${YELLOW}Posibles causas:${NC}"
    echo -e "  - Los servicios están 'dormidos' (plan gratuito de Render)"
    echo -e "  - Espera 30-60 segundos e intenta de nuevo"
    echo -e "  - Verifica los logs en Render Dashboard${NC}\n"
    exit 1
fi

# Pruebas funcionales
echo -e "${BLUE}2. Pruebas Funcionales${NC}\n"

# Registro
register_test_user

# Login y obtener token
login_test

# Si tenemos token, probar endpoints protegidos
if [ ! -z "$ACCESS_TOKEN" ]; then
    get_accounts "$ACCESS_TOKEN"
fi

# Resumen final
echo -e "${BLUE}======================================${NC}"
echo -e "${BLUE}Resumen de Verificación${NC}"
echo -e "${BLUE}======================================${NC}"
echo -e "${GREEN}✓ Gateway: Funcionando${NC}"
echo -e "${GREEN}✓ SSO Service: Funcionando${NC}"
echo -e "${GREEN}✓ Accounts Service: Funcionando${NC}"
echo -e "${GREEN}✓ Autenticación: Funcionando${NC}"
echo -e "${GREEN}✓ API Endpoints: Funcionando${NC}\n"

echo -e "${GREEN}¡El sistema está completamente operativo!${NC}\n"

echo -e "${YELLOW}URLs de tus servicios:${NC}"
echo -e "  Gateway:  $GATEWAY_URL"
echo -e "  SSO:      $SSO_URL"
echo -e "  Accounts: $ACCOUNTS_URL\n"

echo -e "${YELLOW}Siguiente paso:${NC}"
echo -e "  - Conecta tu frontend a: $GATEWAY_URL"
echo -e "  - Revisa la documentación completa en README.md"
echo -e "  - Consulta DEPLOYMENT.md para más detalles\n"
