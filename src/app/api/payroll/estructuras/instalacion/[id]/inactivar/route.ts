import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import { requireAuthz } from '@/lib/authz-api';

import { logger, devLogger, apiLogger } from '@/lib/utils/logger';
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const maybeDeny = await requireAuthz(request as any, { resource: 'payroll', action: 'update' });
    if (maybeDeny && (maybeDeny as any).status === 403) return maybeDeny;
  } catch (_) {
    // permitir en desarrollo
  }

  try {
    const id = params.id;
    const { fecha_inactivacion } = await request.json();

    if (!fecha_inactivacion) {
      return NextResponse.json(
        { success: false, error: 'Fecha de inactivación es requerida' },
        { status: 400 }
      );
    }

    await sql`BEGIN`;

    try {
      // 1. Verificar que la estructura existe y está activa
      const estructuraResult = await sql`
        SELECT id, instalacion_id, rol_servicio_id, vigencia_desde, activo
        FROM sueldo_estructura_instalacion 
        WHERE id = ${id} AND activo = true
      `;
      
      const estructura = estructuraResult.rows[0];

      if (!estructura) {
        await sql`ROLLBACK`;
        return NextResponse.json(
          { success: false, error: 'Estructura no encontrada o ya inactiva' },
          { status: 404 }
        );
      }

      // Validar que la fecha de inactivación sea posterior a la fecha de vigencia desde
      const vigenciaDesde = new Date(estructura.vigencia_desde);
      const fechaInactivacion = new Date(fecha_inactivacion);
      
      if (fechaInactivacion <= vigenciaDesde) {
        await sql`ROLLBACK`;
        return NextResponse.json(
          { 
            success: false, 
            error: 'La fecha de inactivación debe ser posterior a la fecha de vigencia desde (' + vigenciaDesde.toISOString().split('T')[0] + ')' 
          },
          { status: 400 }
        );
      }

      // 2. Inactivar la estructura (soft delete)
      await sql`
        UPDATE sueldo_estructura_instalacion 
        SET activo = false, vigencia_hasta = ${fecha_inactivacion}, updated_at = NOW()
        WHERE id = ${id}
      `;

      // 3. Inactivar todos los ítems de la estructura
      await sql`
        UPDATE sueldo_estructura_inst_item 
        SET activo = false, vigencia_hasta = ${fecha_inactivacion}, updated_at = NOW()
        WHERE estructura_id = ${id} AND activo = true
      `;

      await sql`COMMIT`;

      return NextResponse.json({
        success: true,
        message: 'Estructura inactivada correctamente',
        data: {
          fecha_inactivacion,
          estructura_id: id
        }
      });

    } catch (error) {
      await sql`ROLLBACK`;
      throw error;
    }

  } catch (error) {
    logger.error('Error inactivando estructura::', error);
    return NextResponse.json(
      { success: false, error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}
