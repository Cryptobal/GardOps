"use client";

import { logger, devLogger, apiLogger } from '@/lib/utils/logger';

import React, { useEffect, useRef, useState } from 'react';
import { MapPin, Loader2 } from 'lucide-react';
import { cn } from '../../lib/utils';
import { GOOGLE_MAPS_CONFIG } from '../../lib/config/google-maps';
import { useGoogleMaps } from '../../lib/useGoogleMaps';

interface GoogleMapProps {
  center?: { lat: number; lng: number };
  zoom?: number;
  markers?: Array<{
    position: { lat: number; lng: number };
    title?: string;
    info?: string;
    color?: 'red' | 'blue' | 'green' | 'yellow' | 'purple' | 'orange';
  }>;
  className?: string;
  height?: string;
  onMapClick?: (position: { lat: number; lng: number }) => void;
}

// Centro de Santiago, Chile por defecto
const DEFAULT_CENTER = GOOGLE_MAPS_CONFIG.DEFAULT_CENTER;

export const GoogleMap: React.FC<GoogleMapProps> = ({
  center = DEFAULT_CENTER,
  zoom = 13,
  markers = [],
  className,
  height = "400px",
  onMapClick,
}) => {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<google.maps.Map | null>(null);
  const markersRef = useRef<google.maps.Marker[]>([]);
  const infoWindowRef = useRef<google.maps.InfoWindow | null>(null);
  const [isMapReady, setIsMapReady] = useState(false);
  
  // Usar el hook centralizado de Google Maps
  const { isLoaded, isLoading, error } = useGoogleMaps();

  // Inicializar el mapa cuando Google Maps esté cargado
  useEffect(() => {
    if (!isLoaded || !mapRef.current) return;

    const initMap = async () => {
      try {
        // Validar coordenadas del centro
        const validCenter = (center && 
          typeof center.lat === 'number' && typeof center.lng === 'number' &&
          !isNaN(center.lat) && !isNaN(center.lng) &&
          isFinite(center.lat) && isFinite(center.lng)) 
          ? center 
          : DEFAULT_CENTER;

        // Validar que el elemento del mapa existe y está en el DOM
        if (!mapRef.current || !document.contains(mapRef.current)) {
          logger.warn('Elemento del mapa no está disponible en el DOM');
          return;
        }

        // Silenciar warning de Marker deprecated
        const originalWarn = console.warn;
        console.warn = (...args) => {
          const message = args.join(' ');
          if (message.includes('google.maps.Marker is deprecated')) {
            return; // Silenciar warning de Marker deprecated
          }
          originalWarn.apply(console, args);
        };

        // Crear el mapa
        const map = new google.maps.Map(mapRef.current, {
          center: validCenter,
          zoom,
          mapTypeControl: true,
          streetViewControl: true,
          fullscreenControl: true,
          zoomControl: true,
          styles: [
            {
              featureType: 'poi',
              elementType: 'labels',
              stylers: [{ visibility: 'on' }]
            }
          ]
        });

        // Restaurar console.warn después de 5 segundos
        setTimeout(() => {
          console.warn = originalWarn;
        }, 5000);

        mapInstanceRef.current = map;

        // Crear InfoWindow
        infoWindowRef.current = new google.maps.InfoWindow();

        // Agregar event listener para clicks en el mapa
        if (onMapClick) {
          map.addListener('click', (event: google.maps.MapMouseEvent) => {
            if (event.latLng) {
              onMapClick({
                lat: event.latLng.lat(),
                lng: event.latLng.lng()
              });
            }
          });
        }

        setIsMapReady(true);
        // Modo silencioso para producción
      } catch (err) {
        logger.error('Error al inicializar el mapa::', err);
      }
    };

    if (isLoaded && mapRef.current && !mapInstanceRef.current) {
      initMap();
    }
  }, [isLoaded]);

  // Actualizar centro del mapa (solo cuando el mapa se inicializa)
  useEffect(() => {
    if (mapInstanceRef.current && isMapReady && center && 
        typeof center.lat === 'number' && typeof center.lng === 'number' &&
        !isNaN(center.lat) && !isNaN(center.lng) &&
        isFinite(center.lat) && isFinite(center.lng)) {
      mapInstanceRef.current.setCenter(center);
      mapInstanceRef.current.setZoom(zoom);
    }
  }, [isMapReady]);

  // Actualizar marcadores
  useEffect(() => {
    if (!mapInstanceRef.current || !isLoaded) return;

    // Limpiar marcadores existentes
    markersRef.current.forEach(marker => marker.setMap(null));
    markersRef.current = [];

    // Agregar nuevos marcadores
    markers.forEach((markerData, index) => {
      // Validar y convertir coordenadas
      const lat = Number(markerData.position.lat);
      const lng = Number(markerData.position.lng);
      
      // Verificar que las coordenadas sean válidas
      if (isNaN(lat) || isNaN(lng) || !isFinite(lat) || !isFinite(lng)) {
        logger.warn(`Coordenadas inválidas para marcador ${index + 1}:`, markerData.position);
        return;
      }
      
      const validPosition = { lat, lng };
      
      // Configurar color del marcador
      let iconUrl = '';
      if (markerData.color) {
        iconUrl = `https://maps.google.com/mapfiles/ms/icons/${markerData.color}-dot.png`;
      }

      const marker = new google.maps.Marker({
        position: validPosition,
        map: mapInstanceRef.current,
        title: markerData.title || `Ubicación ${index + 1}`,
        animation: google.maps.Animation.DROP,
        icon: iconUrl || undefined,
      });

      // Agregar info window si hay información
      if (markerData.info && infoWindowRef.current) {
        marker.addListener('click', () => {
          if (infoWindowRef.current) {
            infoWindowRef.current.setContent(`
              <div style="padding: 8px; max-width: 200px;">
                <h4 style="margin: 0 0 8px 0; font-weight: bold;">${markerData.title || 'Ubicación'}</h4>
                <p style="margin: 0; font-size: 14px;">${markerData.info}</p>
              </div>
            `);
            infoWindowRef.current.open(mapInstanceRef.current, marker);
          }
        });
      }

      markersRef.current.push(marker);
    });

    // Ajustar vista si hay múltiples marcadores
    if (markers.length > 1) {
      const bounds = new google.maps.LatLngBounds();
      markers.forEach(markerData => {
        const lat = Number(markerData.position.lat);
        const lng = Number(markerData.position.lng);
        if (!isNaN(lat) && !isNaN(lng) && isFinite(lat) && isFinite(lng)) {
          bounds.extend({ lat, lng });
        }
      });
      if (!bounds.isEmpty()) {
        mapInstanceRef.current.fitBounds(bounds);
      }
    }
  }, [markers, isLoaded]);

  if (error) {
    return (
      <div 
        className={cn(
          "flex items-center justify-center bg-muted rounded-md border",
          className
        )}
        style={{ height }}
      >
        <div className="text-center p-6">
          <MapPin className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
          <p className="text-sm text-muted-foreground">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className={cn("relative", className)}>
      {/* Contenedor del mapa */}
      <div
        ref={mapRef}
        className="w-full rounded-md border"
        style={{ height }}
      />

      {/* Indicador de carga */}
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-background/80 rounded-md">
          <div className="flex items-center gap-2">
            <Loader2 className="h-5 w-5 animate-spin" />
            <span className="text-sm text-muted-foreground">Cargando mapa...</span>
          </div>
        </div>
      )}

      {/* Información de estado */}
      {isLoaded && markers.length === 0 && (
        <div className="absolute bottom-4 left-4 bg-background/90 backdrop-blur-sm rounded-md px-3 py-2 shadow-sm border">
          <p className="text-xs text-muted-foreground">
            Click en el mapa o selecciona una dirección para agregar marcadores
          </p>
        </div>
      )}
    </div>
  );
};

export default GoogleMap; 