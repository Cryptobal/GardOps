import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/database';
import { getCurrentUserServer } from '@/lib/auth';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { turno_id, fecha, comentario } = body;

    // Validar campos requeridos
    if (!turno_id || !fecha || comentario === undefined) {
      return NextResponse.json({
        success: false,
        error: 'Faltan campos requeridos: turno_id, fecha, comentario'
      }, { status: 400 });
    }

    // Obtener usuario actual (opcional, para auditoría)
    const user = await getCurrentUserServer();
    const usuario_id = user?.id || null;

    // Usar UPSERT para insertar o actualizar comentario
    const query = `
      INSERT INTO as_turnos_comentarios (turno_id, fecha, comentario, usuario_id)
      VALUES ($1, $2, $3, $4)
      ON CONFLICT (turno_id, fecha)
      DO UPDATE SET
        comentario = EXCLUDED.comentario,
        usuario_id = EXCLUDED.usuario_id,
        updated_at = NOW()
      RETURNING id, comentario, updated_at
    `;

    const { rows } = await pool.query(query, [
      parseInt(turno_id),
      fecha,
      comentario.trim(),
      usuario_id
    ]);

    return NextResponse.json({
      success: true,
      data: {
        id: rows[0].id,
        comentario: rows[0].comentario,
        updated_at: rows[0].updated_at
      }
    });

  } catch (error) {
    console.error('❌ Error guardando comentario:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Error interno del servidor'
    }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const turno_id = searchParams.get('turno_id');
    const fecha = searchParams.get('fecha');

    if (!turno_id || !fecha) {
      return NextResponse.json({
        success: false,
        error: 'Faltan parámetros: turno_id y fecha'
      }, { status: 400 });
    }

    const query = `
      DELETE FROM as_turnos_comentarios 
      WHERE turno_id = $1 AND fecha = $2
    `;

    const result = await pool.query(query, [parseInt(turno_id), fecha]);

    return NextResponse.json({
      success: true,
      deleted: result.rowCount > 0
    });

  } catch (error) {
    console.error('❌ Error eliminando comentario:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Error interno del servidor'
    }, { status: 500 });
  }
}
