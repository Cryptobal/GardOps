import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/database';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const mes = searchParams.get('mes');
    const anio = searchParams.get('anio');

    if (!mes || !anio) {
      return NextResponse.json(
        { error: 'Parámetros requeridos: mes, anio' },
        { status: 400 }
      );
    }

    const fechaInicio = `${anio}-${mes.toString().padStart(2, '0')}-01`;
    const fechaFin = `${anio}-${mes.toString().padStart(2, '0')}-${new Date(parseInt(anio), parseInt(mes), 0).getDate()}`;

    // Obtener todas las instalaciones activas con información del cliente
    const instalacionesResult = await query(`
      SELECT 
        i.id,
        i.nombre,
        i.direccion,
        i.estado,
        c.nombre as cliente_nombre
      FROM instalaciones i
      LEFT JOIN clientes c ON i.cliente_id = c.id
      WHERE i.estado = 'Activo'
      ORDER BY i.nombre
    `);

    // Obtener instalaciones que tienen pauta mensual para el mes/año especificado
    const instalacionesConPautaResult = await query(`
      SELECT DISTINCT
        pm.instalacion_id,
        i.nombre as instalacion_nombre,
        i.direccion,
        c.nombre as cliente_nombre,
        COUNT(DISTINCT pm.guardia_id) as guardias_asignados
      FROM as_turnos_pauta_mensual pm
      INNER JOIN instalaciones i ON pm.instalacion_id::uuid = i.id
      LEFT JOIN clientes c ON i.cliente_id = c.id
      WHERE pm.anio = $1 
        AND pm.mes = $2
        AND i.estado = 'Activo'
      GROUP BY pm.instalacion_id, i.nombre, i.direccion, c.nombre
      ORDER BY i.nombre
    `, [anio, mes]);

    // Crear mapas para facilitar la búsqueda
    const instalacionesConPautaMap = new Map();
    instalacionesConPautaResult.rows.forEach((row: any) => {
      instalacionesConPautaMap.set(row.instalacion_id, {
        id: row.instalacion_id,
        nombre: row.instalacion_nombre,
        direccion: row.direccion,
        cliente_nombre: row.cliente_nombre,
        guardias_asignados: parseInt(row.guardias_asignados)
      });
    });

    // Separar instalaciones con y sin pauta
    const instalacionesConPauta: any[] = [];
    const instalacionesSinPauta: any[] = [];

    instalacionesResult.rows.forEach((instalacion: any) => {
      if (instalacionesConPautaMap.has(instalacion.id)) {
        instalacionesConPauta.push(instalacionesConPautaMap.get(instalacion.id));
      } else {
        instalacionesSinPauta.push({
          id: instalacion.id,
          nombre: instalacion.nombre,
          direccion: instalacion.direccion,
          cliente_nombre: instalacion.cliente_nombre
        });
      }
    });

    // Obtener información detallada para instalaciones sin pauta
    const instalacionesSinPautaDetalladas = await Promise.all(
      instalacionesSinPauta.map(async (instalacion) => {
        // Obtener roles de servicio
        // Migrado al nuevo modelo as_turnos_puestos_operativos
        const rolesResult = await query(`
          SELECT 
            rs.id,
            rs.nombre as rol_nombre,
            COUNT(*) as cantidad_guardias
          FROM as_turnos_puestos_operativos po
          INNER JOIN as_turnos_roles_servicio rs ON po.rol_id = rs.id
          WHERE po.instalacion_id = $1
          GROUP BY rs.id, rs.nombre
          ORDER BY rs.nombre
        `, [instalacion.id]);

        // Obtener guardias asignados
        // Migrado al nuevo modelo as_turnos_puestos_operativos
        const guardiasResult = await query(`
          SELECT COUNT(DISTINCT g.id) as cantidad_guardias
          FROM guardias g
          INNER JOIN as_turnos_puestos_operativos po ON g.id = po.guardia_id
          WHERE po.instalacion_id = $1 
            AND g.activo = true 
            AND po.es_ppc = false
        `, [instalacion.id]);

        // Obtener PPCs activos
        // Migrado al nuevo modelo as_turnos_puestos_operativos
        const ppcsResult = await query(`
          SELECT COUNT(*) as cantidad_ppcs
          FROM as_turnos_puestos_operativos po
          WHERE po.instalacion_id = $1 AND po.es_ppc = true AND po.estado = 'Pendiente'
        `, [instalacion.id]);

        return {
          ...instalacion,
          roles: rolesResult.rows.map((row: any) => ({
            id: row.id,
            nombre: row.rol_nombre,
            cantidad_guardias: parseInt(row.cantidad_guardias)
          })),
          cantidad_guardias: parseInt(guardiasResult.rows[0]?.cantidad_guardias || '0'),
          cantidad_ppcs: parseInt(ppcsResult.rows[0]?.cantidad_ppcs || '0')
        };
      })
    );

    // Calcular progreso
    const totalInstalaciones = instalacionesResult.rows.length;
    const instalacionesConPautaCount = instalacionesConPauta.length;
    const progreso = totalInstalaciones > 0 ? instalacionesConPautaCount / totalInstalaciones : 0;

    return NextResponse.json({
      success: true,
      instalaciones_con_pauta: instalacionesConPauta,
      instalaciones_sin_pauta: instalacionesSinPautaDetalladas,
      progreso: Math.round(progreso * 100) / 100,
      total_instalaciones: totalInstalaciones,
      instalaciones_con_pauta_count: instalacionesConPautaCount,
      mes: parseInt(mes),
      anio: parseInt(anio)
    });

  } catch (error) {
    console.error('❌ Error obteniendo resumen de pautas mensuales:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor al obtener el resumen de pautas mensuales' },
      { status: 500 }
    );
  }
} 