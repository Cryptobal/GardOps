import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/database';

export async function GET(request: NextRequest) {
  try {
    console.log('🔍 Verificando estructura actual de as_turnos_puestos_operativos...');

    // 1. Verificar qué columnas existen
    const columnas = await query(`
      SELECT column_name, data_type, is_nullable 
      FROM information_schema.columns 
      WHERE table_name = 'as_turnos_puestos_operativos' 
      AND column_name IN ('rol_id', 'rol_servicio_id')
      ORDER BY column_name
    `);

    // 2. Verificar índices
    const indices = await query(`
      SELECT indexname, indexdef 
      FROM pg_indexes 
      WHERE tablename = 'as_turnos_puestos_operativos' 
      AND (indexdef LIKE '%rol_id%' OR indexdef LIKE '%rol_servicio_id%')
    `);

    // 3. Verificar foreign keys
    const fks = await query(`
      SELECT conname, pg_get_constraintdef(oid) as definition
      FROM pg_constraint 
      WHERE conrelid = 'as_turnos_puestos_operativos'::regclass 
      AND contype = 'f'
      AND (pg_get_constraintdef(oid) LIKE '%rol_id%' OR pg_get_constraintdef(oid) LIKE '%rol_servicio_id%')
    `);

    // 4. Verificar datos de muestra
    const muestra = await query(`
      SELECT id, nombre_puesto
      FROM as_turnos_puestos_operativos 
      LIMIT 3
    `);

    // 5. Intentar consulta con rol_id
    let consultaRolId = null;
    try {
      consultaRolId = await query(`
        SELECT COUNT(*) as count 
        FROM as_turnos_puestos_operativos po
        INNER JOIN as_turnos_roles_servicio rs ON po.rol_id = rs.id
        LIMIT 1
      `);
    } catch (error: any) {
      consultaRolId = { error: error.message };
    }

    // 6. Intentar consulta con rol_servicio_id
    let consultaRolServicioId = null;
    try {
      consultaRolServicioId = await query(`
        SELECT COUNT(*) as count 
        FROM as_turnos_puestos_operativos po
        INNER JOIN as_turnos_roles_servicio rs ON po.rol_servicio_id = rs.id
        LIMIT 1
      `);
    } catch (error: any) {
      consultaRolServicioId = { error: error.message };
    }

    return NextResponse.json({
      columnas_encontradas: columnas.rows,
      indices_encontrados: indices.rows,
      foreign_keys_encontradas: fks.rows,
      muestra_datos: muestra.rows,
      test_consulta_rol_id: consultaRolId,
      test_consulta_rol_servicio_id: consultaRolServicioId,
      diagnostico: {
        tiene_rol_id: columnas.rows.some((c: any) => c.column_name === 'rol_id'),
        tiene_rol_servicio_id: columnas.rows.some((c: any) => c.column_name === 'rol_servicio_id'),
        consulta_rol_id_funciona: !consultaRolId?.error,
        consulta_rol_servicio_id_funciona: !consultaRolServicioId?.error
      }
    });

  } catch (error) {
    console.error('❌ Error verificando columna rol:', error);
    return NextResponse.json(
      { error: 'Error verificando columna rol', details: error },
      { status: 500 }
    );
  }
}
