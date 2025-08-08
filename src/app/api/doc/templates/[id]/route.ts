import { NextRequest, NextResponse } from 'next/server'
import { query } from '@/lib/db'
import { extractVariables } from '@/lib/templating'
export const dynamic = 'force-dynamic'

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { id } = params
    const result = await query(`SELECT id, name, content, variables, created_at FROM doc_templates WHERE id = $1`, [id])
    if (result.rows.length === 0) return NextResponse.json({ success: false, error: 'No encontrado' }, { status: 404 })
    return NextResponse.json({ success: true, data: result.rows[0] })
  } catch (error) {
    console.error('❌ GET /api/doc/templates/[id] error', error)
    return NextResponse.json({ success: false, error: 'Error obteniendo plantilla' }, { status: 500 })
  }
}

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { id } = params
    const body = await req.json()
    const { name, content, variables } = body as { name?: string; content?: string; variables?: string[] }
    const current = await query(`SELECT * FROM doc_templates WHERE id = $1`, [id])
    if (current.rows.length === 0) return NextResponse.json({ success: false, error: 'No encontrado' }, { status: 404 })
    const prev = current.rows[0]
    const nextName = name ?? prev.name
    const nextContent = content ?? prev.content
    const autoVars = extractVariables(nextContent)
    const nextVars = variables ? Array.from(new Set([...(variables || []), ...autoVars])) : Array.from(new Set([...(prev.variables || []), ...autoVars]))
    const result = await query(
      `UPDATE doc_templates SET name = $1, content = $2, variables = $3 WHERE id = $4 RETURNING id, name, content, variables, created_at`,
      [nextName, nextContent, nextVars, id]
    )
    return NextResponse.json({ success: true, data: result.rows[0] })
  } catch (error) {
    console.error('❌ PUT /api/doc/templates/[id] error', error)
    return NextResponse.json({ success: false, error: 'Error actualizando plantilla' }, { status: 500 })
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { id } = params
    await query(`DELETE FROM doc_templates WHERE id = $1`, [id])
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('❌ DELETE /api/doc/templates/[id] error', error)
    return NextResponse.json({ success: false, error: 'Error eliminando plantilla' }, { status: 500 })
  }
}

