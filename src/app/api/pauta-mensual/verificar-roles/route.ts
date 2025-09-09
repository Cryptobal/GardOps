import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/database';

import { logger, devLogger, apiLogger } from '@/lib/utils/logger';
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { instalacion_id } = body;

    if (!instalacion_id) {
      return NextResponse.json(
        { error: 'Parámetros requeridos: instalacion_id' },
        { status: 400 }
      );
    }

    // Primero, verificar si la instalación existe
    const instalacionResult = await query(`
      SELECT id, nombre FROM instalaciones WHERE id = $1
    `, [instalacion_id]);
    
    if (instalacionResult.rows.length === 0) {
      return NextResponse.json({
        tiene_roles: false,
        mensaje: 'Instalación no encontrada',
        roles: []
      });
    }
    
    // Verificar si hay puestos operativos para esta instalación
    const puestosResult = await query(`
      SELECT id, nombre_puesto, activo, es_ppc
      FROM as_turnos_puestos_operativos 
      WHERE instalacion_id = $1
    `, [instalacion_id]);
    
    // Verificar si hay roles de servicio creados para la instalación
    const rolesResult = await query(`
      SELECT 
        rs.id as rol_servicio_id,
        rs.nombre as rol_nombre,
        COUNT(*) as cantidad_guardias
      FROM as_turnos_puestos_operativos po
      INNER JOIN as_turnos_roles_servicio rs ON po.rol_id = rs.id
      WHERE po.instalacion_id = $1 AND po.activo = true
      GROUP BY rs.id, rs.nombre
      ORDER BY rs.nombre
    `, [instalacion_id]);

    if (rolesResult.rows.length === 0) {
      return NextResponse.json({
        tiene_roles: false,
        mensaje: 'Instalación sin rol de servicio creado. Para generar pauta, primero crea un rol de servicio en el módulo de Asignaciones.',
        roles: []
      });
    }

    // Si tiene roles, verificar PPCs activos
    const ppcsResult = await query(`
      SELECT 
        po.id,
        rs.nombre as rol_servicio_nombre
      FROM as_turnos_puestos_operativos po
      INNER JOIN as_turnos_roles_servicio rs ON po.rol_id = rs.id
      WHERE po.instalacion_id = $1 AND po.es_ppc = true AND po.activo = true
      ORDER BY rs.nombre
    `, [instalacion_id]);

    // Verificar guardias asignados
    const guardiasResult = await query(`
      SELECT 
        g.id::text as id,
        g.nombre,
        CONCAT(g.nombre, ' ', g.apellido_paterno, ' ', COALESCE(g.apellido_materno, '')) as nombre_completo
      FROM guardias g
      INNER JOIN as_turnos_puestos_operativos po ON g.id = po.guardia_id
      WHERE po.instalacion_id = $1 
        AND g.activo = true 
        AND po.es_ppc = false
        AND po.activo = true
      ORDER BY g.nombre
    `, [instalacion_id]);

    const response = {
      tiene_roles: true,
      puede_generar_pauta: ppcsResult.rows.length > 0, // Solo verificar que hay PPCs activos
      roles: rolesResult.rows.map((row: any) => ({
        id: row.rol_servicio_id,
        nombre: row.rol_nombre,
        cantidad_guardias: parseInt(row.cantidad_guardias)
      })),
      ppcs_activos: ppcsResult.rows.length,
      guardias_asignados: guardiasResult.rows.length,
      mensaje: ppcsResult.rows.length === 0 
        ? 'Roles de servicio creados pero sin PPCs activos. Verifica la configuración de los roles.'
        : 'Instalación lista para generar pauta mensual.'
    };

    return NextResponse.json(response);

  } catch (error) {
    logger.error('Error verificando roles de servicio::', error);
    return NextResponse.json(
      { error: 'Error interno del servidor al verificar roles de servicio' },
      { status: 500 }
    );
  }
} 