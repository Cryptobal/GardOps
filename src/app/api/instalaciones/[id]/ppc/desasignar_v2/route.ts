import { requireAuthz } from '@/lib/authz-api'
import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/database';

// POST: Desasignar guardia de un PPC usando el nuevo modelo
export async function POST(
  request: NextRequest,
  {

 params }: { params: { id: string } }
) {
  console.log("🔁 Endpoint activo: /api/instalaciones/[id]/ppc/desasignar_v2");
  
  try {
    const instalacionId = params.id;
    const body = await request.json();
    const { puesto_operativo_id } = body;

    console.log("🔍 Desasignando puesto:", puesto_operativo_id, "de instalación:", instalacionId);

    if (!puesto_operativo_id) {
      return NextResponse.json(
        { error: 'Faltan campos requeridos' },
        { status: 400 }
      );
    }

    // Marcar puesto como PPC nuevamente en as_turnos_puestos_operativos
    console.log("🔄 Marcando puesto como PPC...");
    const result = await query(`
      UPDATE as_turnos_puestos_operativos 
      SET es_ppc = true,
          guardia_id = NULL
      WHERE id = $1 AND instalacion_id = $2
      RETURNING *
    `, [puesto_operativo_id, instalacionId]);

    console.log(`✅ Puesto ${puesto_operativo_id} marcado como PPC correctamente`);

    return NextResponse.json({
      success: true,
      message: 'Puesto marcado como PPC correctamente',
      puesto: result.rows[0]
    });
  } catch (error) {
    console.error('❌ Error desasignando guardia v2:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
} 