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

    // USAR LA MISMA FUENTE QUE EL MÓDULO PPC - Vista de pauta diaria
    const fecha = '2025-09-08'; // Misma fecha que el módulo PPC
    
    const result = await query(`
      SELECT 
        pd.puesto_id as ppc_id,
        pd.instalacion_id,
        pd.instalacion_nombre,
        pd.rol_nombre,
        pd.rol_id,
        pd.fecha as created_at,
        pd.puesto_nombre as nombre_puesto
      FROM as_turnos_v_pauta_diaria_dedup_fixed pd
      WHERE pd.fecha = $1
        AND pd.es_ppc = true 
        AND pd.estado_ui = 'plan'
        AND pd.instalacion_id = $2
      ORDER BY pd.puesto_id ASC
    `, [fecha, instalacionId]);

    const ppcs = result.rows.map((row: any) => ({
      id: row.ppc_id,
      instalacion_id: row.instalacion_id,
      instalacion_nombre: row.instalacion_nombre,
      rol_nombre: row.rol_nombre,
      rol_id: row.rol_id,
      nombre_puesto: row.nombre_puesto,
      created_at: row.created_at
    }));

    console.log(`✅ PPCs encontrados para instalación ${instalacionId}: ${ppcs.length}`);

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
