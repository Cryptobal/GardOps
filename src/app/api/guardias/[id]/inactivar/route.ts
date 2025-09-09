import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import { requireAuthz } from '@/lib/authz-api';

import { logger, devLogger, apiLogger } from '@/lib/utils/logger';
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Verificar permisos
    const maybeDeny = await requireAuthz(request as any, { 
      resource: 'guardias', 
      action: 'update' 
    });
    if (maybeDeny && (maybeDeny as any).status === 403) return maybeDeny;
  } catch (_) {
    // permitir en desarrollo
  }

  try {
    const guardiaId = params.id;
    const body = await request.json();
    const { motivo = 'Inactivación manual' } = body;

    if (!guardiaId) {
      return NextResponse.json(
        { success: false, error: 'ID de guardia requerido' },
        { status: 400 }
      );
    }

    await sql`BEGIN`;

    try {
      // 1. Verificar que el guardia existe y está activo
      const guardiaResult = await sql`
        SELECT id, nombre, apellido_paterno, apellido_materno, activo
        FROM guardias 
        WHERE id = ${guardiaId}
      `;
      
      const guardia = guardiaResult.rows[0];

      if (!guardia) {
        await sql`ROLLBACK`;
        return NextResponse.json(
          { success: false, error: 'Guardia no encontrado' },
          { status: 404 }
        );
      }

      if (!guardia.activo) {
        await sql`ROLLBACK`;
        return NextResponse.json(
          { success: false, error: 'El guardia ya está inactivo' },
          { status: 400 }
        );
      }

      // 2. VALIDACIÓN CRÍTICA: Verificar que no tenga asignaciones activas
      const asignacionesActivas = await sql`
        SELECT 
          COUNT(*) as total,
          STRING_AGG(
            CONCAT(i.nombre, ' - ', po.nombre_puesto), 
            ', '
          ) as instalaciones_asignadas
        FROM as_turnos_puestos_operativos po
        INNER JOIN instalaciones i ON po.instalacion_id = i.id
        WHERE po.guardia_id = ${guardiaId} 
          AND po.activo = true
      `;

      const totalAsignaciones = parseInt(asignacionesActivas.rows[0].total);

      if (totalAsignaciones > 0) {
        await sql`ROLLBACK`;
        return NextResponse.json(
          { 
            success: false, 
            error: 'No se puede inactivar el guardia',
            details: `Tiene ${totalAsignaciones} asignación${totalAsignaciones > 1 ? 'es' : ''} activa${totalAsignaciones > 1 ? 's' : ''}: ${asignacionesActivas.rows[0].instalaciones_asignadas}`,
            blockers: [
              `${totalAsignaciones} asignación${totalAsignaciones > 1 ? 'es' : ''} activa${totalAsignaciones > 1 ? 's' : ''}`
            ]
          },
          { status: 409 }
        );
      }

      // 3. Inactivar el guardia
      await sql`
        UPDATE guardias 
        SET activo = false, updated_at = NOW()
        WHERE id = ${guardiaId}
      `;

      // 4. Registrar en log de auditoría (si existe la tabla)
      try {
        await sql`
          INSERT INTO auditoria_guardias (
            guardia_id,
            accion,
            motivo,
            datos_anteriores,
            datos_nuevos,
            fecha_accion,
            usuario_accion
          ) VALUES (
            ${guardiaId},
            'INACTIVACION',
            ${motivo},
            ${JSON.stringify({ activo: true })},
            ${JSON.stringify({ activo: false })},
            NOW(),
            'sistema'
          )
        `;
      } catch (auditError) {
        logger.debug('⚠️ Tabla de auditoría no disponible, continuando...');
      }

      await sql`COMMIT`;

      const nombreCompleto = `${guardia.nombre} ${guardia.apellido_paterno} ${guardia.apellido_materno || ''}`.trim();
      logger.debug(`✅ Guardia ${nombreCompleto} inactivado exitosamente`);

      return NextResponse.json({
        success: true,
        message: 'Guardia inactivado correctamente',
        data: {
          guardia_id: guardiaId,
          nombre: nombreCompleto,
          estado_anterior: true,
          estado_nuevo: false,
          fecha_inactivacion: new Date().toISOString()
        }
      });

    } catch (error) {
      await sql`ROLLBACK`;
      throw error;
    }

  } catch (error) {
    console.error('❌ Error inactivando guardia:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Error interno del servidor',
        details: error instanceof Error ? error.message : 'Error desconocido'
      },
      { status: 500 }
    );
  }
}

// GET - Verificar si se puede inactivar (validación previa)
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const guardiaId = params.id;

    // Verificar guardia
    const guardiaResult = await sql`
      SELECT id, nombre, apellido_paterno, apellido_materno, activo
      FROM guardias 
      WHERE id = ${guardiaId}
    `;
    
    const guardia = guardiaResult.rows[0];

    if (!guardia) {
      return NextResponse.json(
        { success: false, error: 'Guardia no encontrado' },
        { status: 404 }
      );
    }

    // Verificar asignaciones activas
    const asignacionesResult = await sql`
      SELECT 
        COUNT(*) as total,
        JSON_AGG(
          JSON_BUILD_OBJECT(
            'instalacion_id', i.id,
            'instalacion_nombre', i.nombre,
            'puesto_nombre', po.nombre_puesto,
            'puesto_id', po.id
          )
        ) as asignaciones
      FROM as_turnos_puestos_operativos po
      INNER JOIN instalaciones i ON po.instalacion_id = i.id
      WHERE po.guardia_id = ${guardiaId} 
        AND po.activo = true
    `;

    const totalAsignaciones = parseInt(asignacionesResult.rows[0].total);
    const asignaciones = asignacionesResult.rows[0].asignaciones || [];

    const canInactivate = totalAsignaciones === 0 && guardia.activo;
    const blockers = [];
    const warnings = [];

    if (!guardia.activo) {
      blockers.push('El guardia ya está inactivo');
    }

    if (totalAsignaciones > 0) {
      blockers.push(`Tiene ${totalAsignaciones} asignación${totalAsignaciones > 1 ? 'es' : ''} activa${totalAsignaciones > 1 ? 's' : ''}`);
    }

    const nombreCompleto = `${guardia.nombre} ${guardia.apellido_paterno} ${guardia.apellido_materno || ''}`.trim();

    return NextResponse.json({
      success: true,
      data: {
        can_inactivate: canInactivate,
        guardia: {
          id: guardia.id,
          nombre: nombreCompleto,
          activo: guardia.activo
        },
        blockers,
        warnings,
        asignaciones_activas: asignaciones,
        total_asignaciones: totalAsignaciones
      }
    });

  } catch (error) {
    console.error('❌ Error verificando guardia:', error);
    return NextResponse.json(
      { success: false, error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}
