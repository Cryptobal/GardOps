/**
 * Endpoint nuevo para deshacer marcados usando funciones de Neon
 * Llama a as_turnos.fn_deshacer
 * 
 * Este endpoint NO reemplaza al existente, es parte del rollout seguro con feature flag
 */

import { NextResponse } from 'next/server';
import { sql } from '@/lib/db';

export async function POST(req: Request) {
  try {
    // Parseamos el body de la petición
    const { pauta_id, actor_ref } = await req.json();
    
    // Validación básica
    if (!pauta_id) {
      return NextResponse.json(
        { ok: false, error: 'pauta_id es requerido' },
        { status: 400 }
      );
    }
    
    // Valor por defecto para actor
    const actor = actor_ref ?? 'ui:pauta-diaria';
    
    // Log para telemetría
    console.info('[turnos/new] deshacer', { pauta_id, actor_ref: actor });
    
    // Llamamos a la función de Neon
    const { rows } = await sql`
      SELECT * FROM as_turnos.fn_deshacer(
        ${pauta_id}::bigint,
        ${actor}::text
      );
    `;
    
    return NextResponse.json({ 
      ok: true, 
      data: { id: pauta_id, mensaje: 'Turno revertido a planificado exitosamente' }
    });
    
  } catch (err: any) {
    console.error('deshacer-new error:', err);
    return NextResponse.json(
      { ok: false, error: err.message ?? 'Error al deshacer marcado' },
      { status: 500 }
    );
  }
}
