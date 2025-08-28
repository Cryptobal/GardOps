import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/database';

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string; turnoId: string } }
) {
  try {
    const { id: instalacionId, turnoId } = params;
    const body = await request.json();
    const { cantidad } = body;

    if (!cantidad || cantidad < 1) {
      return NextResponse.json(
        { error: 'La cantidad debe ser mayor a 0' },
        { status: 400 }
      );
    }

    // Verificar que el turno existe y pertenece a la instalación
    const turnoResult = await query(`
      SELECT rol_id, COUNT(*) as total_puestos
      FROM as_turnos_puestos_operativos 
      WHERE rol_id = $1 AND instalacion_id = $2
      GROUP BY rol_id
    `, [turnoId, instalacionId]);

    if (turnoResult.rows.length === 0) {
      return NextResponse.json(
        { error: 'Turno no encontrado' },
        { status: 404 }
      );
    }

    const turno = turnoResult.rows[0];

    // Crear los nuevos puestos operativos como PPCs
    const puestosCreados = [];
    for (let i = 0; i < cantidad; i++) {
      const puestoResult = await query(`
        INSERT INTO as_turnos_puestos_operativos (
          instalacion_id,
          rol_id,
          nombre_puesto,
          es_ppc,
          creado_en
        ) VALUES ($1, $2, $3, true, NOW())
        RETURNING id
      `, [instalacionId, turnoId, `Puesto ${parseInt(turno.total_puestos) + i + 1}`]);

      puestosCreados.push(puestoResult.rows[0].id);
    }

    console.log(`✅ Agregados ${cantidad} PPCs al turno ${turnoId}`);

    return NextResponse.json({
      success: true,
      message: `${cantidad} puesto(s) agregado(s) correctamente`,
      puestos_creados: puestosCreados,
      total_puestos: parseInt(turno.total_puestos) + cantidad
    });

  } catch (error: any) {
    console.error('Error agregando PPCs:', error);
    return NextResponse.json(
      { error: error.message || 'Error interno del servidor' },
      { status: 500 }
    );
  }
} 