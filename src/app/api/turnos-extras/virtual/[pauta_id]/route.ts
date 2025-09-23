import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/database';
import { logger } from '@/lib/utils/logger';

export async function DELETE(
  request: NextRequest,
  { params }: { params: { pauta_id: string } }
) {
  try {
    const { pauta_id } = params;

    if (!pauta_id) {
      return NextResponse.json(
        { error: 'pauta_id es requerido' },
        { status: 400 }
      );
    }

    // Obtener información del turno virtual
    const { rows: turnoInfo } = await query(`
      SELECT 
        pm.id,
        pm.guardia_id,
        pm.guardia_trabajo_id,
        pm.instalacion_id,
        pm.puesto_id,
        pm.estado_puesto,
        pm.estado_guardia,
        pm.tipo_cobertura,
        pm.meta,
        g.nombre as guardia_nombre,
        g.apellido_paterno as guardia_apellido_paterno,
        gc.nombre as cobertura_guardia_nombre,
        gc.apellido_paterno as cobertura_guardia_apellido,
        i.nombre as instalacion_nombre,
        po.nombre_puesto as puesto_nombre,
        make_date(pm.anio, pm.mes, pm.dia) as fecha
      FROM as_turnos_pauta_mensual pm
      LEFT JOIN guardias g ON pm.guardia_id = g.id
      LEFT JOIN guardias gc ON gc.id = (pm.meta->>'cobertura_guardia_id')::uuid
      LEFT JOIN instalaciones i ON pm.instalacion_id = i.id
      LEFT JOIN as_turnos_puestos_operativos po ON pm.puesto_id = po.id
      WHERE pm.id = $1
    `, [pauta_id]);

    if (turnoInfo.length === 0) {
      return NextResponse.json(
        { error: 'Turno virtual no encontrado' },
        { status: 404 }
      );
    }

    const turno = turnoInfo[0];

    // Verificar que es un turno virtual (tiene cobertura)
    if (!turno.meta || !turno.meta.cobertura_guardia_id) {
      return NextResponse.json(
        { error: 'Este no es un turno virtual válido' },
        { status: 400 }
      );
    }

    // Revertir la cobertura usando la función fn_deshacer
    try {
      const { rows: resultado } = await query(`
        SELECT * FROM as_turnos.fn_deshacer($1::bigint, $2::text)
      `, [pauta_id, 'api_turnos_extras']);

      logger.debug(`Resultado fn_deshacer para pauta ${pauta_id}:`, resultado);

      if (resultado.length === 0 || !resultado[0].ok) {
        logger.error(`fn_deshacer falló para pauta ${pauta_id}:`, resultado);
        return NextResponse.json(
          { error: 'Error al revertir la cobertura' },
          { status: 500 }
        );
      }
    } catch (fnError) {
      logger.error(`Error ejecutando fn_deshacer para pauta ${pauta_id}:`, fnError);
      // Si la función fn_deshacer falla, continuar con la lógica manual
      logger.info(`Continuando con lógica manual para pauta ${pauta_id}`);
    }

        // Restaurar el estado original según si el puesto es originalmente PPC o no
        await query(`
          UPDATE as_turnos_pauta_mensual pm
          SET 
            guardia_id = CASE 
              WHEN po.es_ppc = true THEN NULL    -- Era PPC original, quitar guardia
              ELSE pm.guardia_id                 -- Era guardia asignado, mantener guardia
            END,
            guardia_trabajo_id = CASE 
              WHEN po.es_ppc = true THEN NULL    -- Era PPC original, vuelve a PPC
              ELSE pm.guardia_id                 -- Era guardia asignado, restaurar guardia
            END,
            estado_puesto = CASE 
              WHEN po.es_ppc = true THEN 'ppc'   -- Era PPC original
              ELSE 'asignado'                    -- Era guardia asignado original
            END,
            estado_guardia = NULL,               -- Volver a planificado (no asistido)
            tipo_cobertura = CASE 
              WHEN po.es_ppc = true THEN 'ppc'        -- Era PPC original
              ELSE 'guardia_asignado'                 -- Era guardia asignado original
            END,
            meta = '{}'::jsonb,                  -- Limpiar metadata de cobertura
            updated_at = NOW()
          FROM as_turnos_puestos_operativos po
          WHERE pm.id = $1 AND pm.puesto_id = po.id
        `, [pauta_id]);

    logger.info(`Turno virtual eliminado (cobertura revertida): ${pauta_id}`);

    return NextResponse.json({
      success: true,
      message: 'Turno virtual eliminado correctamente (cobertura revertida)',
      data: {
        pauta_id,
        guardia_nombre: `${turno.guardia_nombre} ${turno.guardia_apellido_paterno}`,
        cobertura_guardia_nombre: `${turno.cobertura_guardia_nombre} ${turno.cobertura_guardia_apellido}`,
        instalacion_nombre: turno.instalacion_nombre,
        puesto_nombre: turno.puesto_nombre,
        fecha: turno.fecha
      }
    });

  } catch (error) {
    logger.error('Error al eliminar turno virtual:', error);
    console.error('Error detallado:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor', details: error instanceof Error ? error.message : 'Error desconocido' },
      { status: 500 }
    );
  }
}
