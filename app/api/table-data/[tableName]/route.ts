import { NextRequest, NextResponse } from 'next/server'
import { query, getTableDataWithRelationsAndStatus } from '@/lib/database'

export async function GET(
  request: NextRequest,
  { params }: { params: { tableName: string } }
) {
  try {
    const { searchParams } = new URL(request.url)
    const limit = parseInt(searchParams.get('limit') || '10')
    const offset = parseInt(searchParams.get('offset') || '0')
    const showInactive = searchParams.get('showInactive') === 'true'
    
    // Parámetros especiales para filtros
    const instalacionId = searchParams.get('instalacion_id')
    const { tableName } = params

    console.log(`Fetching data for table: ${tableName}`)

    let data: any[] = []
    let total = 0

    // Manejo especial para asignaciones operativas con filtro de instalación
    if (tableName === 'asignaciones_operativas' && instalacionId) {
      const result = await query(`
        SELECT asignaciones_operativas.*, 
               puestos_operativos.nombre as puesto_operativo_id_name,
               roles_servicio.nombre as rol_servicio_id_name
        FROM asignaciones_operativas
        LEFT JOIN puestos_operativos ON asignaciones_operativas.puesto_operativo_id = puestos_operativos.id
        LEFT JOIN roles_servicio ON asignaciones_operativas.rol_servicio_id = roles_servicio.id
        WHERE asignaciones_operativas.instalacion_id = $1
        ORDER BY asignaciones_operativas.created_at DESC
        LIMIT $2 OFFSET $3
      `, [instalacionId, limit, offset])
      
      data = result.rows
      
      const countResult = await query(`
        SELECT COUNT(*) as total 
        FROM asignaciones_operativas 
        WHERE instalacion_id = $1
      `, [instalacionId])
      
      total = parseInt(countResult.rows[0].total)
    } 
    // Manejo especial para guardias asignados con filtro de asignación
    else if (tableName === 'guardias_asignados') {
      const asignacionId = searchParams.get('asignacion_id')
      
      let whereClause = ''
      let params: any[] = [limit, offset]
      
      if (asignacionId) {
        whereClause = 'WHERE guardias_asignados.asignacion_operativa_id = $3'
        params = [limit, offset, asignacionId]
      }
      
      const result = await query(`
        SELECT guardias_asignados.*, 
               guardias.nombre as guardia_id_name
        FROM guardias_asignados
        LEFT JOIN guardias ON guardias_asignados.guardia_id = guardias.id
        ${whereClause}
        ORDER BY guardias_asignados.created_at DESC
        LIMIT $1 OFFSET $2
      `, params)
      
      data = result.rows
      
      const countParams = asignacionId ? [asignacionId] : []
      const countResult = await query(`
        SELECT COUNT(*) as total 
        FROM guardias_asignados 
        ${asignacionId ? 'WHERE asignacion_operativa_id = $1' : ''}
      `, countParams)
      
      total = parseInt(countResult.rows[0].total)
    }
    // Manejo especial para PPC registros con filtros múltiples
    else if (tableName === 'ppc_registros') {
      const estado = searchParams.get('estado')
      const fechaDesde = searchParams.get('fecha_desde')
      const fechaHasta = searchParams.get('fecha_hasta')
      
      let whereConditions: string[] = []
      let params: any[] = []
      let paramIndex = 1
      
      if (instalacionId && instalacionId !== 'all') {
        whereConditions.push(`ppc_registros.instalacion_id = $${paramIndex}`)
        params.push(instalacionId)
        paramIndex++
      }
      
      if (estado && estado !== 'todos') {
        whereConditions.push(`ppc_registros.estado = $${paramIndex}`)
        params.push(estado)
        paramIndex++
      }
      
      if (fechaDesde) {
        whereConditions.push(`ppc_registros.fecha_creacion >= $${paramIndex}`)
        params.push(fechaDesde)
        paramIndex++
      }
      
      if (fechaHasta) {
        whereConditions.push(`ppc_registros.fecha_creacion <= $${paramIndex}`)
        params.push(fechaHasta)
        paramIndex++
      }
      
      const whereClause = whereConditions.length > 0 
        ? `WHERE ${whereConditions.join(' AND ')}`
        : ''
      
      const result = await query(`
        SELECT ppc_registros.*, 
               instalaciones.nombre as instalacion_id_name,
               puestos_operativos.nombre as puesto_operativo_id_name,
               roles_servicio.nombre as rol_servicio_id_name
        FROM ppc_registros
        LEFT JOIN instalaciones ON ppc_registros.instalacion_id = instalaciones.id
        LEFT JOIN puestos_operativos ON ppc_registros.puesto_operativo_id = puestos_operativos.id
        LEFT JOIN roles_servicio ON ppc_registros.rol_servicio_id = roles_servicio.id
        ${whereClause}
        ORDER BY ppc_registros.fecha_creacion DESC, ppc_registros.created_at DESC
        LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
      `, [...params, limit, offset])
      
      data = result.rows
      
      const countResult = await query(`
        SELECT COUNT(*) as total 
        FROM ppc_registros 
        ${whereClause}
      `, params)
      
      total = parseInt(countResult.rows[0].total)
    }
    // Usar el método estándar para otras tablas
    else {
      data = await getTableDataWithRelationsAndStatus(tableName, limit, offset, showInactive)
      
      // Obtener total con filtro de estado
      const hasStatusColumn = await hasColumn(tableName, 'estado')
      
      let countSql = `SELECT COUNT(*) as total FROM ${tableName}`
      let countParams: any[] = []
      
      if (hasStatusColumn && !showInactive) {
        // Mapeo específico de valores de estado por tabla
        const stateValues: { [key: string]: { active: string; inactive: string } } = {
          'instalaciones': { active: 'Activa', inactive: 'Inactiva' },
          'default': { active: 'Activo', inactive: 'Inactivo' }
        }
        
        const tableStates = stateValues[tableName] || stateValues['default']
        countSql += ` WHERE estado = $1`
        countParams = [tableStates.active]
      }
      
      const countResult = await query(countSql, countParams)
      total = parseInt(countResult.rows[0].total)
    }

    return NextResponse.json({
      success: true,
      data,
      total,
      limit,
      offset
    })

  } catch (error) {
    console.error('Error fetching table data:', error)
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Error desconocido',
        data: [],
        total: 0
      },
      { status: 500 }
    )
  }
}

// Función auxiliar para verificar si una tabla tiene una columna específica
async function hasColumn(tableName: string, columnName: string): Promise<boolean> {
  try {
    const result = await query(`
      SELECT column_name
      FROM information_schema.columns 
      WHERE table_name = $1 AND table_schema = 'public' AND column_name = $2
    `, [tableName, columnName])
    
    return result.rows.length > 0
  } catch (error) {
    console.error('Error checking column existence:', error)
    return false
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: { tableName: string } }
) {
  try {
    const { tableName } = params
    const body = await request.json()

    console.log(`Creating record in table: ${tableName}`, body)

    // Validar datos requeridos para cada tabla
    if (tableName === 'asignaciones_operativas') {
      const { instalacion_id, puesto_operativo_id, rol_servicio_id, cantidad_guardias } = body
      
      if (!instalacion_id || !puesto_operativo_id || !rol_servicio_id || !cantidad_guardias) {
        return NextResponse.json(
          { success: false, error: 'Todos los campos son requeridos para asignaciones operativas' },
          { status: 400 }
        )
      }

      // Verificar que no existe ya esta combinación
      const existingResult = await query(`
        SELECT id FROM asignaciones_operativas 
        WHERE instalacion_id = $1 AND puesto_operativo_id = $2 AND rol_servicio_id = $3
      `, [instalacion_id, puesto_operativo_id, rol_servicio_id])

      if (existingResult.rows.length > 0) {
        return NextResponse.json(
          { success: false, error: 'Ya existe una asignación para esta combinación de instalación, puesto y rol' },
          { status: 400 }
        )
      }

      const result = await query(`
        INSERT INTO asignaciones_operativas (instalacion_id, puesto_operativo_id, rol_servicio_id, cantidad_guardias, created_at, updated_at)
        VALUES ($1, $2, $3, $4, $5, $6)
        RETURNING *
      `, [instalacion_id, puesto_operativo_id, rol_servicio_id, cantidad_guardias, new Date(), new Date()])

      // Crear automáticamente los guardias asignados en blanco
      const asignacionId = result.rows[0].id
      for (let i = 0; i < cantidad_guardias; i++) {
        await query(`
          INSERT INTO guardias_asignados (asignacion_operativa_id, estado, created_at, updated_at)
          VALUES ($1, 'pendiente', $2, $3)
        `, [asignacionId, new Date(), new Date()])
      }

      // Crear automáticamente los registros PPC
      for (let i = 0; i < cantidad_guardias; i++) {
        await query(`
          INSERT INTO ppc_registros (instalacion_id, puesto_operativo_id, rol_servicio_id, asignacion_operativa_id, estado, fecha_creacion, created_at, updated_at)
          VALUES ($1, $2, $3, $4, 'pendiente', $5, $6, $7)
        `, [instalacion_id, puesto_operativo_id, rol_servicio_id, asignacionId, new Date(), new Date(), new Date()])
      }

      return NextResponse.json({
        success: true,
        data: result.rows[0],
        message: 'Asignación operativa creada exitosamente'
      })
    }

    // Manejo estándar para otras tablas
    const columns = Object.keys(body).filter(key => key !== 'id')
    const values = columns.map(column => body[column])
    const placeholders = columns.map((_, index) => `$${index + 1}`).join(', ')
    
    // Agregar campos de auditoría si no están presentes
    if (!body.created_at && !columns.includes('created_at')) {
      columns.push('created_at')
      values.push(new Date())
    }
    if (!body.updated_at && !columns.includes('updated_at')) {
      columns.push('updated_at')
      values.push(new Date())
    }

    const sql = `
      INSERT INTO ${tableName} (${columns.join(', ')})
      VALUES (${placeholders})
      RETURNING *
    `

    const result = await query(sql, values)

    return NextResponse.json({
      success: true,
      data: result.rows[0],
      message: 'Registro creado exitosamente'
    })

  } catch (error) {
    console.error('Error creating record:', error)
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Error desconocido' 
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
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')
    const body = await request.json()

    if (!id) {
      return NextResponse.json(
        { success: false, error: 'ID es requerido para actualizar' },
        { status: 400 }
      )
    }

    console.log(`Updating record in table: ${tableName}`, { id, body })

    const columns = Object.keys(body).filter(key => key !== 'id')
    const values = columns.map(column => body[column])
    const setClause = columns.map((column, index) => `${column} = $${index + 1}`).join(', ')
    
    // Agregar updated_at si no está presente
    if (!body.updated_at && !columns.includes('updated_at')) {
      columns.push('updated_at')
      values.push(new Date())
      const setClauseWithUpdate = setClause + (setClause ? ', ' : '') + `updated_at = $${values.length}`
    }

    const sql = `
      UPDATE ${tableName} 
      SET ${setClause}${!columns.includes('updated_at') ? ', updated_at = $' + (values.length + 1) : ''}
      WHERE id = $${values.length + (!columns.includes('updated_at') ? 2 : 1)}
      RETURNING *
    `

    const finalValues = [...values]
    if (!columns.includes('updated_at')) {
      finalValues.push(new Date())
    }
    finalValues.push(id)

    const result = await query(sql, finalValues)

    if (result.rows.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Registro no encontrado' },
        { status: 404 }
      )
    }

    return NextResponse.json({
      success: true,
      data: result.rows[0],
      message: 'Registro actualizado exitosamente'
    })

  } catch (error) {
    console.error('Error updating record:', error)
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Error desconocido' 
      },
      { status: 500 }
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

    if (!id) {
      return NextResponse.json(
        { success: false, error: 'ID es requerido para eliminar' },
        { status: 400 }
      )
    }

    console.log(`Deleting record from table: ${tableName}`, { id })

    // Para asignaciones operativas, primero eliminar los guardias asignados relacionados
    if (tableName === 'asignaciones_operativas') {
      await query(`
        DELETE FROM guardias_asignados 
        WHERE asignacion_operativa_id = $1
      `, [id])
    }

    // Para guardias_asignados, permitir eliminar por asignacion_operativa_id
    if (tableName === 'guardias_asignados') {
      const asignacionOperativaId = searchParams.get('asignacion_operativa_id')
      if (asignacionOperativaId) {
        await query(`
          DELETE FROM guardias_asignados 
          WHERE asignacion_operativa_id = $1
        `, [asignacionOperativaId])
        
        return NextResponse.json({
          success: true,
          message: 'Guardias asignados eliminados exitosamente'
        })
      }
    }

    const sql = `
      DELETE FROM ${tableName} 
      WHERE id = $1
      RETURNING *
    `

    const result = await query(sql, [id])

    if (result.rows.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Registro no encontrado' },
        { status: 404 }
      )
    }

    return NextResponse.json({
      success: true,
      data: result.rows[0],
      message: 'Registro eliminado exitosamente'
    })

  } catch (error) {
    console.error('Error deleting record:', error)
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Error desconocido' 
      },
      { status: 500 }
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

    if (!id) {
      return NextResponse.json(
        { success: false, error: 'ID es requerido' },
        { status: 400 }
      )
    }

    console.log(`PATCH action: ${action} for table: ${tableName}`, { id })

    if (action === 'inactivate') {
      // Determinar el valor correcto de estado inactivo según la tabla
      const stateValues: { [key: string]: { active: string; inactive: string } } = {
        'instalaciones': { active: 'Activa', inactive: 'Inactiva' },
        'default': { active: 'Activo', inactive: 'Inactivo' }
      }
      
      const tableStates = stateValues[tableName] || stateValues['default']
      
      const sql = `
        UPDATE ${tableName} 
        SET estado = $1, updated_at = $2
        WHERE id = $3
        RETURNING *
      `

      const result = await query(sql, [tableStates.inactive, new Date(), id])

      if (result.rows.length === 0) {
        return NextResponse.json(
          { success: false, error: 'Registro no encontrado' },
          { status: 404 }
        )
      }

      return NextResponse.json({
        success: true,
        data: result.rows[0],
        message: 'Registro inactivado exitosamente'
      })
    }

    return NextResponse.json(
      { success: false, error: 'Acción no reconocida' },
      { status: 400 }
    )

  } catch (error) {
    console.error('Error in PATCH operation:', error)
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Error desconocido' 
      },
      { status: 500 }
    )
  }
} 