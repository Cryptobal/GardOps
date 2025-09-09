import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/database';

import { logger, devLogger, apiLogger } from '@/lib/utils/logger';
export async function GET() {
  try {
    // Obtener datos de trazabilidad
    const trazabilidad = await query(`
      SELECT 
        (SELECT COUNT(*) FROM instalaciones WHERE estado = 'Activo') as instalaciones,
        (SELECT COUNT(*) FROM clientes WHERE estado = 'Activo') as clientes,
        (SELECT COUNT(*) FROM as_turnos_requisitos WHERE estado = 'Activo') as requisitos,
        (SELECT COUNT(*) FROM as_turnos_asignaciones WHERE estado = 'Activa') as asignaciones_activas
    `);

    // Calcular tasa de éxito (PPCs asignados vs total)
    const tasaExito = await query(`
      SELECT 
        CASE 
          WHEN COUNT(*) = 0 THEN 0
          ELSE ROUND((COUNT(CASE WHEN estado = 'Asignado' THEN 1 END) * 100.0 / COUNT(*)), 1)
        END as tasa_exito
      FROM as_turnos_ppc
    `);

    const data = trazabilidad.rows[0];
    const tasa = tasaExito.rows[0];

    return NextResponse.json({
      instalaciones: parseInt(data.instalaciones) || 0,
      clientes: parseInt(data.clientes) || 0,
      requisitos: parseInt(data.requisitos) || 0,
      asignacionesActivas: parseInt(data.asignaciones_activas) || 0,
      tasaExito: parseFloat(tasa.tasa_exito) || 0
    });

  } catch (error) {
    logger.error('Error obteniendo datos de trazabilidad::', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
} 