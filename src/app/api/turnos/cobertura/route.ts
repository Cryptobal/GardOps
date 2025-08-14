import { requireAuthz } from '@/lib/authz-api'
import { NextRequest } from 'next/server';
import { pool } from '@/lib/database';
import { withPermission } from '@/app/api/_middleware/withPermission';
import { getCurrentUserRef } from '@/lib/auth';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

type Row = {
  pauta_id: number; puesto_id: string; fecha: string; estado: string;
  guardia_id: string | null; meta: any;
};

export const POST = withPermission('turnos.marcar_asistencia', async (req: NextRequest) => {
const __req = (typeof req!== 'undefined' ? req : (typeof request !== 'undefined' ? request : (arguments as any)[0]));
const deny = await requireAuthz(__req as any, { resource: 'turnos', action: 'create' });
if (deny) return deny;

  const body = await req.json().catch(() => null);
  const pauta_id = body?.pauta_id as number | undefined;
  const cubierto = Boolean(body?.cubierto);
  const guardia_cubre = (body?.guardia_cubre ?? null) as string | null;
  const aviso = Boolean(body?.aviso); // true=con aviso
  const motivo = (body?.motivo ?? null) as string | null;

  if (!pauta_id) return new Response('pauta_id requerido', { status: 400 });
  if (cubierto && !guardia_cubre) return new Response('guardia_cubre requerido cuando cubierto=true', { status: 400 });

  const actor = (await getCurrentUserRef()) ?? 'system';
  const { rows } = await pool.query<Row>(
    `SELECT * FROM as_turnos.fn_registrar_cobertura($1::bigint,$2::boolean,$3::uuid,$4::boolean,$5::text,$6::text)`,
    [pauta_id, cubierto, guardia_cubre, aviso, motivo, actor]
  );
  return Response.json({ updated: rows?.[0] ?? null });
});
