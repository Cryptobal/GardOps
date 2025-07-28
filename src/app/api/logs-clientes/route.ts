import { NextRequest, NextResponse } from "next/server";
import { query } from "../../../lib/database";

// GET /api/logs-clientes?cliente_id=...
export async function GET(req: NextRequest) {
  const cliente_id = req.nextUrl.searchParams.get("cliente_id");
  if (!cliente_id) {
    return NextResponse.json({ error: "cliente_id es requerido" }, { status: 400 });
  }

  try {
    const result = await query(`
      SELECT * FROM logs_clientes
      WHERE cliente_id = $1
      ORDER BY fecha DESC
    `, [cliente_id]);
    
    return NextResponse.json({
      success: true,
      data: result.rows
    });
  } catch (error) {
    console.error("Error obteniendo logs:", error);
    return NextResponse.json({ 
      success: false, 
      error: "Error interno del servidor" 
    }, { status: 500 });
  }
}

// POST /api/logs-clientes
export async function POST(req: NextRequest) {
  try {
    const { cliente_id, accion, usuario, tipo = "manual", contexto = null } = await req.json();
    
    if (!cliente_id || !accion || !usuario) {
      return NextResponse.json({ 
        error: "cliente_id, accion y usuario son requeridos" 
      }, { status: 400 });
    }

    await query(`
      INSERT INTO logs_clientes (cliente_id, accion, usuario, tipo, contexto)
      VALUES ($1, $2, $3, $4, $5)
    `, [cliente_id, accion, usuario, tipo, contexto]);
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error creando log:", error);
    return NextResponse.json({ 
      success: false, 
      error: "Error interno del servidor" 
    }, { status: 500 });
  }
} 