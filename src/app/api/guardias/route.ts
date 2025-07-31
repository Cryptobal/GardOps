import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/database';

export async function GET(request: NextRequest) {
  try {
    const result = await query(`
      SELECT 
        id,
        nombre,
        CONCAT(apellido_paterno, ' ', apellido_materno) as apellidos,
        email,
        telefono,
        activo as estado,
        created_at,
        updated_at
      FROM guardias 
      WHERE activo = true
      ORDER BY nombre, apellido_paterno, apellido_materno
    `);

    return NextResponse.json(result.rows);
  } catch (error) {
    console.error('Error obteniendo guardias:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}

// POST /api/guardias - Crear nuevo guardia
export async function POST(request: NextRequest) {
  console.log('🔍 API Guardias - Creando nuevo guardia');
  
  try {
    const body = await request.json();
    
    // Por ahora usar un tenant_id fijo para testing
    const tenantId = 'accebf8a-bacc-41fa-9601-ed39cb320a52';
    
    console.log('✅ API Guardias - Creando con datos:', body);

    // Query para crear el guardia
    const result = await query(`
      INSERT INTO guardias (
        tenant_id,
        nombre,
        apellido_paterno,
        apellido_materno,
        rut,
        email,
        telefono,
        direccion,
        ciudad,
        comuna,
        activo,
        latitud,
        longitud,
        created_at,
        updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, NOW(), NOW())
      RETURNING *
    `, [
      tenantId,
      body.nombre,
      body.apellido_paterno,
      body.apellido_materno || '',
      body.rut,
      body.email,
      body.telefono,
      body.direccion,
      body.ciudad,
      body.comuna,
      body.estado === 'Activo',
      body.latitud,
      body.longitud
    ]);

    const nuevoGuardia = result.rows[0];
    console.log('✅ Guardia creado exitosamente');

    return NextResponse.json({
      guardia: nuevoGuardia,
      success: true
    }, { status: 201 });

  } catch (error) {
    console.error('❌ Error creando guardia:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
} 