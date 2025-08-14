import { requireAuthz } from '@/lib/authz-api'
import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@vercel/postgres';

export async function GET(request: NextRequest) {
const __req = (typeof req!== 'undefined' ? req : (typeof request !== 'undefined' ? request : (arguments as any)[0]));
const deny = await requireAuthz(__req as any, { resource: 'payroll', action: 'read:list' });
if (deny) return deny;

  try {
    const { searchParams } = new URL(request.url);
    const instalacion_id = searchParams.get('instalacion_id');
    const rol_id = searchParams.get('rol_id');
    const anio = searchParams.get('anio');
    const mes = searchParams.get('mes');

    if (!instalacion_id || !rol_id || !anio || !mes) {
      return NextResponse.json(
        { error: 'Faltan parámetros requeridos: instalacion_id, rol_id, anio, mes' },
        { status: 400 }
      );
    }

    // Validar formato de año y mes
    const anioNum = parseInt(anio);
    const mesNum = parseInt(mes);
    
    if (isNaN(anioNum) || isNaN(mesNum) || mesNum < 1 || mesNum > 12) {
      return NextResponse.json(
        { error: 'Formato inválido para año o mes' },
        { status: 400 }
      );
    }

    // Buscar estructura de servicio vigente
    const estructuraResult = await sql`
      SELECT id, instalacion_id, rol_servicio_id as rol_id, vigencia_desde, vigencia_hasta
      FROM sueldo_estructura_servicio
      WHERE instalacion_id = ${instalacion_id}
        AND rol_servicio_id = ${rol_id}
        AND vigencia_desde <= make_date(${anioNum}, ${mesNum}, 1)
        AND (vigencia_hasta IS NULL OR make_date(${anioNum}, ${mesNum}, 1) <= vigencia_hasta)
      ORDER BY vigencia_desde DESC
      LIMIT 1;
    `;

    if (estructuraResult.rows.length === 0) {
      return NextResponse.json(
        { error: 'No hay estructura de servicio vigente para el período especificado' },
        { status: 404 }
      );
    }

    const estructura = estructuraResult.rows[0];

    // Buscar líneas vigentes (solo HABERES)
    const lineasResult = await sql`
      SELECT sitem.id, sitem.item_id, si.codigo, si.nombre, si.clase, si.naturaleza,
             sitem.monto, sitem.vigencia_desde, sitem.vigencia_hasta, sitem.activo
      FROM sueldo_estructura_servicio_item sitem
      JOIN sueldo_item si ON si.id = sitem.item_id
      WHERE sitem.estructura_servicio_id = ${estructura.id}
        AND sitem.activo = TRUE
        AND si.clase = 'HABER'
        AND sitem.vigencia_desde <= make_date(${anioNum}, ${mesNum}, 1)
        AND (sitem.vigencia_hasta IS NULL OR make_date(${anioNum}, ${mesNum}, 1) <= sitem.vigencia_hasta)
      ORDER BY si.codigo;
    `;

    return NextResponse.json({
      ...estructura,
      lineas: lineasResult.rows
    });

  } catch (error) {
    console.error('Error al obtener estructura de servicio vigente:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}
