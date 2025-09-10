"use client";

import { logger, devLogger, apiLogger } from '@/lib/utils/logger';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { GuardiaSearchModal } from '@/components/ui/guardia-search-modal';
import { useToast } from '@/components/ui/toast';
import { UserPlus } from 'lucide-react';
import { asignarGuardiaPPC } from '@/lib/api/instalaciones';
import ConfirmacionReasignacionModal from '@/components/ui/confirmacion-reasignacion-modal';
import ModalFechaInicioAsignacion from '@/components/ui/modal-fecha-inicio-asignacion';

interface AsignarGuardiaDropdownProps {
  instalacionId: string;
  ppcId: string;
  rolServicioNombre: string;
  instalacionNombre: string;
  onAsignacionCompletada: () => void;
  className?: string;
}

export default function AsignarGuardiaDropdown({
  instalacionId,
  ppcId,
  rolServicioNombre,
  instalacionNombre,
  onAsignacionCompletada,
  className = ""
}: AsignarGuardiaDropdownProps) {
  const { toast } = useToast();
  const [guardias, setGuardias] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [cargandoGuardias, setCargandoGuardias] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [showConfirmacionModal, setShowConfirmacionModal] = useState(false);
  const [asignacionActual, setAsignacionActual] = useState<any>(null);
  const [guardiaSeleccionado, setGuardiaSeleccionado] = useState<string>('');
  
  // Estado para modal de fecha de inicio
  const [modalFechaInicio, setModalFechaInicio] = useState({
    isOpen: false,
    guardiaId: '',
    guardiaNombre: '',
    guardiaInstalacionActual: '',
    ppcId: '',
    instalacionNombre: '',
    rolServicioNombre: ''
  });

  // Cargar guardias cuando se abre el modal
  useEffect(() => {
    if (modalOpen && guardias.length === 0) {
      cargarGuardias();
    }
  }, [modalOpen]);

  const cargarGuardias = async () => {
    try {
      setCargandoGuardias(true);
      const fecha = new Date().toISOString().split('T')[0]; // Fecha actual en formato YYYY-MM-DD
      const params = new URLSearchParams({
        fecha,
        instalacion_id: instalacionId
      });
      
      const response = await fetch(`/api/guardias/disponibles?${params.toString()}`);
      if (!response.ok) {
        throw new Error('Error al obtener guardias disponibles');
      }
      const guardiasData = await response.json();
      const guardiasFinales = guardiasData.items || guardiasData.guardias || guardiasData;
      console.log('🔍 Debug AsignarGuardiaDropdown - guardias cargados:', guardiasFinales.slice(0, 3));
      setGuardias(guardiasFinales);
    } catch (error) {
      logger.error('Error cargando guardias::', error);
      toast.error('No se pudieron cargar los guardias', 'Error');
    } finally {
      setCargandoGuardias(false);
    }
  };

  const handleSelectGuardia = async (guardiaId: string) => {
    // NUEVA LÓGICA: Solicitar fecha de inicio antes de asignar
    const guardiaInfo = guardias.find(g => g.id === guardiaId);
    
    console.log('🔍 Debug AsignarGuardiaDropdown - Abriendo modal fecha inicio:', {
      guardiaId,
      guardiaNombre: guardiaInfo?.nombre_completo,
      ppcId,
      instalacionNombre,
      rolServicioNombre
    });
    
    setModalFechaInicio({
      isOpen: true,
      guardiaId: guardiaId,
      guardiaNombre: guardiaInfo?.nombre_completo || 'Guardia',
      guardiaInstalacionActual: guardiaInfo?.instalacion_actual_nombre || '',
      ppcId: ppcId,
      instalacionNombre: instalacionNombre,
      rolServicioNombre: rolServicioNombre
    });
    
    // NO cerrar el modal de búsqueda aquí - se cerrará cuando se confirme la asignación
  };

  // Nueva función para confirmar asignación con fecha
  const handleConfirmarAsignacionConFecha = async (fechaInicio: string, observaciones?: string, guardia?: any) => {
    try {
      setLoading(true);
      
      // Usar los datos del guardia pasados directamente o del estado
      const guardiaId = guardia?.id || modalFechaInicio.guardiaId;
      const ppcIdToUse = modalFechaInicio.ppcId || ppcId;
      
      console.log('🔍 Debug AsignarGuardiaDropdown - Asignando con fecha:', {
        guardiaId,
        ppcId: ppcIdToUse,
        fechaInicio,
        guardiaPasado: !!guardia,
        estadoModal: modalFechaInicio
      });
      
      const response = await fetch('/api/ppc/asignar-simple', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          guardia_id: guardiaId,
          puesto_operativo_id: ppcIdToUse,
          fecha_inicio: fechaInicio,
          motivo_inicio: 'asignacion_instalacion',
          observaciones
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        if (response.status === 409 && data.requiere_confirmacion) {
          // El guardia ya está asignado, mostrar modal de confirmación
          setAsignacionActual(data.asignacion_actual);
          setShowConfirmacionModal(true);
          setModalFechaInicio({
            isOpen: false,
            guardiaId: '',
            guardiaNombre: '',
            guardiaInstalacionActual: '',
            ppcId: '',
            instalacionNombre: '',
            rolServicioNombre: ''
          });
          setModalOpen(false);
          setLoading(false);
          return;
        }
        throw new Error(data.error || 'Error al asignar guardia');
      }
      
      toast.success('Guardia asignado correctamente', 'Éxito');
      
      // Cerrar modales y limpiar estados
      setModalFechaInicio({
        isOpen: false,
        guardiaId: '',
        guardiaNombre: '',
        guardiaInstalacionActual: '',
        ppcId: '',
        instalacionNombre: '',
        rolServicioNombre: ''
      });
      setModalOpen(false);
      onAsignacionCompletada();
    } catch (error) {
      logger.error('Error asignando guardia::', error);
      toast.error('No se pudo asignar el guardia', 'Error');
    } finally {
      setLoading(false);
    }
  };

  const handleConfirmarReasignacion = async () => {
    if (!guardiaSeleccionado) return;

    try {
      setLoading(true);
      
      // Asignar con confirmación de reasignación
      const response = await fetch('/api/ppc/asignar', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          guardia_id: guardiaSeleccionado,
          puesto_operativo_id: ppcId,
          confirmar_reasignacion: true
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Error al reasignar guardia');
      }
      
      toast.success('Guardia reasignado correctamente', 'Éxito');
      onAsignacionCompletada();
      setShowConfirmacionModal(false);
    } catch (error) {
      logger.error('Error reasignando guardia::', error);
      toast.error('No se pudo reasignar el guardia', 'Error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <div className={`relative ${className}`}>
        <Button
          variant="outline"
          size="sm"
          disabled={loading}
          onClick={() => setModalOpen(true)}
          className="w-full h-8 text-xs text-blue-600 hover:text-blue-700 border-blue-200 hover:bg-blue-50"
        >
          {loading ? (
            <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-blue-600"></div>
          ) : (
            <>
              <UserPlus className="w-3 h-3 mr-1" />
              Asignar Guardia
            </>
          )}
        </Button>
      </div>

      <GuardiaSearchModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        onSelectGuardia={handleSelectGuardia}
        guardias={guardias}
        loading={cargandoGuardias}
        title="Seleccionar Guardia"
        instalacionId={instalacionId}
        instalacionNombre={instalacionNombre}
        onConfirmarAsignacionConFecha={handleConfirmarAsignacionConFecha}
        ppcId={ppcId}
      />

      {/* Modal de confirmación de reasignación */}
      {showConfirmacionModal && asignacionActual && (
        <ConfirmacionReasignacionModal
          isOpen={showConfirmacionModal}
          onClose={() => setShowConfirmacionModal(false)}
          onConfirmar={handleConfirmarReasignacion}
          guardiaNombre={guardias.find(g => g.id === guardiaSeleccionado)?.nombre_completo || 'Guardia'}
          asignacionActual={asignacionActual}
          nuevaInstalacionNombre={instalacionNombre}
          nuevoRolServicioNombre={rolServicioNombre}
        />
      )}

      {/* Modal de fecha de inicio de asignación */}
      <ModalFechaInicioAsignacion
        isOpen={modalFechaInicio.isOpen}
        onClose={() => {
          console.log('🔍 Cerrando modal de fecha inicio en AsignarGuardiaDropdown');
          setModalFechaInicio({
            isOpen: false,
            guardiaId: '',
            guardiaNombre: '',
            guardiaInstalacionActual: '',
            ppcId: '',
            instalacionNombre: '',
            rolServicioNombre: ''
          });
        }}
        onConfirmar={handleConfirmarAsignacionConFecha}
        guardiaNombre={modalFechaInicio.guardiaNombre}
        guardiaInstalacionActual={modalFechaInicio.guardiaInstalacionActual}
        nuevaInstalacionNombre={modalFechaInicio.instalacionNombre}
        nuevoRolServicioNombre={modalFechaInicio.rolServicioNombre}
        esReasignacion={!!modalFechaInicio.guardiaInstalacionActual}
      />
    </>
  );
} 