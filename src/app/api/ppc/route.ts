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
    
    // COPIAR EXACTAMENTE LA CONSULTA DE PAUTA DIARIA V2
    const fecha = '2025-09-08'; // Fecha fija como en pauta diaria
    
    // Construir la consulta base IGUAL que en /api/pauta-diaria-v2/data/route.ts
    let query_sql = `
      SELECT 
        pd.*,
        CASE 
          WHEN pd.meta->>'cobertura_guardia_id' IS NOT NULL THEN
            CONCAT(g.apellido_paterno, ' ', g.apellido_materno, ', ', g.nombre)
          ELSE NULL
        END AS cobertura_guardia_nombre,
        g.telefono AS cobertura_guardia_telefono,
        gt.telefono AS guardia_titular_telefono,
        gw.telefono AS guardia_trabajo_telefono,
        pd.meta->>'estado_semaforo' AS estado_semaforo,
        pd.meta->>'comentarios' AS comentarios
      FROM as_turnos_v_pauta_diaria_dedup_fixed pd
      LEFT JOIN guardias g ON g.id::text = pd.meta->>'cobertura_guardia_id'
      LEFT JOIN guardias gt ON gt.id::text = pd.guardia_titular_id::text
      LEFT JOIN guardias gw ON gw.id::text = pd.guardia_trabajo_id::text
      WHERE pd.fecha = '${fecha}' AND pd.es_ppc = true
    `;

    // Agregar filtros específicos de PPCs
    if (estado && estado !== 'all') {
      if (estado === 'Pendiente') {
        query_sql += ` AND pd.estado_ui = 'plan'`;
      } else if (estado === 'Cubierto') {
        query_sql += ` AND pd.guardia_trabajo_id IS NOT NULL`;
      }
    }

    if (instalacion && instalacion !== 'all') {
      query_sql += ` AND pd.instalacion_nombre = '${instalacion}'`;
    }

    if (rol && rol !== 'all') {
      query_sql += ` AND pd.rol_nombre = '${rol}'`;
    }

    if (fechaDesde) {
      query_sql += ` AND pd.fecha >= '${fechaDesde}'`;
    }

    if (fechaHasta) {
      query_sql += ` AND pd.fecha <= '${fechaHasta}'`;
    }

    query_sql += ` ORDER BY pd.es_ppc DESC, pd.instalacion_nombre NULLS LAST, pd.puesto_id, pd.pauta_id DESC`;

    console.log('🔍 Fecha fija para filtrar PPCs:', fecha);
    console.log('🔍 Consulta SQL final:', query_sql);

    const ppcs = await query(query_sql);
    
    console.log('🔍 Resultado de la consulta:', ppcs.rows.length, 'filas');

    const result = ppcs.rows.map((ppc: any) => {
      return {
        id: ppc.puesto_id,
        instalacion: ppc.instalacion_nombre,
        instalacion_id: ppc.instalacion_id,
        rol: ppc.rol_nombre,
        jornada: ppc.rol_nombre?.includes('Noche') || ppc.rol_nombre?.includes('N ') ? 'N' : 'D',
        rol_tipo: ppc.rol_nombre || '4x4',
        horario: `${ppc.hora_inicio || '08:00'} - ${ppc.hora_fin || '20:00'}`,
        estado: ppc.estado_ui === 'plan' ? 'Pendiente' : (ppc.guardia_trabajo_id ? 'Cubierto' : 'Pendiente'),
        creado: ppc.fecha,
        guardia_asignado: ppc.guardia_trabajo_id ? {
          id: ppc.guardia_trabajo_id,
          nombre: ppc.guardia_trabajo_nombre,
          rut: ppc.guardia_trabajo_telefono || ''
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