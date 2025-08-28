'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { X, MapPin, Building2, Clock, User } from 'lucide-react';

interface AsignacionActiva {
  instalacion_nombre: string;
  instalacion_direccion: string;
  cliente_nombre: string;
  rol_servicio_nombre: string;
  nombre_puesto: string;
  creado_en: string;
}

interface AsignacionActivaModalProps {
  isOpen: boolean;
  onClose: () => void;
  asignacion: AsignacionActiva;
  guardiaNombre: string;
}

export function AsignacionActivaModal({ 
  isOpen, 
  onClose, 
  asignacion, 
  guardiaNombre 
}: AsignacionActivaModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-lg max-w-md w-full mx-4 shadow-2xl">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg flex items-center gap-2 text-gray-900 dark:text-gray-100">
              <User className="h-5 w-5 text-blue-600" />
              Asignación Activa
            </CardTitle>
            <Button
              aria-label="Cerrar"
              variant="ghost"
              size="sm"
              onClick={onClose}
              className="h-8 w-8 p-0 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </CardHeader>
        
        <CardContent className="space-y-4">
          <div className="text-center mb-4">
            <p className="text-sm text-gray-700 dark:text-gray-300 mb-2">
              El guardia <strong className="text-gray-900 dark:text-gray-100">{guardiaNombre}</strong> ya tiene una asignación activa:
            </p>
          </div>

          <div className="space-y-3">
            {/* Instalación */}
            <div className="flex items-start gap-3 p-3 rounded-lg bg-blue-50 dark:bg-blue-950/40">
              <Building2 className="h-5 w-5 text-blue-600 mt-0.5 flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="font-medium text-sm text-blue-900 dark:text-blue-200">
                  {asignacion.instalacion_nombre}
                </p>
                <p className="text-xs text-blue-700 dark:text-blue-300 mt-1">
                  Cliente: {asignacion.cliente_nombre}
                </p>
              </div>
            </div>

            {/* Dirección */}
            <div className="flex items-start gap-3 p-3 rounded-lg bg-gray-50 dark:bg-gray-800">
              <MapPin className="h-5 w-5 text-gray-600 dark:text-gray-300 mt-0.5 flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-sm text-gray-900 dark:text-gray-100">
                  {asignacion.instalacion_direccion}
                </p>
              </div>
            </div>

            {/* Rol de Servicio */}
            <div className="flex items-start gap-3 p-3 rounded-lg bg-green-50 dark:bg-green-950/40">
              <Clock className="h-5 w-5 text-green-600 mt-0.5 flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="font-medium text-sm text-green-900 dark:text-green-200">
                  {asignacion.rol_servicio_nombre}
                </p>
                <p className="text-xs text-green-700 dark:text-green-300 mt-1">
                  Puesto: {asignacion.nombre_puesto}
                </p>
              </div>
            </div>

            {/* Fecha de asignación */}
            <div className="text-center">
              <Badge variant="outline" className="text-xs border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-300">
                Asignado el {new Date(asignacion.creado_en).toLocaleDateString('es-ES', {
                  day: '2-digit',
                  month: '2-digit',
                  year: 'numeric'
                })}
              </Badge>
            </div>
          </div>

          <div className="pt-4 border-t border-gray-200 dark:border-gray-800">
            <Button 
              onClick={onClose} 
              className="w-full"
              variant="outline"
            >
              Entendido
            </Button>
          </div>
        </CardContent>
      </div>
    </div>
  );
}
