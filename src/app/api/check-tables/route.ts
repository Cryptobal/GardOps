import { NextRequest, NextResponse } from 'next/server';
import { query, checkConnection } from '@/lib/database';

export async function GET(request: NextRequest) {
  try {
    console.log('🔍 Verificando conexión a la base de datos...');
    
    // Verificar conexión
    const isConnected = await checkConnection();
    if (!isConnected) {
      return NextResponse.json(
        { error: 'No se pudo conectar a la base de datos' },
        { status: 500 }
      );
    }

    console.log('✅ Conexión exitosa, verificando tablas...');

    // Verificar tablas necesarias
    const tables = [
      'as_turnos_puestos_operativos',
      'as_turnos_roles_servicio',
      'guardias',
      'instalaciones'
    ];

    const tableStatus: Record<string, any> = {};

    for (const table of tables) {
      try {
        const result = await query(`
          SELECT EXISTS (
            SELECT FROM information_schema.tables 
            WHERE table_schema = 'public' 
            AND table_name = $1
          )
        `, [table]);
        
        tableStatus[table] = {
          exists: result.rows[0].exists,
          error: null
        };

        if (result.rows[0].exists) {
          // Verificar si tiene datos
          const countResult = await query(`SELECT COUNT(*) as count FROM ${table}`);
          tableStatus[table].count = parseInt(countResult.rows[0].count);
        }
      } catch (error) {
        tableStatus[table] = {
          exists: false,
          error: error instanceof Error ? error.message : 'Error desconocido'
        };
      }
    }

    return NextResponse.json({
      success: true,
      connection: 'OK',
      tables: tableStatus
    });

  } catch (error) {
    console.error('❌ Error verificando tablas:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor al verificar tablas' },
      { status: 500 }
    );
  }
} 