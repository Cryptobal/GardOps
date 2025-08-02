import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/database';

// GET: Obtener todos los datos de una instalación en una sola llamada optimizada
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const instalacionId = params.id;

    // Ejecutar todas las consultas en paralelo para máxima eficiencia
    const [
      instalacionResult,
      turnosResult,
      ppcsResult,
      guardiasResult,
      rolesResult
    ] = await Promise.all([
      // 1. Datos básicos de la instalación
      query(`
        SELECT 
          i.id,
          i.nombre,
          i.cliente_id,
          COALESCE(c.nombre, 'Cliente no encontrado') as cliente_nombre,
          i.direccion,
          i.latitud,
          i.longitud,
          i.ciudad,
          i.comuna,
          i.valor_turno_extra,
          i.estado,
          i.created_at,
          i.updated_at
        FROM instalaciones i
        LEFT JOIN clientes c ON i.cliente_id = c.id
        WHERE i.id = $1
      `, [instalacionId]),

      // 2. Turnos con estadísticas optimizadas
      query(`
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
            SUM(ppc.cantidad_faltante) as count
          FROM as_turnos_ppc ppc
          INNER JOIN as_turnos_requisitos tr ON ppc.requisito_puesto_id = tr.id
          WHERE tr.instalacion_id = $1 AND ppc.estado = 'Pendiente'
          GROUP BY tr.rol_servicio_id
        ) ppc_count ON ppc_count.rol_servicio_id = tc.rol_servicio_id
        WHERE tc.instalacion_id = $1
        ORDER BY rs.nombre, tc.created_at
      `, [instalacionId]),

      // 3. PPCs con información completa
      query(`
        SELECT 
          ppc.id,
          tr.instalacion_id,
          tr.rol_servicio_id,
          ppc.motivo,
          ppc.observaciones as observacion,
          ppc.created_at as creado_en,
          rs.nombre as rol_servicio_nombre,
          rs.hora_inicio,
          rs.hora_termino,
          ppc.cantidad_faltante,
          ppc.estado,
          ppc.guardia_asignado_id,
          g.nombre || ' ' || g.apellido_paterno || ' ' || COALESCE(g.apellido_materno, '') as guardia_nombre
        FROM as_turnos_ppc ppc
        INNER JOIN as_turnos_requisitos tr ON ppc.requisito_puesto_id = tr.id
        LEFT JOIN as_turnos_roles_servicio rs ON tr.rol_servicio_id = rs.id
        LEFT JOIN guardias g ON ppc.guardia_asignado_id = g.id
        WHERE tr.instalacion_id = $1
        ORDER BY ppc.created_at DESC
      `, [instalacionId]),

      // 4. Guardias disponibles (optimizado)
      query(`
        SELECT 
          g.id,
          g.nombre,
          g.apellido_paterno,
          g.apellido_materno,
          CONCAT(g.nombre, ' ', g.apellido_paterno, ' ', COALESCE(g.apellido_materno, '')) as nombre_completo,
          g.rut,
          g.comuna,
          g.region
        FROM guardias g
        WHERE g.activo = true
          AND g.id NOT IN (
            SELECT DISTINCT ta.guardia_id 
            FROM as_turnos_asignaciones ta 
            WHERE ta.estado = 'Activa'
          )
        ORDER BY g.apellido_paterno, g.apellido_materno, g.nombre
        LIMIT 100
      `),

      // 5. Roles de servicio (cache estático)
      query(`
        SELECT 
          id,
          nombre,
          dias_trabajo,
          dias_descanso,
          horas_turno,
          hora_inicio,
          hora_termino,
          estado,
          tenant_id,
          created_at,
          updated_at
        FROM as_turnos_roles_servicio 
        WHERE estado = 'Activo'
        ORDER BY nombre
      `)
    ]);

    // Verificar que la instalación existe
    if (instalacionResult.rows.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Instalación no encontrada' },
        { status: 404 }
      );
    }

    const instalacion = instalacionResult.rows[0];

    // Transformar turnos para que coincidan con la interfaz
    const turnos = turnosResult.rows.map((row: any) => ({
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
        descripcion: '',
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

    // Transformar PPCs
    const ppcs = ppcsResult.rows.map((row: any) => ({
      id: row.id,
      instalacion_id: row.instalacion_id,
      rol_servicio_id: row.rol_servicio_id,
      motivo: row.motivo,
      observacion: row.observacion,
      creado_en: row.creado_en,
      rol_servicio_nombre: row.rol_servicio_nombre,
      hora_inicio: row.hora_inicio,
      hora_termino: row.hora_termino,
      cantidad_faltante: row.cantidad_faltante,
      estado: row.estado,
      guardia_asignado_id: row.guardia_asignado_id,
      guardia_nombre: row.guardia_nombre
    }));

    // Transformar guardias disponibles
    const guardias = guardiasResult.rows.map((row: any) => ({
      id: row.id,
      nombre_completo: row.nombre_completo,
      rut: row.rut,
      comuna: row.comuna
    }));

    // Transformar roles de servicio
    const roles = rolesResult.rows.map((row: any) => ({
      id: row.id,
      nombre: row.nombre,
      dias_trabajo: row.dias_trabajo,
      dias_descanso: row.dias_descanso,
      horas_turno: row.horas_turno,
      hora_inicio: row.hora_inicio,
      hora_termino: row.hora_termino,
      estado: row.estado,
      tenant_id: row.tenant_id,
      created_at: row.created_at,
      updated_at: row.updated_at
    }));

    return NextResponse.json({
      success: true,
      data: {
        instalacion,
        turnos,
        ppcs,
        guardias,
        roles
      }
    });

  } catch (error) {
    console.error('Error obteniendo datos completos de instalación:', error);
    return NextResponse.json(
      { success: false, error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
} 