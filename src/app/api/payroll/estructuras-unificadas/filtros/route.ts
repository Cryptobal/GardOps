import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/database';
import { requireAuthz } from '@/lib/authz-api';

import { logger, devLogger, apiLogger } from '@/lib/utils/logger';
export async function GET(request: NextRequest) {
  try {
    logger.debug('🔍 GET /api/payroll/estructuras-unificadas/filtros - Iniciando...');
    
    // Verificar permisos
    const authResult = await requireAuthz(request, ['admin', 'manager', 'user']);
    if (!authResult.success) {
      return NextResponse.json({ success: false, error: 'No autorizado' }, { status: 401 });
    }
    logger.debug('✅ Permisos verificados correctamente');

    logger.debug('📊 Ejecutando consultas de filtros...');

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

    logger.debug('📊 Resultados de consultas:');
    logger.debug('- Instalaciones:', data.instalaciones.length);
    logger.debug('- Roles:', data.roles.length);
    logger.debug('- Guardias:', data.guardias.length);
    logger.debug('- Bonos:', data.bonos.length);

    logger.debug('✅ Enviando respuesta exitosa');

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
