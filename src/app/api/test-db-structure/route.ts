import { NextRequest } from 'next/server';
import { getClient } from '@/lib/database';
import { unstable_noStore as noStore } from 'next/cache';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  noStore();
  const client = await getClient();
  
  try {
    const tests = {
      tables: {},
      functions: {},
      sample_data: {}
    };
    
    // Verificar tablas importantes
    const tablesToCheck = [
      'as_turnos_pauta_mensual',
      'as_turnos_logs',
      'as_turnos_v_pauta_diaria_dedup',
      'sueldo_guardias'
    ];
    
    for (const table of tablesToCheck) {
      try {
        const { rows } = await client.query(`
          SELECT COUNT(*) as count 
          FROM information_schema.tables 
          WHERE table_name = $1
        `, [table]);
        tests.tables[table] = parseInt(rows[0].count) > 0;
      } catch (err) {
        tests.tables[table] = false;
      }
    }
    
    // Verificar funciones importantes
    const functionsToCheck = [
      { name: 'fn_marcar_asistencia', schema: 'as_turnos' },
      { name: 'fn_revertir_a_plan', schema: 'as_turnos' }
    ];
    
    for (const func of functionsToCheck) {
      try {
        const { rows } = await client.query(`
          SELECT COUNT(*) as count 
          FROM pg_proc 
          WHERE proname = $1 
          AND pronamespace = $2::regnamespace
        `, [func.name, func.schema]);
        tests.functions[`${func.schema}.${func.name}`] = parseInt(rows[0].count) > 0;
      } catch (err) {
        tests.functions[`${func.schema}.${func.name}`] = false;
      }
    }
    
    // Verificar estructura de as_turnos_pauta_mensual
    try {
      const { rows: columns } = await client.query(`
        SELECT column_name, data_type 
        FROM information_schema.columns 
        WHERE table_name = 'as_turnos_pauta_mensual'
        ORDER BY ordinal_position
      `);
      tests.sample_data.pauta_mensual_columns = columns;
    } catch (err) {
      tests.sample_data.pauta_mensual_columns = 'Error: ' + err;
    }
    
    // Verificar algunos datos de muestra
    try {
      const { rows: sample } = await client.query(`
        SELECT id, estado, meta, fecha
        FROM as_turnos_pauta_mensual
        WHERE estado != 'planificado'
        LIMIT 5
      `);
      tests.sample_data.pauta_mensual_sample = sample;
    } catch (err) {
      tests.sample_data.pauta_mensual_sample = 'Error: ' + err;
    }
    
    return Response.json({
      success: true,
      tests,
      message: 'Estructura de BD verificada'
    });
    
  } catch (error) {
    console.error('[test-db-structure] error:', error);
    return Response.json({
      success: false,
      error: error instanceof Error ? error.message : 'Error desconocido',
      stack: error instanceof Error ? error.stack : undefined
    }, { status: 500 });
  } finally {
    client.release?.();
  }
}
