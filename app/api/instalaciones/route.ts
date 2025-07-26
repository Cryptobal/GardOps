import { NextRequest, NextResponse } from 'next/server'
import { query } from '@/lib/database'

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const estado = searchParams.get('estado')
    
    console.log('Obteniendo lista de instalaciones...')
    if (estado) {
      console.log(`Filtrando por estado: ${estado}`)
    }
    
    let sqlQuery = `
      SELECT 
        i.id,
        i.nombre,
        i.direccion,
        i.estado,
        i.cliente_id,
        c.nombre as cliente_nombre
      FROM instalaciones i
      LEFT JOIN clientes c ON i.cliente_id = c.id
    `
    
    const params: any[] = []
    
    if (estado) {
      sqlQuery += ` WHERE i.estado = $1`
      params.push(estado)
    }
    
    sqlQuery += ` ORDER BY i.nombre ASC`
    
    const result = await query(sqlQuery, params)

    console.log(`Instalaciones encontradas: ${result.rows.length}`)
    
    return NextResponse.json({
      success: true,
      data: result.rows
    })
  } catch (error) {
    console.error('Error al obtener instalaciones:', error)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Error desconocido'
    }, { status: 500 })
  }
} 