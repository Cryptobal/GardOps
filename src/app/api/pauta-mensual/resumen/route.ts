import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/database';

import { logger, devLogger, apiLogger } from '@/lib/utils/logger';
// Configuración para evitar errores de Dynamic Server Usage
export const dynamic = 'force-dynamic';

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

    logger.debug(`🔍 Obteniendo resumen para mes: ${mes}, año: ${anio}`);

    const fechaInicio = `${anio}-${mes.toString().padStart(2, '0')}-01`;
    const fechaFin = `${anio}-${mes.toString().padStart(2, '0')}-${new Date(parseInt(anio), parseInt(mes), 0).getDate()}`;

    // Obtener todas las instalaciones activas con información del cliente
    logger.debug('📋 Consultando instalaciones activas...');
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

    logger.debug(`✅ Encontradas ${instalacionesResult.rows.length} instalaciones activas`);

    // Obtener instalaciones que tienen pauta mensual para el mes/año especificado
    logger.debug('📋 Consultando instalaciones con pauta...');
    const instalacionesConPautaResult = await query(`
      SELECT DISTINCT
        po.instalacion_id,
        i.nombre as instalacion_nombre,
        i.direccion,
        c.nombre as cliente_nombre,
        COUNT(DISTINCT pm.puesto_id) as puestos_con_pauta
      FROM as_turnos_pauta_mensual pm
      INNER JOIN as_turnos_puestos_operativos po ON pm.puesto_id = po.id
      INNER JOIN instalaciones i ON po.instalacion_id = i.id
      LEFT JOIN clientes c ON i.cliente_id = c.id
      WHERE pm.anio = $1 
        AND pm.mes = $2
        AND i.estado = 'Activo'
        AND po.activo = true
      GROUP BY po.instalacion_id, i.nombre, i.direccion, c.nombre
      ORDER BY i.nombre
    `, [anio, mes]);

    logger.debug(`✅ Encontradas ${instalacionesConPautaResult.rows.length} instalaciones con pauta`);

    // Crear mapas para facilitar la búsqueda
    const instalacionesConPautaMap = new Map();
    instalacionesConPautaResult.rows.forEach((row: any) => {
      instalacionesConPautaMap.set(row.instalacion_id, {
        id: row.instalacion_id,
        nombre: row.instalacion_nombre,
        direccion: row.direccion,
        cliente_nombre: row.cliente_nombre,
        puestos_con_pauta: parseInt(row.puestos_con_pauta)
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

    logger.debug(`📊 Resumen: ${instalacionesConPauta.length} con pauta, ${instalacionesSinPauta.length} sin pauta`);

    // Obtener información detallada para instalaciones sin pauta (limitado a las primeras 10 para mejorar rendimiento)
    logger.debug('📋 Obteniendo detalles de instalaciones sin pauta...');
    const instalacionesSinPautaDetalladas = await Promise.all(
      instalacionesSinPauta.slice(0, 10).map(async (instalacion) => {
        // Obtener puestos operativos activos
        const puestosResult = await query(`
          SELECT 
            po.id as puesto_id,
            po.nombre_puesto,
            po.es_ppc,
            po.guardia_id,
            rs.nombre as rol_nombre,
            CONCAT(rs.dias_trabajo, 'x', rs.dias_descanso) as patron_turno,
            g.nombre as guardia_nombre,
            g.apellido_paterno,
            g.apellido_materno
          FROM as_turnos_puestos_operativos po
          LEFT JOIN as_turnos_roles_servicio rs ON po.rol_id = rs.id
          LEFT JOIN guardias g ON po.guardia_id = g.id
          WHERE po.instalacion_id = $1 
            AND po.activo = true
          ORDER BY po.nombre_puesto
        `, [instalacion.id]);

        // Contar puestos por tipo
        const puestosConGuardia = puestosResult.rows.filter((p: any) => p.guardia_id && !p.es_ppc).length;
        const ppcs = puestosResult.rows.filter((p: any) => p.es_ppc).length;
        const puestosSinAsignar = puestosResult.rows.filter((p: any) => !p.guardia_id && !p.es_ppc).length;

        // Agrupar por roles de servicio
        const rolesPorServicio = puestosResult.rows.reduce((acc: any, puesto: any) => {
          const rolNombre = puesto.rol_nombre || 'Sin rol';
          if (!acc[rolNombre]) {
            acc[rolNombre] = {
              nombre: rolNombre,
              cantidad_guardias: 0,
              patron_turno: puesto.patron_turno || '4x4'
            };
          }
          if (puesto.guardia_id && !puesto.es_ppc) {
            acc[rolNombre].cantidad_guardias++;
          }
          return acc;
        }, {});

        return {
          ...instalacion,
          roles: Object.values(rolesPorServicio),
          cantidad_guardias: puestosConGuardia,
          cantidad_ppcs: ppcs,
          puestos_sin_asignar: puestosSinAsignar,
          total_puestos: puestosResult.rows.length
        };
      })
    );

    // Calcular progreso
    const totalInstalaciones = instalacionesResult.rows.length;
    const instalacionesConPautaCount = instalacionesConPauta.length;
    const progreso = totalInstalaciones > 0 ? instalacionesConPautaCount / totalInstalaciones : 0;

    const resultado = {
      success: true,
      instalaciones_con_pauta: instalacionesConPauta,
      instalaciones_sin_pauta: instalacionesSinPautaDetalladas,
      progreso: Math.round(progreso * 100) / 100,
      total_instalaciones: totalInstalaciones,
      instalaciones_con_pauta_count: instalacionesConPautaCount,
      mes: parseInt(mes),
      anio: parseInt(anio)
    };

    logger.debug('✅ Resumen generado exitosamente');
    return NextResponse.json(resultado);

  } catch (error) {
    console.error('❌ Error obteniendo resumen de pautas mensuales:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor al obtener el resumen de pautas mensuales' },
      { status: 500 }
    );
  }
} 