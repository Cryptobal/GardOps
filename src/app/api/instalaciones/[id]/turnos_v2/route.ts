import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/database';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  console.log("🔁 Endpoint activo: /api/instalaciones/[id]/turnos_v2");
  
  try {
    const instalacionId = params.id;

    // Obtener turnos usando exclusivamente as_turnos_puestos_operativos
    const result = await query(`
      SELECT 
        rs.id as rol_id,
        rs.nombre as rol_nombre,
        rs.dias_trabajo,
        rs.dias_descanso,
        rs.horas_turno,
        rs.hora_inicio,
        rs.hora_termino,
        rs.descripcion as rol_descripcion,
        rs.tenant_id as rol_tenant_id,
        rs.created_at as rol_created_at,
        rs.updated_at as rol_updated_at,
        COUNT(*) as total_puestos,
        COUNT(CASE WHEN po.guardia_id IS NOT NULL THEN 1 END) as guardias_asignados,
        COUNT(CASE WHEN po.es_ppc = true THEN 1 END) as ppc_pendientes
      FROM as_turnos_puestos_operativos po
      INNER JOIN as_turnos_roles_servicio rs ON po.rol_id = rs.id
      WHERE po.instalacion_id = $1
      GROUP BY rs.id, rs.nombre, rs.dias_trabajo, rs.dias_descanso, rs.horas_turno, 
               rs.hora_inicio, rs.hora_termino, rs.descripcion, rs.tenant_id, rs.created_at, rs.updated_at
      ORDER BY rs.nombre
    `, [instalacionId]);

    // Transformar los resultados para el nuevo modelo
    const turnos = result.rows.map((row: any) => ({
      id: row.rol_id,
      instalacion_id: instalacionId,
      rol_servicio_id: row.rol_id,
      cantidad_guardias: parseInt(row.total_puestos) || 0,
      estado: 'Activo',
      created_at: row.rol_created_at,
      updated_at: row.rol_updated_at,
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
    console.error('Error obteniendo turnos de instalación v2:', error);
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
  console.log("🔁 Endpoint activo: /api/instalaciones/[id]/turnos_v2 POST");
  
  try {
    const instalacionId = params.id;
    const body = await request.json();
    const { rol_servicio_id, cantidad_guardias } = body;

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

    // Verificar que la instalación existe
    const instalacionCheck = await query(
      'SELECT id FROM instalaciones WHERE id = $1',
      [instalacionId]
    );

    if (instalacionCheck.rows.length === 0) {
      return NextResponse.json(
        { error: 'Instalación no encontrada' },
        { status: 404 }
      );
    }

    // Verificar que el rol de servicio existe y está activo
    const rolCheck = await query(
      'SELECT id FROM as_turnos_roles_servicio WHERE id = $1 AND estado = $2',
      [rol_servicio_id, 'Activo']
    );

    if (rolCheck.rows.length === 0) {
      return NextResponse.json(
        { error: 'Rol de servicio no encontrado o inactivo' },
        { status: 404 }
      );
    }

    // Verificar que no existe ya un turno con el mismo rol para esta instalación
    const turnoExistente = await query(
      'SELECT rol_id FROM as_turnos_puestos_operativos WHERE instalacion_id = $1 AND rol_id = $2 LIMIT 1',
      [instalacionId, rol_servicio_id]
    );

    if (turnoExistente.rows.length > 0) {
      return NextResponse.json(
        { error: 'Ya existe un turno activo con este rol de servicio para esta instalación' },
        { status: 409 }
      );
    }

    // Crear puestos operativos usando la función del nuevo modelo
    console.log(`🔄 Creando ${cantidad_guardias} puestos operativos para instalación ${instalacionId}`);
    
    await query('SELECT crear_puestos_turno($1, $2, $3)',
      [instalacionId, rol_servicio_id, cantidad_guardias]);

    console.log(`✅ Turno creado exitosamente para instalación ${instalacionId}`);

    return NextResponse.json({
      success: true,
      message: 'Turno creado exitosamente',
      instalacion_id: instalacionId,
      rol_servicio_id,
      cantidad_guardias
    });

  } catch (error) {
    console.error('Error creando turno v2:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
} 