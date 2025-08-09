import { redirect } from 'next/navigation'
import { isFlagEnabled } from '@/lib/flags'
import VersionBanner from '@/components/VersionBanner'

export default async function PautaDiariaV2Page() {
  const isOn = await isFlagEnabled('ado_v2')
  if (!isOn) {
    redirect('/legacy/pauta-diaria')
  }
  return (
    <div className="max-w-6xl mx-auto p-4 space-y-4">
      <VersionBanner version="v2" />
      <h1 className="text-2xl font-bold">Pauta Diaria v2 (beta)</h1>
      <div className="rounded-md border border-dashed p-6 text-muted-foreground">
        TODO: grid diaria
      </div>
    </div>
  )
}


