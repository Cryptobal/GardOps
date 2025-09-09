import { NextRequest, NextResponse } from 'next/server';
import { query } from '../../../lib/database';

import { logger, devLogger, apiLogger } from '@/lib/utils/logger';
// Configuración para evitar errores de Dynamic Server Usage
export const dynamic = 'force-dynamic';

// PUT /api/documentos-clientes?id=uuid - Actualizar fecha de vencimiento
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
      WHERE id = $2 AND cliente_id IS NOT NULL
      RETURNING *
    `;
    
    const result = await query(sql, [fecha_vencimiento, documentoId]);
    
    if (result.rows.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Documento no encontrado' },
        { status: 404 }
      );
    }
    
    logger.debug(`✅ Fecha de vencimiento actualizada para documento de cliente:`, result.rows[0]);
    
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