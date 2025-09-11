import { NextRequest, NextResponse } from "next/server";
import { query } from "../../../../lib/database";

import { logger, devLogger, apiLogger } from '@/lib/utils/logger';
export async function GET(request: NextRequest) {
  try {
    // Query para obtener documentos vencidos de instalaciones
    const documentosVencidosQuery = `
      SELECT 
        i.id as instalacion_id,
        i.nombre as instalacion_nombre,
        COUNT(d.id) as documentos_vencidos
      FROM instalaciones i
      LEFT JOIN documentos d ON i.id = d.instalacion_id
      LEFT JOIN tipos_documentos td ON d.tipo_documento_id = td.id
      WHERE d.fecha_vencimiento IS NOT NULL
        AND td.requiere_vencimiento = true
        AND d.fecha_vencimiento < CURRENT_DATE
      GROUP BY i.id, i.nombre
      ORDER BY documentos_vencidos DESC
    `;

    const result = await query(documentosVencidosQuery);
    
    // Calcular total de documentos vencidos
    const totalDocumentosVencidos = result.rows.reduce((acc: number, row: any) => {
      return acc + parseInt(row.documentos_vencidos);
    }, 0);

    return NextResponse.json({
      success: true,
      data: {
        instalaciones: result.rows,
        total: totalDocumentosVencidos
      }
    });

  } catch (error) {
    logger.error('Error obteniendo documentos vencidos::', error);
    return NextResponse.json(
      { success: false, error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
} 