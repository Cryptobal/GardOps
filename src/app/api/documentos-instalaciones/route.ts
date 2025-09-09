import { NextRequest, NextResponse } from 'next/server';
import { query } from '../../../lib/database';

import { logger, devLogger, apiLogger } from '@/lib/utils/logger';
// Configuración para evitar errores de Dynamic Server Usage
export const dynamic = 'force-dynamic';

// GET /api/documentos-instalaciones?instalacion_id=uuid - Obtener documentos de una instalación
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const instalacionId = searchParams.get('instalacion_id');
    
    if (!instalacionId) {
      return NextResponse.json(
        { success: false, error: 'ID de la instalación requerido' },
        { status: 400 }
      );
    }

    // Obtener documentos de la instalación
    const sql = `
      SELECT 
        d.id,
        d.instalacion_id,
        d.tipo_documento_id,
        d.url as url_archivo,
        d.creado_en as fecha_subida,
        d.fecha_vencimiento,
        d.tipo as estado,
        d.nombre_original,
        d.tamaño,
        td.nombre as tipo_documento_nombre
      FROM documentos d
      LEFT JOIN documentos_tipos td ON d.tipo_documento_id = td.id
      WHERE d.instalacion_id = $1
      ORDER BY d.creado_en DESC
    `;
    
    const result = await query(sql, [instalacionId]);
    
    logger.debug(`✅ Documentos obtenidos para instalación ${instalacionId}:`, result.rows.length);
    
    return NextResponse.json({ 
      success: true, 
      data: result.rows 
    });
  } catch (error) {
    console.error('❌ Error obteniendo documentos de la instalación:', error);
    return NextResponse.json({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Error desconocido'
    }, { status: 500 });
  }
}

// PUT /api/documentos-instalaciones?id=uuid - Actualizar fecha de vencimiento
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
      UPDATE documentos 
      SET fecha_vencimiento = $1, updated_at = NOW()
      WHERE id = $2 AND instalacion_id IS NOT NULL
      RETURNING *
    `;
    
    const result = await query(sql, [fecha_vencimiento, documentoId]);
    
    if (result.rows.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Documento no encontrado' },
        { status: 404 }
      );
    }
    
    logger.debug(`✅ Fecha de vencimiento actualizada para documento de instalación:`, result.rows[0]);
    
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