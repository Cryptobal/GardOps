import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/database';

export async function POST(request: NextRequest) {
  try {
    const { guardia_id, puesto_id, fecha } = await request.json();

    console.log('🟨 [TURNO EXTRA PPC] Iniciando:', {
      guardia_id,
      puesto_id,
      fecha
    });

    if (!guardia_id || !puesto_id) {
      return NextResponse.json(
        { error: 'Faltan campos requeridos: guardia_id y puesto_id' },
        { status: 400 }
      );
    }

    const fechaFinal = fecha || new Date().toISOString().split('T')[0];

    // Verificar que el puesto existe
    const puestoCheck = await query(`
      SELECT po.id, po.instalacion_id, po.rol_id, i.nombre as instalacion_nombre, rs.nombre as rol_nombre
      FROM as_turnos_puestos_operativos po
      INNER JOIN instalaciones i ON po.instalacion_id = i.id
      INNER JOIN as_turnos_roles_servicio rs ON po.rol_id = rs.id
      WHERE po.id = $1
    `, [puesto_id]);

    if (puestoCheck.rows.length === 0) {
      return NextResponse.json(
        { error: 'Puesto operativo no encontrado' },
        { status: 404 }
      );
    }

    const puesto = puestoCheck.rows[0];

    // Verificar que el guardia existe
    const guardiaCheck = await query('SELECT id, nombre, apellido_paterno, apellido_materno FROM guardias WHERE id = $1', [guardia_id]);
    if (guardiaCheck.rows.length === 0) {
      return NextResponse.json({ error: 'Guardia no encontrado' }, { status: 404 });
    }

    // LÓGICA IGUAL QUE BOTÓN "CUBRIR" EN PAUTA DIARIA
    // Buscar si ya existe una entrada en pauta mensual para este puesto/fecha
    const [anio, mes, dia] = fechaFinal.split('-').map(Number);
    
    const pautaExistente = await query(`
      SELECT id FROM as_turnos_pauta_mensual 
      WHERE puesto_id = $1 AND anio = $2 AND mes = $3 AND dia = $4
    `, [puesto_id, anio, mes, dia]);

    let pautaId;

    if (pautaExistente.rows.length > 0) {
      // Actualizar entrada existente con turno extra
      pautaId = pautaExistente.rows[0].id;
      await query(`
        UPDATE as_turnos_pauta_mensual 
        SET estado_ui = 'turno_extra',
            meta = COALESCE(meta, '{}')::jsonb || '{"cobertura_guardia_id": "${guardia_id}"}'::jsonb,
            actualizado_en = NOW()
        WHERE id = $1
      `, [pautaId]);
    } else {
      // Crear nueva entrada para turno extra
      const nuevaPauta = await query(`
        INSERT INTO as_turnos_pauta_mensual (puesto_id, anio, mes, dia, estado_ui, meta, guardia_id)
        VALUES ($1, $2, $3, $4, 'turno_extra', '{"cobertura_guardia_id": "${guardia_id}"}', NULL)
        RETURNING id
      `, [puesto_id, anio, mes, dia]);
      pautaId = nuevaPauta.rows[0].id;
    }

    console.log(`✅ [TURNO EXTRA PPC] Creado/actualizado pauta ID: ${pautaId}`);

    return NextResponse.json({
      success: true,
      message: 'Turno extra asignado al PPC correctamente',
      tipo: 'turno_extra_ppc',
      pauta_id: pautaId,
      guardia_id,
      puesto_id,
      fecha: fechaFinal,
      instalacion: puesto.instalacion_nombre,
      rol: puesto.rol_nombre
    });

  } catch (error) {
    console.error('Error creando turno extra para PPC:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}
