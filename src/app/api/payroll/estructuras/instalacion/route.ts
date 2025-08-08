import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/database';

// GET - Obtener estructura de servicio por instalación y rol
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const instalacionId = searchParams.get('instalacion_id');
    const rolServicioId = searchParams.get('rol_servicio_id');

    if (!instalacionId || !rolServicioId) {
      return NextResponse.json(
        { success: false, error: 'instalacion_id y rol_servicio_id son requeridos' },
        { status: 400 }
      );
    }

    // Obtener la estructura activa más reciente
    const estructuraQuery = `
      SELECT 
        sei.id,
        sei.instalacion_id,
        i.nombre as instalacion_nombre,
        sei.rol_servicio_id,
        rs.nombre as rol_nombre,
        sei.version,
        sei.vigencia_desde,
        sei.activo
      FROM sueldo_estructura_instalacion sei
      INNER JOIN instalaciones i ON sei.instalacion_id = i.id
      INNER JOIN as_turnos_roles_servicio rs ON sei.rol_servicio_id = rs.id
      WHERE sei.instalacion_id = $1 
        AND sei.rol_servicio_id = $2 
        AND sei.activo = true
      ORDER BY sei.version DESC, sei.created_at DESC
      LIMIT 1
    `;

    const estructuraResult = await query(estructuraQuery, [instalacionId, rolServicioId]);
    const estructura = Array.isArray(estructuraResult) ? estructuraResult[0] : (estructuraResult.rows || [])[0];

    if (!estructura) {
      return NextResponse.json(
        { success: false, error: 'No se encontró una estructura activa para esta instalación y rol' },
        { status: 404 }
      );
    }

    // Obtener los ítems de la estructura
    const itemsQuery = `
      SELECT 
        seii.id,
        seii.estructura_id,
        seii.item_id,
        si.nombre as item_nombre,
        si.codigo as item_codigo,
        si.clase as item_clase,
        si.naturaleza as item_naturaleza,
        seii.monto,
        seii.vigencia_desde,
        seii.vigencia_hasta,
        seii.activo
      FROM sueldo_estructura_inst_item seii
      INNER JOIN sueldo_item si ON seii.item_id = si.id
      WHERE seii.estructura_id = $1
      ORDER BY si.clase DESC, si.nombre
    `;

    const itemsResult = await query(itemsQuery, [estructura.id]);
    const items = Array.isArray(itemsResult) ? itemsResult : (itemsResult.rows || []);

    return NextResponse.json({
      success: true,
      data: {
        ...estructura,
        items
      }
    });
  } catch (error) {
    console.error('Error obteniendo estructura de instalación:', error);
    return NextResponse.json(
      { success: false, error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}
