import { requireAuthz } from '@/lib/authz-api'
import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/database';

// GET - Obtener roles de servicio por instalación
export async function GET(request: NextRequest) {
  console.log('🔍 GET /api/payroll/roles-por-instalacion - Iniciando...');
  
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
    const { searchParams } = new URL(request.url);
    const instalacionId = searchParams.get('instalacion_id');

    if (!instalacionId) {
      return NextResponse.json(
        { success: false, error: 'Se requiere instalacion_id' },
        { status: 400 }
      );
    }

    console.log('📊 Buscando roles para instalación:', instalacionId);

    // Obtener roles de servicio por instalación
    const rolesQuery = `
      SELECT DISTINCT
        rs.id,
        rs.nombre,
        rs.dias_trabajo,
        rs.dias_descanso,
        rs.hora_inicio,
        rs.hora_termino,
        rs.estado
      FROM as_turnos_roles_servicio rs
      INNER JOIN as_turnos_puestos_operativos po ON po.rol_id = rs.id
      WHERE po.instalacion_id = $1 
        AND po.activo = true 
        AND rs.estado = 'Activo'
      ORDER BY rs.nombre
    `;

    console.log('📊 Ejecutando consulta de roles...');
    
    const result = await query(rolesQuery, [instalacionId]);

    console.log('📊 Roles encontrados:', result.rows?.length || 0);

    // Procesar roles para incluir información completa
    const roles = (result.rows || []).map(rol => ({
      ...rol,
      nombre_completo: `${rol.nombre} - ${rol.dias_trabajo}x${rol.dias_descanso}${
        rol.hora_inicio && rol.hora_termino ? ` / ${rol.hora_inicio}-${rol.hora_termino}` : ''
      }`
    }));

    const response = {
      success: true,
      data: roles
    };

    console.log('✅ Enviando respuesta exitosa');
    return NextResponse.json(response);

  } catch (error) {
    console.error('Error al obtener roles por instalación:', error);
    return NextResponse.json(
      { success: false, error: 'Error interno del servidor: ' + (error as Error).message },
      { status: 500 }
    );
  }
}
