"use client";

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Loader2, X, MapPin, Clock, User } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface PPC {
  id: string;
  instalacion_id: string;
  instalacion_nombre: string;
  rol_nombre: string;
  rol_id: string;
  turno_nombre: string;
  fecha_turno: string;
  created_at: string;
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
  const [loading, setLoading] = useState(false);
  const [asignando, setAsignando] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen && instalacionId) {
      cargarPPCs();
    }
  }, [isOpen, instalacionId]);

  const cargarPPCs = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/instalaciones/${instalacionId}/ppcs`);
      const data = await response.json();

      if (data.success) {
        setPpcs(data.data);
      } else {
        toast.error(data.error || 'Error cargando PPCs', 'Error');
      }
    } catch (error) {
      console.error('Error cargando PPCs:', error);
      toast.error('Error de conexión al cargar PPCs', 'Error');
    } finally {
      setLoading(false);
    }
  };

  const handleAsignarPPC = async (ppc: PPC) => {
    setAsignando(ppc.id);
    
    try {
      const response = await fetch('/api/asignaciones/crear', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          guardia_id: guardia.id,
          instalacion_id: instalacionId,
          ppc_id: ppc.id,
          fecha: new Date().toISOString().split('T')[0],
          motivo: `Asignación optimizada - PPC: ${ppc.rol_nombre}, Distancia: ${guardia.distancia.toFixed(1)}km`
        })
      });

      const data = await response.json();

      if (data.success) {
        toast.success(
          `${guardia.nombre} asignado a ${ppc.rol_nombre} en ${ppc.instalacion_nombre}`, 
          '✅ Asignación exitosa'
        );
        onAsignacionExitosa();
        onClose();
      } else {
        toast.error(data.error || "No se pudo completar la asignación", "Error en asignación");
      }
    } catch (error) {
      console.error('Error asignando PPC:', error);
      toast.error("Error de conexión al asignar", "Error");
    } finally {
      setAsignando(null);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <Card className="w-full max-w-2xl max-h-[80vh] overflow-hidden">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
          <CardTitle className="text-lg font-semibold">
            Asignar {guardia.nombre}
          </CardTitle>
          <Button variant="ghost" size="sm" onClick={onClose}>
            <X className="w-4 h-4" />
          </Button>
        </CardHeader>
        
        <CardContent className="space-y-4">
          {/* Información del guardia */}
          <div className="bg-gray-50 p-3 rounded-lg">
            <div className="flex items-center gap-2 mb-2">
              <User className="w-4 h-4 text-gray-600" />
              <span className="font-medium">{guardia.nombre}</span>
            </div>
            <div className="flex items-center gap-2 mb-1">
              <MapPin className="w-4 h-4 text-gray-600" />
              <span className="text-sm text-gray-600">{guardia.comuna}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-600">Distancia: {guardia.distancia.toFixed(1)} km</span>
            </div>
          </div>

          {/* Lista de PPCs */}
          <div>
            <h3 className="font-medium mb-3">Puestos Pendientes por Cubrir (PPCs)</h3>
            
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-6 h-6 animate-spin mr-2" />
                <span>Cargando PPCs...</span>
              </div>
            ) : ppcs.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <Clock className="w-8 h-8 mx-auto mb-2 opacity-50" />
                <p>No hay puestos pendientes por cubrir en esta instalación</p>
              </div>
            ) : (
              <div className="space-y-2 max-h-60 overflow-y-auto">
                {ppcs.map((ppc) => (
                  <div key={ppc.id} className="border rounded-lg p-3 hover:bg-gray-50 transition-colors">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <Badge variant="secondary">{ppc.rol_nombre}</Badge>
                          {ppc.turno_nombre && (
                            <Badge variant="outline">{ppc.turno_nombre}</Badge>
                          )}
                        </div>
                        <p className="text-sm text-gray-600">
                          {ppc.instalacion_nombre}
                        </p>
                        {ppc.fecha_turno && (
                          <p className="text-xs text-gray-500">
                            Fecha: {new Date(ppc.fecha_turno).toLocaleDateString('es-CL')}
                          </p>
                        )}
                      </div>
                      <Button
                        size="sm"
                        onClick={() => handleAsignarPPC(ppc)}
                        disabled={asignando === ppc.id}
                        className="ml-3"
                      >
                        {asignando === ppc.id ? (
                          <>
                            <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                            Asignando...
                          </>
                        ) : (
                          'Asignar'
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
    </div>
  );
}
