import { NextRequest, NextResponse } from 'next/server'
import { 
  getTableDataWithRelationsAndStatus, 
  getTableCount,
  getTableSchema,
  insertRecord,
  updateRecord,
  inactivateRecord,
  deleteRecord,
  query 
} from '@/lib/database'

export async function GET(
  request: NextRequest,
  { params }: { params: { tableName: string } }
) {
  try {
    const { tableName } = params
    const { searchParams } = new URL(request.url)
    const limit = parseInt(searchParams.get('limit') || '10')
    const offset = parseInt(searchParams.get('offset') || '0')
    const showInactive = searchParams.get('showInactive') === 'true'

    // Validar el nombre de la tabla para seguridad
    if (!/^[a-zA-Z0-9_]+$/.test(tableName)) {
      return NextResponse.json(
        { error: 'Nombre de tabla inválido' },
        { status: 400 }
      )
    }

    // Obtener estructura de la tabla
    const columnsResult = await query(`
      SELECT column_name, data_type, is_nullable, column_default
      FROM information_schema.columns 
      WHERE table_name = $1 AND table_schema = 'public'
      ORDER BY ordinal_position
    `, [tableName])

    // Obtener datos de la tabla con relaciones y filtro por estado
    const data = await getTableDataWithRelationsAndStatus(tableName, limit, offset, showInactive)

    // Obtener conteo total con filtro de estado
    const total = await getTableCount(tableName, showInactive)

    return NextResponse.json({
      tableName,
      columns: columnsResult.rows,
      data,
      pagination: {
        limit,
        offset,
        total,
        hasMore: offset + limit < total
      },
      showInactive,
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    console.error(`Error obteniendo datos de tabla ${params.tableName}:`, error)
    
    return NextResponse.json(
      { 
        error: 'Error al obtener datos de la tabla',
        details: error instanceof Error ? error.message : 'Error desconocido',
        tableName: params.tableName
      },
      { status: 500 }
    )
  }
}

// Crear nuevo registro
export async function POST(
  request: NextRequest,
  { params }: { params: { tableName: string } }
) {
  try {
    const { tableName } = params
    const data = await request.json()

    // Validar el nombre de la tabla para seguridad
    if (!/^[a-zA-Z0-9_]+$/.test(tableName)) {
      return NextResponse.json(
        { error: 'Nombre de tabla inválido' },
        { status: 400 }
      )
    }

    const result = await insertRecord(tableName, data)

    return NextResponse.json({
      success: true,
      message: 'Registro creado exitosamente',
      data: result,
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    console.error(`Error creando registro en tabla ${params.tableName}:`, error)
    
    return NextResponse.json(
      { 
        error: 'Error al crear registro',
        details: error instanceof Error ? error.message : 'Error desconocido',
        tableName: params.tableName
      },
      { status: 500 }
    )
  }
}

// Actualizar registro
export async function PUT(
  request: NextRequest,
  { params }: { params: { tableName: string } }
) {
  try {
    const { tableName } = params
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')
    
    if (!id) {
      return NextResponse.json(
        { error: 'ID requerido para actualizar' },
        { status: 400 }
      )
    }

    const data = await request.json()

    // Validar el nombre de la tabla para seguridad
    if (!/^[a-zA-Z0-9_]+$/.test(tableName)) {
      return NextResponse.json(
        { error: 'Nombre de tabla inválido' },
        { status: 400 }
      )
    }

    const result = await updateRecord(tableName, id, data)

    return NextResponse.json({
      success: true,
      message: 'Registro actualizado exitosamente',
      data: result,
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    console.error(`Error actualizando registro en tabla ${params.tableName}:`, error)
    
    return NextResponse.json(
      { 
        error: 'Error al actualizar registro',
        details: error instanceof Error ? error.message : 'Error desconocido',
        tableName: params.tableName
      },
      { status: 500 }
    )
  }
}

// Inactivar o eliminar registro
export async function PATCH(
  request: NextRequest,
  { params }: { params: { tableName: string } }
) {
  try {
    const { tableName } = params
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')
    const action = searchParams.get('action') // 'inactivate' o 'delete'
    
    if (!id) {
      return NextResponse.json(
        { error: 'ID requerido para la operación' },
        { status: 400 }
      )
    }

    // Validar el nombre de la tabla para seguridad
    if (!/^[a-zA-Z0-9_]+$/.test(tableName)) {
      return NextResponse.json(
        { error: 'Nombre de tabla inválido' },
        { status: 400 }
      )
    }

    let result
    let message

    if (action === 'inactivate') {
      result = await inactivateRecord(tableName, id)
      message = 'Registro inactivado exitosamente'
    } else if (action === 'delete') {
      result = await deleteRecord(tableName, id)
      message = 'Registro eliminado exitosamente'
    } else {
      return NextResponse.json(
        { error: 'Acción no válida. Use "inactivate" o "delete"' },
        { status: 400 }
      )
    }

    return NextResponse.json({
      success: true,
      message,
      data: result,
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    console.error(`Error en operación PATCH para tabla ${params.tableName}:`, error)
    
    return NextResponse.json(
      { 
        error: 'Error en la operación',
        details: error instanceof Error ? error.message : 'Error desconocido',
        tableName: params.tableName
      },
      { status: 500 }
    )
  }
}

// Eliminar registro (método DELETE)
export async function DELETE(
  request: NextRequest,
  { params }: { params: { tableName: string } }
) {
  try {
    const { tableName } = params
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')
    
    if (!id) {
      return NextResponse.json(
        { error: 'ID requerido para eliminar' },
        { status: 400 }
      )
    }

    // Validar el nombre de la tabla para seguridad
    if (!/^[a-zA-Z0-9_]+$/.test(tableName)) {
      return NextResponse.json(
        { error: 'Nombre de tabla inválido' },
        { status: 400 }
      )
    }

    const result = await deleteRecord(tableName, id)

    return NextResponse.json({
      success: true,
      message: 'Registro eliminado exitosamente',
      data: result,
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    console.error(`Error eliminando registro en tabla ${params.tableName}:`, error)
    
    return NextResponse.json(
      { 
        error: 'Error al eliminar registro',
        details: error instanceof Error ? error.message : 'Error desconocido',
        tableName: params.tableName
      },
      { status: 500 }
    )
  }
} 