import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@vercel/postgres';
import { obtenerKPIsOS10 } from '@/lib/utils/os10-status';

export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url);
    const diasAlerta = parseInt(url.searchParams.get('dias_alerta') || '30');
    
    console.log(`🔍 Obteniendo KPIs de OS10 con ${diasAlerta} días de alerta`);

    // Obtener todos los guardias activos con fecha_os10
    const { rows: guardias } = await sql`
      SELECT 
        id,
        nombre,
        apellido_paterno,
        apellido_materno,
        fecha_os10,
        activo
      FROM public.guardias 
      WHERE activo = true
      ORDER BY nombre, apellido_paterno, apellido_materno
    `;

    console.log(`📊 Total guardias activos: ${guardias.length}`);

    // Calcular KPIs usando la función utilitaria
    const kpisOS10 = obtenerKPIsOS10(guardias, diasAlerta);

    console.log('📈 KPIs OS10 calculados:', kpisOS10);

    return NextResponse.json({
      success: true,
      data: {
        ...kpisOS10,
        dias_alerta: diasAlerta,
        total_guardias_activos: guardias.length
      }
    });

  } catch (error) {
    console.error('❌ Error obteniendo KPIs de OS10:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Error al obtener KPIs de OS10',
        details: error instanceof Error ? error.message : 'Error desconocido'
      },
      { status: 500 }
    );
  }
}
