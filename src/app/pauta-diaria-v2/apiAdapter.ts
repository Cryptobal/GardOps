/**
 * Adaptador de API para Pauta Diaria v2
 * Permite cambiar entre endpoints nuevos y viejos usando feature flag
 * 
 * Con USE_NEW_TURNOS_API=true usa los endpoints nuevos que llaman a funciones de Neon
 * Con USE_NEW_TURNOS_API=false usa los endpoints existentes (fallback seguro)
 */

// No usar Hooks aquí; estos helpers corren tanto en server como client
import { useNewTurnosApi, useNewTurnosApiClient } from '@/lib/feature';

/**
 * Verifica si la nueva API está habilitada
 * Expone el estado del feature flag para uso en componentes
 */
export function isNewApiEnabled(): boolean {
  // En entorno server no hay window; usar flag server-safe
  if (typeof window === 'undefined') return useNewTurnosApi();
  return useNewTurnosApiClient();
}

/**
 * Helper para hacer peticiones POST con JSON
 */
export async function postJson(url: string, body: any) {
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });
  
  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(errorText || `Error ${response.status}`);
  }
  
  return response.json();
}

/**
 * Retorna los endpoints a usar según el feature flag
 * Prioriza NEXT_PUBLIC_USE_NEW_TURNOS_API para poder cambiar desde el cliente
 */
export function endpoints() {
  const enabled = isNewApiEnabled();
  
  // Log para debugging
  if (typeof window !== 'undefined') {
    console.info('[API Adapter] Usando endpoints:', enabled ? 'NUEVOS (Neon)' : 'EXISTENTES (fallback)');
  }
  
  // Retornamos los endpoints según el flag
  return enabled
    ? {
        // Endpoints NUEVOS que llaman a funciones de Neon
        asistencia: '/api/turnos/asistencia-new',
        reemplazo: '/api/turnos/reemplazo-new',
        extra: '/api/turnos/extra-new',
        deshacer: '/api/turnos/deshacer-new',         // Nueva versión con fn_deshacer
        // Mantenemos los endpoints existentes para otras operaciones
        inasistencia: '/api/turnos/inasistencia',      // No tiene versión nueva aún
        ppcSinCobertura: '/api/turnos/ppc/sin-cobertura', // PPC sin cobertura
      }
    : {
        // Endpoints EXISTENTES (fallback seguro)
        asistencia: '/api/turnos/asistencia',
        reemplazo: '/api/turnos/ppc/cubrir',       
        extra: '/api/turnos/ppc/cubrir',           
        inasistencia: '/api/turnos/inasistencia',
        deshacer: '/api/turnos/deshacer',
        ppcSinCobertura: '/api/turnos/ppc/sin-cobertura',
      };
}

/**
 * Funciones helper para cada operación
 * Estas funciones encapsulan la lógica de llamada con los parámetros correctos
 */

export async function marcarAsistencia(pauta_id: string) {
  const ep = endpoints();
  console.info(`🔍 [marcarAsistencia] Usando endpoint: ${ep.asistencia}`, { pauta_id });
  
  // Si estamos usando los endpoints nuevos
  if (ep.asistencia.includes('-new')) {
    return postJson(ep.asistencia, {
      pauta_id: parseInt(pauta_id),
      estado: 'trabajado',
      meta: { source: 'ui:pauta-diaria-v2' },
      actor_ref: 'ui:pauta-diaria-v2',
    });
  }
  
  // Para los endpoints viejos
  return postJson(ep.asistencia, {
    pauta_id,
  });
}

export async function registrarInasistencia(
  pauta_id: string,
  falta_sin_aviso: boolean,
  motivo: string,
  cubierto_por: string | null
) {
  const ep = endpoints();
  console.info(`🔍 [registrarInasistencia] Usando endpoint: ${ep.inasistencia}`, { 
    pauta_id, 
    falta_sin_aviso, 
    motivo, 
    cubierto_por 
  });
  
  // Por ahora ambos endpoints usan la misma estructura
  return postJson(ep.inasistencia, {
    pauta_id,
    falta_sin_aviso,
    motivo,
    cubierto_por,
  });
}

export async function registrarReemplazo(
  pauta_id: string,
  cobertura_guardia_id: string,
  motivo?: string
) {
  const ep = endpoints();
  console.info(`🔍 [registrarReemplazo] Usando endpoint: ${ep.reemplazo}`, { 
    pauta_id, 
    cobertura_guardia_id,
    motivo 
  });
  
  // Si estamos usando los endpoints nuevos
  if (ep.reemplazo.includes('-new')) {
    return postJson(ep.reemplazo, {
      pauta_id: parseInt(pauta_id),
      cobertura_guardia_id,
      actor_ref: 'ui:pauta-diaria-v2',
      motivo: motivo || null,
    });
  }
  
  // Para los endpoints viejos (ppc/cubrir)
  return postJson(ep.reemplazo, {
    pauta_id,
    guardia_id: cobertura_guardia_id,
  });
}

export async function marcarTurnoExtra(
  pauta_id: string,
  cobertura_guardia_id: string,
  row?: any // PautaRow con la información necesaria
) {
  const ep = endpoints();
  console.info(`🔍 [marcarTurnoExtra] Usando endpoint: ${ep.extra}`, { 
    pauta_id, 
    cobertura_guardia_id,
    row 
  });
  
  // Si estamos usando los endpoints nuevos
  if (ep.extra.includes('-new')) {
    // fn_marcar_extra necesita: fecha, instalacion_id, rol_id, puesto_id, cobertura_guardia_id, origen, actor_ref
    if (!row) {
      throw new Error('Se requiere información de la fila para el nuevo endpoint');
    }
    return postJson(ep.extra, {
      fecha: row.fecha,
      instalacion_id: row.instalacion_id,
      rol_id: row.rol_id,
      puesto_id: row.puesto_id,
      cobertura_guardia_id,
      origen: 'ppc',
      actor_ref: 'ui:pauta-diaria-v2',
    });
  }
  
  // Para los endpoints viejos (ppc/cubrir)
  return postJson(ep.extra, {
    pauta_id,
    guardia_id: cobertura_guardia_id,
  });
}

export async function marcarSinCoberturaPPC(pauta_id: string) {
  const ep = endpoints();
  console.info(`🔍 [marcarSinCoberturaPPC] Usando endpoint: ${ep.ppcSinCobertura}`, { pauta_id });
  
  // Ambos endpoints usan la misma estructura
  return postJson(ep.ppcSinCobertura, {
    pauta_id,
  });
}

export async function deshacerMarcado(pauta_id: string) {
  const ep = endpoints();
  console.info(`🔍 [deshacerMarcado] Usando endpoint: ${ep.deshacer}`, { pauta_id });
  
  // Si estamos usando los endpoints nuevos
  if (ep.deshacer.includes('-new')) {
    return postJson(ep.deshacer, {
      pauta_id: parseInt(pauta_id),
      actor_ref: 'ui:pauta-diaria-v2',
    });
  }
  
  // Para los endpoints viejos
  return postJson(ep.deshacer, {
    pauta_id,
  });
}
