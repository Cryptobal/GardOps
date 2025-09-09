"use client";

import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "./card";
import { Button } from "./button";
import { Checkbox } from "./checkbox";
import { Badge } from "./badge";
import { 
  Calendar, 
  Building2, 
  Copy,
  CheckCircle,
  AlertCircle,
  Loader2,
  X,
  RefreshCw,
  Info
} from "lucide-react";
import { obtenerInstalacionesMesAnterior, replicarPautasMesAnterior } from "@/lib/api/pauta-mensual";

interface InstalacionMesAnterior {
  instalacion_id: string;
  instalacion_nombre: string;
  direccion: string;
  cliente_nombre?: string;
  puestos_con_pauta: number;
  total_puestos: number;
}

interface ReplicarPautaModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  anio: number;
  mes: number;
}

export default function ReplicarPautaModal({ 
  isOpen, 
  onClose, 
  onSuccess, 
  anio, 
  mes 
}: ReplicarPautaModalProps) {
  const [instalaciones, setInstalaciones] = useState<InstalacionMesAnterior[]>([]);
  const [selectedInstalaciones, setSelectedInstalaciones] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);
  const [replicando, setReplicando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Calcular mes anterior
  const mesAnterior = mes === 1 ? 12 : mes - 1;
  const anioAnterior = mes === 1 ? anio - 1 : anio;

  // Cargar instalaciones del mes anterior
  const cargarInstalaciones = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await obtenerInstalacionesMesAnterior(anio, mes);
      
      if (response.success) {
        setInstalaciones(response.instalaciones);
        // Seleccionar todas por defecto
        setSelectedInstalaciones(new Set(response.instalaciones.map((i: any) => i.instalacion_id)));
      } else {
        setError('No se pudieron cargar las instalaciones del mes anterior');
      }
    } catch (error: any) {
      setError(error.message || 'Error al cargar instalaciones del mes anterior');
    } finally {
      setLoading(false);
    }
  };

  // Cargar instalaciones cuando se abre el modal
  useEffect(() => {
    if (isOpen) {
      cargarInstalaciones();
    }
  }, [isOpen, anio, mes]);

  // Manejar selección de instalaciones
  const toggleInstalacion = (instalacionId: string) => {
    const newSelected = new Set(selectedInstalaciones);
    if (newSelected.has(instalacionId)) {
      newSelected.delete(instalacionId);
    } else {
      newSelected.add(instalacionId);
    }
    setSelectedInstalaciones(newSelected);
  };

  // Seleccionar todas
  const selectAll = () => {
    setSelectedInstalaciones(new Set(instalaciones.map(i => i.instalacion_id)));
  };

  // Deseleccionar todas
  const deselectAll = () => {
    setSelectedInstalaciones(new Set());
  };

  // Replicar pautas
  const handleReplicar = async () => {
    if (selectedInstalaciones.size === 0) {
      setError('Debes seleccionar al menos una instalación');
      return;
    }

    setReplicando(true);
    setError(null);
    setSuccess(null);

    try {
      const instalacionesIds = Array.from(selectedInstalaciones);
      const response = await replicarPautasMesAnterior(anio, mes, instalacionesIds);
      
      if (response.success) {
        setSuccess(`✅ Pautas replicadas exitosamente: ${response.total_replicados} días replicados en ${response.instalaciones_procesadas} instalaciones`);
        
        // Cerrar modal después de 2 segundos
        setTimeout(() => {
          onSuccess();
          onClose();
        }, 2000);
      } else {
        setError('Error al replicar las pautas');
      }
    } catch (error: any) {
      setError(error.message || 'Error al replicar las pautas');
    } finally {
      setReplicando(false);
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.95, opacity: 0 }}
          className="bg-white dark:bg-gray-900 rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <CardHeader className="border-b bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                  <Copy className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                </div>
                <div>
                  <CardTitle className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                    Replicar Pautas del Mes Anterior
                  </CardTitle>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    De {mesAnterior}/{anioAnterior} a {mes}/{anio}
                  </p>
                </div>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={onClose}
                className="h-8 w-8 p-0"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </CardHeader>

          {/* Content */}
          <CardContent className="p-6 space-y-4">
            {/* Info Banner */}
            <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <Info className="h-5 w-5 text-blue-600 dark:text-blue-400 mt-0.5 flex-shrink-0" />
                <div className="text-sm text-blue-800 dark:text-blue-200">
                  <p className="font-medium mb-1">¿Qué hace esta función?</p>
                  <ul className="space-y-1 text-xs">
                    <li>• Replica las pautas del mes anterior manteniendo las series de turnos</li>
                    <li>• Preserva la continuidad de los ciclos (4x4, 5x2, 6x1, etc.)</li>
                    <li>• Solo replica instalaciones que ya tienen pauta del mes anterior</li>
                    <li>• No sobrescribe pautas existentes del mes actual</li>
                  </ul>
                </div>
              </div>
            </div>

            {/* Error/Success Messages */}
            {error && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4"
              >
                <div className="flex items-center gap-2">
                  <AlertCircle className="h-4 w-4 text-red-600" />
                  <span className="text-sm text-red-800 dark:text-red-200">{error}</span>
                </div>
              </motion.div>
            )}

            {success && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4"
              >
                <div className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-green-600" />
                  <span className="text-sm text-green-800 dark:text-green-200">{success}</span>
                </div>
              </motion.div>
            )}

            {/* Loading State */}
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-blue-600" />
                <span className="ml-2 text-sm text-gray-600 dark:text-gray-400">
                  Cargando instalaciones del mes anterior...
                </span>
              </div>
            ) : (
              <>
                {/* Selection Controls */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                      Instalaciones disponibles ({instalaciones.length})
                    </span>
                    <Badge variant="secondary" className="text-xs">
                      {selectedInstalaciones.size} seleccionadas
                    </Badge>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={selectAll}
                      disabled={selectedInstalaciones.size === instalaciones.length}
                    >
                      Seleccionar todas
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={deselectAll}
                      disabled={selectedInstalaciones.size === 0}
                    >
                      Deseleccionar todas
                    </Button>
                  </div>
                </div>

                {/* Installations List */}
                <div className="max-h-96 overflow-y-auto space-y-2 border rounded-lg p-4">
                  {instalaciones.length === 0 ? (
                    <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                      <Calendar className="h-8 w-8 mx-auto mb-2 opacity-50" />
                      <p className="text-sm">No hay instalaciones con pauta del mes anterior</p>
                      <p className="text-xs mt-1">
                        Solo se muestran instalaciones que ya tienen pauta en {mesAnterior}/{anioAnterior}
                      </p>
                    </div>
                  ) : (
                    instalaciones.map((instalacion) => (
                      <motion.div
                        key={instalacion.instalacion_id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className={`flex items-center gap-3 p-3 rounded-lg border transition-colors ${
                          selectedInstalaciones.has(instalacion.instalacion_id)
                            ? 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800'
                            : 'bg-gray-50 dark:bg-gray-800/50 border-gray-200 dark:border-gray-700'
                        }`}
                      >
                        <Checkbox
                          checked={selectedInstalaciones.has(instalacion.instalacion_id)}
                          onCheckedChange={() => toggleInstalacion(instalacion.instalacion_id)}
                        />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <Building2 className="h-4 w-4 text-gray-500" />
                            <h4 className="font-medium text-sm text-gray-900 dark:text-gray-100 truncate">
                              {instalacion.instalacion_nombre}
                            </h4>
                          </div>
                          {instalacion.cliente_nombre && (
                            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                              Cliente: {instalacion.cliente_nombre}
                            </p>
                          )}
                          <div className="flex items-center gap-2 mt-2">
                            <Badge variant="outline" className="text-xs">
                              {instalacion.puestos_con_pauta} puestos con pauta
                            </Badge>
                            <Badge variant="secondary" className="text-xs">
                              {instalacion.total_puestos} total
                            </Badge>
                          </div>
                        </div>
                      </motion.div>
                    ))
                  )}
                </div>
              </>
            )}
          </CardContent>

          {/* Footer */}
          <div className="border-t bg-gray-50 dark:bg-gray-800/50 px-6 py-4 flex items-center justify-between">
            <div className="text-sm text-gray-600 dark:text-gray-400">
              {selectedInstalaciones.size > 0 && (
                <span>
                  Se replicarán pautas para {selectedInstalaciones.size} instalación{selectedInstalaciones.size !== 1 ? 'es' : ''}
                </span>
              )}
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={onClose}
                disabled={replicando}
              >
                Cancelar
              </Button>
              <Button
                onClick={handleReplicar}
                disabled={replicando || selectedInstalaciones.size === 0}
                className="bg-blue-600 hover:bg-blue-700"
              >
                {replicando ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    Replicando...
                  </>
                ) : (
                  <>
                    <Copy className="h-4 w-4 mr-2" />
                    Replicar Pautas
                  </>
                )}
              </Button>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
