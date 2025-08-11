import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/database';

export async function GET(request: NextRequest) {
  try {
    // Verificar estructura de as_turnos_pauta_mensual
    const columnsQuery = `
      SELECT 
        column_name, 
        data_type 
      FROM information_schema.columns 
      WHERE table_name = 'as_turnos_pauta_mensual' 
      ORDER BY ordinal_position
    `;
    
    const { rows: columns } = await query(columnsQuery);
    
    // Verificar si existe la tabla TE_turnos_extras
    const { rows: [teExists] } = await query(`
      SELECT EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_name = 'te_turnos_extras'
      ) as exists
    `);
    
    // Obtener una muestra de pautas con coberturas
    const sampleQuery = `
      SELECT 
        pm.id,
        pm.guardia_id,
        pm.estado,
        pm.meta,
        make_date(pm.anio, pm.mes, pm.dia) as fecha,
        CASE 
          WHEN pm.meta->>'cobertura_guardia_id' IS NOT NULL THEN pm.meta->>'cobertura_guardia_id'
          ELSE NULL
        END as cobertura_desde_meta
      FROM as_turnos_pauta_mensual pm
      WHERE 
        pm.meta IS NOT NULL 
        AND pm.meta->>'cobertura_guardia_id' IS NOT NULL
      LIMIT 5
    `;
    
    const { rows: muestras } = await query(sampleQuery);
    
    return NextResponse.json({
      success: true,
      estructura: {
        columnas_pauta_mensual: columns,
        tabla_te_turnos_extras_existe: teExists.exists,
        muestras_con_cobertura: muestras
      }
    });
    
  } catch (error) {
    console.error('Error verificando estructura:', error);
    return NextResponse.json({ 
      success: false,
      error: 'Error al verificar estructura',
      details: error instanceof Error ? error.message : 'Error desconocido'
    }, { status: 500 });
  }
}
