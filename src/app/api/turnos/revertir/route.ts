import { requireAuthz } from '@/lib/authz-api'
import { NextRequest } from 'next/server';
import { pool } from '@/lib/database';
import { withPermission } from '@/app/api/_middleware/withPermission';
import { getCurrentUserRef } from '@/lib/auth';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export const POST = withPermission('turnos.marcar_asistencia', async (req: NextRequest) => {
const __req = (typeof req!== 'undefined' ? req : (typeof request !== 'undefined' ? request : (arguments as any)[0]));
const deny = await requireAuthz(__req as any, { resource: 'turnos', action: 'create' });
if (deny) return deny;

  let pauta_id: number | undefined;

  // 1) JSON
  try {
    const j = await req.json();
    if (j && (j.pauta_id ?? j.id)) pauta_id = Number(j.pauta_id ?? j.id);
  } catch { /* sigue */ }

  // 2) formData (por si algún fetch envía FormData)
  if (!pauta_id && req.headers.get('content-type')?.includes('form')) {
    const fd = await req.formData();
    const v = fd.get('pauta_id') ?? fd.get('id');
    if (v) pauta_id = Number(v);
  }

  // 3) querystring como último recurso
  if (!pauta_id) {
    const u = new URL(req.url);
    const v = u.searchParams.get('pauta_id') || u.searchParams.get('id');
    if (v) pauta_id = Number(v);
  }

  if (!pauta_id || Number.isNaN(pauta_id)) {
    return new Response('pauta_id requerido', { status: 400 });
  }

  const actor = (await getCurrentUserRef()) ?? 'system';
  const { rows } = await pool.query(
    `SELECT * FROM as_turnos.fn_revertir_asistencia($1::bigint, $2::text)`,
    [pauta_id, actor]
  );
  return Response.json({ updated: rows?.[0] ?? null });
});
