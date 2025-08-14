import { requireAuthz } from '@/lib/authz-api'
import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/database';

// PUT - Actualizar estructura de servicio
export async function PUT(
  request: NextRequest,
  {
const __req = (typeof req!== 'undefined' ? req : (typeof request !== 'undefined' ? request : (arguments as any)[0]));
const deny = await requireAuthz(__req as any, { resource: 'instalaciones', action: 'delete' });
if (deny) return deny;

const __req = (typeof req!== 'undefined' ? req : (typeof request !== 'undefined' ? request : (arguments as any)[0]));
const deny = await requireAuthz(__req as any, { resource: 'instalaciones', action: 'update' });
if (deny) return deny;
 params }: { params: { id: string; estructuraId: string } }
) {
  try {
    const { estructuraId } = params;
    const body = await request.json();
    const { nombre_bono, monto, imponible } = body;

    if (monto === undefined) {
      return NextResponse.json(
        { error: 'Faltan datos requeridos' },
        { status: 400 }
      );
    }

    // Obtener fila actual para saber si es sueldo base o bono global
    const current = await query(
      `SELECT id, instalacion_id, rol_servicio_id, bono_id 
       FROM sueldo_estructuras_servicio WHERE id = $1 LIMIT 1`,
      [estructuraId]
    );
    const currentRow = Array.isArray(current) ? current[0] : (current.rows || [])[0];
    if (!currentRow) {
      return NextResponse.json(
        { error: 'Estructura no encontrada' },
        { status: 404 }
      );
    }

    // Si es sueldo base (bono_id null): solo se actualiza sueldo_base
    if (!currentRow.bono_id) {
      const upd = await query(
        `UPDATE sueldo_estructuras_servicio
         SET sueldo_base = $1, updated_at = NOW()
         WHERE id = $2 RETURNING id, instalacion_id, rol_servicio_id`,
        [monto, estructuraId]
      );
      const r = Array.isArray(upd) ? upd[0] : (upd.rows || [])[0];
      return NextResponse.json({
        ...r,
        nombre_bono: 'Sueldo Base',
        monto,
        imponible: true,
      });
    }

    // Para bonos globales: permitir cambiar nombre (reasigna bono_id), monto y opcionalmente imponible global
    let targetBonoId = currentRow.bono_id as string;

    if (nombre_bono) {
      const found = await query(
        `SELECT id, imponible FROM sueldo_bonos_globales WHERE nombre = $1 LIMIT 1`,
        [nombre_bono]
      );
      let bonoGlobal = Array.isArray(found) ? found[0] : (found.rows || [])[0];
      if (!bonoGlobal) {
        const created = await query(
          `INSERT INTO sueldo_bonos_globales (nombre, descripcion, imponible)
           VALUES ($1, NULL, $2) RETURNING id, imponible`,
          [nombre_bono, imponible !== false]
        );
        bonoGlobal = Array.isArray(created) ? created[0] : (created.rows || [])[0];
      } else if (imponible !== undefined) {
        // Actualizar imponible global si se envía
        await query(
          `UPDATE sueldo_bonos_globales SET imponible = $1, updated_at = NOW() WHERE id = $2`,
          [imponible, bonoGlobal.id]
        );
        bonoGlobal.imponible = imponible;
      }
      targetBonoId = bonoGlobal.id;
    } else if (imponible !== undefined && targetBonoId) {
      // Si solo cambia imponible, actualizarlo en bono global actual
      await query(
        `UPDATE sueldo_bonos_globales SET imponible = $1, updated_at = NOW() WHERE id = $2`,
        [imponible, targetBonoId]
      );
    }

    // Evitar duplicado por unique constraint antes de actualizar
    if (targetBonoId) {
      const dup = await query(
        `SELECT id FROM sueldo_estructuras_servicio 
         WHERE instalacion_id = $1 AND rol_servicio_id = $2 AND bono_id = $3 AND id <> $4
         LIMIT 1`,
        [currentRow.instalacion_id, currentRow.rol_servicio_id, targetBonoId, estructuraId]
      );
      const dupRow = Array.isArray(dup) ? dup[0] : (dup.rows || [])[0];
      if (dupRow) {
        return NextResponse.json(
          { error: 'Ya existe un bono con ese nombre para este rol' },
          { status: 400 }
        );
      }
    }

    const upd = await query(
      `UPDATE sueldo_estructuras_servicio
       SET bono_id = $1, monto = $2, updated_at = NOW()
       WHERE id = $3
       RETURNING id, instalacion_id, rol_servicio_id`,
      [targetBonoId, monto, estructuraId]
    );
    const r = Array.isArray(upd) ? upd[0] : (upd.rows || [])[0];
    return NextResponse.json({
      ...r,
      nombre_bono: nombre_bono,
      monto,
      imponible: imponible !== undefined ? imponible : true,
    });
  } catch (error) {
    console.error('Error actualizando estructura de servicio:', error);
    return NextResponse.json(
      { error: 'Error al actualizar estructura de servicio' },
      { status: 500 }
    );
  }
}

// DELETE - Eliminar estructura de servicio
export async function DELETE(
  request: NextRequest,
  {
const __req = (typeof req!== 'undefined' ? req : (typeof request !== 'undefined' ? request : (arguments as any)[0]));
const deny = await requireAuthz(__req as any, { resource: 'instalaciones', action: 'delete' });
if (deny) return deny;

const __req = (typeof req!== 'undefined' ? req : (typeof request !== 'undefined' ? request : (arguments as any)[0]));
const deny = await requireAuthz(__req as any, { resource: 'instalaciones', action: 'update' });
if (deny) return deny;
 params }: { params: { id: string; estructuraId: string } }
) {
  try {
    const { estructuraId } = params;

    // Proteger sueldo base: no eliminar filas base
    const current = await query(
      `SELECT bono_id FROM sueldo_estructuras_servicio WHERE id = $1 LIMIT 1`,
      [estructuraId]
    );
    const currentRow = Array.isArray(current) ? current[0] : (current.rows || [])[0];
    if (!currentRow) {
      return NextResponse.json(
        { error: 'Estructura no encontrada' },
        { status: 404 }
      );
    }
    if (!currentRow.bono_id) {
      return NextResponse.json(
        { error: 'No se puede eliminar el Sueldo Base' },
        { status: 400 }
      );
    }

    const result = await query(
      `DELETE FROM sueldo_estructuras_servicio WHERE id = $1 RETURNING id`,
      [estructuraId]
    );
    const rows = Array.isArray(result) ? result : (result.rows || []);
    if (rows.length === 0) {
      return NextResponse.json(
        { error: 'Estructura no encontrada' },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, deleted: estructuraId });
  } catch (error) {
    console.error('Error eliminando estructura de servicio:', error);
    return NextResponse.json(
      { error: 'Error al eliminar estructura de servicio' },
      { status: 500 }
    );
  }
}
