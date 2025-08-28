/**
 * Endpoint nuevo para marcar turnos extras usando funciones de Neon
 * Llama a as_turnos.fn_marcar_extra
 * 
 * Este endpoint NO reemplaza al existente, es parte del rollout seguro con feature flag
 */

import { NextResponse } from 'next/server';
import { sql } from '@/lib/db';

export async function POST(req: Request) {
  try {
    // Parseamos el body de la petición
    const { 
      fecha, 
      instalacion_id, 
      rol_id, 
      puesto_id, 
      cobertura_guardia_id, 
      origen, 
      actor_ref 
    } = await req.json();
    
    // Validación básica
    if (!fecha || !instalacion_id || !rol_id || !puesto_id || !cobertura_guardia_id) {
      return NextResponse.json(
        { ok: false, error: 'fecha, instalacion_id, rol_id, puesto_id y cobertura_guardia_id son requeridos' },
        { status: 400 }
      );
    }
    
    // Valores por defecto
    const origin = origen ?? 'ppc';
    const actor = actor_ref ?? 'ui:pauta-diaria';
    
    // Log para telemetría
    console.info('[turnos/new] extra', { 
      fecha, 
      instalacion_id, 
      rol_id, 
      puesto_id, 
      cobertura_guardia_id,
      origen: origin,
      actor_ref: actor
    });
    
    // Llamamos a la función de Neon con todos los parámetros
    const { rows } = await sql`
      SELECT * FROM as_turnos.fn_marcar_extra(
        ${fecha}::date,
        ${instalacion_id}::uuid,
        ${rol_id}::uuid,
        ${puesto_id}::uuid,
        ${cobertura_guardia_id}::uuid,
        ${origin}::text,
        ${actor}::text
      );
    `;
    
    return NextResponse.json({ 
      ok: true, 
      data: rows?.[0] ?? null 
    });
    
  } catch (err: any) {
    console.error('extra-new error:', err);
    return NextResponse.json(
      { ok: false, error: err.message ?? 'Error al marcar turno extra' },
      { status: 500 }
    );
  }
}
