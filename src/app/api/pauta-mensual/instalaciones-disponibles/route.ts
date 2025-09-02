import { NextRequest, NextResponse } from 'next/server';
import { query } from '../../../../lib/database';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const anio = searchParams.get('anio');
    const mes = searchParams.get('mes');

    if (!anio || !mes) {
      return NextResponse.json(
        { error: 'Se requieren los parámetros anio y mes' },
        { status: 400 }
      );
    }

    // Calcular mes anterior
    let anioAnterior = parseInt(anio);
    let mesAnterior = parseInt(mes) - 1;
    
    if (mesAnterior === 0) {
      mesAnterior = 12;
      anioAnterior -= 1;
    }

    console.log(`🔍 Buscando instalaciones con pauta para ${mesAnterior}/${anioAnterior}`);

    // Obtener instalaciones que tienen pauta del mes anterior
    const instalacionesResult = await query(`
      SELECT DISTINCT 
        po.instalacion_id,
        i.nombre as instalacion_nombre,
        COUNT(po.id) as total_puestos,
        COUNT(pm.id) as puestos_con_pauta
      FROM as_turnos_puestos_operativos po
      INNER JOIN instalaciones i ON po.instalacion_id = i.id
      LEFT JOIN as_turnos_pauta_mensual pm ON po.id = pm.puesto_id 
        AND pm.anio = $1 
        AND pm.mes = $2
      WHERE po.activo = true
      GROUP BY po.instalacion_id, i.nombre
      HAVING COUNT(pm.id) > 0
      ORDER BY i.nombre
    `, [anioAnterior, mesAnterior]);

    if (instalacionesResult.rows.length === 0) {
      return NextResponse.json({
        success: false,
        mensaje: `No hay instalaciones con pauta mensual para ${mesAnterior}/${anioAnterior}`,
        instalaciones: []
      });
    }

    console.log(`✅ Encontradas ${instalacionesResult.rows.length} instalaciones con pauta`);

    return NextResponse.json({
      success: true,
      instalaciones: instalacionesResult.rows,
      mes_origen: `${mesAnterior}/${anioAnterior}`,
      total: instalacionesResult.rows.length
    });

  } catch (error) {
    console.error('❌ Error obteniendo instalaciones disponibles:', error);
    
    return NextResponse.json(
      { error: 'Error interno del servidor al obtener instalaciones disponibles' },
      { status: 500 }
    );
  }
}
