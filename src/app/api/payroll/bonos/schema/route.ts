import { requireAuthz } from '@/lib/authz-api'
import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/database';

// GET - Obtener esquema de la tabla sueldo_bonos_globales
export async function GET(request: NextRequest) {
  console.log('🔍 GET /api/payroll/bonos/schema - Iniciando...');
  
  try {
    const maybeDeny = await requireAuthz(request as any, { resource: 'payroll', action: 'read:list' });
    if (maybeDeny && (maybeDeny as any).status === 403) {
      console.log('❌ Acceso denegado por permisos');
      return maybeDeny;
    }
    console.log('✅ Permisos verificados correctamente');
  } catch (error) {
    console.log('⚠️ Error verificando permisos:', error);
  }

  try {
    // Verificar si existe la tabla
    const checkTable = await query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'sueldo_bonos_globales'
      )
    `);

    let response: any = {
      success: true,
      data: {
        tabla_existe: checkTable.rows[0].exists
      }
    };

    if (checkTable.rows[0].exists) {
      // Obtener estructura de la tabla
      const estructura = await query(`
        SELECT column_name, data_type, is_nullable, column_default
        FROM information_schema.columns 
        WHERE table_name = 'sueldo_bonos_globales'
        ORDER BY ordinal_position
      `);

      // Obtener algunos registros
      const registros = await query(`
        SELECT * FROM sueldo_bonos_globales LIMIT 5
      `);

      response.data.estructura = estructura.rows;
      response.data.registros = registros.rows;
      response.data.total_registros = registros.rows.length;
    }

    return NextResponse.json(response);

  } catch (error) {
    console.error('Error obteniendo esquema de bonos:', error);
    return NextResponse.json(
      { success: false, error: 'Error interno del servidor: ' + (error as Error).message },
      { status: 500 }
    );
  }
}

