import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/database';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const fecha = searchParams.get('fecha');

    if (!fecha) {
      return NextResponse.json(
        { error: 'Fecha requerida' },
        { status: 400 }
      );
    }

    // Consulta principal: obtener pauta mensual para la fecha específica
    const pautaDiaria = await query(`
      WITH pauta_base AS (
        SELECT 
          pm.id,
          pm.instalacion_id,
          i.nombre as instalacion_nombre,
          pm.guardia_id,
          g.nombre as guardia_nombre,
          'Turno' as turno_nombre,
          pm.dia as fecha,
          pm.tipo as estado_base
        FROM pautas_mensuales pm
        INNER JOIN instalaciones i ON pm.instalacion_id = i.id
        INNER JOIN guardias g ON pm.guardia_id = g.id
        WHERE pm.dia = $1
      ),
      permisos_activos AS (
        SELECT 
          guardia_id,
          fecha_inicio,
          fecha_fin,
          tipo,
          motivo
        FROM permisos
        WHERE $1 BETWEEN fecha_inicio AND fecha_fin
          AND activo = true
      ),
      ppc_activos AS (
        SELECT 
          instalacion_id,
          turno_id,
          fecha
        FROM as_turnos_ppc
        WHERE fecha = $1
          AND activo = true
      )
      SELECT 
        pb.id,
        pb.instalacion_id,
        pb.instalacion_nombre,
        pb.guardia_id,
        pb.guardia_nombre,
        pb.turno_nombre,
        pb.fecha,
        CASE 
          WHEN p.guardia_id IS NOT NULL THEN 'permiso'
          WHEN ppc.instalacion_id IS NOT NULL THEN 'sin_cubrir'
          WHEN pb.estado_base = 'licencia' THEN 'licencia'
          WHEN pb.estado_base = 'permiso' THEN 'permiso'
          WHEN pb.estado_base = 'libre' THEN 'asistio'
          ELSE 'asistio'
        END as estado,
        COALESCE(p.motivo, pb.observacion) as motivo,
        NULL as reemplazo_nombre,
        CASE WHEN ppc.instalacion_id IS NOT NULL THEN true ELSE false END as es_ppc
      FROM pauta_base pb
      LEFT JOIN permisos_activos p ON pb.guardia_id = p.guardia_id
      LEFT JOIN ppc_activos ppc ON pb.instalacion_id = ppc.instalacion_id
      ORDER BY pb.instalacion_nombre, pb.turno_nombre
    `, [fecha]);

    // También obtener PPCs que no están en la pauta mensual
    const ppcSinPauta = await query(`
      SELECT 
        NULL as id,
        ppc.instalacion_id,
        i.nombre as instalacion_nombre,
        NULL as guardia_id,
        NULL as guardia_nombre,
        'PPC' as turno_nombre,
        ppc.fecha,
        'sin_cubrir' as estado,
        'PPC activo' as motivo,
        NULL as reemplazo_nombre,
        true as es_ppc
      FROM puestos_por_cubrir ppc
      INNER JOIN instalaciones i ON ppc.instalacion_id = i.id
      WHERE ppc.fecha = $1
        AND ppc.activo = true
        AND NOT EXISTS (
          SELECT 1 FROM pautas_mensuales pm 
          WHERE pm.instalacion_id = ppc.instalacion_id 
            AND pm.dia = ppc.fecha
        )
    `, [fecha]);

    // Combinar resultados
    const resultadoCompleto = [
      ...pautaDiaria.rows,
      ...ppcSinPauta.rows
    ];

    return NextResponse.json(resultadoCompleto);

  } catch (error) {
    console.error('Error en pauta-diaria API:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
} 