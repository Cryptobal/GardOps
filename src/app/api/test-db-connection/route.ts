import { NextRequest, NextResponse } from 'next/server';
import { query } from '../../../lib/database';

export async function GET(request: NextRequest) {
  try {
    console.log('🔌 Probando conexión a la base de datos...');
    
    // Probar una consulta simple
    const result = await query('SELECT 1 as test');
    console.log('✅ Conexión exitosa');
    
    // Listar todas las tablas
    const tables = await query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
      ORDER BY table_name
    `);
    
    console.log('📋 Tablas disponibles:', tables.rows.map(row => row.table_name));
    
    return NextResponse.json({
      success: true,
      message: 'Conexión exitosa',
      tables: tables.rows.map(row => row.table_name)
    });

  } catch (error) {
    console.error('❌ Error de conexión:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Error de conexión',
        details: error instanceof Error ? error.message : String(error)
      },
      { status: 500 }
    );
  }
}
