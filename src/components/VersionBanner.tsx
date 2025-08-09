'use client'

export default function VersionBanner({ version }: { version: string }) {
  return (
    <div className="w-full rounded-md bg-blue-50 text-blue-800 border border-blue-200 px-3 py-2 text-sm flex items-center justify-between">
      <span>
        Estás viendo: <span className="font-medium">{version}</span>
      </span>
      <a href="/legacy/pauta-diaria" className="text-blue-700 hover:underline">
        ver v1
      </a>
    </div>
  )
}


