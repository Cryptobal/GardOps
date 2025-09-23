/**
 * Modal para solicitar fecha de inicio de asignación
 * Compatible con lógica existente
 */

"use client";

import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from './dialog';
import { Button } from './button';
import { Input } from './input';
import { Label } from './label';
import { AlertTriangle, Calendar, User, Building2 } from 'lucide-react';
import { Alert, AlertDescription } from './alert';

interface ModalFechaInicioAsignacionProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirmar: (fechaInicio: string, observaciones?: string) => void;
  guardiaNombre: string;
  guardiaInstalacionActual?: string;
  nuevaInstalacionNombre: string;
  nuevoRolServicioNombre: string;
  esReasignacion: boolean;
  fechaInicial?: string; // Nueva prop para la fecha inicial
  ppcId?: string; // ID del puesto para validar conflictos
}

export default function ModalFechaInicioAsignacion({
  isOpen,
  onClose,
  onConfirmar,
  guardiaNombre,
  guardiaInstalacionActual,
  nuevaInstalacionNombre,
  nuevoRolServicioNombre,
  esReasignacion,
  fechaInicial,
  ppcId
}: ModalFechaInicioAsignacionProps) {
  
  console.log('🔍 [DEBUG] ModalFechaInicioAsignacion - Props recibidas:', {
    isOpen,
    guardiaNombre,
    nuevaInstalacionNombre,
    nuevoRolServicioNombre,
    esReasignacion,
    fechaInicial
  });
  
  const [fechaInicio, setFechaInicio] = useState(() => {
    console.log('🔍 [DEBUG] ModalFechaInicioAsignacion - fechaInicial recibida:', fechaInicial);
    
    // Usar fechaInicial si está disponible, sino usar fecha actual en zona horaria de Chile
    if (fechaInicial) {
      // Si viene en formato YYYY-MM-DD, usarla directamente
      if (fechaInicial.includes('-') && fechaInicial.length === 10) {
        console.log('🔍 [DEBUG] Usando fecha en formato YYYY-MM-DD:', fechaInicial);
        return fechaInicial;
      }
      // Si viene en formato DD/MM/YYYY, convertir a YYYY-MM-DD
      const partes = fechaInicial.split('/');
      if (partes.length === 3) {
        const dia = partes[0].padStart(2, '0');
        const mes = partes[1].padStart(2, '0');
        const año = partes[2];
        const fechaConvertida = `${año}-${mes}-${dia}`;
        console.log('🔍 [DEBUG] Fecha convertida de DD/MM/YYYY a YYYY-MM-DD:', fechaInicial, '->', fechaConvertida);
        return fechaConvertida;
      }
    }
    
    // Por defecto, fecha actual en zona horaria de Chile
    const hoy = new Date();
    const año = hoy.getFullYear();
    const mes = String(hoy.getMonth() + 1).padStart(2, '0');
    const dia = String(hoy.getDate()).padStart(2, '0');
    const fechaActual = `${año}-${mes}-${dia}`;
    console.log('🔍 [DEBUG] Usando fecha actual:', fechaActual);
    return fechaActual;
  });
  
  const [observaciones, setObservaciones] = useState('');
  const [loading, setLoading] = useState(false);
  const [validandoFecha, setValidandoFecha] = useState(false);
  const [conflictosFecha, setConflictosFecha] = useState<any[]>([]);
  const [mensajeValidacion, setMensajeValidacion] = useState('');
  
  // Validar fecha inicial cuando se abre el modal - TEMPORALMENTE DESHABILITADO
  // React.useEffect(() => {
  //   if (isOpen && ppcId && fechaInicio) {
  //     validarFechaAsignacion(fechaInicio);
  //   }
  // }, [isOpen, ppcId, fechaInicio]);
  
  // Función para validar fecha de asignación
  const validarFechaAsignacion = async (fecha: string) => {
    if (!fecha) {
      setConflictosFecha([]);
      setMensajeValidacion('');
      return;
    }
    
    setValidandoFecha(true);
    try {
      const response = await fetch('/api/validar-fecha-asignacion', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          puesto_id: ppcId,
          fecha_inicio: fecha
        })
      });
      
      const data = await response.json();
      
      if (data.success) {
        setConflictosFecha(data.conflictos || []);
        setMensajeValidacion(data.mensaje || '');
      } else {
        setConflictosFecha([]);
        setMensajeValidacion('Error validando fecha');
      }
    } catch (error) {
      console.error('Error validando fecha:', error);
      setConflictosFecha([]);
      setMensajeValidacion('Error validando fecha');
    } finally {
      setValidandoFecha(false);
    }
  };

  const handleConfirmar = async () => {
    if (!fechaInicio) {
      return;
    }
    
    console.log('🔍 [MODAL-FECHA] Confirmando con fecha:', {
      fechaSeleccionada: fechaInicio,
      fechaInicialRecibida: fechaInicial,
      fechaActual: new Date().toLocaleDateString('es-CL'),
      fechaActualUTC: new Date().toISOString(),
      fechaActualChile: new Date().toLocaleString('es-CL', { timeZone: 'America/Santiago' }),
      fechaActualChileISO: new Date().toLocaleString('en-CA', { timeZone: 'America/Santiago' }),
      observaciones
    });
    
    setLoading(true);
    try {
      await onConfirmar(fechaInicio, observaciones || undefined);
      onClose();
    } catch (error) {
      console.error('Error en confirmación:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    if (!loading) {
      // Resetear a fecha inicial o fecha actual
      if (fechaInicial) {
        // Si viene en formato YYYY-MM-DD, usarla directamente
        if (fechaInicial.includes('-') && fechaInicial.length === 10) {
          setFechaInicio(fechaInicial);
        } else {
          // Si viene en formato DD/MM/YYYY, convertir a YYYY-MM-DD
          const partes = fechaInicial.split('/');
          if (partes.length === 3) {
            const dia = partes[0].padStart(2, '0');
            const mes = partes[1].padStart(2, '0');
            const año = partes[2];
            setFechaInicio(`${año}-${mes}-${dia}`);
          }
        }
      } else {
        const hoy = new Date();
        const año = hoy.getFullYear();
        const mes = String(hoy.getMonth() + 1).padStart(2, '0');
        const dia = String(hoy.getDate()).padStart(2, '0');
        setFechaInicio(`${año}-${mes}-${dia}`);
      }
      setObservaciones('');
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5 text-blue-600" />
            {esReasignacion ? 'Confirmar Reasignación' : 'Confirmar Asignación'}
          </DialogTitle>
          <DialogDescription>
            {esReasignacion 
              ? 'Selecciona la fecha de inicio para la nueva asignación del guardia.'
              : 'Selecciona la fecha de inicio para asignar el guardia al puesto.'
            }
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Información del guardia */}
          <div className="p-3 bg-gray-50 dark:bg-gray-900 rounded-lg">
            <div className="flex items-center gap-2 mb-2">
              <User className="h-4 w-4 text-gray-500" />
              <span className="font-medium">{guardiaNombre}</span>
            </div>
            
            {esReasignacion && guardiaInstalacionActual && (
              <div className="text-sm text-gray-600 dark:text-gray-400">
                Actualmente en: <span className="font-medium">{guardiaInstalacionActual}</span>
              </div>
            )}
          </div>

          {/* Advertencia para reasignaciones */}
          {esReasignacion && (
            <Alert className="border-orange-200 bg-orange-50 dark:border-orange-800 dark:bg-orange-950">
              <AlertTriangle className="h-4 w-4 text-orange-600" />
              <AlertDescription className="text-orange-800 dark:text-orange-200">
                Esta acción terminará la asignación actual y creará una nueva asignación.
              </AlertDescription>
            </Alert>
          )}

          {/* Nueva instalación */}
          <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
            <div className="flex items-center gap-2 mb-1">
              <Building2 className="h-4 w-4 text-blue-600" />
              <span className="font-medium text-blue-800 dark:text-blue-200">Nueva Asignación</span>
            </div>
            <div className="text-sm text-blue-700 dark:text-blue-300">
              <div><strong>Instalación:</strong> {nuevaInstalacionNombre}</div>
              <div><strong>Rol:</strong> {nuevoRolServicioNombre}</div>
            </div>
          </div>

          {/* Campo fecha de inicio */}
          <div className="space-y-2">
            <Label htmlFor="fecha-inicio" className="text-sm font-medium">
              📅 Fecha de Inicio de Asignación *
            </Label>
            <Input
              id="fecha-inicio"
              type="date"
              value={fechaInicio}
              onChange={(e) => {
                const nuevaFecha = e.target.value;
                setFechaInicio(nuevaFecha);
                // Validación automática temporalmente deshabilitada
                // if (ppcId && nuevaFecha) {
                //   validarFechaAsignacion(nuevaFecha);
                // }
              }}
              required
              className="w-full"
              max="2030-12-31"
            />
            <p className="text-xs text-gray-500">
              {esReasignacion 
                ? 'La asignación actual terminará el día anterior a esta fecha'
                : 'Fecha desde la cual el guardia estará asignado a esta instalación'
              }
            </p>
            {fechaInicial && (
              <p className="text-xs text-blue-600 dark:text-blue-400">
                💡 Fecha sugerida desde el buscador: {fechaInicial}
              </p>
            )}
            
            {/* Validación de conflictos */}
            {validandoFecha && (
              <p className="text-xs text-yellow-600 dark:text-yellow-400">
                🔍 Validando fecha...
              </p>
            )}
            
            {mensajeValidacion && !validandoFecha && (
              <div className={`text-xs p-2 rounded ${
                conflictosFecha.length > 0 
                  ? 'text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950' 
                  : 'text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-950'
              }`}>
                {conflictosFecha.length > 0 ? (
                  <div>
                    <p className="font-medium">⚠️ {mensajeValidacion}</p>
                    <div className="mt-1">
                      {conflictosFecha.map((conflicto, index) => (
                        <p key={index} className="text-xs">
                          • {conflicto.fecha}: {conflicto.guardia_nombre} ({conflicto.estado})
                        </p>
                      ))}
                    </div>
                  </div>
                ) : (
                  <p>✅ {mensajeValidacion}</p>
                )}
              </div>
            )}
          </div>

          {/* Observaciones */}
          <div className="space-y-2">
            <Label htmlFor="observaciones" className="text-sm font-medium">
              💬 Observaciones (opcional)
            </Label>
            <textarea
              id="observaciones"
              value={observaciones}
              onChange={(e) => setObservaciones(e.target.value)}
              placeholder="Motivo de la asignación, comentarios adicionales..."
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm resize-none dark:border-gray-600 dark:bg-gray-800"
              rows={3}
            />
          </div>

          {/* Botones */}
          <div className="flex gap-2 pt-2">
            <Button
              variant="outline"
              onClick={handleClose}
              disabled={loading}
              className="flex-1"
            >
              Cancelar
            </Button>
            <Button
              onClick={handleConfirmar}
              disabled={loading || !fechaInicio}
              className="flex-1"
            >
              {loading ? (
                <div className="flex items-center gap-2">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  Asignando...
                </div>
              ) : (
                `${esReasignacion ? 'Reasignar' : 'Asignar'} Guardia`
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
