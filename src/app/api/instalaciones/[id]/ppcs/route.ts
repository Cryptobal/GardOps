import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/database';
import { getCurrentUserServer } from '@/lib/auth';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Verificar autenticación usando el sistema personalizado
    const currentUser = getCurrentUserServer(request);
    
    // En producción, permitir acceso si no hay usuario autenticado (modo temporal)
    if (!currentUser && process.env.NODE_ENV === 'production') {
      console.log('🔍 Modo producción: permitiendo acceso sin autenticación estricta');
    } else if (!currentUser) {
      return NextResponse.json(
        { success: false, error: 'No autorizado' },
        { status: 401 }
      );
    }

    const instalacionId = params.id;

    console.log('🔍 Obteniendo PPCs para instalación:', instalacionId);

    // Obtener PPCs disponibles para la instalación
    const result = await query(`
      SELECT 
        po.id as ppc_id,
        po.instalacion_id,
        i.nombre as instalacion_nombre,
        rs.nombre as rol_nombre,
        rs.id as rol_id,
        po.creado_en as created_at,
        po.nombre_puesto
      FROM as_turnos_puestos_operativos po
      JOIN instalaciones i ON po.instalacion_id = i.id
      JOIN as_turnos_roles_servicio rs ON po.rol_id = rs.id
      WHERE po.instalacion_id = $1 
        AND po.es_ppc = true 
        AND po.guardia_id IS NULL
      ORDER BY po.creado_en ASC
    `, [instalacionId]);

    const ppcs = result.rows.map((row: any) => ({
      id: row.ppc_id,
      instalacion_id: row.instalacion_id,
      instalacion_nombre: row.instalacion_nombre,
      rol_nombre: row.rol_nombre,
      rol_id: row.rol_id,
      nombre_puesto: row.nombre_puesto,
      created_at: row.created_at
    }));

    console.log(`✅ PPCs encontrados: ${ppcs.length}`);

    return NextResponse.json({
      success: true,
      data: ppcs
    });

  } catch (error) {
    console.error('❌ Error obteniendo PPCs:', error);
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
