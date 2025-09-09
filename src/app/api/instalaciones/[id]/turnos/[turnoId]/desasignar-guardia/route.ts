import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';

import { logger, devLogger, apiLogger } from '@/lib/utils/logger';
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string; turnoId: string } }
) {
  try {
    const { id: instalacionId, turnoId } = params;
    const { puestoId } = await request.json();

    // 1. Desasignar el guardia del puesto y marcar como PPC
    await sql`
      UPDATE as_turnos_puestos_operativos 
      SET guardia_id = NULL,
          es_ppc = true
      WHERE id = ${puestoId} AND instalacion_id = ${instalacionId}
    `;

    // 2. Obtener todos los puestos activos del turno
    const puestosResult = await sql`
      SELECT id, nombre_puesto, es_ppc, guardia_id
      FROM as_turnos_puestos_operativos 
      WHERE rol_id = ${turnoId} AND instalacion_id = ${instalacionId} AND activo = true
    `;

    const conGuardia = (puestosResult.rows as any[]).filter(p => p.guardia_id !== null);
    const sinGuardia = (puestosResult.rows as any[]).filter(p => p.guardia_id === null);

    const ordenados = [...conGuardia, ...sinGuardia];

    let puestoIndex = 1;
    for (const puesto of ordenados) {
      const nuevoNombre = `Puesto #${puestoIndex}`;
      if (puesto.nombre_puesto !== nuevoNombre) {
        await sql`
          UPDATE as_turnos_puestos_operativos 
          SET nombre_puesto = ${nuevoNombre}
          WHERE id = ${puesto.id}
        `;
      }
      puestoIndex++;
    }

    return NextResponse.json({ 
      success: true, 
      message: 'Guardia desasignado y puestos reordenados correctamente' 
    });

  } catch (error) {
    logger.error('Error desasignando guardia::', error);
    return NextResponse.json(
      { error: 'No se pudo desasignar el guardia' },
      { status: 500 }
    );
  }
}
