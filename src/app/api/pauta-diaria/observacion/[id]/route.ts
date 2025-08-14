import { requireAuthz } from '@/lib/authz-api'
import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/database';

export async function DELETE(
  request: NextRequest,
  {
const __req = (typeof req!== 'undefined' ? req : (typeof request !== 'undefined' ? request : (arguments as any)[0]));
const deny = await requireAuthz(__req as any, { resource: 'pauta_diaria', action: 'delete' });
if (deny) return deny;
 params }: { params: { id: string } }
) {
  try {
    const puestoId = params.id;
    
    if (!puestoId) {
      return NextResponse.json(
        { error: 'ID de puesto requerido' },
        { status: 400 }
      );
    }

    // Actualizar la observación a null para el puesto específico
    const result = await query(`
      UPDATE as_turnos_pauta_mensual 
      SET observaciones = NULL 
      WHERE id = $1
    `, [puestoId]);

    if (result.rowCount === 0) {
      return NextResponse.json(
        { error: 'Puesto no encontrado' },
        { status: 404 }
      );
    }

    console.log(`✅ Observación eliminada para puesto ${puestoId}`);

    return NextResponse.json(
      { message: 'Observación eliminada correctamente' },
      { status: 200 }
    );

  } catch (error) {
    console.error('Error al eliminar observación:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
} 