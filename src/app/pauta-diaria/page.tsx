import { redirect } from 'next/navigation'
import { isFlagEnabled } from '@/lib/flags'

// Forzar respuesta dinámica sin caché
export const dynamic = 'force-dynamic'
export const revalidate = 0

export default async function Page() {
  const on = await isFlagEnabled('ado_v2')
  console.log('[/pauta-diaria] Flag ado_v2:', on)
  redirect(on ? '/pauta-diaria-v2' : '/legacy/pauta-diaria')
}