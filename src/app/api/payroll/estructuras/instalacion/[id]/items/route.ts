import { requireAuthz } from '@/lib/authz-api'
import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';

import { logger, devLogger, apiLogger } from '@/lib/utils/logger';
// POST: agregar un item (bono) a una estructura de servicio
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const deny = await requireAuthz(request as any, { resource: 'payroll', action: 'create' });
  if (deny) return deny;

  try {
    const { id } = params;
    const body = await request.json();
    const { item_id, monto, vigencia_desde } = body || {};

    if (!item_id || monto === undefined || monto === null) {
      return NextResponse.json({ error: 'item_id y monto son requeridos' }, { status: 400 });
    }

    // Verificar que la estructura existe
    const estructuraResult = await sql`
      SELECT id FROM sueldo_estructuras_servicio 
      WHERE id = ${id} AND bono_id IS NULL
      LIMIT 1
    `;

    if (estructuraResult.rows.length === 0) {
      return NextResponse.json({ error: 'Estructura no encontrada' }, { status: 404 });
    }

    // Verificar que el item existe
    const itemResult = await sql`
      SELECT id, nombre, codigo FROM sueldo_bonos_globales 
      WHERE id = ${item_id} AND activo = true
      LIMIT 1
    `;

    if (itemResult.rows.length === 0) {
      return NextResponse.json({ error: 'Item no encontrado o inactivo' }, { status: 404 });
    }

    // Verificar que no existe ya este item en la estructura
    const existingItemResult = await sql`
      SELECT id FROM sueldo_estructuras_servicio 
      WHERE estructura_id = ${id} AND bono_id = ${item_id} AND activo = true
      LIMIT 1
    `;

    if (existingItemResult.rows.length > 0) {
      return NextResponse.json({ error: 'Este bono ya existe en la estructura' }, { status: 409 });
    }

    // Insertar el nuevo item
    const insertResult = await sql`
      INSERT INTO sueldo_estructuras_servicio (
        estructura_id, 
        bono_id, 
        monto, 
        vigencia_desde, 
        activo,
        created_at,
        updated_at
      ) VALUES (
        ${id},
        ${item_id},
        ${monto},
        ${vigencia_desde || new Date().toISOString().split('T')[0]},
        true,
        NOW(),
        NOW()
      ) RETURNING id
    `;

    return NextResponse.json({ 
      success: true, 
      message: 'Bono agregado correctamente',
      id: insertResult.rows[0].id
    });

  } catch (error) {
    logger.error('Error agregando item a estructura::', error);
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
  }
}
