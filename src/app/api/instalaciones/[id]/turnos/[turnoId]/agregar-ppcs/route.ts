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
      SELECT tc.id, tc.rol_servicio_id, tc.cantidad_guardias, tr.id as requisito_id
      FROM as_turnos_configuracion tc
      LEFT JOIN as_turnos_requisitos tr ON tr.rol_servicio_id = tc.rol_servicio_id AND tr.instalacion_id = tc.instalacion_id
      WHERE tc.id = $1 AND tc.instalacion_id = $2
    `, [turnoId, instalacionId]);

    if (turnoResult.rows.length === 0) {
      return NextResponse.json(
        { error: 'Turno no encontrado' },
        { status: 404 }
      );
    }

    const turno = turnoResult.rows[0];
    let requisitoId = turno.requisito_id;

    // Si no existe un requisito, crearlo
    if (!requisitoId) {
      const requisitoResult = await query(`
        INSERT INTO as_turnos_requisitos (
          instalacion_id,
          rol_servicio_id,
          cantidad_guardias,
          vigente_desde,
          vigente_hasta,
          estado
        ) VALUES ($1, $2, $3, CURRENT_DATE, NULL, 'Activo')
        RETURNING id
      `, [instalacionId, turno.rol_servicio_id, turno.cantidad_guardias]);

      requisitoId = requisitoResult.rows[0].id;
    }

    // Crear los nuevos PPCs
    const ppcsCreados = [];
    for (let i = 0; i < cantidad; i++) {
      const ppcResult = await query(`
        INSERT INTO as_turnos_ppc (
          requisito_puesto_id,
          cantidad_faltante,
          motivo,
          prioridad,
          fecha_deteccion,
          estado
        ) VALUES ($1, $2, $3, $4, CURRENT_DATE, 'Pendiente')
        RETURNING id
      `, [requisitoId, 1, 'falta_asignacion', 'Media']);

      ppcsCreados.push(ppcResult.rows[0].id);
    }

    // Actualizar la cantidad de guardias en el turno
    await query(`
      UPDATE as_turnos_configuracion 
      SET cantidad_guardias = cantidad_guardias + $1,
          updated_at = NOW()
      WHERE id = $2
    `, [cantidad, turnoId]);

    console.log(`✅ Agregados ${cantidad} PPCs al turno ${turnoId}`);

    return NextResponse.json({
      success: true,
      message: `${cantidad} puesto(s) agregado(s) correctamente`,
      ppcs_creados: ppcsCreados
    });

  } catch (error: any) {
    console.error('Error agregando PPCs:', error);
    return NextResponse.json(
      { error: error.message || 'Error interno del servidor' },
      { status: 500 }
    );
  }
} 