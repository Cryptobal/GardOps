import { requireAuthz } from '@/lib/authz-api'
import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/database';
import { getUserInfo } from '@/lib/auth';

export async function DELETE(
  request: NextRequest,
  {
const __req = (typeof req!== 'undefined' ? req : (typeof request !== 'undefined' ? request : (arguments as any)[0]));
const deny = await requireAuthz(__req as any, { resource: 'instalaciones', action: 'delete' });
if (deny) return deny;
 params }: { params: { id: string; ppcId: string } }
) {
  try {
    const { id: instalacionId, ppcId } = params;
    
    // Obtener información del usuario que está realizando la acción
    const userInfo = getUserInfo();
    const userId = userInfo?.user_id || null;

    // Verificar que el puesto operativo existe y pertenece a esta instalación
    const puestoCheck = await query(`
      SELECT id, instalacion_id, rol_id, guardia_id, nombre_puesto, es_ppc, activo
      FROM as_turnos_puestos_operativos
      WHERE id = $1 AND instalacion_id = $2
    `, [ppcId, instalacionId]);

    if (puestoCheck.rows.length === 0) {
      return NextResponse.json(
        { error: 'Puesto operativo no encontrado' },
        { status: 404 }
      );
    }

    const puesto = puestoCheck.rows[0];

    // Verificar si tiene historial operativo
    const historialCheck = await query(`
      SELECT 
        (SELECT COUNT(*) FROM as_turnos_puestos_operativos WHERE id = $1 AND guardia_id IS NOT NULL AND activo = true) as guardia_asignada
    `, [ppcId]);

    const { guardia_asignada } = historialCheck.rows[0];
    const tieneHistorial = guardia_asignada > 0;

    // Iniciar transacción
    await query('BEGIN');

    try {
      let resultado = {
        fueEliminado: false,
        fueInactivado: false,
        mensaje: ''
      };

      if (!tieneHistorial) {
        // Eliminar definitivamente si no tiene historial
        await query(`
          DELETE FROM as_turnos_puestos_operativos 
          WHERE id = $1
        `, [ppcId]);

        resultado = {
          fueEliminado: true,
          fueInactivado: false,
          mensaje: '✅ Puesto eliminado correctamente'
        };
      } else {
        // Inactivar si tiene historial
        await query(`
          UPDATE as_turnos_puestos_operativos 
          SET activo = false, 
              eliminado_en = NOW(),
              eliminado_por = $2
          WHERE id = $1
        `, [ppcId, userId]);

        resultado = {
          fueEliminado: false,
          fueInactivado: true,
          mensaje: '⚠️ Puesto inactivado por historial operativo'
        };
      }

      await query('COMMIT');

      // Log para debugging
      console.log("🔍 Resultado eliminación de puesto", {
        puesto_id: ppcId,
        fueEliminado: resultado.fueEliminado,
        fueInactivado: resultado.fueInactivado,
        tieneHistorial,
        guardia_asignada,
        usuario_id: userId
      });

      return NextResponse.json({
        success: true,
        ...resultado
      });

    } catch (error) {
      await query('ROLLBACK');
      throw error;
    }

  } catch (error: any) {
    console.error('Error eliminando puesto operativo:', error);
    return NextResponse.json(
      { error: error.message || 'Error interno del servidor' },
      { status: 500 }
    );
  }
} 