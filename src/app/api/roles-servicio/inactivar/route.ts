import { requireAuthz } from '@/lib/authz-api'
import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/database';

export async function POST(request: NextRequest) {
const __req = (typeof req!== 'undefined' ? req : (typeof request !== 'undefined' ? request : (arguments as any)[0]));
const deny = await requireAuthz(__req as any, { resource: 'roles_servicio', action: 'create' });
if (deny) return deny;

  try {
    console.log('🔍 Iniciando proceso de inactivación...');
    const body = await request.json();
    const { rolId, instalacionId, motivo = 'Inactivación manual', usuario_id = null } = body;

    console.log('🔍 Datos recibidos:', { rolId, motivo });

    if (!rolId) {
      console.log('❌ Error: rolId no proporcionado');
      return NextResponse.json(
        { success: false, error: 'El rolId es requerido' },
        { status: 400 }
      );
    }
    if (!instalacionId) {
      console.log('❌ Error: instalacionId no proporcionado');
      return NextResponse.json(
        { success: false, error: 'El instalacionId es requerido' },
        { status: 400 }
      );
    }

    // Iniciar transacción
    await query('BEGIN');

    try {
      // 1. Verificar rol existe (sin cambiar su estado global)
      const resultRol = await query(
        `SELECT id, nombre FROM as_turnos_roles_servicio WHERE id = $1 LIMIT 1`,
        [rolId]
      );
      if ((resultRol as any).rowCount === 0) {
        await query('ROLLBACK');
        console.log('❌ Error: Rol de servicio no encontrado');
        return NextResponse.json(
          { success: false, error: 'Rol de servicio no encontrado' },
          { status: 404 }
        );
      }

      console.log('🔍 Inactivando estructuras de servicio SOLO en la instalación indicada...');
      // 2. Inactivar solo las estructuras asociadas al rol y a la instalación indicada
      const resultEstructuras = await query(`
        UPDATE sueldo_estructuras_servicio 
        SET 
          activo = false,
          fecha_inactivacion = NOW(),
          updated_at = NOW()
        WHERE rol_servicio_id = $1 AND instalacion_id = $2 AND activo = true
        RETURNING id, instalacion_id, rol_servicio_id, sueldo_base
      `, [rolId, instalacionId]);

      console.log('🔍 Registrando en historial...');
      // 3. Registrar en historial para cada estructura inactivada (usar tabla con prefijo sueldo_)
      for (const estructura of resultEstructuras.rows) {
        await query(`
          INSERT INTO sueldo_historial_estructuras (
            rol_servicio_id,
            estructura_id,
            accion,
            fecha_accion,
            detalles,
            usuario_id,
            datos_anteriores,
            datos_nuevos
          ) VALUES ($1, $2, 'INACTIVACION', NOW(), $3, $4, $5, $6)
        `, [
          rolId,
          estructura.id,
          `Estructura inactivada por inactivación del rol: ${motivo}`,
          usuario_id,
          JSON.stringify(estructura),
          JSON.stringify({ ...estructura, activo: false, fecha_inactivacion: new Date() })
        ]);
      }

      // 4. Registrar inactivación del rol en historial
      await query(`
        INSERT INTO sueldo_historial_roles (
          rol_servicio_id,
          accion,
          detalles,
          fecha_accion,
          usuario_id,
          datos_anteriores
        ) VALUES ($1, $2, $3, NOW(), $4, $5)
      `, [
        rolId,
        'INACTIVACION',
        `${motivo} (instalacion_id=${instalacionId})`,
        usuario_id,
        JSON.stringify({
          rol: resultRol.rows[0],
          instalacion_id: instalacionId,
          estructuras_afectadas: resultEstructuras.rows.length
        })
      ]);

      // Commit transacción
      await query('COMMIT');

      console.log('✅ Inactivación completada exitosamente');
      return NextResponse.json({
        success: true,
        message: 'Rol de servicio y estructuras inactivados exitosamente',
        data: {
          rol: resultRol.rows[0],
          estructuras_inactivadas: resultEstructuras.rows,
          estructuras_count: resultEstructuras.rowCount,
          historial: {
            accion: 'INACTIVACION',
            motivo,
            fecha: new Date().toISOString()
          }
        }
      });

    } catch (error) {
      await query('ROLLBACK');
      throw error;
    }

  } catch (error) {
    console.error('❌ Error al inactivar rol de servicio:', error);
    return NextResponse.json(
      { success: false, error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}