import { NextResponse } from 'next/server'
import { query } from '@/lib/database'

interface ColumnInfo {
  column_name: string
  data_type: string
  is_nullable: string
  column_default: string | null
  character_maximum_length: number | null
  numeric_precision: number | null
  numeric_scale: number | null
}

interface PrimaryKey {
  column_name: string
  constraint_name: string
}

interface ForeignKey {
  column_name: string
  constraint_name: string
  foreign_table_name: string
  foreign_column_name: string
}

interface Index {
  index_name: string
  column_name: string
  is_unique: boolean
  index_type: string
}

interface TableStructure {
  table_name: string
  table_type: string
  record_count: number
  columns: ColumnInfo[]
  primary_keys: PrimaryKey[]
  foreign_keys: ForeignKey[]
  indexes: Index[]
}

export async function GET() {
  try {
    // Obtener todas las tablas
    const tablesResult = await query(`
      SELECT table_name, table_type 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
      ORDER BY table_name
    `)

    const tableStructures: TableStructure[] = []

    // Para cada tabla, obtener información detallada
    for (const table of tablesResult.rows) {
      const tableName = table.table_name

      // Obtener conteo de registros
      let recordCount = 0
      try {
        const countResult = await query(`SELECT COUNT(*) as count FROM ${tableName}`)
        recordCount = parseInt(countResult.rows[0]?.count || '0')
      } catch (error) {
        console.warn(`No se pudo contar registros en tabla ${tableName}:`, error)
      }

      // Obtener información de columnas
      const columnsResult = await query(`
        SELECT 
          column_name,
          data_type,
          is_nullable,
          column_default,
          character_maximum_length,
          numeric_precision,
          numeric_scale
        FROM information_schema.columns 
        WHERE table_name = $1 AND table_schema = 'public'
        ORDER BY ordinal_position
      `, [tableName])

      // Obtener claves primarias
      const primaryKeysResult = await query(`
        SELECT 
          kcu.column_name,
          tc.constraint_name
        FROM information_schema.table_constraints tc
        JOIN information_schema.key_column_usage kcu 
          ON tc.constraint_name = kcu.constraint_name
        WHERE tc.table_name = $1 
          AND tc.table_schema = 'public'
          AND tc.constraint_type = 'PRIMARY KEY'
        ORDER BY kcu.ordinal_position
      `, [tableName])

      // Obtener claves foráneas
      const foreignKeysResult = await query(`
        SELECT 
          kcu.column_name,
          tc.constraint_name,
          ccu.table_name AS foreign_table_name,
          ccu.column_name AS foreign_column_name
        FROM information_schema.table_constraints tc
        JOIN information_schema.key_column_usage kcu 
          ON tc.constraint_name = kcu.constraint_name
        JOIN information_schema.constraint_column_usage ccu 
          ON ccu.constraint_name = tc.constraint_name
        WHERE tc.table_name = $1 
          AND tc.table_schema = 'public'
          AND tc.constraint_type = 'FOREIGN KEY'
        ORDER BY kcu.ordinal_position
      `, [tableName])

      // Obtener índices
      const indexesResult = await query(`
        SELECT 
          i.relname AS index_name,
          a.attname AS column_name,
          ix.indisunique AS is_unique,
          am.amname AS index_type
        FROM pg_class t
        JOIN pg_index ix ON t.oid = ix.indrelid
        JOIN pg_class i ON i.oid = ix.indexrelid
        JOIN pg_am am ON i.relam = am.oid
        JOIN pg_attribute a ON a.attrelid = t.oid AND a.attnum = ANY(ix.indkey)
        WHERE t.relname = $1
          AND t.relkind = 'r'
          AND NOT ix.indisprimary
        ORDER BY i.relname, a.attnum
      `, [tableName])

      tableStructures.push({
        table_name: tableName,
        table_type: table.table_type,
        record_count: recordCount,
        columns: columnsResult.rows,
        primary_keys: primaryKeysResult.rows,
        foreign_keys: foreignKeysResult.rows,
        indexes: indexesResult.rows
      })
    }

    // Analizar relaciones entre tablas
    const allForeignKeys = tableStructures.flatMap(table => 
      table.foreign_keys.map(fk => ({
        source_table: table.table_name,
        source_column: fk.column_name,
        target_table: fk.foreign_table_name,
        target_column: fk.foreign_column_name,
        constraint_name: fk.constraint_name
      }))
    )

    return NextResponse.json({
      database_info: {
        total_tables: tableStructures.length,
        total_relationships: allForeignKeys.length,
        timestamp: new Date().toISOString()
      },
      tables: tableStructures,
      relationships: allForeignKeys
    })

  } catch (error) {
    console.error('Error obteniendo información de la base de datos:', error)
    
    return NextResponse.json(
      { 
        error: 'Error al obtener información de la base de datos',
        details: error instanceof Error ? error.message : 'Error desconocido',
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    )
  }
}

 