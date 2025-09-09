"use client";

import * as React from "react";
import { Search } from "lucide-react";
import { cn } from "@/lib/utils";

interface StableSearchInputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
  autoFocus?: boolean;
}

const StableSearchInput = React.forwardRef<HTMLInputElement, StableSearchInputProps>(
  ({ value, onChange, placeholder, className, disabled, autoFocus, ...props }, ref) => {
    const inputRef = React.useRef<HTMLInputElement>(null);
    const [isFocused, setIsFocused] = React.useState(false);

    // Manejar el cambio de valor de forma controlada
    const handleChange = React.useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
      e.preventDefault();
      e.stopPropagation();
      onChange(e.target.value);
    }, [onChange]);

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
            "focus:outline-none focus:ring-0 focus:border-0",
            isFocused && "ring-0 border-0"
          )}
          {...props}
        />
      </div>
    );
  }
);

StableSearchInput.displayName = "StableSearchInput";

export { StableSearchInput }; 