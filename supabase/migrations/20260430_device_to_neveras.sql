-- Move refrigerator device metadata from monthly records to base neveras.
-- Existing monthly device data can be discarded, but we copy the latest value
-- when present to make the migration safer on live data. Existing base nevera
-- metadata wins over migrated defaults so manual edits are not overwritten.

do $$
begin
  alter table public.neveras disable row level security;
  alter table public.registros_neveras disable row level security;

  alter table public.neveras
    add column if not exists dispositivo        text not null default '',
    add column if not exists dispositivo_marca  text not null default '',
    add column if not exists dispositivo_modelo text not null default '',
    add column if not exists dispositivo_serial text not null default '',
    add column if not exists certificado        text not null default '',
    add column if not exists factor_correccion  text not null default '0';

  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'registros_neveras'
      and column_name = 'dispositivo_marca'
  ) then
    with latest_device_data as (
      select distinct on (nevera_id)
        nevera_id,
        coalesce(dispositivo_marca, '') as dispositivo_marca,
        coalesce(dispositivo_modelo, '') as dispositivo_modelo,
        coalesce(dispositivo_serial, '') as dispositivo_serial,
        coalesce(certificado, '') as certificado,
        coalesce(factor_correccion, '0') as factor_correccion
      from public.registros_neveras
      order by nevera_id, año desc, mes desc, updated_at desc
    )
    update public.neveras as n
    set
      dispositivo_marca = case when n.dispositivo_marca = '' then latest_device_data.dispositivo_marca else n.dispositivo_marca end,
      dispositivo_modelo = case when n.dispositivo_modelo = '' then latest_device_data.dispositivo_modelo else n.dispositivo_modelo end,
      dispositivo_serial = case when n.dispositivo_serial = '' then latest_device_data.dispositivo_serial else n.dispositivo_serial end,
      certificado = case when n.certificado = '' then latest_device_data.certificado else n.certificado end,
      factor_correccion = case when n.factor_correccion = '0' then latest_device_data.factor_correccion else n.factor_correccion end
    from latest_device_data
    where n.id = latest_device_data.nevera_id;
  end if;

  alter table public.registros_neveras
    drop column if exists dispositivo_marca,
    drop column if exists dispositivo_modelo,
    drop column if exists dispositivo_serial,
    drop column if exists certificado,
    drop column if exists factor_correccion;

  alter table public.neveras enable row level security;
  alter table public.registros_neveras enable row level security;
exception
  when others then
    alter table public.neveras enable row level security;
    alter table public.registros_neveras enable row level security;
    raise;
end $$;
