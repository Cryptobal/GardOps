"use client";

import { logger, devLogger, apiLogger } from '@/lib/utils/logger';

import * as React from "react";
import { Input } from "./input";

interface SafeFilterInputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
}

const SafeFilterInput = React.forwardRef<HTMLInputElement, SafeFilterInputProps>(
  ({ value, onChange, placeholder, className, disabled, ...props }, ref) => {
    const [internalValue, setInternalValue] = React.useState(value);
    const [hasError, setHasError] = React.useState(false);

    // Sincronizar valor interno con prop externo
    React.useEffect(() => {
      setInternalValue(value);
    }, [value]);

    const handleChange = React.useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
      try {
        const newValue = e.target.value;
        setInternalValue(newValue);
        onChange(newValue);
        setHasError(false);
      } catch (error) {
        logger.warn('Error en SafeFilterInput change:', error);
        setHasError(true);
        // En caso de error, limpiar el valor
        setInternalValue('');
        onChange('');
      }
    }, [onChange]);

    const handleKeyDown = React.useCallback((e: React.KeyboardEvent<HTMLInputElement>) => {
      try {
        // Prevenir que el Enter cierre el select
        if (e.key === 'Enter') {
          e.preventDefault();
          e.stopPropagation();
        }
        // Prevenir que Escape cause problemas
        if (e.key === 'Escape') {
          e.preventDefault();
          e.stopPropagation();
        }
      } catch (error) {
        logger.warn('Error en SafeFilterInput keydown:', error);
      }
    }, []);

    const handleFocus = React.useCallback((e: React.FocusEvent<HTMLInputElement>) => {
      try {
        // Prevenir problemas de focus
        e.stopPropagation();
        setHasError(false);
      } catch (error) {
        logger.warn('Error en SafeFilterInput focus:', error);
      }
    }, []);

    const handleBlur = React.useCallback((e: React.FocusEvent<HTMLInputElement>) => {
      try {
        // Manejar blur de forma segura
        e.stopPropagation();
      } catch (error) {
        logger.warn('Error en SafeFilterInput blur:', error);
      }
    }, []);

    // Si hay error persistente, mostrar un input simple
    if (hasError) {
      return (
        <input
          type="text"
          value={internalValue}
          onChange={handleChange}
          placeholder={placeholder}
          className={className}
          disabled={disabled}
          onKeyDown={handleKeyDown}
          onFocus={handleFocus}
          onBlur={handleBlur}
          {...props}
        />
      );
    }

    return (
      <Input
        ref={ref}
        value={internalValue}
        onChange={handleChange}
        placeholder={placeholder}
        className={className}
        disabled={disabled}
        onKeyDown={handleKeyDown}
        onFocus={handleFocus}
        onBlur={handleBlur}
        {...props}
      />
    );
  }
);

SafeFilterInput.displayName = "SafeFilterInput";

export { SafeFilterInput }; 