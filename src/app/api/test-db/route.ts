import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/database';

export async function GET(request: NextRequest) {
  try {
    console.log('🔍 Probando conexión a la base de datos...');
    
    // Prueba simple
    const result = await query('SELECT 1 as test');
    console.log('✅ Query simple ejecutada:', result.rows);
    
    // Prueba con instalaciones
    const instalaciones = await query('SELECT id, nombre FROM instalaciones LIMIT 5');
    console.log('✅ Instalaciones encontradas:', instalaciones.rows);
    
    return NextResponse.json({
      success: true,
      test: result.rows[0],
      instalaciones: instalaciones.rows
    });
    
  } catch (error) {
    console.error('❌ Error en test-db:', error);
    return NextResponse.json(
      { error: 'Error de conexión a la base de datos', details: error instanceof Error ? error.message : 'Error desconocido' },
      { status: 500 }
    );
  }
} 