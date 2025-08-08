import { NextRequest, NextResponse } from 'next/server'
import { query } from '@/lib/db'
import { extractVariables } from '@/lib/templating'
export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const result = await query(`SELECT id, name, content, variables, created_at FROM doc_templates ORDER BY created_at DESC`)
    return NextResponse.json({ success: true, data: result.rows })
  } catch (error) {
    console.error('❌ GET /api/doc/templates error', error)
    return NextResponse.json({ success: false, error: 'Error listando plantillas' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { name, content, variables } = body as { name: string; content: string; variables?: string[] }
    if (!name || !content) {
      return NextResponse.json({ success: false, error: 'name y content son requeridos' }, { status: 400 })
    }
    const autoVars = extractVariables(content)
    const finalVars = Array.from(new Set([...(variables || []), ...autoVars]))
    const result = await query(
      `INSERT INTO doc_templates (name, content, variables) VALUES ($1, $2, $3) RETURNING id, name, content, variables, created_at`,
      [name, content, finalVars]
    )
    return NextResponse.json({ success: true, data: result.rows[0] })
  } catch (error) {
    console.error('❌ POST /api/doc/templates error', error)
    return NextResponse.json({ success: false, error: 'Error creando plantilla' }, { status: 500 })
  }
}

