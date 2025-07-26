"use client"

import React, { useEffect, useRef, useState } from 'react'
import { Loader } from '@googlemaps/js-api-loader'
import { MapPin, AlertCircle, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'

interface Instalacion {
  id: string
  nombre: string
  direccion: string
  lat?: number | null
  lng?: number | null
}

interface InstalacionesMapProps {
  className?: string
  height?: string
}

export function InstalacionesMap({ 
  className, 
  height = "500px" 
}: InstalacionesMapProps) {
  const mapRef = useRef<HTMLDivElement>(null)
  const [map, setMap] = useState<google.maps.Map | null>(null)
  const [instalaciones, setInstalaciones] = useState<Instalacion[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isMapLoaded, setIsMapLoaded] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Cargar instalaciones desde la API
  useEffect(() => {
    const fetchInstalaciones = async () => {
      try {
        console.log('🔄 Iniciando carga de instalaciones...')
        const response = await fetch('/api/table-data/instalaciones')
        const data = await response.json()
        
        console.log('📊 Respuesta API instalaciones:', data)
        
        if (data.data && Array.isArray(data.data)) {
          // Filtrar solo instalaciones con coordenadas válidas
          const instalacionesConCoordenadas = data.data.filter(
            (inst: any) => {
              const hasCoords = inst.lat !== null && inst.lng !== null && 
                               typeof inst.lat === 'number' && typeof inst.lng === 'number'
              if (hasCoords) {
                console.log(`✅ ${inst.nombre}: lat=${inst.lat}, lng=${inst.lng}`)
              } else {
                console.log(`❌ ${inst.nombre}: Sin coordenadas válidas (lat=${inst.lat}, lng=${inst.lng})`)
              }
              return hasCoords
            }
          )
          
          setInstalaciones(instalacionesConCoordenadas)
          console.log('📍 Total instalaciones con coordenadas:', instalacionesConCoordenadas.length)
          console.log('📋 Lista de instalaciones:', instalacionesConCoordenadas.map((i: Instalacion) => `${i.nombre}: (${i.lat}, ${i.lng})`))
        } else {
          console.error('❌ Error: No se encontraron datos de instalaciones válidos:', data)
          setError('No se encontraron datos de instalaciones')
        }
      } catch (err) {
        console.error('❌ Error al fetch instalaciones:', err)
        setError(err instanceof Error ? err.message : 'Error desconocido')
      } finally {
        setIsLoading(false)
      }
    }

    fetchInstalaciones()
  }, [])

  // Inicializar mapa cuando hay instalaciones
  useEffect(() => {
    const initMap = async () => {
      if (instalaciones.length === 0) return
      
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
        
        if (mapRef.current) {
          // Calcular centro del mapa basado en las instalaciones
          const latitudes = instalaciones.map(inst => inst.lat!).filter(Boolean)
          const longitudes = instalaciones.map(inst => inst.lng!).filter(Boolean)
          
          const centerLat = latitudes.reduce((a, b) => a + b, 0) / latitudes.length
          const centerLng = longitudes.reduce((a, b) => a + b, 0) / longitudes.length

          const mapInstance = new google.maps.Map(mapRef.current, {
            center: { lat: centerLat, lng: centerLng },
            zoom: 10,
            styles: [
              {
                featureType: 'poi',
                elementType: 'labels',
                stylers: [{ visibility: 'off' }]
              }
            ]
          })

          // Crear marcadores para cada instalación
          instalaciones.forEach((instalacion, index) => {
            if (instalacion.lat && instalacion.lng) {
              const marker = new google.maps.Marker({
                position: { lat: instalacion.lat, lng: instalacion.lng },
                map: mapInstance,
                title: instalacion.nombre,
                icon: {
                  path: google.maps.SymbolPath.CIRCLE,
                  scale: 8,
                  fillColor: index === 0 ? '#ef4444' : '#3b82f6',
                  fillOpacity: 1,
                  strokeColor: index === 0 ? '#dc2626' : '#1d4ed8',
                  strokeWeight: 2
                }
              })

              // Info window para cada marcador
              const infoWindow = new google.maps.InfoWindow({
                content: `
                  <div class="p-2">
                    <h3 class="font-semibold text-gray-900">${instalacion.nombre}</h3>
                    <p class="text-sm text-gray-600">${instalacion.direccion}</p>
                  </div>
                `
              })

              marker.addListener('click', () => {
                infoWindow.open(mapInstance, marker)
              })
            }
          })

          setMap(mapInstance)
        }
        
        setIsMapLoaded(true)
      } catch (err) {
        console.error('Error loading map:', err)
        setError(err instanceof Error ? err.message : 'Error desconocido')
        setIsMapLoaded(true)
      }
    }

    initMap()
  }, [instalaciones])

  if (isLoading) {
    return (
      <div className={cn(
        "flex flex-col items-center justify-center bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg p-6",
        className
      )} style={{ height }}>
        <Loader2 className="h-8 w-8 text-blue-500 animate-spin mb-2" />
        <p className="text-sm text-gray-500">
          Cargando instalaciones...
        </p>
      </div>
    )
  }

  if (instalaciones.length === 0) {
    return (
      <div className={cn(
        "flex flex-col items-center justify-center bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg p-6",
        className
      )} style={{ height }}>
        <MapPin className="h-8 w-8 text-gray-400 mb-2" />
        <p className="text-sm text-gray-500 text-center">
          No hay instalaciones con coordenadas disponibles
        </p>
        <p className="text-xs text-gray-400 mt-1 text-center">
          Agrega coordenadas a las instalaciones para verlas en el mapa
        </p>
      </div>
    )
  }

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
        <div className="mt-3 p-2 bg-white dark:bg-gray-800 rounded border">
          <p className="text-xs text-gray-600 dark:text-gray-400">
            📍 {instalaciones.length} instalaciones encontradas
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className={cn("rounded-lg overflow-hidden border border-gray-200 dark:border-gray-700", className)}>
      <div 
        ref={mapRef} 
        style={{ height }}
        className="w-full"
      />
      <div className="px-4 py-3 bg-gray-50 dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between">
          <p className="text-sm text-gray-600 dark:text-gray-400 flex items-center">
            <MapPin className="h-4 w-4 mr-1" />
            {instalaciones.length} instalaciones en el mapa
          </p>
          <div className="flex items-center space-x-4 text-xs text-gray-500">
            <div className="flex items-center">
              <div className="w-3 h-3 bg-red-500 rounded-full mr-1"></div>
              Primera instalación
            </div>
            <div className="flex items-center">
              <div className="w-3 h-3 bg-blue-500 rounded-full mr-1"></div>
              Otras instalaciones
            </div>
          </div>
        </div>
      </div>
    </div>
  )
} 