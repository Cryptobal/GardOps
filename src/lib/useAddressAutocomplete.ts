"use client";

import { logger, devLogger, apiLogger } from '@/lib/utils/logger';

import { useState, useRef, useEffect } from 'react';
import { Loader } from '@googlemaps/js-api-loader';
import { GOOGLE_MAPS_CONFIG } from './config/google-maps';

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

// Hook principal para autocompletado de direcciones
export const useAddressAutocomplete = () => {
  const [isLoaded, setIsLoaded] = useState(false);
  const [suggestions, setSuggestions] = useState<AddressSuggestion[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedAddress, setSelectedAddress] = useState<AddressData | null>(null);
  const [isDisabled, setIsDisabled] = useState(false);
  
  const autocompleteService = useRef<google.maps.places.AutocompleteService | null>(null);
  const placesService = useRef<google.maps.places.PlacesService | null>(null);
  const mapRef = useRef<HTMLDivElement>(null);

  // Listener global para errores de Google Maps
  useEffect(() => {
    // Interceptar errores de Google Maps a nivel global
    const originalConsoleError = console.error;
    console.error = (...args) => {
      const message = args.join(' ');
      if (message.includes('RefererNotAllowedMapError') || 
          message.includes('REQUEST_DENIED') ||
          message.includes('IntersectionObserver')) {
        setIsDisabled(true);
        sessionStorage.setItem('google-maps-auth-error', 'true');
        // Modo silencioso para producción
      }
      originalConsoleError.apply(console, args);
    };

    return () => {
      console.error = originalConsoleError;
    };
  }, []);

  // Inicializar Google Maps API
  useEffect(() => {
    const initializeGoogleMaps = async () => {
      try {
        // Suprimir advertencias de deprecación de Google Maps
        const originalWarn = console.warn;
        console.warn = (...args) => {
          const message = args.join(' ');
          // Suprimir advertencias específicas de deprecación de Google Maps
          if (message.includes('AutocompleteService is not available to new customers') ||
              message.includes('PlacesService is not available to new customers') ||
              message.includes('Marker is deprecated')) {
            return;
          }
          originalWarn.apply(console, args);
        };

        // Verificar que la API key esté disponible
        if (!GOOGLE_MAPS_CONFIG.API_KEY) {
          console.error('Google Maps API key no está configurada');
          return;
        }

        const loader = new Loader({
          apiKey: GOOGLE_MAPS_CONFIG.API_KEY,
          version: 'weekly',
          libraries: GOOGLE_MAPS_CONFIG.LIBRARIES,
          language: 'es', // Forzar idioma español
          region: 'CL', // Forzar región Chile
        });

        await loader.load();

        // Crear servicios
        autocompleteService.current = new google.maps.places.AutocompleteService();
        
        // Crear un div temporal para PlacesService
        const mapDiv = document.createElement('div');
        const map = new google.maps.Map(mapDiv, {
          zoom: 1,
          center: { lat: -33.4489, lng: -70.6693 }, // Santiago, Chile
        });
        placesService.current = new google.maps.places.PlacesService(map);

        setIsLoaded(true);
        logger.debug('✅ Google Maps API cargada correctamente');
        
        // Restaurar console.warn después de un tiempo
        setTimeout(() => {
          console.warn = originalWarn;
        }, 5000);
      } catch (error) {
        console.error('❌ Error al cargar Google Maps API:', error);
        setIsLoaded(false);
        // Restaurar console.warn en caso de error
        console.warn = originalWarn;
        
        // Si es error de autorización de Google Maps, deshabilitar completamente
        if (error instanceof Error && (
          error.message.includes('RefererNotAllowedMapError') ||
          error.message.includes('REQUEST_DENIED')
        )) {
          autocompleteService.current = null;
          placesService.current = null;
          setIsDisabled(true);
          // Guardar en sessionStorage para evitar reintentos
          sessionStorage.setItem('google-maps-auth-error', 'true');
          // Modo silencioso para producción
          return;
        }
      }
    };

    if (typeof window !== 'undefined') {
      // Verificar si ya hubo un error de autorización previo
      const hasAuthError = sessionStorage.getItem('google-maps-auth-error');
      if (hasAuthError) {
        setIsDisabled(true);
        // Modo silencioso para producción
        return;
      }
      
      initializeGoogleMaps();
    }
  }, []);

  // Buscar sugerencias de direcciones
  const searchAddresses = async (query: string) => {
    if (isDisabled || !isLoaded || !autocompleteService.current || query.length < 3) {
      setSuggestions([]);
      return;
    }

    setIsLoading(true);

    try {
      const request: google.maps.places.AutocompletionRequest = {
        input: query,
        componentRestrictions: { country: 'cl' }, // Limitar a Chile
        types: ['address'],
        language: 'es', // Forzar idioma español
        region: 'cl', // Forzar región Chile
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
            // Solo mostrar warnings para errores reales, no para deprecaciones
            if (status !== google.maps.places.PlacesServiceStatus.ZERO_RESULTS) {
              logger.warn('Google Maps Autocomplete status:', status);
            }
            setSuggestions([]);
            
            // Si es un error de autorización, desactivar Google Maps completamente
            if (status === google.maps.places.PlacesServiceStatus.REQUEST_DENIED) {
              console.error('❌ Google Maps API no autorizada. Desactivando autocompletado.');
              setIsLoaded(false);
              autocompleteService.current = null;
              placesService.current = null;
            }
          }
          setIsLoading(false);
        }
      );
    } catch (error) {
      logger.error('Error al buscar direcciones::', error);
      setSuggestions([]);
      setIsLoading(false);
      
      // Si es un error de autorización, desactivar Google Maps completamente
      if (error instanceof Error && error.message.includes('RefererNotAllowedMapError')) {
        console.error('❌ Google Maps no está autorizado. Desactivando autocompletado.');
        setIsLoaded(false);
        autocompleteService.current = null;
        placesService.current = null;
      }
    }
  };

  // Obtener detalles completos de una dirección seleccionada
  const selectAddress = async (placeId: string): Promise<AddressData | null> => {
    if (isDisabled || !isLoaded || !placesService.current) {
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
          devLogger.search(' selectAddress - place recibido:', place);
          const addressData = parseAddressComponents(place);
          devLogger.search(' selectAddress - addressData parseado:', addressData);
          setSelectedAddress(addressData);
          setSuggestions([]);
          resolve(addressData);
        } else {
          logger.error('Error al obtener detalles de la dirección::', status);
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
      // Primera pasada: recolectar todos los componentes
      const localityComponents: string[] = [];
      const sublocalityComponents: string[] = [];
      let administrativeLevel2 = '';
      let administrativeLevel1 = '';

      place.address_components.forEach((component) => {
        const types = component.types;
        const name = component.long_name;

        if (types.includes('locality')) {
          localityComponents.push(name);
        } else if (types.includes('sublocality')) {
          sublocalityComponents.push(name);
        } else if (types.includes('administrative_area_level_2')) {
          administrativeLevel2 = name;
        } else if (types.includes('administrative_area_level_1')) {
          administrativeLevel1 = name;
        } else if (types.includes('country')) {
          components.pais = name;
        } else if (types.includes('postal_code')) {
          components.codigoPostal = name;
        }
      });

      // Lógica específica para Chile
      // Para direcciones como "Av. La Dehesa 224, Santiago, Lo Barnechea, Región Metropolitana"
      
      // Determinar comuna: priorizar sublocality sobre locality
      if (sublocalityComponents.length > 0) {
        // Si hay sublocality, es probablemente la comuna (ej: Lo Barnechea)
        components.comuna = sublocalityComponents[0];
        // Y locality es la ciudad (ej: Santiago)
        if (localityComponents.length > 0) {
          components.ciudad = localityComponents[0];
        }
      } else if (localityComponents.length > 0) {
        // Si no hay sublocality, locality puede ser la comuna
        components.comuna = localityComponents[0];
        // Usar administrative_area_level_2 como ciudad si está disponible
        if (administrativeLevel2) {
          components.ciudad = administrativeLevel2;
        }
      }

      // Si no se determinó ciudad, usar administrative_area_level_2
      if (!components.ciudad && administrativeLevel2) {
        components.ciudad = administrativeLevel2;
      }

      // Si no se determinó comuna, buscar en la dirección formateada
      if (!components.comuna && place.formatted_address) {
        const comunas = [
          'Providencia', 'Las Condes', 'Ñuñoa', 'Santiago', 'Maipú', 
          'Puente Alto', 'La Florida', 'Peñalolén', 'Macul', 'San Miguel',
          'La Granja', 'La Pintana', 'El Bosque', 'Pedro Aguirre Cerda',
          'Lo Espejo', 'Estación Central', 'Cerrillos', 'Lo Prado',
          'Pudahuel', 'Quilicura', 'Conchalí', 'Huechuraba', 'Recoleta',
          'Independencia', 'Quinta Normal', 'Lo Barnechea', 'Vitacura',
          'San Joaquín', 'San Ramón', 'La Cisterna', 'El Monte',
          'Isla de Maipo', 'Padre Hurtado', 'Peñaflor', 'Talagante',
          'Melipilla', 'Curacaví', 'Alhué', 'San Pedro', 'Buin',
          'Paine', 'Calera de Tango', 'San Bernardo', 'Colina',
          'Lampa', 'Tiltil', 'Pirque', 'San José de Maipo'
        ];
        
        for (const comuna of comunas) {
          if (place.formatted_address.includes(comuna)) {
            components.comuna = comuna;
            break;
          }
        }
      }

      // Si aún no se determinó comuna, usar locality como fallback
      if (!components.comuna && localityComponents.length > 0) {
        components.comuna = localityComponents[0];
      }

      // Si aún no se determinó ciudad, usar administrative_area_level_1 como fallback
      if (!components.ciudad && administrativeLevel1) {
        components.ciudad = administrativeLevel1;
      }

      // Log para debugging
      devLogger.search(' Componentes extraídos:', {
        original: place.formatted_address,
        components,
        localityComponents,
        sublocalityComponents,
        administrativeLevel2,
        administrativeLevel1
      });

      // Región
      if (administrativeLevel1) {
        components.region = administrativeLevel1;
      }

      // Fallback: si no se determinó ciudad, usar la región
      if (!components.ciudad && components.region) {
        components.ciudad = components.region;
      }
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

  // Establecer dirección manualmente (para datos existentes)
  const setExistingAddress = (addressData: AddressData) => {
    setSelectedAddress(addressData);
  };

  return {
    isLoaded: isLoaded && !isDisabled,
    suggestions,
    isLoading,
    selectedAddress,
    searchAddresses,
    selectAddress,
    clearSelection,
    setExistingAddress,
    isDisabled,
  };
}; 