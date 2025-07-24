import { NextResponse } from 'next/server'
import { query } from '@/lib/database'

export async function GET() {
  try {
    // Obtener todas las tablas públicas
    const tablesResult = await query(`
      SELECT table_name, table_type 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
      ORDER BY table_name
    `)

    const availableTables = []

    // Verificar cada tabla y contar registros
    for (const table of tablesResult.rows) {
      try {
        const countResult = await query(`SELECT COUNT(*) as count FROM ${table.table_name}`)
        const recordCount = parseInt(countResult.rows[0]?.count || '0')
        
        availableTables.push({
          table_name: table.table_name,
          table_type: table.table_type,
          record_count: recordCount,
          exists: true
        })
      } catch (error) {
        // Si la tabla no se puede consultar, la marcamos como no disponible
        availableTables.push({
          table_name: table.table_name,
          table_type: table.table_type,
          record_count: 0,
          exists: false,
          error: error instanceof Error ? error.message : 'Tabla no accesible'
        })
      }
    }

    return NextResponse.json({
      tables: availableTables,
      total_tables: availableTables.length,
      accessible_tables: availableTables.filter(t => t.exists).length,
      timestamp: new Date().toISOString()
    })
  } catch (error) {
    console.error('Error en API available-tables:', error)
    
    return NextResponse.json(
      { 
        error: 'Error al obtener tablas disponibles',
        details: error instanceof Error ? error.message : 'Error desconocido',
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    )
  }
} 