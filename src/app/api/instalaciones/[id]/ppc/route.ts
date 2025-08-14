import { requireAuthz } from '@/lib/authz-api'
import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/database';

// GET: Obtener PPCs de una instalación usando el nuevo modelo de puestos operativos
export async function GET(
  request: NextRequest,
  {
const __req = (typeof req!== 'undefined' ? req : (typeof request !== 'undefined' ? request : (arguments as any)[0]));
const deny = await requireAuthz(__req as any, { resource: 'instalaciones', action: 'create' });
if (deny) return deny;

const __req = (typeof req!== 'undefined' ? req : (typeof request !== 'undefined' ? request : (arguments as any)[0]));
const deny = await requireAuthz(__req as any, { resource: 'instalaciones', action: 'read:detail' });
if (deny) return deny;
 params }: { params: { id: string } }
) {
  try {
    const instalacionId = params.id;

    const result = await query(`
      SELECT 
        po.id,
        po.instalacion_id,
        po.rol_id as rol_servicio_id,
        po.nombre_puesto,
        po.es_ppc,
        po.creado_en as created_at,
        rs.nombre as rol_servicio_nombre,
        rs.hora_inicio,
        rs.hora_termino,
        1 as cantidad_faltante,
        CASE 
          WHEN po.guardia_id IS NOT NULL THEN 'Asignado'
          WHEN po.es_ppc = true THEN 'Pendiente'
          ELSE 'Activo'
        END as estado,
        po.guardia_id as guardia_asignado_id,
        g.nombre || ' ' || g.apellido_paterno || ' ' || COALESCE(g.apellido_materno, '') as guardia_nombre
      FROM as_turnos_puestos_operativos po
      LEFT JOIN as_turnos_roles_servicio rs ON po.rol_id = rs.id
      LEFT JOIN guardias g ON po.guardia_id = g.id
      WHERE po.instalacion_id = $1 
        AND (po.es_ppc = true OR po.guardia_id IS NOT NULL)
        AND po.activo = true
      ORDER BY po.creado_en DESC
    `, [instalacionId]);

    return NextResponse.json(result.rows);
  } catch (error) {
    console.error('Error obteniendo PPCs:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}

// POST: Asignar guardia a un PPC usando el nuevo modelo de puestos operativos
export async function POST(
  request: NextRequest,
  {
const __req = (typeof req!== 'undefined' ? req : (typeof request !== 'undefined' ? request : (arguments as any)[0]));
const deny = await requireAuthz(__req as any, { resource: 'instalaciones', action: 'create' });
if (deny) return deny;

const __req = (typeof req!== 'undefined' ? req : (typeof request !== 'undefined' ? request : (arguments as any)[0]));
const deny = await requireAuthz(__req as any, { resource: 'instalaciones', action: 'read:detail' });
if (deny) return deny;
 params }: { params: { id: string } }
) {
  try {
    const instalacionId = params.id;
    const body = await request.json();
    const { ppc_id, guardia_id } = body;

    if (!ppc_id || !guardia_id) {
      return NextResponse.json(
        { error: 'Faltan campos requeridos' },
        { status: 400 }
      );
    }

    // Verificar que el PPC existe y pertenece a esta instalación
    const ppcCheck = await query(`
      SELECT po.id, po.rol_id
      FROM as_turnos_puestos_operativos po
      WHERE po.id = $1 AND po.instalacion_id = $2 AND po.es_ppc = true AND po.activo = true
    `, [ppc_id, instalacionId]);

    if (ppcCheck.rows.length === 0) {
      return NextResponse.json(
        { error: 'PPC no encontrado' },
        { status: 404 }
      );
    }

    // Verificar que el guardia existe
    const guardiaCheck = await query(
      'SELECT id FROM guardias WHERE id = $1',
      [guardia_id]
    );

    if (guardiaCheck.rows.length === 0) {
      return NextResponse.json(
        { error: 'Guardia no encontrado' },
        { status: 404 }
      );
    }

    // Verificar que no hay asignación activa para este guardia
    const asignacionExistente = await query(`
      SELECT id FROM as_turnos_puestos_operativos
      WHERE guardia_id = $1 AND es_ppc = false AND activo = true
    `, [guardia_id]);

    if (asignacionExistente.rows.length > 0) {
      return NextResponse.json(
        { error: 'El guardia ya tiene una asignación activa' },
        { status: 409 }
      );
    }

    // Asignar guardia al puesto operativo
    const result = await query(`
      UPDATE as_turnos_puestos_operativos 
      SET guardia_id = $1,
          es_ppc = false
      WHERE id = $2
      RETURNING *
    `, [guardia_id, ppc_id]);

    console.log(`✅ Guardia ${guardia_id} asignado al PPC ${ppc_id} correctamente`);

    return NextResponse.json(result.rows[0]);
  } catch (error) {
    console.error('Error asignando guardia:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
} 