-- Restrict public lab data to authenticated Supabase users only.
-- PostgreSQL RLS UPDATE/DELETE also require SELECT visibility, so each table
-- receives an explicit SELECT policy plus mutation policies.

alter table public.neveras enable row level security;
alter table public.registros_termohigrometria enable row level security;
alter table public.registros_neveras enable row level security;

drop policy if exists "Allow all anon" on public.neveras;
drop policy if exists "Authenticated users can read neveras" on public.neveras;
drop policy if exists "Authenticated users can insert neveras" on public.neveras;
drop policy if exists "Authenticated users can update neveras" on public.neveras;
drop policy if exists "Authenticated users can delete neveras" on public.neveras;

create policy "Authenticated users can read neveras"
  on public.neveras
  for select
  using (auth.role() = 'authenticated');

create policy "Authenticated users can insert neveras"
  on public.neveras
  for insert
  with check (auth.role() = 'authenticated');

create policy "Authenticated users can update neveras"
  on public.neveras
  for update
  using (auth.role() = 'authenticated')
  with check (auth.role() = 'authenticated');

create policy "Authenticated users can delete neveras"
  on public.neveras
  for delete
  using (auth.role() = 'authenticated');

drop policy if exists "Allow all anon" on public.registros_termohigrometria;
drop policy if exists "Authenticated users can read termohigrometria" on public.registros_termohigrometria;
drop policy if exists "Authenticated users can insert termohigrometria" on public.registros_termohigrometria;
drop policy if exists "Authenticated users can update termohigrometria" on public.registros_termohigrometria;
drop policy if exists "Authenticated users can delete termohigrometria" on public.registros_termohigrometria;

create policy "Authenticated users can read termohigrometria"
  on public.registros_termohigrometria
  for select
  using (auth.role() = 'authenticated');

create policy "Authenticated users can insert termohigrometria"
  on public.registros_termohigrometria
  for insert
  with check (auth.role() = 'authenticated');

create policy "Authenticated users can update termohigrometria"
  on public.registros_termohigrometria
  for update
  using (auth.role() = 'authenticated')
  with check (auth.role() = 'authenticated');

create policy "Authenticated users can delete termohigrometria"
  on public.registros_termohigrometria
  for delete
  using (auth.role() = 'authenticated');

drop policy if exists "Allow all anon" on public.registros_neveras;
drop policy if exists "Authenticated users can read registros neveras" on public.registros_neveras;
drop policy if exists "Authenticated users can insert registros neveras" on public.registros_neveras;
drop policy if exists "Authenticated users can update registros neveras" on public.registros_neveras;
drop policy if exists "Authenticated users can delete registros neveras" on public.registros_neveras;

create policy "Authenticated users can read registros neveras"
  on public.registros_neveras
  for select
  using (auth.role() = 'authenticated');

create policy "Authenticated users can insert registros neveras"
  on public.registros_neveras
  for insert
  with check (auth.role() = 'authenticated');

create policy "Authenticated users can update registros neveras"
  on public.registros_neveras
  for update
  using (auth.role() = 'authenticated')
  with check (auth.role() = 'authenticated');

create policy "Authenticated users can delete registros neveras"
  on public.registros_neveras
  for delete
  using (auth.role() = 'authenticated');
