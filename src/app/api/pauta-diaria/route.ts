import { NextRequest } from 'next/server';
import pool from '@/lib/database';
import { unstable_noStore as noStore } from 'next/cache';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

type Row = {
  pauta_id: number;
  puesto_id: number;
  fecha: string;
  anio: number; mes: number; dia: number;
  guardia_id: string | null;
  estado: string | null;
  meta: any | null;
  instalacion_id: string;
  instalacion_nombre: string;
  guardia_nombre: string | null;
};

export async function GET(req: NextRequest) {
  noStore();
  const url = new URL(req.url);
  const fecha = url.searchParams.get('fecha'); // YYYY-MM-DD
  const instalacionId = url.searchParams.get('instalacion_id');
  if (!fecha) return new Response('fecha (YYYY-MM-DD) requerida', { status: 400 });

  const params: any[] = [fecha];
  let sql = `
    SELECT pauta_id, puesto_id, fecha::text, anio, mes, dia,
           guardia_id::text, estado, meta,
           instalacion_id::text, instalacion_nombre, guardia_nombre
    FROM as_turnos_v_pauta_diaria
    WHERE fecha = $1
  `;
  if (instalacionId) { params.push(instalacionId); sql += ` AND instalacion_id = $2`; }
  sql += ` ORDER BY instalacion_nombre, puesto_id`;

  const { rows } = await pool.query<Row>(sql, params);
  return Response.json({ data: rows });
}