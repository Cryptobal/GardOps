import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/database';

import { logger, devLogger, apiLogger } from '@/lib/utils/logger';
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const instalacionId = params.id;

    const result = await query(`
      SELECT 
        i.id,
        i.nombre,
        i.cliente_id,
        COALESCE(c.nombre, 'Cliente no encontrado') as cliente_nombre,
        i.direccion,
        i.latitud,
        i.longitud,
        i.ciudad,
        i.comuna,
        i.telefono,
        i.valor_turno_extra,
        i.estado,
        i.created_at,
        i.updated_at
      FROM instalaciones i
      LEFT JOIN clientes c ON i.cliente_id = c.id
      WHERE i.id = $1
    `, [instalacionId]);

    if (result.rows.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Instalación no encontrada' },
        { status: 404 }
      );
    }

    const instalacion = result.rows[0];

    return NextResponse.json({
      success: true,
      data: instalacion
    });
  } catch (error) {
    logger.error('Error obteniendo instalación::', error);
    return NextResponse.json(
      { success: false, error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
} 