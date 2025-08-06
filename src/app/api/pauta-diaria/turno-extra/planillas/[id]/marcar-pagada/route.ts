import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@vercel/postgres';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const planillaId = parseInt(params.id);
    if (!planillaId) {
      return NextResponse.json({ error: 'ID de planilla inválido' }, { status: 400 });
    }

    // Verificar que la planilla existe y no está pagada
    const planillaQuery = `
      SELECT id, estado, monto_total, cantidad_turnos
      FROM TE_planillas_turnos_extras 
      WHERE id = $1
    `;
    
    const planillaResult = await sql.query(planillaQuery, [planillaId]);
    
    if (planillaResult.rows.length === 0) {
      return NextResponse.json({ error: 'Planilla no encontrada' }, { status: 404 });
    }

    const planilla = planillaResult.rows[0];
    
    if (planilla.estado === 'pagada') {
      return NextResponse.json({ error: 'La planilla ya está marcada como pagada' }, { status: 400 });
    }

    // Obtener usuario_id
    const usuarioQuery = 'SELECT id FROM usuarios WHERE email = $1';
    const usuarioResult = await sql.query(usuarioQuery, [session.user.email]);
    const usuarioId = usuarioResult.rows[0]?.id;

    // Actualizar planilla como pagada
    await sql.query(
      `UPDATE TE_planillas_turnos_extras 
       SET estado = 'pagada', fecha_pago = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
       WHERE id = $1`,
      [planillaId]
    );

    // Actualizar todos los turnos extras de esta planilla como pagados
    await sql.query(
      `UPDATE TE_turnos_extras 
       SET pagado = true, fecha_pago = CURRENT_TIMESTAMP, usuario_pago = $1
       WHERE planilla_id = $2`,
      [usuarioId, planillaId]
    );

    return NextResponse.json({
      mensaje: `Planilla marcada como pagada exitosamente`,
      planilla_id: planillaId,
      monto_total: planilla.monto_total,
      cantidad_turnos: planilla.cantidad_turnos,
      fecha_pago: new Date().toISOString()
    });

  } catch (error) {
    console.error('Error marcando planilla como pagada:', error);
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
  }
} 