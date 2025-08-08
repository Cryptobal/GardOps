"use client"
import { useEffect, useRef, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import SignaturePad from 'signature_pad'
import { Input } from '@/components/ui/input'
import { toast } from '@/hooks/use-toast'

export default function FirmarDocumentoPage() {
  const params = useParams<{ id: string }>()
  const router = useRouter()
  const [documento, setDocumento] = useState<any>(null)
  const [signerName, setSignerName] = useState('')
  const [signerEmail, setSignerEmail] = useState('')
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const padRef = useRef<SignaturePad | null>(null)

  useEffect(() => {
    ;(async () => {
      const res = await fetch(`/api/documentos/${params.id}`)
      if (res.ok) {
        const json = await res.json()
        setDocumento(json.data)
      }
    })()
  }, [params.id])

  useEffect(() => {
    if (canvasRef.current) {
      padRef.current = new SignaturePad(canvasRef.current, { backgroundColor: 'rgba(255,255,255,0)', penColor: 'white' })
    }
    return () => { padRef.current?.off() }
  }, [])

  function clear() { padRef.current?.clear() }

  async function sign() {
    if (!signerName) { toast().error('Ingrese nombre del firmante'); return }
    if (!padRef.current || padRef.current.isEmpty()) { toast().error('Realice la firma'); return }
    const dataUrl = padRef.current.toDataURL('image/png')
    const res = await fetch('/api/doc/sign', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ documentId: params.id, signerName, signerEmail, signaturePng: dataUrl })
    })
    const json = await res.json()
    if (!json.success) { toast().error(json.error || 'Error al firmar'); return }
    toast().success('Documento firmado')
    router.push('/documentos')
  }

  return (
    <div className="p-4 max-w-5xl mx-auto space-y-4">
      <Card>
        <CardHeader><CardTitle>Firmar Documento</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="rounded border p-3 bg-card" dangerouslySetInnerHTML={{ __html: documento?.html_rendered || '' }} />
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 items-start">
            <div className="md:col-span-2">
              <canvas ref={canvasRef} width={800} height={200} className="w-full border rounded bg-black/20" />
              <div className="flex gap-2 mt-2">
                <Button variant="ghost" onClick={clear}>Limpiar</Button>
              </div>
            </div>
            <div className="space-y-2">
              <Input placeholder="Nombre firmante" value={signerName} onChange={e => setSignerName(e.target.value)} />
              <Input placeholder="Email (opcional)" value={signerEmail} onChange={e => setSignerEmail(e.target.value)} />
              <Button onClick={sign}>Firmar</Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

