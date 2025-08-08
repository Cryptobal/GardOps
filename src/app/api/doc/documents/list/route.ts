import { NextResponse } from 'next/server'
import { query } from '@/lib/db'

export async function GET() {
  try {
    const r = await query('SELECT * FROM doc_documents ORDER BY created_at DESC LIMIT 100')
    return NextResponse.json({ success: true, data: r.rows })
  } catch (e) {
    return NextResponse.json({ success: false, error: 'Error listando documentos' }, { status: 500 })
  }
}

