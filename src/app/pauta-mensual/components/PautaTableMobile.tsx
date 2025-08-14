import { Authorize, GuardButton, can } from '@/lib/authz-ui'
"use client";

import React, { useMemo, useState } from "react";
import { Button } from "../../../components/ui/button";
import { Dialog, DialogContent, DialogTrigger, DialogHeader, DialogTitle } from "../../../components/ui/dialog";
import { ChevronLeft, ChevronRight } from "lucide-react";

interface PautaGuardia {
  id: string;
  nombre: string;
  nombre_puesto: string;
  patron_turno: string;
  dias: string[];
  tipo?: "asignado" | "ppc" | "sin_asignar";
  es_ppc?: boolean;
  guardia_id?: string;
  rol_nombre?: string;
  cobertura_por_dia?: any[];
}

export interface PautaTableMobileProps {
  pautaData: PautaGuardia[];
  diasDelMes: number[];
  diasSemana: { dia: number; diaSemana: string; esFeriado: boolean }[];
  onUpdatePauta: (guardiaIndex: number, diaIndex: number, nuevoEstado: string) => void;
  modoEdicion?: boolean;
  mes: number;
  anio: number;
}

function estadoToDisplay(estado: string, cobertura?: any) {
  if (cobertura) {
    return { icon: "TE", color: "text-fuchsia-600", title: "Turno Extra" };
  }
  const e = (estado || "").toLowerCase();
  switch (e) {
    case "planificado":
      return { icon: "●", color: "text-blue-600", title: "Planificado" };
    case "l":
    case "libre":
      return { icon: "○", color: "text-gray-500", title: "Libre" };
    case "r":
      return { icon: "TE", color: "text-fuchsia-600", title: "Turno Extra" };
    case "a":
      return { icon: "✓", color: "text-green-600", title: "Asistió" };
    case "i":
      return { icon: "✗", color: "text-red-600", title: "Inasistencia" };
    case "s":
      return { icon: "▲", color: "text-red-600", title: "Sin Cobertura" };
    case "p":
      return { icon: "🏖", color: "text-indigo-600", title: "Permiso" };
    case "v":
      return { icon: "🌴", color: "text-purple-600", title: "Vacaciones" };
    case "m":
      return { icon: "🏥", color: "text-pink-600", title: "Licencia" };
    default:
      return { icon: "·", color: "text-gray-400", title: "Sin asignar" };
  }
}

export default function PautaTableMobile({
  pautaData,
  diasDelMes,
  diasSemana,
  onUpdatePauta,
  modoEdicion = false,
  mes,
  anio,
}: PautaTableMobileProps) {
  const [diaActual, setDiaActual] = useState<number>(Math.min(new Date().getDate(), diasDelMes[diasDelMes.length - 1] ?? 1));

  const header = useMemo(() => {
    const info = diasSemana[diaActual - 1];
    const esFeriado = info?.esFeriado;
    const esFinde = info?.diaSemana === "Sáb" || info?.diaSemana === "Dom";
    return (
      <div className="flex items-center justify-between px-2 py-2 rounded-lg border bg-background sticky top-0 z-10">
        <Button size="sm" variant="outline" onClick={() => setDiaActual((d) => Math.max(1, d - 1))}>
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <div className="text-center">
          <div className={`text-sm font-semibold ${esFeriado ? "text-red-600" : esFinde ? "text-amber-600" : "text-muted-foreground"}`}>
            {info?.diaSemana || ""}
          </div>
          <div className="text-xl font-bold">
            {String(diaActual).padStart(2, "0")}/{String(mes).padStart(2, "0")}/{anio}
          </div>
        </div>
        <Button size="sm" variant="outline" onClick={() => setDiaActual((d) => Math.min(diasDelMes.length, d + 1))}>
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
    );
  }, [diaActual, diasDelMes.length, diasSemana, mes, anio]);

  const toggleEstado = (guardiaIndex: number) => {
    if (!modoEdicion) return;
    const diaIndex = diaActual - 1;
    const estado = pautaData[guardiaIndex]?.dias?.[diaIndex];
    const nuevo = estado === "planificado" ? "L" : "planificado";
    onUpdatePauta(guardiaIndex, diaIndex, nuevo);
  };

  return (
    <div className="space-y-3 pb-24">
      {header}

      <div className="space-y-2">
        {pautaData.map((g, idx) => {
          const diaIndex = diaActual - 1;
          const estado = g.dias?.[diaIndex] || "";
          const cobertura = g.cobertura_por_dia?.[diaIndex];
          const d = estadoToDisplay(estado, cobertura);
          return (
            <div key={g.id} className="w-full px-3 py-3 rounded-lg border flex items-center justify-between">
              <div className="min-w-0 mr-3" onClick={() => toggleEstado(idx)}>
                <div className={`text-sm font-semibold truncate ${g.es_ppc ? "text-red-600" : ""}`}>{g.nombre}</div>
                <div className="text-xs text-muted-foreground truncate">{g.rol_nombre || g.nombre_puesto}</div>
              </div>
              <Dialog>
                <DialogTrigger asChild>
                  <button className="px-3 py-2 rounded-md border bg-background active:scale-[0.98]">
                    <span className={`text-lg font-bold ${d.color}`}>{d.icon}</span>
                  </button>
                </DialogTrigger>
                <DialogContent className="max-w-sm">
                  <DialogHeader>
                    <DialogTitle>Estados</DialogTitle>
                  </DialogHeader>
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { icon: "●", label: "Planificado", value: "planificado", color: "text-blue-600" },
                      { icon: "○", label: "Libre", value: "L", color: "text-gray-500" },
                    ].map((opt) => (
                      <button
                        key={opt.value}
                        className="px-3 py-2 rounded-md border text-center"
                        onClick={() => onUpdatePauta(idx, diaActual - 1, opt.value)}
                      >
                        <div className={`text-xl font-bold ${opt.color}`}>{opt.icon}</div>
                        <div className="text-xs mt-1">{opt.label}</div>
                      </button>
                    ))}
                  </div>
                  <div className="mt-2 text-xs text-muted-foreground">TE/faltas/permisos se gestionan en pauta diaria</div>
                </DialogContent>
              </Dialog>
            </div>
          );
        })}
      </div>
    </div>
  );
}


