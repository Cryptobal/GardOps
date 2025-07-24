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
    
    // Verificar si es un error de tabla no encontrada
    const isTableNotFound = error instanceof Error && 
      (error.message.includes('does not exist') || error.message.includes('relation'))
    
    return NextResponse.json(
      { 
        error: isTableNotFound 
          ? `La tabla "${params.tableName}" no existe en la base de datos`
          : 'Error al obtener datos de la tabla',
        details: error instanceof Error ? error.message : 'Error desconocido',
        tableName: params.tableName,
        tableNotFound: isTableNotFound
      },
      { status: isTableNotFound ? 404 : 500 }
    )
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: { tableName: string } }
) {
  try {
    const { tableName } = params
    const body = await request.json()
    
    // Validar el nombre de la tabla para seguridad
    if (!/^[a-zA-Z0-9_]+$/.test(tableName)) {
      return NextResponse.json(
        { error: 'Nombre de tabla inválido' },
        { status: 400 }
      )
    }

    // Validar que se proporcionen datos
    if (!body || Object.keys(body).length === 0) {
      return NextResponse.json(
        { error: 'No se proporcionaron datos para insertar' },
        { status: 400 }
      )
    }

    // Insertar el registro
    const newRecord = await insertRecord(tableName, body)

    return NextResponse.json({
      message: 'Registro creado exitosamente',
      tableName,
      data: newRecord
    }, { status: 201 })

  } catch (error) {
    console.error(`Error en POST para tabla ${params.tableName}:`, error)
    
    return NextResponse.json(
      { 
        error: 'Error al crear el registro',
        details: error instanceof Error ? error.message : 'Error desconocido',
        tableName: params.tableName
      },
      { status: 500 }
    )
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { tableName: string } }
) {
  try {
    const { tableName } = params
    const body = await request.json()
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')
    
    // Validar el nombre de la tabla para seguridad
    if (!/^[a-zA-Z0-9_]+$/.test(tableName)) {
      return NextResponse.json(
        { error: 'Nombre de tabla inválido' },
        { status: 400 }
      )
    }

    // Validar que se proporcione el ID
    if (!id) {
      return NextResponse.json(
        { error: 'ID del registro es requerido' },
        { status: 400 }
      )
    }

    // Validar que se proporcionen datos
    if (!body || Object.keys(body).length === 0) {
      return NextResponse.json(
        { error: 'No se proporcionaron datos para actualizar' },
        { status: 400 }
      )
    }

    // Actualizar el registro
    const updatedRecord = await updateRecord(tableName, id, body)

    return NextResponse.json({
      message: 'Registro actualizado exitosamente',
      tableName,
      data: updatedRecord
    })

  } catch (error) {
    console.error(`Error en PUT para tabla ${params.tableName}:`, error)
    
    const isNotFound = error instanceof Error && error.message.includes('No se encontró')
    
    return NextResponse.json(
      { 
        error: isNotFound ? 'Registro no encontrado' : 'Error al actualizar el registro',
        details: error instanceof Error ? error.message : 'Error desconocido',
        tableName: params.tableName
      },
      { status: isNotFound ? 404 : 500 }
    )
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { tableName: string } }
) {
  try {
    const { tableName } = params
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')
    const action = searchParams.get('action')
    
    // Validar el nombre de la tabla para seguridad
    if (!/^[a-zA-Z0-9_]+$/.test(tableName)) {
      return NextResponse.json(
        { error: 'Nombre de tabla inválido' },
        { status: 400 }
      )
    }

    // Validar que se proporcione el ID
    if (!id) {
      return NextResponse.json(
        { error: 'ID del registro es requerido' },
        { status: 400 }
      )
    }

    // Si la acción es inactivar
    if (action === 'inactivate') {
      const inactivatedRecord = await inactivateRecord(tableName, id)
      
      return NextResponse.json({
        message: 'Registro inactivado exitosamente',
        tableName,
        data: inactivatedRecord
      })
    }

    // Para otros tipos de PATCH (actualizaciones parciales)
    const body = await request.json()
    
    if (!body || Object.keys(body).length === 0) {
      return NextResponse.json(
        { error: 'No se proporcionaron datos para actualizar' },
        { status: 400 }
      )
    }

    const updatedRecord = await updateRecord(tableName, id, body)

    return NextResponse.json({
      message: 'Registro actualizado exitosamente',
      tableName,
      data: updatedRecord
    })

  } catch (error) {
    console.error(`Error en PATCH para tabla ${params.tableName}:`, error)
    
    const isNotFound = error instanceof Error && error.message.includes('No se encontró')
    
    return NextResponse.json(
      { 
        error: isNotFound ? 'Registro no encontrado' : 'Error al procesar la solicitud',
        details: error instanceof Error ? error.message : 'Error desconocido',
        tableName: params.tableName
      },
      { status: isNotFound ? 404 : 500 }
    )
  }
} 

export async function DELETE(
  request: NextRequest,
  { params }: { params: { tableName: string } }
) {
  try {
    const { tableName } = params
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')
    
    // Validar el nombre de la tabla para seguridad
    if (!/^[a-zA-Z0-9_]+$/.test(tableName)) {
      return NextResponse.json(
        { error: 'Nombre de tabla inválido' },
        { status: 400 }
      )
    }

    // Validar que se proporcione el ID
    if (!id) {
      return NextResponse.json(
        { error: 'ID del registro es requerido' },
        { status: 400 }
      )
    }

    // Eliminar el registro permanentemente
    const deletedRecord = await deleteRecord(tableName, id)

    return NextResponse.json({
      message: 'Registro eliminado exitosamente',
      tableName,
      data: deletedRecord
    })

  } catch (error) {
    console.error(`Error en DELETE para tabla ${params.tableName}:`, error)
    
    const isNotFound = error instanceof Error && error.message.includes('No se encontró')
    
    return NextResponse.json(
      { 
        error: isNotFound ? 'Registro no encontrado' : 'Error al eliminar el registro',
        details: error instanceof Error ? error.message : 'Error desconocido',
        tableName: params.tableName
      },
      { status: isNotFound ? 404 : 500 }
    )
  }
} 