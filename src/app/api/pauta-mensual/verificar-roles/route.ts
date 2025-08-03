import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/database';

export async function POST(request: NextRequest) {
  try {
    console.log('🔍 Iniciando verificación de roles de servicio...');
    const body = await request.json();
    const { instalacion_id } = body;

    console.log('📋 Parámetros recibidos:', { instalacion_id });

    if (!instalacion_id) {
      console.log('❌ Error: instalacion_id no proporcionado');
      return NextResponse.json(
        { error: 'Parámetros requeridos: instalacion_id' },
        { status: 400 }
      );
    }

    console.log('🔍 Ejecutando consulta de roles de servicio...');
    // Verificar si hay roles de servicio creados para la instalación
    const rolesResult = await query(`
      SELECT 
        tc.id,
        tc.rol_servicio_id,
        rs.nombre as rol_nombre,
        tc.cantidad_guardias
      FROM as_turnos_configuracion tc
      INNER JOIN as_turnos_roles_servicio rs ON tc.rol_servicio_id = rs.id
      WHERE tc.instalacion_id = $1 AND tc.estado = 'Activo'
      ORDER BY rs.nombre
    `, [instalacion_id]);

    console.log('✅ Consulta de roles ejecutada. Resultados:', rolesResult.rows.length);

    if (rolesResult.rows.length === 0) {
      console.log('❌ No se encontraron roles de servicio para la instalación');
      return NextResponse.json({
        tiene_roles: false,
        mensaje: 'Instalación sin rol de servicio creado. Para generar pauta, primero crea un rol de servicio en el módulo de Asignaciones.',
        roles: []
      });
    }

    console.log('✅ Roles encontrados, verificando PPCs...');
    // Si tiene roles, verificar PPCs activos
    const ppcsResult = await query(`
      SELECT 
        ppc.id,
        ppc.estado,
        rs.nombre as rol_servicio_nombre,
        ppc.cantidad_faltante
      FROM as_turnos_ppc ppc
      INNER JOIN as_turnos_requisitos tr ON ppc.requisito_puesto_id = tr.id
      LEFT JOIN as_turnos_roles_servicio rs ON tr.rol_servicio_id = rs.id
      WHERE tr.instalacion_id = $1 AND ppc.estado = 'Pendiente'
      ORDER BY rs.nombre
    `, [instalacion_id]);

    console.log('✅ Consulta de PPCs ejecutada. Resultados:', ppcsResult.rows.length);

    console.log('🔍 Verificando guardias asignados...');
    // Verificar guardias asignados
    const guardiasResult = await query(`
      SELECT 
        g.id::text as id,
        g.nombre,
        CONCAT(g.nombre, ' ', g.apellido_paterno, ' ', COALESCE(g.apellido_materno, '')) as nombre_completo
      FROM guardias g
      INNER JOIN as_turnos_asignaciones ta ON g.id = ta.guardia_id
      INNER JOIN as_turnos_requisitos tr ON ta.requisito_puesto_id = tr.id
      WHERE tr.instalacion_id = $1 
        AND g.activo = true 
        AND ta.estado = 'Activa'
      ORDER BY g.nombre
    `, [instalacion_id]);

    console.log('✅ Consulta de guardias ejecutada. Resultados:', guardiasResult.rows.length);

    const response = {
      tiene_roles: true,
      puede_generar_pauta: ppcsResult.rows.length > 0 && guardiasResult.rows.length > 0,
      roles: rolesResult.rows.map((row: any) => ({
        id: row.id,
        nombre: row.rol_nombre,
        cantidad_guardias: parseInt(row.cantidad_guardias)
      })),
      ppcs_activos: ppcsResult.rows.length,
      guardias_asignados: guardiasResult.rows.length,
      mensaje: ppcsResult.rows.length === 0 
        ? 'Roles de servicio creados pero sin PPCs activos. Verifica la configuración de los roles.'
        : guardiasResult.rows.length === 0
        ? 'Hay PPCs pendientes pero no hay guardias asignados. Asigna guardias antes de crear la pauta.'
        : 'Instalación lista para generar pauta mensual.'
    };

    console.log('✅ Respuesta final:', response);
    return NextResponse.json(response);

  } catch (error) {
    console.error('❌ Error verificando roles de servicio:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor al verificar roles de servicio' },
      { status: 500 }
    );
  }
} 