import { Authorize, GuardButton, can } from '@/lib/authz-ui'
"use client";

import React, { useState } from "react";
import { motion } from "framer-motion";
import { Button } from "../../../components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../../../components/ui/card";
import { Badge } from "../../../components/ui/badge";
import { Progress } from "../../../components/ui/progress";
import { 
  Calendar, 
  Users, 
  Clock,
  CheckCircle,
  AlertCircle,
  Loader2,
  Info
} from "lucide-react";

interface GenerarPautaModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  instalacion: {
    id: string;
    nombre: string;
    direccion: string;
    cliente_nombre?: string;
  };
  mes: number;
  anio: number;
  puestosOperativos: Array<{
    id: string;
    nombre_puesto: string;
    es_ppc: boolean;
    guardia_id?: string;
    guardia_nombre?: string;
    rol_nombre?: string;
    patron_turno?: string;
  }>;
  loading?: boolean;
}

export default function GenerarPautaModal({
  isOpen,
  onClose,
  onConfirm,
  instalacion,
  mes,
  anio,
  puestosOperativos,
  loading = false
}: GenerarPautaModalProps) {
  const [confirmacion, setConfirmacion] = useState(false);

  if (!isOpen) return null;

  const puestosConGuardia = puestosOperativos.filter(p => p.guardia_id && !p.es_ppc);
  const ppcs = puestosOperativos.filter(p => p.es_ppc);
  const puestosSinAsignar = puestosOperativos.filter(p => !p.guardia_id && !p.es_ppc);

  const diasDelMes = new Date(anio, mes, 0).getDate();
  const nombreMes = new Date(anio, mes - 1, 1).toLocaleDateString('es-ES', { month: 'long' });

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="bg-white dark:bg-gray-900 rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto"
      >
        <Card className="border-0 shadow-none">
          <CardHeader className="pb-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                  <Calendar className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                </div>
                <div>
                  <CardTitle className="text-lg">Generar Pauta Mensual</CardTitle>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    {instalacion.nombre} • {nombreMes} {anio}
                  </p>
                </div>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={onClose}
                disabled={loading}
              >
                ✕
              </Button>
            </div>
          </CardHeader>

          <CardContent className="space-y-6">
            {/* Información de la instalación */}
            <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-2">
                <Info className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                <span className="font-medium text-sm">Información de la Instalación</span>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-gray-600 dark:text-gray-400">Instalación:</span>
                  <p className="font-medium">{instalacion.nombre}</p>
                </div>
                <div>
                  <span className="text-gray-600 dark:text-gray-400">Cliente:</span>
                  <p className="font-medium">{instalacion.cliente_nombre || 'Sin cliente'}</p>
                </div>
                <div>
                  <span className="text-gray-600 dark:text-gray-400">Período:</span>
                  <p className="font-medium">{nombreMes} {anio}</p>
                </div>
                <div>
                  <span className="text-gray-600 dark:text-gray-400">Días:</span>
                  <p className="font-medium">{diasDelMes} días</p>
                </div>
              </div>
            </div>

            {/* Resumen de puestos */}
            <div className="space-y-4">
              <h3 className="font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                <Users className="h-4 w-4" />
                Resumen de Puestos Operativos
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <CheckCircle className="h-4 w-4 text-green-600 dark:text-green-400" />
                    <span className="font-medium text-sm">Con Guardia</span>
                  </div>
                  <p className="text-2xl font-bold text-green-600 dark:text-green-400">
                    {puestosConGuardia.length}
                  </p>
                  <p className="text-xs text-gray-600 dark:text-gray-400">
                    Puestos asignados
                  </p>
                </div>

                <div className="bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800 rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <AlertCircle className="h-4 w-4 text-orange-600 dark:text-orange-400" />
                    <span className="font-medium text-sm">PPCs</span>
                  </div>
                  <p className="text-2xl font-bold text-orange-600 dark:text-orange-400">
                    {ppcs.length}
                  </p>
                  <p className="text-xs text-gray-600 dark:text-gray-400">
                    Puestos pendientes
                  </p>
                </div>

                <div className="bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Clock className="h-4 w-4 text-gray-600 dark:text-gray-400" />
                    <span className="font-medium text-sm">Sin Asignar</span>
                  </div>
                  <p className="text-2xl font-bold text-gray-600 dark:text-gray-400">
                    {puestosSinAsignar.length}
                  </p>
                  <p className="text-xs text-gray-600 dark:text-gray-400">
                    Puestos disponibles
                  </p>
                </div>
              </div>
            </div>

            {/* Lista de puestos con guardia */}
            {puestosConGuardia.length > 0 && (
              <div className="space-y-3">
                <h4 className="font-medium text-gray-900 dark:text-white">Puestos con Guardia Asignado</h4>
                <div className="space-y-2 max-h-40 overflow-y-auto">
                  {puestosConGuardia.map((puesto, index) => (
                    <div key={puesto.id} className="flex items-center justify-between p-3 bg-green-50 dark:bg-green-900/10 border border-green-200 dark:border-green-800 rounded-lg">
                      <div className="flex-1">
                        <p className="font-medium text-sm text-gray-900 dark:text-white">
                          {puesto.nombre_puesto}
                        </p>
                        <p className="text-xs text-gray-600 dark:text-gray-400">
                          {puesto.guardia_nombre}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant="secondary" className="text-xs">
                          {puesto.patron_turno || '4x4'}
                        </Badge>
                        {puesto.rol_nombre && (
                          <Badge variant="outline" className="text-xs">
                            {puesto.rol_nombre}
                          </Badge>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Advertencias */}
            {puestosConGuardia.length === 0 && (
              <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
                <div className="flex items-center gap-2">
                  <AlertCircle className="h-4 w-4 text-yellow-600 dark:text-yellow-400" />
                  <span className="font-medium text-sm text-yellow-800 dark:text-yellow-200">
                    Advertencia
                  </span>
                </div>
                <p className="text-sm text-yellow-700 dark:text-yellow-300 mt-2">
                  No hay puestos con guardia asignado. La pauta se generará solo para PPCs pendientes.
                </p>
              </div>
            )}

            {/* Confirmación */}
            {!confirmacion && (
              <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Info className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                  <span className="font-medium text-sm text-blue-800 dark:text-blue-200">
                    ¿Qué se generará?
                  </span>
                </div>
                <ul className="text-sm text-blue-700 dark:text-blue-300 space-y-1">
                  <li>• {diasDelMes} días de pauta para cada puesto</li>
                  <li>• Patrón de turno aplicado automáticamente</li>
                  <li>• Estados iniciales: trabajado/libre según patrón</li>
                  <li>• Total: {puestosConGuardia.length + ppcs.length} puestos × {diasDelMes} días</li>
                </ul>
              </div>
            )}

            {/* Botones */}
            <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
              <Button
                variant="outline"
                onClick={onClose}
                disabled={loading}
              >
                Cancelar
              </Button>
              <Button
                onClick={() => {
                  if (!confirmacion) {
                    setConfirmacion(true);
                  } else {
                    onConfirm();
                  }
                }}
                disabled={loading || (puestosConGuardia.length === 0 && ppcs.length === 0)}
                className="bg-blue-600 hover:bg-blue-700 text-white"
              >
                {loading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Generando...
                  </>
                ) : !confirmacion ? (
                  <>
                    <Calendar className="h-4 w-4 mr-2" />
                    Generar Pauta
                  </>
                ) : (
                  <>
                    <CheckCircle className="h-4 w-4 mr-2" />
                    Confirmar Generación
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
} 