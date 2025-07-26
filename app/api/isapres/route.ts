import { NextResponse } from 'next/server'
import { query } from '@/lib/database'

export async function GET() {
  try {
    console.log('Obteniendo lista de ISAPREs...')
    
    const result = await query(`
      SELECT id, nombre 
      FROM isapres 
      ORDER BY 
        CASE WHEN nombre = 'FONASA' THEN 0 ELSE 1 END,
        nombre ASC
    `)

    console.log(`ISAPREs encontradas: ${result.rows.length}`)
    
    return NextResponse.json({
      success: true,
      data: result.rows
    })
  } catch (error) {
    console.error('Error al obtener ISAPREs:', error)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Error desconocido'
    }, { status: 500 })
  }
} 