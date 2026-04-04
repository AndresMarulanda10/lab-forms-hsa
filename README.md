# Lab Forms HSA

Sistema de registros de laboratorio para la **E.S.E. Hospital San Antonio de Chía**.

## Módulos

- **F-021 Termohigrometría**: Registro mensual de temperatura y humedad ambiental por jornada (M/T/N)
- **F-029 Neveras (Cadena de Frío)**: Control de temperatura de neveras por jornada, con gestión de múltiples unidades

## Stack

- **Next.js 15** (App Router + API Routes)
- **Supabase** (PostgreSQL en la nube)
- **Tailwind CSS**
- **TypeScript**
- **Vercel** (deploy)

## Setup local

```bash
# 1. Clonar e instalar
npm install

# 2. Copiar variables de entorno
cp .env.local.example .env.local
# Completar con tus credenciales de Supabase

# 3. Crear las tablas en Supabase
# Ir a supabase.com → tu proyecto → SQL Editor → pegar contenido de lib/schema.sql

# 4. Correr en desarrollo
npm run dev
# Abre http://localhost:3000
```

## Deploy en Vercel

```bash
# Instalar Vercel CLI
npm i -g vercel

# Deploy
vercel --prod
# Seguir instrucciones y agregar variables de entorno en el dashboard de Vercel
```

## Variables de entorno requeridas

```
NEXT_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
```

## Estructura del proyecto

```
app/
  page.tsx                    # Dashboard principal
  termohigrometria/page.tsx   # Formulario F-021
  neveras/page.tsx            # Gestión de neveras (CRUD)
  neveras/registro/page.tsx   # Formulario F-029
  api/neveras/route.ts        # API CRUD neveras
  api/termohigrometria/...    # API registros termohigrometría
  api/neveras-registros/...   # API registros neveras
components/
  HospitalHeader.tsx          # Encabezado institucional
  HospitalFooter.tsx          # Pie de página institucional
  Navbar.tsx                  # Navegación principal
lib/
  supabase.ts                 # Cliente Supabase
  types.ts                    # Tipos TypeScript
  schema.sql                  # Schema de base de datos
```
