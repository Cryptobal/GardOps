import { NextRequest, NextResponse } from 'next/server';
import { requireAuthz } from '@/lib/authz-api';
import { sql } from '@/lib/db';

// GET /api/guardias - Obtener lista de guardias
export async function GET(request: NextRequest) {
  const deny = await requireAuthz(request, { resource: 'guardias', action: 'read:list' });
  if (deny) return deny;

  try {
    const result = await sql`SELECT * FROM guardias ORDER BY nombre ASC`;

    return NextResponse.json({
      success: true,
      data: result.rows,
    });
  } catch (error) {
    console.error('Error obteniendo guardias:', error);
    return NextResponse.json(
      { success: false, error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}

// POST /api/guardias - Crear nuevo guardia
export async function POST(request: NextRequest) {
  const deny = await requireAuthz(request, { resource: 'guardias', action: 'create' });
  if (deny) return deny;

  try {
    const body = await request.json();
    const { nombre, email, telefono, activo } = body;
    
    const result = await sql<{
      id: string;
      nombre: string;
      email: string;
      telefono: string;
      activo: boolean;
    }>`INSERT INTO guardias (nombre, email, telefono, activo)
        VALUES (${nombre}, ${email}, ${telefono}, ${activo})
        RETURNING *`;

    return NextResponse.json({
      success: true,
      data: result.rows[0],
    });
  } catch (error) {
    console.error('Error creando guardia:', error);
    return NextResponse.json(
      { success: false, error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}