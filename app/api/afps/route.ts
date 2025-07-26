import { NextResponse } from 'next/server'
import { query } from '@/lib/database'

export async function GET() {
  try {
    console.log('Obteniendo lista de AFPs...')
    
    const result = await query(`
      SELECT id, nombre 
      FROM afps 
      ORDER BY nombre ASC
    `)

    console.log(`AFPs encontradas: ${result.rows.length}`)
    
    return NextResponse.json({
      success: true,
      data: result.rows
    })
  } catch (error) {
    console.error('Error al obtener AFPs:', error)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Error desconocido'
    }, { status: 500 })
  }
} 