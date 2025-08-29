-- Habilitar flag ado_v2
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='app_feature_flags'
  ) THEN
    INSERT INTO app_feature_flags (code, enabled)
    VALUES ('ado_v2', true)
    ON CONFLICT (code) DO UPDATE SET enabled = EXCLUDED.enabled;
  ELSE
    RAISE NOTICE 'Tabla app_feature_flags no existe';
  END IF;
END $$;


