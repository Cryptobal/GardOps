'use client'

import { useEffect, useMemo, useState } from 'react'
import { clientLog } from './log'

// Caché compartido global para evitar múltiples llamadas
let globalFlags: Record<string, boolean> | null = null
let globalFlagsPromise: Promise<Record<string, boolean>> | null = null
let lastFetchTime = 0
const CACHE_TTL = 30000 // 30 segundos

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
      const res = await fetch('/api/flags', { cache: 'no-store' })
      if (!res.ok) return {}
      const data = (await res.json()) as { flags?: Record<string, boolean> }
      const flags = data.flags ?? {}
      
      // Actualizar caché global
      globalFlags = flags
      lastFetchTime = Date.now()
      
      return flags
    } catch (error) {
      try { clientLog('error:flags_fetch', { error: error.message }) } catch {}
      return {}
    } finally {
      globalFlagsPromise = null
    }
  })()

  return globalFlagsPromise
}

export function useFlag(code: string): boolean {
  const [flags, setFlags] = useState<Record<string, boolean> | null>(null)

  useEffect(() => {
    let cancelled = false

    const load = async () => {
      try {
        const flagsData = await fetchFlags()
        if (!cancelled) {
          setFlags(flagsData)
        }
      } catch {
        if (!cancelled) {
          setFlags({})
        }
      }
    }

    load()

    // Solo hacer refresh automático si no hay datos en caché
    const interval = setInterval(() => {
      if (!globalFlags || (Date.now() - lastFetchTime) >= CACHE_TTL) {
        load()
      }
    }, CACHE_TTL)

    return () => {
      cancelled = true
      clearInterval(interval)
    }
  }, [code])

  return useMemo(() => {
    if (!flags) return false
    return Boolean(flags[code])
  }, [flags, code])
}


