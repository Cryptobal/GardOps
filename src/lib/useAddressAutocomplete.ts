"use client";

import { useState, useRef, useEffect } from 'react';
import { Loader } from '@googlemaps/js-api-loader';

// Tipos para los datos de dirección
export interface AddressComponent {
  ciudad: string;
  comuna: string;
  region: string;
  pais: string;
  codigoPostal: string;
}

export interface AddressData {
  direccionCompleta: string;
  latitud: number;
  longitud: number;
  componentes: AddressComponent;
}

export interface AddressSuggestion {
  placeId: string;
  descripcion: string;
  direccionPrincipal: string;
  direccionSecundaria: string;
}

// Configuración de Google Maps
const GOOGLE_MAPS_API_KEY = 'AIzaSyBHIoHJDp6StLJlUAQV_gK7woFsEYgbzHY';
const GOOGLE_MAPS_LIBRARIES: ("places")[] = ['places'];

// Hook principal para autocompletado de direcciones
export const useAddressAutocomplete = () => {
  const [isLoaded, setIsLoaded] = useState(false);
  const [suggestions, setSuggestions] = useState<AddressSuggestion[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedAddress, setSelectedAddress] = useState<AddressData | null>(null);
  
  const autocompleteService = useRef<google.maps.places.AutocompleteService | null>(null);
  const placesService = useRef<google.maps.places.PlacesService | null>(null);
  const mapRef = useRef<HTMLDivElement>(null);

  // Inicializar Google Maps API
  useEffect(() => {
    const initializeGoogleMaps = async () => {
      try {
        const loader = new Loader({
          apiKey: GOOGLE_MAPS_API_KEY,
          version: 'weekly',
          libraries: GOOGLE_MAPS_LIBRARIES,
        });

        await loader.load();

        // Crear servicios
        autocompleteService.current = new google.maps.places.AutocompleteService();
        
        // Crear un div temporal para PlacesService
        const mapDiv = document.createElement('div');
        const map = new google.maps.Map(mapDiv);
        placesService.current = new google.maps.places.PlacesService(map);

        setIsLoaded(true);
        console.log('Google Maps API cargada correctamente');
      } catch (error) {
        console.error('Error al cargar Google Maps API:', error);
      }
    };

    initializeGoogleMaps();
  }, []);

  // Buscar sugerencias de direcciones
  const searchAddresses = async (query: string) => {
    if (!isLoaded || !autocompleteService.current || query.length < 3) {
      setSuggestions([]);
      return;
    }

    setIsLoading(true);

    try {
      const request: google.maps.places.AutocompletionRequest = {
        input: query,
        componentRestrictions: { country: 'cl' }, // Limitar a Chile
        types: ['address'],
      };

      autocompleteService.current.getPlacePredictions(
        request,
        (predictions, status) => {
          if (status === google.maps.places.PlacesServiceStatus.OK && predictions) {
            const formattedSuggestions: AddressSuggestion[] = predictions.map((prediction) => ({
              placeId: prediction.place_id,
              descripcion: prediction.description,
              direccionPrincipal: prediction.structured_formatting.main_text,
              direccionSecundaria: prediction.structured_formatting.secondary_text || '',
            }));
            
            setSuggestions(formattedSuggestions);
          } else {
            setSuggestions([]);
          }
          setIsLoading(false);
        }
      );
    } catch (error) {
      console.error('Error al buscar direcciones:', error);
      setSuggestions([]);
      setIsLoading(false);
    }
  };

  // Obtener detalles completos de una dirección seleccionada
  const selectAddress = async (placeId: string): Promise<AddressData | null> => {
    if (!isLoaded || !placesService.current) {
      return null;
    }

    return new Promise((resolve) => {
      const request: google.maps.places.PlaceDetailsRequest = {
        placeId: placeId,
        fields: [
          'formatted_address',
          'geometry.location',
          'address_components',
        ],
      };

      placesService.current!.getDetails(request, (place, status) => {
        if (status === google.maps.places.PlacesServiceStatus.OK && place) {
          const addressData = parseAddressComponents(place);
          setSelectedAddress(addressData);
          setSuggestions([]);
          resolve(addressData);
        } else {
          console.error('Error al obtener detalles de la dirección:', status);
          resolve(null);
        }
      });
    });
  };

  // Parsear componentes de dirección
  const parseAddressComponents = (place: google.maps.places.PlaceResult): AddressData => {
    const components: AddressComponent = {
      ciudad: '',
      comuna: '',
      region: '',
      pais: '',
      codigoPostal: '',
    };

    if (place.address_components) {
      place.address_components.forEach((component) => {
        const types = component.types;

        if (types.includes('locality')) {
          components.ciudad = component.long_name;
        } else if (types.includes('administrative_area_level_3')) {
          components.comuna = component.long_name;
        } else if (types.includes('administrative_area_level_1')) {
          components.region = component.long_name;
        } else if (types.includes('country')) {
          components.pais = component.long_name;
        } else if (types.includes('postal_code')) {
          components.codigoPostal = component.long_name;
        }
      });
    }

    return {
      direccionCompleta: place.formatted_address || '',
      latitud: place.geometry?.location?.lat() || 0,
      longitud: place.geometry?.location?.lng() || 0,
      componentes: components,
    };
  };

  // Limpiar selección
  const clearSelection = () => {
    setSelectedAddress(null);
    setSuggestions([]);
  };

  return {
    isLoaded,
    suggestions,
    isLoading,
    selectedAddress,
    searchAddresses,
    selectAddress,
    clearSelection,
  };
}; 