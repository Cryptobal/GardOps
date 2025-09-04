"use client";

import React, { useState } from "react";
import { Modal, ModalFooter } from "./modal";
import { Button } from "./button";
import { AlertTriangle, Users, Building2, Calendar, Shield } from "lucide-react";
import { cn } from "@/lib/utils";

interface InactivationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => Promise<void>;
  type: 'instalacion' | 'guardia';
  entityName: string;
  blockers?: string[];
  warnings?: string[];
  loading?: boolean;
}

export function InactivationModal({
  isOpen,
  onClose,
  onConfirm,
  type,
  entityName,
  blockers = [],
  warnings = [],
  loading = false
}: InactivationModalProps) {
  const [isConfirming, setIsConfirming] = useState(false);
  
  const hasBlockers = blockers.length > 0;
  const hasWarnings = warnings.length > 0;
  
  const entityConfig = {
    instalacion: {
      icon: Building2,
      title: "Inactivar Instalación",
      actionText: "Inactivar Instalación",
      description: "Esta acción marcará la instalación como inactiva y:",
      consequences: [
        "🔒 No aparecerá en listados operativos",
        "📊 Las pautas mensuales quedarán inactivas",
        "📋 Se mantendrá el historial para consulta",
        "🔄 Se puede reactivar en el futuro"
      ]
    },
    guardia: {
      icon: Users,
      title: "Inactivar Guardia",
      actionText: "Inactivar Guardia", 
      description: "Esta acción marcará el guardia como inactivo y:",
      consequences: [
        "🔒 No aparecerá en asignaciones nuevas",
        "📊 Se mantendrá su historial laboral",
        "📋 Las pautas anteriores permanecen",
        "🔄 Se puede reactivar en el futuro"
      ]
    }
  };

  const config = entityConfig[type];
  const IconComponent = config.icon;

  const handleConfirm = async () => {
    if (hasBlockers) return;
    
    try {
      setIsConfirming(true);
      await onConfirm();
    } catch (error) {
      console.error('Error en inactivación:', error);
    } finally {
      setIsConfirming(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      size="md"
      className="bg-card/95 backdrop-blur-md border-orange-500/20"
    >
      <div className="space-y-6">
        {/* Header con icono */}
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-orange-500/10 border border-orange-500/20">
            <IconComponent className="w-5 h-5 text-orange-600" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-foreground">
              {config.title}
            </h3>
            <p className="text-sm text-muted-foreground">
              {entityName}
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

        {/* Advertencias */}
        {hasWarnings && !hasBlockers && (
          <div className="p-4 rounded-lg bg-yellow-500/10 border border-yellow-500/20">
            <div className="flex items-start gap-3">
              <Shield className="w-5 h-5 text-yellow-600 mt-0.5 flex-shrink-0" />
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

        {/* Descripción y consecuencias */}
        {!hasBlockers && (
          <div className="space-y-4">
            <p className="text-foreground/80 text-sm leading-relaxed">
              {config.description}
            </p>
            
            <div className="space-y-2">
              {config.consequences.map((consequence, index) => (
                <div key={index} className="flex items-center gap-2 text-sm text-muted-foreground">
                  <span>{consequence}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Footer con botones */}
        <ModalFooter>
          <Button
            variant="outline"
            onClick={onClose}
            disabled={isConfirming}
          >
            Cancelar
          </Button>
          
          {!hasBlockers && (
            <Button
              onClick={handleConfirm}
              disabled={isConfirming}
              className={cn(
                "bg-orange-600 hover:bg-orange-700 text-white",
                "disabled:opacity-50 disabled:cursor-not-allowed"
              )}
            >
              {isConfirming ? (
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>Inactivando...</span>
                </div>
              ) : (
                config.actionText
              )}
            </Button>
          )}
        </ModalFooter>
      </div>
    </Modal>
  );
}

// Hook personalizado para usar el modal de inactivación
export function useInactivationModal() {
  const [isOpen, setIsOpen] = useState(false);
  const [config, setConfig] = useState<{
    type: 'instalacion' | 'guardia';
    entityName: string;
    blockers?: string[];
    warnings?: string[];
    onConfirm: () => Promise<void>;
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

  const handleConfirm = async () => {
    if (!config) return;
    
    try {
      setLoading(true);
      await config.onConfirm();
      closeModal();
    } catch (error) {
      console.error('Error en inactivación:', error);
      setLoading(false);
      throw error;
    }
  };

  const InactivationModalComponent = () => {
    if (!config) return null;

    return (
      <InactivationModal
        isOpen={isOpen}
        onClose={closeModal}
        onConfirm={handleConfirm}
        type={config.type}
        entityName={config.entityName}
        blockers={config.blockers}
        warnings={config.warnings}
        loading={loading}
      />
    );
  };

  return {
    openModal,
    closeModal,
    InactivationModal: InactivationModalComponent
  };
}
