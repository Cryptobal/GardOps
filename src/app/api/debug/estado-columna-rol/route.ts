import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/database';

export async function GET(request: NextRequest) {
  try {
    // Verificar estado actual de columnas
    const columnas = await query(`
      SELECT column_name, data_type, is_nullable 
      FROM information_schema.columns 
      WHERE table_name = 'as_turnos_puestos_operativos' 
      AND column_name IN ('rol_id', 'rol_servicio_id')
      ORDER BY column_name
    `);

    // Verificar foreign keys
    const foreignKeys = await query(`
      SELECT conname, pg_get_constraintdef(oid) as definition
      FROM pg_constraint 
      WHERE conrelid = 'as_turnos_puestos_operativos'::regclass 
      AND contype = 'f'
      AND (pg_get_constraintdef(oid) LIKE '%rol_id%' OR pg_get_constraintdef(oid) LIKE '%rol_servicio_id%')
    `);

    // Intentar consulta con rol_id
    let consultaRolId = null;
    try {
      const result = await query(`
        SELECT COUNT(*) as count 
        FROM as_turnos_puestos_operativos po
        INNER JOIN as_turnos_roles_servicio rs ON po.rol_id = rs.id
        LIMIT 1
      `);
      consultaRolId = { success: true, count: result.rows[0].count };
    } catch (error: any) {
      consultaRolId = { success: false, error: error.message };
    }

    // Intentar consulta con rol_servicio_id
    let consultaRolServicioId = null;
    try {
      const result = await query(`
        SELECT COUNT(*) as count 
        FROM as_turnos_puestos_operativos po
        INNER JOIN as_turnos_roles_servicio rs ON po.rol_servicio_id = rs.id
        LIMIT 1
      `);
      consultaRolServicioId = { success: true, count: result.rows[0].count };
    } catch (error: any) {
      consultaRolServicioId = { success: false, error: error.message };
    }

    return NextResponse.json({
      columnas_encontradas: columnas.rows,
      foreign_keys: foreignKeys.rows,
      test_consulta_rol_id: consultaRolId,
      test_consulta_rol_servicio_id: consultaRolServicioId,
      diagnostico: {
        tiene_rol_id: columnas.rows.some((c: any) => c.column_name === 'rol_id'),
        tiene_rol_servicio_id: columnas.rows.some((c: any) => c.column_name === 'rol_servicio_id'),
        consulta_rol_id_funciona: consultaRolId?.success,
        consulta_rol_servicio_id_funciona: consultaRolServicioId?.success,
        necesita_migracion: columnas.rows.some((c: any) => c.column_name === 'rol_servicio_id')
      }
    });

  } catch (error: any) {
    return NextResponse.json(
      { error: 'Error verificando estado', details: error.message },
      { status: 500 }
    );
  }
}
