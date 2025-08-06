import { NextRequest, NextResponse } from 'next/server';
import { query } from '../../../lib/database';

// Configuración para evitar errores de Dynamic Server Usage
export const dynamic = 'force-dynamic';

// GET /api/documentos-guardias?guardia_id=uuid - Obtener documentos de un guardia
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const guardiaId = searchParams.get('guardia_id');
    
    if (!guardiaId) {
      return NextResponse.json(
        { success: false, error: 'ID del guardia requerido' },
        { status: 400 }
      );
    }

    // Obtener documentos del guardia
    const sql = `
      SELECT 
        d.id,
        d.guardia_id,
        d.tipo_documento_id,
        d.url as url_archivo,
        d.creado_en as fecha_subida,
        d.fecha_vencimiento,
        d.tipo as estado,
        td.nombre as tipo_documento_nombre,
        td.requiere_vencimiento
      FROM documentos d
      LEFT JOIN tipos_documentos td ON d.tipo_documento_id = td.id
      WHERE d.guardia_id = $1
      ORDER BY d.creado_en DESC
    `;
    
    const result = await query(sql, [guardiaId]);
    
    console.log(`✅ Documentos obtenidos para guardia ${guardiaId}:`, result.rows.length);
    
    return NextResponse.json({ 
      success: true, 
      data: result.rows 
    });
  } catch (error) {
    console.error('❌ Error obteniendo documentos del guardia:', error);
    return NextResponse.json({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Error desconocido'
    }, { status: 500 });
  }
}

// PUT /api/documentos-guardias?id=uuid - Actualizar fecha de vencimiento
export async function PUT(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const documentoId = searchParams.get('id');
    const body = await request.json();
    const { fecha_vencimiento } = body;
    
    if (!documentoId) {
      return NextResponse.json(
        { success: false, error: 'ID del documento requerido' },
        { status: 400 }
      );
    }

    if (!fecha_vencimiento) {
      return NextResponse.json(
        { success: false, error: 'Fecha de vencimiento requerida' },
        { status: 400 }
      );
    }

    // Actualizar fecha de vencimiento
    const sql = `
      UPDATE documentos_guardias 
      SET fecha_vencimiento = $1, updated_at = NOW()
      WHERE id = $2 
      RETURNING *
    `;
    
    const result = await query(sql, [fecha_vencimiento, documentoId]);
    
    if (result.rows.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Documento no encontrado' },
        { status: 404 }
      );
    }
    
    console.log(`✅ Fecha de vencimiento actualizada para documento de guardia:`, result.rows[0]);
    
    return NextResponse.json({ 
      success: true, 
      data: result.rows[0] 
    });
  } catch (error) {
    console.error('❌ Error actualizando fecha de vencimiento:', error);
    return NextResponse.json({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Error desconocido'
    }, { status: 500 });
  }
} 