import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/database';
import { requireAuthz } from '@/lib/authz-api';

export async function GET(request: NextRequest) {
  try {
    console.log('🔍 GET /api/payroll/estructuras-unificadas/filtros - Iniciando...');
    
    // Verificar permisos
    const authResult = await requireAuthz(request, ['admin', 'manager', 'user']);
    if (!authResult.success) {
      return NextResponse.json({ success: false, error: 'No autorizado' }, { status: 401 });
    }
    console.log('✅ Permisos verificados correctamente');

    console.log('📊 Ejecutando consultas de filtros...');

    // Consulta de instalaciones
    const instalacionesQuery = `
      SELECT id, nombre 
      FROM instalaciones 
      WHERE activo = true 
      ORDER BY nombre
    `;

    // Consulta de roles de servicio
    const rolesQuery = `
      SELECT id, nombre, dias_trabajo, dias_descanso, hora_inicio, hora_termino
      FROM as_turnos_roles_servicio 
      WHERE activo = true 
      ORDER BY nombre
    `;

    // Consulta de guardias
    const guardiasQuery = `
      SELECT id, CONCAT(nombre, ' ', apellido_paterno, ' ', apellido_materno) as nombre_completo, rut
      FROM guardias 
      WHERE activo = true 
      ORDER BY nombre
    `;

    // Consulta de bonos
    const bonosQuery = `
      SELECT id, nombre, descripcion
      FROM sueldo_bonos_globales 
      WHERE activo = true 
      ORDER BY nombre
    `;

    // Ejecutar consultas en paralelo
    const [instalacionesResult, rolesResult, guardiasResult, bonosResult] = await Promise.all([
      db.query(instalacionesQuery),
      db.query(rolesQuery),
      db.query(guardiasQuery),
      db.query(bonosQuery)
    ]);

    const data = {
      instalaciones: instalacionesResult.rows,
      roles: rolesResult.rows,
      guardias: guardiasResult.rows,
      bonos: bonosResult.rows
    };

    console.log('📊 Resultados de consultas:');
    console.log('- Instalaciones:', data.instalaciones.length);
    console.log('- Roles:', data.roles.length);
    console.log('- Guardias:', data.guardias.length);
    console.log('- Bonos:', data.bonos.length);

    console.log('✅ Enviando respuesta exitosa');

    return NextResponse.json({
      success: true,
      data: data
    });

  } catch (error) {
    console.error('❌ Error en GET /api/payroll/estructuras-unificadas/filtros:', error);
    return NextResponse.json(
      { success: false, error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}
