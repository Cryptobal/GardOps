"use client";

import React, { useState, useEffect } from "react";
import { MapPin, Navigation, Trash2, Loader2 } from "lucide-react";
import { Button } from "./button";
import { Input } from "./input";
import { InputDireccion, type AddressData } from "./input-direccion";
import { GoogleMap } from "./google-map";
import { cn } from "../../lib/utils";

export interface LocationTabProps {
  // Datos de ubicación
  direccion?: string;
  latitud?: number | null;
  longitud?: number | null;
  ciudad?: string;
  comuna?: string;
  
  // Callbacks
  onAddressSelect?: (address: AddressData) => void;
  onAddressChange?: (query: string) => void;
  onCiudadChange?: (ciudad: string) => void;
  onComunaChange?: (comuna: string) => void;
  onCoordinatesChange?: (lat: number, lng: number) => void;
  onClearLocation?: () => void;
  
  // Estados
  disabled?: boolean;
  isReadOnly?: boolean;
  
  // Opciones
  showMap?: boolean;
  showCoordinates?: boolean;
  showLocationButtons?: boolean;
  className?: string;
}

export function LocationTab({
  direccion = "",
  latitud = null,
  longitud = null,
  ciudad = "",
  comuna = "",
  onAddressSelect,
  onAddressChange,
  onCiudadChange,
  onComunaChange,
  onCoordinatesChange,
  onClearLocation,
  disabled = false,
  isReadOnly = false,
  showMap = true,
  showCoordinates = true,
  showLocationButtons = true,
  className = ""
}: LocationTabProps) {
  const [isGettingLocation, setIsGettingLocation] = useState(false);
  const [mapCoordinates, setMapCoordinates] = useState<{lat: number, lng: number} | null>(null);

  // Sincronizar coordenadas del mapa con las props
  useEffect(() => {
    if (latitud && longitud) {
      setMapCoordinates({ lat: latitud, lng: longitud });
    } else {
      setMapCoordinates(null);
    }
  }, [latitud, longitud]);

  // Obtener ubicación actual del navegador
  const getCurrentLocation = () => {
    if (!navigator.geolocation) {
      alert("La geolocalización no está disponible en este navegador.");
      return;
    }

    setIsGettingLocation(true);

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        setMapCoordinates({ lat: latitude, lng: longitude });
        onCoordinatesChange?.(latitude, longitude);
        setIsGettingLocation(false);
      },
      (error) => {
        console.error("Error obteniendo ubicación:", error);
        alert("No se pudo obtener la ubicación actual. Verifica que tengas permisos de ubicación.");
        setIsGettingLocation(false);
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 60000
      }
    );
  };

  // Limpiar ubicación
  const clearLocation = () => {
    setMapCoordinates(null);
    onClearLocation?.();
  };

  // Manejar clic en el mapa
  const handleMapClick = (position: { lat: number; lng: number }) => {
    setMapCoordinates(position);
    onCoordinatesChange?.(position.lat, position.lng);
  };

  // Manejar selección de dirección
  const handleAddressSelect = (addressData: AddressData) => {
    setMapCoordinates({
      lat: addressData.latitud,
      lng: addressData.longitud
    });
    onAddressSelect?.(addressData);
  };

  return (
    <div className={cn("space-y-6", className)}>
      {/* Campo de dirección con autocompletado */}
      <div className="space-y-2">
        <label className="text-sm font-medium text-foreground flex items-center gap-2">
          <MapPin className="h-4 w-4" />
          Dirección
        </label>
        <InputDireccion
          value={direccion}
          initialLatitude={latitud}
          initialLongitude={longitud}
          initialCiudad={ciudad}
          initialComuna={comuna}
          onAddressSelect={handleAddressSelect}
          onAddressChange={onAddressChange}
          placeholder="Buscar dirección con Google Maps..."
          showMap={false} // No mostrar el mapa pequeño aquí
          disabled={disabled || isReadOnly}
          showClearButton={!isReadOnly}
        />
      </div>

      {/* Campos de comuna y ciudad */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <label className="text-sm font-medium text-foreground">
            Comuna
          </label>
          <Input
            value={comuna}
            onChange={(e) => onComunaChange?.(e.target.value)}
            placeholder="Comuna"
            disabled={disabled || isReadOnly}
          />
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium text-foreground">
            Ciudad
          </label>
          <Input
            value={ciudad}
            onChange={(e) => onCiudadChange?.(e.target.value)}
            placeholder="Ciudad"
            disabled={disabled || isReadOnly}
          />
        </div>
      </div>

      {/* Coordenadas GPS */}
      {showCoordinates && (latitud || longitud) && (
        <div className="space-y-2">
          <label className="text-sm font-medium text-foreground">
            Coordenadas GPS
          </label>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-xs text-muted-foreground">Latitud</label>
              <Input
                value={latitud || ""}
                placeholder="Latitud"
                disabled={true}
                className="font-mono text-sm"
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs text-muted-foreground">Longitud</label>
              <Input
                value={longitud || ""}
                placeholder="Longitud"
                disabled={true}
                className="font-mono text-sm"
              />
            </div>
          </div>
        </div>
      )}

      {/* Botones de ubicación */}
      {showLocationButtons && !isReadOnly && (
        <div className="flex flex-wrap gap-3">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={getCurrentLocation}
            disabled={disabled || isGettingLocation}
            className="flex items-center gap-2"
          >
            {isGettingLocation ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Navigation className="h-4 w-4" />
            )}
            Usar ubicación actual
          </Button>

          {(latitud || longitud || direccion) && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={clearLocation}
              disabled={disabled}
              className="flex items-center gap-2 text-red-400 hover:text-red-300 hover:border-red-400"
            >
              <Trash2 className="h-4 w-4" />
              Limpiar ubicación
            </Button>
          )}
        </div>
      )}

      {/* Mapa de Google Maps */}
      {showMap && mapCoordinates && (
        <div className="space-y-2">
          <label className="text-sm font-medium text-foreground">
            Mapa de ubicación
          </label>
          <div className="border border-border rounded-md overflow-hidden">
            <GoogleMap
              center={mapCoordinates}
              zoom={16}
              markers={[{
                position: mapCoordinates,
                title: "Ubicación seleccionada",
                info: direccion || "Ubicación marcada"
              }]}
              height="400px"
              className="w-full"
              onMapClick={handleMapClick}
            />
          </div>
          <p className="text-xs text-muted-foreground">
            Click en el mapa para ajustar la ubicación del marcador
          </p>
        </div>
      )}

      {/* Estado cuando no hay ubicación */}
      {showMap && !mapCoordinates && (
        <div className="border border-border rounded-md p-8 text-center">
          <MapPin className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <p className="text-muted-foreground mb-2">
            No hay ubicación seleccionada
          </p>
          <p className="text-sm text-muted-foreground">
            Busca una dirección o usa tu ubicación actual para mostrar el mapa
          </p>
        </div>
      )}
    </div>
  );
} 