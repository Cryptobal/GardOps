"use client"

import React, { useState, useEffect, useRef, useCallback } from 'react'
import { Loader } from '@googlemaps/js-api-loader'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { MapPin, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'

interface AddressAutocompleteProps {
  value: string
  onChange: (address: string, placeDetails?: google.maps.places.PlaceResult) => void
  placeholder?: string
  label?: string
  required?: boolean
  className?: string
  error?: string
}

interface AddressSuggestion {
  place_id: string
  description: string
  main_text: string
  secondary_text: string
}

export function AddressAutocomplete({
  value,
  onChange,
  placeholder = "Buscar dirección...",
  label,
  required = false,
  className,
  error
}: AddressAutocompleteProps) {
  // Asegurar que value nunca sea null o undefined
  const safeValue = value || ''
  const [suggestions, setSuggestions] = useState<AddressSuggestion[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [isMapLoaded, setIsMapLoaded] = useState(false)
  const [selectedIndex, setSelectedIndex] = useState(-1)
  
  const inputRef = useRef<HTMLInputElement>(null)
  const suggestionsRef = useRef<HTMLDivElement>(null)
  const autocompleteService = useRef<google.maps.places.AutocompleteService | null>(null)
  const placesService = useRef<google.maps.places.PlacesService | null>(null)
  const debounceTimer = useRef<NodeJS.Timeout>()

  // Configurar Google Maps API
  useEffect(() => {
    const initializeGoogleMaps = async () => {
      try {
        const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY
        if (!apiKey) {
          console.warn('Google Maps API Key no configurada')
          return
        }

        const loader = new Loader({
          apiKey,
          version: 'weekly',
          libraries: ['places']
        })

        await loader.load()
        
        autocompleteService.current = new google.maps.places.AutocompleteService()
        
        // Crear un div oculto para el PlacesService
        const mapDiv = document.createElement('div')
        mapDiv.style.display = 'none'
        document.body.appendChild(mapDiv)
        
        const map = new google.maps.Map(mapDiv)
        placesService.current = new google.maps.places.PlacesService(map)
        
        setIsMapLoaded(true)
      } catch (error) {
        console.error('Error loading Google Maps:', error)
      }
    }

    initializeGoogleMaps()
  }, [])

  // Función para buscar direcciones con debounce
  const searchAddresses = useCallback((query: string) => {
    if (!autocompleteService.current || !isMapLoaded || query.length < 3) {
      setSuggestions([])
      return
    }

    setIsLoading(true)

    const request = {
      input: query,
      componentRestrictions: { country: 'cl' }, // Restringir a Chile
      types: ['address'], // Solo direcciones
    }

    autocompleteService.current.getPlacePredictions(request, (predictions, status) => {
      setIsLoading(false)
      
      if (status === google.maps.places.PlacesServiceStatus.OK && predictions) {
        const addressSuggestions: AddressSuggestion[] = predictions.map(prediction => ({
          place_id: prediction.place_id,
          description: prediction.description,
          main_text: prediction.structured_formatting.main_text,
          secondary_text: prediction.structured_formatting.secondary_text || ''
        }))
        
        setSuggestions(addressSuggestions)
        setShowSuggestions(true)
        setSelectedIndex(-1)
      } else {
        setSuggestions([])
        setShowSuggestions(false)
      }
    })
  }, [isMapLoaded])

  // Manejar cambios en el input con debounce
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value || ''
    onChange(newValue)

    // Limpiar timer anterior
    if (debounceTimer.current) {
      clearTimeout(debounceTimer.current)
    }

    // Configurar nuevo timer
    debounceTimer.current = setTimeout(() => {
      searchAddresses(newValue)
    }, 300)
  }

  // Seleccionar una sugerencia
  const selectSuggestion = useCallback((suggestion: AddressSuggestion) => {
    if (!placesService.current) return

    // Obtener detalles del lugar
    placesService.current.getDetails(
      { placeId: suggestion.place_id },
      (place, status) => {
        if (status === google.maps.places.PlacesServiceStatus.OK && place) {
          onChange(place.formatted_address || suggestion.description, place)
        } else {
          onChange(suggestion.description)
        }
      }
    )

    setShowSuggestions(false)
    setSuggestions([])
    setSelectedIndex(-1)
  }, [onChange])

  // Manejar teclas del teclado
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!showSuggestions || suggestions.length === 0) return

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault()
        setSelectedIndex(prev => 
          prev < suggestions.length - 1 ? prev + 1 : 0
        )
        break
      case 'ArrowUp':
        e.preventDefault()
        setSelectedIndex(prev => 
          prev > 0 ? prev - 1 : suggestions.length - 1
        )
        break
      case 'Enter':
        e.preventDefault()
        if (selectedIndex >= 0 && selectedIndex < suggestions.length) {
          selectSuggestion(suggestions[selectedIndex])
        }
        break
      case 'Escape':
        setShowSuggestions(false)
        setSelectedIndex(-1)
        break
    }
  }

  // Cerrar sugerencias al hacer clic fuera
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        suggestionsRef.current && 
        !suggestionsRef.current.contains(event.target as Node) &&
        !inputRef.current?.contains(event.target as Node)
      ) {
        setShowSuggestions(false)
        setSelectedIndex(-1)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  return (
    <div className="relative space-y-2">
      {label && (
        <Label htmlFor="address-input">
          {label} {required && <span className="text-red-500">*</span>}
        </Label>
      )}
      
      <div className="relative">
        <Input
          ref={inputRef}
          id="address-input"
          value={safeValue}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          onFocus={() => {
            if (suggestions.length > 0) {
              setShowSuggestions(true)
            }
          }}
          placeholder={placeholder}
          required={required}
          className={cn(
            "pr-10",
            error && "border-red-500 focus:border-red-500",
            className
          )}
        />
        
        <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
          {isLoading ? (
            <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
          ) : (
            <MapPin className="h-4 w-4 text-muted-foreground" />
          )}
        </div>
      </div>

      {error && (
        <p className="text-sm text-red-500">{error}</p>
      )}

      {/* Lista de sugerencias */}
      {showSuggestions && suggestions.length > 0 && (
        <div 
          ref={suggestionsRef}
          className="absolute z-50 w-full mt-1 bg-background border border-border rounded-md shadow-lg max-h-60 overflow-y-auto"
        >
          {suggestions.map((suggestion, index) => (
            <div
              key={suggestion.place_id}
              className={cn(
                "px-4 py-3 cursor-pointer transition-colors border-b border-border last:border-b-0",
                "hover:bg-muted",
                selectedIndex === index && "bg-muted"
              )}
              onClick={() => selectSuggestion(suggestion)}
            >
              <div className="flex items-start gap-3">
                <MapPin className="h-4 w-4 text-muted-foreground mt-0.5 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">
                    {suggestion.main_text}
                  </p>
                  {suggestion.secondary_text && (
                    <p className="text-xs text-muted-foreground truncate">
                      {suggestion.secondary_text}
                    </p>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Mensaje cuando no hay API key */}
      {!isMapLoaded && !process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY && (
        <div className="mt-2 p-3 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-md">
          <p className="text-xs text-amber-700 dark:text-amber-300 mb-2">
            ⚠️ <strong>Google Maps API no configurada</strong>
          </p>
          <p className="text-xs text-amber-600 dark:text-amber-400">
            Para autocompletado de direcciones reales:
          </p>
          <ol className="text-xs text-amber-600 dark:text-amber-400 mt-1 ml-3 list-decimal">
            <li>Ve a <a href="https://console.cloud.google.com/google/maps-apis/" target="_blank" rel="noopener noreferrer" className="underline">Google Cloud Console</a></li>
            <li>Habilita Places API y Maps JavaScript API</li>
            <li>Crea una API Key y agrégala a <code className="bg-amber-100 dark:bg-amber-900 px-1 rounded">.env.local</code></li>
          </ol>
        </div>
      )}
    </div>
  )
} 