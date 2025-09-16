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
    const body = await req.json();
    
    let fecha, instalacion_id, rol_id, puesto_id, cobertura_guardia_id, origen, actor_ref;
    
    // Si viene pauta_id, extraemos los datos de la base de datos
    if (body.pauta_id) {
      const { rows } = await sql`
        SELECT 
          fecha,
          instalacion_id,
          rol_id,
          puesto_id
        FROM as_turnos_v_pauta_diaria_unificada 
        WHERE pauta_id = ${body.pauta_id}
      `;
      
      if (!rows || rows.length === 0) {
        return NextResponse.json(
          { ok: false, error: 'Pauta no encontrada' },
          { status: 404 }
        );
      }
      
      const pauta = rows[0];
      fecha = pauta.fecha;
      instalacion_id = pauta.instalacion_id;
      rol_id = pauta.rol_id;
      puesto_id = pauta.puesto_id;
      cobertura_guardia_id = body.cobertura_guardia_id;
      origen = body.origen;
      actor_ref = body.actor_ref;
    } else {
      // Parámetros individuales (compatibilidad con versión anterior)
      ({ 
        fecha, 
        instalacion_id, 
        rol_id, 
        puesto_id, 
        cobertura_guardia_id, 
        origen, 
        actor_ref 
      } = body);
    }
    
    // Validación básica
    if (!fecha || !instalacion_id || !puesto_id || !cobertura_guardia_id) {
      return NextResponse.json(
        { ok: false, error: 'fecha, instalacion_id, puesto_id y cobertura_guardia_id son requeridos' },
        { status: 400 }
      );
    }
    
    // Valores por defecto
    const origin = origen ?? 'ppc';
    const actor = actor_ref ?? 'ui:pauta-diaria';
    const rolId = rol_id ?? '00000000-0000-0000-0000-000000000000'; // UUID por defecto si no hay rol_id
    
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
    
    // Llamamos a la función de Neon con pauta_id
    let result;
    if (body.pauta_id) {
      result = await sql`
        SELECT * FROM as_turnos.fn_marcar_extra(
          ${body.pauta_id}::bigint,
          ${cobertura_guardia_id}::uuid,
          ${origin}::text,
          ${actor}::text
        );
      `;
    } else {
      // Fallback para parámetros individuales (si es necesario)
      result = await sql`
        SELECT * FROM as_turnos.fn_marcar_extra(
          ${fecha}::date,
          ${instalacion_id}::uuid,
          ${rolId}::uuid,
          ${puesto_id}::uuid,
          ${cobertura_guardia_id}::uuid,
          ${origin}::text,
          ${actor}::text
        );
      `;
    }
    
    return NextResponse.json({ 
      ok: true, 
      data: result.rows?.[0] ?? null 
    });
    
  } catch (err: any) {
    console.error('extra-new error:', err);
    return NextResponse.json(
      { ok: false, error: err.message ?? 'Error al marcar turno extra' },
      { status: 500 }
    );
  }
}
