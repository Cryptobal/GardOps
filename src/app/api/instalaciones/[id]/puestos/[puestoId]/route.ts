import { requireAuthz } from '@/lib/authz-api'
import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/database';

// GET - Obtener información del puesto
export async function GET(
  request: NextRequest,
  {
const __req = (typeof req!== 'undefined' ? req : (typeof request !== 'undefined' ? request : (arguments as any)[0]));
const deny = await requireAuthz(__req as any, { resource: 'instalaciones', action: 'update' });
if (deny) return deny;

const __req = (typeof req!== 'undefined' ? req : (typeof request !== 'undefined' ? request : (arguments as any)[0]));
const deny = await requireAuthz(__req as any, { resource: 'instalaciones', action: 'read:detail' });
if (deny) return deny;
 params }: { params: { id: string; puestoId: string } }
) {
  try {
    const { puestoId } = params;

    const result = await query(`
      SELECT 
        po.id,
        po.nombre_puesto,
        po.instalacion_id,
        po.rol_id,
        po.guardia_id,
        po.es_ppc,
        rs.nombre as rol_nombre,
        g.nombre as guardia_nombre,
        g.apellido_paterno as guardia_apellido
      FROM as_turnos_puestos_operativos po
      LEFT JOIN as_turnos_roles_servicio rs ON po.rol_id = rs.id
      LEFT JOIN guardias g ON po.guardia_id = g.id
      WHERE po.id = $1 AND po.activo = true
    `, [puestoId]);

    if (result.rows.length === 0) {
      return NextResponse.json(
        { error: 'Puesto no encontrado' },
        { status: 404 }
      );
    }

    return NextResponse.json(result.rows[0]);
  } catch (error) {
    console.error('Error obteniendo puesto:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}

// PATCH - Actualizar nombre y/o tipo del puesto
export async function PATCH(
  request: NextRequest,
  {
const __req = (typeof req!== 'undefined' ? req : (typeof request !== 'undefined' ? request : (arguments as any)[0]));
const deny = await requireAuthz(__req as any, { resource: 'instalaciones', action: 'update' });
if (deny) return deny;

const __req = (typeof req!== 'undefined' ? req : (typeof request !== 'undefined' ? request : (arguments as any)[0]));
const deny = await requireAuthz(__req as any, { resource: 'instalaciones', action: 'read:detail' });
if (deny) return deny;
 params }: { params: { id: string; puestoId: string } }
) {
  try {
    const { puestoId } = params;
    const body = await request.json();
    const { nombre_puesto, tipo_puesto_id } = body;

    // Validar que al menos un campo sea proporcionado
    if (!nombre_puesto && !tipo_puesto_id) {
      return NextResponse.json(
        { error: 'Debe proporcionar al menos un campo para actualizar' },
        { status: 400 }
      );
    }

    // Validar nombre si se proporciona
    if (nombre_puesto && nombre_puesto.length > 255) {
      return NextResponse.json(
        { error: 'El nombre del puesto no puede exceder 255 caracteres' },
        { status: 400 }
      );
    }

    // Verificar que el puesto existe
    const checkResult = await query(
      'SELECT id FROM as_turnos_puestos_operativos WHERE id = $1 AND activo = true',
      [puestoId]
    );

    if (checkResult.rows.length === 0) {
      return NextResponse.json(
        { error: 'Puesto no encontrado' },
        { status: 404 }
      );
    }

    // Si se proporciona tipo_puesto_id, verificar que existe
    if (tipo_puesto_id) {
      const tipoCheck = await query(
        'SELECT id FROM cat_tipos_puesto WHERE id = $1 AND activo = true',
        [tipo_puesto_id]
      );
      
      if (tipoCheck.rows.length === 0) {
        return NextResponse.json(
          { error: 'Tipo de puesto no encontrado o inactivo' },
          { status: 404 }
        );
      }
    }

    // Construir la query de actualización dinámicamente
    const updates = [];
    const values = [];
    let paramCount = 1;

    if (nombre_puesto !== undefined) {
      updates.push(`nombre_puesto = $${paramCount}`);
      values.push(nombre_puesto?.trim() || null);
      paramCount++;
    }

    if (tipo_puesto_id !== undefined) {
      updates.push(`tipo_puesto_id = $${paramCount}`);
      values.push(tipo_puesto_id);
      paramCount++;
    }

    updates.push(`actualizado_en = NOW()`);
    values.push(puestoId);

    // Actualizar el puesto
    const updateResult = await query(`
      UPDATE as_turnos_puestos_operativos 
      SET ${updates.join(', ')}
      WHERE id = $${paramCount}
      RETURNING *
    `, values);
    
    // Si se actualizó el tipo, obtener la información del tipo
    let responseData = updateResult.rows[0];
    if (tipo_puesto_id) {
      const tipoResult = await query(`
        SELECT nombre as tipo_nombre, emoji as tipo_emoji, color as tipo_color
        FROM cat_tipos_puesto 
        WHERE id = $1
      `, [tipo_puesto_id]);
      
      if (tipoResult.rows.length > 0) {
        responseData = {
          ...responseData,
          ...tipoResult.rows[0]
        };
      }
    }

    console.log(`✅ Puesto ${puestoId} actualizado`);

    return NextResponse.json({
      success: true,
      message: 'Puesto actualizado exitosamente',
      data: responseData
    });
  } catch (error) {
    console.error('Error actualizando puesto:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}
