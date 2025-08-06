-- Script para verificar datos de turnos extras
-- Ejecutar en base de datos GardOps

-- Verificar estructura de la tabla
SELECT 
    column_name, 
    data_type, 
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'turnos_extras' 
ORDER BY ordinal_position;

-- Verificar datos de turnos extras con valores
SELECT 
    te.id,
    te.guardia_id,
    g.nombre || ' ' || g.apellido_paterno as guardia_nombre,
    g.rut as guardia_rut,
    te.instalacion_id,
    i.nombre as instalacion_nombre,
    i.valor_turno_extra as valor_instalacion,
    te.puesto_id,
    po.nombre_puesto,
    te.fecha,
    te.estado,
    te.valor as valor_turno_extra,
    te.pagado,
    te.created_at
FROM turnos_extras te
JOIN guardias g ON g.id = te.guardia_id
JOIN instalaciones i ON i.id = te.instalacion_id
JOIN as_turnos_puestos_operativos po ON po.id = te.puesto_id
ORDER BY te.fecha DESC, te.created_at DESC
LIMIT 10;

-- Verificar instalaciones con sus valores de turno extra
SELECT 
    id,
    nombre,
    valor_turno_extra,
    created_at
FROM instalaciones 
WHERE valor_turno_extra IS NOT NULL AND valor_turno_extra > 0
ORDER BY nombre;

-- Contar turnos extras por estado
SELECT 
    estado,
    COUNT(*) as total,
    SUM(valor) as monto_total,
    AVG(valor) as promedio_valor
FROM turnos_extras 
GROUP BY estado;

-- Contar turnos extras por estado de pago
SELECT 
    pagado,
    COUNT(*) as total,
    SUM(valor) as monto_total,
    AVG(valor) as promedio_valor
FROM turnos_extras 
GROUP BY pagado; 