import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@vercel/postgres';

import { logger, devLogger, apiLogger } from '@/lib/utils/logger';
export async function POST(request: NextRequest) {
  try {
    logger.debug('🔧 Creando tabla sueldo_estructuras_roles...');
    
    // Crear la tabla que falta
    await sql.query(`
      CREATE TABLE IF NOT EXISTS sueldo_estructuras_roles (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        rol_servicio_id UUID NOT NULL REFERENCES as_turnos_roles_servicio(id) ON DELETE CASCADE,
        sueldo_base DECIMAL(10,2) DEFAULT 680000,
        bono_asistencia DECIMAL(10,2) DEFAULT 0,
        bono_responsabilidad DECIMAL(10,2) DEFAULT 0,
        bono_noche DECIMAL(10,2) DEFAULT 0,
        bono_feriado DECIMAL(10,2) DEFAULT 0,
        bono_riesgo DECIMAL(10,2) DEFAULT 0,
        activo BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        tenant_id UUID
      )
    `);

    logger.debug('✅ Tabla sueldo_estructuras_roles creada exitosamente');

    // Crear índices
    await sql.query(`
      CREATE INDEX IF NOT EXISTS idx_sueldo_estructuras_roles_rol_servicio_id 
      ON sueldo_estructuras_roles(rol_servicio_id)
    `);

    await sql.query(`
      CREATE INDEX IF NOT EXISTS idx_sueldo_estructuras_roles_tenant_id 
      ON sueldo_estructuras_roles(tenant_id)
    `);

    logger.debug('✅ Índices creados exitosamente');

    return NextResponse.json({
      success: true,
      message: 'Tabla sueldo_estructuras_roles creada exitosamente'
    });
  } catch (error) {
    logger.error('Error creando tabla sueldo_estructuras_roles::', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Error interno del servidor' },
      { status: 500 }
    );
  }
}