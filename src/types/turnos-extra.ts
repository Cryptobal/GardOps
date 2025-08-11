// /src/types/turnos-extra.ts
export type TurnoExtra = {
  fecha: string;
  instalacion_id: string | null;
  instalacion_nombre: string | null;
  puesto_id: string | null;
  rol_id: string | null;
  origen: "ppc" | "reemplazo";
  titular_guardia_id: string | null;
  titular_guardia_nombre: string | null;
  cobertura_guardia_id: string | null;
  cobertura_guardia_nombre: string | null;
  extra_uid: string | null;
};

export type TurnoExtraFilters = {
  desde?: string;
  hasta?: string;
  instalacion_id?: string;
  origen?: "ppc" | "reemplazo";
  q?: string;
};

export type TurnoExtraResponse = {
  ok: boolean;
  rows: TurnoExtra[];
  fallback?: boolean;
  error?: string;
};
