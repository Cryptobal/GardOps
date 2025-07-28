"use client";

import * as React from "react";
import { useState, useRef, useEffect } from "react";
import { MapPin, Loader2, X, Map } from "lucide-react";
import { Input } from "./input";
import { Button } from "./button";
import { cn } from "../../lib/utils";
import { GoogleMap } from "./google-map";
import { useAddressAutocomplete, type AddressData, type AddressSuggestion } from "../../lib/useAddressAutocomplete";

export interface InputDireccionProps {
  placeholder?: string;
  className?: string;
  onAddressSelect?: (address: AddressData) => void;
  onAddressChange?: (query: string) => void;
  value?: string;
  defaultValue?: string;
  // Nuevas props para coordenadas iniciales
  initialLatitude?: number | null;
  initialLongitude?: number | null;
  required?: boolean;
  disabled?: boolean;
  name?: string;
  id?: string;
  showMap?: boolean;
}

const InputDireccion = React.forwardRef<HTMLInputElement, InputDireccionProps>(
  ({ 
    placeholder = "Buscar dirección...",
    className,
    onAddressSelect,
    onAddressChange,
    value,
    defaultValue = "",
    initialLatitude,
    initialLongitude,
    required = false,
    disabled = false,
    name = "direccion",
    id,
    showMap = true,
    ...props 
  }, ref) => {
    // Usar value si está presente, sino defaultValue
    const [inputValue, setInputValue] = useState(value || defaultValue);
    const [showSuggestions, setShowSuggestions] = useState(false);
    const [isInputFocused, setIsInputFocused] = useState(false);
    const [showMapView, setShowMapView] = useState(false);
    
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

    // Inicializar selectedAddress si tenemos coordenadas iniciales
    useEffect(() => {
      if (initialLatitude && initialLongitude && value && !selectedAddress) {
        // Crear un AddressData ficticio con los datos existentes
        const existingAddressData: AddressData = {
          direccionCompleta: value,
          latitud: initialLatitude,
          longitud: initialLongitude,
          componentes: {
            ciudad: '',
            comuna: '',
            region: '',
            codigoPostal: '',
            pais: 'Chile'
          }
        };
        
        // Simular la selección de dirección para activar el mapa
        onAddressSelect?.(existingAddressData);
      }
    }, [initialLatitude, initialLongitude, value, selectedAddress, onAddressSelect]);

    // Sincronizar con prop value cuando cambie (para formularios controlados)
    useEffect(() => {
      if (value !== undefined && value !== inputValue) {
        setInputValue(value);
      }
    }, [value]);

    // Mostrar mapa cuando hay dirección seleccionada o coordenadas iniciales
    useEffect(() => {
      if ((selectedAddress && showMap) || (initialLatitude && initialLongitude && showMap)) {
        setShowMapView(true);
      } else {
        setShowMapView(false);
      }
    }, [selectedAddress, showMap, initialLatitude, initialLongitude]);

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
      const addressData = await selectAddress(suggestion.placeId);
      if (addressData) {
        setInputValue(addressData.direccionCompleta);
        setShowSuggestions(false);
        onAddressSelect?.(addressData);
        onAddressChange?.(addressData.direccionCompleta);
      }
    };

    // Manejar focus y blur
    const handleInputFocus = () => {
      setIsInputFocused(true);
      if (suggestions.length > 0) {
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

    // Limpiar dirección
    const handleClear = () => {
      setInputValue("");
      clearSelection();
      setShowSuggestions(false);
      setShowMapView(false);
      onAddressChange?.("");
      inputRef.current?.focus();
    };

    // Toggle del mapa
    const toggleMap = () => {
      if (selectedAddress || (initialLatitude && initialLongitude)) {
        setShowMapView(!showMapView);
      }
    };

    // Obtener las coordenadas para mostrar (selectedAddress o iniciales)
    const getMapCoordinates = () => {
      if (selectedAddress) {
        return {
          lat: selectedAddress.latitud,
          lng: selectedAddress.longitud,
          direccion: selectedAddress.direccionCompleta
        };
      } else if (initialLatitude && initialLongitude) {
        return {
          lat: initialLatitude,
          lng: initialLongitude,
          direccion: value || "Ubicación guardada"
        };
      }
      return null;
    };

    const mapCoords = getMapCoordinates();

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
      <div className={cn("relative w-full space-y-3", className)}>
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
            disabled={disabled || !isLoaded}
            required={required}
            name={name}
            id={id}
            className={cn(
              "pl-10",
              mapCoords && showMap ? "pr-20" : "pr-10",
              isLoading && "pr-16",
              className
            )}
            autoComplete="off"
            {...props}
          />

          {/* Botón para mostrar/ocultar mapa */}
          {mapCoords && showMap && (
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="absolute right-8 top-1/2 transform -translate-y-1/2 h-8 w-8"
              onClick={toggleMap}
              title={showMapView ? "Ocultar mapa" : "Mostrar mapa"}
            >
              <Map className={cn("h-3 w-3", showMapView && "text-blue-500")} />
            </Button>
          )}

          {/* Indicador de carga */}
          {isLoading && (
            <Loader2 className="absolute right-8 top-1/2 transform -translate-y-1/2 h-4 w-4 animate-spin text-muted-foreground" />
          )}

          {/* Botón limpiar */}
          {inputValue && !isLoading && (
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
                <div className="flex items-start gap-3">
                  <MapPin className="h-4 w-4 mt-0.5 text-muted-foreground flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-sm truncate">
                      {suggestion.direccionPrincipal}
                    </div>
                    {suggestion.direccionSecundaria && (
                      <div className="text-xs text-muted-foreground truncate">
                        {suggestion.direccionSecundaria}
                      </div>
                    )}
                  </div>
                </div>
              </button>
            ))}
          </div>
        )}

        {/* Mapa pequeño */}
        {showMapView && mapCoords && showMap && (
          <div className="border border-border rounded-md overflow-hidden">
            <div className="bg-muted/50 px-3 py-2 border-b border-border">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <MapPin className="h-4 w-4 text-blue-500" />
                  <span className="text-sm font-medium">Ubicación seleccionada</span>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={toggleMap}
                  className="h-auto p-1"
                >
                  <X className="h-3 w-3" />
                </Button>
              </div>
              <p className="text-xs text-muted-foreground mt-1 truncate">
                {mapCoords.direccion}
              </p>
            </div>
            <GoogleMap
              center={{
                lat: mapCoords.lat,
                lng: mapCoords.lng
              }}
              zoom={16}
              markers={[{
                position: {
                  lat: mapCoords.lat,
                  lng: mapCoords.lng
                },
                title: "Dirección seleccionada",
                info: mapCoords.direccion
              }]}
              height="200px"
              className="w-full"
            />
          </div>
        )}

        {/* Estado de no carga de API */}
        {!isLoaded && (
          <div className="absolute top-full left-0 right-0 z-50 mt-1 bg-background border border-border rounded-md shadow-lg p-4">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              Cargando servicio de direcciones...
            </div>
          </div>
        )}

        {/* Campos ocultos para latitud y longitud */}
        {(selectedAddress || (initialLatitude && initialLongitude)) && (
          <>
            <input
              type="hidden"
              name={`${name}_latitud`}
              value={selectedAddress?.latitud || initialLatitude || ''}
            />
            <input
              type="hidden"
              name={`${name}_longitud`}
              value={selectedAddress?.longitud || initialLongitude || ''}
            />
            <input
              type="hidden"
              name={`${name}_ciudad`}
              value={selectedAddress?.componentes.ciudad || ''}
            />
            <input
              type="hidden"
              name={`${name}_comuna`}
              value={selectedAddress?.componentes.comuna || ''}
            />
            <input
              type="hidden"
              name={`${name}_region`}
              value={selectedAddress?.componentes.region || ''}
            />
          </>
        )}
      </div>
    );
  }
);

InputDireccion.displayName = "InputDireccion";

export { InputDireccion };
export type { AddressData, AddressSuggestion }; 