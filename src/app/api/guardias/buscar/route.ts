import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/database';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const searchQuery = searchParams.get('q');

    if (!searchQuery || searchQuery.length < 1) {
      return NextResponse.json([]);
    }

    // Verificar si la tabla existe
    const tableCheck = await query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'guardias'
      );
    `);

    if (!tableCheck.rows[0].exists) {
      console.log('Tabla guardias no existe');
      return NextResponse.json([]);
    }

    // Obtener estructura de columnas para debug
    const columnsCheck = await query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'guardias' 
      AND table_schema = 'public'
      ORDER BY ordinal_position
    `);
    
    console.log('Columnas disponibles:', columnsCheck.rows.map((r: any) => r.column_name));

    // Buscar guardias en la base de datos real
    const result = await query(`
      SELECT 
        id,
        nombre,
        apellido_paterno,
        apellido_materno,
        rut,
        email,
        telefono,
        activo
      FROM guardias 
      WHERE 
        (LOWER(nombre) LIKE LOWER($1) OR 
         LOWER(apellido_paterno) LIKE LOWER($1) OR
         LOWER(apellido_materno) LIKE LOWER($1) OR
         LOWER(CONCAT(nombre, ' ', apellido_paterno, ' ', apellido_materno)) LIKE LOWER($1) OR
         rut LIKE $1) AND
        activo = true
      ORDER BY nombre, apellido_paterno, apellido_materno
      LIMIT 10
    `, [`%${searchQuery}%`]);

    return NextResponse.json(result.rows);
  } catch (error) {
    console.error('Error buscando guardias:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
} 