/**
 * Endpoint nuevo para registrar reemplazos usando funciones de Neon
 * Llama a as_turnos.fn_registrar_reemplazo
 * 
 * Este endpoint NO reemplaza al existente, es parte del rollout seguro con feature flag
 */

import { NextResponse } from 'next/server';
import { sql } from '@/lib/db';

export async function POST(req: Request) {
  try {
    // Parseamos el body de la petición
    const { pauta_id, cobertura_guardia_id, actor_ref, motivo } = await req.json();
    
    // Validación básica
    if (!pauta_id || !cobertura_guardia_id) {
      return NextResponse.json(
        { ok: false, error: 'pauta_id y cobertura_guardia_id son requeridos' },
        { status: 400 }
      );
    }
    
    // Valor por defecto para actor
    const actor = actor_ref ?? 'ui:pauta-diaria';
    
    // Log para telemetría
    console.info('[turnos/new] reemplazo', { pauta_id, cobertura_guardia_id, motivo });
    
    // Llamamos a la función de Neon con motivo opcional
    const { rows } = await sql`
      SELECT * FROM as_turnos.fn_registrar_reemplazo(
        ${pauta_id}::bigint,
        ${cobertura_guardia_id}::uuid,
        ${actor}::text,
        ${motivo || null}::text
      );
    `;
    
    return NextResponse.json({ 
      ok: true, 
      data: rows?.[0] ?? null 
    });
    
  } catch (err: any) {
    console.error('reemplazo-new error:', err);
    return NextResponse.json(
      { ok: false, error: err.message ?? 'Error al registrar reemplazo' },
      { status: 500 }
    );
  }
}
