import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/database';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const checkStructure = searchParams.get('structure') === 'true';
    
    const tables = [
      'guardias',
      'instalaciones',
      'usuarios',
      'as_turnos_puestos_operativos',
      'as_turnos_roles_servicio',
      'logs_guardias',
      'logs_instalaciones',
      'logs_clientes',
      'logs_pauta_mensual',
      'logs_pauta_diaria',
      'logs_turnos_extras',
      'logs_puestos_operativos',
      'logs_documentos',
      'logs_usuarios',
      'TE_planillas_turnos_extras',
      'TE_planilla_turno_relacion',
      'TE_turnos_extras'
    ];

    const results: any = {};
    let connectionOk = false;

    try {
      await query('SELECT 1');
      connectionOk = true;
    } catch (error) {
      console.error('Error de conexión:', error);
    }

    for (const table of tables) {
      try {
        const result = await query(`SELECT COUNT(*) as count FROM ${table}`);
        results[table] = {
          exists: true,
          error: null,
          count: parseInt(result.rows[0].count)
        };

        // Si se solicita verificar estructura, obtener las columnas
        if (checkStructure && table.startsWith('logs_')) {
          try {
            const columnsResult = await query(`
              SELECT column_name, data_type, is_nullable
              FROM information_schema.columns 
              WHERE table_name = $1 
              ORDER BY ordinal_position
            `, [table]);
            
            results[table].columns = columnsResult.rows;
          } catch (error) {
            results[table].columnsError = error instanceof Error ? error.message : 'Error desconocido';
          }
        }
      } catch (error) {
        results[table] = {
          exists: false,
          error: error instanceof Error ? error.message : 'Error desconocido',
          count: 0
        };
      }
    }

    return NextResponse.json({
      success: true,
      connection: connectionOk ? 'OK' : 'ERROR',
      tables: results
    });

  } catch (error) {
    console.error('Error verificando tablas:', error);
    return NextResponse.json(
      { 
        success: false,
        error: 'Error interno del servidor',
        details: error instanceof Error ? error.message : 'Error desconocido'
      },
      { status: 500 }
    );
  }
} 