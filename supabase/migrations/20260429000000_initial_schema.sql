-- HSA Lab Forms — initial Supabase schema baseline.
-- Generated from lib/schema.sql and the existing root migrations/ folder.

create extension if not exists "uuid-ossp";

create table if not exists public.neveras (
  id uuid primary key default uuid_generate_v4(),
  nombre text not null,
  codigo text not null unique,
  ubicacion text not null default '',
  activa boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.registros_termohigrometria (
  id uuid primary key default uuid_generate_v4(),
  año integer not null check (año >= 2020),
  mes integer not null check (mes between 1 and 12),
  ubicacion text not null default '',
  dispositivo_nombre text not null default 'TERMOHIGROMETRO',
  dispositivo_marca text not null default '',
  dispositivo_modelo text not null default '',
  dispositivo_serial text not null default '',
  certificado text not null default '',
  factor_correccion text not null default '',
  factor_correccion_temp text not null default '0',
  factor_correccion_hum text not null default '0',
  lecturas jsonb not null default '{}'::jsonb,
  responsable_manana text not null default '',
  responsable_tarde text not null default '',
  responsable_noche text not null default '',
  firma_manana text not null default '',
  firma_tarde text not null default '',
  firma_noche text not null default '',
  responsable text not null default '',
  firma text not null default '',
  observaciones text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (año, mes)
);

create table if not exists public.registros_neveras (
  id uuid primary key default uuid_generate_v4(),
  nevera_id uuid not null references public.neveras(id) on delete cascade,
  año integer not null check (año >= 2020),
  mes integer not null check (mes between 1 and 12),
  lecturas jsonb not null default '{}'::jsonb,
  responsable_manana text not null default '',
  responsable_tarde text not null default '',
  responsable_noche text not null default '',
  firma_manana text not null default '',
  firma_tarde text not null default '',
  firma_noche text not null default '',
  factor_correccion text not null default '0',
  dispositivo_marca text not null default '',
  dispositivo_modelo text not null default '',
  dispositivo_serial text not null default '',
  certificado text not null default '',
  fecha_limpieza date,
  observaciones text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (nevera_id, año, mes)
);

create index if not exists registros_neveras_nevera_id_idx
  on public.registros_neveras (nevera_id);

create or replace function public.handle_updated_at()
returns trigger
language plpgsql
as $$
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

alter table public.neveras enable row level security;
alter table public.registros_termohigrometria enable row level security;
alter table public.registros_neveras enable row level security;
