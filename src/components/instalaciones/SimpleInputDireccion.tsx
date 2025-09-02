'use client';

import React, { useState, useRef, useEffect } from 'react';
import { MapPin, Loader2, X } from 'lucide-react';
import { Input } from '../ui/input';
import { Button } from '../ui/button';
import { cn } from '../../lib/utils';
import { useAddressAutocomplete, type AddressData, type AddressSuggestion } from '../../lib/useAddressAutocomplete';

export interface SimpleInputDireccionProps {
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

const SimpleInputDireccion = React.forwardRef<HTMLInputElement, SimpleInputDireccionProps>(
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
    const [showSuggestions, setShowSuggestions] = useState(false);
    const [isInputFocused, setIsInputFocused] = useState(false);
    
    const inputRef = useRef<HTMLInputElement>(null);
    const suggestionsRef = useRef<HTMLDivElement>(null);
    const timeoutRef = useRef<NodeJS.Timeout>();

    const {
      isLoaded,
      suggestions,
      isLoading,
      selectedAddress,
      searchAddresses,
      selectAddress,
      clearSelection,
    } = useAddressAutocomplete();

    // Manejar cambios en el input
    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const newValue = e.target.value;
      setInputValue(newValue);
      onAddressChange?.(newValue);

      // Debounce para búsqueda
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }

      timeoutRef.current = setTimeout(() => {
        if (newValue.length >= 3) {
          searchAddresses(newValue);
          setShowSuggestions(true);
        } else {
          setShowSuggestions(false);
        }
      }, 300);
    };

    // Manejar selección de sugerencia
    const handleSuggestionSelect = async (suggestion: AddressSuggestion) => {
      try {
        const addressData = await selectAddress(suggestion.placeId);
        if (addressData) {
          setInputValue(addressData.direccionCompleta);
          setShowSuggestions(false);
          onAddressSelect?.(addressData);
          onAddressChange?.(addressData.direccionCompleta);
        } else {
          console.warn('No se pudo obtener detalles de la dirección seleccionada');
          // Mantener la sugerencia seleccionada en el input
          setInputValue(suggestion.direccionPrincipal);
          onAddressChange?.(suggestion.direccionPrincipal);
        }
      } catch (error) {
        console.error('Error al seleccionar dirección:', error);
        // En caso de error, usar la descripción de la sugerencia
        setInputValue(suggestion.descripcion);
        onAddressChange?.(suggestion.descripcion);
      }
    };

    // Manejar focus y blur
    const handleInputFocus = () => {
      setIsInputFocused(true);
      if (suggestions.length > 0) {
        setShowSuggestions(true);
      }
    };

    const handleInputBlur = (e: React.FocusEvent) => {
      // Prevenir que el blur cierre las sugerencias inmediatamente
      e.preventDefault();
      setIsInputFocused(false);
      // Delay más largo para permitir clicks en sugerencias
      setTimeout(() => {
        setShowSuggestions(false);
      }, 300);
    };

    // Limpiar dirección
    const handleClear = () => {
      setInputValue("");
      clearSelection();
      setShowSuggestions(false);
      onAddressChange?.("");
      inputRef.current?.focus();
    };

    // Sincronizar con value externo
    useEffect(() => {
      if (value !== undefined) {
        setInputValue(value);
      }
    }, [value]);

    // Cleanup timeout
    useEffect(() => {
      return () => {
        if (timeoutRef.current) {
          clearTimeout(timeoutRef.current);
        }
      };
    }, []);

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
            onFocus={handleInputFocus}
            onBlur={handleInputBlur}
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
            {...props}
          />

          {/* Indicador de carga */}
          {isLoading && (
            <Loader2 className="absolute right-8 top-1/2 transform -translate-y-1/2 h-4 w-4 animate-spin text-muted-foreground" />
          )}

          {/* Botón limpiar */}
          {inputValue && !isLoading && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="absolute right-1 top-1/2 transform -translate-y-1/2 h-8 w-8 p-0 hover:bg-muted/50"
              onClick={handleClear}
            >
              <X className="h-3 w-3" />
            </Button>
          )}
        </div>

        {/* Mensaje cuando Google Maps no está disponible */}
        {!isLoaded && (
          <div className="mt-2 text-xs text-amber-500 bg-amber-500/10 p-2 rounded-md border border-amber-500/20">
            ⚠️ Google Maps no está disponible. Puedes escribir la dirección manualmente.
          </div>
        )}

        {/* Lista de sugerencias */}
        {showSuggestions && suggestions.length > 0 && (
          <div
            ref={suggestionsRef}
            className="absolute top-full left-0 right-0 z-50 mt-1 bg-background border border-border rounded-md shadow-lg max-h-60 overflow-auto"
          >
            {suggestions.map((suggestion, index) => (
              <button
                key={suggestion.placeId}
                type="button"
                className="w-full px-4 py-3 text-left hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground focus:outline-none border-b border-border last:border-b-0"
                onClick={() => handleSuggestionSelect(suggestion)}
              >
                <div className="font-medium">{suggestion.direccionPrincipal}</div>
                {suggestion.direccionSecundaria && (
                  <div className="text-sm text-muted-foreground">{suggestion.direccionSecundaria}</div>
                )}
              </button>
            ))}
          </div>
        )}

        {/* Mensaje cuando no hay sugerencias */}
        {showSuggestions && suggestions.length === 0 && inputValue.length >= 3 && !isLoading && isLoaded && (
          <div className="absolute top-full left-0 right-0 z-50 mt-1 bg-background border border-border rounded-md shadow-lg p-4 text-center">
            <p className="text-sm text-muted-foreground">No se encontraron direcciones para "{inputValue}"</p>
            <p className="text-xs text-muted-foreground mt-1">Intenta con una dirección más específica</p>
          </div>
        )}
      </div>
    );
  }
);

SimpleInputDireccion.displayName = 'SimpleInputDireccion';

export default SimpleInputDireccion; 