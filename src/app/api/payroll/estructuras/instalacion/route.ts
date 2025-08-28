import { requireAuthz } from '@/lib/authz-api'
import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';

// GET - Obtener estructura de servicio por instalación y rol
export async function GET(request: NextRequest) {
  try {
    const maybeDeny = await requireAuthz(request as any, { resource: 'payroll', action: 'read:list' });
    if (maybeDeny && (maybeDeny as any).status === 403) return maybeDeny;
  } catch (_) {
    // permitir en desarrollo
  }

  try {
    const { searchParams } = new URL(request.url);
    const instalacionId = searchParams.get('instalacion_id');
    const rolServicioId = searchParams.get('rol_servicio_id');
    const anio = searchParams.get('anio');
    const mes = searchParams.get('mes');
    const includeInactive = searchParams.get('include_inactive') === 'true';
    const byId = searchParams.get('id');

    if (byId) {
      // Fetch specific structure by id (active or inactive) and its items
      const estructuraById = await sql`
        SELECT 
          sei.id,
          sei.instalacion_id,
          i.nombre as instalacion_nombre,
          sei.rol_servicio_id,
          r.nombre as rol_nombre,
          sei.version,
          sei.vigencia_desde,
          sei.vigencia_hasta,
          sei.activo
        FROM sueldo_estructura_instalacion sei
        INNER JOIN instalaciones i ON sei.instalacion_id = i.id
        INNER JOIN as_turnos_roles_servicio r ON sei.rol_servicio_id = r.id
        WHERE sei.id = ${byId}
        LIMIT 1
      `;
      const estructura = estructuraById.rows[0];
      if (!estructura) {
        return NextResponse.json({ success: true, data: { estructura: null, items: [] } });
      }

      // Detect schema
      let items;
      const colsRes = await sql`SELECT column_name FROM information_schema.columns WHERE table_name = 'sueldo_estructura_inst_item'`;
      const cols = new Set(colsRes.rows.map((r: any) => r.column_name));
      const hasItemCodigo = cols.has('item_codigo');

      if (hasItemCodigo) {
        const itemsResult = await sql`
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
          WHERE seii.estructura_id = ${estructura.id}
          ORDER BY seii.item_codigo
        `;
        items = itemsResult.rows;
      } else {
        const itemsResult = await sql`
          SELECT 
            seii.id,
            seii.estructura_id,
            seii.item_id as item_id,
            si.nombre as item_nombre,
            si.codigo as item_codigo,
            si.clase as item_clase,
            si.naturaleza as item_naturaleza,
            seii.monto,
            seii.vigencia_desde,
            seii.vigencia_hasta,
            seii.activo
          FROM sueldo_estructura_inst_item seii
          LEFT JOIN sueldo_item si ON si.id = seii.item_id
          WHERE seii.estructura_id = ${estructura.id}
          ORDER BY si.codigo NULLS LAST
        `;
        items = itemsResult.rows;
      }

      return NextResponse.json({ success: true, data: { estructura, items } });
    }

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
    const estructuraResult = await sql`
      SELECT 
        sei.id,
        sei.instalacion_id,
        i.nombre as instalacion_nombre,
        sei.rol_servicio_id,
        r.nombre as rol_nombre,
        sei.version,
        sei.vigencia_desde,
        sei.vigencia_hasta,
        sei.activo
      FROM sueldo_estructura_instalacion sei
      INNER JOIN instalaciones i ON sei.instalacion_id = i.id
      INNER JOIN as_turnos_roles_servicio r ON sei.rol_servicio_id = r.id
      WHERE sei.instalacion_id = ${instalacionId}
        AND sei.rol_servicio_id = ${rolServicioId}
        AND sei.activo = true
        AND sei.vigencia_desde <= ${fechaCorte.toISOString().split('T')[0]}
        AND (sei.vigencia_hasta IS NULL OR ${fechaCorte.toISOString().split('T')[0]} <= sei.vigencia_hasta)
      ORDER BY sei.vigencia_desde DESC
      LIMIT 1
    `;
    const estructura = estructuraResult.rows[0];

    if (!estructura) {
      return NextResponse.json(
        { success: true, data: { estructura: null, items: [] } }
      );
    }

    // Obtener ítems de la estructura (soporta ambos esquemas: con item_codigo o con item_id)
    let items;
    const colsRes = await sql`SELECT column_name FROM information_schema.columns WHERE table_name = 'sueldo_estructura_inst_item'`;
    const cols = new Set(colsRes.rows.map((r: any) => r.column_name));
    const hasItemCodigo = cols.has('item_codigo');

    if (hasItemCodigo) {
      // Esquema nuevo: los metadatos del item están denormalizados en la tabla
      if (includeInactive) {
        const itemsResult = await sql`
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
          WHERE seii.estructura_id = ${estructura.id}
          ORDER BY seii.item_codigo
        `;
        items = itemsResult.rows;
      } else {
        const itemsResult = await sql`
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
          WHERE seii.estructura_id = ${estructura.id}
            AND seii.activo = TRUE
          ORDER BY seii.item_codigo
        `;
        items = itemsResult.rows;
      }
    } else {
      // Esquema original: joinear con sueldo_item para obtener metadata
      if (includeInactive) {
        const itemsResult = await sql`
          SELECT 
            seii.id,
            seii.estructura_id,
            seii.item_id as item_id,
            si.nombre as item_nombre,
            si.codigo as item_codigo,
            si.clase as item_clase,
            si.naturaleza as item_naturaleza,
            seii.monto,
            seii.vigencia_desde,
            seii.vigencia_hasta,
            seii.activo
          FROM sueldo_estructura_inst_item seii
          LEFT JOIN sueldo_item si ON si.id = seii.item_id
          WHERE seii.estructura_id = ${estructura.id}
          ORDER BY si.codigo NULLS LAST
        `;
        items = itemsResult.rows;
      } else {
        const itemsResult = await sql`
          SELECT 
            seii.id,
            seii.estructura_id,
            seii.item_id as item_id,
            si.nombre as item_nombre,
            si.codigo as item_codigo,
            si.clase as item_clase,
            si.naturaleza as item_naturaleza,
            seii.monto,
            seii.vigencia_desde,
            seii.vigencia_hasta,
            seii.activo
          FROM sueldo_estructura_inst_item seii
          LEFT JOIN sueldo_item si ON si.id = seii.item_id
          WHERE seii.estructura_id = ${estructura.id}
            AND seii.activo = TRUE
          ORDER BY si.codigo NULLS LAST
        `;
        items = itemsResult.rows;
      }
    }

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
