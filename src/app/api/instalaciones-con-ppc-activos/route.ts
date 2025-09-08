import { NextResponse } from "next/server";
import { query } from "@/lib/database";

export async function GET() {
  try {
    // USAR LA MISMA FUENTE QUE EL MÓDULO PPC - Vista de pauta diaria
    const fecha = '2025-09-08'; // Misma fecha que el módulo PPC
    
    const instalaciones = await query(`
      SELECT DISTINCT
        pd.instalacion_id as id,
        pd.instalacion_nombre,
        '' as direccion,
        '' as ciudad,
        '' as comuna
      FROM as_turnos_v_pauta_diaria_dedup_fixed pd
      WHERE pd.fecha = $1
        AND pd.es_ppc = true 
        AND pd.estado_ui = 'plan'
      ORDER BY pd.instalacion_nombre
    `, [fecha]);

    return NextResponse.json(instalaciones.rows);
  } catch (error) {
    console.error('Error obteniendo instalaciones con PPC activos:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
} 