#!/bin/bash
# ============================================================
# Lab Forms HSA — Setup inicial
# Corré este script UNA SOLA VEZ para configurar el proyecto
# ============================================================

set -e

echo "🏥 Lab Forms HSA — Setup"
echo "========================="

# 1. Limpiar git incompleto si existe
if [ -d ".git" ]; then
  echo "⚠️  Limpiando repositorio git previo..."
  rm -rf .git
fi

# 2. Init git
echo "📦 Inicializando repositorio git..."
git init
git branch -m main
git add .
git commit -m "feat: initial commit — Lab Forms HSA"

# 3. Instalar dependencias
echo "📥 Instalando dependencias (npm install)..."
npm install

# 4. Crear .env.local
if [ ! -f ".env.local" ]; then
  cp .env.local.example .env.local
  echo ""
  echo "📝 Archivo .env.local creado."
  echo "   → Completá las variables de Supabase en .env.local antes de correr npm run dev"
fi

echo ""
echo "✅ Setup completo! Próximos pasos:"
echo ""
echo "  1. Ir a supabase.com y crear un proyecto gratuito"
echo "  2. En SQL Editor, correr el contenido de lib/schema.sql"
echo "  3. Copiar la URL y anon key a .env.local"
echo "  4. npm run dev → http://localhost:3000"
echo ""
echo "  Para deploy en Vercel:"
echo "  npx vercel --prod"
echo ""
