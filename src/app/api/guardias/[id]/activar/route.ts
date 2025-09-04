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
    const { motivo = 'Activación manual' } = body;

    if (!guardiaId) {
      return NextResponse.json(
        { success: false, error: 'ID de guardia requerido' },
        { status: 400 }
      );
    }

    await sql`BEGIN`;

    try {
      // 1. Verificar que el guardia existe y está inactivo
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

      if (guardia.activo) {
        await sql`ROLLBACK`;
        return NextResponse.json(
          { success: false, error: 'El guardia ya está activo' },
          { status: 400 }
        );
      }

      // 2. Activar el guardia
      await sql`
        UPDATE guardias 
        SET activo = true, updated_at = NOW()
        WHERE id = ${guardiaId}
      `;

      // 3. Registrar en log de auditoría (si existe la tabla)
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
            'ACTIVACION',
            ${motivo},
            ${JSON.stringify({ activo: false })},
            ${JSON.stringify({ activo: true })},
            NOW(),
            'sistema'
          )
        `;
      } catch (auditError) {
        console.log('⚠️ Tabla de auditoría no disponible, continuando...');
      }

      await sql`COMMIT`;

      const nombreCompleto = `${guardia.nombre} ${guardia.apellido_paterno} ${guardia.apellido_materno || ''}`.trim();
      console.log(`✅ Guardia ${nombreCompleto} activado exitosamente`);

      return NextResponse.json({
        success: true,
        message: 'Guardia activado correctamente',
        data: {
          guardia_id: guardiaId,
          nombre: nombreCompleto,
          estado_anterior: false,
          estado_nuevo: true,
          fecha_activacion: new Date().toISOString()
        }
      });

    } catch (error) {
      await sql`ROLLBACK`;
      throw error;
    }

  } catch (error) {
    console.error('❌ Error activando guardia:', error);
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
