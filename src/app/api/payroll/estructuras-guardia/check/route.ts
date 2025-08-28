import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@vercel/postgres';

// GET - Verificar si las tablas existen
export async function GET(request: NextRequest) {
  try {
    // Verificar si la tabla principal existe
    const checkMainTable = await sql`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'sueldo_estructura_guardia'
      )
    `;

    const mainTableExists = checkMainTable.rows[0]?.exists;

    // Verificar si la tabla de ítems existe
    const checkItemsTable = await sql`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'sueldo_estructura_guardia_item'
      )
    `;

    const itemsTableExists = checkItemsTable.rows[0]?.exists;

    return NextResponse.json({
      success: true,
      data: {
        mainTable: mainTableExists,
        itemsTable: itemsTableExists,
        bothExist: mainTableExists && itemsTableExists
      }
    });

  } catch (error) {
    console.error('Error al verificar tablas:', error);
    return NextResponse.json(
      { success: false, error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}

