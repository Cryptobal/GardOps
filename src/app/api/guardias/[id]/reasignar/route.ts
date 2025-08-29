import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/database';

// POST: Reasignar guardia a una nueva instalación/PPC
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const guardiaId = params.id;
    const body = await request.json();
    const { nuevo_ppc_id, motivo_reasignacion } = body;

    if (!nuevo_ppc_id) {
      return NextResponse.json(
        { error: 'ID del nuevo PPC requerido' },
        { status: 400 }
      );
    }

    // Verificar que el guardia existe
    const guardiaCheck = await query(
      'SELECT id, nombre, apellido_paterno FROM guardias WHERE id = $1',
      [guardiaId]
    );

    if (guardiaCheck.rows.length === 0) {
      return NextResponse.json(
        { error: 'Guardia no encontrado' },
        { status: 404 }
      );
    }

    // Verificar que el nuevo PPC existe y está disponible
    const ppcCheck = await query(`
      SELECT 
        ppc.id,
        ppc.estado,
        ppc.requisito_puesto_id,
        i.nombre as instalacion_nombre,
        rs.nombre as rol_servicio_nombre
      FROM as_turnos_ppc ppc
      INNER JOIN requisitos_puesto rp ON ppc.requisito_puesto_id = rp.id
      INNER JOIN instalaciones i ON rp.instalacion_id = i.id
      INNER JOIN roles_servicio rs ON rp.rol_servicio_id = rs.id
      WHERE ppc.id = $1
    `, [nuevo_ppc_id]);

    if (ppcCheck.rows.length === 0) {
      return NextResponse.json(
        { error: 'PPC no encontrado' },
        { status: 404 }
      );
    }

    const nuevoPPC = ppcCheck.rows[0];

    if (nuevoPPC.estado !== 'Pendiente') {
      return NextResponse.json(
        { error: 'El PPC no está disponible para asignación' },
        { status: 400 }
      );
    }

    // Buscar asignación activa actual del guardia
    const asignacionActual = await query(`
      SELECT 
        ag.id as asignacion_id,
        ag.fecha_inicio,
        ag.requisito_puesto_id,
        i.nombre as instalacion_nombre,
        rs.nombre as rol_servicio_nombre
      FROM as_turnos_asignaciones ag
      INNER JOIN requisitos_puesto rp ON ag.requisito_puesto_id = rp.id
      INNER JOIN instalaciones i ON rp.instalacion_id = i.id
      INNER JOIN roles_servicio rs ON rp.rol_servicio_id = rs.id
      WHERE ag.guardia_id = $1 
        AND ag.estado = 'Activa'
        AND ag.fecha_termino IS NULL
    `, [guardiaId]);

    // También verificar PPCs activos
    const ppcActivo = await query(`
      SELECT 
        ppc.id as ppc_id,
        ppc.requisito_puesto_id,
        i.nombre as instalacion_nombre,
        rs.nombre as rol_servicio_nombre
      FROM as_turnos_ppc ppc
      INNER JOIN requisitos_puesto rp ON ppc.requisito_puesto_id = rp.id
      INNER JOIN instalaciones i ON rp.instalacion_id = i.id
      INNER JOIN roles_servicio rs ON rp.rol_servicio_id = rs.id
      WHERE ppc.guardia_asignado_id = $1 
        AND ppc.estado = 'Asignado'
    `, [guardiaId]);

    // Iniciar transacción para asegurar consistencia
    await query('BEGIN');

    try {
      // 1. Cerrar asignación actual si existe
      if (asignacionActual.rows.length > 0) {
        const asignacion = asignacionActual.rows[0];
        
        await query(`
          UPDATE as_turnos_asignaciones 
          SET 
            estado = 'Finalizada',
            fecha_termino = NOW(),
            observaciones = CONCAT(COALESCE(observaciones, ''), ' - Reasignado a ${nuevoPPC.instalacion_nombre}: ', NOW())
          WHERE id = $1
        `, [asignacion.asignacion_id]);

        console.log(`✅ Asignación anterior cerrada: ${asignacion.instalacion_nombre}`);
      }

      // 2. Cerrar PPC activo si existe
      if (ppcActivo.rows.length > 0) {
        const ppc = ppcActivo.rows[0];
        
        await query(`
          UPDATE as_turnos_ppc 
          SET 
            estado = 'Pendiente',
            guardia_asignado_id = NULL,
            fecha_asignacion = NULL,
            observaciones = CONCAT(COALESCE(observaciones, ''), ' - Guardia reasignado: ', NOW())
          WHERE id = $1
        `, [ppc.ppc_id]);

        console.log(`✅ PPC anterior cerrado: ${ppc.instalacion_nombre}`);
      }

      // 3. Asignar al nuevo PPC
      await query(`
        UPDATE as_turnos_ppc 
        SET 
          estado = 'Asignado',
          guardia_asignado_id = $1,
          fecha_asignacion = NOW(),
          observaciones = CONCAT(COALESCE(observaciones, ''), ' - Reasignado desde ${asignacionActual.rows[0]?.instalacion_nombre || 'Sin asignación previa'}: ', NOW())
        WHERE id = $2
      `, [guardiaId, nuevo_ppc_id]);

      // 4. Crear nueva asignación en historial
      await query(`
        INSERT INTO as_turnos_asignaciones (
          guardia_id,
          requisito_puesto_id,
          tipo_asignacion,
          fecha_inicio,
          estado,
          observaciones
        ) VALUES ($1, $2, 'Reasignación', NOW(), 'Activa', $3)
      `, [guardiaId, nuevoPPC.requisito_puesto_id, motivo_reasignacion || 'Reasignación desde ficha del guardia']);

      await query('COMMIT');

      console.log('✅ Reasignación completada exitosamente');

      return NextResponse.json({
        success: true,
        message: 'Guardia reasignado correctamente',
        asignacion_anterior: asignacionActual.rows[0] || null,
        nueva_asignacion: {
          instalacion: nuevoPPC.instalacion_nombre,
          rol_servicio: nuevoPPC.rol_servicio_nombre,
          fecha_inicio: new Date().toISOString()
        }
      });

    } catch (error) {
      await query('ROLLBACK');
      throw error;
    }

  } catch (error) {
    console.error('Error reasignando guardia:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}

// GET: Obtener información de reasignación disponible
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const guardiaId = params.id;

    // Verificar que el guardia existe
    const guardiaCheck = await query(
      'SELECT id, nombre, apellido_paterno FROM guardias WHERE id = $1',
      [guardiaId]
    );

    if (guardiaCheck.rows.length === 0) {
      return NextResponse.json(
        { error: 'Guardia no encontrado' },
        { status: 404 }
      );
    }

    // Obtener asignación actual
    const asignacionActual = await query(`
      SELECT 
        ag.id as asignacion_id,
        ag.fecha_inicio,
        ag.requisito_puesto_id,
        i.nombre as instalacion_nombre,
        i.id as instalacion_id,
        rs.nombre as rol_servicio_nombre
      FROM as_turnos_asignaciones ag
      INNER JOIN requisitos_puesto rp ON ag.requisito_puesto_id = rp.id
      INNER JOIN instalaciones i ON rp.instalacion_id = i.id
      INNER JOIN roles_servicio rs ON rp.rol_servicio_id = rs.id
      WHERE ag.guardia_id = $1 
        AND ag.estado = 'Activa'
        AND ag.fecha_termino IS NULL
    `, [guardiaId]);

    // Obtener PPCs disponibles para reasignación
    const ppcsDisponibles = await query(`
      SELECT 
        ppc.id as ppc_id,
        ppc.motivo,
        ppc.observaciones,
        ppc.created_at,
        i.nombre as instalacion_nombre,
        i.id as instalacion_id,
        rs.nombre as rol_servicio_nombre,
        rs.hora_inicio,
        rs.hora_termino
      FROM as_turnos_ppc ppc
      INNER JOIN requisitos_puesto rp ON ppc.requisito_puesto_id = rp.id
      INNER JOIN instalaciones i ON rp.instalacion_id = i.id
      INNER JOIN roles_servicio rs ON rp.rol_servicio_id = rs.id
      WHERE ppc.estado = 'Pendiente'
      ORDER BY ppc.created_at DESC
    `);

    return NextResponse.json({
      guardia: guardiaCheck.rows[0],
      asignacion_actual: asignacionActual.rows[0] || null,
      ppcs_disponibles: ppcsDisponibles.rows,
      puede_reasignar: asignacionActual.rows.length > 0
    });

  } catch (error) {
    console.error('Error obteniendo información de reasignación:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
} 