import { requireAuthz } from '@/lib/authz-api'
import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';

// PUT: actualizar monto del sueldo base de una estructura
export async function PUT(
  request: NextRequest,
  { params }: { params: { estructura_id: string } }
) {
  const deny = await requireAuthz(request as any, { resource: 'payroll', action: 'update' });
  if (deny) return deny;

  try {
    const { estructura_id } = params;
    const body = await request.json();
    const { monto } = body || {};

    if (monto === undefined || monto === null) {
      return NextResponse.json({ error: 'monto es requerido' }, { status: 400 });
    }

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

    // Obtener el ID del item sueldo_base
    const sueldoBaseItemResult = await sql`
      SELECT id FROM sueldo_item 
      WHERE codigo = 'sueldo_base' 
      LIMIT 1
    `;

    if (sueldoBaseItemResult.rows.length === 0) {
      return NextResponse.json({ error: 'Item sueldo_base no encontrado' }, { status: 404 });
    }

    const sueldoBaseItemId = sueldoBaseItemResult.rows[0].id;

    // Buscar si ya existe un item de sueldo base para esta estructura
    const existingItemResult = await sql`
      SELECT id FROM sueldo_estructura_inst_item 
      WHERE estructura_id = ${estructura_id} 
        AND item_id = ${sueldoBaseItemId}
      LIMIT 1
    `;

    if (existingItemResult.rows.length === 0) {
      // Crear nuevo item de sueldo base
      await sql`
        INSERT INTO sueldo_estructura_inst_item (
          estructura_id, item_id, monto, vigencia_desde, activo
        ) VALUES (
          ${estructura_id}, 
          ${sueldoBaseItemId}, 
          ${monto}, 
          CURRENT_DATE, 
          true
        )
      `;
    } else {
      // Actualizar el item existente
      await sql`
        UPDATE sueldo_estructura_inst_item 
        SET monto = ${monto}, updated_at = NOW()
        WHERE id = ${existingItemResult.rows[0].id}
      `;
    }

    return NextResponse.json({ 
      success: true, 
      message: 'Sueldo base actualizado correctamente' 
    });

  } catch (error) {
    console.error('Error actualizando sueldo base:', error);
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
  }
}

// DELETE: eliminar sueldo base (soft delete)
export async function DELETE(
  request: NextRequest,
  { params }: { params: { estructura_id: string } }
) {
  const deny = await requireAuthz(request as any, { resource: 'payroll', action: 'delete' });
  if (deny) return deny;
  
  try {
    const { estructura_id } = params;

    // Obtener el ID del item sueldo_base
    const sueldoBaseItemResult = await sql`
      SELECT id FROM sueldo_item 
      WHERE codigo = 'sueldo_base' 
      LIMIT 1
    `;

    if (sueldoBaseItemResult.rows.length === 0) {
      return NextResponse.json({ error: 'Item sueldo_base no encontrado' }, { status: 404 });
    }

    const sueldoBaseItemId = sueldoBaseItemResult.rows[0].id;

    // Soft delete del item de sueldo base
    await sql`
      UPDATE sueldo_estructura_inst_item 
      SET activo = false, vigencia_hasta = CURRENT_DATE, updated_at = NOW()
      WHERE estructura_id = ${estructura_id} 
        AND item_id = ${sueldoBaseItemId}
    `;

    return NextResponse.json({ 
      success: true, 
      message: 'Sueldo base eliminado correctamente' 
    });

  } catch (error: any) {
    console.error('Error eliminando sueldo base:', error);
    return NextResponse.json({ error: error?.message || 'Error interno del servidor' }, { status: 500 });
  }
}


