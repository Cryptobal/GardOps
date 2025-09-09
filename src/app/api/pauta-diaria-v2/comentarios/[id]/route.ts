import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/database';

import { logger, devLogger, apiLogger } from '@/lib/utils/logger';
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { comentario } = await request.json();
    const pautaId = params.id;

    if (!comentario || typeof comentario !== 'string') {
      return NextResponse.json(
        { error: 'Comentario requerido' },
        { status: 400 }
      );
    }

    // Actualizar el comentario en la base de datos
    const result = await pool.query(
      `UPDATE as_turnos_pauta_mensual 
       SET meta = jsonb_set(
         COALESCE(meta, '{}'::jsonb), 
         '{comentarios}', 
         $1::jsonb
       )
       WHERE pauta_id = $2`,
      [JSON.stringify(comentario), pautaId]
    );

    if (result.rowCount === 0) {
      return NextResponse.json(
        { error: 'Pauta no encontrada' },
        { status: 404 }
      );
    }

    return NextResponse.json({ 
      success: true, 
      comentario,
      pauta_id: pautaId 
    });

  } catch (error) {
    logger.error('Error guardando comentario::', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}
