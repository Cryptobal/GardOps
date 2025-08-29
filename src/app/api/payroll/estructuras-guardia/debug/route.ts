import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@vercel/postgres';

// GET - Debug: verificar ítems disponibles
export async function GET(request: NextRequest) {
  try {
    // Verificar qué tablas de ítems existen
    const tables = await sql`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name LIKE '%item%'
      ORDER BY table_name
    `;

    const itemTables = tables.rows.map(row => row.table_name);

    // Obtener ítems de sueldo_item
    let sueldoItems: any[] = [];
    try {
      const itemsResult = await sql`SELECT * FROM sueldo_item LIMIT 10`;
      sueldoItems = itemsResult.rows;
    } catch (error) {
      console.error('Error al consultar sueldo_item:', error);
    }

    return NextResponse.json({
      success: true,
      data: {
        itemTables,
        sueldoItems
      }
    });

  } catch (error) {
    console.error('Error en debug:', error);
    return NextResponse.json(
      { success: false, error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}
