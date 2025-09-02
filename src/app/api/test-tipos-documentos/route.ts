import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/database';

export async function GET(req: NextRequest) {
  try {
    console.log('🔍 Verificando tipos de documentos disponibles...');
    
    // Verificar si la tabla existe
    const tableExists = await pool.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'documentos_tipos'
      )
    `);
    
    if (!tableExists.rows[0].exists) {
      return NextResponse.json({ 
        success: false, 
        error: 'Tabla documentos_tipos no existe'
      }, { status: 404 });
    }
    
    // Obtener estructura de la tabla
    const structure = await pool.query(`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns 
      WHERE table_name = 'documentos_tipos' 
      AND table_schema = 'public'
      ORDER BY ordinal_position
    `);
    
    console.log('📋 Estructura de tabla documentos_tipos:', structure.rows);
    
    // Obtener tipos de documentos (sin especificar campos específicos)
    const tipos = await pool.query(`
      SELECT * FROM documentos_tipos LIMIT 5
    `);
    
    console.log('📋 Tipos de documentos disponibles:', tipos.rows);
    
    return NextResponse.json({ 
      success: true, 
      message: 'Tipos de documentos obtenidos',
      structure: structure.rows,
      tipos: tipos.rows
    });
    
  } catch (error) {
    console.error('❌ Error obteniendo tipos de documentos:', error);
    
    return NextResponse.json({ 
      success: false, 
      error: 'Error obteniendo tipos de documentos',
      details: error instanceof Error ? error.message : String(error)
    }, { status: 500 });
  }
} 