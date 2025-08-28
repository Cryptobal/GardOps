import { requireAuthz } from '@/lib/authz-api'
import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';

interface UpdateBody {
  vigencia_hasta?: string; // YYYY-MM-DD
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { estructura_id: string } }
) {
  try {
    const maybeDeny = await requireAuthz(request as any, { resource: 'payroll', action: 'update' });
    if (maybeDeny && (maybeDeny as any).status === 403) return maybeDeny;
  } catch (_) {
    // permitir en desarrollo
  }

  try {
    const { estructura_id } = params;
    const body = (await request.json()) as UpdateBody;
    const { vigencia_hasta } = body;

    // Validar que la estructura existe
    const estructuraRes = await sql`
      SELECT id, activo, vigencia_desde, vigencia_hasta
      FROM sueldo_estructura_instalacion
      WHERE id = ${estructura_id}
    `;
    
    if (!estructuraRes.rows || estructuraRes.rows.length === 0) {
      return NextResponse.json({ error: 'Estructura no encontrada' }, { status: 404 });
    }

    const estructura = estructuraRes.rows[0];

    // Actualizar la estructura
    if (vigencia_hasta !== undefined) {
      // Validar que la fecha de vigencia_hasta sea posterior a vigencia_desde
      if (new Date(vigencia_hasta) <= new Date(estructura.vigencia_desde)) {
        return NextResponse.json({ 
          error: 'La fecha de vigencia_hasta debe ser posterior a la fecha de vigencia_desde' 
        }, { status: 400 });
      }

      const result = await sql`
        UPDATE sueldo_estructura_instalacion 
        SET vigencia_hasta = ${vigencia_hasta}::date, updated_at = NOW()
        WHERE id = ${estructura_id}
      `;

      if (result.rowCount === 0) {
        return NextResponse.json({ error: 'No se pudo actualizar la estructura' }, { status: 500 });
      }
    }

    return NextResponse.json({ 
      success: true, 
      message: 'Estructura actualizada correctamente' 
    });

  } catch (error: any) {
    console.error('Error actualizando estructura:', error);
    return NextResponse.json({ 
      error: error?.message || 'Error interno del servidor' 
    }, { status: 500 });
  }
}

// DELETE: eliminar estructura de servicio
export async function DELETE(
  request: NextRequest,
  { params }: { params: { estructura_id: string } }
) {
  const deny = await requireAuthz(request as any, { resource: 'payroll', action: 'delete' });
  if (deny) return deny;

  try {
    const { estructura_id } = params;

    // Verificar que la estructura existe
    const estructuraResult = await sql`
      SELECT id, instalacion_id, rol_servicio_id 
      FROM sueldo_estructura_instalacion 
      WHERE id = ${estructura_id}
      LIMIT 1
    `;

    if (estructuraResult.rows.length === 0) {
      return NextResponse.json({ error: 'Estructura no encontrada' }, { status: 404 });
    }

    // Eliminar todos los items de la estructura
    await sql`
      DELETE FROM sueldo_estructura_inst_item 
      WHERE estructura_id = ${estructura_id}
    `;

    // Eliminar la estructura
    await sql`
      DELETE FROM sueldo_estructura_instalacion 
      WHERE id = ${estructura_id}
    `;

    return NextResponse.json({ 
      success: true, 
      message: 'Estructura eliminada correctamente' 
    });

  } catch (error) {
    console.error('Error eliminando estructura:', error);
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
  }
}
