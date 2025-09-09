import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@vercel/postgres';

import { logger, devLogger, apiLogger } from '@/lib/utils/logger';
export const runtime = 'nodejs';

// GET - Obtener configuración de sistema
export async function GET(request: NextRequest) {
  // Permitir acceso temporal sin autenticación estricta
  logger.debug('🔍 Sistema Config: Acceso temporal permitido');
  
  try {
    const { searchParams } = new URL(request.url);
    const tenantId = searchParams.get('tenant_id');

    let query = `
      SELECT 
        id,
        tenant_id,
        zona_horaria,
        formato_hora,
        pais,
        codigo_pais,
        moneda,
        simbolo_moneda,
        idioma,
        formato_fecha,
        separador_miles,
        separador_decimales,
        created_at,
        updated_at
      FROM configuracion_sistema
    `;

    const params: any[] = [];

    if (tenantId) {
      query += ` WHERE tenant_id = $1`;
      params.push(tenantId);
    } else {
      // Si no hay tenant_id, obtener configuración por defecto
      query += ` WHERE tenant_id IS NULL`;
    }

    query += ` ORDER BY created_at DESC LIMIT 1`;

    logger.debug(`📊 [SISTEMA-CONFIG] Query: ${query}`);
    console.log(`📊 [SISTEMA-CONFIG] Params: ${JSON.stringify(params)}`);

    const result = await sql.query(query, params);

    if (result.rows.length === 0) {
      // Si no hay configuración, crear una por defecto
      const defaultConfig = await sql`
        INSERT INTO configuracion_sistema (
          tenant_id,
          zona_horaria,
          formato_hora,
          pais,
          codigo_pais,
          moneda,
          simbolo_moneda,
          idioma,
          formato_fecha,
          separador_miles,
          separador_decimales
        ) VALUES (
          ${tenantId || null},
          'America/Santiago',
          '24h',
          'CL',
          '+56',
          'CLP',
          '$',
          'es-CL',
          'DD/MM/YYYY',
          '.',
          ','
        )
        RETURNING *
      `;

      return NextResponse.json({
        success: true,
        data: defaultConfig.rows[0],
        message: 'Configuración por defecto creada'
      });
    }

    logger.debug(`✅ [SISTEMA-CONFIG] Configuración encontrada para tenant: ${tenantId || 'default'}`);

    return NextResponse.json({
      success: true,
      data: result.rows[0]
    });

  } catch (error) {
    console.error('❌ Error obteniendo configuración de sistema:', error);
    return NextResponse.json(
      { success: false, error: String(error) },
      { status: 500 }
    );
  }
}

// POST - Actualizar configuración de sistema
export async function POST(request: NextRequest) {
  // Permitir acceso temporal sin autenticación estricta
  logger.debug('🔍 Sistema Config POST: Acceso temporal permitido');
  
  try {
    const body = await request.json();
    const {
      tenant_id,
      zona_horaria,
      formato_hora,
      pais,
      codigo_pais,
      moneda,
      simbolo_moneda,
      idioma,
      formato_fecha,
      separador_miles,
      separador_decimales
    } = body;

    logger.debug(`🔧 [SISTEMA-CONFIG] Actualizando configuración:`, body);

    // Validaciones
    if (formato_hora && !['24h', '12h'].includes(formato_hora)) {
      return NextResponse.json(
        { success: false, error: 'Formato de hora debe ser 24h o 12h' },
        { status: 400 }
      );
    }

    // Verificar si existe configuración previa
    const existing = await sql`
      SELECT id FROM configuracion_sistema
      WHERE tenant_id = ${tenant_id || null}
      LIMIT 1
    `;

    let result;
    if (existing.rows.length > 0) {
      // Actualizar configuración existente
      result = await sql`
        UPDATE configuracion_sistema SET
          zona_horaria = ${zona_horaria || 'America/Santiago'},
          formato_hora = ${formato_hora || '24h'},
          pais = ${pais || 'CL'},
          codigo_pais = ${codigo_pais || '+56'},
          moneda = ${moneda || 'CLP'},
          simbolo_moneda = ${simbolo_moneda || '$'},
          idioma = ${idioma || 'es-CL'},
          formato_fecha = ${formato_fecha || 'DD/MM/YYYY'},
          separador_miles = ${separador_miles || '.'},
          separador_decimales = ${separador_decimales || ','},
          updated_at = NOW()
        WHERE tenant_id = ${tenant_id || null}
        RETURNING *
      `;
    } else {
      // Crear nueva configuración
      result = await sql`
        INSERT INTO configuracion_sistema (
          tenant_id,
          zona_horaria,
          formato_hora,
          pais,
          codigo_pais,
          moneda,
          simbolo_moneda,
          idioma,
          formato_fecha,
          separador_miles,
          separador_decimales
        )
        VALUES (
          ${tenant_id || null},
          ${zona_horaria || 'America/Santiago'},
          ${formato_hora || '24h'},
          ${pais || 'CL'},
          ${codigo_pais || '+56'},
          ${moneda || 'CLP'},
          ${simbolo_moneda || '$'},
          ${idioma || 'es-CL'},
          ${formato_fecha || 'DD/MM/YYYY'},
          ${separador_miles || '.'},
          ${separador_decimales || ','}
        )
        RETURNING *
      `;
    }

    logger.debug(`✅ [SISTEMA-CONFIG] Configuración guardada exitosamente`);

    return NextResponse.json({
      success: true,
      data: result.rows[0],
      message: 'Configuración actualizada exitosamente'
    });

  } catch (error) {
    console.error('❌ Error guardando configuración de sistema:', error);
    return NextResponse.json(
      { success: false, error: String(error) },
      { status: 500 }
    );
  }
}
