import { NextRequest } from 'next/server';
import { withPermission } from '@/app/api/_middleware/withPermission';
import { getClient } from '@/lib/database';
import { getCurrentUserRef } from '@/lib/auth';
import { unstable_noStore as noStore } from 'next/cache';

export const dynamic = 'force-dynamic';

export const POST = withPermission('turnos.marcar_asistencia', async (req: NextRequest) => {
  noStore();
  try {
    const { pauta_id, guardia_id } = await req.json();
    if (!pauta_id || !guardia_id) return new Response('pauta_id y guardia_id requeridos', { status: 400 });
    const actor = await getCurrentUserRef();

    const client = await getClient();
    try {
      const { rows } = await client.query(
        `select pm.id, make_date(pm.anio, pm.mes, pm.dia) as fecha, pm.estado, pm.meta
           from as_turnos.fn_marcar_asistencia(
             $1,'reemplazo',
             jsonb_build_object('reemplazo_guardia_id',$2),
             $3
           ) x
           join public.as_turnos_pauta_mensual pm on pm.id = $1`,
        [pauta_id, guardia_id, actor]
      );
      return Response.json(rows[0] ?? null);
    } finally {
      client.release?.();
    }
  } catch (err:any) {
    console.error('[ppc/cubrir] error', err);
    return new Response(err?.message ?? 'error', { status: 500 });
  }
});