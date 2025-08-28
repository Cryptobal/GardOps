const API = '/api/sueldos/planilla';

export const planillasApi = {
  async generar(params: { mes: number; anio: number; incluirTurnosExtras?: boolean; guardiaId?: string }) {
    const res = await fetch(API, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params),
    });
    if (!res.ok) throw new Error((await res.json()).error || 'Error al generar planilla');
    return res.json();
  },

  descargarXlsx(params: { mes: number; anio: number; incluirTurnosExtras?: boolean }) {
    const sp = new URLSearchParams();
    sp.set('mes', String(params.mes));
    sp.set('anio', String(params.anio));
    if (params.incluirTurnosExtras === false) sp.set('incluirTurnosExtras', 'false');
    window.location.href = `${API}?${sp.toString()}`;
  },

  async marcarTurnosExtrasPagados(params: { guardiaId: string; mes: number; anio: number; planillaId?: number }) {
    const res = await fetch(API, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params),
    });
    if (!res.ok) throw new Error((await res.json()).error || 'Error al marcar TE pagados');
    return res.json();
  },
};
// Lógica API para planillas (fetch, post, etc.) 