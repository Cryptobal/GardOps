import { NextResponse } from "next/server";
import { query } from "@/lib/database";

import { logger, devLogger, apiLogger } from '@/lib/utils/logger';
export async function DELETE(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const permisoId = params.id;

    if (!permisoId) {
      return NextResponse.json(
        { error: "Se requiere ID del permiso" },
        { status: 400 }
      );
    }

    logger.debug(`🗑️ Eliminando permiso ${permisoId}`);

    // Verificar que el permiso existe
    const checkResult = await query(
      "SELECT id, tipo, dia FROM pautas_mensuales WHERE id = $1 AND tipo != 'turno'",
      [permisoId]
    );

    if (checkResult.rows.length === 0) {
      return NextResponse.json(
        { error: "Permiso no encontrado" },
        { status: 404 }
      );
    }

    const permiso = checkResult.rows[0];

    // Eliminar el permiso
    await query(
      "DELETE FROM pautas_mensuales WHERE id = $1",
      [permisoId]
    );

    logger.debug(`✅ Permiso ${permisoId} eliminado exitosamente`);

    return NextResponse.json({ 
      status: "ok", 
      message: "Permiso eliminado exitosamente",
      permisoEliminado: permiso
    });

  } catch (error) {
    console.error("❌ Error eliminando permiso:", error);
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 }
    );
  }
} 