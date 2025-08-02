import { NextResponse } from "next/server";
import { aplicarPermisoEnPautaMensual } from "@/lib/db/pautaMensual";
import { procesarFiniquitoYGenerarPPC } from "@/lib/db/ppc";

// API para recibir permiso o finiquito desde la ficha del guardia
export async function POST(req: Request) {
  try {
    const { guardiaId, tipo, fechaInicio, fechaFin, observaciones } = await req.json();

    console.log(`📝 Procesando ${tipo} para guardia ${guardiaId}`);

    // Validar datos requeridos
    if (!guardiaId || !tipo || !fechaInicio) {
      return NextResponse.json(
        { error: "Faltan datos requeridos: guardiaId, tipo, fechaInicio" },
        { status: 400 }
      );
    }

    // Validar tipo de permiso
    const tiposPermitidos = [
      "licencia", 
      "vacaciones", 
      "permiso_con_goce", 
      "permiso_sin_goce", 
      "finiquito"
    ];

    if (!tiposPermitidos.includes(tipo)) {
      return NextResponse.json(
        { error: `Tipo de permiso no válido. Tipos permitidos: ${tiposPermitidos.join(", ")}` },
        { status: 400 }
      );
    }

    // Procesar según el tipo
    if (tipo === "finiquito") {
      // Para finiquito, solo necesitamos la fecha de inicio
      const resultado = await procesarFiniquitoYGenerarPPC({
        guardiaId,
        fechaFiniquito: fechaInicio,
      });

      console.log("✅ Finiquito procesado exitosamente");
      return NextResponse.json({ 
        status: "ok", 
        message: "Finiquito procesado exitosamente",
        resultado 
      });
    } else {
      // Para otros permisos, necesitamos fecha de inicio y fin
      if (!fechaFin) {
        return NextResponse.json(
          { error: "Para permisos se requiere fechaInicio y fechaFin" },
          { status: 400 }
        );
      }

      const resultado = await aplicarPermisoEnPautaMensual({
        guardiaId,
        tipoPermiso: tipo,
        fechaInicio,
        fechaFin,
      });

      console.log("✅ Permiso aplicado exitosamente");
      return NextResponse.json({ 
        status: "ok", 
        message: "Permiso aplicado exitosamente",
        resultado 
      });
    }

  } catch (error) {
    console.error("❌ Error procesando permiso/finiquito:", error);
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 }
    );
  }
}

// GET para obtener permisos de un guardia
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const guardiaId = searchParams.get('guardiaId');
    const fechaDesde = searchParams.get('fechaDesde');
    const fechaHasta = searchParams.get('fechaHasta');

    if (!guardiaId) {
      return NextResponse.json(
        { error: "Se requiere guardiaId" },
        { status: 400 }
      );
    }

    // Obtener permisos del guardia desde la pauta mensual
    const { query } = await import("@/lib/database");
    
    let whereConditions = ["pm.guardia_id = $1"];
    let params: any[] = [guardiaId];
    let paramIndex = 2;

    if (fechaDesde) {
      whereConditions.push(`pm.dia >= $${paramIndex}`);
      params.push(fechaDesde);
      paramIndex++;
    }

    if (fechaHasta) {
      whereConditions.push(`pm.dia <= $${paramIndex}`);
      params.push(fechaHasta);
      paramIndex++;
    }

    // Solo obtener días que no sean turnos normales
    whereConditions.push("pm.tipo != 'turno'");

    const whereClause = whereConditions.join(' AND ');

    const result = await query(`
      SELECT 
        pm.id,
        pm.dia,
        pm.tipo,
        pm.observacion,
        pm.instalacion_id,
        pm.rol_servicio_id,
        i.nombre as instalacion_nombre,
        rs.nombre as rol_servicio_nombre
      FROM pautas_mensuales pm
      LEFT JOIN instalaciones i ON pm.instalacion_id = i.id
      LEFT JOIN as_turnos_roles_servicio rs ON pm.rol_servicio_id = rs.id
      WHERE ${whereClause}
      ORDER BY pm.dia DESC
    `, params);

    return NextResponse.json(result.rows);

  } catch (error) {
    console.error("❌ Error obteniendo permisos:", error);
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 }
    );
  }
} 