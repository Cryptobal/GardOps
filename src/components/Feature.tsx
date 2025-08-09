'use client'

import React from 'react'
import { useFlag } from '@/lib/flags.client'

export default function Feature({ code, children }: { code: string; children: React.ReactNode }) {
  const on = useFlag(code)
  if (!on) return null
  return <>{children}</>
}


