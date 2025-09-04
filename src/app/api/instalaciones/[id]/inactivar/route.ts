import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import { requireAuthz } from '@/lib/authz-api';

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Verificar permisos
    const maybeDeny = await requireAuthz(request as any, { 
      resource: 'instalaciones', 
      action: 'update' 
    });
    if (maybeDeny && (maybeDeny as any).status === 403) return maybeDeny;
  } catch (_) {
    // permitir en desarrollo
  }

  try {
    const instalacionId = params.id;
    const body = await request.json();
    const { motivo = 'Inactivación manual' } = body;

    if (!instalacionId) {
      return NextResponse.json(
        { success: false, error: 'ID de instalación requerido' },
        { status: 400 }
      );
    }

    await sql`BEGIN`;

    try {
      // 1. Verificar que la instalación existe y está activa
      const instalacionResult = await sql`
        SELECT id, nombre, estado
        FROM instalaciones 
        WHERE id = ${instalacionId}
      `;
      
      const instalacion = instalacionResult.rows[0];

      if (!instalacion) {
        await sql`ROLLBACK`;
        return NextResponse.json(
          { success: false, error: 'Instalación no encontrada' },
          { status: 404 }
        );
      }

      if (instalacion.estado === 'Inactivo') {
        await sql`ROLLBACK`;
        return NextResponse.json(
          { success: false, error: 'La instalación ya está inactiva' },
          { status: 400 }
        );
      }

      // 2. VALIDACIÓN CRÍTICA: Verificar que no tenga guardias asignados
      const guardiasAsignados = await sql`
        SELECT 
          COUNT(*) as total,
          STRING_AGG(
            CONCAT(g.nombre, ' ', g.apellido_paterno, ' ', COALESCE(g.apellido_materno, '')), 
            ', '
          ) as nombres_guardias
        FROM as_turnos_puestos_operativos po
        INNER JOIN guardias g ON po.guardia_id = g.id
        WHERE po.instalacion_id = ${instalacionId} 
          AND po.activo = true 
          AND po.guardia_id IS NOT NULL
          AND g.activo = true
      `;

      const totalGuardias = parseInt(guardiasAsignados.rows[0].total);

      if (totalGuardias > 0) {
        await sql`ROLLBACK`;
        return NextResponse.json(
          { 
            success: false, 
            error: 'No se puede inactivar la instalación',
            details: `Tiene ${totalGuardias} guardia${totalGuardias > 1 ? 's' : ''} asignado${totalGuardias > 1 ? 's' : ''}: ${guardiasAsignados.rows[0].nombres_guardias}`,
            blockers: [
              `${totalGuardias} guardia${totalGuardias > 1 ? 's' : ''} asignado${totalGuardias > 1 ? 's' : ''}`
            ]
          },
          { status: 409 }
        );
      }

      // 3. Inactivar la instalación
      await sql`
        UPDATE instalaciones 
        SET estado = 'Inactivo', updated_at = NOW()
        WHERE id = ${instalacionId}
      `;

      // 4. Inactivar todas las pautas mensuales de esta instalación
      const pautasResult = await sql`
        UPDATE pautas_mensuales 
        SET activo = false, updated_at = NOW()
        WHERE instalacion_id = ${instalacionId} 
          AND activo = true
        RETURNING COUNT(*) as pautas_inactivadas
      `;

      // 5. Registrar en log de auditoría (si existe la tabla)
      try {
        await sql`
          INSERT INTO auditoria_instalaciones (
            instalacion_id,
            accion,
            motivo,
            datos_anteriores,
            datos_nuevos,
            fecha_accion,
            usuario_accion
          ) VALUES (
            ${instalacionId},
            'INACTIVACION',
            ${motivo},
            ${JSON.stringify({ estado: 'Activo' })},
            ${JSON.stringify({ estado: 'Inactivo' })},
            NOW(),
            'sistema'
          )
        `;
      } catch (auditError) {
        console.log('⚠️ Tabla de auditoría no disponible, continuando...');
      }

      await sql`COMMIT`;

      console.log(`✅ Instalación ${instalacion.nombre} inactivada exitosamente`);

      return NextResponse.json({
        success: true,
        message: 'Instalación inactivada correctamente',
        data: {
          instalacion_id: instalacionId,
          nombre: instalacion.nombre,
          estado_anterior: 'Activo',
          estado_nuevo: 'Inactivo',
          pautas_afectadas: pautasResult.rows[0]?.pautas_inactivadas || 0,
          fecha_inactivacion: new Date().toISOString()
        }
      });

    } catch (error) {
      await sql`ROLLBACK`;
      throw error;
    }

  } catch (error) {
    console.error('❌ Error inactivando instalación:', error);
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
    const instalacionId = params.id;

    // Verificar instalación
    const instalacionResult = await sql`
      SELECT id, nombre, estado
      FROM instalaciones 
      WHERE id = ${instalacionId}
    `;
    
    const instalacion = instalacionResult.rows[0];

    if (!instalacion) {
      return NextResponse.json(
        { success: false, error: 'Instalación no encontrada' },
        { status: 404 }
      );
    }

    // Verificar guardias asignados
    const guardiasResult = await sql`
      SELECT 
        COUNT(*) as total,
        JSON_AGG(
          JSON_BUILD_OBJECT(
            'id', g.id,
            'nombre', CONCAT(g.nombre, ' ', g.apellido_paterno, ' ', COALESCE(g.apellido_materno, '')),
            'puesto', po.nombre_puesto
          )
        ) as guardias
      FROM as_turnos_puestos_operativos po
      INNER JOIN guardias g ON po.guardia_id = g.id
      WHERE po.instalacion_id = ${instalacionId} 
        AND po.activo = true 
        AND po.guardia_id IS NOT NULL
        AND g.activo = true
    `;

    const totalGuardias = parseInt(guardiasResult.rows[0].total);
    const guardias = guardiasResult.rows[0].guardias || [];

    const canInactivate = totalGuardias === 0 && instalacion.estado === 'Activo';
    const blockers = [];
    const warnings = [];

    if (instalacion.estado === 'Inactivo') {
      blockers.push('La instalación ya está inactiva');
    }

    if (totalGuardias > 0) {
      blockers.push(`Tiene ${totalGuardias} guardia${totalGuardias > 1 ? 's' : ''} asignado${totalGuardias > 1 ? 's' : ''}`);
    }

    return NextResponse.json({
      success: true,
      data: {
        can_inactivate: canInactivate,
        instalacion: {
          id: instalacion.id,
          nombre: instalacion.nombre,
          estado: instalacion.estado
        },
        blockers,
        warnings,
        guardias_asignados: guardias,
        total_guardias: totalGuardias
      }
    });

  } catch (error) {
    console.error('❌ Error verificando instalación:', error);
    return NextResponse.json(
      { success: false, error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}
