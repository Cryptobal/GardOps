import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/database';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const instalacionId = params.id;

    // Obtener turnos con detalles completos usando las nuevas tablas ADO
    const result = await query(`
      SELECT 
        tc.id,
        tc.instalacion_id,
        tc.rol_servicio_id,
        tc.cantidad_guardias,
        tc.estado,
        tc.created_at,
        tc.updated_at,
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
        COALESCE(ag_count.count, 0) as guardias_asignados,
        COALESCE(ppc_count.count, 0) as ppc_pendientes
      FROM as_turnos_configuracion tc
      INNER JOIN as_turnos_roles_servicio rs ON tc.rol_servicio_id = rs.id
      LEFT JOIN (
        SELECT 
          tr.rol_servicio_id,
          COUNT(*) as count
        FROM as_turnos_asignaciones ta
        INNER JOIN as_turnos_requisitos tr ON ta.requisito_puesto_id = tr.id
        WHERE tr.instalacion_id = $1 AND ta.estado = 'Activa'
        GROUP BY tr.rol_servicio_id
      ) ag_count ON ag_count.rol_servicio_id = tc.rol_servicio_id
      LEFT JOIN (
        SELECT 
          tr.rol_servicio_id,
          COUNT(*) as count
        FROM as_turnos_ppc ppc
        INNER JOIN as_turnos_requisitos tr ON ppc.requisito_puesto_id = tr.id
        WHERE tr.instalacion_id = $1 AND ppc.estado = 'Pendiente'
        GROUP BY tr.rol_servicio_id
      ) ppc_count ON ppc_count.rol_servicio_id = tc.rol_servicio_id
      WHERE tc.instalacion_id = $1
      ORDER BY rs.nombre, tc.created_at
    `, [instalacionId]);

    // Transformar los resultados para que coincidan con la interfaz
    const turnos = result.rows.map((row: any) => ({
      id: row.id,
      instalacion_id: row.instalacion_id,
      rol_servicio_id: row.rol_servicio_id,
      cantidad_guardias: row.cantidad_guardias,
      estado: row.estado,
      created_at: row.created_at,
      updated_at: row.updated_at,
      rol_servicio: {
        id: row.rol_servicio_id,
        nombre: row.rol_nombre,
        descripcion: row.rol_descripcion,
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
      guardias_asignados: parseInt(row.guardias_asignados),
      ppc_pendientes: parseInt(row.ppc_pendientes),
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
      'SELECT id FROM as_turnos_configuracion WHERE instalacion_id = $1 AND rol_servicio_id = $2 AND estado = $3',
      [instalacionId, rol_servicio_id, 'Activo']
    );

    if (turnoExistente.rows.length > 0) {
      return NextResponse.json(
        { error: 'Ya existe un turno activo con este rol de servicio para esta instalación' },
        { status: 409 }
      );
    }

    // Crear el turno en as_turnos_configuracion
    const result = await query(`
      INSERT INTO as_turnos_configuracion (instalacion_id, rol_servicio_id, cantidad_guardias, estado)
      VALUES ($1, $2, $3, 'Activo')
      RETURNING *
    `, [instalacionId, rol_servicio_id, cantidad_guardias]);

    const nuevoTurno = result.rows[0];

    // Crear requisito de puesto para este turno en as_turnos_requisitos
    const requisitoResult = await query(`
      INSERT INTO as_turnos_requisitos (
        instalacion_id,
        rol_servicio_id,
        cantidad_guardias,
        vigente_desde,
        vigente_hasta,
        estado
      ) VALUES ($1, $2, $3, CURRENT_DATE, NULL, 'Activo')
      RETURNING id
    `, [instalacionId, rol_servicio_id, cantidad_guardias]);

    const requisitoId = requisitoResult.rows[0].id;

    // Generar PPCs automáticamente basados en la cantidad de guardias requeridos
    if (cantidad_guardias > 0) {
      await query(`
        INSERT INTO as_turnos_ppc (
          requisito_puesto_id,
          cantidad_faltante,
          motivo,
          prioridad,
          fecha_deteccion,
          estado
        ) VALUES ($1, $2, $3, $4, CURRENT_DATE, 'Pendiente')
      `, [requisitoId, cantidad_guardias, 'falta_asignacion', 'Media']);
      
      console.log(`✅ Generado PPC para ${cantidad_guardias} guardias del turno`);
    }

    console.log('🔁 Turno de instalación creado correctamente usando tablas ADO');

    return NextResponse.json(nuevoTurno, { status: 201 });
  } catch (error) {
    console.error('Error creando turno de instalación:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
} 