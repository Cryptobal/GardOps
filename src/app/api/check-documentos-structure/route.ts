import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/database';

import { logger, devLogger, apiLogger } from '@/lib/utils/logger';
export async function GET(req: NextRequest) {
  try {
    logger.debug('🔍 Verificando estructura de tabla documentos...');
    
    // Verificar si la tabla existe
    const tableExists = await pool.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'documentos'
      )
    `);
    
    if (!tableExists.rows[0].exists) {
      return NextResponse.json({ 
        success: false, 
        error: 'Tabla documentos no existe',
        suggestion: 'Crear tabla documentos'
      }, { status: 404 });
    }
    
    // Obtener estructura de la tabla
    const structure = await pool.query(`
      SELECT column_name, data_type, is_nullable, column_default
      FROM information_schema.columns 
      WHERE table_name = 'documentos' 
      AND table_schema = 'public'
      ORDER BY ordinal_position
    `);
    
    logger.debug('📋 Estructura de tabla documentos:', structure.rows);
    
    return NextResponse.json({ 
      success: true, 
      message: 'Tabla documentos existe',
      structure: structure.rows
    });
    
  } catch (error) {
    console.error('❌ Error verificando estructura:', error);
    
    return NextResponse.json({ 
      success: false, 
      error: 'Error verificando estructura',
      details: error instanceof Error ? error.message : String(error)
    }, { status: 500 });
  }
}
