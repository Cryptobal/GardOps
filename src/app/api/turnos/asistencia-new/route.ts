import { requireAuthz } from '@/lib/authz-api'
/**
 * Endpoint nuevo para marcar asistencia usando funciones de Neon
 * Llama a as_turnos.fn_marcar_asistencia
 * 
 * Este endpoint NO reemplaza al existente, es parte del rollout seguro con feature flag
 */

import { NextResponse } from 'next/server';
import { sql } from '@/lib/db';

export async function POST(req: Request) {
const __req = (typeof req!== 'undefined' ? req : (typeof request !== 'undefined' ? request : (arguments as any)[0]));
const deny = await requireAuthz(__req as any, { resource: 'turnos', action: 'create' });
if (deny) return deny;

  try {
    // Parseamos el body de la petición
    const { pauta_id, estado, meta, actor_ref } = await req.json();
    
    // Validación básica
    if (!pauta_id || !estado) {
      return NextResponse.json(
        { ok: false, error: 'pauta_id y estado son requeridos' },
        { status: 400 }
      );
    }
    
    // Valores por defecto
    const metaJson = meta ?? {};
    const actor = actor_ref ?? 'ui:pauta-diaria';
    
    // Log para telemetría
    console.info('[turnos/new] asistencia', { pauta_id, estado });
    
    // Llamamos a la función de Neon
    const { rows } = await sql`
      SELECT * FROM as_turnos.fn_marcar_asistencia(
        ${pauta_id}::bigint,
        ${estado}::text,
        ${JSON.stringify(metaJson)}::jsonb,
        ${actor}::text
      );
    `;
    
    return NextResponse.json({ 
      ok: true, 
      data: rows?.[0] ?? null 
    });
    
  } catch (err: any) {
    console.error('asistencia-new error:', err);
    return NextResponse.json(
      { ok: false, error: err.message ?? 'Error al marcar asistencia' },
      { status: 500 }
    );
  }
}
