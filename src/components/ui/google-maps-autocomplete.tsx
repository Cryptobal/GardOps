"use client";

import React, { useEffect, useRef, useState } from 'react';
import { Input } from './input';
import { Label } from './label';
import { MapPin, Loader2 } from 'lucide-react';

interface GoogleMapsAutocompleteProps {
  value: string;
  onChange: (value: string) => void;
  onPlaceSelect?: (place: google.maps.places.PlaceResult) => void;
  placeholder?: string;
  label?: string;
  error?: string;
  disabled?: boolean;
  className?: string;
}

declare global {
  interface Window {
    google: typeof google;
    googleMapsLoading: boolean;
    googleMapsLoaded: boolean;
  }
}

// Singleton para manejar la carga de Google Maps
class GoogleMapsLoader {
  private static instance: GoogleMapsLoader;
  private loadingPromise: Promise<void> | null = null;

  private constructor() {}

  static getInstance(): GoogleMapsLoader {
    if (!GoogleMapsLoader.instance) {
      GoogleMapsLoader.instance = new GoogleMapsLoader();
    }
    return GoogleMapsLoader.instance;
  }

  async load(): Promise<void> {
    // Si ya está cargado, retornar inmediatamente
    if (window.google && window.googleMapsLoaded) {
      return Promise.resolve();
    }

    // Si ya está cargando, esperar a que termine
    if (window.googleMapsLoading && this.loadingPromise) {
      return this.loadingPromise;
    }

    // Si no está cargando, iniciar la carga
    if (!window.google) {
      window.googleMapsLoading = true;
      
      this.loadingPromise = new Promise((resolve, reject) => {
        const script = document.createElement('script');
        script.src = `https://maps.googleapis.com/maps/api/js?key=${process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY}&libraries=places`;
        script.async = true;
        script.defer = true;
        
        script.onload = () => {
          window.googleMapsLoaded = true;
          window.googleMapsLoading = false;
          this.loadingPromise = null;
          resolve();
        };
        
        script.onerror = () => {
          window.googleMapsLoading = false;
          this.loadingPromise = null;
          reject(new Error('Error cargando Google Maps API'));
        };
        
        document.head.appendChild(script);
      });

      return this.loadingPromise;
    }

    return Promise.resolve();
  }
}

export function GoogleMapsAutocomplete({
  value,
  onChange,
  onPlaceSelect,
  placeholder = "Buscar dirección...",
  label,
  error,
  disabled = false,
  className = ""
}: GoogleMapsAutocompleteProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const autocompleteRef = useRef<google.maps.places.Autocomplete | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isGoogleLoaded, setIsGoogleLoaded] = useState(false);

  useEffect(() => {
    const loadGoogleMaps = async () => {
      try {
        setIsLoading(true);
        const loader = GoogleMapsLoader.getInstance();
        await loader.load();
        setIsGoogleLoaded(true);
      } catch (error) {
        console.error('Error cargando Google Maps:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadGoogleMaps();
  }, []);

  useEffect(() => {
    if (!isGoogleLoaded || !inputRef.current || disabled) return;

    try {
      // Crear autocompletado
      autocompleteRef.current = new window.google.maps.places.Autocomplete(inputRef.current, {
        types: ['address'],
        componentRestrictions: { country: 'cl' }, // Restringir a Chile
        fields: ['address_components', 'formatted_address', 'geometry', 'name']
      });

      // Escuchar selección de lugar
      autocompleteRef.current.addListener('place_changed', () => {
        const place = autocompleteRef.current?.getPlace();
        if (place && place.address_components) {
          let streetNumber = '';
          let route = '';
          let sublocality = '';
          let locality = '';
          let administrativeArea = '';

          // Extraer componentes de la dirección
          for (const component of place.address_components) {
            const types = component.types;
            
            if (types.includes('street_number')) {
              streetNumber = component.long_name;
            } else if (types.includes('route')) {
              route = component.long_name;
            } else if (types.includes('sublocality_level_1') || types.includes('sublocality')) {
              sublocality = component.long_name;
            } else if (types.includes('locality')) {
              locality = component.long_name;
            } else if (types.includes('administrative_area_level_1')) {
              administrativeArea = component.long_name;
            }
          }

          // Construir dirección completa
          const fullAddress = [streetNumber, route].filter(Boolean).join(' ');
          
          // Llamar callbacks
          onChange(fullAddress);
          if (onPlaceSelect) {
            onPlaceSelect(place);
          }
        }
      });

      return () => {
        if (autocompleteRef.current) {
          window.google.maps.event.clearInstanceListeners(autocompleteRef.current);
        }
      };
    } catch (error) {
      console.error('Error inicializando Google Maps Autocomplete:', error);
    }
  }, [isGoogleLoaded, onChange, onPlaceSelect, disabled]);

  return (
    <div className={className}>
      {label && (
        <Label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          {label}
        </Label>
      )}
      
      <div className="relative">
        <Input
          ref={inputRef}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          disabled={disabled || isLoading}
          className={`pr-10 ${error ? 'border-red-500' : ''}`}
        />
        
        <div className="absolute inset-y-0 right-0 flex items-center pr-3">
          {isLoading ? (
            <Loader2 className="h-4 w-4 animate-spin text-gray-400" />
          ) : (
            <MapPin className="h-4 w-4 text-gray-400" />
          )}
        </div>
      </div>
      
      {error && (
        <p className="mt-1 text-sm text-red-500">{error}</p>
      )}
      
      {!isGoogleLoaded && !isLoading && (
        <p className="mt-1 text-xs text-gray-500">
          Cargando autocompletado de direcciones...
        </p>
      )}
    </div>
  );
}
