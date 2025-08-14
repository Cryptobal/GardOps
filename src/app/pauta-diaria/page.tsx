import { Authorize, GuardButton, can } from '@/lib/authz-ui.tsx'
import { redirect } from 'next/navigation'
import { isFlagEnabled } from '@/lib/flags'
import { unstable_noStore as noStore } from 'next/cache'

// Forzar respuesta dinámica sin caché
export const dynamic = 'force-dynamic'
export const revalidate = 0

export default async function Page() {
  noStore() // Evita caché en esta request
  const on = await isFlagEnabled('ado_v2')
  console.log('[/pauta-diaria] Flag ado_v2:', on)
  redirect(on ? '/pauta-diaria-v2' : '/legacy/pauta-diaria')
}