"use client";

import * as React from "react";
import { Search } from "lucide-react";
import { cn } from "@/lib/utils";

interface DebouncedSearchInputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
  autoFocus?: boolean;
  debounceMs?: number;
}

const DebouncedSearchInput = React.forwardRef<HTMLInputElement, DebouncedSearchInputProps>(
  ({ 
    value, 
    onChange, 
    placeholder, 
    className, 
    disabled, 
    autoFocus, 
    debounceMs = 300,
    ...props 
  }, ref) => {
    const inputRef = React.useRef<HTMLInputElement>(null);
    const [internalValue, setInternalValue] = React.useState(value);
    const [isFocused, setIsFocused] = React.useState(false);
    const debounceTimeoutRef = React.useRef<NodeJS.Timeout>();

    // Sincronizar valor interno con prop externo
    React.useEffect(() => {
      setInternalValue(value);
    }, [value]);

    // Limpiar timeout al desmontar
    React.useEffect(() => {
      return () => {
        if (debounceTimeoutRef.current) {
          clearTimeout(debounceTimeoutRef.current);
        }
      };
    }, []);

    // Manejar cambio con debounce
    const handleChange = React.useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
      e.preventDefault();
      e.stopPropagation();
      
      const newValue = e.target.value;
      setInternalValue(newValue);

      // Limpiar timeout anterior
      if (debounceTimeoutRef.current) {
        clearTimeout(debounceTimeoutRef.current);
      }

      // Crear nuevo timeout
      debounceTimeoutRef.current = setTimeout(() => {
        onChange(newValue);
      }, debounceMs);
    }, [onChange, debounceMs]);

    // Manejar eventos de teclado de forma segura
    const handleKeyDown = React.useCallback((e: React.KeyboardEvent<HTMLInputElement>) => {
      // Prevenir que ciertas teclas cierren el dropdown
      if (e.key === 'Enter' || e.key === 'Escape' || e.key === 'Tab') {
        e.preventDefault();
        e.stopPropagation();
      }
    }, []);

    // Manejar focus de forma segura
    const handleFocus = React.useCallback((e: React.FocusEvent<HTMLInputElement>) => {
      e.preventDefault();
      e.stopPropagation();
      setIsFocused(true);
    }, []);

    // Manejar blur de forma segura
    const handleBlur = React.useCallback((e: React.FocusEvent<HTMLInputElement>) => {
      e.preventDefault();
      e.stopPropagation();
      setIsFocused(false);
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
          value={internalValue}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          onFocus={handleFocus}
          onBlur={handleBlur}
          placeholder={placeholder}
          disabled={disabled}
          className={cn(
            "w-full pl-8 h-8 text-xs border-0 focus-visible:ring-0 bg-transparent",
            "placeholder:text-gray-400 text-gray-900 dark:text-gray-100",
            "focus:outline-none focus:ring-0 focus:border-0",
            isFocused && "ring-0 border-0"
          )}
          {...props}
        />
      </div>
    );
  }
);

DebouncedSearchInput.displayName = "DebouncedSearchInput";

export { DebouncedSearchInput }; 