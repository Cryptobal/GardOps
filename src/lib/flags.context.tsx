'use client'

import React, { createContext, useContext, useEffect, useState } from 'react'

interface FlagsContextType {
  flags: Record<string, boolean> | null
  loading: boolean
  error: string | null
}

const FlagsContext = createContext<FlagsContextType>({
  flags: null,
  loading: true,
  error: null
})

// Caché global para flags
let globalFlags: Record<string, boolean> | null = null
let globalFlagsPromise: Promise<Record<string, boolean>> | null = null
let lastFetchTime = 0
const CACHE_TTL = 60000 // 60 segundos (aumentado para reducir llamadas)

async function fetchFlags(): Promise<Record<string, boolean>> {
  // Si ya tenemos una promesa en curso, reutilizarla
  if (globalFlagsPromise) {
    return globalFlagsPromise
  }

  // Si tenemos datos en caché y no han expirado, usarlos
  if (globalFlags && (Date.now() - lastFetchTime) < CACHE_TTL) {
    return globalFlags
  }

  // Crear nueva promesa de fetch
  globalFlagsPromise = (async () => {
    try {
      const res = await fetch('/api/flags', { 
        cache: 'no-store',
        // Agregar timeout para evitar bloqueos
        signal: AbortSignal.timeout(5000)
      })
      if (!res.ok) return {}
      const data = (await res.json()) as { flags?: Record<string, boolean> }
      const flags = data.flags ?? {}
      
      // Actualizar caché global
      globalFlags = flags
      lastFetchTime = Date.now()
      
      return flags
    } catch (error) {
      console.error('Error fetching flags:', error)
      // En caso de error, devolver flags por defecto para no bloquear la UI
      return globalFlags || {}
    } finally {
      globalFlagsPromise = null
    }
  })()

  return globalFlagsPromise
}

export function FlagsProvider({ children }: { children: React.ReactNode }) {
  const [flags, setFlags] = useState<Record<string, boolean> | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false

    const loadFlags = async () => {
      try {
        setLoading(true)
        setError(null)
        
        const flagsData = await fetchFlags()
        
        if (!cancelled) {
          setFlags(flagsData)
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Error loading flags')
          // En caso de error, usar flags por defecto
          setFlags(globalFlags || {})
        }
      } finally {
        if (!cancelled) {
          setLoading(false)
        }
      }
    }

    loadFlags()

    // Refresh automático solo si es necesario y menos frecuente
    const interval = setInterval(() => {
      if (!globalFlags || (Date.now() - lastFetchTime) >= CACHE_TTL) {
        loadFlags()
      }
    }, CACHE_TTL)

    return () => {
      cancelled = true
      clearInterval(interval)
    }
  }, [])

  return (
    <FlagsContext.Provider value={{ flags, loading, error }}>
      {children}
    </FlagsContext.Provider>
  )
}

export function useFlags() {
  const context = useContext(FlagsContext)
  if (!context) {
    throw new Error('useFlags must be used within a FlagsProvider')
  }
  return context
}

export function useFlag(code: string): boolean {
  const { flags } = useFlags()
  
  if (!flags) return false
  return Boolean(flags[code])
}
