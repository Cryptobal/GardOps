import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/database';

export async function POST(request: NextRequest) {
  try {
    console.log('🚀 INICIANDO MIGRACIÓN ATÓMICA: rol_servicio_id → rol_id');
    
    const migracionSQL = `
-- =====================================================
-- MIGRACIÓN ATÓMICA: rol_servicio_id → rol_id
-- =====================================================

BEGIN;

-- PASO 1: VERIFICACIÓN PREVIA
DO $$
DECLARE
    tiene_rol_servicio_id BOOLEAN := FALSE;
    tiene_rol_id BOOLEAN := FALSE;
    count_registros INTEGER := 0;
BEGIN
    -- Verificar existencia de columnas
    SELECT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'as_turnos_puestos_operativos' 
        AND column_name = 'rol_servicio_id'
    ) INTO tiene_rol_servicio_id;
    
    SELECT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'as_turnos_puestos_operativos' 
        AND column_name = 'rol_id'
    ) INTO tiene_rol_id;
    
    -- Contar registros para backup
    SELECT COUNT(*) FROM as_turnos_puestos_operativos INTO count_registros;
    
    RAISE NOTICE '🔍 ESTADO ACTUAL:';
    RAISE NOTICE '  - Tiene rol_servicio_id: %', tiene_rol_servicio_id;
    RAISE NOTICE '  - Tiene rol_id: %', tiene_rol_id;
    RAISE NOTICE '  - Total registros: %', count_registros;
    
    -- Validar estado esperado
    IF tiene_rol_servicio_id AND tiene_rol_id THEN
        RAISE EXCEPTION '❌ ERROR: Ambas columnas existen. Revisar manualmente.';
    END IF;
    
    IF NOT tiene_rol_servicio_id AND NOT tiene_rol_id THEN
        RAISE EXCEPTION '❌ ERROR: Ninguna columna existe. Revisar esquema.';
    END IF;
END $$;

-- PASO 2: MIGRACIÓN CONDICIONAL
DO $$
BEGIN
    -- CASO 1: Existe rol_servicio_id, necesita renombrar
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'as_turnos_puestos_operativos' 
        AND column_name = 'rol_servicio_id'
    ) THEN
        RAISE NOTICE '🔄 MIGRANDO: rol_servicio_id → rol_id';
        
        -- 2.1: Eliminar índice existente
        DROP INDEX IF EXISTS idx_puestos_operativos_rol;
        RAISE NOTICE '✅ Índice anterior eliminado';
        
        -- 2.2: Renombrar columna
        ALTER TABLE as_turnos_puestos_operativos 
        RENAME COLUMN rol_servicio_id TO rol_id;
        RAISE NOTICE '✅ Columna renombrada: rol_servicio_id → rol_id';
        
        -- 2.3: Crear nuevo índice
        CREATE INDEX idx_puestos_operativos_rol ON as_turnos_puestos_operativos(rol_id);
        RAISE NOTICE '✅ Nuevo índice creado en rol_id';
        
    -- CASO 2: Ya existe rol_id, no hacer nada
    ELSE
        RAISE NOTICE 'ℹ️ Columna rol_id ya existe, no se requiere migración';
    END IF;
END $$;

-- PASO 3: AGREGAR FOREIGN KEY (si no existe)
DO $$
BEGIN
    -- Verificar si ya existe el foreign key
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conrelid = 'as_turnos_puestos_operativos'::regclass 
        AND contype = 'f'
        AND pg_get_constraintdef(oid) LIKE '%rol_id%'
        AND pg_get_constraintdef(oid) LIKE '%as_turnos_roles_servicio%'
    ) THEN
        -- Agregar foreign key
        ALTER TABLE as_turnos_puestos_operativos 
        ADD CONSTRAINT fk_puesto_rol 
        FOREIGN KEY (rol_id) REFERENCES as_turnos_roles_servicio(id);
        
        RAISE NOTICE '✅ Foreign key agregado: rol_id → as_turnos_roles_servicio(id)';
    ELSE
        RAISE NOTICE 'ℹ️ Foreign key ya existe para rol_id';
    END IF;
END $$;

COMMIT;
    `;

    // Ejecutar migración
    await query(migracionSQL);

    // Verificación post-migración
    const verificacion = await query(`
      SELECT 
        column_name, 
        data_type, 
        is_nullable
      FROM information_schema.columns 
      WHERE table_name = 'as_turnos_puestos_operativos' 
      AND column_name IN ('rol_id', 'rol_servicio_id')
      ORDER BY column_name
    `);

    // Prueba de integridad
    const pruebaJoin = await query(`
      SELECT COUNT(*) as total
      FROM as_turnos_puestos_operativos po
      INNER JOIN as_turnos_roles_servicio rs ON po.rol_id = rs.id
    `);

    return NextResponse.json({
      success: true,
      message: 'Migración completada exitosamente',
      columnas_actuales: verificacion.rows,
      prueba_join: pruebaJoin.rows[0],
      timestamp: new Date().toISOString()
    });

  } catch (error: any) {
    console.error('❌ ERROR EN MIGRACIÓN:', error);
    return NextResponse.json(
      { 
        success: false,
        error: 'Error ejecutando migración', 
        details: error.message,
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    );
  }
}
