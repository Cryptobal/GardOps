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
    const { motivo = 'Activación manual' } = body;

    if (!clienteId) {
      return NextResponse.json(
        { success: false, error: 'ID de cliente requerido' },
        { status: 400 }
      );
    }

    await sql`BEGIN`;

    try {
      // 1. Verificar que el cliente existe y está inactivo
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

      if (cliente.estado === 'Activo') {
        await sql`ROLLBACK`;
        return NextResponse.json(
          { success: false, error: 'El cliente ya está activo' },
          { status: 400 }
        );
      }

      // 2. Activar el cliente
      await sql`
        UPDATE clientes 
        SET estado = 'Activo', updated_at = NOW()
        WHERE id = ${clienteId}
      `;

      // 3. Registrar en log de auditoría (si existe la tabla)
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

      console.log(`✅ Cliente ${cliente.nombre} activado exitosamente`);

      return NextResponse.json({
        success: true,
        message: 'Cliente activado correctamente',
        data: {
          cliente_id: clienteId,
          nombre: cliente.nombre,
          estado_anterior: 'Inactivo',
          estado_nuevo: 'Activo',
          fecha_activacion: new Date().toISOString()
        }
      });

    } catch (error) {
      await sql`ROLLBACK`;
      throw error;
    }

  } catch (error) {
    console.error('❌ Error activando cliente:', error);
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
