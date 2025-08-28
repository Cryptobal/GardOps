import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string; turnoId: string } }
) {
  try {
    const { id: instalacionId, turnoId } = params;
    const { tipo_puesto_id } = await request.json();

    if (!tipo_puesto_id) {
      return NextResponse.json({ error: 'Falta tipo_puesto_id' }, { status: 400 });
    }

    // Extraer rol_id del turnoId compuesto
    const rolId = turnoId.split('_')[0];

    // Leer puestos activos del turno
    const puestosResult = await sql`
      SELECT id, nombre_puesto, es_ppc, guardia_id
      FROM as_turnos_puestos_operativos 
      WHERE rol_id = ${rolId} AND instalacion_id = ${instalacionId} AND activo = true
      ORDER BY nombre_puesto
    `;

    const usados = new Set<number>();
    for (const row of puestosResult.rows as any[]) {
      const match = /Puesto #(\d+)/.exec(row.nombre_puesto || '');
      if (match) usados.add(parseInt(match[1], 10));
    }

    // Limitar a 4
    if (usados.size >= 4) {
      return NextResponse.json({ error: 'Límite de 4 puestos alcanzado' }, { status: 409 });
    }

    // Encontrar el menor número disponible entre 1..4
    let numero = 1;
    while (usados.has(numero) && numero <= 4) numero++;
    const nuevoNombrePuesto = `Puesto #${numero}`;

    // Obtener tenant_id de la instalación
    const instalacionTenantResult = await sql`
      SELECT tenant_id FROM instalaciones WHERE id = ${instalacionId}
    `;
    const tenantId = instalacionTenantResult.rows[0]?.tenant_id;

    // Crear el nuevo puesto como PPC
    const nuevoPuestoResult = await sql`
      INSERT INTO as_turnos_puestos_operativos (
        instalacion_id,
        rol_id,
        nombre_puesto,
        es_ppc,
        activo,
        tipo_puesto_id,
        tenant_id,
        creado_en,
        actualizado_en
      ) VALUES (${instalacionId}, ${rolId}, ${nuevoNombrePuesto}, true, true, ${tipo_puesto_id}, ${tenantId}, NOW(), NOW())
      RETURNING *
    `;

    const nuevoPuesto = nuevoPuestoResult.rows[0];

    return NextResponse.json({ 
      success: true, 
      message: 'Puesto agregado correctamente',
      puesto: nuevoPuesto
    });

  } catch (error) {
    console.error('Error agregando puesto:', error);
    return NextResponse.json(
      { error: 'No se pudo agregar el puesto' },
      { status: 500 }
    );
  }
}
