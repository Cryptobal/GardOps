"use client";

import * as React from "react";
import { Search } from "lucide-react";
import { cn } from "@/lib/utils";

interface StandaloneSearchProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
  autoFocus?: boolean;
}

const StandaloneSearch = React.forwardRef<HTMLInputElement, StandaloneSearchProps>(
  ({ value, onChange, placeholder, className, disabled, autoFocus, ...props }, ref) => {
    const inputRef = React.useRef<HTMLInputElement>(null);

    // Manejar cambio de forma completamente independiente
    const handleChange = React.useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
      // Prevenir cualquier propagación de eventos
      e.preventDefault();
      e.stopPropagation();
      e.stopImmediatePropagation();
      
      // Actualizar el valor directamente
      const newValue = e.target.value;
      onChange(newValue);
    }, [onChange]);

    // Manejar eventos de teclado de forma completamente independiente
    const handleKeyDown = React.useCallback((e: React.KeyboardEvent<HTMLInputElement>) => {
      // Prevenir cualquier propagación de eventos
      e.preventDefault();
      e.stopPropagation();
      e.stopImmediatePropagation();
    }, []);

    // Manejar focus de forma completamente independiente
    const handleFocus = React.useCallback((e: React.FocusEvent<HTMLInputElement>) => {
      // Prevenir cualquier propagación de eventos
      e.preventDefault();
      e.stopPropagation();
      e.stopImmediatePropagation();
    }, []);

    // Manejar blur de forma completamente independiente
    const handleBlur = React.useCallback((e: React.FocusEvent<HTMLInputElement>) => {
      // Prevenir cualquier propagación de eventos
      e.preventDefault();
      e.stopPropagation();
      e.stopImmediatePropagation();
    }, []);

    // Auto focus si se solicita
    React.useEffect(() => {
      if (autoFocus && inputRef.current) {
        setTimeout(() => {
          inputRef.current?.focus();
        }, 100);
      }
    }, [autoFocus]);

    return (
      <div className={cn("relative", className)}>
        <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 h-3 w-3 text-gray-400" />
        <input
          ref={inputRef}
          type="text"
          value={value}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          onFocus={handleFocus}
          onBlur={handleBlur}
          placeholder={placeholder}
          disabled={disabled}
          className={cn(
            "w-full pl-8 h-8 text-xs border-0 focus-visible:ring-0 bg-transparent",
            "placeholder:text-gray-400 text-gray-900 dark:text-gray-100",
            "focus:outline-none focus:ring-0 focus:border-0"
          )}
          {...props}
        />
      </div>
    );
  }
);

StandaloneSearch.displayName = "StandaloneSearch";

export { StandaloneSearch }; 