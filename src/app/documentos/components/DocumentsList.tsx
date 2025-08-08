"use client"
import { useEffect, useState } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'

export default function DocumentsList() {
  const [docs, setDocs] = useState<any[]>([])
  useEffect(() => { (async () => {
    const r = await fetch('/api/doc/documents/list'); const j = await r.json(); if (j.success) setDocs(j.data)
  })() }, [])
  return (
    <Card>
      <CardContent>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>ID</TableHead>
                <TableHead>Plantilla</TableHead>
                <TableHead>Entidad</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead>Creado</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {docs.map(d => (
                <TableRow key={d.id}>
                  <TableCell className="font-mono text-xs">{d.id}</TableCell>
                  <TableCell>{d.template_id}</TableCell>
                  <TableCell>{d.entity_type}:{d.entity_id}</TableCell>
                  <TableCell>{d.status}</TableCell>
                  <TableCell>{new Date(d.created_at).toLocaleString()}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  )
}

