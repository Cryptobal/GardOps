import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@vercel/postgres';

// POST - Test: crear estructura paso a paso
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { guardia_id, vigencia_desde } = body;

    console.log('🔍 Test - Creando estructura con:', { guardia_id, vigencia_desde });

    // Paso 1: Verificar que el guardia existe
    const guardiaCheck = await sql`
      SELECT id, nombre, apellido_paterno 
      FROM guardias 
      WHERE id = ${guardia_id}
    `;

    if (guardiaCheck.rows.length === 0) {
      return NextResponse.json({
        success: false,
        error: 'Guardia no encontrado'
      }, { status: 404 });
    }

    console.log('🔍 Guardia encontrado:', guardiaCheck.rows[0]);

    // Paso 2: Crear la estructura
    const estructuraResult = await sql`
      INSERT INTO sueldo_estructura_guardia (guardia_id, vigencia_desde, version, creado_por, activo)
      VALUES (${guardia_id}, ${vigencia_desde}::date, 1, ${'api_test'}, true)
      RETURNING id, guardia_id, vigencia_desde, version, activo
    `;

    const estructura = estructuraResult.rows[0];
    console.log('🔍 Estructura creada:', estructura);

    return NextResponse.json({
      success: true,
      data: {
        estructura,
        guardia: guardiaCheck.rows[0]
      }
    });

  } catch (error) {
    console.error('Error en test:', error);
    return NextResponse.json(
      { success: false, error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
} 