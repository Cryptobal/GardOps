"use client";

import { logger, devLogger, apiLogger } from '@/lib/utils/logger';
import { marcarTurnoExtra } from '@/app/pauta-diaria-v2/apiAdapter';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Loader2, X, MapPin, Clock, User } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import ModalExitoAsignacion from '../ui/modal-exito-asignacion';

interface PPC {
  id: string;
  tipo: 'ppc';
  instalacion: string;
  instalacion_id: string;
  rol: string;
  rol_id: string;
  horario: string;
  estado: string;
}

interface TurnoAsignado {
  id: string;
  puesto_id: string;
  tipo: 'turno_asignado';
  instalacion: string;
  instalacion_id: string;
  rol: string;
  rol_id: string;
  horario: string;
  guardia_asignado: {
    id: string;
    nombre: string;
  };
  estado: string;
}

interface PPCModalProps {
  isOpen: boolean;
  onClose: () => void;
  guardia: {
    id: string;
    nombre: string;
    telefono: string;
    comuna: string;
    distancia: number;
  };
  instalacionId: string;
  onAsignacionExitosa: () => void;
}

export default function PPCModal({ 
  isOpen, 
  onClose, 
  guardia, 
  instalacionId, 
  onAsignacionExitosa 
}: PPCModalProps) {
  const { toast } = useToast();
  const [ppcs, setPpcs] = useState<PPC[]>([]);
  const [turnosAsignados, setTurnosAsignados] = useState<TurnoAsignado[]>([]);
  const [loading, setLoading] = useState(false);
  const [asignando, setAsignando] = useState<string | null>(null);
  
  // Estado para modal de éxito
  const [modalExito, setModalExito] = useState({
    isOpen: false,
    guardiaInfo: { nombre: '', rut: '' },
    ppcInfo: { instalacion: '', rol: '', horario: '' }
  });

  // Estado para modal de confirmación de tipo (solo para PPCs)
  const [modalTipo, setModalTipo] = useState({
    isOpen: false,
    ppc: null as PPC | null
  });

  useEffect(() => {
    if (isOpen && instalacionId) {
      cargarPPCs();
    }
  }, [isOpen, instalacionId]);

  const cargarPPCs = async () => {
    try {
      setLoading(true);
      
      // Usar el nuevo endpoint de pauta completa del día
      const fecha = new Date().toISOString().split('T')[0];
      const response = await fetch(`/api/pauta-diaria/del-dia?fecha=${fecha}`);
      const data = await response.json();
      
      if (!data.ppcs || !data.turnos_asignados) {
        console.error('Error: pauta-diaria/del-dia no devolvió estructura esperada');
        setPpcs([]);
        setTurnosAsignados([]);
        return;
      }
      
      logger.debug(`✅ Pauta del día cargada:`, {
        ppcs: data.ppcs.length,
        turnos_asignados: data.turnos_asignados.length,
        fecha: data.fecha
      });
      
      setPpcs(data.ppcs);
      setTurnosAsignados(data.turnos_asignados);
      
    } catch (error) {
      logger.error('Error cargando pauta del día::', error);
      toast.error('Error de conexión al cargar pauta', 'Error');
    } finally {
      setLoading(false);
    }
  };

  // Funciones para manejar diferentes tipos de asignación
  const handleClickPPC = (ppc: PPC) => {
    // Para PPCs, mostrar modal de selección de tipo
    setModalTipo({
      isOpen: true,
      ppc: ppc
    });
  };

  const handleAsignarPermanente = async (ppc: PPC) => {
    try {
      setAsignando(ppc.id);
      logger.debug('🟦 Asignación permanente:', { guardia_id: guardia.id, puesto_operativo_id: ppc.id });
      
      const response = await fetch('/api/ppc/asignar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          guardia_id: guardia.id,
          puesto_operativo_id: ppc.id
        })
      });

      if (!response.ok) {
        let errorMessage = 'Error al asignar guardia';
        try {
          const data = await response.json();
          errorMessage = data?.error || errorMessage;
        } catch (jsonError) {
          logger.error('Error parsing JSON response::', jsonError);
        }
        throw new Error(errorMessage);
      }

      mostrarModalExito('permanente', ppc, null);
      
    } catch (error) {
      logger.error('Error asignando guardia permanente::', error);
      toast.error('No se pudo asignar el guardia', 'Error');
    } finally {
      setAsignando(null);
    }
  };

  const handleTurnoExtraPPC = async (ppc: PPC) => {
    try {
      setAsignando(ppc.id);
      logger.debug('🟨 Turno extra PPC - Buscando pauta_id para puesto:', { puesto_id: ppc.id, guardia_id: guardia.id });
      
      // Primero buscar el pauta_id real del PPC en as_turnos_pauta_mensual
      const fecha = new Date().toISOString().split('T')[0];
      const [anio, mes, dia] = fecha.split('-').map(Number);
      
      const buscarPautaResponse = await fetch('/api/pauta-diaria-v2/data', {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' }
      });
      
      if (!buscarPautaResponse.ok) {
        throw new Error('No se pudo obtener datos de pauta diaria');
      }
      
      const pautaResponse = await buscarPautaResponse.json();
      
      if (!pautaResponse.success || !Array.isArray(pautaResponse.data)) {
        throw new Error('Error en estructura de respuesta de pauta diaria');
      }
      
      const ppcEnPauta = pautaResponse.data.find((item: any) => item.puesto_id === ppc.id && item.es_ppc);
      
      if (!ppcEnPauta || !ppcEnPauta.pauta_id) {
        throw new Error('No se encontró pauta_id para este PPC');
      }
      
      devLogger.search(' PPC encontrado en pauta:', { pauta_id: ppcEnPauta.pauta_id, puesto_id: ppc.id });
      
      // Usar EXACTAMENTE la misma lógica que botón "Cubrir" en pauta diaria
      const result = await marcarTurnoExtra(
        ppcEnPauta.pauta_id,
        guardia.id,
        ppcEnPauta // Pasar la fila completa igual que pauta diaria
      );
      
      if (!result || result.error) {
        throw new Error(result?.error || 'Error al crear turno extra');
      }

      mostrarModalExito('turno_extra_ppc', ppc, null);
      
    } catch (error) {
      logger.error('Error creando turno extra PPC::', error);
      toast.error('No se pudo crear el turno extra', 'Error');
    } finally {
      setAsignando(null);
    }
  };

  const handleTurnoExtraReemplazo = async (turno: TurnoAsignado) => {
    try {
      setAsignando(turno.id);
      console.log('🟧 Turno extra reemplazo (usando endpoint turno-extra):', { pauta_id: turno.id, guardia_id: guardia.id });
      
      // Usar el endpoint que marca como "Turno Extra" morado
      const response = await fetch('/api/pauta-diaria/turno-extra', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          guardia_id: guardia.id,
          puesto_id: turno.puesto_id,
          pauta_id: turno.id,
          estado: 'reemplazo'
        })
      });

      if (!response.ok) {
        let errorMessage = 'Error al crear reemplazo';
        try {
          const data = await response.json();
          errorMessage = data?.error || errorMessage;
        } catch (jsonError) {
          logger.error('Error parsing JSON response::', jsonError);
        }
        throw new Error(errorMessage);
      }

      const result = await response.json();
      mostrarModalExito('turno_extra_reemplazo', null, turno);
      
    } catch (error) {
      logger.error('Error creando turno extra reemplazo::', error);
      toast.error('No se pudo crear el reemplazo', 'Error');
    } finally {
      setAsignando(null);
    }
  };

  const mostrarModalExito = (tipo: string, ppc: PPC | null, turno: TurnoAsignado | null) => {
    let mensaje = '';
    let info = { instalacion: '', rol: '', horario: '' };
    
    if (tipo === 'permanente' && ppc) {
      mensaje = 'Asignación Permanente';
      info = { instalacion: ppc.instalacion, rol: ppc.rol, horario: ppc.horario };
    } else if (tipo === 'turno_extra_ppc' && ppc) {
      mensaje = 'Turno Extra - PPC';
      info = { instalacion: ppc.instalacion, rol: ppc.rol, horario: ppc.horario };
    } else if (tipo === 'turno_extra_reemplazo' && turno) {
      mensaje = 'Turno Extra - Reemplazo';
      info = { instalacion: turno.instalacion, rol: turno.rol, horario: turno.horario };
    }

    setModalExito({
      isOpen: true,
      guardiaInfo: { nombre: guardia.nombre, rut: '' },
      ppcInfo: info
    });
    
    onAsignacionExitosa();
    onClose();
  };

  const cerrarModalExito = () => {
    setModalExito({
      isOpen: false,
      guardiaInfo: { nombre: '', rut: '' },
      ppcInfo: { instalacion: '', rol: '', horario: '' }
    });
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 dark:bg-black/70 flex items-center justify-center z-50 p-4">
      <Card className="w-full max-w-2xl max-h-[80vh] overflow-hidden bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-700">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4 bg-white dark:bg-gray-900">
          <CardTitle className="text-lg font-semibold text-gray-900 dark:text-gray-100">
            Asignar {guardia.nombre}
          </CardTitle>
          <Button variant="ghost" size="sm" onClick={onClose} className="text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200">
            <X className="w-4 h-4" />
          </Button>
        </CardHeader>
        
        <CardContent className="space-y-4 bg-white dark:bg-gray-900">
          {/* Información del guardia */}
          <div className="bg-gray-50 dark:bg-gray-800 p-3 rounded-lg border border-gray-200 dark:border-gray-700">
            <div className="flex items-center gap-2 mb-2">
              <User className="w-4 h-4 text-gray-600 dark:text-gray-400" />
              <span className="font-medium text-gray-900 dark:text-gray-100">{guardia.nombre}</span>
            </div>
            <div className="flex items-center gap-2 mb-1">
              <MapPin className="w-4 h-4 text-gray-600 dark:text-gray-400" />
              <span className="text-sm text-gray-600 dark:text-gray-400">{guardia.comuna}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-600 dark:text-gray-400">Distancia: {guardia.distancia.toFixed(1)} km</span>
            </div>
          </div>

          {/* PPCs Disponibles */}
          <div className="mb-6">
            <h3 className="font-medium mb-3 text-gray-900 dark:text-gray-100 flex items-center gap-2">
              🟦 Puestos Pendientes por Cubrir (PPCs)
            </h3>
            
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-6 h-6 animate-spin mr-2 text-gray-600 dark:text-gray-400" />
                <span className="text-gray-600 dark:text-gray-400">Cargando pauta del día...</span>
              </div>
            ) : ppcs.length === 0 ? (
              <div className="text-center py-4 text-gray-500 dark:text-gray-400">
                <Clock className="w-6 h-6 mx-auto mb-2 opacity-50" />
                <p>No hay PPCs disponibles hoy</p>
              </div>
            ) : (
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {ppcs.map((ppc) => (
                  <div key={ppc.id} className="border border-blue-200 dark:border-blue-700 rounded-lg p-3 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors bg-white dark:bg-gray-900">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <Badge variant="secondary" className="bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200">{ppc.rol}</Badge>
                        </div>
                        <p className="text-sm text-gray-600 dark:text-gray-400">{ppc.instalacion}</p>
                        <p className="text-xs text-gray-500 dark:text-gray-500">Horario: {ppc.horario}</p>
                      </div>
                      <Button
                        size="sm"
                        onClick={() => handleClickPPC(ppc)}
                        disabled={asignando === ppc.id}
                        className="ml-3 bg-blue-600 hover:bg-blue-700 text-white"
                      >
                        {asignando === ppc.id ? (
                          <>
                            <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                            Procesando...
                          </>
                        ) : (
                          'Seleccionar'
                        )}
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Turnos Asignados para Reemplazo */}
          <div>
            <h3 className="font-medium mb-3 text-gray-900 dark:text-gray-100 flex items-center gap-2">
              🟧 Turnos Asignados (Generar Turno Extra)
            </h3>
            
            {turnosAsignados.length === 0 ? (
              <div className="text-center py-4 text-gray-500 dark:text-gray-400">
                <User className="w-6 h-6 mx-auto mb-2 opacity-50" />
                <p>No hay turnos asignados hoy</p>
              </div>
            ) : (
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {turnosAsignados.map((turno) => (
                  <div key={turno.id} className="border border-orange-200 dark:border-orange-700 rounded-lg p-3 hover:bg-orange-50 dark:hover:bg-orange-900/20 transition-colors bg-white dark:bg-gray-900">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <Badge variant="secondary" className="bg-orange-100 dark:bg-orange-900 text-orange-800 dark:text-orange-200">{turno.rol}</Badge>
                          <Badge variant="outline" className="border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300">{turno.guardia_asignado.nombre}</Badge>
                        </div>
                        <p className="text-sm text-gray-600 dark:text-gray-400">{turno.instalacion}</p>
                        <p className="text-xs text-gray-500 dark:text-gray-500">Horario: {turno.horario}</p>
                      </div>
                      <Button
                        size="sm"
                        onClick={() => handleTurnoExtraReemplazo(turno)}
                        disabled={asignando === turno.id}
                        className="ml-3 bg-orange-600 hover:bg-orange-700 text-white"
                      >
                        {asignando === turno.id ? (
                          <>
                            <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                            Creando...
                          </>
                        ) : (
                          'Turno Extra'
                        )}
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Modal de selección de tipo para PPCs */}
      {modalTipo.isOpen && modalTipo.ppc && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-[60] p-4">
          <Card className="w-full max-w-md bg-white dark:bg-gray-900">
            <CardHeader className="pb-4">
              <CardTitle className="text-lg font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-2">
                ¿Cómo asignar a {modalTipo.ppc.instalacion}?
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-3">
                <Button
                  onClick={() => {
                    setModalTipo({ isOpen: false, ppc: null });
                    handleAsignarPermanente(modalTipo.ppc!);
                  }}
                  className="w-full justify-start text-left h-auto p-4 bg-blue-600 hover:bg-blue-700"
                  disabled={asignando === modalTipo.ppc.id}
                >
                  <div>
                    <div className="font-medium text-white">🟦 Asignar Permanente</div>
                    <div className="text-sm text-blue-100">Guardia fijo, PPC se cierra</div>
                  </div>
                </Button>
                
                <Button
                  onClick={() => {
                    setModalTipo({ isOpen: false, ppc: null });
                    handleTurnoExtraPPC(modalTipo.ppc!);
                  }}
                  className="w-full justify-start text-left h-auto p-4 bg-yellow-600 hover:bg-yellow-700"
                  disabled={asignando === modalTipo.ppc.id}
                >
                  <div>
                    <div className="font-medium text-white">🟨 Turno Extra</div>
                    <div className="text-sm text-yellow-100">Solo por hoy, PPC sigue abierto</div>
                  </div>
                </Button>
              </div>
              
              <Button
                variant="outline"
                onClick={() => setModalTipo({ isOpen: false, ppc: null })}
                className="w-full mt-4"
              >
                Cancelar
              </Button>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Modal de éxito de asignación */}
      <ModalExitoAsignacion
        isOpen={modalExito.isOpen}
        onClose={cerrarModalExito}
        guardiaInfo={modalExito.guardiaInfo}
        ppcInfo={modalExito.ppcInfo}
      />
    </div>
  );
}

