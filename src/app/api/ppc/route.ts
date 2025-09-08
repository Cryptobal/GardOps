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

    let whereConditions = ['po.es_ppc = true', 'po.activo = true']; // Siempre filtrar por PPC y puestos activos
    let params: any[] = [];
    let paramIndex = 1;

    if (estado && estado !== 'all') {
      if (estado === 'Pendiente') {
        whereConditions.push(`po.guardia_id IS NULL`);
      } else if (estado === 'Cubierto') {
        whereConditions.push(`po.guardia_id IS NOT NULL`);
      }
    } else {
      // Si no se especifica estado, mostrar todos los PPCs activos
      // No agregar filtro de estado
    }

    if (instalacion && instalacion !== 'all') {
      whereConditions.push(`i.nombre = $${paramIndex}`);
      params.push(instalacion);
      paramIndex++;
    }

    if (rol && rol !== 'all') {
      whereConditions.push(`rs.nombre = $${paramIndex}`);
      params.push(rol);
      paramIndex++;
    }

    // Prioridad no existe en la tabla actual, se omite

    if (fechaDesde) {
      whereConditions.push(`po.creado_en >= $${paramIndex}`);
      params.push(fechaDesde);
      paramIndex++;
    }

    if (fechaHasta) {
      whereConditions.push(`po.creado_en <= $${paramIndex}`);
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
    
    const ppcs = await query(`
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
      LEFT JOIN as_turnos_roles_servicio rs ON po.rol_id = rs.id
      LEFT JOIN instalaciones i ON po.instalacion_id = i.id
      LEFT JOIN guardias g ON po.guardia_id = g.id
      ${whereClause}
      ORDER BY i.nombre, rs.nombre, po.creado_en DESC
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
        estado: ppc.guardia_asignado_id ? 'Cubierto' : 'Pendiente',
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