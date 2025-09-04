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
  
  // TEMPORAL: Forzar siempre la nueva versión para testing
  console.log('🔄 Redirigiendo a pauta-diaria-v2 (forzado)')
  redirect('/pauta-diaria-v2')
}