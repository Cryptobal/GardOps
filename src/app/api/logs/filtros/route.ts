import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/database';

import { logger, devLogger, apiLogger } from '@/lib/utils/logger';
export async function GET(request: NextRequest) {
  try {
    // Por ahora usar un tenant_id fijo para testing
    const tenantId = 'accebf8a-bacc-41fa-9601-ed39cb320a52';

    // Definir todas las tablas de logs
    const tablasLogs = [
      { nombre: 'guardias', tabla: 'logs_guardias' },
      { nombre: 'instalaciones', tabla: 'logs_instalaciones' },
      { nombre: 'clientes', tabla: 'logs_clientes' },
      { nombre: 'pauta_mensual', tabla: 'logs_pauta_mensual' },
      { nombre: 'pauta_diaria', tabla: 'logs_pauta_diaria' },
      { nombre: 'turnos_extras', tabla: 'logs_turnos_extras' },
      { nombre: 'puestos_operativos', tabla: 'logs_puestos_operativos' },
      { nombre: 'documentos', tabla: 'logs_documentos' },
      { nombre: 'usuarios', tabla: 'logs_usuarios' }
    ];

    // Obtener módulos únicos
    let modulosUnion = '';
    let usuariosUnion = '';
    let accionesUnion = '';

    for (const tablaInfo of tablasLogs) {
      const tenantFilter = tablaInfo.nombre !== 'instalaciones' && tablaInfo.nombre !== 'clientes' 
        ? `WHERE tenant_id = $1` 
        : '';
      
      modulosUnion += `SELECT '${tablaInfo.nombre}' as modulo FROM ${tablaInfo.tabla} ${tenantFilter}\nUNION ALL\n`;
      usuariosUnion += `SELECT usuario FROM ${tablaInfo.tabla} ${tenantFilter}\nUNION ALL\n`;
      accionesUnion += `SELECT accion FROM ${tablaInfo.tabla} ${tenantFilter}\nUNION ALL\n`;
    }

    // Remover el último UNION ALL
    modulosUnion = modulosUnion.replace(/UNION ALL\n$/, '');
    usuariosUnion = usuariosUnion.replace(/UNION ALL\n$/, '');
    accionesUnion = accionesUnion.replace(/UNION ALL\n$/, '');

    const modulosQuery = `
      SELECT DISTINCT modulo
      FROM (
        ${modulosUnion}
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
        ${usuariosUnion}
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
        ${accionesUnion}
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
    logger.error('Error obteniendo filtros::', error);
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