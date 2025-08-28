import { requireAuthz } from '@/lib/authz-api'
import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/database';

// GET - Obtener todos los guardias disponibles
export async function GET(request: NextRequest) {
  console.log('🔍 GET /api/payroll/guardias - Iniciando...');
  
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
    // Obtener todos los guardias activos
    const guardiasQuery = `
      SELECT 
        g.id,
        g.nombre,
        g.apellido_paterno,
        g.apellido_materno,
        g.rut,
        g.activo,
        CONCAT(g.nombre, ' ', g.apellido_paterno, ' ', g.apellido_materno) as nombre_completo
      FROM guardias g
      WHERE g.activo = true
      ORDER BY g.nombre, g.apellido_paterno
    `;

    console.log('📊 Ejecutando consulta de guardias...');
    
    const result = await query(guardiasQuery);

    console.log('📊 Guardias encontrados:', result.rows?.length || 0);

    const response = {
      success: true,
      data: result.rows || []
    };

    console.log('✅ Enviando respuesta exitosa');
    return NextResponse.json(response);

  } catch (error) {
    console.error('Error al obtener guardias:', error);
    return NextResponse.json(
      { success: false, error: 'Error interno del servidor: ' + (error as Error).message },
      { status: 500 }
    );
  }
}
