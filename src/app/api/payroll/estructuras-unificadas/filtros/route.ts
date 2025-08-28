import { requireAuthz } from '@/lib/authz-api'
import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/database';

// GET - Obtener datos para filtros
export async function GET(request: NextRequest) {
  console.log('🔍 GET /api/payroll/estructuras-unificadas/filtros - Iniciando...');
  
  try {
    const maybeDeny = await requireAuthz(request as any, { resource: 'payroll', action: 'read:list' });
    if (maybeDeny && (maybeDeny as any).status === 403) {
      console.log('❌ Acceso denegado por permisos');
      return maybeDeny;
    }
    console.log('✅ Permisos verificados correctamente');
  } catch (error) {
    console.log('⚠️ Error verificando permisos:', error);
  }

  try {
    // Obtener instalaciones que tienen estructuras
    const instalacionesQuery = `
      SELECT DISTINCT
        i.id,
        i.nombre
      FROM instalaciones i
      WHERE EXISTS (
        SELECT 1 FROM sueldo_estructuras_servicio es 
        WHERE es.instalacion_id = i.id
      )
      OR EXISTS (
        SELECT 1 FROM sueldo_estructura_guardia seg
        INNER JOIN as_turnos_puestos_operativos po ON po.guardia_id = seg.guardia_id
        WHERE po.instalacion_id = i.id
      )
      ORDER BY i.nombre
    `;

    // Obtener roles que tienen estructuras
    const rolesQuery = `
      SELECT DISTINCT
        rs.id,
        rs.nombre,
        rs.dias_trabajo,
        rs.dias_descanso,
        rs.hora_inicio,
        rs.hora_termino
      FROM as_turnos_roles_servicio rs
      WHERE EXISTS (
        SELECT 1 FROM sueldo_estructuras_servicio es 
        WHERE es.rol_servicio_id = rs.id
      )
      OR EXISTS (
        SELECT 1 FROM sueldo_estructura_guardia seg
        INNER JOIN as_turnos_puestos_operativos po ON po.guardia_id = seg.guardia_id
        WHERE po.rol_id = rs.id
      )
      ORDER BY rs.nombre
    `;

    // Obtener guardias que tienen estructuras y están asignados a puestos operativos
    const guardiasQuery = `
      SELECT DISTINCT
        g.id,
        g.nombre,
        g.apellido_paterno,
        g.apellido_materno,
        g.rut,
        CONCAT(g.nombre, ' ', g.apellido_paterno, ' ', g.apellido_materno) as nombre_completo
      FROM guardias g
      INNER JOIN sueldo_estructura_guardia seg ON seg.guardia_id = g.id
      INNER JOIN as_turnos_puestos_operativos po ON po.guardia_id = g.id
      ORDER BY g.nombre, g.apellido_paterno
    `;

    console.log('📊 Ejecutando consultas de filtros...');
    
    // Ejecutar consultas
    const [instalacionesResult, rolesResult, guardiasResult] = await Promise.all([
      query(instalacionesQuery),
      query(rolesQuery),
      query(guardiasQuery)
    ]);

    console.log('📊 Resultados de consultas:');
    console.log('- Instalaciones:', instalacionesResult.rows?.length || 0);
    console.log('- Roles:', rolesResult.rows?.length || 0);
    console.log('- Guardias:', guardiasResult.rows?.length || 0);

    // Procesar roles para incluir información completa
    const roles = (rolesResult.rows || []).map(rol => ({
      ...rol,
      nombre_completo: `${rol.nombre} - ${rol.dias_trabajo}x${rol.dias_descanso}${
        rol.hora_inicio && rol.hora_termino ? ` / ${rol.hora_inicio}-${rol.hora_termino}` : ''
      }`
    }));

    const response = {
      success: true,
      data: {
        instalaciones: instalacionesResult.rows || [],
        roles: roles,
        guardias: guardiasResult.rows || []
      }
    };

    console.log('✅ Enviando respuesta exitosa');
    return NextResponse.json(response);

  } catch (error) {
    console.error('Error al obtener datos de filtros:', error);
    return NextResponse.json(
      { success: false, error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}
