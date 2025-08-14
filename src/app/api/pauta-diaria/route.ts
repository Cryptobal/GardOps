import { requireAuthz } from '@/lib/authz-api'
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
  const deny = await requireAuthz(req, { resource: 'pauta_diaria', action: 'read:list' });
  if (deny) return deny;

  noStore();
  const url = new URL(req.url);
  const fecha = url.searchParams.get('fecha'); // YYYY-MM-DD
  const instalacionId = url.searchParams.get('instalacion_id');
  if (!fecha) return new Response('fecha (YYYY-MM-DD) requerida', { status: 400 });

  const params: any[] = [fecha];
  let paramIndex = 2;
  // Unir con instalaciones para poder filtrar por tenant
  let sql = `
    SELECT v.pauta_id, v.puesto_id, v.fecha::text, v.anio, v.mes, v.dia,
           v.guardia_id::text, v.estado, v.meta,
           v.instalacion_id::text, v.instalacion_nombre, v.guardia_nombre
    FROM as_turnos_v_pauta_diaria v
    JOIN instalaciones i ON i.id = v.instalacion_id
    WHERE v.fecha = $1
  `;

  const ctx = (req as any).ctx as { tenantId?: string } | undefined;
  const tenantId = ctx?.tenantId ?? null;
  if (tenantId) { sql += ` AND i.tenant_id::text = $${paramIndex++}`; params.push(tenantId); }
  if (instalacionId) { sql += ` AND v.instalacion_id::text = $${paramIndex++}`; params.push(instalacionId); }
  sql += ` ORDER BY v.instalacion_nombre, v.puesto_id`;

  const { rows } = await pool.query<Row>(sql, params);
  return Response.json({ data: rows });
}