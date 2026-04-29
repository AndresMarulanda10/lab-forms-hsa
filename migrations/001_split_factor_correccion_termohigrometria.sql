-- Migration: Split factor_correccion into factor_correccion_temp and factor_correccion_hum
-- for registros_termohigrometria table.
-- Each thermohygrometer needs independent correction factors for temperature and humidity.

-- Add new columns with defaults
ALTER TABLE registros_termohigrometria
  ADD COLUMN IF NOT EXISTS factor_correccion_temp TEXT DEFAULT '0',
  ADD COLUMN IF NOT EXISTS factor_correccion_hum  TEXT DEFAULT '0';

-- Migrate existing data: copy the old factor_correccion to factor_correccion_temp
-- (the old single factor was used for temperature only)
UPDATE registros_termohigrometria
SET factor_correccion_temp = COALESCE(factor_correccion, '0'),
    factor_correccion_hum  = '0'
WHERE factor_correccion_temp IS NULL OR factor_correccion_temp = '0';

-- Note: We keep the old factor_correccion column for backward compatibility.
-- It can be dropped in a future migration once the app is fully migrated.
