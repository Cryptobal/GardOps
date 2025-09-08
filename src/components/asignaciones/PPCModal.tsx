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
  nombre_puesto: string;
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
      
      // Primero, obtener todas las instalaciones con PPCs activos
      const instalacionesResponse = await fetch('/api/instalaciones-con-ppc-activos');
      const instalacionesData = await instalacionesResponse.json();
      
      if (!Array.isArray(instalacionesData)) {
        console.error('Error: instalaciones-con-ppc-activos no devolvió un array');
        setPpcs([]);
        return;
      }
      
      // Buscar PPCs para todas las instalaciones que tengan PPCs
      let todosLosPPCs: PPC[] = [];
      
      for (const instalacion of instalacionesData) {
        try {
          const response = await fetch(`/api/instalaciones/${instalacion.id}/ppcs`);
          const data = await response.json();
          
          if (data.success && Array.isArray(data.data)) {
            todosLosPPCs = [...todosLosPPCs, ...data.data];
          }
        } catch (error) {
          console.error(`Error cargando PPCs para instalación ${instalacion.id}:`, error);
        }
      }
      
      console.log(`✅ PPCs encontrados: ${todosLosPPCs.length}`);
      setPpcs(todosLosPPCs);
      
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
      console.log('🔍 Enviando asignación:', {
        guardia_id: guardia.id,
        instalacion_id: ppc.instalacion_id, // Usar la instalación del PPC, no del dropdown
        ppc_id: ppc.id,
        fecha: new Date().toISOString().split('T')[0],
        motivo: `Asignación optimizada - PPC: ${ppc.rol_nombre}, Distancia: ${guardia.distancia.toFixed(1)}km`
      });
      
      const response = await fetch('/api/asignaciones/crear', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          guardia_id: guardia.id,
          instalacion_id: ppc.instalacion_id, // Usar la instalación del PPC, no del dropdown
          ppc_id: ppc.id,
          fecha: new Date().toISOString().split('T')[0],
          motivo: `Asignación optimizada - PPC: ${ppc.rol_nombre}, Distancia: ${guardia.distancia.toFixed(1)}km`
        })
      });

      console.log('📡 Respuesta del servidor:', {
        status: response.status,
        statusText: response.statusText,
        url: response.url
      });

      let data;
      try {
        data = await response.json();
      } catch (jsonError) {
        console.error('Error parsing JSON response:', jsonError);
        throw new Error(`Error del servidor (${response.status}): ${response.statusText}`);
      }

      if (data && data.success) {
        toast.success(
          `${guardia.nombre} asignado a ${ppc.rol_nombre} en ${ppc.instalacion_nombre}`, 
          '✅ Asignación exitosa'
        );
        onAsignacionExitosa();
        onClose();
      } else {
        const errorMessage = data?.error || `Error del servidor (${response.status}): ${response.statusText}`;
        toast.error(errorMessage, "Error en asignación");
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

          {/* Lista de PPCs */}
          <div>
            <h3 className="font-medium mb-3 text-gray-900 dark:text-gray-100">Puestos Pendientes por Cubrir (PPCs)</h3>
            
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-6 h-6 animate-spin mr-2 text-gray-600 dark:text-gray-400" />
                <span className="text-gray-600 dark:text-gray-400">Cargando PPCs...</span>
              </div>
            ) : ppcs.length === 0 ? (
              <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                <Clock className="w-8 h-8 mx-auto mb-2 opacity-50" />
                <p>No hay puestos pendientes por cubrir disponibles</p>
              </div>
            ) : (
              <div className="space-y-2 max-h-60 overflow-y-auto">
                {ppcs.map((ppc) => (
                  <div key={ppc.id} className="border border-gray-200 dark:border-gray-700 rounded-lg p-3 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors bg-white dark:bg-gray-900">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <Badge variant="secondary" className="bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200">{ppc.rol_nombre}</Badge>
                          <Badge variant="outline" className="border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300">{ppc.nombre_puesto}</Badge>
                        </div>
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                          {ppc.instalacion_nombre}
                        </p>
                        <p className="text-xs text-gray-500 dark:text-gray-500">
                          Creado: {new Date(ppc.created_at).toLocaleDateString('es-CL')}
                        </p>
                      </div>
                      <Button
                        size="sm"
                        onClick={() => handleAsignarPPC(ppc)}
                        disabled={asignando === ppc.id}
                        className="ml-3 bg-blue-600 hover:bg-blue-700 dark:bg-blue-600 dark:hover:bg-blue-700 text-white"
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
