"use client";

import React, { useState } from "react";
import { useConfirmModal } from "./modal";
import { AlertTriangle, Building2, Users } from "lucide-react";

interface ConfirmInactivationOptions {
  type: 'instalacion' | 'guardia';
  entityName: string;
  onConfirm: () => Promise<void>;
  blockers?: string[];
  warnings?: string[];
}

export function useConfirmInactivation() {
  const { confirm, ConfirmModal } = useConfirmModal();

  const confirmInactivation = async ({
    type,
    entityName,
    onConfirm,
    blockers = [],
    warnings = []
  }: ConfirmInactivationOptions) => {
    console.log('🔍 confirmInactivation llamado con:', { type, entityName, blockers, warnings });
    const hasBlockers = blockers.length > 0;
    const hasWarnings = warnings.length > 0;

    const entityConfig = {
      instalacion: {
        icon: "🏢",
        title: "Inactivar Instalación",
        verb: "inactivar",
        article: "la instalación"
      },
      guardia: {
        icon: "👮",
        title: "Inactivar Guardia", 
        verb: "inactivar",
        article: "el guardia"
      }
    };

    const config = entityConfig[type];

    // Si hay bloqueadores, mostrar modal de error
    if (hasBlockers) {
      const blockersText = blockers.map(b => `• ${b}`).join('\n');
      
      return confirm({
        type: "danger",
        title: `No se puede ${config.verb} ${config.article}`,
        message: `**${entityName}**\n\nNo es posible inactivar debido a:\n\n${blockersText}`,
        confirmText: "Entendido",
        cancelText: "",
        onConfirm: () => Promise.resolve()
      });
    }

    // Modal de confirmación normal
    let message = `${config.icon} **${entityName}**\n\n¿Estás seguro de que deseas ${config.verb} ${config.article}?`;
    
    if (hasWarnings) {
      const warningsText = warnings.map(w => `• ${w}`).join('\n');
      message += `\n\n⚠️ **Advertencias:**\n${warningsText}`;
    }

    message += `\n\n✅ Esta acción se puede revertir en el futuro.`;

    console.log('🔍 confirmInactivation: llamando a confirm con:', { type: "danger", title: config.title, message, confirmText: config.title, cancelText: "Cancelar" });
    
    // Esperar la confirmación del usuario
    const confirmed = await confirm({
      type: "danger",
      title: config.title,
      message,
      confirmText: config.title,
      cancelText: "Cancelar"
    });

    // Si el usuario confirmó, ejecutar la acción
    if (confirmed) {
      console.log('🔍 confirmInactivation: Usuario confirmó, ejecutando onConfirm');
      await onConfirm();
    } else {
      console.log('🔍 confirmInactivation: Usuario canceló');
    }

    return confirmed;
  };

  return {
    confirmInactivation,
    ConfirmModal
  };
}

// Hook simplificado para casos comunes
export function useSimpleInactivation() {
  const { confirmInactivation, ConfirmModal } = useConfirmInactivation();

  const inactivateInstalacion = (name: string, onConfirm: () => Promise<void>, blockers?: string[]) => {
    console.log('🔍 useSimpleInactivation: inactivateInstalacion llamado con:', name);
    return confirmInactivation({
      type: 'instalacion',
      entityName: name,
      onConfirm,
      blockers
    });
  };

  const inactivateGuardia = (name: string, onConfirm: () => Promise<void>, blockers?: string[]) => {
    console.log('🔍 useSimpleInactivation: inactivateGuardia llamado con:', name);
    return confirmInactivation({
      type: 'guardia', 
      entityName: name,
      onConfirm,
      blockers
    });
  };

  return {
    inactivateInstalacion,
    inactivateGuardia,
    ConfirmModal
  };
}
