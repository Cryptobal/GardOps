-- Recomendación RLS por tenant (NO EJECUTAR AUTOMÁTICAMENTE)
-- Requiere setear por request: select set_config('app.tenant_id', '<UUID>', true);

-- Habilitar RLS en tablas críticas
ALTER TABLE IF EXISTS public.guardias ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.instalaciones ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.as_turnos ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.sueldo_liquidaciones ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.sueldo_tramos ENABLE ROW LEVEL SECURITY;

-- Política base USING/WITH CHECK
CREATE POLICY IF NOT EXISTS tenant_isolation_guardias ON public.guardias
  USING (tenant_id::text = current_setting('app.tenant_id', true))
  WITH CHECK (tenant_id::text = current_setting('app.tenant_id', true));

CREATE POLICY IF NOT EXISTS tenant_isolation_instalaciones ON public.instalaciones
  USING (tenant_id::text = current_setting('app.tenant_id', true))
  WITH CHECK (tenant_id::text = current_setting('app.tenant_id', true));

CREATE POLICY IF NOT EXISTS tenant_isolation_as_turnos ON public.as_turnos
  USING (tenant_id::text = current_setting('app.tenant_id', true))
  WITH CHECK (tenant_id::text = current_setting('app.tenant_id', true));

CREATE POLICY IF NOT EXISTS tenant_isolation_sueldo_liquidaciones ON public.sueldo_liquidaciones
  USING (tenant_id::text = current_setting('app.tenant_id', true))
  WITH CHECK (tenant_id::text = current_setting('app.tenant_id', true));

CREATE POLICY IF NOT EXISTS tenant_isolation_sueldo_tramos ON public.sueldo_tramos
  USING (tenant_id::text = current_setting('app.tenant_id', true))
  WITH CHECK (tenant_id::text = current_setting('app.tenant_id', true));

-- Nota: ampliar para todas las tablas sueldo_* y as_turnos_* según inventario


