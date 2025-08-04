import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/database';

export async function GET(request: NextRequest) {
  try {
    // Por ahora usar un tenant_id fijo para testing
    const tenantId = 'accebf8a-bacc-41fa-9601-ed39cb320a52';

    // Obtener módulos únicos
    const modulosQuery = `
      SELECT DISTINCT modulo
      FROM (
        SELECT 'guardias' as modulo FROM logs_guardias WHERE tenant_id = $1
        UNION ALL
        SELECT 'pauta_mensual' as modulo FROM logs_pauta_mensual WHERE tenant_id = $1
        UNION ALL
        SELECT 'pauta_diaria' as modulo FROM logs_pauta_diaria WHERE tenant_id = $1
        UNION ALL
        SELECT 'turnos_extras' as modulo FROM logs_turnos_extras WHERE tenant_id = $1
      ) combined_modulos
      WHERE modulo IS NOT NULL AND modulo != ''
      ORDER BY modulo
    `;

    const modulosResult = await query(modulosQuery, [tenantId]);
    const modulos = modulosResult.rows
      .map(row => row.modulo)
      .filter(modulo => modulo && modulo.trim() !== '');

    // Obtener usuarios únicos
    const usuariosQuery = `
      SELECT DISTINCT usuario
      FROM (
        SELECT usuario FROM logs_guardias WHERE tenant_id = $1
        UNION ALL
        SELECT usuario FROM logs_pauta_mensual WHERE tenant_id = $1
        UNION ALL
        SELECT usuario FROM logs_pauta_diaria WHERE tenant_id = $1
        UNION ALL
        SELECT usuario FROM logs_turnos_extras WHERE tenant_id = $1
      ) combined_usuarios
      WHERE usuario IS NOT NULL AND usuario != ''
      ORDER BY usuario
    `;

    const usuariosResult = await query(usuariosQuery, [tenantId]);
    const usuarios = usuariosResult.rows
      .map(row => row.usuario)
      .filter(usuario => usuario && usuario.trim() !== '');

    // Obtener acciones únicas
    const accionesQuery = `
      SELECT DISTINCT accion
      FROM (
        SELECT accion FROM logs_guardias WHERE tenant_id = $1
        UNION ALL
        SELECT accion FROM logs_pauta_mensual WHERE tenant_id = $1
        UNION ALL
        SELECT accion FROM logs_pauta_diaria WHERE tenant_id = $1
        UNION ALL
        SELECT accion FROM logs_turnos_extras WHERE tenant_id = $1
      ) combined_acciones
      WHERE accion IS NOT NULL AND accion != ''
      ORDER BY accion
    `;

    const accionesResult = await query(accionesQuery, [tenantId]);
    const acciones = accionesResult.rows
      .map(row => row.accion)
      .filter(accion => accion && accion.trim() !== '');

    return NextResponse.json({
      success: true,
      modulos,
      usuarios,
      acciones
    });

  } catch (error) {
    console.error('Error obteniendo filtros:', error);
    return NextResponse.json(
      { 
        success: false,
        error: 'Error interno del servidor al obtener filtros',
        detalles: process.env.NODE_ENV === 'development' ? error : undefined
      },
      { status: 500 }
    );
  }
} 