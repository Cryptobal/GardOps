"use client";

import React, { useEffect, useRef, useState } from 'react';
import { Input } from './input';
import { Label } from './label';
import { MapPin, Loader2 } from 'lucide-react';

interface GoogleMapsSearchProps {
  value: string;
  onChange: (value: string) => void;
  onPlaceSelect?: (address: string, comuna: string, ciudad: string) => void;
  placeholder?: string;
  label?: string;
  error?: string;
  disabled?: boolean;
  className?: string;
}

declare global {
  interface Window {
    google: typeof google;
  }
}

export function GoogleMapsSearch({
  value,
  onChange,
  onPlaceSelect,
  placeholder = "Buscar dirección...",
  label,
  error,
  disabled = false,
  className = ""
}: GoogleMapsSearchProps) {
  
  const inputRef = useRef<HTMLInputElement>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isReady, setIsReady] = useState(false);
  const autocompleteRef = useRef<google.maps.places.Autocomplete | null>(null);

  useEffect(() => {
    // Función para esperar a que places esté disponible (Google Maps ya está siendo cargado por layout.tsx)
    const waitForPlaces = (attempts = 0): void => {
      if (window.google?.maps?.places) {
        console.log('✅ Google Maps Places está disponible');
        setIsLoading(false);
        setIsReady(true);
        return;
      }
      
      if (attempts > 100) { // 10 segundos máximo
        console.error('❌ Timeout esperando Google Maps Places');
        setIsLoading(false);
        setIsReady(false);
        return;
      }
      
      console.log(`⏳ Esperando Google Maps Places... (intento ${attempts + 1})`);
      setTimeout(() => waitForPlaces(attempts + 1), 100);
    };

    // Iniciar el polling
    waitForPlaces();
  }, []);

  useEffect(() => {
    console.log('🔍 useEffect ejecutado. isReady:', isReady, 'inputRef:', !!inputRef.current, 'google:', !!window.google);
    
    if (!isReady || !inputRef.current) {
      console.log('⚠️ No está listo aún');
      return;
    }

    if (!window.google?.maps?.places) {
      console.error('❌ Google Maps Places no está disponible');
      return;
    }

    try {
      console.log('🔧 Creando Autocomplete...');
      
      // Crear Autocomplete
      autocompleteRef.current = new window.google.maps.places.Autocomplete(
        inputRef.current,
        {
          types: ['address'],
          componentRestrictions: { country: 'cl' },
          fields: ['address_components', 'formatted_address', 'name']
        }
      );

      console.log('✅ Autocomplete creado exitosamente');

      // Listener para cuando se selecciona un lugar
      autocompleteRef.current.addListener('place_changed', () => {
        console.log('🎯 place_changed event disparado');
        
        const place = autocompleteRef.current?.getPlace();
        
        if (!place) {
          console.warn('⚠️ No se obtuvo place');
          return;
        }

        if (!place.address_components) {
          console.warn('⚠️ No se obtuvieron address_components');
          return;
        }

        console.log('🗺️ LUGAR SELECCIONADO:', place);
        console.log('📍 ADDRESS COMPONENTS:', place.address_components);

        // Extraer comuna y ciudad
        let comuna = '';
        let ciudad = '';

        // PRIMERO: Buscar la comuna (administrative_area_level_3)
        const comunaComponent = place.address_components.find((c: any) =>
          c.types.includes('administrative_area_level_3')
        );
        if (comunaComponent) {
          comuna = comunaComponent.long_name;
          console.log('📍 Comuna encontrada (administrative_area_level_3):', comuna);
        }

        // Si no hay administrative_area_level_3, buscar locality
        if (!comuna) {
          const localityComponent = place.address_components.find((c: any) =>
            c.types.includes('locality')
          );
          if (localityComponent) {
            comuna = localityComponent.long_name;
            console.log('📍 Comuna encontrada (locality):', comuna);
          }
        }

        // SEGUNDO: Buscar la ciudad (administrative_area_level_2 o locality si no es la comuna)
        const area2Component = place.address_components.find((c: any) =>
          c.types.includes('administrative_area_level_2')
        );
        if (area2Component) {
          ciudad = area2Component.long_name;
          console.log('📍 Ciudad encontrada (administrative_area_level_2):', ciudad);
        }

        // Si no hay area_level_2, buscar locality SOLO si no es la misma que comuna
        if (!ciudad) {
          const localityComponent = place.address_components.find((c: any) =>
            c.types.includes('locality')
          );
          if (localityComponent && localityComponent.long_name !== comuna) {
            ciudad = localityComponent.long_name;
            console.log('📍 Ciudad encontrada (locality diferente):', ciudad);
          }
        }

        // Si aún no tenemos ciudad, usar la región (administrative_area_level_1)
        if (!ciudad) {
          const regionComponent = place.address_components.find((c: any) =>
            c.types.includes('administrative_area_level_1')
          );
          if (regionComponent) {
            ciudad = regionComponent.long_name;
            console.log('📍 Ciudad encontrada (región):', ciudad);
          }
        }

        const address = place.formatted_address || value;
        
        console.log('✅ DATOS EXTRAÍDOS:');
        console.log('   Dirección:', address);
        console.log('   Comuna:', comuna);
        console.log('   Ciudad:', ciudad);

        // Actualizar el input
        onChange(address);

        // Llamar al callback
        if (onPlaceSelect) {
          console.log('🎯 Llamando onPlaceSelect');
          onPlaceSelect(address, comuna, ciudad);
        }
      });

      return () => {
        console.log('🧹 Limpiando listeners de Google Maps');
        if (autocompleteRef.current && window.google?.maps?.event) {
          window.google.maps.event.clearInstanceListeners(autocompleteRef.current);
        }
      };
    } catch (error) {
      console.error('❌ Error configurando Google Maps:', error);
      setIsReady(false);
    }
  }, [isReady]); // NO incluir onChange, onPlaceSelect ni value para evitar recreaciones

  return (
    <div className={`space-y-2 ${className}`}>
      {label && (
        <Label htmlFor="google-maps-search" className="text-sm font-medium">
          {label}
        </Label>
      )}
      
      <div className="relative">
        <Input
          ref={inputRef}
          id="google-maps-search"
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          disabled={disabled || isLoading}
          className={`pr-10 ${error ? 'border-red-500' : ''}`}
        />
        
        <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
          {isLoading ? (
            <Loader2 className="w-4 h-4 animate-spin text-gray-400" />
          ) : isReady ? (
            <MapPin className="w-4 h-4 text-blue-500" />
          ) : (
            <MapPin className="w-4 h-4 text-gray-400" />
          )}
        </div>
      </div>
      
      {error && (
        <p className="text-sm text-red-500">{error}</p>
      )}
      
      {isReady && (
        <p className="text-xs text-green-600 dark:text-green-400">
          ✓ Google Maps listo - Escribe y selecciona una dirección
        </p>
      )}
      
      {!isReady && !isLoading && (
        <p className="text-xs text-yellow-600 dark:text-yellow-400">
          ⚠ No se pudo cargar Google Maps. Escribe la dirección manualmente.
        </p>
      )}
    </div>
  );
}

