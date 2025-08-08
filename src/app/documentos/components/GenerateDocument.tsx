"use client"
import { useEffect, useMemo, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { useToast } from '@/components/ui/toast'

interface Template { id: string; name: string; content: string; variables: string[] }

export default function GenerateDocument() {
  const { toast } = useToast()
  const [templates, setTemplates] = useState<Template[]>([])
  const [templateId, setTemplateId] = useState<string>('')
  const [entityType, setEntityType] = useState<'guardia'>('guardia')
  const [search, setSearch] = useState('')
  const [candidates, setCandidates] = useState<Array<{ id: string; nombre: string; rut?: string }>>([])
  const [entityId, setEntityId] = useState('')
  const [templateHtml, setTemplateHtml] = useState('')
  const [renderedHtml, setRenderedHtml] = useState('')
  const selectedTemplate = useMemo(() => templates.find(t => t.id === templateId), [templates, templateId])

  useEffect(() => {
    ;(async () => {
      const res = await fetch('/api/doc/templates')
      const json = await res.json()
      if (json.success) setTemplates(json.data)
    })()
  }, [])

  useEffect(() => {
    const t = selectedTemplate
    setTemplateHtml(t?.content || '')
  }, [selectedTemplate])

  useEffect(() => {
    const handler = setTimeout(async () => {
      if (search.trim().length < 2) { setCandidates([]); return }
      const res = await fetch(`/api/guardias/buscar?search=${encodeURIComponent(search)}`)
      const json = await res.json()
      if (json.success) setCandidates(json.guardias.map((g: any) => ({ id: g.id, nombre: g.nombre_completo || g.nombre, rut: g.rut })))
    }, 300)
    return () => clearTimeout(handler)
  }, [search])

  async function preview() {
    if (!templateId || !entityId) { toast.error('Seleccione plantilla y entidad'); return }
    const res = await fetch('/api/doc/documents', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ templateId, entityType, entityId })
    })
    const json = await res.json()
    if (!json.success) { toast.error(json.error || 'Error'); return }
    setRenderedHtml(json.data.html_rendered)
  }

  async function save() {
    await preview()
    toast.success('Guardado en borrador', 'Documento generado')
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Generar Documento</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div>
              <label className="text-sm text-muted-foreground">Plantilla</label>
              <Select value={templateId} onValueChange={setTemplateId}>
                <SelectTrigger>
                  <SelectValue placeholder="Seleccione plantilla" />
                </SelectTrigger>
                <SelectContent>
                  {templates.map(t => (
                    <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {selectedTemplate?.variables?.length ? (
                <div className="mt-2 flex flex-wrap gap-1">
                  {selectedTemplate.variables.map(v => (<Badge key={v} variant="secondary">{v}</Badge>))}
                </div>
              ) : null}
            </div>
            <div>
              <label className="text-sm text-muted-foreground">Tipo de entidad</label>
              <Select value={entityType} onValueChange={(v) => setEntityType(v as any)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="guardia">Guardia</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm text-muted-foreground">Entidad</label>
              <Input placeholder="Buscar guardia por nombre o RUT" value={search} onChange={e => setSearch(e.target.value)} />
              {candidates.length > 0 && (
                <div className="mt-1 max-h-40 overflow-auto rounded border bg-background">
                  {candidates.map(c => (
                    <div key={c.id} className={`px-2 py-1 cursor-pointer hover:bg-accent ${entityId === c.id ? 'bg-accent' : ''}`} onClick={() => { setEntityId(c.id); setSearch(`${c.nombre} (${c.rut || ''})`) }}>
                      {c.nombre} {c.rut ? `(${c.rut})` : ''}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <div className="text-sm mb-1 text-muted-foreground">Plantilla</div>
              <div className="rounded border p-3 min-h-40 bg-card" dangerouslySetInnerHTML={{ __html: templateHtml }} />
            </div>
            <div>
              <div className="text-sm mb-1 text-muted-foreground">Render</div>
              <div className="rounded border p-3 min-h-40 bg-card" dangerouslySetInnerHTML={{ __html: renderedHtml }} />
            </div>
          </div>

          <div className="flex gap-2">
            <Button onClick={preview}>Previsualizar</Button>
            <Button onClick={save} variant="secondary">Guardar</Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

