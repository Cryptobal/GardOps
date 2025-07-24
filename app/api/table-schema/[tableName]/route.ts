import { NextRequest, NextResponse } from 'next/server'
import { getTableSchema } from '@/lib/database'

export async function GET(
  request: NextRequest,
  { params }: { params: { tableName: string } }
) {
  try {
    const { tableName } = params
    
    // Validar el nombre de la tabla para seguridad
    if (!/^[a-zA-Z0-9_]+$/.test(tableName)) {
      return NextResponse.json(
        { error: 'Nombre de tabla inválido' },
        { status: 400 }
      )
    }

    // Obtener esquema de la tabla
    const schema = await getTableSchema(tableName)

    if (schema.length === 0) {
      return NextResponse.json(
        { error: `La tabla "${tableName}" no existe` },
        { status: 404 }
      )
    }

    return NextResponse.json({
      tableName,
      schema,
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    console.error(`Error obteniendo esquema de tabla ${params.tableName}:`, error)
    
    return NextResponse.json(
      { 
        error: 'Error al obtener esquema de la tabla',
        details: error instanceof Error ? error.message : 'Error desconocido',
        tableName: params.tableName
      },
      { status: 500 }
    )
  }
} 