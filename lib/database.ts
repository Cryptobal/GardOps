import { Pool } from 'pg'

// Configuración del pool de conexiones
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false
  },
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
})

// Función para ejecutar consultas
export async function query(text: string, params?: any[]) {
  const start = Date.now()
  try {
    const res = await pool.query(text, params)
    const duration = Date.now() - start
    console.log('Consulta ejecutada:', { text, duration, rows: res.rowCount })
    return res
  } catch (error) {
    console.error('Error en la consulta:', error)
    throw error
  }
}

// Función para obtener información de la base de datos
export async function getDatabaseInfo() {
  try {
    // Obtener información básica de la base de datos
    const versionResult = await query('SELECT version()')
    const tablesResult = await query(`
      SELECT table_name, table_type 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
      ORDER BY table_name
    `)
    
    // Obtener estadísticas de conexión
    const connectionsResult = await query(`
      SELECT 
        count(*) as total_connections,
        count(*) FILTER (WHERE state = 'active') as active_connections,
        count(*) FILTER (WHERE state = 'idle') as idle_connections
      FROM pg_stat_activity 
      WHERE datname = current_database()
    `)

    return {
      version: versionResult.rows[0]?.version || 'No disponible',
      tables: tablesResult.rows || [],
      connections: connectionsResult.rows[0] || {
        total_connections: 0,
        active_connections: 0,
        idle_connections: 0
      }
    }
  } catch (error) {
    console.error('Error obteniendo información de la base de datos:', error)
    return {
      version: 'Error al conectar',
      tables: [],
      connections: {
        total_connections: 0,
        active_connections: 0,
        idle_connections: 0
      }
    }
  }
}

// Función para obtener datos de una tabla específica
export async function getTableData(tableName: string, limit: number = 10) {
  try {
    const result = await query(`SELECT * FROM ${tableName} LIMIT $1`, [limit])
    return result.rows
  } catch (error) {
    console.error(`Error obteniendo datos de la tabla ${tableName}:`, error)
    return []
  }
}

// Función para obtener datos con relaciones expandidas
export async function getTableDataWithRelations(tableName: string, limit: number = 10, offset: number = 0) {
  try {
    // Mapeo de relaciones conocidas
    const relationMappings: { [key: string]: { table: string, nameField: string } } = {
      'instalacion_id': { table: 'instalaciones', nameField: 'nombre' },
      'cliente_id': { table: 'clientes', nameField: 'nombre' },
      'guardia_id': { table: 'guardias', nameField: 'nombre' },
      'usuario_id': { table: 'usuarios', nameField: 'nombre' },
      'empresa_id': { table: 'empresas', nameField: 'nombre' },
      'puesto_id': { table: 'puestos_operativos', nameField: 'nombre' },
      'puesto_operativo_id': { table: 'puestos_operativos', nameField: 'nombre' },
      'turno_id': { table: 'turnos', nameField: 'nombre' },
      'rol_id': { table: 'roles_servicio', nameField: 'nombre' },
      'rol_servicio_id': { table: 'roles_servicio', nameField: 'nombre' },
      'pauta_id': { table: 'pautas_operativas', nameField: 'nombre' },
      'asignacion_operativa_id': { table: 'asignaciones_operativas', nameField: 'id' },
      'guardia_asignado_id': { table: 'guardias_asignados', nameField: 'id' }
    }

    // Obtener columnas de la tabla
    const columnsResult = await query(`
      SELECT column_name, data_type
      FROM information_schema.columns 
      WHERE table_name = $1 AND table_schema = 'public'
      ORDER BY ordinal_position
    `, [tableName])

    const columns = columnsResult.rows
    
    // Construir consulta con JOINs para relaciones
    let selectFields = [`${tableName}.*`]
    let joinClauses = []
    
    for (const column of columns) {
      const columnName = column.column_name
      if (relationMappings[columnName]) {
        const relation = relationMappings[columnName]
        const alias = `${columnName}_name`
        selectFields.push(`${relation.table}.${relation.nameField} as ${alias}`)
        joinClauses.push(`LEFT JOIN ${relation.table} ON ${tableName}.${columnName} = ${relation.table}.id`)
      }
    }

    const sql = `
      SELECT ${selectFields.join(', ')}
      FROM ${tableName}
      ${joinClauses.join(' ')}
      LIMIT $1 OFFSET $2
    `

    const result = await query(sql, [limit, offset])
    return result.rows
  } catch (error) {
    console.error(`Error obteniendo datos con relaciones de tabla ${tableName}:`, error)
    // Si falla el JOIN, usar consulta simple como fallback
    return getTableData(tableName, limit)
  }
}

// Función auxiliar para verificar si una tabla tiene una columna específica
async function hasColumn(tableName: string, columnName: string): Promise<boolean> {
  try {
    const sql = `
      SELECT column_name
      FROM information_schema.columns 
      WHERE table_name = $1 AND table_schema = 'public' AND column_name = $2
    `
    const result = await query(sql, [tableName, columnName])
    return result.rows.length > 0
  } catch (error) {
    console.error(`Error checking column ${columnName} in table ${tableName}:`, error)
    return false
  }
}

// Función para obtener datos de tabla con relaciones y filtro de estado
export async function getTableDataWithRelationsAndStatus(
  tableName: string,
  limit: number = 10,
  offset: number = 0,
  showInactive: boolean = false
) {
  try {
    // Verificar si la tabla tiene columna estado
    const hasStatusColumn = await hasColumn(tableName, 'estado')
    
    if (!hasStatusColumn) {
      // Si no tiene columna estado, usar la función original
      return await getTableDataWithRelations(tableName, limit, offset)
    }

    // Mapeo específico de valores de estado por tabla
    const stateValues: { [key: string]: { active: string; inactive: string } } = {
      'instalaciones': { active: 'Activa', inactive: 'Inactiva' },
      // Para el resto de tablas usar los valores por defecto
      'default': { active: 'Activo', inactive: 'Inactivo' }
    }

    const tableStates = stateValues[tableName] || stateValues['default']
    
    // Mapeo de relaciones conocidas
    const relationMappings: { [key: string]: { table: string, nameField: string } } = {
      'instalacion_id': { table: 'instalaciones', nameField: 'nombre' },
      'cliente_id': { table: 'clientes', nameField: 'nombre' },
      'guardia_id': { table: 'guardias', nameField: 'nombre' },
      'usuario_id': { table: 'usuarios', nameField: 'nombre' },
      'empresa_id': { table: 'empresas', nameField: 'nombre' },
      'puesto_id': { table: 'puestos_operativos', nameField: 'nombre' },
      'puesto_operativo_id': { table: 'puestos_operativos', nameField: 'nombre' },
      'turno_id': { table: 'turnos', nameField: 'nombre' },
      'rol_id': { table: 'roles_servicio', nameField: 'nombre' },
      'rol_servicio_id': { table: 'roles_servicio', nameField: 'nombre' },
      'pauta_id': { table: 'pautas_operativas', nameField: 'nombre' },
      'asignacion_operativa_id': { table: 'asignaciones_operativas', nameField: 'id' },
      'guardia_asignado_id': { table: 'guardias_asignados', nameField: 'id' }
    }

    // Obtener columnas de la tabla
    const columnsResult = await query(`
      SELECT column_name, data_type
      FROM information_schema.columns 
      WHERE table_name = $1 AND table_schema = 'public'
      ORDER BY ordinal_position
    `, [tableName])

    const columns = columnsResult.rows
    
    // Construir consulta con JOINs para relaciones
    let selectFields = [`${tableName}.*`]
    let joinClauses = []
    
    for (const column of columns) {
      const columnName = column.column_name
      if (relationMappings[columnName]) {
        const relation = relationMappings[columnName]
        const alias = `${columnName}_name`
        selectFields.push(`${relation.table}.${relation.nameField} as ${alias}`)
        joinClauses.push(`LEFT JOIN ${relation.table} ON ${tableName}.${columnName} = ${relation.table}.id`)
      }
    }
    
    let whereClause = ''
    if (!showInactive) {
      whereClause = `WHERE ${tableName}.estado = '${tableStates.active}'`
    }
    
    const sql = `
      SELECT ${selectFields.join(', ')}
      FROM ${tableName}
      ${joinClauses.join(' ')}
      ${whereClause}
      ORDER BY ${tableName}.created_at DESC
      LIMIT $1 OFFSET $2
    `

    const result = await query(sql, [limit, offset])
    return result.rows
  } catch (error) {
    console.error(`Error fetching table data for ${tableName}:`, error)
    throw error
  }
}

// Función para obtener datos de tabla con relaciones, filtro de estado y búsqueda
export async function getTableDataWithRelationsStatusAndSearch(
  tableName: string,
  limit: number = 10,
  offset: number = 0,
  showInactive: boolean = false,
  searchTerm: string = '',
  searchFields: string[] = []
) {
  try {
    // Verificar si la tabla tiene columna estado
    const hasStatusColumn = await hasColumn(tableName, 'estado')
    
    if (!hasStatusColumn && !searchTerm) {
      // Si no tiene columna estado y no hay búsqueda, usar la función original
      return await getTableDataWithRelations(tableName, limit, offset)
    }

    // Mapeo específico de valores de estado por tabla
    const stateValues: { [key: string]: { active: string; inactive: string } } = {
      'instalaciones': { active: 'Activa', inactive: 'Inactiva' },
      // Para el resto de tablas usar los valores por defecto
      'default': { active: 'Activo', inactive: 'Inactivo' }
    }

    const tableStates = stateValues[tableName] || stateValues['default']
    
    // Mapeo de relaciones conocidas
    const relationMappings: { [key: string]: { table: string, nameField: string } } = {
      'instalacion_id': { table: 'instalaciones', nameField: 'nombre' },
      'cliente_id': { table: 'clientes', nameField: 'nombre' },
      'guardia_id': { table: 'guardias', nameField: 'nombre' },
      'usuario_id': { table: 'usuarios', nameField: 'nombre' },
      'empresa_id': { table: 'empresas', nameField: 'nombre' },
      'puesto_id': { table: 'puestos_operativos', nameField: 'nombre' },
      'puesto_operativo_id': { table: 'puestos_operativos', nameField: 'nombre' },
      'turno_id': { table: 'turnos', nameField: 'nombre' },
      'rol_id': { table: 'roles_servicio', nameField: 'nombre' },
      'rol_servicio_id': { table: 'roles_servicio', nameField: 'nombre' },
      'pauta_id': { table: 'pautas_operativas', nameField: 'nombre' },
      'asignacion_operativa_id': { table: 'asignaciones_operativas', nameField: 'id' },
      'guardia_asignado_id': { table: 'guardias_asignados', nameField: 'id' }
    }

    // Obtener columnas de la tabla
    const columnsResult = await query(`
      SELECT column_name, data_type
      FROM information_schema.columns 
      WHERE table_name = $1 AND table_schema = 'public'
      ORDER BY ordinal_position
    `, [tableName])

    const columns = columnsResult.rows
    
    // Construir consulta con JOINs para relaciones
    let selectFields = [`${tableName}.*`]
    let joinClauses = []
    
    for (const column of columns) {
      const columnName = column.column_name
      if (relationMappings[columnName]) {
        const relation = relationMappings[columnName]
        const alias = `${columnName}_name`
        selectFields.push(`${relation.table}.${relation.nameField} as ${alias}`)
        joinClauses.push(`LEFT JOIN ${relation.table} ON ${tableName}.${columnName} = ${relation.table}.id`)
      }
    }
    
    // Construir cláusula WHERE
    let whereConditions = []
    
    if (hasStatusColumn && !showInactive) {
      whereConditions.push(`${tableName}.estado = '${tableStates.active}'`)
    }
    
    // Agregar condiciones de búsqueda
    if (searchTerm && searchFields.length > 0) {
      const searchConditions = searchFields.map(field => 
        `${tableName}.${field} ILIKE '${searchTerm}%'`
      )
      whereConditions.push(`(${searchConditions.join(' OR ')})`)
    }
    
    const whereClause = whereConditions.length > 0 
      ? `WHERE ${whereConditions.join(' AND ')}`
      : ''
    
    const sql = `
      SELECT ${selectFields.join(', ')}
      FROM ${tableName}
      ${joinClauses.join(' ')}
      ${whereClause}
      ORDER BY ${tableName}.created_at DESC
      LIMIT $1 OFFSET $2
    `

    const result = await query(sql, [limit, offset])
    return result.rows
  } catch (error) {
    console.error(`Error fetching table data for ${tableName}:`, error)
    throw error
  }
}

// Función para insertar un nuevo registro
export async function insertRecord(tableName: string, data: Record<string, any>) {
  try {
    // Validación especial para roles_servicio - verificar duplicados
    if (tableName === 'roles_servicio') {
      const duplicateCheck = await query(`
        SELECT id, nombre FROM roles_servicio 
        WHERE dias_trabajo = $1 
          AND dias_descanso = $2 
          AND hora_inicio = $3 
          AND hora_termino = $4 
          AND estado = 'Activo'
        LIMIT 1
      `, [data.dias_trabajo, data.dias_descanso, data.hora_inicio, data.hora_termino])

      if (duplicateCheck.rows.length > 0) {
        const existingRole = duplicateCheck.rows[0]
        throw new Error(`Ya existe un rol activo con estas características: "${existingRole.nombre}"`)
      }
    }

    // Agregar campos automáticos
    const recordData = {
      ...data,
      estado: data.estado || 'Activo',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }

    const columns = Object.keys(recordData)
    const values = Object.values(recordData)
    const placeholders = values.map((_, index) => `$${index + 1}`).join(', ')

    const sql = `
      INSERT INTO ${tableName} (${columns.join(', ')})
      VALUES (${placeholders})
      RETURNING *
    `

    const result = await query(sql, values)
    return result.rows[0]
  } catch (error) {
    console.error(`Error insertando registro en tabla ${tableName}:`, error)
    throw error
  }
}

// Función para actualizar un registro
export async function updateRecord(tableName: string, id: string, data: Record<string, any>) {
  try {
    // Validación especial para roles_servicio - verificar duplicados
    if (tableName === 'roles_servicio') {
      const duplicateCheck = await query(`
        SELECT id, nombre FROM roles_servicio 
        WHERE dias_trabajo = $1 
          AND dias_descanso = $2 
          AND hora_inicio = $3 
          AND hora_termino = $4 
          AND estado = 'Activo'
          AND id != $5
        LIMIT 1
      `, [data.dias_trabajo, data.dias_descanso, data.hora_inicio, data.hora_termino, id])

      if (duplicateCheck.rows.length > 0) {
        const existingRole = duplicateCheck.rows[0]
        throw new Error(`Ya existe un rol activo con estas características: "${existingRole.nombre}"`)
      }
    }

    // Agregar campo de actualización
    const recordData = {
      ...data,
      updated_at: new Date().toISOString()
    }

    const columns = Object.keys(recordData)
    const values = Object.values(recordData)
    const setClause = columns.map((col, index) => `${col} = $${index + 2}`).join(', ')

    const sql = `
      UPDATE ${tableName}
      SET ${setClause}
      WHERE id = $1
      RETURNING *
    `

    const result = await query(sql, [id, ...values])
    
    if (result.rows.length === 0) {
      throw new Error(`No se encontró el registro con ID ${id}`)
    }
    
    return result.rows[0]
  } catch (error) {
    console.error(`Error actualizando registro en tabla ${tableName}:`, error)
    throw error
  }
}

// Función para inactivar un registro (cambiar estado a inactivo)
export async function inactivateRecord(tableName: string, id: string) {
  try {
    // Mapeo específico de valores de estado por tabla
    const stateValues: { [key: string]: { active: string; inactive: string } } = {
      'instalaciones': { active: 'Activa', inactive: 'Inactiva' },
      // Para el resto de tablas usar los valores por defecto
      'default': { active: 'Activo', inactive: 'Inactivo' }
    }

    const tableStates = stateValues[tableName] || stateValues['default']
    
    const sql = `
      UPDATE ${tableName}
      SET estado = '${tableStates.inactive}', updated_at = CURRENT_TIMESTAMP
      WHERE id = $1
      RETURNING *
    `

    const result = await query(sql, [id])
    
    if (result.rows.length === 0) {
      throw new Error(`No se encontró el registro con ID ${id}`)
    }
    
    return result.rows[0]
  } catch (error) {
    console.error(`Error inactivando registro de tabla ${tableName}:`, error)
    throw error
  }
}

// Función para eliminar un registro permanentemente
export async function deleteRecord(tableName: string, id: string) {
  try {
    const sql = `
      DELETE FROM ${tableName}
      WHERE id = $1
      RETURNING *
    `

    const result = await query(sql, [id])
    
    if (result.rows.length === 0) {
      throw new Error(`No se encontró el registro con ID ${id}`)
    }
    
    return result.rows[0]
  } catch (error) {
    console.error(`Error eliminando registro de tabla ${tableName}:`, error)
    throw error
  }
}

// Función para obtener esquema de una tabla
export async function getTableSchema(tableName: string) {
  try {
    const result = await query(`
      SELECT 
        column_name,
        data_type,
        is_nullable,
        column_default,
        character_maximum_length
      FROM information_schema.columns
      WHERE table_name = $1 AND table_schema = 'public'
      ORDER BY ordinal_position
    `, [tableName])

    return result.rows
  } catch (error) {
    console.error(`Error obteniendo esquema de tabla ${tableName}:`, error)
    throw error
  }
}

// Función para obtener el conteo de registros
export async function getTableCount(tableName: string, showInactive: boolean = false): Promise<number> {
  try {
    // Verificar si la tabla tiene columna estado
    const hasStatusColumn = await hasColumn(tableName, 'estado')
    
    if (!hasStatusColumn) {
      // Si no tiene columna estado, contar todos los registros
      const result = await query(`SELECT COUNT(*) as total FROM ${tableName}`, [])
      return parseInt(result.rows[0].total)
    }

    // Mapeo específico de valores de estado por tabla
    const stateValues: { [key: string]: { active: string; inactive: string } } = {
      'instalaciones': { active: 'Activa', inactive: 'Inactiva' },
      // Para el resto de tablas usar los valores por defecto
      'default': { active: 'Activo', inactive: 'Inactivo' }
    }

    const tableStates = stateValues[tableName] || stateValues['default']
    
    let sql: string
    if (showInactive) {
      sql = `SELECT COUNT(*) as total FROM ${tableName}`
    } else {
      sql = `SELECT COUNT(*) as total FROM ${tableName} WHERE estado = '${tableStates.active}'`
    }
    
    const result = await query(sql, [])
    return parseInt(result.rows[0].total)
  } catch (error) {
    console.error(`Error obteniendo conteo de tabla ${tableName}:`, error)
    throw error
  }
}

// Función para obtener el conteo de registros con búsqueda
export async function getTableCountWithSearch(
  tableName: string, 
  showInactive: boolean = false, 
  searchTerm: string = '', 
  searchFields: string[] = []
): Promise<number> {
  try {
    // Verificar si la tabla tiene columna estado
    const hasStatusColumn = await hasColumn(tableName, 'estado')
    
    // Mapeo específico de valores de estado por tabla
    const stateValues: { [key: string]: { active: string; inactive: string } } = {
      'instalaciones': { active: 'Activa', inactive: 'Inactiva' },
      // Para el resto de tablas usar los valores por defecto
      'default': { active: 'Activo', inactive: 'Inactivo' }
    }

    const tableStates = stateValues[tableName] || stateValues['default']
    
    // Construir cláusula WHERE
    let whereConditions = []
    
    if (hasStatusColumn && !showInactive) {
      whereConditions.push(`estado = '${tableStates.active}'`)
    }
    
    // Agregar condiciones de búsqueda
    if (searchTerm && searchFields.length > 0) {
      const searchConditions = searchFields.map(field => 
        `${field} ILIKE '${searchTerm}%'`
      )
      whereConditions.push(`(${searchConditions.join(' OR ')})`)
    }
    
    const whereClause = whereConditions.length > 0 
      ? `WHERE ${whereConditions.join(' AND ')}`
      : ''
    
    const sql = `SELECT COUNT(*) as total FROM ${tableName} ${whereClause}`
    
    const result = await query(sql, [])
    return parseInt(result.rows[0].total)
  } catch (error) {
    console.error(`Error obteniendo conteo de tabla ${tableName}:`, error)
    throw error
  }
}

// Función para cerrar el pool de conexiones
export async function closePool() {
  await pool.end()
}

export default pool 