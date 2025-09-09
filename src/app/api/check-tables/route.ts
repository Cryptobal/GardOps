import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/database';

import { logger, devLogger, apiLogger } from '@/lib/utils/logger';
export async function GET(request: NextRequest) {
  try {
    // Verificar si existe la tabla sueldo_parametros_generales
    const checkTable = await query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'sueldo_parametros_generales'
      );
    `);

    const tableExists = checkTable.rows[0].exists;

    if (!tableExists) {
      return NextResponse.json({
        error: 'Tabla sueldo_parametros_generales no existe',
        tableExists: false
      });
    }

    // Si existe, obtener su estructura
    const structure = await query(`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns 
      WHERE table_schema = 'public' 
      AND table_name = 'sueldo_parametros_generales'
      ORDER BY ordinal_position;
    `);

    // Intentar obtener algunos datos
    const data = await query(`
      SELECT * FROM sueldo_parametros_generales LIMIT 5;
    `);

    return NextResponse.json({
      success: true,
      tableExists: true,
      structure: structure.rows,
      data: data.rows
    });

  } catch (error) {
    logger.error('Error verificando tabla::', error);
    return NextResponse.json(
      {
        error: 'Error verificando tabla',
        detalles: error instanceof Error ? error.message : 'Error desconocido'
      },
      { status: 500 }
    );
  }
} 