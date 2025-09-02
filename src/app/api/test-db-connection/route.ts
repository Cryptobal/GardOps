import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/database';

export async function GET(req: NextRequest) {
  try {
    console.log('🧪 Probando conexión a la base de datos...');
    
    // Probar conexión simple
    const result = await pool.query('SELECT NOW() as current_time');
    
    console.log('✅ Conexión exitosa:', result.rows[0]);
    
    return NextResponse.json({ 
      success: true, 
      message: 'Conexión a base de datos exitosa',
      current_time: result.rows[0].current_time
    });
    
  } catch (error) {
    console.error('❌ Error en conexión a base de datos:', error);
    
    return NextResponse.json({ 
      success: false, 
      error: 'Error en conexión a base de datos',
      details: error instanceof Error ? error.message : String(error)
    }, { status: 500 });
  }
}
