-- Move refrigerator device metadata from monthly records to base neveras.
-- Existing monthly device data can be discarded, but we copy the latest value
-- when present to make the migration safer on live data.

alter table public.neveras disable row level security;
alter table public.registros_neveras disable row level security;

alter table public.neveras
  add column if not exists dispositivo_marca  text not null default '',
  add column if not exists dispositivo_modelo text not null default '',
  add column if not exists dispositivo_serial text not null default '',
  add column if not exists certificado        text not null default '',
  add column if not exists factor_correccion  text not null default '0';

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
  dispositivo_marca = latest_device_data.dispositivo_marca,
  dispositivo_modelo = latest_device_data.dispositivo_modelo,
  dispositivo_serial = latest_device_data.dispositivo_serial,
  certificado = latest_device_data.certificado,
  factor_correccion = latest_device_data.factor_correccion
from latest_device_data
where n.id = latest_device_data.nevera_id;

alter table public.registros_neveras
  drop column if exists dispositivo_marca,
  drop column if exists dispositivo_modelo,
  drop column if exists dispositivo_serial,
  drop column if exists certificado,
  drop column if exists factor_correccion;

alter table public.neveras enable row level security;
alter table public.registros_neveras enable row level security;
