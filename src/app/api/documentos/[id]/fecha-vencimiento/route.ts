import { NextRequest, NextResponse } from 'next/server';
import { getClient } from '@/lib/database';

// PATCH /api/documentos/[id]/fecha-vencimiento - Actualizar fecha de vencimiento
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const client = await getClient();
  
  try {
    const { fecha_vencimiento } = await request.json();
    const documentoId = params.id;

    // Validar que se proporcione una fecha
    if (!fecha_vencimiento) {
      return NextResponse.json(
        { error: 'Se requiere una fecha de vencimiento' },
        { status: 400 }
      );
    }

    // Validar formato de fecha
    const fecha = new Date(fecha_vencimiento);
    if (isNaN(fecha.getTime())) {
      return NextResponse.json(
        { error: 'Fecha de vencimiento inválida' },
        { status: 400 }
      );
    }

    // Verificar que el documento existe
    const docCheck = await client.query(
      'SELECT id, nombre_original, tipo_documento_id FROM documentos WHERE id = $1',
      [documentoId]
    );

    if (docCheck.rows.length === 0) {
      return NextResponse.json(
        { error: 'Documento no encontrado' },
        { status: 404 }
      );
    }

    const documento = docCheck.rows[0];

    // Actualizar la fecha de vencimiento
    const updateResult = await client.query(
      `UPDATE documentos 
       SET fecha_vencimiento = $1, 
           actualizado_en = NOW() 
       WHERE id = $2
       RETURNING id, fecha_vencimiento, nombre_original`,
      [fecha_vencimiento, documentoId]
    );

    const documentoActualizado = updateResult.rows[0];

    console.log('✅ Fecha de vencimiento actualizada:', {
      documento_id: documentoId,
      fecha_vencimiento: fecha_vencimiento,
      nombre: documento.nombre_original
    });

    // Log de la operación
    try {
      await client.query(
        `INSERT INTO logs_documentos (
          documento_id, accion, usuario, tipo, contexto, 
          datos_anteriores, datos_nuevos, fecha
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())`,
        [
          documentoId,
          'UPDATE fecha_vencimiento',
          'api',
          'actualizacion',
          JSON.stringify({ operacion: 'actualizar_fecha_vencimiento' }),
          JSON.stringify({ fecha_vencimiento_anterior: null }),
          JSON.stringify({ fecha_vencimiento_nueva: fecha_vencimiento })
        ]
      );
    } catch (logError) {
      console.error('Error guardando log:', logError);
    }

    return NextResponse.json({
      success: true,
      documento: documentoActualizado,
      mensaje: 'Fecha de vencimiento actualizada exitosamente'
    });

  } catch (error: any) {
    console.error('❌ Error actualizando fecha de vencimiento:', error);
    return NextResponse.json(
      { 
        error: 'Error interno del servidor',
        detalles: error?.message ?? String(error)
      },
      { status: 500 }
    );
  } finally {
    client.release?.();
  }
}

// GET /api/documentos/[id]/fecha-vencimiento - Obtener fecha de vencimiento actual
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const client = await getClient();
  
  try {
    const documentoId = params.id;

    const result = await client.query(
      `SELECT 
        d.id, 
        d.nombre_original, 
        d.fecha_vencimiento,
        dt.nombre as tipo_documento,
        dt.requiere_vencimiento
       FROM documentos d
       LEFT JOIN documentos_tipos dt ON d.tipo_documento_id = dt.id
       WHERE d.id = $1`,
      [documentoId]
    );

    if (result.rows.length === 0) {
      return NextResponse.json(
        { error: 'Documento no encontrado' },
        { status: 404 }
      );
    }

    const documento = result.rows[0];

    return NextResponse.json({
      success: true,
      documento: {
        id: documento.id,
        nombre: documento.nombre_original,
        fecha_vencimiento: documento.fecha_vencimiento,
        tipo_documento: documento.tipo_documento,
        requiere_vencimiento: documento.requiere_vencimiento
      }
    });

  } catch (error: any) {
    console.error('❌ Error obteniendo fecha de vencimiento:', error);
    return NextResponse.json(
      { 
        error: 'Error interno del servidor',
        detalles: error?.message ?? String(error)
      },
      { status: 500 }
    );
  } finally {
    client.release?.();
  }
}
