import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/database';

export async function GET(request: NextRequest) {
  try {
    const result = await query(`
      SELECT 
        g.id,
        g.nombre,
        g.apellido_paterno,
        g.apellido_materno,
        CONCAT(g.nombre, ' ', g.apellido_paterno, ' ', COALESCE(g.apellido_materno, '')) as nombre_completo,
        g.rut,
        g.email,
        g.telefono,
        g.direccion,
        g.latitud,
        g.longitud,
        g.ciudad,
        g.comuna,
        g.region,
        g.activo,
        g.fecha_os10,
        g.instalacion_id,
        i.nombre as instalacion_nombre,
        COALESCE(c.nombre, 'Cliente no encontrado') as cliente_nombre,
        g.created_at,
        g.updated_at,
        -- Información de asignación actual
        ta_asignacion.instalacion_nombre as instalacion_asignada,
        ta_asignacion.rol_nombre as rol_actual
      FROM guardias g
      LEFT JOIN instalaciones i ON g.instalacion_id = i.id
      LEFT JOIN clientes c ON i.cliente_id = c.id
      -- Left join para obtener asignación actual
      LEFT JOIN (
        SELECT 
          ta.guardia_id,
          i.nombre as instalacion_nombre,
          rs.nombre as rol_nombre
        FROM as_turnos_asignaciones ta
        INNER JOIN as_turnos_requisitos tr ON ta.requisito_puesto_id = tr.id
        INNER JOIN as_turnos_roles_servicio rs ON tr.rol_servicio_id = rs.id
        INNER JOIN instalaciones i ON tr.instalacion_id = i.id
        WHERE ta.estado = 'Activa'
      ) ta_asignacion ON g.id = ta_asignacion.guardia_id
      ORDER BY g.activo DESC, g.nombre, g.apellido_paterno, g.apellido_materno
    `);

    return NextResponse.json({ 
      success: true, 
      guardias: result.rows 
    });
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