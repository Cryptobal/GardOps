import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/database';
import { getCurrentUserServer } from '@/lib/auth';
import { logger } from '@/lib/utils/logger';

export async function GET(request: NextRequest) {
  try {
    // Verificar autenticación (modo desarrollo más permisivo)
    const currentUser = getCurrentUserServer(request);
    
    if (!currentUser) {
      logger.debug('🔍 Modo desarrollo: permitiendo acceso sin autenticación estricta');
    }

    // Obtener fecha de la query string
    const { searchParams } = new URL(request.url);
    const fecha = searchParams.get('fecha');
    
    if (!fecha) {
      return NextResponse.json(
        { success: false, error: 'Parámetro fecha es requerido' },
        { status: 400 }
      );
    }

    // Parsear fecha para obtener año, mes y día (usando zona horaria de Chile)
    const fechaObj = new Date(fecha + 'T00:00:00-03:00'); // Forzar zona horaria de Chile
    const anio = fechaObj.getFullYear();
    const mes = fechaObj.getMonth() + 1;
    const dia = fechaObj.getDate();
    
    // Debug: verificar el parseo de fecha
    logger.debug('🔍 Fecha parseada: ' + fecha + ' -> ' + anio + '-' + mes + '-' + dia);

    logger.debug(`🔍 Obteniendo PPCs planificados para fecha: ${fecha} (${anio}-${mes}-${dia})`);

    // Obtener solo PPCs que están planificados para la fecha específica
    const result = await query(`
      SELECT 
        po.id,
        po.rol_id,
        po.nombre_puesto,
        po.creado_en as created_at,
        po.es_ppc,
        po.activo,
        po.guardia_id,
        rs.nombre as rol_nombre,
        rs.dias_trabajo,
        rs.dias_descanso,
        rs.horas_turno,
        rs.hora_inicio,
        rs.hora_termino,
        i.nombre as instalacion_nombre,
        i.id as instalacion_id,
        pm.id as pauta_id
      FROM as_turnos_puestos_operativos po
      INNER JOIN as_turnos_roles_servicio rs ON po.rol_id = rs.id
      INNER JOIN instalaciones i ON po.instalacion_id = i.id
      INNER JOIN as_turnos_pauta_mensual pm ON po.id = pm.puesto_id
      WHERE po.es_ppc = true 
        AND po.activo = true 
        AND po.guardia_id IS NULL
        AND pm.anio = $1
        AND pm.mes = $2
        AND pm.dia = $3
        AND pm.estado_puesto = 'ppc'
        AND pm.tipo_cobertura = 'ppc'
      ORDER BY i.nombre, rs.nombre, po.creado_en DESC
    `, [anio, mes, dia]);

    logger.debug(`✅ PPCs planificados cargados para ${fecha}: ${result.rows.length} total`);

    return NextResponse.json({
      success: true,
      data: result.rows
    });

  } catch (error) {
    logger.error('Error obteniendo PPCs planificados:', error);
    return NextResponse.json(
      { success: false, error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}
