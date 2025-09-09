import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/database';

export async function POST(request: NextRequest) {
  try {
    const { guardia_id, pauta_id, fecha } = await request.json();

    console.log('🟧 [TURNO EXTRA REEMPLAZO] Iniciando:', {
      guardia_id,
      pauta_id,
      fecha
    });

    if (!guardia_id || !pauta_id) {
      return NextResponse.json(
        { error: 'Faltan campos requeridos: guardia_id y pauta_id' },
        { status: 400 }
      );
    }

    // Verificar que la pauta existe
    const pautaCheck = await query(`
      SELECT pm.id, pm.puesto_id, pm.guardia_id, pm.anio, pm.mes, pm.dia,
             po.instalacion_id, i.nombre as instalacion_nombre, rs.nombre as rol_nombre,
             g.nombre as guardia_original_nombre, g.apellido_paterno, g.apellido_materno
      FROM as_turnos_pauta_mensual pm
      INNER JOIN as_turnos_puestos_operativos po ON pm.puesto_id = po.id
      INNER JOIN instalaciones i ON po.instalacion_id = i.id
      INNER JOIN as_turnos_roles_servicio rs ON po.rol_id = rs.id
      LEFT JOIN guardias g ON pm.guardia_id = g.id
      WHERE pm.id = $1
    `, [pauta_id]);

    if (pautaCheck.rows.length === 0) {
      return NextResponse.json(
        { error: 'Pauta no encontrada' },
        { status: 404 }
      );
    }

    const pauta = pautaCheck.rows[0];

    // Verificar que el guardia reemplazo existe
    const guardiaCheck = await query('SELECT id, nombre, apellido_paterno, apellido_materno FROM guardias WHERE id = $1', [guardia_id]);
    if (guardiaCheck.rows.length === 0) {
      return NextResponse.json({ error: 'Guardia no encontrado' }, { status: 404 });
    }

    // LÓGICA IGUAL QUE "SIN COBERTURA" → ASIGNAR GUARDIA EN PAUTA DIARIA
    await query('BEGIN');

    try {
      // 1. Marcar guardia original como "sin_cobertura" (inasistencia)
      await query(`
        UPDATE as_turnos_pauta_mensual 
        SET estado_ui = 'sin_cobertura',
            updated_at = NOW()
        WHERE id = $1
      `, [pauta_id]);

      // 2. Crear turno extra para el guardia de reemplazo
      await query(`
        UPDATE as_turnos_pauta_mensual 
        SET meta = COALESCE(meta, '{}')::jsonb || '{"cobertura_guardia_id": "${guardia_id}"}'::jsonb,
            updated_at = NOW()
        WHERE id = $1
      `, [pauta_id]);

      await query('COMMIT');

      console.log(`✅ [TURNO EXTRA REEMPLAZO] Guardia ${guardia_id} reemplaza a ${pauta.guardia_id} en pauta ${pauta_id}`);

      return NextResponse.json({
        success: true,
        message: 'Turno extra de reemplazo asignado correctamente',
        tipo: 'turno_extra_reemplazo',
        pauta_id,
        guardia_original_id: pauta.guardia_id,
        guardia_original_nombre: pauta.guardia_original_nombre ? 
          `${pauta.apellido_paterno} ${pauta.apellido_materno}, ${pauta.guardia_original_nombre}` : 'Guardia',
        guardia_reemplazo_id: guardia_id,
        fecha,
        instalacion: pauta.instalacion_nombre,
        rol: pauta.rol_nombre
      });

    } catch (transactionError) {
      await query('ROLLBACK');
      console.error('❌ [TURNO EXTRA REEMPLAZO] Error en transacción:', transactionError);
      throw transactionError;
    }

  } catch (error) {
    console.error('Error creando turno extra de reemplazo:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}
