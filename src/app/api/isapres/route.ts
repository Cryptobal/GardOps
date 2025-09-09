import { NextRequest, NextResponse } from 'next/server';
import { query } from '../../../lib/database';

import { logger, devLogger, apiLogger } from '@/lib/utils/logger';
// GET /api/isapres - Obtener lista de ISAPREs y FONASA
export async function GET(request: NextRequest) {
  try {
    logger.debug('🔍 API ISAPREs - Obteniendo lista de ISAPREs');
    
    // Primero verificar qué columnas tiene la tabla
    const columnsResult = await query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'sueldo_isapre'
      ORDER BY ordinal_position
    `);
    
    console.log('🔍 Columnas en sueldo_isapre:', columnsResult.rows.map(r => r.column_name));
    
    const result = await query(`
      SELECT 
        nombre,
        activo
      FROM sueldo_isapre 
      WHERE activo = true
      ORDER BY 
        CASE WHEN LOWER(nombre) = 'fonasa' THEN 0 ELSE 1 END,
        nombre ASC
    `);

    const isapres = result.rows.map(row => ({
      codigo: row.nombre.toLowerCase().replace(/\s+/g, '_'),
      nombre: row.nombre,
      activo: row.activo
    }));

    devLogger.success(' ISAPREs obtenidas exitosamente:', isapres.length);

    return NextResponse.json({
      isapres,
      success: true
    });

  } catch (error) {
    console.error('❌ Error obteniendo ISAPREs:', error);
    
    return NextResponse.json(
      { error: 'Error interno del servidor', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
