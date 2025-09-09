import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@vercel/postgres';

import { logger, devLogger, apiLogger } from '@/lib/utils/logger';
export async function GET(request: NextRequest) {
  try {
    logger.debug('🔍 DEBUG: Verificando roles de servicio...');

    // 1. Verificar si la tabla existe
    const tableExists = await sql`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_name = 'as_turnos_roles_servicio'
      )
    `;
    
    devLogger.search(' Tabla existe:', tableExists.rows[0].exists);

    if (!tableExists.rows[0].exists) {
      return NextResponse.json({
        success: false,
        error: 'La tabla as_turnos_roles_servicio no existe',
        tableExists: false
      });
    }

    // 2. Contar total de registros
    const countResult = await sql`
      SELECT COUNT(*) as count FROM as_turnos_roles_servicio
    `;
    
    const totalCount = parseInt(countResult.rows[0].count);
    devLogger.search(' Total de registros:', totalCount);

    // 3. Obtener algunos registros de ejemplo
    const sampleData = await sql`
      SELECT 
        id,
        nombre,
        dias_trabajo,
        dias_descanso,
        hora_inicio,
        hora_termino,
        estado,
        tenant_id,
        created_at
      FROM as_turnos_roles_servicio 
      ORDER BY created_at DESC 
      LIMIT 5
    `;

    devLogger.search(' Registros de ejemplo:', sampleData.rows);

    // 4. Verificar estructura de la tabla
    const structure = await sql`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns 
      WHERE table_name = 'as_turnos_roles_servicio'
      ORDER BY ordinal_position
    `;

    // 5. Verificar usuarios y tenant_id
    const usersResult = await sql`
      SELECT email, tenant_id FROM usuarios LIMIT 3
    `;

    return NextResponse.json({
      success: true,
      data: {
        tableExists: tableExists.rows[0].exists,
        totalCount,
        sampleData: sampleData.rows,
        structure: structure.rows,
        users: usersResult.rows
      }
    });

  } catch (error) {
    console.error('❌ Error en debug-roles:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
