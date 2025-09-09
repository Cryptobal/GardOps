-- SOLUCIÓN ROBUSTA: Corregir vista unificada y prevenir guardias fantasma
-- Esta solución implementa múltiples capas de protección

-- 1. CORREGIR VISTA UNIFICADA
DROP VIEW IF EXISTS as_turnos_v_pauta_diaria_unificada CASCADE;

CREATE OR REPLACE VIEW as_turnos_v_pauta_diaria_unificada AS
WITH pauta_dedup AS (
  SELECT DISTINCT ON (pm.puesto_id, pm.anio, pm.mes, pm.dia)
    pm.id::text as pauta_id,
    pm.puesto_id,
    pm.guardia_id,
    pm.anio,
    pm.mes,
    pm.dia,
    TO_DATE(CONCAT(pm.anio, '-', pm.mes, '-', pm.dia), 'YYYY-MM-DD') as fecha,
    pm.estado as estado_pauta_mensual,
    pm.estado_ui,
    pm.observaciones,
    pm.meta,
    
    -- Información de la instalación
    i.id as instalacion_id,
    i.nombre as instalacion_nombre,
    i.telefono as instalacion_telefono,
    
    -- Información del guardia titular (SOLO si existe y es válido)
    g.id as guardia_titular_id,
    CASE 
      WHEN g.id IS NOT NULL AND g.nombre IS NOT NULL AND g.apellido_paterno IS NOT NULL 
      THEN CONCAT(g.apellido_paterno, ' ', g.apellido_materno, ', ', g.nombre)
      ELSE NULL
    END as guardia_titular_nombre,
    g.telefono as guardia_titular_telefono,
    
    -- Información del puesto
    po.nombre_puesto,
    po.es_ppc,
    
    -- Información del rol de servicio
    rs.id as rol_id,
    rs.nombre as rol_nombre,
    rs.hora_inicio::text as hora_inicio,
    rs.hora_termino::text as hora_fin,
    
    -- Información de cobertura desde turnos_extras (el más reciente)
    te.guardia_id as cobertura_guardia_id,
    te.estado as tipo_cobertura,
    te.created_at as cobertura_fecha,
    
    -- Información de cobertura desde meta JSON (para compatibilidad)
    (pm.meta->>'cobertura_guardia_id')::uuid as meta_cobertura_guardia_id,
    pm.meta->>'tipo' as meta_tipo_cobertura
    
  FROM as_turnos_pauta_mensual pm
  INNER JOIN as_turnos_puestos_operativos po ON pm.puesto_id = po.id
  INNER JOIN instalaciones i ON po.instalacion_id = i.id
  LEFT JOIN guardias g ON pm.guardia_id = g.id
  LEFT JOIN as_turnos_roles_servicio rs ON po.rol_id = rs.id
  LEFT JOIN LATERAL (
    SELECT guardia_id, estado, created_at
    FROM TE_turnos_extras te
    WHERE te.pauta_id = pm.id
    ORDER BY te.created_at DESC
    LIMIT 1
  ) te ON true
  WHERE po.activo = true
    AND pm.estado = 'planificado'  -- SOLO turnos planificados
  ORDER BY pm.puesto_id, pm.anio, pm.mes, pm.dia, pm.id DESC
)
SELECT 
  pd.pauta_id,
  pd.fecha::text,
  pd.puesto_id::text,
  pd.nombre_puesto as puesto_nombre,
  pd.instalacion_id::text,
  pd.instalacion_nombre,
  pd.instalacion_telefono,
  pd.estado_pauta_mensual,
  
  -- Estado UI para Pauta Diaria (ejecución) - ROBUSTO
  CASE 
    -- Si no se ha marcado asistencia, aparece como 'planificado'
    WHEN pd.estado_ui IS NULL OR pd.estado_ui = 'plan' THEN 'planificado'
    
    -- Estados de ejecución
    WHEN pd.estado_ui = 'asistio' THEN 'asistido'
    WHEN pd.estado_ui = 'inasistencia' THEN 'inasistencia'
    WHEN pd.estado_ui = 'reemplazo' THEN 'reemplazo'
    WHEN pd.estado_ui = 'sin_cobertura' THEN 'sin_cobertura'
    
    -- Estados de turno extra (MANTENER COMO 'extra')
    WHEN pd.estado_ui = 'extra' THEN 'extra'
    WHEN pd.estado_ui = 'turno_extra' THEN 'extra'
    WHEN pd.estado_ui = 'te' THEN 'extra'
    
    -- Por defecto, planificado
    ELSE 'planificado'
  END as estado_ui,
  
  -- Metadatos en formato JSON
  jsonb_build_object(
    'cobertura_guardia_id', COALESCE(pd.cobertura_guardia_id::text, pd.meta_cobertura_guardia_id::text),
    'tipo_cobertura', COALESCE(pd.tipo_cobertura, pd.meta_tipo_cobertura),
    'observaciones', pd.observaciones,
    'estado_semaforo', pd.meta->>'estado_semaforo',
    'comentarios', pd.meta->>'comentarios'
  ) as meta,
  
  -- ID del guardia que trabaja (titular o cobertura) - VALIDADO
  CASE 
    WHEN pd.cobertura_guardia_id IS NOT NULL THEN pd.cobertura_guardia_id::text
    WHEN pd.meta_cobertura_guardia_id IS NOT NULL THEN pd.meta_cobertura_guardia_id::text
    WHEN pd.guardia_titular_id IS NOT NULL THEN pd.guardia_titular_id::text
    ELSE NULL
  END as guardia_trabajo_id,
  
  -- Nombre del guardia que trabaja - VALIDADO Y LIMPIO
  CASE 
    WHEN pd.cobertura_guardia_id IS NOT NULL THEN 
      (SELECT CONCAT(apellido_paterno, ' ', apellido_materno, ', ', nombre) 
       FROM guardias 
       WHERE id = pd.cobertura_guardia_id 
         AND nombre IS NOT NULL 
         AND apellido_paterno IS NOT NULL
         AND TRIM(nombre) != '' 
         AND TRIM(apellido_paterno) != '')
    WHEN pd.meta_cobertura_guardia_id IS NOT NULL THEN 
      (SELECT CONCAT(apellido_paterno, ' ', apellido_materno, ', ', nombre) 
       FROM guardias 
       WHERE id = pd.meta_cobertura_guardia_id 
         AND nombre IS NOT NULL 
         AND apellido_paterno IS NOT NULL
         AND TRIM(nombre) != '' 
         AND TRIM(apellido_paterno) != '')
    WHEN pd.guardia_titular_nombre IS NOT NULL 
         AND TRIM(pd.guardia_titular_nombre) != '' 
         AND pd.guardia_titular_nombre != ' , ' THEN pd.guardia_titular_nombre
    ELSE NULL
  END as guardia_trabajo_nombre,
  
  -- Teléfono del guardia que trabaja - VALIDADO
  CASE 
    WHEN pd.cobertura_guardia_id IS NOT NULL THEN 
      (SELECT telefono FROM guardias WHERE id = pd.cobertura_guardia_id)
    WHEN pd.meta_cobertura_guardia_id IS NOT NULL THEN 
      (SELECT telefono FROM guardias WHERE id = pd.meta_cobertura_guardia_id)
    WHEN pd.guardia_titular_telefono IS NOT NULL THEN pd.guardia_titular_telefono
    ELSE NULL
  END as guardia_trabajo_telefono,
  
  -- Información del guardia titular - VALIDADA
  pd.guardia_titular_id::text,
  CASE 
    WHEN pd.guardia_titular_nombre IS NOT NULL 
         AND TRIM(pd.guardia_titular_nombre) != '' 
         AND pd.guardia_titular_nombre != ' , ' THEN pd.guardia_titular_nombre
    ELSE NULL
  END as guardia_titular_nombre,
  pd.guardia_titular_telefono,
  
  -- Flags de estado - VALIDADOS
  pd.es_ppc,
  (pd.cobertura_guardia_id IS NOT NULL OR pd.meta_cobertura_guardia_id IS NOT NULL) as es_reemplazo,
  (pd.estado_ui IN ('sin_cobertura', 'inasistencia')) as es_sin_cobertura,
  (pd.estado_ui = 'inasistencia') as es_falta_sin_aviso,
  (pd.es_ppc AND pd.guardia_titular_id IS NULL) OR 
  (pd.estado_ui IN ('sin_cobertura', 'inasistencia')) as necesita_cobertura,
  
  -- Información del horario
  pd.hora_inicio,
  pd.hora_fin,
  pd.rol_id::text,
  pd.rol_nombre,
  
  -- Nombres de reemplazo/cobertura - VALIDADOS Y LIMPIOS
  CASE 
    WHEN pd.cobertura_guardia_id IS NOT NULL THEN 
      (SELECT CONCAT(apellido_paterno, ' ', apellido_materno, ', ', nombre) 
       FROM guardias 
       WHERE id = pd.cobertura_guardia_id 
         AND nombre IS NOT NULL 
         AND apellido_paterno IS NOT NULL
         AND TRIM(nombre) != '' 
         AND TRIM(apellido_paterno) != '')
    WHEN pd.meta_cobertura_guardia_id IS NOT NULL THEN 
      (SELECT CONCAT(apellido_paterno, ' ', apellido_materno, ', ', nombre) 
       FROM guardias 
       WHERE id = pd.meta_cobertura_guardia_id 
         AND nombre IS NOT NULL 
         AND apellido_paterno IS NOT NULL
         AND TRIM(nombre) != '' 
         AND TRIM(apellido_paterno) != '')
    ELSE NULL
  END as reemplazo_guardia_nombre,
  
  CASE 
    WHEN pd.cobertura_guardia_id IS NOT NULL THEN 
      (SELECT CONCAT(apellido_paterno, ' ', apellido_materno, ', ', nombre) 
       FROM guardias 
       WHERE id = pd.cobertura_guardia_id 
         AND nombre IS NOT NULL 
         AND apellido_paterno IS NOT NULL
         AND TRIM(nombre) != '' 
         AND TRIM(apellido_paterno) != '')
    WHEN pd.meta_cobertura_guardia_id IS NOT NULL THEN 
      (SELECT CONCAT(apellido_paterno, ' ', apellido_materno, ', ', nombre) 
       FROM guardias 
       WHERE id = pd.meta_cobertura_guardia_id 
         AND nombre IS NOT NULL 
         AND apellido_paterno IS NOT NULL
         AND TRIM(nombre) != '' 
         AND TRIM(apellido_paterno) != '')
    ELSE NULL
  END as cobertura_guardia_nombre,
  
  -- Teléfono de cobertura - VALIDADO
  CASE 
    WHEN pd.cobertura_guardia_id IS NOT NULL THEN 
      (SELECT telefono FROM guardias WHERE id = pd.cobertura_guardia_id)
    WHEN pd.meta_cobertura_guardia_id IS NOT NULL THEN 
      (SELECT telefono FROM guardias WHERE id = pd.meta_cobertura_guardia_id)
    ELSE NULL
  END as cobertura_guardia_telefono
  
FROM pauta_dedup pd;

-- 2. AGREGAR CONSTRAINTS DE VALIDACIÓN
-- Constraint para asegurar que los nombres de guardias no sean vacíos
ALTER TABLE guardias 
ADD CONSTRAINT chk_guardia_nombre_valido 
CHECK (
  nombre IS NOT NULL 
  AND apellido_paterno IS NOT NULL 
  AND TRIM(nombre) != '' 
  AND TRIM(apellido_paterno) != ''
);

-- Constraint para asegurar que estado_ui sea válido
ALTER TABLE as_turnos_pauta_mensual 
ADD CONSTRAINT chk_estado_ui_valido 
CHECK (
  estado_ui IS NULL 
  OR estado_ui IN ('plan', 'asistido', 'inasistencia', 'reemplazo', 'sin_cobertura', 'extra', 'turno_extra', 'te')
);

-- 3. CREAR FUNCIÓN DE VALIDACIÓN
CREATE OR REPLACE FUNCTION validar_guardia_asignacion()
RETURNS TRIGGER AS $$
BEGIN
  -- Validar que si se asigna un guardia, el guardia existe y es válido
  IF NEW.guardia_id IS NOT NULL THEN
    IF NOT EXISTS (
      SELECT 1 FROM guardias 
      WHERE id = NEW.guardia_id 
        AND nombre IS NOT NULL 
        AND apellido_paterno IS NOT NULL
        AND TRIM(nombre) != '' 
        AND TRIM(apellido_paterno) != ''
    ) THEN
      RAISE EXCEPTION 'El guardia asignado no existe o tiene datos inválidos';
    END IF;
  END IF;
  
  -- Validar que estado_ui sea consistente
  IF NEW.estado_ui = 'extra' AND NEW.guardia_id IS NULL THEN
    RAISE EXCEPTION 'Un turno extra debe tener un guardia asignado';
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 4. CREAR TRIGGER DE VALIDACIÓN
DROP TRIGGER IF EXISTS trigger_validar_guardia_asignacion ON as_turnos_pauta_mensual;
CREATE TRIGGER trigger_validar_guardia_asignacion
  BEFORE INSERT OR UPDATE ON as_turnos_pauta_mensual
  FOR EACH ROW
  EXECUTE FUNCTION validar_guardia_asignacion();

-- 5. CREAR ÍNDICES PARA OPTIMIZACIÓN
CREATE INDEX IF NOT EXISTS idx_pauta_mensual_guardia_valido 
ON as_turnos_pauta_mensual(guardia_id) 
WHERE guardia_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_guardias_nombre_valido 
ON guardias(id) 
WHERE nombre IS NOT NULL 
  AND apellido_paterno IS NOT NULL 
  AND TRIM(nombre) != '' 
  AND TRIM(apellido_paterno) != '';

-- 6. COMENTARIOS DE DOCUMENTACIÓN
COMMENT ON VIEW as_turnos_v_pauta_diaria_unificada IS 
'Vista unificada para pauta diaria con validaciones robustas. 
Solo muestra turnos planificados con guardias válidos.
Previene guardias fantasma mediante validaciones estrictas.';

COMMENT ON FUNCTION validar_guardia_asignacion() IS 
'Función de validación que previene asignaciones de guardias inválidos.
Asegura consistencia de datos y previene guardias fantasma.';
