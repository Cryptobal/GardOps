import { requireAuthz } from '@/lib/authz-api'
import { NextRequest, NextResponse } from 'next/server';
import { withPermission } from '@/app/api/_middleware/withPermission';
import { getClient } from '@/lib/database';
import { getCurrentUserRef } from '@/lib/auth';
import { unstable_noStore as noStore } from 'next/cache';

export const dynamic = 'force-dynamic';

export const POST = withPermission('turnos.marcar_asistencia', async (req: NextRequest) => {
const __req = (typeof req!== 'undefined' ? req : (typeof request !== 'undefined' ? request : (arguments as any)[0]));
const deny = await requireAuthz(__req as any, { resource: 'turnos', action: 'create' });
if (deny) return deny;

  noStore();
  try {
    const { pauta_id, falta_sin_aviso, motivo, cubierto_por, con_cobertura, turno_id, cobertura_guardia_id } = await req.json();
    if (!pauta_id && !turno_id) return new Response('pauta_id o turno_id requerido', { status: 400 });
    const actor = await getCurrentUserRef();

    const client = await getClient();
    try {
      const id = pauta_id || turno_id;
      const guardiaReemplazoId = cobertura_guardia_id || cubierto_por || null;
      const hasCobertura = Boolean(guardiaReemplazoId || con_cobertura);

      // Verificar si existen funciones nuevas
      const { rows: funcCheck } = await client.query(`
        SELECT proname FROM pg_proc WHERE pronamespace = 'as_turnos'::regnamespace
          AND proname IN ('fn_marcar_asistencia','fn_registrar_reemplazo')
      `);
      const hasFnMarcar = funcCheck.some((r: any) => r.proname === 'fn_marcar_asistencia');
      const hasFnReemplazo = funcCheck.some((r: any) => r.proname === 'fn_registrar_reemplazo');

      if (hasCobertura && hasFnReemplazo) {
        // Caso: titular con falta y hay cobertura → TE (origen reemplazo)
        await client.query(
          `SELECT * FROM as_turnos.fn_registrar_reemplazo(
             $1::bigint,
             $2::uuid,
             $3::text,
             $4::text
           )`,
          [id, guardiaReemplazoId, actor, motivo ?? null]
        );
        // Añadir metadata de falta
        await client.query(
          `UPDATE public.as_turnos_pauta_mensual
             SET meta = COALESCE(meta,'{}'::jsonb) || jsonb_build_object(
               'falta_sin_aviso', $2::boolean,
               'motivo', $3::text
             )
           WHERE id = $1::bigint`,
          [id, !!falta_sin_aviso, motivo ?? null]
        );

        const { rows } = await client.query(
          `SELECT id, make_date(anio, mes, dia) as fecha, estado, meta
           FROM public.as_turnos_pauta_mensual
           WHERE id = $1::bigint`,
          [id]
        );
        return NextResponse.json(rows[0] ?? null);
      }

      if (hasFnMarcar) {
        // Caso: sin cobertura → inasistencia (no escribir meta.estado_ui)
        await client.query(
          `SELECT * FROM as_turnos.fn_marcar_asistencia(
             $1::bigint,
             'inasistencia',
             jsonb_build_object(
               'falta_sin_aviso', $2::boolean,
               'motivo', $3::text
             ),
             $4::text
           )`,
          [id, !!falta_sin_aviso, motivo ?? null, actor]
        );

        const { rows } = await client.query(
          `SELECT id, make_date(anio, mes, dia) as fecha, estado, meta
           FROM public.as_turnos_pauta_mensual
           WHERE id = $1::bigint`,
          [id]
        );
        return NextResponse.json(rows[0] ?? null);
      } else {
        // Fallback legacy
        if (hasCobertura) {
          // TE (origen reemplazo)
          await client.query(
            `UPDATE public.as_turnos_pauta_mensual
             SET estado = 'trabajado',
                 estado_ui = 'te',
                 meta = COALESCE(meta,'{}'::jsonb) || jsonb_build_object(
                   'tipo','turno_extra',
                   'te_origen','reemplazo',
                   'cobertura_guardia_id', $2::text,
                   'falta_sin_aviso', $3::boolean,
                   'motivo', $4::text,
                   'actor_ref', $5::text
                 )
             WHERE id = $1::bigint`,
            [id, guardiaReemplazoId, !!falta_sin_aviso, motivo ?? null, actor]
          );
        } else {
          // Inasistencia sin cobertura
          await client.query(
            `UPDATE public.as_turnos_pauta_mensual
             SET estado = 'inasistencia',
                 meta = jsonb_build_object(
                   'actor_ref', $2::text,
                   'timestamp', NOW()::text,
                   'action', 'inasistencia',
                   'falta_sin_aviso', $3::boolean,
                   'motivo', $4::text
                 )
             WHERE id = $1::bigint`,
            [id, actor, !!falta_sin_aviso, motivo ?? null]
          );
        }
        const { rows } = await client.query(
          `SELECT id, make_date(anio, mes, dia) as fecha, estado, meta
           FROM public.as_turnos_pauta_mensual
           WHERE id = $1::bigint`,
          [id]
        );
        return NextResponse.json(rows[0] ?? null);
      }
    } finally {
      client.release?.();
    }
  } catch (err:any) {
    console.error('[inasistencia] error completo:', err);
    console.error('[inasistencia] stack:', err?.stack);
    return new Response(err?.message ?? 'error', { status: 500 });
  }
});