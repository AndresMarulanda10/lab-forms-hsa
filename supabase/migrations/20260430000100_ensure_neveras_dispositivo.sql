-- Ensure the distinct refrigerator device field exists on already-migrated databases.
-- Some environments applied the previous migration before `dispositivo` was added,
-- so this incremental migration is required even if the base schema is now correct.

alter table public.neveras
  add column if not exists dispositivo         text not null default '',
  add column if not exists dispositivo_marca   text not null default '',
  add column if not exists dispositivo_modelo  text not null default '',
  add column if not exists dispositivo_serial  text not null default '',
  add column if not exists certificado         text not null default '',
  add column if not exists factor_correccion   text not null default '0';

update public.neveras
set dispositivo = ''
where dispositivo is null;

notify pgrst, 'reload schema';
