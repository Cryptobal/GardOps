"use client";

import React, { useState } from "react";
import { Modal, ModalFooter } from "./modal";
import { Button } from "./button";
import { AlertTriangle, Users, Building2, Zap, Shield } from "lucide-react";
import { cn } from "@/lib/utils";

interface ClienteInactivationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (cascada: boolean) => Promise<void>;
  clienteNombre: string;
  canInactivateNormal: boolean;
  canInactivateCascada: boolean;
  blockers?: string[];
  warnings?: string[];
  instalacionesActivas?: number;
  loading?: boolean;
}

export function ClienteInactivationModal({
  isOpen,
  onClose,
  onConfirm,
  clienteNombre,
  canInactivateNormal,
  canInactivateCascada,
  blockers = [],
  warnings = [],
  instalacionesActivas = 0,
  loading = false
}: ClienteInactivationModalProps) {
  const [selectedMode, setSelectedMode] = useState<'normal' | 'cascada' | null>(null);
  const [isConfirming, setIsConfirming] = useState(false);
  
  const hasBlockers = blockers.length > 0;
  const hasWarnings = warnings.length > 0;

  const handleConfirm = async () => {
    if (!selectedMode || hasBlockers) return;
    
    try {
      setIsConfirming(true);
      await onConfirm(selectedMode === 'cascada');
    } catch (error) {
      console.error('Error en inactivación:', error);
    } finally {
      setIsConfirming(false);
    }
  };

  const resetAndClose = () => {
    setSelectedMode(null);
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={resetAndClose}
      size="md"
      className="bg-card/95 backdrop-blur-md border-orange-500/20"
    >
      <div className="space-y-6">
        {/* Header con icono */}
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-orange-500/10 border border-orange-500/20">
            <Users className="w-5 h-5 text-orange-600" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-foreground">
              Inactivar Cliente
            </h3>
            <p className="text-sm text-muted-foreground">
              {clienteNombre}
            </p>
          </div>
        </div>

        {/* Bloqueadores (errores) */}
        {hasBlockers && (
          <div className="p-4 rounded-lg bg-red-500/10 border border-red-500/20">
            <div className="flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-red-600 mt-0.5 flex-shrink-0" />
              <div className="space-y-2">
                <h4 className="font-medium text-red-900 dark:text-red-200">
                  No se puede inactivar
                </h4>
                <ul className="space-y-1 text-sm text-red-800 dark:text-red-300">
                  {blockers.map((blocker, index) => (
                    <li key={index} className="flex items-start gap-2">
                      <span className="text-red-500 mt-1">•</span>
                      <span>{blocker}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        )}

        {/* Opciones de inactivación */}
        {!hasBlockers && (
          <div className="space-y-4">
            <h4 className="font-medium text-foreground">
              Selecciona el método de inactivación:
            </h4>

            {/* Opción Normal */}
            <div 
              className={cn(
                "p-4 rounded-lg border-2 cursor-pointer transition-all",
                canInactivateNormal 
                  ? selectedMode === 'normal' 
                    ? "border-blue-500 bg-blue-50 dark:bg-blue-900/20" 
                    : "border-gray-200 hover:border-blue-300 hover:bg-blue-50/50"
                  : "border-gray-100 bg-gray-50 dark:bg-gray-900/20 cursor-not-allowed opacity-50"
              )}
              onClick={() => canInactivateNormal && setSelectedMode('normal')}
            >
              <div className="flex items-start gap-3">
                <Shield className={cn(
                  "w-5 h-5 mt-0.5",
                  canInactivateNormal ? "text-blue-600" : "text-gray-400"
                )} />
                <div className="flex-1">
                  <h5 className="font-medium text-sm">Inactivación Normal</h5>
                  <p className="text-xs text-muted-foreground mt-1">
                    {canInactivateNormal 
                      ? "Inactiva solo el cliente. Todas las instalaciones ya están inactivas."
                      : `No disponible: ${instalacionesActivas} instalación${instalacionesActivas > 1 ? 'es' : ''} activa${instalacionesActivas > 1 ? 's' : ''}`
                    }
                  </p>
                </div>
              </div>
            </div>

            {/* Opción Cascada */}
            <div 
              className={cn(
                "p-4 rounded-lg border-2 cursor-pointer transition-all",
                canInactivateCascada 
                  ? selectedMode === 'cascada' 
                    ? "border-orange-500 bg-orange-50 dark:bg-orange-900/20" 
                    : "border-gray-200 hover:border-orange-300 hover:bg-orange-50/50"
                  : "border-gray-100 bg-gray-50 dark:bg-gray-900/20 cursor-not-allowed opacity-50"
              )}
              onClick={() => canInactivateCascada && setSelectedMode('cascada')}
            >
              <div className="flex items-start gap-3">
                <Zap className={cn(
                  "w-5 h-5 mt-0.5",
                  canInactivateCascada ? "text-orange-600" : "text-gray-400"
                )} />
                <div className="flex-1">
                  <h5 className="font-medium text-sm">Inactivación en Cascada</h5>
                  <p className="text-xs text-muted-foreground mt-1">
                    {canInactivateCascada 
                      ? `Inactiva el cliente y automáticamente ${instalacionesActivas} instalación${instalacionesActivas > 1 ? 'es' : ''} activa${instalacionesActivas > 1 ? 's' : ''}.`
                      : "No disponible: hay instalaciones con guardias asignados"
                    }
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Advertencias */}
        {hasWarnings && selectedMode && (
          <div className="p-4 rounded-lg bg-yellow-500/10 border border-yellow-500/20">
            <div className="flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-yellow-600 mt-0.5 flex-shrink-0" />
              <div className="space-y-2">
                <h4 className="font-medium text-yellow-900 dark:text-yellow-200">
                  Advertencias
                </h4>
                <ul className="space-y-1 text-sm text-yellow-800 dark:text-yellow-300">
                  {warnings.map((warning, index) => (
                    <li key={index} className="flex items-start gap-2">
                      <span className="text-yellow-500 mt-1">•</span>
                      <span>{warning}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        )}

        {/* Consecuencias */}
        {selectedMode && !hasBlockers && (
          <div className="space-y-2 text-sm text-muted-foreground">
            <h5 className="font-medium text-foreground">Consecuencias:</h5>
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span>🔒</span>
                <span>El cliente no aparecerá en listados operativos</span>
              </div>
              {selectedMode === 'cascada' && instalacionesActivas > 0 && (
                <>
                  <div className="flex items-center gap-2">
                    <span>🏢</span>
                    <span>{instalacionesActivas} instalación{instalacionesActivas > 1 ? 'es' : ''} se inactivará{instalacionesActivas > 1 ? 'n' : ''} automáticamente</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span>📊</span>
                    <span>Las pautas mensuales de esas instalaciones quedarán inactivas</span>
                  </div>
                </>
              )}
              <div className="flex items-center gap-2">
                <span>📋</span>
                <span>Se mantendrá el historial para consulta</span>
              </div>
              <div className="flex items-center gap-2">
                <span>🔄</span>
                <span>Se puede reactivar en el futuro</span>
              </div>
            </div>
          </div>
        )}

        {/* Footer con botones */}
        <ModalFooter>
          <Button
            variant="outline"
            onClick={resetAndClose}
            disabled={isConfirming}
          >
            Cancelar
          </Button>
          
          {!hasBlockers && selectedMode && (
            <Button
              onClick={handleConfirm}
              disabled={isConfirming}
              className={cn(
                "text-white",
                selectedMode === 'normal' 
                  ? "bg-blue-600 hover:bg-blue-700" 
                  : "bg-orange-600 hover:bg-orange-700",
                "disabled:opacity-50 disabled:cursor-not-allowed"
              )}
            >
              {isConfirming ? (
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>Inactivando...</span>
                </div>
              ) : (
                `Inactivar ${selectedMode === 'cascada' ? 'en Cascada' : 'Cliente'}`
              )}
            </Button>
          )}
        </ModalFooter>
      </div>
    </Modal>
  );
}

// Hook personalizado para usar el modal de inactivación de clientes
export function useClienteInactivation() {
  const [isOpen, setIsOpen] = useState(false);
  const [config, setConfig] = useState<{
    clienteNombre: string;
    canInactivateNormal: boolean;
    canInactivateCascada: boolean;
    blockers?: string[];
    warnings?: string[];
    instalacionesActivas?: number;
    onConfirm: (cascada: boolean) => Promise<void>;
  } | null>(null);
  const [loading, setLoading] = useState(false);

  const openModal = (modalConfig: typeof config) => {
    setConfig(modalConfig);
    setIsOpen(true);
  };

  const closeModal = () => {
    setIsOpen(false);
    setConfig(null);
    setLoading(false);
  };

  const handleConfirm = async (cascada: boolean) => {
    if (!config) return;
    
    try {
      setLoading(true);
      await config.onConfirm(cascada);
      closeModal();
    } catch (error) {
      console.error('Error en inactivación:', error);
      setLoading(false);
      throw error;
    }
  };

  const ClienteInactivationModalComponent = () => {
    if (!config) return null;

    return (
      <ClienteInactivationModal
        isOpen={isOpen}
        onClose={closeModal}
        onConfirm={handleConfirm}
        clienteNombre={config.clienteNombre}
        canInactivateNormal={config.canInactivateNormal}
        canInactivateCascada={config.canInactivateCascada}
        blockers={config.blockers}
        warnings={config.warnings}
        instalacionesActivas={config.instalacionesActivas}
        loading={loading}
      />
    );
  };

  return {
    openModal,
    closeModal,
    ClienteInactivationModal: ClienteInactivationModalComponent
  };
}
