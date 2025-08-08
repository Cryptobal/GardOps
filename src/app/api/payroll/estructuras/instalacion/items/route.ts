import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/database';

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
      // 1. Obtener o crear la estructura
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

      // 2. Validar que no haya solapamiento de vigencia para el mismo ítem
      const solapamientoQuery = `
        SELECT id 
        FROM sueldo_estructura_inst_item 
        WHERE estructura_id = $1 
          AND item_id = $2 
          AND activo = true
          AND (
            (vigencia_desde <= $3 AND (vigencia_hasta IS NULL OR vigencia_hasta >= $3))
            OR (vigencia_desde <= $4 AND (vigencia_hasta IS NULL OR vigencia_hasta >= $4))
            OR ($3 <= vigencia_desde AND ($4 IS NULL OR $4 >= vigencia_desde))
          )
      `;
      
      const solapamientoResult = await query(solapamientoQuery, [
        estructura.id, 
        item_id, 
        vigencia_desde, 
        vigencia_hasta || vigencia_desde
      ]);
      
      const solapamiento = Array.isArray(solapamientoResult) ? solapamientoResult : (solapamientoResult.rows || []);
      
      if (solapamiento.length > 0) {
        await query('ROLLBACK');
        return NextResponse.json(
          { success: false, error: 'Existe un solapamiento de vigencia para este ítem en la misma estructura' },
          { status: 400 }
        );
      }

      // 3. Insertar el ítem
      const insertItemQuery = `
        INSERT INTO sueldo_estructura_inst_item (
          estructura_id, item_id, monto, vigencia_desde, vigencia_hasta, activo
        ) VALUES ($1, $2, $3, $4, $5, true)
        RETURNING id
      `;
      
      const insertItemResult = await query(insertItemQuery, [
        estructura.id, 
        item_id, 
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
    console.error('Error agregando ítem a estructura:', error);
    return NextResponse.json(
      { success: false, error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}
