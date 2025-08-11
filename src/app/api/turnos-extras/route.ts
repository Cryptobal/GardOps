// /src/app/api/turnos-extras/route.ts
import { NextRequest, NextResponse } from "next/server";
import { sql } from "@vercel/postgres";

type Row = {
  fecha: string;                 // date -> ISO yyyy-mm-dd
  instalacion_id: string | null;
  instalacion_nombre: string | null;
  puesto_id: string | null;
  rol_id: string | null;
  origen: "ppc" | "reemplazo";
  titular_guardia_id: string | null;
  titular_guardia_nombre: string | null;
  cobertura_guardia_id: string | null;
  cobertura_guardia_nombre: string | null;
  extra_uid: string | null;
};

function coerceDate(s?: string | null) {
  if (!s) return null;
  const d = new Date(s);
  return Number.isNaN(+d) ? null : d.toISOString().slice(0, 10);
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const desde = coerceDate(searchParams.get("desde"));
  const hasta = coerceDate(searchParams.get("hasta"));
  const instalacion_id = searchParams.get("instalacion_id");
  const origen = searchParams.get("origen"); // 'ppc' | 'reemplazo'
  const q = (searchParams.get("q") || "").trim().toLowerCase();

  // preferimos la vista con nombres; si no existe, caemos a la minimal
  const fromView = `as_turnos.v_turnos_extra`;
  const fromViewFallback = `as_turnos.v_turnos_extra_minimal`;

  // Armamos WHERE flexible
  const wh: string[] = [];
  const args: any[] = [];
  let paramIndex = 0;

  if (desde) { 
    paramIndex++;
    wh.push(`t.fecha >= $${paramIndex}`); 
    args.push(desde);
  }
  if (hasta) { 
    paramIndex++;
    wh.push(`t.fecha <= $${paramIndex}`); 
    args.push(hasta);
  }
  if (instalacion_id) { 
    paramIndex++;
    wh.push(`t.instalacion_id::text = $${paramIndex}`); 
    args.push(instalacion_id);
  }
  if (origen) { 
    paramIndex++;
    wh.push(`t.origen = $${paramIndex}`); 
    args.push(origen);
  }
  if (q) {
    paramIndex++;
    wh.push(`(
      coalesce(t.titular_guardia_nombre,'') ILIKE $${paramIndex} OR
      coalesce(t.cobertura_guardia_nombre,'') ILIKE $${paramIndex}
    )`);
    args.push(`%${q}%`);
  }
  const whereSql = wh.length ? `WHERE ${wh.join(" AND ")}` : "";

  // Nota: algunas BD no tienen la vista con nombres. Probamos primero y si falla, usamos minimal.
  const baseSelect = `
    SELECT
      t.fecha::text,
      t.instalacion_id::text,
      i.nombre AS instalacion_nombre,
      COALESCE(t.puesto_id::text, NULL) AS puesto_id,
      COALESCE(t.rol_id::text, NULL)    AS rol_id,
      t.origen,
      COALESCE(t.titular_guardia_id::text, NULL)   AS titular_guardia_id,
      COALESCE(t.titular_guardia_nombre, NULL)     AS titular_guardia_nombre,
      COALESCE(t.cobertura_guardia_id::text, NULL) AS cobertura_guardia_id,
      COALESCE(t.cobertura_guardia_nombre, NULL)   AS cobertura_guardia_nombre,
      COALESCE(t.extra_uid, NULL) AS extra_uid
    FROM __VIEW__ t
    LEFT JOIN instalaciones i ON i.id = t.instalacion_id
    ${whereSql}
    ORDER BY t.fecha DESC, t.puesto_id NULLS LAST
    LIMIT 1000
  `;

  try {
    // Intentamos con la vista completa con nombres
    let queryText = baseSelect.replace("__VIEW__", fromView);
    
    // Construir la consulta usando template literals de @vercel/postgres
    const result = await sql.query(queryText, args);
    
    return NextResponse.json({ ok: true, rows: result.rows as Row[] });
  } catch (e) {
    console.log('Error con vista completa, intentando con minimal:', e);
    try {
      // fallback a la minimal y resolvemos nombres en front si fuese necesario
      let queryText = baseSelect.replace("__VIEW__", fromViewFallback);
      const result = await sql.query(queryText, args);
      
      return NextResponse.json({ ok: true, rows: result.rows as Row[], fallback: true });
    } catch (error) {
      console.error('Error fetching turnos extras:', error);
      return NextResponse.json(
        { ok: false, error: 'Error al obtener turnos extras', details: error instanceof Error ? error.message : 'Unknown error' },
        { status: 500 }
      );
    }
  }
}
