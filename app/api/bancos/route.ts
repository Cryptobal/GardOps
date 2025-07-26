import { NextResponse } from 'next/server'
import { query } from '@/lib/database'

export async function GET() {
  try {
    console.log('Obteniendo lista de bancos...')
    
    // Crear tabla de bancos si no existe
    await query(`
      CREATE TABLE IF NOT EXISTS public.bancos (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        nombre TEXT NOT NULL UNIQUE,
        codigo VARCHAR(3) UNIQUE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `)
    
    const result = await query(`
      SELECT id, codigo, nombre 
      FROM bancos 
      ORDER BY codigo ASC
    `)

    console.log(`Bancos encontrados: ${result.rows.length}`)
    
    return NextResponse.json({
      success: true,
      data: result.rows
    })
  } catch (error) {
    console.error('Error al obtener bancos:', error)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Error desconocido'
    }, { status: 500 })
  }
} 