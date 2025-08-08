import { NextRequest, NextResponse } from 'next/server'
export const dynamic = 'force-dynamic'
import { query } from '@/lib/db'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { documentId, signerName, signerEmail, signaturePng } = body as {
      documentId: string
      signerName: string
      signerEmail?: string
      signaturePng: string // base64 data URL
    }
    if (!documentId || !signerName || !signaturePng) {
      return NextResponse.json({ success: false, error: 'documentId, signerName y signaturePng son requeridos' }, { status: 400 })
    }

    // En esta fase MVP, almacenamos la firma como data URL en la columna signature_png_url
    // En producción, deberíamos subir a S3/Cloud Storage y guardar la URL
    const insert = await query(
      `INSERT INTO doc_signatures (document_id, signer_name, signer_email, signature_png_url) 
       VALUES ($1, $2, $3, $4) RETURNING *`,
      [documentId, signerName, signerEmail || null, signaturePng]
    )

    await query(`UPDATE doc_documents SET status = 'signed' WHERE id = $1`, [documentId])

    return NextResponse.json({ success: true, data: insert.rows[0] })
  } catch (error) {
    console.error('❌ POST /api/doc/sign error', error)
    return NextResponse.json({ success: false, error: 'Error al firmar documento' }, { status: 500 })
  }
}

