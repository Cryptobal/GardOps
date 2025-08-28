import { requireAuthz } from '@/lib/authz-api'
import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';

// POST - Agregar ítem a estructura de instalación
export async function POST(request: NextRequest) {
  try {
    const maybeDeny = await requireAuthz(request as any, { resource: 'payroll', action: 'create' });
    if (maybeDeny && (maybeDeny as any).status === 403) return maybeDeny;
  } catch (_) {
    // permitir en desarrollo
  }

  try {
    const body = await request.json();
    const { 
      instalacion_id, 
      rol_servicio_id, 
      item_id, 
      monto, 
      vigencia_desde, 
      vigencia_hasta 
    } = body;

    // Validar datos requeridos
    if (!instalacion_id || !rol_servicio_id || !item_id || monto === undefined || !vigencia_desde) {
      return NextResponse.json(
        { success: false, error: 'Faltan datos requeridos' },
        { status: 400 }
      );
    }

    // Iniciar transacción
    await sql`BEGIN`;

    try {
      // 1. Validar que el ítem sea de tipo HÁBERES (no descuento)
      // Resolver item por tabla sueldo_item
      let itemRow;
      if (item_id && item_id.length === 36) {
        const r = await sql`SELECT id, codigo, nombre, clase, naturaleza FROM sueldo_item WHERE id = ${item_id} AND activo = TRUE LIMIT 1`;
        itemRow = r.rows[0];
      } else {
        const r = await sql`SELECT id, codigo, nombre, clase, naturaleza FROM sueldo_item WHERE codigo = ${item_id} AND activo = TRUE LIMIT 1`;
        itemRow = r.rows[0];
      }
      if (!itemRow) {
        await sql`ROLLBACK`;
        return NextResponse.json(
          { success: false, error: 'Ítem no encontrado o inactivo' },
          { status: 400 }
        );
      }
      if (String(itemRow.clase).toUpperCase() !== 'HABER') {
        await sql`ROLLBACK`;
        return NextResponse.json(
          { success: false, error: 'Solo se permiten ítems de tipo HÁBER en las estructuras de servicio' },
          { status: 400 }
        );
      }
      const itemCodigo = itemRow.codigo;

      // 2. Obtener o crear la estructura
      let estructuraResult = await sql`
        SELECT id, version 
        FROM sueldo_estructura_instalacion 
        WHERE instalacion_id = ${instalacion_id} AND rol_servicio_id = ${rol_servicio_id} AND activo = true
        ORDER BY version DESC, created_at DESC
        LIMIT 1
      `;
      let estructura = estructuraResult.rows[0];

      if (!estructura) {
        // Crear nueva estructura
        const nuevaEstructuraResult = await sql`
          INSERT INTO sueldo_estructura_instalacion (
            instalacion_id, rol_servicio_id, version, vigencia_desde, activo
          ) VALUES (${instalacion_id}, ${rol_servicio_id}, 1, ${vigencia_desde}, true)
          RETURNING id, version
        `;
        estructura = nuevaEstructuraResult.rows[0];
      }

      // 3. Validar que no haya solapamiento de vigencia para el mismo ítem usando daterange
      const solapamientoResult = await sql`
        SELECT 1
        FROM sueldo_estructura_inst_item x
        WHERE x.estructura_id = ${estructura.id}
          AND x.item_id = ${itemRow.id}
          AND x.activo = TRUE
          AND daterange(x.vigencia_desde, COALESCE(x.vigencia_hasta, 'infinity'::date), '[]') 
            && daterange(${vigencia_desde}::date, COALESCE(${vigencia_hasta || null}::date, 'infinity'::date), '[]')
        LIMIT 1
      `;
      
      const solapamiento = solapamientoResult.rows;
      
      if (solapamiento.length > 0) {
        await sql`ROLLBACK`;
        return NextResponse.json(
          { 
            success: false, 
            error: 'Este ítem ya tiene una vigencia que se cruza con el período especificado',
            code: 'ITEM_OVERLAP'
          },
          { status: 409 }
        );
      }

      // 3. Insertar el ítem
      const insertItemResult = await sql`
        INSERT INTO sueldo_estructura_inst_item (
          estructura_id, item_id, monto, vigencia_desde, vigencia_hasta, activo
        ) VALUES (${estructura.id}, ${itemRow.id}, ${monto}, ${vigencia_desde}, ${vigencia_hasta || null}, true)
        RETURNING id
      `;
      
      const nuevoItem = insertItemResult.rows[0];

      await sql`COMMIT`;

      return NextResponse.json({
        success: true,
        data: {
          id: nuevoItem.id,
          estructura_id: estructura.id,
          item_id,
          monto,
          vigencia_desde,
          vigencia_hasta,
          activo: true
        },
        message: 'Ítem agregado correctamente a la estructura'
      });

    } catch (error) {
      await sql`ROLLBACK`;
      throw error;
    }

  } catch (error) {
    console.error('Error agregando ítem a estructura:', error);
    return NextResponse.json(
      { success: false, error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}
