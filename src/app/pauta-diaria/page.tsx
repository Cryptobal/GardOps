import { redirect } from 'next/navigation'

export default function PautaDiariaPage() {
  const today = new Date().toISOString().split('T')[0]
  redirect(`/pauta-diaria/${today}`)
}