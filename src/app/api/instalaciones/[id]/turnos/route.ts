import { requireAuthz } from '@/lib/authz-api'
import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const deny = await requireAuthz(request, { resource: 'instalaciones', action: 'create' });
  if (deny) return deny;
  console.log("🔁 Endpoint activo: /api/instalaciones/[id]/turnos");
  
  try {
    const instalacionId = params.id;

    // Obtener turnos usando el nuevo modelo centralizado (solo puestos activos)
    const result = await sql`
      SELECT 
        rs.id as rol_id,
        rs.nombre as rol_nombre,
        rs.dias_trabajo,
        rs.dias_descanso,
        rs.horas_turno,
        rs.hora_inicio,
        rs.hora_termino,
        '' as rol_descripcion,
        rs.tenant_id as rol_tenant_id,
        rs.created_at as rol_created_at,
        rs.updated_at as rol_updated_at,
        COUNT(*) as total_puestos,
        COUNT(CASE WHEN po.guardia_id IS NOT NULL THEN 1 END) as guardias_asignados,
        COUNT(CASE WHEN po.es_ppc = true THEN 1 END) as ppc_pendientes,
        po.tipo_puesto_id,
        tp.nombre as tipo_puesto_nombre,
        tp.emoji as tipo_puesto_emoji
      FROM as_turnos_puestos_operativos po
      INNER JOIN as_turnos_roles_servicio rs ON po.rol_id = rs.id
      LEFT JOIN cat_tipos_puesto tp ON po.tipo_puesto_id = tp.id
      WHERE po.instalacion_id = ${instalacionId} AND (po.activo = true OR po.activo IS NULL)
      GROUP BY rs.id, rs.nombre, rs.dias_trabajo, rs.dias_descanso, rs.horas_turno, 
               rs.hora_inicio, rs.hora_termino, rs.tenant_id, rs.created_at, rs.updated_at,
               po.tipo_puesto_id, tp.nombre, tp.emoji
      ORDER BY rs.nombre
    `;

    // Transformar los resultados para el nuevo modelo
    const turnos = result.rows.map((row: any) => ({
      id: row.rol_id,
      instalacion_id: instalacionId,
      rol_servicio_id: row.rol_id,
      cantidad_guardias: parseInt(row.total_puestos) || 0,
      estado: 'Activo',
      created_at: row.rol_created_at,
      updated_at: row.rol_updated_at,
      tipo_puesto_id: row.tipo_puesto_id,
      tipo_puesto_nombre: row.tipo_puesto_nombre,
      tipo_puesto_emoji: row.tipo_puesto_emoji,
      rol_servicio: {
        id: row.rol_id,
        nombre: row.rol_nombre,
        descripcion: row.rol_descripcion || '',
        dias_trabajo: row.dias_trabajo,
        dias_descanso: row.dias_descanso,
        horas_turno: row.horas_turno,
        hora_inicio: row.hora_inicio,
        hora_termino: row.hora_termino,
        estado: 'Activo',
        tenant_id: row.rol_tenant_id,
        created_at: row.rol_created_at,
        updated_at: row.rol_updated_at,
      },
      guardias_asignados: parseInt(row.guardias_asignados) || 0,
      ppc_pendientes: parseInt(row.ppc_pendientes) || 0,
      total_puestos: parseInt(row.total_puestos) || 0,
    }));

    return NextResponse.json(turnos);
  } catch (error) {
    console.error('Error obteniendo turnos de instalación:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const deny = await requireAuthz(request, { resource: 'instalaciones', action: 'create' });
  if (deny) return deny;
  try {
    const instalacionId = params.id;
    const body = await request.json();
    const { rol_servicio_id, cantidad_guardias, tipo_puesto_id } = body;

    // Validaciones
    if (!rol_servicio_id || !cantidad_guardias) {
      return NextResponse.json(
        { error: 'Faltan campos requeridos' },
        { status: 400 }
      );
    }

    if (cantidad_guardias < 1 || cantidad_guardias > 20) {
      return NextResponse.json(
        { error: 'La cantidad de guardias debe estar entre 1 y 20' },
        { status: 400 }
      );
    }

    const instalacionCheck = await sql`SELECT id FROM instalaciones WHERE id = ${instalacionId}`;
    if (instalacionCheck.rows.length === 0) {
      return NextResponse.json({ error: 'Instalación no encontrada' }, { status: 404 });
    }

    const rolCheck = await sql`SELECT id FROM as_turnos_roles_servicio WHERE id = ${rol_servicio_id} AND estado = 'Activo'`;
    if (rolCheck.rows.length === 0) {
      return NextResponse.json({ error: 'Rol de servicio no encontrado o inactivo' }, { status: 404 });
    }

    // Validar que no exista un turno con el mismo rol Y tipo de puesto
    const turnoExistente = await sql`
      SELECT rol_id, tipo_puesto_id 
      FROM as_turnos_puestos_operativos 
      WHERE instalacion_id = ${instalacionId} 
        AND rol_id = ${rol_servicio_id} 
        AND tipo_puesto_id = ${tipo_puesto_id ?? null}
        AND activo = true 
      LIMIT 1
    `;
    if (turnoExistente.rows.length > 0) {
      return NextResponse.json({ 
        error: 'Ya existe un turno activo con este rol de servicio y tipo de puesto para esta instalación' 
      }, { status: 409 });
    }

    // Obtener tenant_id de la instalación
    const instalacionTenantResult = await sql`
      SELECT tenant_id FROM instalaciones WHERE id = ${instalacionId}
    `;
    const tenantId = instalacionTenantResult.rows[0]?.tenant_id;

    // Crear N puestos, nombres 1..N, todos PPC al inicio
    for (let i = 1; i <= cantidad_guardias; i++) {
      await sql`
        INSERT INTO as_turnos_puestos_operativos (
          instalacion_id, rol_id, nombre_puesto, es_ppc, activo, tipo_puesto_id, tenant_id, creado_en, actualizado_en
        ) VALUES (
          ${instalacionId}, ${rol_servicio_id}, ${`Puesto #${i}`}, true, true, ${tipo_puesto_id ?? null}, ${tenantId}, NOW(), NOW()
        )
      `;
    }

    // Obtener respuesta enriquecida
    const puestosCreados = await sql`
      SELECT 
        po.id,
        po.instalacion_id,
        po.rol_id,
        po.nombre_puesto,
        po.es_ppc,
        po.creado_en,
        po.tipo_puesto_id,
        rs.nombre as rol_nombre,
        tp.nombre as tipo_puesto_nombre,
        tp.emoji as tipo_puesto_emoji
      FROM as_turnos_puestos_operativos po
      INNER JOIN as_turnos_roles_servicio rs ON po.rol_id = rs.id
      LEFT JOIN cat_tipos_puesto tp ON po.tipo_puesto_id = tp.id
      WHERE po.instalacion_id = ${instalacionId} AND po.rol_id = ${rol_servicio_id} AND po.activo = true
      ORDER BY po.nombre_puesto
    `;

    return NextResponse.json({
      success: true,
      message: 'Turno creado exitosamente',
      puestos: puestosCreados.rows,
      total_puestos: puestosCreados.rows.length,
      ppcs_activos: (puestosCreados.rows as any[]).filter(p => p.es_ppc).length,
      tipo_puesto_id: tipo_puesto_id || null
    }, { status: 201 });
  } catch (error) {
    console.error('Error creando turno de instalación:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
} 