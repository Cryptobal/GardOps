import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/database';
import { getCurrentUserServer } from '@/lib/auth';

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    console.log('🔍 Iniciando POST /api/pauta-diaria/turno-extra/planillas/[id]/marcar-pagada');
    
    const user = getCurrentUserServer(request);
    if (!user) {
      console.log('❌ Usuario no autorizado');
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const planillaId = parseInt(params.id);
    if (!planillaId || isNaN(planillaId)) {
      return NextResponse.json({ error: 'ID de planilla inválido' }, { status: 400 });
    }

    console.log('🔍 Marcando planilla como pagada ID:', planillaId);

    // Verificar que la planilla existe y no está pagada
    const { rows: planillaResult } = await query(
      'SELECT id, estado, monto_total, cantidad_turnos FROM te_planillas_turnos_extras WHERE id = $1',
      [planillaId]
    );
    
    if (planillaResult.length === 0) {
      return NextResponse.json({ error: 'Planilla no encontrada' }, { status: 404 });
    }

    const planilla = planillaResult[0];
    
    if (planilla.estado === 'pagada') {
      return NextResponse.json({ error: 'La planilla ya está marcada como pagada' }, { status: 400 });
    }

    // Obtener usuario_id
    const { rows: usuarioResult } = await query(
      'SELECT id FROM usuarios WHERE email = $1',
      [user.email]
    );
    const usuarioId = usuarioResult[0]?.id;

    if (!usuarioId) {
      return NextResponse.json({ error: 'Usuario no encontrado' }, { status: 404 });
    }

    // Iniciar transacción
    await query('BEGIN');

    try {
      // Actualizar planilla como pagada
      await query(
        `UPDATE te_planillas_turnos_extras 
         SET estado = 'pagada', fecha_pago = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
         WHERE id = $1`,
        [planillaId]
      );

      // Actualizar todos los turnos extras de esta planilla como pagados y preservados
      await query(
        `UPDATE te_turnos_extras 
         SET pagado = true, 
             preservado = true,
             fecha_pago = CURRENT_TIMESTAMP, 
             usuario_pago = $1,
             desacoplado_en = NOW()
         WHERE planilla_id = $2`,
        [usuarioId, planillaId]
      );

      await query('COMMIT');

      console.log('✅ Planilla marcada como pagada exitosamente');

      return NextResponse.json({
        mensaje: `Planilla marcada como pagada exitosamente`,
        planilla_id: planillaId,
        monto_total: planilla.monto_total,
        cantidad_turnos: planilla.cantidad_turnos,
        fecha_pago: new Date().toISOString()
      });

    } catch (error) {
      await query('ROLLBACK');
      throw error;
    }

  } catch (error) {
    console.error('❌ Error marcando planilla como pagada:', error);
    return NextResponse.json({ 
      error: 'Error interno del servidor',
      details: error instanceof Error ? error.message : 'Error desconocido'
    }, { status: 500 });
  }
} 