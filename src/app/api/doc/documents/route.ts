import { NextRequest, NextResponse } from 'next/server'
export const dynamic = 'force-dynamic'
import { query } from '@/lib/db'
import { getEntityData, EntityType } from '@/lib/data-sources'
import { extractVariables, renderTemplate, validateVariables } from '@/lib/templating'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { templateId, entityType, entityId } = body as { templateId: string; entityType: EntityType; entityId: string }
    if (!templateId || !entityType || !entityId) {
      return NextResponse.json({ success: false, error: 'templateId, entityType y entityId son requeridos' }, { status: 400 })
    }

    const tplRes = await query(`SELECT id, name, content, variables FROM doc_templates WHERE id = $1`, [templateId])
    if (tplRes.rows.length === 0) return NextResponse.json({ success: false, error: 'Plantilla no encontrada' }, { status: 404 })
    const template = tplRes.rows[0]

    const { data } = await getEntityData(entityType, entityId)

    const usedVars = extractVariables(template.content)
    const { valid, missing } = validateVariables(usedVars, template.variables || [])
    if (!valid) {
      return NextResponse.json({ success: false, error: `Variables no declaradas: ${missing.join(', ')}` }, { status: 400 })
    }

    const html = renderTemplate(template.content, data)

    const insert = await query(
      `INSERT INTO doc_documents (template_id, entity_type, entity_id, data, html_rendered, status) 
       VALUES ($1, $2, $3, $4, $5, 'draft') RETURNING *`,
      [templateId, entityType, entityId, data, html]
    )

    return NextResponse.json({ success: true, data: insert.rows[0] })
  } catch (error) {
    console.error('❌ POST /api/doc/documents error', error)
    return NextResponse.json({ success: false, error: 'Error generando documento' }, { status: 500 })
  }
}

