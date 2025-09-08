import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/database';

// Configuración para evitar errores de Dynamic Server Usage
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const estado = searchParams.get('estado');
    const instalacion = searchParams.get('instalacion');
    const rol = searchParams.get('rol');
    const prioridad = searchParams.get('prioridad');
    const fechaDesde = searchParams.get('fechaDesde');
    const fechaHasta = searchParams.get('fechaHasta');

    let whereConditions = ['pd.es_ppc = true']; // Siempre filtrar por PPC
    let params: any[] = [];
    let paramIndex = 1;

    // Filtrar por estado usando la lógica de la pauta diaria
    if (estado && estado !== 'all') {
      if (estado === 'Pendiente') {
        // En la vista de pauta diaria, los PPCs pendientes tienen estado 'plan'
        whereConditions.push(`pd.estado_ui = 'plan'`);
      } else if (estado === 'Cubierto') {
        // PPCs cubiertos tienen guardia asignado
        whereConditions.push(`pd.guardia_trabajo_id IS NOT NULL`);
      }
    }

    if (instalacion && instalacion !== 'all') {
      whereConditions.push(`pd.instalacion_nombre = $${paramIndex}`);
      params.push(instalacion);
      paramIndex++;
    }

    if (rol && rol !== 'all') {
      whereConditions.push(`pd.rol_nombre = $${paramIndex}`);
      params.push(rol);
      paramIndex++;
    }

    // Filtrar por fecha usando la fecha de la pauta
    if (fechaDesde) {
      whereConditions.push(`pd.fecha >= $${paramIndex}`);
      params.push(fechaDesde);
      paramIndex++;
    }

    if (fechaHasta) {
      whereConditions.push(`pd.fecha <= $${paramIndex}`);
      params.push(fechaHasta);
      paramIndex++;
    }

    const whereClause = `WHERE ${whereConditions.join(' AND ')}`;

    // Migrado al nuevo modelo as_turnos_puestos_operativos
    // Consulta de prueba para debug
    console.log('🔍 Consulta SQL:', `
      SELECT 
        po.id,
        po.creado_en as created_at,
        po.guardia_id as guardia_asignado_id,
        rs.nombre as rol_nombre,
        rs.hora_inicio,
        rs.hora_termino,
        i.nombre as instalacion_nombre,
        i.id as instalacion_id,
        g.nombre || ' ' || g.apellido_paterno as guardia_nombre,
        g.rut as guardia_rut
      FROM as_turnos_puestos_operativos po
      INNER JOIN as_turnos_roles_servicio rs ON po.rol_id = rs.id
      INNER JOIN instalaciones i ON po.instalacion_id = i.id
      LEFT JOIN guardias g ON po.guardia_id = g.id
      ${whereClause}
      ORDER BY i.nombre, rs.nombre, po.creado_en DESC
    `);
    console.log('🔍 Parámetros:', params);
    
    // Consulta de prueba para ver si hay datos en la tabla
    const testQuery = await query(`
      SELECT COUNT(*) as total, 
             COUNT(CASE WHEN es_ppc = true THEN 1 END) as ppc_count,
             COUNT(CASE WHEN activo = true THEN 1 END) as activo_count,
             COUNT(CASE WHEN es_ppc = true AND activo = true THEN 1 END) as ppc_activo_count
      FROM as_turnos_puestos_operativos
    `);
    console.log('🔍 Test query resultado:', testQuery.rows[0]);
    
    // Usar la vista de pauta diaria unificada para obtener PPCs
    const ppcs = await query(`
      SELECT 
        pd.puesto_id as id,
        pd.fecha as created_at,
        pd.guardia_trabajo_id as guardia_asignado_id,
        pd.rol_nombre,
        pd.hora_inicio,
        pd.hora_fin as hora_termino,
        pd.instalacion_nombre,
        pd.instalacion_id,
        pd.guardia_trabajo_nombre as guardia_nombre,
        pd.guardia_trabajo_telefono as guardia_rut,
        pd.estado_ui
      FROM as_turnos_v_pauta_diaria_unificada pd
      ${whereClause}
      ORDER BY pd.fecha DESC, pd.instalacion_nombre, pd.rol_nombre, pd.puesto_id DESC
      LIMIT 50
    `, params);
    
    console.log('🔍 Resultado de la consulta:', ppcs.rows.length, 'filas');

    const result = ppcs.rows.map((ppc: any) => {
      return {
        id: ppc.id,
        instalacion: ppc.instalacion_nombre,
        instalacion_id: ppc.instalacion_id,
        rol: ppc.rol_nombre,
        jornada: ppc.rol_nombre?.includes('Noche') ? 'N' : 'D',
        rol_tipo: ppc.rol_nombre || '4x4',
        horario: `${ppc.hora_inicio || '08:00'} - ${ppc.hora_termino || '20:00'}`,
        estado: ppc.estado_ui === 'plan' ? 'Pendiente' : (ppc.guardia_asignado_id ? 'Cubierto' : 'Pendiente'),
        creado: ppc.created_at,
        guardia_asignado: ppc.guardia_asignado_id ? {
          id: ppc.guardia_asignado_id,
          nombre: ppc.guardia_nombre,
          rut: ppc.guardia_rut
        } : null
      };
    });

    return NextResponse.json(result);
  } catch (error) {
    console.error('Error obteniendo PPCs:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
} 