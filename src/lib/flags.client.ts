'use client'

import { useEffect, useMemo, useState } from 'react'
import { clientLog } from './log'

export function useFlag(code: string): boolean {
  const [flags, setFlags] = useState<Record<string, boolean> | null>(null)

  useEffect(() => {
    let cancelled = false
    const load = async () => {
      try {
        const res = await fetch('/api/flags', { cache: 'no-store' })
        if (!res.ok) return
        const data = (await res.json()) as { flags?: Record<string, boolean> }
        if (!cancelled) setFlags(data.flags ?? {})
      } catch {
        try { clientLog('error:flags_fetch', { code }) } catch {}
        if (!cancelled) setFlags({})
      }
    }
    load()
    const id = setInterval(load, 30000)
    return () => {
      cancelled = true
      clearInterval(id)
    }
  }, [code])

  return useMemo(() => {
    if (!flags) return false
    return Boolean(flags[code])
  }, [flags, code])
}


