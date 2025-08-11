'use client';
import { useEffect, useState, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { PautaRow } from './types';
import { toYmd } from '@/lib/date';

interface Guardia {
  id: string;
  nombre: string;
  apellido_paterno: string;
  apellido_materno: string;
  nombre_completo: string;
}

type ModalType = 'no_asistio' | 'cubrir_ppc';

export default function AsistenciaModal({
  open, 
  onClose, 
  pautaId, 
  row,
  modalType,
  onNoAsistioConfirm,
  onCubrirPPC,
  fecha,
  instalacionId,
  rolId,
  guardiaTitularId
}: { 
  open: boolean; 
  onClose: () => void; 
  pautaId: string; 
  row?: PautaRow;
  modalType: ModalType;
  onNoAsistioConfirm: (data: {
    pauta_id: string;
    falta_sin_aviso: boolean;
    motivo?: string;
    cubierto_por?: string | null;
  }) => Promise<void>;
  onCubrirPPC: (pauta_id: string, guardia_id: string) => Promise<void>;
  fecha?: string;
  instalacionId?: string;
  rolId?: string;
  guardiaTitularId?: string;
}) {
  const { addToast } = useToast();
  const [motivo, setMotivo] = useState<'con_aviso' | 'sin_aviso' | 'licencia' | 'permiso' | 'vacaciones' | 'finiquito'>('sin_aviso');
  const [asignarCobertura, setAsignarCobertura] = useState(false);
  const [guardias, setGuardias] = useState<Guardia[]>([]);
  const [guardiaReemplazo, setGuardiaReemplazo] = useState('');
  const [loading, setLoading] = useState(false);
  const [loadingGuardias, setLoadingGuardias] = useState(false);
  const [filtro, setFiltro] = useState('');

  // Filtrar guardias client-side
  const guardiasFiltradas = useMemo(() => {
    if (!filtro) return guardias;
    const filtroLower = filtro.toLowerCase();
    return guardias.filter(g => 
      g.nombre_completo.toLowerCase().includes(filtroLower)
    );
  }, [guardias, filtro]);

  useEffect(() => { 
    if (open && fecha && instalacionId) {
      // Normalizar fecha a string YYYY-MM-DD
      const fechaNorm = toYmd(fecha);
      console.log('[Modal] fecha=', fechaNorm, 'instalacion=', instalacionId, 'rol=', rolId, 'excluir=', guardiaTitularId);
      
      // Usar el nuevo endpoint con los parámetros necesarios
      const url = new URL('/api/guardias/disponibles', location.origin);
      url.searchParams.set('fecha', fechaNorm);
      url.searchParams.set('instalacion_id', instalacionId);
      
      // Solo incluir rol_id si está disponible
      if (rolId) {
        url.searchParams.set('rol_id', rolId);
      }
      
      // Para el caso de "No asistió con cobertura" de un titular, excluir al titular
      if (modalType === 'no_asistio' && asignarCobertura && guardiaTitularId) {
        url.searchParams.set('excluir_guardia_id', guardiaTitularId);
      }

      console.log(`Llamando a ${url.pathname}${url.search}`);
      
      setLoadingGuardias(true);
      fetch(url.toString())
        .then(r => {
          if (!r.ok) {
            return r.json().then(data => { 
              throw new Error(data.error || 'Error desconocido'); 
            });
          }
          return r.json();
        })
        .then((data) => {
          console.log('Guardias disponibles recibidos:', data);
          if (data.items) {
            setGuardias(data.items);
          } else {
            setGuardias([]);
          }
        })
        .catch(err => {
          console.error('Error cargando guardias disponibles:', err);
          addToast({
            title: "Error",
            description: err.message || "No se pudieron cargar los guardias disponibles",
            type: "error"
          });
          setGuardias([]);
        })
        .finally(() => setLoadingGuardias(false));
    } else if (open) {
      // Si no tenemos todos los parámetros, no cargar guardias
      console.warn('Faltan parámetros para cargar guardias disponibles:', { fecha, instalacionId, rolId });
      setGuardias([]);
    }
  }, [open, fecha, instalacionId, rolId, modalType, asignarCobertura, guardiaTitularId, addToast]);

  const submit = async () => {
    if (modalType === 'no_asistio') {
      if (!motivo) {
        addToast({
          title: "Error",
          description: "Debes seleccionar un motivo",
          type: "error"
        });
        return;
      }

      if (asignarCobertura && !guardiaReemplazo) {
        addToast({
          title: "Error",
          description: "Debes seleccionar un guardia de reemplazo",
          type: "error"
        });
        return;
      }

      // Validar que no se seleccione el mismo guardia titular como reemplazo
      if (asignarCobertura && guardiaReemplazo === guardiaTitularId) {
        addToast({
          title: "Error",
          description: "No se puede seleccionar al mismo guardia titular como reemplazo",
          type: "error"
        });
        return;
      }

      setLoading(true);
      try {
        const falta_sin_aviso = motivo === 'sin_aviso';
        const motivoText = motivo === 'sin_aviso' ? 'Falta sin aviso' : 
                          motivo === 'con_aviso' ? 'Falta con aviso' :
                          motivo === 'licencia' ? 'Licencia médica' :
                          motivo === 'permiso' ? 'Permiso' :
                          motivo === 'vacaciones' ? 'Vacaciones' :
                          motivo === 'finiquito' ? 'Finiquito' : motivo;

        console.log('Enviando inasistencia:', {
          pauta_id: pautaId,
          falta_sin_aviso,
          motivo: motivoText,
          cubierto_por: asignarCobertura && guardiaReemplazo ? guardiaReemplazo : null
        });

        await onNoAsistioConfirm({
          pauta_id: pautaId,
          falta_sin_aviso,
          motivo: motivoText,
          cubierto_por: asignarCobertura && guardiaReemplazo ? guardiaReemplazo : null
        });
        
      } catch (error) {
        console.error('Error enviando datos:', error);
        addToast({
          title: "Error",
          description: error instanceof Error ? error.message : "Error al guardar los datos",
          type: "error"
        });
      } finally {
        setLoading(false);
      }
    } else if (modalType === 'cubrir_ppc') {
      if (!guardiaReemplazo) {
        addToast({
          title: "Error",
          description: "Debes seleccionar un guardia para cubrir el turno",
          type: "error"
        });
        return;
      }

      setLoading(true);
      try {
        console.log('Cubriendo PPC:', {
          pauta_id: pautaId,
          guardia_id: guardiaReemplazo
        });
        
        await onCubrirPPC(pautaId, guardiaReemplazo);
      } catch (error) {
        console.error('Error cubriendo turno PPC:', error);
        addToast({
          title: "Error",
          description: error instanceof Error ? error.message : "Error al cubrir el turno",
          type: "error"
        });
      } finally {
        setLoading(false);
      }
    }
  };

  if (!open) return null;
  
  const isNoAsistio = modalType === 'no_asistio';
  const isCubrirPPC = modalType === 'cubrir_ppc';
  
  return (
    <div className="fixed inset-0 grid place-items-center z-50 bg-black/60 dark:bg-black/70 backdrop-blur-[1px]">
      <div className="w-[min(96vw,520px)] rounded-xl border bg-white text-slate-900 dark:bg-slate-900 dark:text-slate-100 shadow-xl">
        <CardHeader>
          <CardTitle>
            {isNoAsistio ? 'No asistió' : 'Cubrir turno PPC'}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {isNoAsistio && (
            <div className="space-y-2">
              <Label htmlFor="motivo">Motivo</Label>
              <Select value={motivo} onValueChange={(value: any) => setMotivo(value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Seleccione motivo" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="con_aviso">Con aviso</SelectItem>
                  <SelectItem value="sin_aviso">Sin aviso</SelectItem>
                  <SelectItem value="licencia">Licencia</SelectItem>
                  <SelectItem value="permiso">Permiso</SelectItem>
                  <SelectItem value="vacaciones">Vacaciones</SelectItem>
                  <SelectItem value="finiquito">Finiquito</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}

          {isNoAsistio && (
            <div className="flex items-center space-x-2">
              <Switch 
                id="asignarCobertura" 
                checked={asignarCobertura} 
                onCheckedChange={setAsignarCobertura}
              />
              <Label htmlFor="asignarCobertura">Asignar cobertura ahora</Label>
            </div>
          )}

          {(asignarCobertura || isCubrirPPC) && (
            <div className="space-y-3">
              <div className="space-y-2">
                <Label htmlFor="guardia">
                  {isCubrirPPC ? 'Guardia para cubrir' : 'Guardia de reemplazo'}
                </Label>
                
                {/* Input de búsqueda/filtro */}
                <Input
                  type="text"
                  placeholder="Buscar guardia por nombre..."
                  value={filtro}
                  onChange={(e) => setFiltro(e.target.value)}
                  className="mb-2"
                />
                
                <Select 
                  value={guardiaReemplazo} 
                  onValueChange={setGuardiaReemplazo}
                  disabled={loadingGuardias || guardiasFiltradas.length === 0}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecciona guardia" />
                  </SelectTrigger>
                  <SelectContent>
                    {loadingGuardias ? (
                      <SelectItem value="loading" disabled>Cargando guardias disponibles...</SelectItem>
                    ) : guardiasFiltradas.length === 0 ? (
                      <SelectItem value="empty" disabled>
                        {filtro ? 'No se encontraron guardias con ese filtro' : 'No hay guardias disponibles'}
                      </SelectItem>
                    ) : (
                      guardiasFiltradas.map(g => (
                        <SelectItem 
                          key={g.id} 
                          value={g.id}
                          disabled={g.id === guardiaTitularId}
                        >
                          {g.nombre_completo}
                          {g.id === guardiaTitularId && (
                            <span className="ml-2 text-xs text-muted-foreground">(Titular actual)</span>
                          )}
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
                
                {guardiasFiltradas.length > 0 && (
                  <p className="text-xs text-muted-foreground">
                    {guardiasFiltradas.length} guardia{guardiasFiltradas.length !== 1 ? 's' : ''} disponible{guardiasFiltradas.length !== 1 ? 's' : ''}
                  </p>
                )}
              </div>
            </div>
          )}

          <div className="flex justify-end gap-2 pt-4">
            <Button variant="outline" onClick={onClose} disabled={loading}>
              Cancelar
            </Button>
            <Button 
              onClick={submit}
              disabled={
                loading || 
                (isCubrirPPC && !guardiaReemplazo) ||
                (isNoAsistio && asignarCobertura && !guardiaReemplazo)
              }
            >
              {loading ? 'Guardando...' : 'Confirmar'}
            </Button>
          </div>
        </CardContent>
      </div>
    </div>
  );
}
