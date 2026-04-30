-- Restore anon-friendly access for the current app, which does not have a
-- login/authentication flow yet. Keep RLS enabled, but allow the anon key to
-- read and mutate the lab tables used by the app.

alter table public.neveras enable row level security;
alter table public.registros_termohigrometria enable row level security;
alter table public.registros_neveras enable row level security;

drop policy if exists "Authenticated users can read neveras" on public.neveras;
drop policy if exists "Authenticated users can insert neveras" on public.neveras;
drop policy if exists "Authenticated users can update neveras" on public.neveras;
drop policy if exists "Authenticated users can delete neveras" on public.neveras;
drop policy if exists "Allow all anon" on public.neveras;

create policy "Allow all anon"
  on public.neveras
  for all
  using (true)
  with check (true);

drop policy if exists "Authenticated users can read termohigrometria" on public.registros_termohigrometria;
drop policy if exists "Authenticated users can insert termohigrometria" on public.registros_termohigrometria;
drop policy if exists "Authenticated users can update termohigrometria" on public.registros_termohigrometria;
drop policy if exists "Authenticated users can delete termohigrometria" on public.registros_termohigrometria;
drop policy if exists "Allow all anon" on public.registros_termohigrometria;

create policy "Allow all anon"
  on public.registros_termohigrometria
  for all
  using (true)
  with check (true);

drop policy if exists "Authenticated users can read registros neveras" on public.registros_neveras;
drop policy if exists "Authenticated users can insert registros neveras" on public.registros_neveras;
drop policy if exists "Authenticated users can update registros neveras" on public.registros_neveras;
drop policy if exists "Authenticated users can delete registros neveras" on public.registros_neveras;
drop policy if exists "Allow all anon" on public.registros_neveras;

create policy "Allow all anon"
  on public.registros_neveras
  for all
  using (true)
  with check (true);

notify pgrst, 'reload schema';
