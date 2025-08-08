import { NextResponse } from 'next/server'
import { query } from '@/lib/db'

export async function GET() {
  try {
    const r = await query('SELECT COUNT(*)::int as count FROM doc_documents')
    return NextResponse.json({ success: true, data: r.rows[0] })
  } catch (e) {
    return NextResponse.json({ success: false, error: 'Error' }, { status: 500 })
  }
}

