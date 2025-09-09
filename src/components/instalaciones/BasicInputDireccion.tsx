'use client';

import React, { useState, useRef, useEffect } from 'react';
import { MapPin, Loader2, X } from 'lucide-react';
import { Input } from '../ui/input';
import { Button } from '../ui/button';
import { cn } from '../../lib/utils';

export interface BasicInputDireccionProps {
  placeholder?: string;
  className?: string;
  onAddressSelect?: (address: any) => void;
  onAddressChange?: (query: string) => void;
  value?: string;
  defaultValue?: string;
  required?: boolean;
  disabled?: boolean;
  name?: string;
  id?: string;
}

const BasicInputDireccion = React.forwardRef<HTMLInputElement, BasicInputDireccionProps>(
  ({ 
    placeholder = "Buscar dirección...",
    className,
    onAddressSelect,
    onAddressChange,
    value,
    defaultValue = "",
    required = false,
    disabled = false,
    name = "direccion",
    id,
    ...props 
  }, ref) => {
    const [inputValue, setInputValue] = useState(value || defaultValue);
    
    const inputRef = useRef<HTMLInputElement>(null);

    // Manejar cambios en el input
    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const newValue = e.target.value;
      setInputValue(newValue);
      onAddressChange?.(newValue);
    };

    // Limpiar dirección
    const handleClear = (e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setInputValue("");
      onAddressChange?.("");
      inputRef.current?.focus();
    };

    // Sincronizar con value externo
    useEffect(() => {
      if (value !== undefined) {
        setInputValue(value);
      }
    }, [value]);

    return (
      <div className={cn("relative w-full", className)}>
        {/* Input principal */}
        <div className="relative">
          <MapPin className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          
          <Input
            ref={inputRef}
            type="text"
            value={inputValue}
            onChange={handleInputChange}
            placeholder={placeholder}
            disabled={disabled}
            required={required}
            name={name}
            id={id}
            className={cn(
              "pl-10 pr-10",
              className
            )}
            autoComplete="off"
            onFocus={(e) => e.stopPropagation()}
            onBlur={(e) => e.stopPropagation()}
            onClick={(e) => e.stopPropagation()}
            {...props}
          />

          {/* Botón limpiar */}
          {inputValue && (
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="absolute right-1 top-1/2 transform -translate-y-1/2 h-8 w-8"
              onClick={handleClear}
              onMouseDown={(e) => e.stopPropagation()}
            >
              <X className="h-3 w-3" />
            </Button>
          )}
        </div>
      </div>
    );
  }
);

BasicInputDireccion.displayName = 'BasicInputDireccion';

export default BasicInputDireccion; 