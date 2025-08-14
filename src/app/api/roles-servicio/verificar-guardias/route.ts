import { requireAuthz } from '@/lib/authz-api'
import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/database';

export async function POST(request: NextRequest) {
  const __req = (typeof req!== 'undefined' ? req : (typeof request !== 'undefined' ? request : (arguments as any)[0]));
  const deny = await requireAuthz(__req as any, { resource: 'roles_servicio', action: 'delete' });
  if (deny) return deny;

  try {
    const body = await request.json();
    const { rol_id } = body;

    if (!rol_id) {
      return NextResponse.json(
        { error: 'El rol_id es requerido' },
        { status: 400 }
      );
    }

    // Verificar que el rol existe
    const rolResult = await query(`
      SELECT id, nombre, estado FROM as_turnos_roles_servicio WHERE id = $1
    `, [rol_id]);

    if (rolResult.rows.length === 0) {
      return NextResponse.json(
        { error: 'Rol de servicio no encontrado' },
        { status: 404 }
      );
    }

    const rol = rolResult.rows[0];

    // Verificar si hay guardias asignados a este rol
    const guardiasResult = await query(`
      SELECT 
        po.id as puesto_id,
        po.nombre_puesto,
        po.instalacion_id,
        g.id as guardia_id,
        g.nombre,
        g.apellido_paterno,
        g.apellido_materno,
        CONCAT(g.nombre, ' ', g.apellido_paterno, ' ', COALESCE(g.apellido_materno, '')) as nombre_completo,
        i.nombre as instalacion_nombre
      FROM as_turnos_puestos_operativos po
      INNER JOIN guardias g ON po.guardia_id = g.id
      INNER JOIN instalaciones i ON po.instalacion_id = i.id
      WHERE po.rol_id = $1 
        AND po.guardia_id IS NOT NULL 
        AND po.es_ppc = false 
        AND po.activo = true
        AND g.activo = true
      ORDER BY g.nombre, g.apellido_paterno
    `, [rol_id]);

    const guardiasAsignados = guardiasResult.rows;
    const tieneGuardias = guardiasAsignados.length > 0;
    const puedeInactivar = !tieneGuardias;

    console.log('🔍 Guardias asignados encontrados:', guardiasAsignados.length);

    const response = {
      tiene_guardias: tieneGuardias,
      guardias_count: guardiasAsignados.length,
      puede_inactivar: puedeInactivar,
      rol_nombre: rol.nombre,
      rol_estado: rol.estado,
      mensaje: tieneGuardias 
        ? `El rol "${rol.nombre}" tiene ${guardiasAsignados.length} guardia(s) asignado(s). No se puede inactivar hasta que se desasignen todos los guardias.`
        : `El rol "${rol.nombre}" no tiene guardias asignados. Se puede inactivar sin problemas.`,
      guardias_info: guardiasAsignados
    };

    console.log('✅ Respuesta final:', response);

    return NextResponse.json(response);

  } catch (error) {
    console.error('❌ Error verificando guardias del rol:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor al verificar guardias del rol' },
      { status: 500 }
    );
  }
}
