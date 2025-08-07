import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/database';

export async function POST(request: NextRequest) {
  try {
    console.log('🔍 Iniciando proceso de inactivación...');
    const body = await request.json();
    const { rolId, motivo = 'Inactivación manual' } = body;

    console.log('🔍 Datos recibidos:', { rolId, motivo });

    if (!rolId) {
      console.log('❌ Error: rolId no proporcionado');
      return NextResponse.json(
        { success: false, error: 'El rolId es requerido' },
        { status: 400 }
      );
    }

    console.log('🔍 Inactivando rol de servicio...');
    // 1. Inactivar el rol de servicio
    const resultRol = await query(`
      UPDATE as_turnos_roles_servicio 
      SET estado = 'Inactivo', updated_at = NOW()
      WHERE id = $1
      RETURNING id, nombre, estado
    `, [rolId]);

    console.log('🔍 Resultado de inactivación del rol:', { rowCount: resultRol.rowCount, rows: resultRol.rows });

    if (resultRol.rowCount === 0) {
      console.log('❌ Error: Rol de servicio no encontrado');
      return NextResponse.json(
        { success: false, error: 'Rol de servicio no encontrado' },
        { status: 404 }
      );
    }

    console.log('🔍 Inactivando estructura de sueldo...');
    // 2. Inactivar la estructura de sueldo asociada
    const resultEstructura = await query(`
      UPDATE sueldo_estructuras_roles 
      SET activo = false, fecha_inactivacion = NOW(), updated_at = NOW()
      WHERE rol_servicio_id = $1
      RETURNING id, rol_servicio_id, sueldo_base
    `, [rolId]);

    console.log('🔍 Resultado de inactivación de estructura:', { rowCount: resultEstructura.rowCount, rows: resultEstructura.rows });

    console.log('🔍 Creando registro en historial...');
    // 3. Crear registro en historial
    await query(`
      INSERT INTO historial_roles_servicio (
        rol_servicio_id, 
        accion, 
        detalles, 
        fecha_accion, 
        datos_anteriores
      ) VALUES ($1, $2, $3, NOW(), $4)
    `, [
      rolId,
      'INACTIVACION',
      motivo,
      JSON.stringify({
        rol: resultRol.rows[0],
        estructura: resultEstructura.rows[0] || null
      })
    ]);

    console.log('✅ Inactivación completada exitosamente');

    return NextResponse.json({
      success: true,
      message: 'Rol de servicio y estructura de sueldo inactivados exitosamente',
      data: {
        rol: resultRol.rows[0],
        estructura: resultEstructura.rows[0] || null,
        historial: {
          accion: 'INACTIVACION',
          motivo,
          fecha: new Date().toISOString()
        }
      }
    });

  } catch (error) {
    console.error('❌ Error al inactivar rol de servicio:', error);
    return NextResponse.json(
      { success: false, error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}
