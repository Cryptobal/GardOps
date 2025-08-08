import { NextRequest, NextResponse } from 'next/server'
import { searchGuardias } from '@/lib/data-sources'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const q = searchParams.get('q') || ''
  try {
    const data = await searchGuardias(q)
    return NextResponse.json({ success: true, data })
  } catch (e) {
    return NextResponse.json({ success: false, error: 'Error' }, { status: 500 })
  }
}

