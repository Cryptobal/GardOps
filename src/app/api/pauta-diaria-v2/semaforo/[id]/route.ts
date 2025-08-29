import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/database';

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { estado } = await request.json();
    const pautaId = params.id;

    // Validar estado
    const estadosValidos = ['pendiente', 'en_camino', 'urgencia', 'completado'];
    if (!estadosValidos.includes(estado)) {
      return NextResponse.json(
        { error: 'Estado inválido' },
        { status: 400 }
      );
    }

    // Actualizar el estado del semáforo en la base de datos
    const result = await pool.query(
      `UPDATE as_turnos_pauta_mensual 
       SET meta = jsonb_set(
         COALESCE(meta, '{}'::jsonb), 
         '{estado_semaforo}', 
         $1::jsonb
       )
       WHERE pauta_id = $2`,
      [JSON.stringify(estado), pautaId]
    );

    if (result.rowCount === 0) {
      return NextResponse.json(
        { error: 'Pauta no encontrada' },
        { status: 404 }
      );
    }

    return NextResponse.json({ 
      success: true, 
      estado,
      pauta_id: pautaId 
    });

  } catch (error) {
    console.error('Error actualizando estado del semáforo:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}
