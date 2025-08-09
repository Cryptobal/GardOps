import { redirect } from 'next/navigation'
import { isFlagEnabled } from '@/lib/flags'

export default async function Page() {
  const on = await isFlagEnabled('ado_v2')
  redirect(on ? '/pauta-diaria-v2' : '/legacy/pauta-diaria')
}