"use client";

import React from "react";
import { CheckCircle, X, User, MapPin, Clock, Calendar, Users } from "lucide-react";
import { Button } from "./button";

interface ModalExitoAsignacionProps {
  isOpen: boolean;
  onClose: () => void;
  guardiaInfo: {
    nombre: string;
    rut?: string;
  };
  ppcInfo: {
    instalacion: string;
    rol: string;
    horario: string;
    fechaInicio?: string; // NUEVO: Fecha de inicio de asignación
  };
}

export default function ModalExitoAsignacion({
  isOpen,
  onClose,
  guardiaInfo,
  ppcInfo
}: ModalExitoAsignacionProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-2 sm:p-4">
      <div className="bg-white dark:bg-gray-800 rounded-xl sm:rounded-2xl shadow-2xl max-w-md w-full mx-2 sm:mx-4 transform transition-all max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-4 sm:p-6 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center space-x-3">
            <div className="w-12 h-12 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center">
              <CheckCircle className="w-6 h-6 text-green-600 dark:text-green-400" />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                ¡Asignación Exitosa!
              </h2>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Guardia asignado correctamente
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-gray-100 dark:bg-gray-700 flex items-center justify-center hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
          >
            <X className="w-4 h-4 text-gray-600 dark:text-gray-300" />
          </button>
        </div>

        {/* Content */}
        <div className="p-4 sm:p-6 space-y-4">
          {/* Guardia Info */}
          <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4">
            <div className="flex items-center space-x-3 mb-2">
              <User className="w-5 h-5 text-blue-600 dark:text-blue-400" />
              <h3 className="font-medium text-blue-900 dark:text-blue-100">
                Guardia Asignado
              </h3>
            </div>
            <p className="text-lg font-semibold text-blue-800 dark:text-blue-200">
              {guardiaInfo.nombre}
            </p>
            {guardiaInfo.rut && (
              <p className="text-sm text-blue-600 dark:text-blue-300">
                RUT: {guardiaInfo.rut}
              </p>
            )}
          </div>

          {/* PPC Info */}
          <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-4">
            <div className="flex items-center space-x-3 mb-3">
              <MapPin className="w-5 h-5 text-green-600 dark:text-green-400" />
              <h3 className="font-medium text-green-900 dark:text-green-100">
                Puesto Asignado
              </h3>
            </div>
            
            <div className="space-y-2">
              <div>
                <span className="text-sm text-green-600 dark:text-green-300 font-medium">
                  Instalación:
                </span>
                <p className="text-green-800 dark:text-green-200 font-semibold">
                  {ppcInfo.instalacion}
                </p>
              </div>
              
              <div>
                <span className="text-sm text-green-600 dark:text-green-300 font-medium">
                  Rol:
                </span>
                <p className="text-green-800 dark:text-green-200">
                  {ppcInfo.rol}
                </p>
              </div>
              
              <div className="flex items-center space-x-2">
                <Clock className="w-4 h-4 text-green-600 dark:text-green-400" />
                <span className="text-sm text-green-600 dark:text-green-300 font-medium">
                  Horario:
                </span>
                <span className="text-green-800 dark:text-green-200">
                  {ppcInfo.horario}
                </span>
              </div>
              
              {/* NUEVO: Fecha de inicio */}
              {ppcInfo.fechaInicio && (
                <div className="flex items-center space-x-2">
                  <div className="w-4 h-4 flex items-center justify-center">
                    <span className="text-green-600 dark:text-green-400 text-sm">📅</span>
                  </div>
                  <span className="text-sm text-green-600 dark:text-green-300 font-medium">
                    Fecha de inicio:
                  </span>
                  <span className="text-green-800 dark:text-green-200 font-semibold">
                    {new Date(ppcInfo.fechaInicio + 'T12:00:00').toLocaleDateString('es-ES', {
                      year: 'numeric',
                      month: 'long', 
                      day: 'numeric'
                    })}
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Success Message */}
          <div className="text-center py-2">
            <p className="text-gray-600 dark:text-gray-300">
              El guardia ha sido asignado exitosamente al puesto. 
              La asignación está activa y visible en el sistema.
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 sm:p-6 border-t border-gray-200 dark:border-gray-700">
          <div className="flex flex-col gap-3">
            {/* Botones de acción - Centrados */}
            <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 justify-center">
              <Button
                variant="outline"
                onClick={() => {
                  window.open('/pauta-diaria/turnos-extras', '_blank');
                }}
                className="flex items-center justify-center gap-2 px-4 py-3 w-full sm:w-auto"
              >
                <Users className="w-4 h-4" />
                Ver Turnos Extras
              </Button>
              
              <Button
                variant="outline"
                onClick={() => {
                  const fechaHoy = new Date().toISOString().split('T')[0];
                  window.open(`/pauta-diaria-v2?fecha=${fechaHoy}`, '_blank');
                }}
                className="flex items-center justify-center gap-2 px-4 py-3 w-full sm:w-auto"
              >
                <Calendar className="w-4 h-4" />
                Ver Pauta Diaria
              </Button>
            </div>
            
            {/* Botón principal - Centrado */}
            <div className="flex justify-center">
              <Button
                onClick={onClose}
                className="bg-green-600 hover:bg-green-700 text-white px-6 py-3 rounded-lg font-medium transition-colors w-full sm:w-auto"
              >
                ¡Perfecto!
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
