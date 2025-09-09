import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/database';

import { logger, devLogger, apiLogger } from '@/lib/utils/logger';
// GET - Obtener instalaciones activas
export async function GET(request: NextRequest) {
  try {
    const result = await query(`
      SELECT 
        id,
        nombre,
        direccion,
        ciudad,
        comuna,
        estado
      FROM instalaciones 
      WHERE estado = 'Activo'
      ORDER BY nombre
    `);

    return NextResponse.json({ data: result.rows });

  } catch (error) {
    logger.error('Error al obtener instalaciones::', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}
