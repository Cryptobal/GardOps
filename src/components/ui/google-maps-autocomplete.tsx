'use client';

import { useEffect, useRef, useState } from 'react';

interface GoogleMapsAutocompleteProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
}

declare global {
  interface Window {
    google: any;
  }
}

export function GoogleMapsAutocomplete({
  value,
  onChange,
  placeholder = 'Ingresa una dirección',
  className = '',
  disabled = false
}: GoogleMapsAutocompleteProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const autocompleteRef = useRef<any>(null);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    // Verificar si Google Maps ya está cargado
    const checkGoogleMaps = () => {
      if (window.google && window.google.maps && window.google.maps.places) {
        setIsLoaded(true);
        return true;
      }
      return false;
    };

    // Si ya está cargado, inicializar inmediatamente
    if (checkGoogleMaps()) {
      return;
    }

    // Si no está cargado, esperar a que se cargue
    const interval = setInterval(() => {
      if (checkGoogleMaps()) {
        clearInterval(interval);
      }
    }, 100);

    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (!isLoaded || !inputRef.current || disabled) return;

    try {
      // Crear el autocompletado
      autocompleteRef.current = new window.google.maps.places.Autocomplete(inputRef.current, {
        types: ['address'],
        componentRestrictions: { country: 'cl' }, // Restringir a Chile
        fields: ['formatted_address', 'geometry']
      });

      // Escuchar el evento de selección
      autocompleteRef.current.addListener('place_changed', () => {
        const place = autocompleteRef.current.getPlace();
        if (place.formatted_address) {
          // Extraer solo la dirección principal (sin código postal, comuna, región, país)
          const addressComponents = place.formatted_address.split(',');
          // Tomar solo los primeros 2-3 componentes que suelen ser la dirección principal
          const mainAddress = addressComponents.slice(0, 2).join(', ').trim();
          onChange(mainAddress);
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
  }, [isLoaded, onChange, disabled]);

  return (
    <input
      ref={inputRef}
      type="text"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className={className}
      disabled={disabled}
      autoComplete="street-address"
    />
  );
}
