-- Ensure termohigrometria correction factor columns exist in projects whose
-- baseline migration was applied before these columns were added to the repo.

alter table public.registros_termohigrometria
  add column if not exists factor_correccion_temp text,
  add column if not exists factor_correccion_hum text;

update public.registros_termohigrometria
set factor_correccion_temp = coalesce(nullif(factor_correccion, ''), '0')
where factor_correccion_temp is null or factor_correccion_temp = '';

update public.registros_termohigrometria
set factor_correccion_hum = '0'
where factor_correccion_hum is null or factor_correccion_hum = '';

alter table public.registros_termohigrometria
  alter column factor_correccion_temp set default '0',
  alter column factor_correccion_hum set default '0',
  alter column factor_correccion_temp set not null,
  alter column factor_correccion_hum set not null;
