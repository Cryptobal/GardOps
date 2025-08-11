'use client';
import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import { useEffect, useState, useMemo, useRef, useCallback } from 'react';
import { useCan } from '@/lib/can';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ChevronLeft, ChevronRight, Calendar, Eye, EyeOff, AlertTriangle } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { useToast } from '@/hooks/use-toast';
import AsistenciaModal from './AsistenciaModal';
import { PautaRow, PautaDiariaV2Props } from './types';
import { toYmd, toDisplay } from '@/lib/date';

type Filtros = {
  instalacion?: string;
  estado?: string;
  ppc?: boolean | 'all';
  q?: string;
};

const addDays = (d: string, delta: number) => {
  const t = new Date(d + 'T00:00:00'); t.setDate(t.getDate() + delta);
  return t.toISOString().slice(0,10);
};

// Helpers para estados usando estado_ui
const isAsistido = (estadoUI: string) => {
  return estadoUI === 'asistido' || estadoUI === 'reemplazo';
};
const isPlan = (estadoUI: string) => estadoUI === 'plan';
const isSinCobertura = (estadoUI: string) => estadoUI === 'sin_cobertura';
const isLibre = (estadoUI: string) => estadoUI === 'libre';

const renderEstado = (estadoUI: string, isFalta: boolean) => {
  const cls: Record<string,string> = {
    asistido:       'bg-emerald-500/10 text-emerald-400 ring-emerald-500/20',
    reemplazo:      'bg-sky-500/10 text-sky-400 ring-sky-500/20',
    sin_cobertura:  'bg-rose-500/10 text-rose-400 ring-rose-500/20',
    inasistencia:   'bg-rose-500/10 text-rose-400 ring-rose-500/20',
    libre:          'bg-gray-500/10 text-gray-400 ring-gray-500/20',
    plan:           'bg-amber-500/10 text-amber-400 ring-amber-500/20',
  };
  
  const base = cls[estadoUI] ?? 'bg-gray-500/10 text-gray-400 ring-gray-500/20';
  
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 text-xs rounded ring-1 ${base}`}>
      {estadoUI}
      {isFalta && <span className="ml-1 rounded px-1 text-[10px] ring-1 bg-red-500/10 text-red-400 ring-red-500/20">falta</span>}
    </span>
  );
};

export default function ClientTable({ rows: rawRows, fecha, incluirLibres = false }: PautaDiariaV2Props) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { addToast } = useToast();
  const canMark = useCan('turnos.marcar_asistencia');
  const [modal, setModal] = useState<{open:boolean; pautaId:string|null; row?:PautaRow; type?:'no_asistio'|'cubrir_ppc'}>({open:false, pautaId:null});
  const [mostrarLibres, setMostrarLibres] = useState(incluirLibres);
  const [savingId, setSavingId] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [f, setF] = useState<Filtros>(() => ({ 
    ppc: 'all',
    instalacion: searchParams.get('instalacion') || undefined,
    estado: searchParams.get('estado') || 'todos',
    q: searchParams.get('q') || undefined
  }));
  
  // Normalizar fecha a string YYYY-MM-DD
  const fechaStr = toYmd(fecha);
  
  // Normalizar fechas en las filas por si vienen como Date objects
  const rows = useMemo(() => {
    if (!rawRows) return [];
    return rawRows.map(row => ({
      ...row,
      fecha: toYmd(row.fecha)
    }));
  }, [rawRows]);

  // Ya no necesitamos verificar permisos manualmente, useCan lo maneja

  const refetch = useCallback(() => {
    // preserva filtros/fecha y fuerza recarga del servidor
    router.refresh();
  }, [router]);

  // Persistir filtros en URL
  useEffect(() => {
    const params = new URLSearchParams();
    if (f.instalacion) params.set('instalacion', f.instalacion);
    if (f.estado && f.estado !== 'todos') params.set('estado', f.estado);
    if (f.ppc !== 'all') params.set('ppc', f.ppc === true ? 'true' : 'false');
    if (f.q) params.set('q', f.q);
    if (mostrarLibres) params.set('incluir_libres', 'true');
    
    const newUrl = `/pauta-diaria-v2?fecha=${fechaStr}${params.toString() ? '&' + params.toString() : ''}`;
    router.replace(newUrl, { scroll: false });
  }, [f.instalacion, f.estado, f.ppc, f.q, mostrarLibres, fechaStr]);

  const go = useCallback((delta:number) => {
    const params = new URLSearchParams();
    if (f.instalacion) params.set('instalacion', f.instalacion);
    if (f.estado && f.estado !== 'todos') params.set('estado', f.estado);
    if (f.ppc !== 'all') params.set('ppc', f.ppc === true ? 'true' : 'false');
    if (f.q) params.set('q', f.q);
    if (mostrarLibres) params.set('incluir_libres', 'true');
    
    const newUrl = `/pauta-diaria-v2?fecha=${addDays(fechaStr, delta)}${params.toString() ? '&' + params.toString() : ''}`;
    router.push(newUrl);
  }, [f.instalacion, f.estado, f.ppc, f.q, mostrarLibres, fechaStr, router]);
  
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft')  go(-1);
      if (e.key === 'ArrowRight') go(1);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [go]);

  async function onAsistio(id: string) {
    try {
      setSavingId(id);
      const res = await fetch('/api/turnos/asistencia', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ pauta_id: id }),
      });
      if (!res.ok) throw new Error(await res.text());
      addToast({
        title: "Éxito",
        description: "Asistencia marcada",
        type: "success"
      });
      refetch();
    } catch (e:any) {
      addToast({
        title: "Error",
        description: `Error al marcar asistencia: ${e.message ?? e}`,
        type: "error"
      });
    } finally {
      setSavingId(null);
    }
  }

  async function onNoAsistioConfirm(data: {
    pauta_id: string;
    falta_sin_aviso: boolean;
    motivo?: string;
    cubierto_por?: string | null;
  }) {
    try {
      setSavingId(data.pauta_id);
      const res = await fetch('/api/turnos/inasistencia', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error(await res.text());
      addToast({
        title: "Éxito",
        description: "Inasistencia registrada",
        type: "success"
      });
      setModal({open:false, pautaId:null, row:undefined});
      refetch();
    } catch (e:any) {
      addToast({
        title: "Error",
        description: `Error al registrar inasistencia: ${e.message ?? e}`,
        type: "error"
      });
    } finally {
      setSavingId(null);
    }
  }

  async function onCubrirPPC(pauta_id: string, guardia_id: string) {
    try {
      setSavingId(pauta_id);
      const res = await fetch('/api/turnos/ppc/cubrir', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ pauta_id, guardia_id }),
      });
      if (!res.ok) throw new Error(await res.text());
      addToast({
        title: "Éxito",
        description: "Turno PPC cubierto",
        type: "success"
      });
      setModal({open:false, pautaId:null, row:undefined});
      refetch();
    } catch (e:any) {
      addToast({
        title: "Error",
        description: `Error al cubrir turno PPC: ${e.message ?? e}`,
        type: "error"
      });
    } finally {
      setSavingId(null);
    }
  }

  async function onSinCoberturaPPC(pauta_id: string) {
    try {
      setSavingId(pauta_id);
      const res = await fetch('/api/turnos/ppc/sin-cobertura', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ pauta_id }),
      });
      if (!res.ok) throw new Error(await res.text());
      addToast({
        title: "Éxito",
        description: "Marcado sin cobertura",
        type: "success"
      });
      refetch();
    } catch (e:any) {
      addToast({
        title: "Error",
        description: `Error al marcar sin cobertura: ${e.message ?? e}`,
        type: "error"
      });
    } finally {
      setSavingId(null);
    }
  }

  async function onDeshacer(pauta_id: string) {
    try {
      setSavingId(pauta_id);
      const res = await fetch('/api/turnos/deshacer', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ pauta_id }),
      });
      if (!res.ok) throw new Error(await res.text());
      addToast({
        title: "Éxito",
        description: "Estado revertido a planificado",
        type: "success"
      });
      refetch();
    } catch (e:any) {
      addToast({
        title: "Error",
        description: `Error al deshacer: ${e.message ?? e}`,
        type: "error"
      });
    } finally {
      setSavingId(null);
    }
  }

  const onCoberturaDone = useCallback(() => { 
    setModal({open:false, pautaId:null, row:undefined}); 
    router.refresh(); 
  }, [router]);

  const handleAsignarCobertura = useCallback((row: PautaRow) => {
    addToast({
      title: "Asignar cobertura",
      description: "Funcionalidad disponible pronto",
      type: "success" // cambiar a success ya que info puede no estar disponible
    });
  }, [addToast]);

  // Reglas de visibilidad de botones según el prompt:
  const isTitularPlan = (r: PautaRow) => r.es_ppc === false && r.estado_ui === 'plan';
  const isPpcPlan     = (r: PautaRow) => r.es_ppc === true  && (r.estado_ui === 'plan' || r.estado_ui === 'ppc_libre');
  const canUndo       = (r: PautaRow) => ['asistido','reemplazo','sin_cobertura'].includes(r.estado_ui);

  // Detectar guardias duplicados en la misma fecha
  const guardiasDuplicados = useMemo(() => {
    const guardiasPorFecha = new Map<string, number>();
    rows.forEach(row => {
      if (row.guardia_trabajo_id) {
        const key = `${row.fecha}-${row.guardia_trabajo_id}`;
        guardiasPorFecha.set(key, (guardiasPorFecha.get(key) || 0) + 1);
      }
    });
    return guardiasPorFecha;
  }, [rows]);

  const filtered = useMemo(() => {
    return (rows ?? []).filter((r:any) => {
      // Filtrar filas con estado_ui === 'libre' cuando mostrarLibres === false
      if (!mostrarLibres && r.estado_ui === 'libre') return false;

      if (f.instalacion && `${r.instalacion_id}` !== f.instalacion && r.instalacion_nombre !== f.instalacion) return false;
      if (f.estado && f.estado !== 'todos') {
        // Ahora usamos estado_ui directamente para filtrar
        if (r.estado_ui !== f.estado) return false;
      }
      if (f.ppc !== 'all') {
        const want = f.ppc === true;
        if (Boolean(r.es_ppc) !== want) return false;
      }
      if (f.q) {
        const q = f.q.toLowerCase();
        const hay = (r.guardia_trabajo_nombre || '').toLowerCase().includes(q)
                 || (r.rol_nombre || '').toLowerCase().includes(q)
                 || (r.instalacion_nombre || '').toLowerCase().includes(q);
        if (!hay) return false;
      }
      return true;
    });
  }, [rows, f.instalacion, f.estado, f.ppc, f.q, mostrarLibres]);

  if (!rows?.length) return <p className="text-sm opacity-70">Sin datos para {toDisplay(fechaStr)}.</p>;

  return (
    <TooltipProvider>
      <>
        {/* Header fecha + nav */}
        <Card className="mb-4">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" onClick={()=>go(-1)}>
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <div className="flex items-stretch gap-1">
                  <Input
                    ref={inputRef}
                    type="date"
                    className="w-auto"
                    value={fechaStr}
                    onChange={(e)=>router.push(`/pauta-diaria-v2?fecha=${e.target.value}`)}
                  />
                  <Button
                    aria-label="Abrir calendario"
                    variant="outline"
                    size="sm"
                    onClick={()=>inputRef.current?.showPicker?.()}
                  >
                    <Calendar className="h-4 w-4" />
                  </Button>
                </div>
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => {
                    const hoy = toYmd(new Date());
                    router.push(`/pauta-diaria-v2?fecha=${hoy}`);
                  }}
                >
                  Hoy
                </Button>
                <Button variant="outline" size="sm" onClick={()=>go(1)}>
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
              
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-2">
                  {mostrarLibres ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
                  <Switch
                    checked={mostrarLibres}
                    onCheckedChange={setMostrarLibres}
                  />
                  <span className="text-sm">Ver libres</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Controles de filtro */}
        <Card className="mb-4">
          <CardContent className="p-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-3">
              <Input
                placeholder="Filtrar instalación…"
                value={f.instalacion ?? ''} 
                onChange={e=>setF(s=>({ ...s, instalacion: e.target.value || undefined }))}
              />
              
              <Select value={f.estado ?? 'todos'} onValueChange={(value) => setF(s=>({ ...s, estado: value === 'todos' ? undefined : value }))}>
                <SelectTrigger>
                  <SelectValue placeholder="Estado (todos)" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Estado (todos)</SelectItem>
                  <SelectItem value="plan">Plan</SelectItem>
                  <SelectItem value="asistido">Asistido</SelectItem>
                  <SelectItem value="libre">Libre</SelectItem>
                  <SelectItem value="reemplazo">Reemplazo</SelectItem>
                  <SelectItem value="sin_cobertura">Sin cobertura</SelectItem>
                  <SelectItem value="inasistencia">Inasistencia</SelectItem>
                </SelectContent>
              </Select>
              
              <Select value={f.ppc === 'all' ? 'all' : f.ppc === true ? 'true' : 'false'} 
                      onValueChange={(value) => {
                        const v = value as 'all'|'true'|'false';
                        setF(s=>({ ...s, ppc: v === 'all' ? 'all' : v === 'true' }));
                      }}>
                <SelectTrigger>
                  <SelectValue placeholder="PPC (todos)" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  <SelectItem value="true">Solo PPC</SelectItem>
                  <SelectItem value="false">Solo con guardia</SelectItem>
                </SelectContent>
              </Select>
              
              <Input
                placeholder="Buscar guardia / rol / instalación…"
                value={f.q ?? ''} 
                onChange={e=>setF(s=>({ ...s, q: e.target.value || undefined }))}
              />
              
              <Button variant="outline" size="sm" onClick={()=>setF({ ppc:'all' })}>
                Limpiar
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Instalación</TableHead>
                  <TableHead>Puesto</TableHead>
                  <TableHead>Guardia</TableHead>
                  <TableHead>Cobertura</TableHead>
                  <TableHead>Rol</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead>Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((r:PautaRow) => {
                  const esDuplicado = r.guardia_trabajo_id && (guardiasDuplicados.get(`${r.fecha}-${r.guardia_trabajo_id}`) || 0) > 1;
                  const isLoading = savingId === r.pauta_id;
                  const esPPC = r.es_ppc || !r.guardia_trabajo_id;
                  
                  return (
                    <TableRow key={r.pauta_id} className={esDuplicado ? 'bg-yellow-50 dark:bg-yellow-900/20' : ''}>
                      <TableCell>{r.instalacion_nombre}</TableCell>
                      <TableCell>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <span className="font-mono text-xs cursor-help">
                              {r.puesto_nombre ?? `${r.puesto_id.slice(0,8)}…`}
                            </span>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>UUID: {r.puesto_id}</p>
                          </TooltipContent>
                        </Tooltip>
                      </TableCell>
                      <TableCell>
                        {r.es_ppc ? (
                          <div className="flex items-center gap-2">
                            <span>—</span>
                            <span className="rounded-md border px-1.5 py-0.5 text-[10px]
                              bg-amber-500/10 text-amber-400 ring-1 ring-amber-500/20">
                              PPC
                            </span>
                          </div>
                        ) : (
                          r.guardia_trabajo_nombre ?? '—'
                        )}
                        {esDuplicado && (
                          <Badge variant="destructive" className="text-xs mt-1">
                            <AlertTriangle className="h-3 w-3 mr-1" />
                            Duplicado
                          </Badge>
                        )}
                        {r.es_reemplazo && r.guardia_titular_nombre && (
                          <div className="text-xs text-muted-foreground mt-1">
                            Titular: {r.guardia_titular_nombre}
                          </div>
                        )}
                      </TableCell>
                      <TableCell>
                        {/* Columna Cobertura - mostrar guardia que cubre si existe */}
                        {r.estado_ui === 'reemplazo' && (r.cobertura_guardia_nombre || r.meta?.cobertura_guardia_id) ? (
                          <div className="flex flex-col">
                            <span className="font-medium">
                              {r.cobertura_guardia_nombre || r.reemplazo_guardia_nombre || 'Guardia de reemplazo'}
                            </span>
                            {r.meta?.motivo && (
                              <span className="text-xs text-muted-foreground">
                                {r.meta.motivo}
                              </span>
                            )}
                          </div>
                        ) : r.es_ppc && r.estado_ui === 'asistido' && r.cobertura_guardia_nombre ? (
                          <span className="text-emerald-600 dark:text-emerald-400">
                            {r.cobertura_guardia_nombre}
                          </span>
                        ) : (
                          '—'
                        )}
                      </TableCell>
                      <TableCell>
                        {/* Rol con formato especial */}
                        {r.rol_nombre ? (
                          <div className="flex flex-col">
                            <span className="font-medium">
                              {r.rol_alias || r.rol_nombre} 4x4x12
                            </span>
                            {r.hora_inicio && r.hora_fin && (
                              <span className="text-xs text-muted-foreground">
                                {r.hora_inicio.slice(0,5)} - {r.hora_fin.slice(0,5)}
                              </span>
                            )}
                          </div>
                        ) : (
                          '—'
                        )}
                      </TableCell>
                      <TableCell>
                        <div>
                          {renderEstado(r.estado_ui, r.es_falta_sin_aviso)}
                          {r.estado_ui === 'reemplazo' && r.reemplazo_guardia_nombre && (
                            <div className="text-xs text-muted-foreground mt-1">
                              Reemplazado por: {r.reemplazo_guardia_nombre}
                            </div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          {/* Titular en plan: Asistió / No asistió */}
                          {isTitularPlan(r) && canMark && (
                            <>
                              <Button 
                                size="sm" 
                                disabled={isLoading} 
                                onClick={() => onAsistio(r.pauta_id)}
                              >
                                {isLoading ? 'Guardando...' : 'Asistió'}
                              </Button>
                              <Button 
                                size="sm" 
                                variant="outline"
                                disabled={isLoading} 
                                onClick={() => setModal({open:true, pautaId:r.pauta_id, row:r, type:'no_asistio'})}
                              >
                                No asistió
                              </Button>
                            </>
                          )}

                          {/* PPC en plan: Cubrir / Sin cobertura */}
                          {isPpcPlan(r) && canMark && (
                            <>
                              <Button 
                                size="sm" 
                                variant="outline"
                                disabled={isLoading} 
                                onClick={() => setModal({open:true, pautaId:r.pauta_id, row:r, type:'cubrir_ppc'})}
                              >
                                Cubrir
                              </Button>
                              <Button 
                                size="sm" 
                                variant="outline"
                                disabled={isLoading} 
                                onClick={() => onSinCoberturaPPC(r.pauta_id)}
                              >
                                Sin cobertura
                              </Button>
                            </>
                          )}

                          {/* Deshacer para estados asistido/reemplazo/sin_cobertura */}
                          {canUndo(r) && canMark && (
                            <Button 
                              size="sm" 
                              variant="secondary"
                              disabled={isLoading} 
                              onClick={() => onDeshacer(r.pauta_id)}
                            >
                              {isLoading ? 'Guardando...' : 'Deshacer'}
                            </Button>
                          )}

                          {/* Sin permisos → mostrar mensaje */}
                          {!canMark && (
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <div className="opacity-50 pointer-events-none">
                                  <Button size="sm" disabled>
                                    Acciones
                                  </Button>
                                </div>
                              </TooltipTrigger>
                              <TooltipContent>
                                Sin permiso para marcar asistencia
                              </TooltipContent>
                            </Tooltip>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {modal.open && modal.pautaId != null && modal.type && (
          <AsistenciaModal
              open={modal.open}
              pautaId={modal.pautaId}
              row={modal.row}
              modalType={modal.type}
              onClose={() => setModal({open:false, pautaId:null, row:undefined})}
              onNoAsistioConfirm={onNoAsistioConfirm}
              onCubrirPPC={onCubrirPPC}
              fecha={fechaStr}
              instalacionId={modal.row?.instalacion_id?.toString()}
              rolId={modal.row?.rol_id}
              guardiaTitularId={modal.type === 'no_asistio' && modal.row?.guardia_trabajo_id ? modal.row.guardia_trabajo_id : undefined}
          />
        )}
      </>
    </TooltipProvider>
  );
}


