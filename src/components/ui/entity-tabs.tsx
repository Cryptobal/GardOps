"use client";

import React, { useState } from "react";
import { motion } from "framer-motion";
import { Button } from "./button";
import { LucideIcon } from "lucide-react";

export interface TabConfig {
  key: string;
  label: string;
  icon: LucideIcon;
  color: 'blue' | 'emerald' | 'amber' | 'violet' | 'red' | 'slate';
  content: React.ReactNode;
  disabled?: boolean;
}

export interface EntityTabsProps {
  tabs: TabConfig[];
  defaultTab?: string;
  showActionButtons?: boolean;
  onCancel?: () => void;
  onSave?: () => void;
  onEdit?: () => void;
  isReadOnly?: boolean;
  className?: string;
}

export function EntityTabs({
  tabs,
  defaultTab,
  showActionButtons = false,
  onCancel,
  onSave,
  onEdit,
  isReadOnly = false,
  className = ""
}: EntityTabsProps) {
  const [activeTab, setActiveTab] = useState(defaultTab || tabs[0]?.key || "");

  const colorClasses = {
    blue: 'data-[state=active]:bg-blue-600/20 data-[state=active]:text-blue-300 data-[state=active]:border-blue-500/30',
    emerald: 'data-[state=active]:bg-emerald-600/20 data-[state=active]:text-emerald-300 data-[state=active]:border-emerald-500/30',
    amber: 'data-[state=active]:bg-amber-600/20 data-[state=active]:text-amber-300 data-[state=active]:border-amber-500/30',
    violet: 'data-[state=active]:bg-violet-600/20 data-[state=active]:text-violet-300 data-[state=active]:border-violet-500/30',
    red: 'data-[state=active]:bg-red-600/20 data-[state=active]:text-red-300 data-[state=active]:border-red-500/30',
    slate: 'data-[state=active]:bg-slate-600/20 data-[state=active]:text-slate-300 data-[state=active]:border-slate-500/30'
  };

  const activeTabContent = tabs.find(tab => tab.key === activeTab)?.content;

  return (
    <div className={`space-y-6 h-full ${className}`}>
      {/* Navegación de tabs - Responsive con sistema cromático */}
      <div className="flex flex-wrap gap-1 bg-muted/30 p-1 rounded-lg">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.key;
          const isDisabled = tab.disabled;
          
          return (
            <button
              key={tab.key}
              onClick={() => !isDisabled && setActiveTab(tab.key)}
              disabled={isDisabled}
              className={`
                flex items-center gap-1 sm:gap-2 px-2 sm:px-3 py-2 text-xs sm:text-sm font-medium rounded-md transition-all whitespace-nowrap border border-transparent
                ${
                  isActive
                    ? colorClasses[tab.color]
                    : isDisabled
                      ? 'text-muted-foreground/50 cursor-not-allowed'
                      : 'text-muted-foreground hover:text-white hover:bg-muted/40'
                }
              `}
            >
              <Icon className="h-3 w-3 sm:h-4 sm:w-4" />
              <span className="hidden sm:inline">{tab.label}</span>
              <span className="sm:hidden">{tab.label.charAt(0)}</span>
            </button>
          );
        })}
      </div>

      {/* Contenido de tabs - Con scroll mejorado */}
      <div className="flex-1 overflow-y-auto min-h-0">
        <motion.div
          key={activeTab}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.2 }}
          className="min-h-[400px]"
        >
          {activeTabContent}
        </motion.div>
      </div>

      {/* Footer sticky con botones de acción */}
      {showActionButtons && (
        <div className="sticky z-10 bottom-0 flex justify-end gap-3 px-6 py-4 bg-background/80 backdrop-blur-sm border-t border-muted/30">
          {onCancel && (
            <Button
              variant="outline"
              onClick={onCancel}
            >
              Cancelar
            </Button>
          )}
          {isReadOnly ? (
            onEdit && (
              <Button
                onClick={onEdit}
                className="bg-blue-600 hover:bg-blue-700"
              >
                Editar
              </Button>
            )
          ) : (
            onSave && (
              <Button
                onClick={onSave}
                className="bg-green-600 hover:bg-green-700"
              >
                Guardar cambios
              </Button>
            )
          )}
        </div>
      )}
    </div>
  );
} 