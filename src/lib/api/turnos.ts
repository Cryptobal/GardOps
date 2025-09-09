// API helpers para turnos
export interface AsistenciaRequest {
  pautaId: number;
  estado: 'trabajado' | 'inasistencia' | 'reemplazo' | 'sin_cobertura' | 'asistio' | 'deshacer';
  motivo?: 'con_aviso' | 'sin_aviso' | 'licencia' | 'permiso' | 'vacaciones' | 'finiquito';
  reemplazo_guardia_id?: number;
}

export interface UndoRequest {
  pautaId: number;
}

export async function marcarAsistencia(data: AsistenciaRequest): Promise<Response> {
  return fetch('/api/turnos/asistencia', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      pauta_id: data.pautaId,
      estado: data.estado,
      motivo: data.motivo,
      reemplazo_guardia_id: data.reemplazo_guardia_id
    })
  });
}

export async function deshacerAsistencia(data: UndoRequest): Promise<Response> {
  return fetch('/api/turnos/asistencia/undo', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      pauta_id: data.pautaId
    })
  });
}

export async function verificarPermisos(): Promise<boolean> {
  try {
  const response = await fetch('/api/me/permissions?perm=' + encodeURIComponent('turnos.marcar_asistencia'), {
      cache: 'no-store'
    });
    return response.ok;
  } catch {
    return false;
  }
}
