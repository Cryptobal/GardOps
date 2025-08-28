import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@vercel/postgres';

export const runtime = 'nodejs';

export async function GET(req: NextRequest) {
  try {
    console.log('🔍 Debug: Iniciando consulta de agenda...');
    
    // Paso 1: Probar consulta básica sin filtros
    console.log('📋 Paso 1: Consulta básica...');
    const basicResult = await sql`
      SELECT COUNT(*) as count FROM central_llamados;
    `;
    console.log('✅ Consulta básica exitosa:', basicResult.rows[0]);
    
    // Paso 2: Probar JOIN con instalaciones
    console.log('📋 Paso 2: JOIN con instalaciones...');
    const joinResult = await sql`
      SELECT 
        cl.id,
        i.nombre as instalacion_nombre
      FROM central_llamados cl
      JOIN instalaciones i ON i.id = cl.instalacion_id
      LIMIT 1;
    `;
    console.log('✅ JOIN exitoso, registros:', joinResult.rows.length);
    
    // Paso 3: Probar filtro de fecha simple
    console.log('📋 Paso 3: Filtro de fecha...');
    const dateResult = await sql`
      SELECT COUNT(*) as count 
      FROM central_llamados cl
      WHERE cl.programado_para::date BETWEEN CURRENT_DATE - INTERVAL '1 day' AND CURRENT_DATE + INTERVAL '1 day';
    `;
    console.log('✅ Filtro de fecha exitoso:', dateResult.rows[0]);
    
    // Paso 4: Probar consulta completa
    console.log('📋 Paso 4: Consulta completa...');
    const fullResult = await sql`
      SELECT 
        cl.*,
        i.nombre as instalacion_nombre,
        i.telefono as instalacion_telefono
      FROM central_llamados cl
      JOIN instalaciones i ON i.id = cl.instalacion_id
      WHERE cl.programado_para::date BETWEEN CURRENT_DATE - INTERVAL '1 day' AND CURRENT_DATE + INTERVAL '1 day'
      ORDER BY cl.programado_para ASC, i.nombre ASC
      LIMIT 5;
    `;
    console.log('✅ Consulta completa exitosa, registros:', fullResult.rows.length);
    
    return NextResponse.json({ 
      success: true, 
      message: 'Debug completado exitosamente',
      data: {
        basicCount: basicResult.rows[0].count,
        joinWorks: joinResult.rows.length >= 0,
        dateFilterWorks: dateResult.rows[0].count >= 0,
        fullQueryWorks: fullResult.rows.length >= 0,
        sampleData: fullResult.rows.slice(0, 2)
      }
    });
    
  } catch (error) {
    console.error('❌ Error en debug:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: error.message,
        stack: error.stack 
      },
      { status: 500 }
    );
  }
}
