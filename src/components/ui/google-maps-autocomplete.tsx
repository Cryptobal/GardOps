"use client";

import { logger, devLogger, apiLogger } from '@/lib/utils/logger';

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
    googleMapsLoaded: boolean;
    googleMapsLoading: boolean;
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
  
  const autocompleteRef = useRef<google.maps.places.Autocomplete | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isGoogleLoaded, setIsGoogleLoaded] = useState(false);
  const [inputValue, setInputValue] = useState(value);

  useEffect(() => {
    const loadGoogleMaps = async () => {
      try {
        setIsLoading(true);
        const loader = GoogleMapsLoader.getInstance();
        await loader.load();
        setIsGoogleLoaded(true);
      } catch (error) {
        logger.error('Error cargando Google Maps::', error);
        // Fallback: permitir entrada manual
        setIsGoogleLoaded(false);
      } finally {
        setIsLoading(false);
      }
    };

    loadGoogleMaps();
  }, []);

  useEffect(() => {
    if (!isGoogleLoaded || !inputRef.current || !window.google?.maps?.places) {
      return;
    }

    try {
      // Crear autocompletado
      autocompleteRef.current = new window.google.maps.places.Autocomplete(inputRef.current, {
        types: ['address'],
        componentRestrictions: { country: 'cl' }, // Restringir a Chile
        fields: ['address_components', 'formatted_address', 'geometry', 'name']
      });

      // Escuchar selección de lugar
      const listener = autocompleteRef.current.addListener('place_changed', () => {
        const place = autocompleteRef.current?.getPlace();
        
        if (!place) {
          logger.error('❌ No se recibió lugar de Google Maps');
          return;
        }
        
        logger.debug('🗺️ Lugar recibido:', place);
        
        // Usar la dirección formateada
        const fullAddress = place.formatted_address || place.name || '';
        onChange(fullAddress);
        setInputValue(fullAddress);
        
        // Pasar el lugar completo al callback
        if (onPlaceSelect) {
          onPlaceSelect(place);
        }
      });

      return () => {
        if (autocompleteRef.current) {
          window.google.maps.event.clearInstanceListeners(autocompleteRef.current);
        }
      };
    } catch (error) {
      logger.error('Error configurando autocompletado::', error);
      // Fallback: permitir entrada manual
      setIsGoogleLoaded(false);
    }
  }, [isGoogleLoaded, onChange, onPlaceSelect]);

  // Sincronizar valor externo con estado interno
  useEffect(() => {
    setInputValue(value);
  }, [value]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    setInputValue(newValue);
    
    // Si Google Maps no está disponible, permitir entrada manual
    if (!isGoogleLoaded) {
      onChange(newValue);
    }
  };

  const handleInputBlur = () => {
    // Sincronizar valor al perder foco
    if (inputValue !== value) {
      onChange(inputValue);
    }
  };

  return (
    <div className={`space-y-2 ${className}`}>
      {label && (
        <Label htmlFor="google-maps-input" className="text-sm font-medium">
          {label}
        </Label>
      )}
      
      <div className="relative">
        <Input
          ref={inputRef}
          id="google-maps-input"
          type="text"
          value={inputValue}
          onChange={handleInputChange}
          onBlur={handleInputBlur}
          placeholder={placeholder}
          disabled={disabled}
          className={`pr-10 ${error ? 'border-red-500' : ''}`}
        />
        
        <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
          {isLoading ? (
            <Loader2 className="w-4 h-4 animate-spin text-gray-400" />
          ) : isGoogleLoaded ? (
            <MapPin className="w-4 h-4 text-blue-500" />
          ) : (
            <MapPin className="w-4 h-4 text-gray-400" />
          )}
        </div>
      </div>
      
      {error && (
        <p className="text-sm text-red-500">{error}</p>
      )}
      
      {isGoogleLoaded && (
        <p className="text-xs text-green-600 dark:text-green-400">
          ✓ Google Maps conectado - Selecciona una dirección de las sugerencias
        </p>
      )}
      
      {!isGoogleLoaded && !isLoading && (
        <p className="text-xs text-yellow-600 dark:text-yellow-400">
          ⚠ Autocompletado no disponible. Escribe la dirección manualmente y completa comuna/ciudad.
        </p>
      )}
    </div>
  );
}
