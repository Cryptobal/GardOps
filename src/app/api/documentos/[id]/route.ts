import { NextRequest, NextResponse } from "next/server";
import { query } from "@/lib/database";

import { logger, devLogger, apiLogger } from '@/lib/utils/logger';
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;
    const { fecha_vencimiento, modulo } = await request.json();

    logger.debug("🔄 Actualizando fecha de vencimiento:", { id, fecha_vencimiento, modulo });

    // Validar que el documento existe
    const checkQuery = `
      SELECT id, modulo 
      FROM documentos 
      WHERE id = $1
    `;
    
    const checkResult = await query(checkQuery, [id]);
    
    if (checkResult.rows.length === 0) {
      return NextResponse.json(
        { error: "Documento no encontrado" },
        { status: 404 }
      );
    }

    // Actualizar la fecha de vencimiento
    const updateQuery = `
      UPDATE documentos 
      SET fecha_vencimiento = $1, 
          actualizado_en = NOW()
      WHERE id = $2
    `;
    
    await query(updateQuery, [fecha_vencimiento, id]);

    logger.debug("✅ Fecha de vencimiento actualizada correctamente");

    return NextResponse.json({
      success: true,
      message: "Fecha de vencimiento actualizada correctamente"
    });

  } catch (error) {
    console.error("❌ Error al actualizar fecha de vencimiento:", error);
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 }
    );
  }
} 