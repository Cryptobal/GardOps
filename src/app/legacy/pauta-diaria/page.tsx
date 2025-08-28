import { Authorize, GuardButton, can } from '@/lib/authz-ui'
import { redirect } from 'next/navigation'

export default function LegacyPautaDiariaIndexPage() {
  const today = new Date().toISOString().split('T')[0]
  redirect(`/legacy/pauta-diaria/${today}`)
}


