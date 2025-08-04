import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/database';

export async function GET(request: NextRequest) {
  try {
    console.log('🚀 Iniciando endpoint pauta-diaria');
    
    const { searchParams } = new URL(request.url);
    const fecha = searchParams.get('fecha');

    console.log('📅 Fecha recibida:', fecha);

    if (!fecha) {
      return NextResponse.json(
        { error: 'Fecha requerida' },
        { status: 400 }
      );
    }

    // Extraer año, mes y día de la fecha usando UTC para evitar problemas de zona horaria
    const fechaObj = new Date(fecha + 'T00:00:00.000Z');
    const anio = fechaObj.getUTCFullYear();
    const mes = fechaObj.getUTCMonth() + 1; // getUTCMonth() devuelve 0-11
    const dia = fechaObj.getUTCDate();

    console.log(`🔍 Consultando pauta diaria para: ${fecha} (${anio}-${mes}-${dia})`);

    // Consulta corregida con JOIN para obtener instalacion_id
    const pautaDiaria = await query(`
      SELECT 
        pm.id, 
        po.instalacion_id, 
        pm.guardia_id, 
        pm.dia, 
        pm.estado,
        po.nombre_puesto,
        po.es_ppc
      FROM as_turnos_pauta_mensual pm
      INNER JOIN as_turnos_puestos_operativos po ON pm.puesto_id = po.id
      WHERE pm.anio = $1 AND pm.mes = $2 AND pm.dia = $3
        AND po.activo = true
      ORDER BY po.instalacion_id, po.nombre_puesto
    `, [anio, mes, dia]);

    console.log(`📊 Pauta diaria para ${fecha}: ${pautaDiaria.rows.length} registros`);

    return NextResponse.json(pautaDiaria.rows);

  } catch (error) {
    console.error('❌ Error en pauta-diaria API:', error);
    console.error('❌ Stack trace:', error instanceof Error ? error.stack : 'No stack trace available');
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
} 