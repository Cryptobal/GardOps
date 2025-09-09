import { requireAuthz } from '@/lib/authz-api';
import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';

import { logger, devLogger, apiLogger } from '@/lib/utils/logger';
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string; turnoId: string } }
) {
  const deny = await requireAuthz(request, { resource: 'instalaciones', action: 'create' });
  if (deny) return deny;

  try {
    const { id: instalacionId, turnoId } = params;
    const body = await request.json();
    const { guardia_id, puesto_id } = body;

    if (!guardia_id || !puesto_id) {
      return NextResponse.json(
        { error: 'Faltan campos requeridos: guardia_id y puesto_id' },
        { status: 400 }
      );
    }

    // Verificar que el puesto existe y pertenece al turno e instalación
    const puestoCheck = await sql`
      SELECT po.id, po.es_ppc, po.guardia_id
      FROM as_turnos_puestos_operativos po
      WHERE po.id = ${puesto_id} 
        AND po.rol_id = ${turnoId} 
        AND po.instalacion_id = ${instalacionId} 
        AND po.activo = true
    `;

    if (puestoCheck.rows.length === 0) {
      return NextResponse.json(
        { error: 'Puesto no encontrado o no pertenece al turno' },
        { status: 404 }
      );
    }

    const puesto = puestoCheck.rows[0];

    if (!puesto.es_ppc) {
      return NextResponse.json(
        { error: 'El puesto ya tiene un guardia asignado' },
        { status: 400 }
      );
    }

    // Verificar guardia y asignación activa global
    const guardiaCheck = await sql`SELECT id FROM guardias WHERE id = ${guardia_id}`;
    if (guardiaCheck.rows.length === 0) {
      return NextResponse.json({ error: 'Guardia no encontrado' }, { status: 404 });
    }

    const asignacionExistente = await sql`
      SELECT po.id as puesto_id, po.nombre_puesto, po.instalacion_id, po.creado_en
      FROM as_turnos_puestos_operativos po
      WHERE po.guardia_id = ${guardia_id} AND po.es_ppc = false AND po.activo = true
      LIMIT 1
    `;

    if (asignacionExistente.rows.length > 0) {
      return NextResponse.json(
        { error: 'El guardia ya tiene una asignación activa' },
        { status: 409 }
      );
    }

    // Ejecutar asignación con transacción para garantizar consistencia
    await sql`BEGIN`;
    
    try {
      // Asignar guardia al puesto (lo vuelve no PPC)
      await sql`
        UPDATE as_turnos_puestos_operativos 
        SET guardia_id = ${guardia_id}, es_ppc = false, actualizado_en = NOW()
        WHERE id = ${puesto_id}
      `;

      // Log estructurado de la asignación
      logger.debug(`✅ [ASIGNACIÓN] Guardia ${guardia_id} asignado a puesto ${puesto_id} en instalación ${instalacionId}`);

      // Reordenar: puestos activos del turno, guardias primero; el puesto asignado debe quedar #1
      const puestos = await sql`
        SELECT id, nombre_puesto, guardia_id
        FROM as_turnos_puestos_operativos
        WHERE rol_id = ${turnoId} AND instalacion_id = ${instalacionId} AND activo = true
      `;

      const conGuardia = (puestos.rows as any[]).filter(p => p.guardia_id !== null);
      const sinGuardia = (puestos.rows as any[]).filter(p => p.guardia_id === null);

      // Poner el recién asignado primero
      const asignadoPrimero = [
        ...conGuardia.sort((a, b) => (a.id === puesto_id ? -1 : b.id === puesto_id ? 1 : 0)),
        ...sinGuardia
      ];

      let index = 1;
      for (const p of asignadoPrimero) {
        const nuevo = `Puesto #${index}`;
        if (p.nombre_puesto !== nuevo) {
          await sql`UPDATE as_turnos_puestos_operativos SET nombre_puesto = ${nuevo} WHERE id = ${p.id}`;
        }
        index++;
      }

      // Confirmar transacción
      await sql`COMMIT`;
      logger.debug(`✅ [TRANSACCIÓN] Asignación completada exitosamente`);
      
    } catch (transactionError) {
      // Revertir cambios en caso de error
      await sql`ROLLBACK`;
      console.error(`❌ [TRANSACCIÓN] Error en asignación, cambios revertidos:`, transactionError);
      throw transactionError;
    }

    return NextResponse.json({ success: true, message: 'Guardia asignado y puestos reordenados' });

  } catch (error: any) {
    logger.error('Error asignando guardia::', error);
    return NextResponse.json(
      { error: error.message || 'Error interno del servidor' },
      { status: 500 }
    );
  }
}
