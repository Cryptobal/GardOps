"use client";

import * as React from "react";
import { useState, useRef, useEffect } from "react";
import { Search, Loader2, X, User, Building2 } from "lucide-react";
import { Input } from "./input";
import { Button } from "./button";
import { cn } from "../../lib/utils";

export interface EntityOption {
  id: string;
  nombre: string;
  apellido?: string;
  rut?: string;
  direccion?: string;
  ciudad?: string;
  comuna?: string;
  email?: string;
  telefono?: string;
  cliente_nombre?: string;
  valor_turno_extra?: number;
  tipo: 'guardia' | 'instalacion';
}

export interface BuscadorEntidadesProps {
  placeholder?: string;
  className?: string;
  onEntitySelect?: (entity: EntityOption) => void;
  onSearchChange?: (query: string) => void;
  value?: string;
  defaultValue?: string;
  required?: boolean;
  disabled?: boolean;
  readOnly?: boolean;
  name?: string;
  id?: string;
  showClearButton?: boolean;
  // Props para controlar qué tipos mostrar
  showGuardias?: boolean;
  showInstalaciones?: boolean;
  // Datos de las entidades
  guardias?: EntityOption[];
  instalaciones?: EntityOption[];
  isLoading?: boolean;
  // Filtros adicionales
  filterByRut?: boolean;
  filterByApellido?: boolean;
}

const BuscadorEntidades = React.forwardRef<HTMLInputElement, BuscadorEntidadesProps>(
  ({ 
    placeholder = "Buscar guardias o instalaciones...",
    className,
    onEntitySelect,
    onSearchChange,
    value,
    defaultValue = "",
    required = false,
    disabled = false,
    readOnly = false,
    name = "buscador",
    id,
    showClearButton = true,
    showGuardias = true,
    showInstalaciones = true,
    guardias = [],
    instalaciones = [],
    isLoading = false,
    filterByRut = true,
    filterByApellido = true,
    ...props 
  }, ref) => {
    const [inputValue, setInputValue] = useState(value || defaultValue);
    const [showSuggestions, setShowSuggestions] = useState(false);
    const [isInputFocused, setIsInputFocused] = useState(false);
    const [filteredOptions, setFilteredOptions] = useState<EntityOption[]>([]);
    
    const inputRef = useRef<HTMLInputElement>(null);
    const suggestionsRef = useRef<HTMLDivElement>(null);
    const timeoutRef = useRef<NodeJS.Timeout>();

    // Combinar todas las opciones disponibles
    const allOptions = React.useMemo(() => {
      const options: EntityOption[] = [];
      
      if (showGuardias && guardias) {
        options.push(...guardias);
      }
      
      if (showInstalaciones && instalaciones) {
        options.push(...instalaciones);
      }
      
      // Debug logs
      console.log('BuscadorEntidades - showGuardias:', showGuardias);
      console.log('BuscadorEntidades - showInstalaciones:', showInstalaciones);
      console.log('BuscadorEntidades - guardias count:', guardias?.length || 0);
      console.log('BuscadorEntidades - instalaciones count:', instalaciones?.length || 0);
      console.log('BuscadorEntidades - allOptions count:', options.length);
      
      return options;
    }, [guardias, instalaciones, showGuardias, showInstalaciones]);

    // Filtrar opciones basado en el input
    const filterOptions = React.useCallback((query: string) => {
      if (!query || query.length < 2) {
        return [];
      }

      const queryLower = query.toLowerCase();
      
      console.log('Filtrando con query:', query);
      console.log('Opciones disponibles:', allOptions.length);
      
      const filtered = allOptions.filter(option => {
        // Para guardias: buscar solo por apellido y RUT
        if (option.tipo === 'guardia') {
          // Buscar por apellido
          if (filterByApellido && option.apellido && option.apellido.toLowerCase().includes(queryLower)) {
            console.log('Coincidencia guardia por apellido:', option.apellido);
            return true;
          }
          
          // Buscar por RUT
          if (filterByRut && option.rut && option.rut.includes(query)) {
            console.log('Coincidencia guardia por RUT:', option.rut);
            return true;
          }
          
          return false;
        }
        
        // Para instalaciones: buscar solo por nombre
        if (option.tipo === 'instalacion') {
          if (option.nombre.toLowerCase().includes(queryLower)) {
            console.log('Coincidencia instalación por nombre:', option.nombre);
            return true;
          }
          
          return false;
        }
        
        return false;
      }).slice(0, 10); // Limitar a 10 resultados
      
      console.log('Resultados filtrados:', filtered.length);
      return filtered;
    }, [allOptions, filterByRut, filterByApellido]);

    // Sincronizar con prop value cuando cambie
    useEffect(() => {
      if (value !== undefined && value !== inputValue) {
        setInputValue(value);
      }
    }, [value]);

    // Manejar cambios en el input
    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const newValue = e.target.value;
      setInputValue(newValue);
      onSearchChange?.(newValue);

      // Debounce para filtrado
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }

      timeoutRef.current = setTimeout(() => {
        const filtered = filterOptions(newValue);
        setFilteredOptions(filtered);
        setShowSuggestions(filtered.length > 0);
      }, 200);
    };

    // Manejar selección de opción
    const handleOptionSelect = (option: EntityOption) => {
      setInputValue(option.nombre);
      setShowSuggestions(false);
      onEntitySelect?.(option);
      onSearchChange?.(option.nombre);
    };

    // Manejar focus y blur
    const handleInputFocus = () => {
      setIsInputFocused(true);
      if (filteredOptions.length > 0) {
        setShowSuggestions(true);
      }
    };

    const handleInputBlur = () => {
      setIsInputFocused(false);
      // Delay para permitir clicks en sugerencias
      setTimeout(() => {
        if (!isInputFocused) {
          setShowSuggestions(false);
        }
      }, 200);
    };

    // Limpiar búsqueda
    const handleClear = () => {
      setInputValue("");
      setFilteredOptions([]);
      setShowSuggestions(false);
      onSearchChange?.("");
      inputRef.current?.focus();
    };

    // Obtener texto de visualización para una opción
    const getDisplayText = (option: EntityOption) => {
      if (option.tipo === 'guardia') {
        return `${option.nombre} ${option.apellido || ''}`.trim();
      }
      return option.nombre;
    };

    // Obtener texto secundario para una opción
    const getSecondaryText = (option: EntityOption) => {
      if (option.tipo === 'guardia') {
        const parts = [];
        if (option.rut) parts.push(`RUT: ${option.rut}`);
        if (option.direccion) parts.push(option.direccion);
        return parts.join(' • ');
      } else {
        const parts = [];
        if (option.cliente_nombre) parts.push(`Cliente: ${option.cliente_nombre}`);
        if (option.direccion) parts.push(option.direccion);
        return parts.join(' • ');
      }
    };

    // Manejar clics fuera del componente
    useEffect(() => {
      const handleClickOutside = (event: MouseEvent) => {
        if (
          suggestionsRef.current &&
          !suggestionsRef.current.contains(event.target as Node) &&
          inputRef.current &&
          !inputRef.current.contains(event.target as Node)
        ) {
          setShowSuggestions(false);
        }
      };

      document.addEventListener("mousedown", handleClickOutside);
      return () => {
        document.removeEventListener("mousedown", handleClickOutside);
      };
    }, []);

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
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          
          <Input
            ref={inputRef}
            type="text"
            value={inputValue}
            onChange={handleInputChange}
            onFocus={readOnly ? undefined : handleInputFocus}
            onBlur={readOnly ? undefined : handleInputBlur}
            placeholder={placeholder}
            disabled={disabled}
            readOnly={readOnly}
            required={required}
            name={name}
            id={id}
            className={cn(
              "pl-10",
              isLoading ? "pr-16" : "pr-10",
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
          {inputValue && !isLoading && showClearButton && (
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="absolute right-1 top-1/2 transform -translate-y-1/2 h-8 w-8"
              onClick={handleClear}
            >
              <X className="h-3 w-3" />
            </Button>
          )}
        </div>

        {/* Lista de sugerencias */}
        {showSuggestions && filteredOptions.length > 0 && (
          <div
            ref={suggestionsRef}
            className="absolute top-full left-0 right-0 z-50 mt-1 bg-background border border-border rounded-md shadow-lg max-h-60 overflow-auto"
          >
            {filteredOptions.map((option, index) => (
              <button
                key={`${option.tipo}-${option.id}`}
                type="button"
                className="w-full px-4 py-3 text-left hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground focus:outline-none border-b border-border last:border-b-0"
                onClick={() => handleOptionSelect(option)}
              >
                <div className="flex items-start gap-3">
                  {option.tipo === 'guardia' ? (
                    <User className="h-4 w-4 mt-0.5 text-blue-500 flex-shrink-0" />
                  ) : (
                    <Building2 className="h-4 w-4 mt-0.5 text-green-500 flex-shrink-0" />
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <div className="font-medium text-sm truncate">
                        {getDisplayText(option)}
                      </div>
                      <span className={cn(
                        "text-xs px-2 py-0.5 rounded-full",
                        option.tipo === 'guardia' 
                          ? "bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300"
                          : "bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300"
                      )}>
                        {option.tipo === 'guardia' ? 'Guardia' : 'Instalación'}
                      </span>
                    </div>
                    {getSecondaryText(option) && (
                      <div className="text-xs text-muted-foreground truncate mt-1">
                        {getSecondaryText(option)}
                      </div>
                    )}
                  </div>
                </div>
              </button>
            ))}
          </div>
        )}

        {/* Estado de carga */}
        {isLoading && !showSuggestions && (
          <div className="absolute top-full left-0 right-0 z-50 mt-1 bg-background border border-border rounded-md shadow-lg p-4">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              Cargando datos...
            </div>
          </div>
        )}
      </div>
    );
  }
);

BuscadorEntidades.displayName = "BuscadorEntidades";

export { BuscadorEntidades }; 