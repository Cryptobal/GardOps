import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@vercel/postgres';

// GET - Debug simple
export async function GET(request: NextRequest) {
  try {
    console.log('🔍 Debug simple - Iniciando...');

    // Test 1: Verificar conexión básica
    const test1 = await sql`SELECT 1 as test`;
    console.log('🔍 Test 1 (conexión):', test1.rows[0]);

    // Test 2: Verificar que la tabla existe
    const test2 = await sql`
      SELECT COUNT(*) as count 
      FROM sueldo_estructura_guardia
    `;
    console.log('🔍 Test 2 (count):', test2.rows[0]);

    // Test 3: Verificar un guardia específico
    const test3 = await sql`
      SELECT id, nombre, apellido_paterno 
      FROM guardias 
      WHERE id = 'f926122b-a986-4346-978a-64256fe59f73'
    `;
    console.log('🔍 Test 3 (guardia):', test3.rows[0]);

    return NextResponse.json({
      success: true,
      data: {
        test1: test1.rows[0],
        test2: test2.rows[0],
        test3: test3.rows[0]
      }
    });

  } catch (error) {
    console.error('Error en debug simple:', error);
    return NextResponse.json(
      { success: false, error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}

// POST - Test inserción simple
export async function POST(request: NextRequest) {
  try {
    console.log('🔍 Debug simple POST - Iniciando...');

    // Usar un guardia que no tenga estructuras existentes
    const testGuardiaId = '61b590f3-890e-48e9-94f6-e43b4d6db536'; // Este guardia ya tiene una estructura
    const testVigenciaDesde = '2025-12-01'; // Usar una fecha muy diferente

    // Verificar si el guardia existe
    const guardiaCheck = await sql`
      SELECT id, nombre FROM guardias WHERE id = ${testGuardiaId}
    `;
    console.log('🔍 Guardia encontrado:', guardiaCheck.rows[0]);

    // Verificar estructuras existentes para este guardia
    const existingStructures = await sql`
      SELECT id, version, vigencia_desde, vigencia_hasta, periodo, activo FROM sueldo_estructura_guardia 
      WHERE guardia_id = ${testGuardiaId}
      ORDER BY vigencia_desde
    `;
    console.log('🔍 Todas las estructuras existentes:', existingStructures.rows);

    // Inactivar estructuras activas existentes
    if (existingStructures.rows.some(s => s.activo)) {
      console.log('🔍 Inactivando estructuras activas existentes...');
      await sql`
        UPDATE sueldo_estructura_guardia 
        SET activo = false, vigencia_hasta = ${testVigenciaDesde}::date - interval '1 day'
        WHERE guardia_id = ${testGuardiaId} AND activo = true
      `;
    }

    // Verificar versiones existentes
    const existingVersions = await sql`
      SELECT version FROM sueldo_estructura_guardia 
      WHERE guardia_id = ${testGuardiaId}
      ORDER BY version DESC
    `;
    console.log('🔍 Versiones existentes:', existingVersions.rows);

    const nextVersion = existingVersions.rows.length > 0 ? Math.max(...existingVersions.rows.map(r => r.version)) + 1 : 1;
    console.log('🔍 Próxima versión:', nextVersion);

    // Test inserción simple
    const result = await sql`
      INSERT INTO sueldo_estructura_guardia (
        guardia_id, 
        vigencia_desde, 
        version, 
        creado_por, 
        activo
      )
      VALUES (
        ${testGuardiaId},
        ${testVigenciaDesde}::date,
        ${nextVersion},
        'api_debug',
        true
      )
      RETURNING id, guardia_id, vigencia_desde, version
    `;

    console.log('🔍 Inserción exitosa:', result.rows[0]);

    return NextResponse.json({
      success: true,
      data: result.rows[0]
    });

  } catch (error) {
    console.error('Error en debug simple POST:', error);
    return NextResponse.json(
      { success: false, error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}
