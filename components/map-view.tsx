"use client"

import React, { useEffect, useRef, useState } from 'react'
import { Loader } from '@googlemaps/js-api-loader'
import { MapPin, AlertCircle } from 'lucide-react'
import { cn } from '@/lib/utils'

interface MapViewProps {
  lat?: number | null
  lng?: number | null
  address?: string
  className?: string
  height?: string
}

export function MapView({ 
  lat, 
  lng, 
  address, 
  className, 
  height = "300px" 
}: MapViewProps) {
  const mapRef = useRef<HTMLDivElement>(null)
  const [map, setMap] = useState<google.maps.Map | null>(null)
  const [isLoaded, setIsLoaded] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const initMap = async () => {
      try {
        if (!process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY) {
          throw new Error('API Key no configurada')
        }

        const loader = new Loader({
          apiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY,
          version: 'weekly',
          libraries: ['places']
        })

        await loader.load()
        
        if (mapRef.current && lat !== null && lng !== null && lat !== undefined && lng !== undefined) {
          const mapInstance = new google.maps.Map(mapRef.current, {
            center: { lat, lng },
            zoom: 15,
            styles: [
              {
                featureType: 'poi',
                elementType: 'labels',
                stylers: [{ visibility: 'off' }]
              }
            ]
          })

          // Agregar marcador
          new google.maps.Marker({
            position: { lat, lng },
            map: mapInstance,
            title: address || 'Ubicación',
            icon: {
              path: google.maps.SymbolPath.CIRCLE,
              scale: 8,
              fillColor: '#ef4444',
              fillOpacity: 1,
              strokeColor: '#dc2626',
              strokeWeight: 2
            }
          })

          setMap(mapInstance)
        }
        
        setIsLoaded(true)
      } catch (err) {
        console.error('Error loading map:', err)
        setError(err instanceof Error ? err.message : 'Error desconocido')
        setIsLoaded(true)
      }
    }

    initMap()
  }, [lat, lng, address])

  // Si no hay coordenadas
  if (!lat || !lng) {
    return (
      <div className={cn(
        "flex flex-col items-center justify-center bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg p-6",
        className
      )} style={{ height }}>
        <MapPin className="h-8 w-8 text-gray-400 mb-2" />
        <p className="text-sm text-gray-500 text-center">
          Sin coordenadas disponibles
        </p>
        {address && (
          <p className="text-xs text-gray-400 mt-1 text-center">
            {address}
          </p>
        )}
      </div>
    )
  }

  // Si hay error
  if (error) {
    return (
      <div className={cn(
        "flex flex-col items-center justify-center bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-lg p-6",
        className
      )} style={{ height }}>
        <AlertCircle className="h-8 w-8 text-amber-600 mb-2" />
        <p className="text-sm text-amber-700 dark:text-amber-300 text-center mb-1">
          No se pudo cargar el mapa
        </p>
        <p className="text-xs text-amber-600 dark:text-amber-400 text-center">
          {error}
        </p>
        {address && (
          <div className="mt-3 p-2 bg-white dark:bg-gray-800 rounded border">
            <p className="text-xs text-gray-600 dark:text-gray-400">
              📍 {address}
            </p>
          </div>
        )}
      </div>
    )
  }

  // Mapa normal
  return (
    <div className={cn("rounded-lg overflow-hidden border border-gray-200 dark:border-gray-700", className)}>
      <div 
        ref={mapRef} 
        style={{ height }}
        className="w-full"
      />
      {address && (
        <div className="px-3 py-2 bg-gray-50 dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700">
          <p className="text-xs text-gray-600 dark:text-gray-400 flex items-center">
            <MapPin className="h-3 w-3 mr-1" />
            {address}
          </p>
        </div>
      )}
    </div>
  )
} 