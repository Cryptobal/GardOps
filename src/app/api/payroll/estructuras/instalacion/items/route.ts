import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/database';

import { logger, devLogger, apiLogger } from '@/lib/utils/logger';
// POST - Agregar ítem a estructura de instalación
export async function POST(request: NextRequest) {
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
    await query('BEGIN');

    try {
      // 1. Validar que el ítem sea de tipo HÁBERES (no descuento)
      // Resolver item por tabla sueldo_item
      let itemRow;
      if (item_id && item_id.length === 36) {
        const r = await query(`SELECT id, codigo, nombre, clase, naturaleza FROM sueldo_item WHERE id = $1 AND activo = TRUE LIMIT 1`, [item_id]);
        itemRow = Array.isArray(r) ? r[0] : (r.rows || [])[0];
      } else {
        const r = await query(`SELECT id, codigo, nombre, clase, naturaleza FROM sueldo_item WHERE codigo = $1 AND activo = TRUE LIMIT 1`, [item_id]);
        itemRow = Array.isArray(r) ? r[0] : (r.rows || [])[0];
      }
      if (!itemRow) {
        await query('ROLLBACK');
        return NextResponse.json(
          { success: false, error: 'Ítem no encontrado o inactivo' },
          { status: 400 }
        );
      }
      if (String(itemRow.clase).toUpperCase() !== 'HABER') {
        await query('ROLLBACK');
        return NextResponse.json(
          { success: false, error: 'Solo se permiten ítems de tipo HÁBER en las estructuras de servicio' },
          { status: 400 }
        );
      }
      const itemCodigo = itemRow.codigo;

      // 2. Obtener o crear la estructura
      let estructuraQuery = `
        SELECT id, version 
        FROM sueldo_estructura_instalacion 
        WHERE instalacion_id = $1 AND rol_servicio_id = $2 AND activo = true
        ORDER BY version DESC, created_at DESC
        LIMIT 1
      `;
      
      let estructuraResult = await query(estructuraQuery, [instalacion_id, rol_servicio_id]);
      let estructura = Array.isArray(estructuraResult) ? estructuraResult[0] : (estructuraResult.rows || [])[0];

      if (!estructura) {
        // Crear nueva estructura
        const nuevaEstructuraQuery = `
          INSERT INTO sueldo_estructura_instalacion (
            instalacion_id, rol_servicio_id, version, vigencia_desde, activo
          ) VALUES ($1, $2, 1, $3, true)
          RETURNING id, version
        `;
        
        const nuevaEstructuraResult = await query(nuevaEstructuraQuery, [instalacion_id, rol_servicio_id, vigencia_desde]);
        estructura = Array.isArray(nuevaEstructuraResult) ? nuevaEstructuraResult[0] : (nuevaEstructuraResult.rows || [])[0];
      }

      // 3. Validar que no haya solapamiento de vigencia para el mismo ítem usando daterange
      const solapamientoQuery = `
        SELECT 1
        FROM sueldo_estructura_inst_item x
        WHERE x.estructura_id = $1
          AND x.item_codigo = $2
          AND x.activo = TRUE
          AND daterange(x.vigencia_desde, COALESCE(x.vigencia_hasta, 'infinity'::date), '[]') 
            && daterange($3::date, COALESCE($4::date, 'infinity'::date), '[]')
        LIMIT 1
      `;
      
      const solapamientoResult = await query(solapamientoQuery, [
        estructura.id, 
        itemCodigo, 
        vigencia_desde, 
        vigencia_hasta || null
      ]);
      
      const solapamiento = Array.isArray(solapamientoResult) ? solapamientoResult : (solapamientoResult.rows || []);
      
      if (solapamiento.length > 0) {
        await query('ROLLBACK');
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
      const insertItemQuery = `
        INSERT INTO sueldo_estructura_inst_item (
          estructura_id, item_codigo, item_nombre, item_clase, item_naturaleza, monto, vigencia_desde, vigencia_hasta, activo
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, true)
        RETURNING id
      `;
      
      const insertItemResult = await query(insertItemQuery, [
        estructura.id,
        itemRow.codigo,
        itemRow.nombre,
        itemRow.clase,
        itemRow.naturaleza,
        monto, 
        vigencia_desde, 
        vigencia_hasta || null
      ]);
      
      const nuevoItem = Array.isArray(insertItemResult) ? insertItemResult[0] : (insertItemResult.rows || [])[0];

      await query('COMMIT');

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
      await query('ROLLBACK');
      throw error;
    }

  } catch (error) {
    logger.error('Error agregando ítem a estructura::', error);
    return NextResponse.json(
      { success: false, error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}
