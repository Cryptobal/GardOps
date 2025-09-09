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
      resource: 'clientes', 
      action: 'update' 
    });
    if (maybeDeny && (maybeDeny as any).status === 403) return maybeDeny;
  } catch (_) {
    // permitir en desarrollo
  }

  try {
    const clienteId = params.id;
    const body = await request.json();
    const { motivo = 'Inactivación manual', cascada = false } = body;

    if (!clienteId) {
      return NextResponse.json(
        { success: false, error: 'ID de cliente requerido' },
        { status: 400 }
      );
    }

    await sql`BEGIN`;

    try {
      // 1. Verificar que el cliente existe y está activo
      const clienteResult = await sql`
        SELECT id, nombre, estado
        FROM clientes 
        WHERE id = ${clienteId}
      `;
      
      const cliente = clienteResult.rows[0];

      if (!cliente) {
        await sql`ROLLBACK`;
        return NextResponse.json(
          { success: false, error: 'Cliente no encontrado' },
          { status: 404 }
        );
      }

      if (cliente.estado === 'Inactivo') {
        await sql`ROLLBACK`;
        return NextResponse.json(
          { success: false, error: 'El cliente ya está inactivo' },
          { status: 400 }
        );
      }

      // 2. Obtener instalaciones del cliente
      const instalacionesResult = await sql`
        SELECT 
          i.id,
          i.nombre,
          i.estado,
          COUNT(po.id) as guardias_asignados
        FROM instalaciones i
        LEFT JOIN as_turnos_puestos_operativos po ON po.instalacion_id = i.id 
          AND po.activo = true 
          AND po.guardia_id IS NOT NULL
        WHERE i.cliente_id = ${clienteId}
        GROUP BY i.id, i.nombre, i.estado
      `;

      const instalaciones = instalacionesResult.rows;
      const instalacionesActivas = instalaciones.filter(i => i.estado === 'Activo');
      const instalacionesConGuardias = instalaciones.filter(i => parseInt(i.guardias_asignados) > 0);

      // 3. Validaciones según el modo
      if (!cascada) {
        // Modo normal: todas las instalaciones deben estar inactivas
        if (instalacionesActivas.length > 0) {
          await sql`ROLLBACK`;
          const nombresInstalaciones = instalacionesActivas.map(i => i.nombre).join(', ');
          return NextResponse.json(
            { 
              success: false, 
              error: 'No se puede inactivar el cliente',
              details: `Tiene ${instalacionesActivas.length} instalación${instalacionesActivas.length > 1 ? 'es' : ''} activa${instalacionesActivas.length > 1 ? 's' : ''}: ${nombresInstalaciones}`,
              blockers: [
                `${instalacionesActivas.length} instalación${instalacionesActivas.length > 1 ? 'es' : ''} activa${instalacionesActivas.length > 1 ? 's' : ''}`
              ]
            },
            { status: 409 }
          );
        }
      } else {
        // Modo cascada: verificar que las instalaciones activas no tengan guardias
        if (instalacionesConGuardias.length > 0) {
          await sql`ROLLBACK`;
          const nombresConGuardias = instalacionesConGuardias.map(i => `${i.nombre} (${i.guardias_asignados} guardias)`).join(', ');
          return NextResponse.json(
            { 
              success: false, 
              error: 'No se puede inactivar el cliente en cascada',
              details: `Las siguientes instalaciones tienen guardias asignados: ${nombresConGuardias}`,
              blockers: [
                `${instalacionesConGuardias.length} instalación${instalacionesConGuardias.length > 1 ? 'es' : ''} con guardias asignados`
              ]
            },
            { status: 409 }
          );
        }

        // Inactivar instalaciones activas automáticamente
        if (instalacionesActivas.length > 0) {
          logger.debug(`🔄 Inactivando ${instalacionesActivas.length} instalaciones en cascada...`);
          
          for (const instalacion of instalacionesActivas) {
            // Inactivar instalación
            await sql`
              UPDATE instalaciones 
              SET estado = 'Inactivo', updated_at = NOW()
              WHERE id = ${instalacion.id}
            `;

            // Inactivar pautas mensuales de la instalación (si la columna activo existe)
            try {
              await sql`
                UPDATE pautas_mensuales 
                SET activo = false
                WHERE instalacion_id = ${instalacion.id}
              `;
            } catch (pautaError) {
              logger.debug('⚠️ Campo activo no existe en pautas_mensuales, continuando...');
            }

            logger.debug(`✅ Instalación ${instalacion.nombre} inactivada automáticamente`);
          }
        }
      }

      // 4. Inactivar el cliente
      await sql`
        UPDATE clientes 
        SET estado = 'Inactivo', updated_at = NOW()
        WHERE id = ${clienteId}
      `;

      // 5. Registrar en log de auditoría (si existe la tabla)
      try {
        await sql`
          INSERT INTO auditoria_clientes (
            cliente_id,
            accion,
            motivo,
            datos_anteriores,
            datos_nuevos,
            fecha_accion,
            usuario_accion
          ) VALUES (
            ${clienteId},
            'INACTIVACION',
            ${motivo},
            ${JSON.stringify({ estado: 'Activo' })},
            ${JSON.stringify({ estado: 'Inactivo', cascada, instalaciones_afectadas: cascada ? instalacionesActivas.length : 0 })},
            NOW(),
            'sistema'
          )
        `;
      } catch (auditError) {
        logger.debug('⚠️ Tabla de auditoría no disponible, continuando...');
      }

      await sql`COMMIT`;

      logger.debug(`✅ Cliente ${cliente.nombre} inactivado exitosamente`);

      return NextResponse.json({
        success: true,
        message: cascada 
          ? `Cliente inactivado correctamente con ${instalacionesActivas.length} instalaciones inactivadas automáticamente`
          : 'Cliente inactivado correctamente',
        data: {
          cliente_id: clienteId,
          nombre: cliente.nombre,
          estado_anterior: 'Activo',
          estado_nuevo: 'Inactivo',
          instalaciones_inactivadas: cascada ? instalacionesActivas.length : 0,
          instalaciones_afectadas: cascada ? instalacionesActivas.map(i => i.nombre) : [],
          fecha_inactivacion: new Date().toISOString()
        }
      });

    } catch (error) {
      await sql`ROLLBACK`;
      throw error;
    }

  } catch (error) {
    console.error('❌ Error inactivando cliente:', error);
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
    const clienteId = params.id;

    // Verificar cliente
    const clienteResult = await sql`
      SELECT id, nombre, estado
      FROM clientes 
      WHERE id = ${clienteId}
    `;
    
    const cliente = clienteResult.rows[0];

    if (!cliente) {
      return NextResponse.json(
        { success: false, error: 'Cliente no encontrado' },
        { status: 404 }
      );
    }

    // Verificar instalaciones
    const instalacionesResult = await sql`
      SELECT 
        i.id,
        i.nombre,
        i.estado,
        COUNT(po.id) as guardias_asignados,
        JSON_AGG(
          CASE 
            WHEN po.guardia_id IS NOT NULL THEN
              JSON_BUILD_OBJECT(
                'guardia_id', g.id,
                'guardia_nombre', CONCAT(g.nombre, ' ', g.apellido_paterno, ' ', COALESCE(g.apellido_materno, '')),
                'puesto', po.nombre_puesto
              )
            ELSE NULL
          END
        ) FILTER (WHERE po.guardia_id IS NOT NULL) as guardias
      FROM instalaciones i
      LEFT JOIN as_turnos_puestos_operativos po ON po.instalacion_id = i.id 
        AND po.activo = true 
        AND po.guardia_id IS NOT NULL
      LEFT JOIN guardias g ON po.guardia_id = g.id
      WHERE i.cliente_id = ${clienteId}
      GROUP BY i.id, i.nombre, i.estado
      ORDER BY i.nombre
    `;

    const instalaciones = instalacionesResult.rows;
    const instalacionesActivas = instalaciones.filter(i => i.estado === 'Activo');
    const instalacionesConGuardias = instalaciones.filter(i => parseInt(i.guardias_asignados) > 0);

    const canInactivateNormal = instalacionesActivas.length === 0 && cliente.estado === 'Activo';
    const canInactivateCascada = instalacionesConGuardias.length === 0 && cliente.estado === 'Activo';

    const blockers = [];
    const warnings = [];

    if (cliente.estado === 'Inactivo') {
      blockers.push('El cliente ya está inactivo');
    }

    if (!canInactivateNormal && canInactivateCascada) {
      warnings.push(`Se inactivarán automáticamente ${instalacionesActivas.length} instalaciones`);
    }

    if (!canInactivateCascada) {
      blockers.push(`${instalacionesConGuardias.length} instalación${instalacionesConGuardias.length > 1 ? 'es' : ''} con guardias asignados`);
    }

    return NextResponse.json({
      success: true,
      data: {
        can_inactivate_normal: canInactivateNormal,
        can_inactivate_cascada: canInactivateCascada,
        cliente: {
          id: cliente.id,
          nombre: cliente.nombre,
          estado: cliente.estado
        },
        blockers,
        warnings,
        instalaciones: instalaciones.map(i => ({
          id: i.id,
          nombre: i.nombre,
          estado: i.estado,
          guardias_asignados: parseInt(i.guardias_asignados),
          guardias: i.guardias || []
        })),
        total_instalaciones: instalaciones.length,
        instalaciones_activas: instalacionesActivas.length,
        instalaciones_con_guardias: instalacionesConGuardias.length
      }
    });

  } catch (error) {
    console.error('❌ Error verificando cliente:', error);
    return NextResponse.json(
      { success: false, error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}
