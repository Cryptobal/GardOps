-- =====================================================
-- REFACTORIZACIÓN CENTRAL DE MONITOREO - VISTA AUTOMÁTICA
-- =====================================================

-- 1. Eliminar función innecesaria
DROP FUNCTION IF EXISTS central_fn_generar_agenda(date, uuid[]);

-- 2. Crear nueva vista automática que calcule llamados en tiempo real
DROP VIEW IF EXISTS central_v_llamados_automaticos;

CREATE VIEW central_v_llamados_automaticos AS
WITH turnos_activos AS (
  SELECT 
    pm.id as pauta_id,
    pm.instalacion_id,
    pm.guardia_id,
    pm.puesto_id,
    pm.anio,
    pm.mes,
    pm.dia,
    pm.estado,
    pm.observaciones,
    i.nombre as instalacion_nombre,
    i.telefono as instalacion_telefono,
    g.nombre as guardia_nombre,
    g.telefono as guardia_telefono,
    po.nombre_puesto,
    rs.nombre as rol_nombre,
    cci.intervalo_minutos,
    cci.ventana_inicio,
    cci.ventana_fin,
    cci.modo,
    cci.mensaje_template
  FROM as_turnos_pauta_mensual pm
  INNER JOIN instalaciones i ON pm.instalacion_id = i.id
  INNER JOIN as_turnos_puestos_operativos po ON pm.puesto_id = po.id
  INNER JOIN as_turnos_roles_servicio rs ON po.rol_id = rs.id
  LEFT JOIN guardias g ON pm.guardia_id = g.id
  LEFT JOIN central_config_instalacion cci ON cci.instalacion_id = i.id
  WHERE po.activo = true
    AND pm.estado = 'trabajado'
    AND (cci.habilitado = true OR cci.habilitado IS NULL)
),
llamados_calculados AS (
  SELECT 
    gen_random_uuid() as id,
    ta.instalacion_id,
    ta.guardia_id,
    ta.pauta_id,
    ta.puesto_id,
    -- Calcular horarios de llamados basados en ventana y intervalo
    (ta.anio || '-' || 
     LPAD(ta.mes::text, 2, '0') || '-' || 
     LPAD(ta.dia::text, 2, '0') || ' ' || 
     ta.ventana_inicio)::timestamp as programado_para,
    ta.estado as estado_llamado,
    CASE 
      WHEN ta.guardia_telefono IS NOT NULL THEN 'guardia'
      ELSE 'instalacion'
    END as contacto_tipo,
    CASE 
      WHEN ta.guardia_telefono IS NOT NULL THEN ta.guardia_telefono
      ELSE ta.instalacion_telefono
    END as contacto_telefono,
    CASE 
      WHEN ta.guardia_telefono IS NOT NULL THEN ta.guardia_nombre
      ELSE ta.instalacion_nombre
    END as contacto_nombre,
    ta.observaciones,
    ta.instalacion_nombre,
    ta.guardia_nombre,
    ta.nombre_puesto,
    ta.rol_nombre,
    ta.intervalo_minutos,
    ta.ventana_inicio,
    ta.ventana_fin,
    ta.modo,
    ta.mensaje_template,
    -- Calcular si es urgente (más de 30 minutos de atraso)
    CASE 
      WHEN (ta.anio || '-' || 
            LPAD(ta.mes::text, 2, '0') || '-' || 
            LPAD(ta.dia::text, 2, '0') || ' ' || 
            ta.ventana_inicio)::timestamp < (now() - interval '30 minutes')
      THEN true
      ELSE false
    END as es_urgente,
    -- Calcular si es actual (dentro de la hora actual)
    CASE 
      WHEN EXTRACT(HOUR FROM (ta.anio || '-' || 
                              LPAD(ta.mes::text, 2, '0') || '-' || 
                              LPAD(ta.dia::text, 2, '0') || ' ' || 
                              ta.ventana_inicio)::timestamp) = EXTRACT(HOUR FROM now())
      THEN true
      ELSE false
    END as es_actual,
    -- Calcular si es próximo (resto del día)
    CASE 
      WHEN (ta.anio || '-' || 
            LPAD(ta.mes::text, 2, '0') || '-' || 
            LPAD(ta.dia::text, 2, '0') || ' ' || 
            ta.ventana_inicio)::timestamp > now()
      THEN true
      ELSE false
    END as es_proximo
  FROM turnos_activos ta
  WHERE ta.intervalo_minutos IS NOT NULL
    AND ta.ventana_inicio IS NOT NULL
    AND ta.ventana_fin IS NOT NULL
)
SELECT * FROM llamados_calculados
ORDER BY programado_para ASC;

-- 3. Comentarios para documentación
COMMENT ON VIEW central_v_llamados_automaticos IS 'Vista automática que calcula llamados de monitoreo desde pauta mensual en tiempo real';
COMMENT ON COLUMN central_v_llamados_automaticos.es_urgente IS 'Indica si el llamado está atrasado más de 30 minutos';
COMMENT ON COLUMN central_v_llamados_automaticos.es_actual IS 'Indica si el llamado es para la hora actual';
COMMENT ON COLUMN central_v_llamados_automaticos.es_proximo IS 'Indica si el llamado es para el resto del día';
