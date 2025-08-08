"use client"
import { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { useToast } from '@/components/ui/toast'

interface Template {
  id: string
  name: string
  content: string
  variables: string[]
  created_at: string
}

export default function TemplatesTable() {
  const { toast } = useToast()
  const [templates, setTemplates] = useState<Template[]>([])
  const [loading, setLoading] = useState(false)
  const [openNew, setOpenNew] = useState(false)
  const [name, setName] = useState('')
  const [content, setContent] = useState('<h2>Contrato {{guardia_nombre}}</h2><p>RUT: {{rut}}</p><p>Fecha: {{fecha_contrato}}</p>')
  const [variables, setVariables] = useState<string>('guardia_nombre,rut,fecha_contrato')

  async function load() {
    setLoading(true)
    try {
      const res = await fetch('/api/doc/templates')
      const json = await res.json()
      if (json.success) setTemplates(json.data)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  async function createTemplate() {
    try {
      const res = await fetch('/api/doc/templates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, content, variables: variables.split(',').map(v => v.trim()).filter(Boolean) })
      })
      const json = await res.json()
      if (!json.success) throw new Error(json.error || 'Error')
      toast.success('Se guardó correctamente', 'Plantilla creada')
      setOpenNew(false)
      setName('')
      setContent('')
      setVariables('')
      load()
    } catch (e: any) {
      toast.error(e.message || 'Error creando plantilla')
    }
  }

  async function removeTemplate(id: string) {
    if (!confirm('Eliminar plantilla?')) return
    const res = await fetch(`/api/doc/templates/${id}`, { method: 'DELETE' })
    const json = await res.json()
    if (json.success) {
      toast.success('Plantilla eliminada', 'Eliminada')
      load()
    } else {
      toast.error(json.error || 'Error al eliminar')
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold">Plantillas ({templates.length})</h3>
        <Button onClick={() => setOpenNew(v => !v)}>Nueva</Button>
      </div>

      {openNew && (
        <Card>
          <CardHeader>
            <CardTitle>Nueva Plantilla</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Input placeholder="Nombre" value={name} onChange={e => setName(e.target.value)} />
            <Textarea rows={8} placeholder="HTML con {{variables}}" value={content} onChange={e => setContent(e.target.value)} />
            <Input placeholder="variables separadas por coma" value={variables} onChange={e => setVariables(e.target.value)} />
            <div className="flex gap-2">
              <Button onClick={createTemplate}>Guardar</Button>
              <Button variant="ghost" onClick={() => setOpenNew(false)}>Cancelar</Button>
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nombre</TableHead>
                  <TableHead>Variables</TableHead>
                  <TableHead>Creado</TableHead>
                  <TableHead className="text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {templates.map(t => (
                  <TableRow key={t.id}>
                    <TableCell className="font-medium">{t.name}</TableCell>
                    <TableCell className="space-x-1">
                      {t.variables?.map(v => (
                        <Badge key={v} variant="secondary">{v}</Badge>
                      ))}
                    </TableCell>
                    <TableCell>{new Date(t.created_at).toLocaleString()}</TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" onClick={() => removeTemplate(t.id)}>Eliminar</Button>
                    </TableCell>
                  </TableRow>
                ))}
                {!loading && templates.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center text-sm text-muted-foreground">Sin plantillas</TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

