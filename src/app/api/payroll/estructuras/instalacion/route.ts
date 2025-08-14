import { requireAuthz } from '@/lib/authz-api'
import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/database';

// GET - Obtener estructura de servicio por instalación y rol
export async function GET(request: NextRequest) {
const __req = (typeof req!== 'undefined' ? req : (typeof request !== 'undefined' ? request : (arguments as any)[0]));
const deny = await requireAuthz(__req as any, { resource: 'payroll', action: 'read:list' });
if (deny) return deny;

  try {
    const { searchParams } = new URL(request.url);
    const instalacionId = searchParams.get('instalacion_id');
    const rolServicioId = searchParams.get('rol_servicio_id');
    const anio = searchParams.get('anio');
    const mes = searchParams.get('mes');

    if (!instalacionId || !rolServicioId) {
      return NextResponse.json(
        { success: false, error: 'instalacion_id y rol_servicio_id son requeridos' },
        { status: 400 }
      );
    }

    // Calcular fecha de corte para buscar estructura vigente
    let fechaCorte = new Date();
    if (anio && mes) {
      fechaCorte = new Date(parseInt(anio), parseInt(mes) - 1, 1);
    }

    // Obtener la estructura vigente en la fecha de corte
    const estructuraQuery = `
      SELECT 
        sei.id,
        sei.instalacion_id,
        i.nombre as instalacion_nombre,
        sei.rol_servicio_id,
        r.name as rol_nombre,
        sei.version,
        sei.vigencia_desde,
        sei.vigencia_hasta,
        sei.activo
      FROM sueldo_estructura_instalacion sei
      INNER JOIN instalaciones i ON sei.instalacion_id = i.id
      INNER JOIN roles r ON sei.rol_servicio_id = r.id
      WHERE sei.instalacion_id = $1 
        AND sei.rol_servicio_id = $2 
        AND sei.activo = true
        AND sei.vigencia_desde <= $3
        AND (sei.vigencia_hasta IS NULL OR $3 <= sei.vigencia_hasta)
      ORDER BY sei.vigencia_desde DESC
      LIMIT 1
    `;

    const estructuraResult = await query(estructuraQuery, [instalacionId, rolServicioId, fechaCorte.toISOString().split('T')[0]]);
    const estructura = Array.isArray(estructuraResult) ? estructuraResult[0] : (estructuraResult.rows || [])[0];

    if (!estructura) {
      return NextResponse.json(
        { success: true, data: { estructura: null, items: [] } }
      );
    }

    // Obtener los ítems de la estructura vigentes al primer día del mes
    let itemsQuery = `
      SELECT 
        seii.id,
        seii.estructura_id,
        seii.item_codigo as item_id,
        seii.item_nombre,
        seii.item_codigo,
        seii.item_clase,
        seii.item_naturaleza,
        seii.monto,
        seii.vigencia_desde,
        seii.vigencia_hasta,
        seii.activo
      FROM sueldo_estructura_inst_item seii
      WHERE seii.estructura_id = $1
        AND seii.activo = TRUE
    `;
    
    const queryParams = [estructura.id];
    
    // Si se proporcionan año y mes, filtrar por vigencia
    if (anio && mes) {
      const primerDiaMes = `${anio}-${mes.toString().padStart(2, '0')}-01`;
      itemsQuery += `
        AND (seii.vigencia_desde <= $2)
        AND (seii.vigencia_hasta IS NULL OR $2 <= seii.vigencia_hasta)
      `;
      queryParams.push(primerDiaMes);
    }
    
    itemsQuery += ` ORDER BY seii.item_codigo`;

    const itemsResult = await query(itemsQuery, queryParams);
    const items = Array.isArray(itemsResult) ? itemsResult : (itemsResult.rows || []);

    return NextResponse.json({
      success: true,
      data: {
        estructura: estructura,
        items: items
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
