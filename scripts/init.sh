#!/bin/bash

# Script de inicialización del proyecto
# Este script verifica requisitos y prepara el entorno de desarrollo

set -e

echo "🚀 Iniciando setup del proyecto..."
echo ""

# Colores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Verificar Node.js
echo "📦 Verificando Node.js..."
if ! command -v node &> /dev/null; then
    echo -e "${RED}❌ Node.js no está instalado${NC}"
    echo "Por favor instala Node.js 18+ desde https://nodejs.org"
    exit 1
fi

NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 18 ]; then
    echo -e "${RED}❌ Node.js versión 18+ requerida (actual: $(node -v))${NC}"
    exit 1
fi
echo -e "${GREEN}✅ Node.js $(node -v)${NC}"

# Verificar npm
echo "📦 Verificando npm..."
if ! command -v npm &> /dev/null; then
    echo -e "${RED}❌ npm no está instalado${NC}"
    exit 1
fi
echo -e "${GREEN}✅ npm $(npm -v)${NC}"

# Verificar Docker
echo "🐳 Verificando Docker..."
if ! command -v docker &> /dev/null; then
    echo -e "${YELLOW}⚠️  Docker no está instalado${NC}"
    echo "Docker es necesario para ejecutar PostgreSQL y Redis"
    echo "Instala Docker desde https://docs.docker.com/get-docker/"
    exit 1
fi
echo -e "${GREEN}✅ Docker $(docker --version | cut -d' ' -f3)${NC}"

# Verificar Docker Compose
echo "🐳 Verificando Docker Compose..."
if ! command -v docker-compose &> /dev/null && ! docker compose version &> /dev/null; then
    echo -e "${YELLOW}⚠️  Docker Compose no está instalado${NC}"
    exit 1
fi
echo -e "${GREEN}✅ Docker Compose instalado${NC}"

# Instalar dependencias
echo ""
echo "📥 Instalando dependencias de npm..."
npm install

# Verificar archivo .env
echo ""
echo "⚙️  Verificando configuración..."
if [ ! -f .env.local ]; then
    echo -e "${YELLOW}⚠️  Archivo .env.local no encontrado${NC}"
    echo "Copiando .env.example a .env.local..."
    cp .env.example .env.local
    echo -e "${GREEN}✅ Archivo .env.local creado${NC}"
    echo -e "${YELLOW}⚠️  Por favor configura las variables de entorno en .env.local${NC}"
else
    echo -e "${GREEN}✅ Archivo .env.local existe${NC}"
fi

# Levantar contenedores Docker
echo ""
echo "🐳 Levantando contenedores Docker (PostgreSQL y Redis)..."
docker-compose up -d

# Esperar a que PostgreSQL esté listo
echo "⏳ Esperando a que PostgreSQL esté listo..."
sleep 5

# Generar Prisma Client
echo ""
echo "🔧 Generando Prisma Client..."
npm run db:generate

# Ejecutar migraciones
echo ""
echo "🗄️  Ejecutando migraciones de base de datos..."
npm run db:migrate

# Ejecutar seed
echo ""
echo "🌱 Poblando base de datos con datos iniciales..."
npm run db:seed

# Mensaje final
echo ""
echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}✅ ¡Setup completado exitosamente!${NC}"
echo -e "${GREEN}========================================${NC}"
echo ""
echo "Próximos pasos:"
echo "1. Revisa y configura las variables en .env.local"
echo "2. Ejecuta: npm run dev"
echo "3. Abre http://localhost:3000 en tu navegador"
echo ""
echo "Credenciales de prueba:"
echo "  Email: admin@nutriologo.com"
echo "  Password: admin123"
echo ""
echo -e "${YELLOW}⚠️  Recuerda cambiar las credenciales en producción${NC}"
echo ""
