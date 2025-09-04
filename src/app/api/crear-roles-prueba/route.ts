import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@vercel/postgres';

export async function POST(request: NextRequest) {
  try {
    console.log('🔧 Creando roles de prueba...');

    // Obtener el tenant_id del usuario actual
    const email = request.headers.get('x-user-email');
    let tenantId = null;
    
    if (email) {
      const userResult = await sql`
        SELECT tenant_id::text AS tid FROM usuarios WHERE lower(email)=lower(${email}) LIMIT 1
      `;
      tenantId = userResult.rows?.[0]?.tid || null;
    }
    
    console.log('🔍 Tenant ID obtenido:', tenantId);

    // Crear roles de prueba
    const rolesPrueba = [
      {
        nombre: 'Día 4x4x12 / 08:00 20:00',
        dias_trabajo: 4,
        dias_descanso: 4,
        horas_turno: 12,
        hora_inicio: '08:00',
        hora_termino: '20:00',
        estado: 'Activo'
      },
      {
        nombre: 'Noche 4x4x12 / 20:00 08:00',
        dias_trabajo: 4,
        dias_descanso: 4,
        horas_turno: 12,
        hora_inicio: '20:00',
        hora_termino: '08:00',
        estado: 'Activo'
      },
      {
        nombre: 'Día 5x2x12 / 08:00 20:00',
        dias_trabajo: 5,
        dias_descanso: 2,
        horas_turno: 12,
        hora_inicio: '08:00',
        hora_termino: '20:00',
        estado: 'Activo'
      }
    ];

    const rolesCreados = [];

    for (const rol of rolesPrueba) {
      try {
        const result = await sql`
          INSERT INTO as_turnos_roles_servicio (
            nombre,
            dias_trabajo,
            dias_descanso,
            horas_turno,
            hora_inicio,
            hora_termino,
            estado,
            tenant_id,
            created_at,
            updated_at
          ) VALUES (
            ${rol.nombre},
            ${rol.dias_trabajo},
            ${rol.dias_descanso},
            ${rol.horas_turno},
            ${rol.hora_inicio},
            ${rol.hora_termino},
            ${rol.estado},
            ${tenantId},
            NOW(),
            NOW()
          ) RETURNING id, nombre
        `;
        
        rolesCreados.push(result.rows[0]);
        console.log('✅ Rol creado:', result.rows[0]);
        
      } catch (error) {
        console.log('⚠️ Error creando rol:', rol.nombre, error.message);
        // Continuar con el siguiente rol
      }
    }

    return NextResponse.json({
      success: true,
      message: `Se crearon ${rolesCreados.length} roles de prueba`,
      rolesCreados,
      tenantId
    });

  } catch (error) {
    console.error('❌ Error creando roles de prueba:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
