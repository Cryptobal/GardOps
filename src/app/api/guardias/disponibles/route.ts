import { NextRequest } from 'next/server';
import { unstable_noStore as noStore } from 'next/cache';
import { withPermission } from '@/app/api/_middleware/withPermission';
import { getClient } from '@/lib/database';

export const dynamic = 'force-dynamic';

export const GET = withPermission('turnos.marcar_asistencia', async (req: NextRequest) => {
  noStore();
  try {
    const { searchParams } = new URL(req.url);
    const fecha = searchParams.get('fecha');              // 'YYYY-MM-DD'
    const instalacionId = searchParams.get('instalacion_id'); // uuid
    const rolId = searchParams.get('rol_id');             // uuid
    const guardiaTitular = searchParams.get('guardia_titular'); // uuid opcional

    if (!fecha || !instalacionId || !rolId) {
      return new Response('fecha, instalacion_id y rol_id requeridos', { status: 400 });
    }

    const client = await getClient();
    try {
      const { rows } = await client.query(
        `SELECT guardia_id, nombre, estado_empleo
         FROM as_turnos.fn_guardias_disponibles($1::date, $2::uuid, $3::uuid, $4::uuid)`,
        [fecha, instalacionId, rolId, guardiaTitular ?? null]
      );
      return Response.json({ items: rows });
    } finally {
      client.release?.();
    }
  } catch (err:any) {
    console.error('[guardias/disponibles] error', err);
    return new Response(err?.message ?? 'error', { status: 500 });
  }
});