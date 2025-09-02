import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@vercel/postgres';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const rut = searchParams.get('rut');

    if (!rut) {
      return NextResponse.json(
        { error: 'RUT es requerido' },
        { status: 400 }
      );
    }

    // Limpiar RUT (remover puntos y guiones)
    const rutLimpio = rut.replace(/\./g, '').replace(/\s+/g, '');

    // Verificar en la tabla guardias usando el RUT limpio
    const result = await sql`
      SELECT COUNT(*) as count 
      FROM guardias 
      WHERE REPLACE(REPLACE(rut, '.', ''), ' ', '') = ${rutLimpio}
    `;

    const existe = parseInt(result.rows[0]?.count || '0') > 0;

    return NextResponse.json({
      existe,
      rut: rutLimpio,
      mensaje: existe ? 'RUT ya existe en el sistema' : 'RUT disponible'
    });

  } catch (error) {
    console.error('Error verificando RUT:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}
