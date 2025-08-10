'use client';
import { useRouter, useSearchParams } from 'next/navigation';
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
import NoAsistenciaModal from './NoAsistenciaModal';
import { PautaRow, PautaDiariaV2Props } from './types';
import { marcarAsistencia, deshacerAsistencia, verificarPermisos } from '@/lib/api/turnos';

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

// Helpers para estados
const isAsistido = (estado:string) =>
  estado === 'trabajado' || estado === 'reemplazo' || estado === 'asistido';
const isPlan = (estado:string) => estado === 'planificado' || estado === 'plan';
const isSinCobertura = (estado:string) => estado === 'sin_cobertura';

const renderEstado = (raw: string, isFalta: boolean) => {
  const estado = raw === 'trabajado' ? 'asistido'
               : raw === 'planificado'         ? 'plan'
               : raw;
  
  const cls: Record<string,string> = {
    asistido:       'bg-emerald-500/10 text-emerald-400 ring-emerald-500/20',
    reemplazo:      'bg-sky-500/10 text-sky-400 ring-sky-500/20',
    sin_cobertura:  'bg-rose-500/10 text-rose-400 ring-rose-500/20',
    inasistencia:   'bg-rose-500/10 text-rose-400 ring-rose-500/20',
    libre:          'bg-gray-500/10 text-gray-400 ring-gray-500/20',
    plan:           'bg-amber-500/10 text-amber-400 ring-amber-500/20',
  };
  
  const base = cls[estado] ?? 'bg-gray-500/10 text-gray-400 ring-gray-500/20';
  
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 text-xs rounded ring-1 ${base}`}>
      {estado}
      {isFalta && <span className="ml-1 rounded px-1 text-[10px] ring-1 bg-red-500/10 text-red-400 ring-red-500/20">falta</span>}
    </span>
  );
};

export default function ClientTable({ rows, fecha, incluirLibres = false }: PautaDiariaV2Props) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { addToast } = useToast();
  const canMark = useCan('turnos.marcar_asistencia');
  const [modal, setModal] = useState<{open:boolean; pautaId:number|null; row?:PautaRow}>({open:false, pautaId:null});
  const [mostrarLibres, setMostrarLibres] = useState(incluirLibres);
  const [loadingStates, setLoadingStates] = useState<Set<number>>(new Set());
  const inputRef = useRef<HTMLInputElement>(null);
  const [f, setF] = useState<Filtros>(() => ({ 
    ppc: 'all',
    instalacion: searchParams.get('instalacion') || undefined,
    estado: searchParams.get('estado') || 'todos',
    q: searchParams.get('q') || undefined
  }));

  // Ya no necesitamos verificar permisos manualmente, useCan lo maneja

  // Persistir filtros en URL
  useEffect(() => {
    const params = new URLSearchParams();
    if (f.instalacion) params.set('instalacion', f.instalacion);
    if (f.estado && f.estado !== 'todos') params.set('estado', f.estado);
    if (f.ppc !== 'all') params.set('ppc', f.ppc === true ? 'true' : 'false');
    if (f.q) params.set('q', f.q);
    if (mostrarLibres) params.set('incluir_libres', 'true');
    
    const newUrl = `/pauta-diaria-v2?fecha=${fecha}${params.toString() ? '&' + params.toString() : ''}`;
    router.replace(newUrl, { scroll: false });
  }, [f.instalacion, f.estado, f.ppc, f.q, mostrarLibres, fecha]);

  const go = useCallback((delta:number) => {
    const params = new URLSearchParams();
    if (f.instalacion) params.set('instalacion', f.instalacion);
    if (f.estado && f.estado !== 'todos') params.set('estado', f.estado);
    if (f.ppc !== 'all') params.set('ppc', f.ppc === true ? 'true' : 'false');
    if (f.q) params.set('q', f.q);
    if (mostrarLibres) params.set('incluir_libres', 'true');
    
    const newUrl = `/pauta-diaria-v2?fecha=${addDays(fecha, delta)}${params.toString() ? '&' + params.toString() : ''}`;
    router.push(newUrl);
  }, [f.instalacion, f.estado, f.ppc, f.q, mostrarLibres, fecha, router]);
  
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft')  go(-1);
      if (e.key === 'ArrowRight') go(1);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [go]);

  const marcarAsistio = useCallback(async (pauta_id:number) => {
    setLoadingStates(prev => new Set(prev).add(pauta_id));
    try {
      const response = await marcarAsistencia({ pautaId: pauta_id, estado: 'asistio' });
      
      if (!response.ok) {
        if (response.status === 403) {
          addToast({
            title: "Error",
            description: "Sin permiso para marcar asistencia",
            type: "error"
          });
          return;
        }
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `Error ${response.status}`);
      }
      
      addToast({
        title: "Éxito",
        description: "Asistencia marcada correctamente",
        type: "success"
      });
      
      router.refresh();
    } catch (error) {
      console.error('Error marcando asistencia:', error);
      addToast({
        title: "Error",
        description: error instanceof Error ? error.message : "Error al marcar asistencia",
        type: "error"
      });
    } finally {
      setLoadingStates(prev => {
        const newSet = new Set(prev);
        newSet.delete(pauta_id);
        return newSet;
      });
    }
  }, [router, addToast]);

  const revertir = useCallback(async (pauta_id:number) => {
    setLoadingStates(prev => new Set(prev).add(pauta_id));
    try {
      const response = await marcarAsistencia({ pautaId: pauta_id, estado: 'deshacer' });
      
      if (!response.ok) {
        if (response.status === 403) {
          addToast({
            title: "Error",
            description: "Sin permiso para deshacer asistencia",
            type: "error"
          });
          return;
        }
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `Error ${response.status}`);
      }
      
      addToast({
        title: "Éxito",
        description: "Estado revertido a planificado",
        type: "success"
      });
      
      router.refresh();
    } catch (error) {
      console.error('Error deshaciendo asistencia:', error);
      addToast({
        title: "Error",
        description: error instanceof Error ? error.message : "Error al deshacer",
        type: "error"
      });
    } finally {
      setLoadingStates(prev => {
        const newSet = new Set(prev);
        newSet.delete(pauta_id);
        return newSet;
      });
    }
  }, [router, addToast]);

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
      // Filtrar libres si no se muestran
      if (!mostrarLibres && r.es_ppc && r.estado === 'planificado') return false;

      if (f.instalacion && `${r.instalacion_id}` !== f.instalacion && r.instalacion_nombre !== f.instalacion) return false;
      if (f.estado && f.estado !== 'todos') {
        const estadoUI = r.estado === 'trabajado' ? 'asistido' : (r.estado === 'planificado' ? 'plan' : r.estado);
        if (estadoUI !== f.estado) return false;
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

  if (!rows?.length) return <p className="text-sm opacity-70">Sin datos para {fecha}.</p>;

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
                    value={fecha}
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
                  <TableHead>Horario</TableHead>
                  <TableHead>Rol</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead>Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((r:PautaRow) => {
                  const esDuplicado = r.guardia_trabajo_id && (guardiasDuplicados.get(`${r.fecha}-${r.guardia_trabajo_id}`) || 0) > 1;
                  const isLoading = loadingStates.has(r.pauta_id);
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
                        {r.hora_inicio && r.hora_fin 
                          ? `${r.hora_inicio.slice(0,5)}–${r.hora_fin.slice(0,5)}`
                          : '—'}
                      </TableCell>
                      <TableCell>{r.rol_nombre || '—'}</TableCell>
                      <TableCell>{renderEstado(r.estado, r.es_falta_sin_aviso)}</TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          {/* Planificado (no PPC) → mostrar Asistió y No asistió */}
                          {isPlan(r.estado) && !r.es_ppc && canMark && (
                            <>
                              <Button 
                                size="sm" 
                                disabled={isLoading} 
                                onClick={()=>marcarAsistio(r.pauta_id)}
                              >
                                {isLoading ? 'Guardando...' : 'Asistió'}
                              </Button>
                              <Button 
                                size="sm" 
                                variant="outline"
                                disabled={isLoading} 
                                onClick={()=>setModal({open:true, pautaId:r.pauta_id, row:r})}
                              >
                                No asistió
                              </Button>
                            </>
                          )}

                          {/* Asistido → solo mostrar Deshacer */}
                          {isAsistido(r.estado) && canMark && (
                            <Button 
                              size="sm" 
                              variant="secondary"
                              disabled={isLoading} 
                              onClick={()=>revertir(r.pauta_id)}
                            >
                              {isLoading ? 'Guardando...' : 'Deshacer'}
                            </Button>
                          )}

                          {/* PPC sin cobertura → mostrar Asignar cobertura */}
                          {r.es_ppc && isSinCobertura(r.estado) && canMark && (
                            <Button 
                              size="sm" 
                              variant="outline"
                              disabled={isLoading} 
                              onClick={()=>handleAsignarCobertura(r)}
                            >
                              Asignar cobertura
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

        {modal.open && modal.pautaId != null && (
          <NoAsistenciaModal
            open={modal.open}
            pautaId={modal.pautaId}
            onClose={() => setModal({open:false, pautaId:null, row:undefined})}
            onDone={onCoberturaDone}
          />
        )}
      </>
    </TooltipProvider>
  );
}


