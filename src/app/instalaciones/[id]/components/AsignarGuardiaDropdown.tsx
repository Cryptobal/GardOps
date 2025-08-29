'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { GuardiaSearchModal } from '@/components/ui/guardia-search-modal';
import { useToast } from '@/components/ui/toast';
import { UserPlus } from 'lucide-react';
import { asignarGuardiaPPC } from '@/lib/api/instalaciones';

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
      console.error('Error cargando guardias:', error);
      toast.error('No se pudieron cargar los guardias', 'Error');
    } finally {
      setCargandoGuardias(false);
    }
  };

  const handleSelectGuardia = async (guardiaId: string) => {
    try {
      setLoading(true);
      await asignarGuardiaPPC(instalacionId, ppcId, guardiaId);
      
      toast.success('Guardia asignado correctamente', 'Éxito');
      onAsignacionCompletada();
      setModalOpen(false);
    } catch (error) {
      console.error('Error asignando guardia:', error);
      toast.error('No se pudo asignar el guardia', 'Error');
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
      />
    </>
  );
} 