import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/database';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const anio = searchParams.get('anio');
    const mes = searchParams.get('mes');

    if (!anio || !mes) {
      return NextResponse.json(
        { error: 'Parámetros requeridos: anio, mes' },
        { status: 400 }
      );
    }

    // Calcular mes anterior
    let mesAnterior = parseInt(mes) - 1;
    let anioAnterior = parseInt(anio);
    if (mesAnterior === 0) {
      mesAnterior = 12;
      anioAnterior = parseInt(anio) - 1;
    }

    console.log(`🔍 Buscando instalaciones con pauta del mes anterior: ${mesAnterior}/${anioAnterior}`);

    // Obtener instalaciones que tienen pauta del mes anterior
    const instalacionesResult = await query(`
      SELECT DISTINCT
        po.instalacion_id,
        i.nombre as instalacion_nombre,
        i.direccion,
        c.nombre as cliente_nombre,
        COUNT(DISTINCT pm.puesto_id) as puestos_con_pauta,
        COUNT(DISTINCT po.id) as total_puestos
      FROM as_turnos_pauta_mensual pm
      INNER JOIN as_turnos_puestos_operativos po ON pm.puesto_id = po.id
      INNER JOIN instalaciones i ON po.instalacion_id = i.id
      LEFT JOIN clientes c ON i.cliente_id = c.id
      WHERE pm.anio = $1 
        AND pm.mes = $2 
        AND po.activo = true
      GROUP BY po.instalacion_id, i.nombre, i.direccion, c.nombre
      ORDER BY i.nombre
    `, [anioAnterior, mesAnterior]);

    console.log(`✅ Encontradas ${instalacionesResult.rows.length} instalaciones con pauta del mes anterior`);

    return NextResponse.json({
      success: true,
      instalaciones: instalacionesResult.rows,
      total_instalaciones: instalacionesResult.rows.length,
      mes_anterior: `${mesAnterior}/${anioAnterior}`,
      mes_actual: `${mes}/${anio}`
    });

  } catch (error) {
    console.error('❌ Error obteniendo instalaciones del mes anterior:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor al obtener instalaciones del mes anterior' },
      { status: 500 }
    );
  }
}
