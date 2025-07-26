"use client"

import React, { useEffect, useRef, useState } from 'react'
import { Loader } from '@googlemaps/js-api-loader'
import { MapPin, AlertCircle, Loader2, Map as MapIcon } from 'lucide-react'
import { motion } from 'framer-motion'
import { cn } from '@/lib/utils'

interface Instalacion {
  id: string
  nombre: string
  direccion: string
  lat?: number | null
  lng?: number | null
  estado?: string
  ppc_count?: number
}

interface EnhancedInstalacionesMapProps {
  className?: string
  height?: string
}

export function EnhancedInstalacionesMap({ 
  className, 
  height = "500px" 
}: EnhancedInstalacionesMapProps) {
  const mapRef = useRef<HTMLDivElement>(null)
  const [map, setMap] = useState<google.maps.Map | null>(null)
  const [instalaciones, setInstalaciones] = useState<Instalacion[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [markerClusterer, setMarkerClusterer] = useState<any>(null)

  // Coordenadas para centrar en Chile
  const chileCenter = { lat: -33.4489, lng: -70.6693 } // Santiago como centro
  const chileBounds = {
    north: -17.5, // Norte de Chile
    south: -56.0, // Sur de Chile (incluye territorio antártico)
    east: -66.0,  // Este de Chile
    west: -81.0   // Oeste de Chile (incluye Isla de Pascua)
  }

  // Determinar color del marcador según criticidad
  const getMarkerColor = (instalacion: Instalacion) => {
    if (!instalacion.ppc_count) return '#22c55e' // Verde - OK
    if (instalacion.ppc_count >= 3) return '#ef4444' // Rojo - Crítico
    if (instalacion.ppc_count >= 1) return '#f59e0b' // Amarillo - Alerta
    return '#22c55e' // Verde - OK
  }

  const getMarkerIcon = (instalacion: Instalacion) => {
    const color = getMarkerColor(instalacion)
    return {
      path: google.maps.SymbolPath.CIRCLE,
      scale: 10,
      fillColor: color,
      fillOpacity: 0.9,
      strokeColor: '#ffffff',
      strokeWeight: 2,
      strokeOpacity: 1
    }
  }

  // Cargar instalaciones desde la API
  useEffect(() => {
    const fetchInstalaciones = async () => {
      try {
        setIsLoading(true)
        console.log('🔄 Cargando instalaciones para el mapa...')
        
        // Obtener instalaciones con coordenadas
        const instalacionesResponse = await fetch('/api/table-data/instalaciones?limit=1000')
        const instalacionesData = await instalacionesResponse.json()
        
        // Obtener métricas de PPC para cada instalación
        const metricsResponse = await fetch('/api/dashboard-metrics')
        const metricsData = await metricsResponse.json()
        
        if (instalacionesData.data && Array.isArray(instalacionesData.data)) {
          // Filtrar solo instalaciones con coordenadas válidas
          const instalacionesConCoordenadas = instalacionesData.data.filter(
            (inst: any) => {
              const hasCoords = inst.lat !== null && inst.lng !== null && 
                               typeof inst.lat === 'number' && typeof inst.lng === 'number'
              return hasCoords
            }
          )

          // Agregar datos de PPC si están disponibles
          const instalacionesEnriquecidas = instalacionesConCoordenadas.map((inst: any) => {
            const ppcData = metricsData.metrics?.topPpcPorInstalacion?.find(
              (ppc: any) => ppc.instalacion_nombre === inst.nombre
            )
            return {
              ...inst,
              ppc_count: ppcData?.ppc_count || 0
            }
          })
          
          setInstalaciones(instalacionesEnriquecidas)
          console.log('📍 Instalaciones cargadas:', instalacionesEnriquecidas.length)
        } else {
          console.error('❌ No se encontraron datos de instalaciones válidos')
          setError('No se encontraron datos de instalaciones')
        }
      } catch (err) {
        console.error('❌ Error al cargar instalaciones:', err)
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
          throw new Error('API Key de Google Maps no configurada')
        }

        const loader = new Loader({
          apiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY,
          version: 'weekly',
          libraries: ['places', 'marker']
        })

        await loader.load()
        
        if (mapRef.current) {
          // Crear mapa centrado en Chile
          const mapInstance = new google.maps.Map(mapRef.current, {
            center: chileCenter,
            zoom: 6, // Zoom para mostrar todo Chile
            minZoom: 4,
            maxZoom: 18,
            restriction: {
              latLngBounds: chileBounds,
              strictBounds: false
            },
            styles: [
              {
                featureType: 'poi',
                elementType: 'labels',
                stylers: [{ visibility: 'off' }]
              },
              {
                featureType: 'transit',
                elementType: 'labels',
                stylers: [{ visibility: 'off' }]
              }
            ],
            mapTypeControl: true,
            streetViewControl: false,
            fullscreenControl: true,
            zoomControl: true
          })

          // Crear marcadores para cada instalación
          const markers = instalaciones.map((instalacion) => {
            if (instalacion.lat && instalacion.lng) {
              const marker = new google.maps.Marker({
                position: { lat: instalacion.lat, lng: instalacion.lng },
                map: mapInstance,
                title: instalacion.nombre,
                icon: getMarkerIcon(instalacion)
              })

              // Info window para cada marcador
              const statusText = instalacion.ppc_count && instalacion.ppc_count > 0 
                ? `⚠️ ${instalacion.ppc_count} PPC activos`
                : '✅ Operativo'
              
              const statusClass = instalacion.ppc_count && instalacion.ppc_count > 0
                ? instalacion.ppc_count >= 3 ? 'text-red-600' : 'text-yellow-600'
                : 'text-green-600'

              const infoWindow = new google.maps.InfoWindow({
                content: `
                  <div class="p-3 min-w-[200px]">
                    <h3 class="font-semibold text-gray-900 mb-1">${instalacion.nombre}</h3>
                    <p class="text-sm text-gray-600 mb-2">${instalacion.direccion}</p>
                    <div class="flex items-center justify-between">
                      <span class="text-xs ${statusClass} font-medium">${statusText}</span>
                      <span class="text-xs text-gray-500">${instalacion.estado || 'Activa'}</span>
                    </div>
                  </div>
                `
              })

              marker.addListener('click', () => {
                infoWindow.open(mapInstance, marker)
              })

              return marker
            }
            return null
          }).filter(Boolean)

                     // Ajustar zoom automáticamente si hay marcadores
           if (markers.length > 1) {
             const bounds = new google.maps.LatLngBounds()
             markers.forEach(marker => {
               if (marker) bounds.extend(marker.getPosition()!)
             })
             mapInstance.fitBounds(bounds)
           }

          setMap(mapInstance)
        }
        
      } catch (err) {
        console.error('Error loading map:', err)
        setError(err instanceof Error ? err.message : 'Error desconocido')
      }
    }

    initMap()
  }, [instalaciones])

  if (isLoading) {
    return (
      <motion.div 
        className={cn(
          "flex flex-col items-center justify-center bg-card/30 backdrop-blur-sm border rounded-2xl p-8",
          className
        )} 
        style={{ height }}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
      >
        <Loader2 className="h-8 w-8 text-blue-500 animate-spin mb-3" />
        <p className="text-sm text-muted-foreground font-medium">
          Cargando mapa de instalaciones...
        </p>
        <p className="text-xs text-muted-foreground/70 mt-1">
          Obteniendo ubicaciones y estados operativos
        </p>
      </motion.div>
    )
  }

  if (instalaciones.length === 0) {
    return (
      <motion.div 
        className={cn(
          "flex flex-col items-center justify-center bg-card/30 backdrop-blur-sm border rounded-2xl p-8",
          className
        )} 
        style={{ height }}
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
      >
        <MapPin className="h-12 w-12 text-muted-foreground/50 mb-4" />
        <h3 className="text-lg font-semibold text-foreground mb-2">
          Sin instalaciones disponibles
        </h3>
        <p className="text-sm text-muted-foreground text-center max-w-sm">
          No hay instalaciones con coordenadas válidas para mostrar en el mapa
        </p>
        <p className="text-xs text-muted-foreground/70 mt-2">
          Agrega coordenadas a las instalaciones para visualizarlas
        </p>
      </motion.div>
    )
  }

  if (error) {
    return (
      <motion.div 
        className={cn(
          "flex flex-col items-center justify-center bg-red-50/50 dark:bg-red-950/20 border border-red-200 dark:border-red-800 rounded-2xl p-8",
          className
        )} 
        style={{ height }}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
      >
        <AlertCircle className="h-12 w-12 text-red-500 mb-4" />
        <h3 className="text-lg font-semibold text-red-700 dark:text-red-300 mb-2">
          Error al cargar el mapa
        </h3>
        <p className="text-sm text-red-600 dark:text-red-400 text-center">
          {error}
        </p>
        <div className="mt-4 p-3 bg-white dark:bg-gray-800 rounded-lg border">
          <p className="text-xs text-gray-600 dark:text-gray-400">
            📍 {instalaciones.length} instalaciones detectadas
          </p>
        </div>
      </motion.div>
    )
  }

  const criticalCount = instalaciones.filter(i => i.ppc_count && i.ppc_count >= 3).length
  const warningCount = instalaciones.filter(i => i.ppc_count && i.ppc_count >= 1 && i.ppc_count < 3).length
  const okCount = instalaciones.filter(i => !i.ppc_count || i.ppc_count === 0).length

  return (
    <motion.div 
      className={cn("rounded-2xl overflow-hidden border bg-card/30 backdrop-blur-sm", className)}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.3 }}
    >
      <div 
        ref={mapRef} 
        style={{ height }}
        className="w-full"
      />
      
      {/* Map Status Bar */}
      <div className="px-6 py-4 bg-card/80 backdrop-blur-sm border-t">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <MapIcon className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm font-medium text-foreground">
              {instalaciones.length} instalaciones operativas
            </span>
          </div>
          
          <div className="flex items-center space-x-6 text-xs">
            <div className="flex items-center space-x-2">
              <div className="w-3 h-3 bg-green-500 rounded-full" />
              <span className="text-muted-foreground">
                {okCount} OK
              </span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-3 h-3 bg-yellow-500 rounded-full" />
              <span className="text-muted-foreground">
                {warningCount} Alerta
              </span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-3 h-3 bg-red-500 rounded-full" />
              <span className="text-muted-foreground">
                {criticalCount} Crítico
              </span>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  )
} 