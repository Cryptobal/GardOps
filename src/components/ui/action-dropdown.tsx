"use client";

import * as React from "react";
import { MoreVertical, Power } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "./button";

interface ActionDropdownProps {
  isActive: boolean;
  onInactivate: (event?: React.MouseEvent) => void;
  onActivate: (event?: React.MouseEvent) => void;
  entityType?: 'instalacion' | 'guardia' | 'cliente';
}

export function ActionDropdown({ 
  isActive, 
  onInactivate, 
  onActivate,
  entityType = 'instalacion' 
}: ActionDropdownProps) {
  const [isOpen, setIsOpen] = React.useState(false);
  const dropdownRef = React.useRef<HTMLDivElement>(null);

  const handleAction = async (action: () => void | Promise<void>, event?: React.MouseEvent) => {
    if (event) {
      event.stopPropagation();
    }
    setIsOpen(false);
    await action();
  };

  // Cerrar dropdown al hacer click fuera
  React.useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  return (
    <div className="relative" ref={dropdownRef}>
      <Button
        variant="ghost"
        size="sm"
        className="h-8 w-8 p-0 hover:bg-muted"
        onClick={(e) => {
          e.stopPropagation();
          setIsOpen(!isOpen);
        }}
      >
        <MoreVertical className="h-4 w-4 text-muted-foreground" />
      </Button>
      
      {isOpen && (
        <div className="absolute right-0 top-full mt-1 z-50 min-w-[8rem] overflow-hidden rounded-md border bg-popover p-1 text-popover-foreground shadow-md">
          {isActive ? (
            <button
              onClick={async (e) => await handleAction(() => onInactivate(), e)}
              className="w-full flex items-center rounded-sm px-2 py-1.5 text-sm text-orange-600 hover:bg-orange-50 dark:hover:bg-orange-950 transition-colors"
            >
              <Power className="h-4 w-4 mr-2" />
              Inactivar
            </button>
          ) : (
            <button
              onClick={async (e) => await handleAction(() => onActivate(), e)}
              className="w-full flex items-center rounded-sm px-2 py-1.5 text-sm text-green-600 hover:bg-green-50 dark:hover:bg-green-950 transition-colors"
            >
              <Power className="h-4 w-4 mr-2" />
              Activar
            </button>
          )}
        </div>
      )}
    </div>
  );
}
