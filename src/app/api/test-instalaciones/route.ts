import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/database';

import { logger, devLogger, apiLogger } from '@/lib/utils/logger';
export async function GET(req: NextRequest) {
  try {
    logger.debug('🔍 Verificando instalaciones disponibles...');
    
    // Obtener estructura de la tabla
    const structure = await pool.query(`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns 
      WHERE table_name = 'instalaciones' 
      AND table_schema = 'public'
      ORDER BY ordinal_position
    `);
    
    logger.debug('📋 Estructura de tabla instalaciones:', structure.rows);
    
    // Obtener instalaciones (sin especificar campos específicos)
    const instalaciones = await pool.query(`
      SELECT * FROM instalaciones LIMIT 5
    `);
    
    logger.debug('📋 Instalaciones disponibles:', instalaciones.rows);
    
    return NextResponse.json({ 
      success: true, 
      message: 'Instalaciones obtenidas',
      structure: structure.rows,
      instalaciones: instalaciones.rows
    });
    
  } catch (error) {
    console.error('❌ Error obteniendo instalaciones:', error);
    
    return NextResponse.json({ 
      success: false, 
      error: 'Error obteniendo instalaciones',
      details: error instanceof Error ? error.message : String(error)
    }, { status: 500 });
  }
}
