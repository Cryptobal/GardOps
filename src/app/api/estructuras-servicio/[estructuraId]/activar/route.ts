import { requireAuthz } from '@/lib/authz-api'
import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/database';

// PUT - Activar una estructura específica (por id) dentro de su instalación/rol
export async function PUT(
  request: NextRequest,
  {
const __req = (typeof req!== 'undefined' ? req : (typeof request !== 'undefined' ? request : (arguments as any)[0]));
const deny = await requireAuthz(__req as any, { resource: 'estructuras_servicio', action: 'update' });
if (deny) return deny;
 params }: { params: { estructuraId: string } }
) {
  const { estructuraId } = params;
  try {
    // Traer la estructura objetivo
    const current = await query(
      `SELECT id, instalacion_id, rol_servicio_id, bono_id, activo
       FROM sueldo_estructuras_servicio WHERE id = $1 LIMIT 1`,
      [estructuraId]
    );
    const row = Array.isArray(current) ? current[0] : (current.rows || [])[0];
    if (!row) {
      return NextResponse.json({ error: 'Estructura no encontrada' }, { status: 404 });
    }

    // Solo tiene sentido activar estructuras base (bono_id IS NULL)
    if (row.bono_id) {
      return NextResponse.json({ error: 'Solo se puede activar la fila base (Sueldo Base)' }, { status: 400 });
    }

    await query('BEGIN');
    try {
      // Inactivar todas las otras bases del mismo par instalacion/rol
      await query(
        `UPDATE sueldo_estructuras_servicio
         SET activo = false, fecha_inactivacion = COALESCE(fecha_inactivacion, NOW()), updated_at = NOW()
         WHERE instalacion_id = $1 AND rol_servicio_id = $2 AND bono_id IS NULL AND id <> $3`,
        [row.instalacion_id, row.rol_servicio_id, estructuraId]
      );

      // Activar objetivo
      await query(
        `UPDATE sueldo_estructuras_servicio
         SET activo = true, fecha_inactivacion = NULL, updated_at = NOW()
         WHERE id = $1`,
        [estructuraId]
      );

      // Historial
      await query(
        `INSERT INTO sueldo_historial_estructuras (
           rol_servicio_id, estructura_id, accion, fecha_accion, detalles, usuario_id, datos_anteriores, datos_nuevos
         ) VALUES ($1, $2, 'ACTIVACION', NOW(), $3, NULL, $4, $5)`,
        [row.rol_servicio_id, row.id, 'Activación de estructura', { activo: row.activo }, { activo: true }]
      );

      await query('COMMIT');
      return NextResponse.json({ success: true });
    } catch (e) {
      await query('ROLLBACK');
      throw e;
    }
  } catch (error) {
    console.error('Error activando estructura específica:', error);
    return NextResponse.json({ error: 'Error activando estructura' }, { status: 500 });
  }
}


