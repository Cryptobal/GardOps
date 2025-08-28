import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@vercel/postgres';

export async function GET(request: NextRequest) {
  try {
    const result = await sql.query('SELECT COUNT(*) as count FROM sueldo_estructuras_roles');
    
    return NextResponse.json({
      success: true,
      count: result.rows[0].count
    });
  } catch (error) {
    console.error('Error:', error);
    return NextResponse.json(
      { success: false, error: String(error) },
      { status: 500 }
    );
  }
}
