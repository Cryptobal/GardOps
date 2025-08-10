import { NextRequest } from 'next/server';
import { getClient } from '@/lib/database';
import { unstable_noStore as noStore } from 'next/cache';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  noStore();
  const client = await getClient();
  
  try {
    // Test de conexión y permisos
    const tests = {
      connection: false,
      tables: false,
      functions: false,
      permissions: false,
      guardias: []
    };
    
    // Test conexión
    const { rows: connTest } = await client.query('SELECT 1 as test');
    tests.connection = connTest.length > 0;
    
    // Test tablas
    const { rows: tableTest } = await client.query(`
      SELECT COUNT(*) as count 
      FROM information_schema.tables 
      WHERE table_name IN ('as_turnos_pauta_mensual', 'as_turnos_logs', 'sueldo_guardias')
    `);
    tests.tables = parseInt(tableTest[0].count) >= 3;
    
    // Test funciones
    const { rows: funcTest } = await client.query(`
      SELECT COUNT(*) as count 
      FROM pg_proc 
      WHERE proname = 'fn_marcar_asistencia' 
      AND pronamespace = 'as_turnos'::regnamespace
    `);
    tests.functions = parseInt(funcTest[0].count) > 0;
    
    // Test guardias para modal
    const { rows: guardias } = await client.query(`
      SELECT 
        id::text,
        nombres || ' ' || apellidos as nombre
      FROM sueldo_guardias
      WHERE activo = true
      ORDER BY nombres
      LIMIT 20
    `);
    tests.guardias = guardias;
    
    return Response.json({
      success: true,
      tests,
      message: 'Tests completados'
    });
    
  } catch (error) {
    console.error('[test-modal] error:', error);
    return Response.json({
      success: false,
      error: error instanceof Error ? error.message : 'Error desconocido',
      stack: error instanceof Error ? error.stack : undefined
    }, { status: 500 });
  } finally {
    client.release?.();
  }
}
