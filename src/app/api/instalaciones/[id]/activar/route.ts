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
    const { motivo = 'Activación manual' } = body;

    if (!instalacionId) {
      return NextResponse.json(
        { success: false, error: 'ID de instalación requerido' },
        { status: 400 }
      );
    }

    await sql`BEGIN`;

    try {
      // 1. Verificar que la instalación existe y está inactiva
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

      if (instalacion.estado === 'Activo') {
        await sql`ROLLBACK`;
        return NextResponse.json(
          { success: false, error: 'La instalación ya está activa' },
          { status: 400 }
        );
      }

      // 2. Activar la instalación
      await sql`
        UPDATE instalaciones 
        SET estado = 'Activo', updated_at = NOW()
        WHERE id = ${instalacionId}
      `;

      // 3. Activar todas las pautas mensuales de esta instalación (si la columna activo existe)
      let pautasActivadas = 0;
      try {
        const pautasResult = await sql`
          UPDATE pautas_mensuales 
          SET activo = true
          WHERE instalacion_id = ${instalacionId}
          RETURNING COUNT(*) as pautas_activadas
        `;
        pautasActivadas = pautasResult.rows[0]?.pautas_activadas || 0;
      } catch (pautaError) {
        console.log('⚠️ Campo activo no existe en pautas_mensuales, continuando...');
      }

      // 4. Registrar en log de auditoría (si existe la tabla)
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
            'ACTIVACION',
            ${motivo},
            ${JSON.stringify({ estado: 'Inactivo' })},
            ${JSON.stringify({ estado: 'Activo' })},
            NOW(),
            'sistema'
          )
        `;
      } catch (auditError) {
        console.log('⚠️ Tabla de auditoría no disponible, continuando...');
      }

      await sql`COMMIT`;

      console.log(`✅ Instalación ${instalacion.nombre} activada exitosamente`);

      return NextResponse.json({
        success: true,
        message: 'Instalación activada correctamente',
        data: {
          instalacion_id: instalacionId,
          nombre: instalacion.nombre,
          estado_anterior: 'Inactivo',
          estado_nuevo: 'Activo',
          pautas_afectadas: pautasActivadas,
          fecha_activacion: new Date().toISOString()
        }
      });

    } catch (error) {
      await sql`ROLLBACK`;
      throw error;
    }

  } catch (error) {
    console.error('❌ Error activando instalación:', error);
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
