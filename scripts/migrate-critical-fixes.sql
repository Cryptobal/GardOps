-- =====================================================
-- SCRIPT DE MIGRACIÓN - CORRECCIONES CRÍTICAS GARDOPS
-- Fecha: 29 de Julio de 2025
-- Base de Datos: PostgreSQL (Neon)
-- =====================================================

-- IMPORTANTE: Ejecutar este script en un entorno de desarrollo primero
-- Hacer backup completo antes de ejecutar en producción

BEGIN;

-- =====================================================
-- 1. CORRECCIÓN CRÍTICA: asignaciones_guardias.guardia_id
-- =====================================================

-- Verificar datos existentes antes de la migración
SELECT 
    'Verificando datos existentes en asignaciones_guardias' as accion,
    COUNT(*) as total_registros,
    COUNT(CASE WHEN guardia_id IS NOT NULL THEN 1 END) as registros_con_guardia_id
FROM asignaciones_guardias;

-- Crear tabla temporal para la migración
CREATE TEMP TABLE temp_asignaciones_guardias AS
SELECT 
    ag.id,
    ag.requisito_puesto_id,
    ag.tipo_asignacion,
    ag.fecha_inicio,
    ag.fecha_termino,
    ag.estado,
    ag.motivo_termino,
    ag.observaciones,
    ag.created_at,
    ag.updated_at,
    ag.tenant_id,
    -- Convertir guardia_id de integer a UUID
    CASE 
        WHEN ag.guardia_id IS NOT NULL THEN 
            (SELECT g.id FROM guardias g WHERE g.legacy_id = ag.guardia_id LIMIT 1)
        ELSE NULL 
    END as guardia_id_new
FROM asignaciones_guardias ag;

-- Verificar conversión
SELECT 
    'Verificando conversión de guardia_id' as accion,
    COUNT(*) as total_registros,
    COUNT(CASE WHEN guardia_id_new IS NOT NULL THEN 1 END) as registros_convertidos,
    COUNT(CASE WHEN guardia_id_new IS NULL AND guardia_id IS NOT NULL THEN 1 END) as registros_sin_conversion
FROM temp_asignaciones_guardias;

-- Crear nueva columna UUID
ALTER TABLE asignaciones_guardias ADD COLUMN guardia_id_new UUID;

-- Actualizar con datos convertidos
UPDATE asignaciones_guardias 
SET guardia_id_new = temp.guardia_id_new
FROM temp_asignaciones_guardias temp
WHERE asignaciones_guardias.id = temp.id;

-- Eliminar columna antigua y renombrar nueva
ALTER TABLE asignaciones_guardias DROP COLUMN guardia_id;
ALTER TABLE asignaciones_guardias RENAME COLUMN guardia_id_new TO guardia_id;

-- Agregar constraint de foreign key
ALTER TABLE asignaciones_guardias 
ADD CONSTRAINT fk_asignaciones_guardias_guardia_id 
FOREIGN KEY (guardia_id) REFERENCES guardias(id);

-- =====================================================
-- 2. ÍNDICES CRÍTICOS FALTANTES
-- =====================================================

-- Índices para campos de búsqueda frecuente
CREATE INDEX IF NOT EXISTS idx_clientes_email ON clientes(email);
CREATE INDEX IF NOT EXISTS idx_clientes_telefono ON clientes(telefono);
CREATE INDEX IF NOT EXISTS idx_guardias_telefono ON guardias(telefono);
CREATE INDEX IF NOT EXISTS idx_guardias_activo ON guardias(activo);
CREATE INDEX IF NOT EXISTS idx_usuarios_telefono ON usuarios(telefono);
CREATE INDEX IF NOT EXISTS idx_tenants_activo ON tenants(activo);
CREATE INDEX IF NOT EXISTS idx_tipos_documentos_activo ON tipos_documentos(activo);

-- Índices para relaciones importantes
CREATE INDEX IF NOT EXISTS idx_instalaciones_cliente_id ON instalaciones(cliente_id);
CREATE INDEX IF NOT EXISTS idx_documentos_usuarios_tenant_id ON documentos_usuarios(tenant_id);
CREATE INDEX IF NOT EXISTS idx_rondas_tenant_id ON rondas(tenant_id);
-- Tabla turnos_extra eliminada - usando turnos_extras en su lugar
CREATE INDEX IF NOT EXISTS idx_usuarios_roles_tenant_id ON usuarios_roles(tenant_id);

-- Índices para fechas importantes
CREATE INDEX IF NOT EXISTS idx_documentos_fecha_vencimiento ON documentos(fecha_vencimiento);
CREATE INDEX IF NOT EXISTS idx_documentos_clientes_fecha_vencimiento ON documentos_clientes(fecha_vencimiento);
CREATE INDEX IF NOT EXISTS idx_puestos_por_cubrir_fecha_limite ON puestos_por_cubrir(fecha_limite_cobertura);
CREATE INDEX IF NOT EXISTS idx_asignaciones_guardias_fecha_inicio ON asignaciones_guardias(fecha_inicio);
CREATE INDEX IF NOT EXISTS idx_asignaciones_guardias_fecha_termino ON asignaciones_guardias(fecha_termino);

-- =====================================================
-- 3. NORMALIZACIÓN DE TIMESTAMPS
-- =====================================================

-- Agregar created_at faltante
ALTER TABLE bancos ADD COLUMN IF NOT EXISTS created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE documentos_guardias ADD COLUMN IF NOT EXISTS created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE documentos_instalacion ADD COLUMN IF NOT EXISTS created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE documentos_usuarios ADD COLUMN IF NOT EXISTS created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE firmas ADD COLUMN IF NOT EXISTS created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE planillas_pago ADD COLUMN IF NOT EXISTS created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE rondas ADD COLUMN IF NOT EXISTS created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;
-- Tabla turnos_extra eliminada - usando turnos_extras en su lugar
ALTER TABLE usuarios_permisos ADD COLUMN IF NOT EXISTS created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE usuarios_roles ADD COLUMN IF NOT EXISTS created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;

-- Agregar updated_at faltante
ALTER TABLE documentos_clientes ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE tipos_documentos ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE turnos_extras ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;

-- Renombrar columnas inconsistentes
ALTER TABLE documentos RENAME COLUMN creado_en TO created_at;
ALTER TABLE pautas_diarias RENAME COLUMN creado_en TO created_at;
ALTER TABLE pautas_mensuales RENAME COLUMN creado_en TO created_at;
ALTER TABLE planillas RENAME COLUMN creado_en TO created_at;
ALTER TABLE tipos_documentos RENAME COLUMN creado_en TO created_at;
ALTER TABLE turnos_extras RENAME COLUMN creado_en TO created_at;

-- =====================================================
-- 4. CORRECCIÓN DE NOMBRES DE COLUMNAS
-- =====================================================

-- Cambiar caracteres especiales por ASCII
ALTER TABLE documentos_clientes RENAME COLUMN "tamaño" TO tamano;
ALTER TABLE planificacion_mensual RENAME COLUMN "año" TO anio;
ALTER TABLE usuarios RENAME COLUMN "último_acceso" TO ultimo_acceso;

-- =====================================================
-- 5. VERIFICACIONES FINALES
-- =====================================================

-- Verificar integridad referencial
SELECT 
    'Verificando integridad referencial' as accion,
    COUNT(*) as total_asignaciones,
    COUNT(CASE WHEN g.id IS NOT NULL THEN 1 END) as asignaciones_validas,
    COUNT(CASE WHEN g.id IS NULL AND ag.guardia_id IS NOT NULL THEN 1 END) as asignaciones_huérfanas
FROM asignaciones_guardias ag
LEFT JOIN guardias g ON ag.guardia_id = g.id;

-- Verificar índices creados
SELECT 
    schemaname,
    tablename,
    indexname,
    indexdef
FROM pg_indexes 
WHERE tablename IN (
    'clientes', 'guardias', 'usuarios', 'tenants', 
    'tipos_documentos', 'instalaciones', 'documentos_usuarios',
    'rondas', 'turnos_extras', 'usuarios_roles'
)
AND indexname LIKE 'idx_%'
ORDER BY tablename, indexname;

-- Verificar columnas de timestamp
SELECT 
    table_name,
    column_name,
    data_type
FROM information_schema.columns 
WHERE table_schema = 'public'
AND column_name IN ('created_at', 'updated_at')
ORDER BY table_name, column_name;

COMMIT;

-- =====================================================
-- NOTAS IMPORTANTES:
-- =====================================================
-- 1. Este script debe ejecutarse en un entorno de desarrollo primero
-- 2. Hacer backup completo antes de ejecutar en producción
-- 3. Verificar que todas las aplicaciones sigan funcionando después
-- 4. Monitorear el rendimiento después de los cambios
-- 5. Actualizar cualquier código que haga referencia a las columnas renombradas 