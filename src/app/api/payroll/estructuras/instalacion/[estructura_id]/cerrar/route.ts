import { requireAuthz } from '@/lib/authz-api'
import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/database';

export async function PATCH(
  request: NextRequest,
  {

 params }: { params: { id: string } }
) {
  try {
    const estructuraId = params.id;
    const { vigencia_hasta } = await request.json();

    if (!vigencia_hasta) {
      return NextResponse.json(
        { success: false, error: 'vigencia_hasta es requerido' },
        { status: 400 }
      );
    }

    // Validar formato de fecha
    const fechaHasta = new Date(vigencia_hasta);
    if (isNaN(fechaHasta.getTime())) {
      return NextResponse.json(
        { success: false, error: 'Formato de fecha inválido' },
        { status: 400 }
      );
    }

    await query('BEGIN');

    try {
      // 1. Obtener la estructura actual
      const estructuraQuery = `
        SELECT id, instalacion_id, rol_servicio_id, vigencia_desde, vigencia_hasta
        FROM sueldo_estructura_instalacion 
        WHERE id = $1 AND activo = true
      `;
      
      const estructuraResult = await query(estructuraQuery, [estructuraId]);
      const estructura = Array.isArray(estructuraResult) ? estructuraResult[0] : (estructuraResult.rows || [])[0];

      if (!estructura) {
        await query('ROLLBACK');
        return NextResponse.json(
          { success: false, error: 'Estructura no encontrada' },
          { status: 404 }
        );
      }

      // 2. Validar que vigencia_hasta >= vigencia_desde
      if (fechaHasta < new Date(estructura.vigencia_desde)) {
        await query('ROLLBACK');
        return NextResponse.json(
          { success: false, error: 'La fecha de cierre debe ser posterior o igual a la fecha de inicio' },
          { status: 400 }
        );
      }

      // 3. Actualizar vigencia_hasta
      const updateQuery = `
        UPDATE sueldo_estructura_instalacion 
        SET vigencia_hasta = $1, updated_at = NOW()
        WHERE id = $2
      `;
      
      await query(updateQuery, [vigencia_hasta, estructuraId]);

      await query('COMMIT');

      return NextResponse.json({
        success: true,
        data: {
          id: estructuraId,
          vigencia_desde: estructura.vigencia_desde,
          vigencia_hasta: vigencia_hasta
        },
        message: 'Estructura cerrada correctamente'
      });

    } catch (error: any) {
      await query('ROLLBACK');
      
      // Capturar error de constraint de exclusión
      if (error.code === '23P01') {
        return NextResponse.json(
          { 
            success: false, 
            error: 'La fecha de cierre genera un solapamiento con otra estructura existente',
            code: 'OVERLAP'
          },
          { status: 409 }
        );
      }
      
      throw error;
    }

  } catch (error) {
    console.error('Error cerrando estructura de instalación:', error);
    return NextResponse.json(
      { success: false, error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}
