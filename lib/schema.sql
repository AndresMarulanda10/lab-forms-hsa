-- ============================================================
-- HSA Lab Forms — Supabase Schema
-- Ejecutá este SQL en tu proyecto de Supabase:
-- supabase.com → tu proyecto → SQL Editor → New query
-- ============================================================

-- Extensión para UUIDs
create extension if not exists "uuid-ossp";

-- ─── Neveras ──────────────────────────────────────────────────────────────────
create table if not exists public.neveras (
  id          uuid primary key default uuid_generate_v4(),
  nombre      text not null,
  codigo      text not null unique,
  ubicacion   text not null default '',
  activa      boolean not null default true,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- ─── Registros Termohigrometría ───────────────────────────────────────────────
create table if not exists public.registros_termohigrometria (
  id                   uuid primary key default uuid_generate_v4(),
  año                  integer not null check (año >= 2020),
  mes                  integer not null check (mes between 1 and 12),
  ubicacion            text not null default '',
  dispositivo_nombre   text not null default 'TERMOHIGROMETRO',
  dispositivo_marca    text not null default '',
  dispositivo_modelo   text not null default '',
  dispositivo_serial   text not null default '',
  certificado          text not null default '',
  factor_correccion    text not null default '',
  lecturas             jsonb not null default '{}'::jsonb,
  -- Tres responsables (un firmante por jornada, igual que F-029)
  responsable_manana   text not null default '',
  responsable_tarde    text not null default '',
  responsable_noche    text not null default '',
  firma_manana         text not null default '',
  firma_tarde          text not null default '',
  firma_noche          text not null default '',
  -- Campos legacy (mantener por compatibilidad)
  responsable          text not null default '',
  firma                text not null default '',
  observaciones        text not null default '',
  created_at           timestamptz not null default now(),
  updated_at           timestamptz not null default now(),
  unique (año, mes)
);

-- ─── Registros Neveras ────────────────────────────────────────────────────────
create table if not exists public.registros_neveras (
  id                   uuid primary key default uuid_generate_v4(),
  nevera_id            uuid not null references public.neveras(id) on delete cascade,
  año                  integer not null check (año >= 2020),
  mes                  integer not null check (mes between 1 and 12),
  lecturas             jsonb not null default '{}'::jsonb,
  responsable_manana   text not null default '',
  responsable_tarde    text not null default '',
  responsable_noche    text not null default '',
  firma_manana         text not null default '',
  firma_tarde          text not null default '',
  firma_noche          text not null default '',
  factor_correccion    text not null default '0',
  fecha_limpieza       date,
  observaciones        text not null default '',
  created_at           timestamptz not null default now(),
  updated_at           timestamptz not null default now(),
  unique (nevera_id, año, mes)
);

-- ─── Auto-update updated_at ───────────────────────────────────────────────────
create or replace function public.handle_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create or replace trigger neveras_updated_at
  before update on public.neveras
  for each row execute function public.handle_updated_at();

create or replace trigger termohigro_updated_at
  before update on public.registros_termohigrometria
  for each row execute function public.handle_updated_at();

create or replace trigger neveras_reg_updated_at
  before update on public.registros_neveras
  for each row execute function public.handle_updated_at();

-- ─── RLS (Row Level Security) — público para la red interna ──────────────────
-- Ajustá según tu política de acceso. Por ahora permite todo con anon key.
alter table public.neveras enable row level security;
alter table public.registros_termohigrometria enable row level security;
alter table public.registros_neveras enable row level security;

create policy "Allow all anon" on public.neveras for all using (true) with check (true);
create policy "Allow all anon" on public.registros_termohigrometria for all using (true) with check (true);
create policy "Allow all anon" on public.registros_neveras for all using (true) with check (true);

-- ─── Migración: tres jornadas en termohigrometría ────────────────────────────
-- Ejecutá esto si ya tenés la tabla creada con el esquema anterior:
alter table public.registros_termohigrometria
  add column if not exists responsable_manana text not null default '',
  add column if not exists responsable_tarde  text not null default '',
  add column if not exists responsable_noche  text not null default '',
  add column if not exists firma_manana       text not null default '',
  add column if not exists firma_tarde        text not null default '',
  add column if not exists firma_noche        text not null default '',
  add column if not exists firma              text not null default '';

-- ─── Migración: firmas digitales neveras ─────────────────────────────────────

alter table public.registros_neveras
  add column if not exists firma_manana        text not null default '',
  add column if not exists firma_tarde         text not null default '',
  add column if not exists firma_noche         text not null default '',
  add column if not exists factor_correccion   text not null default '0',
  add column if not exists dispositivo_marca   text not null default '',
  add column if not exists dispositivo_modelo  text not null default '',
  add column if not exists dispositivo_serial  text not null default '',
  add column if not exists certificado         text not null default '';

-- ─── Datos de ejemplo ─────────────────────────────────────────────────────────
insert into public.neveras (nombre, codigo, ubicacion) values
  ('Nevera Reactivos A', 'NV-001', 'Laboratorio Clínico'),
  ('Nevera Muestras B',  'NV-002', 'Laboratorio Clínico'),
  ('Nevera Medicamentos','NV-003', 'Farmacia')
on conflict (codigo) do nothing;
