import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/database';
import * as XLSX from 'xlsx';

import { logger, devLogger, apiLogger } from '@/lib/utils/logger';
export async function GET(request: NextRequest) {
  try {
    logger.debug('🚀 Exportando clientes a Excel...');

    // Consulta para obtener todos los clientes con sus datos completos
    const result = await query(`
      SELECT 
        c.id,
        c.nombre,
        c.rut,
        c.representante_legal,
        c.rut_representante,
        c.email,
        c.telefono,
        c.direccion,
        c.latitud,
        c.longitud,
        c.ciudad,
        c.comuna,
        c.razon_social,
        c.estado,
        c.created_at,
        c.updated_at,
        
        -- Contar instalaciones asociadas
        COUNT(i.id) as instalaciones_count
        
      FROM clientes c
      LEFT JOIN instalaciones i ON i.cliente_id = c.id
      GROUP BY c.id, c.nombre, c.rut, c.representante_legal, c.rut_representante, 
               c.email, c.telefono, c.direccion, c.latitud, c.longitud, 
               c.ciudad, c.comuna, c.razon_social, c.estado, c.created_at, c.updated_at
      ORDER BY c.nombre
    `);

    if (result.rows.length === 0) {
      return NextResponse.json(
        { error: 'No hay clientes para exportar' },
        { status: 404 }
      );
    }

    logger.debug(`📊 Exportando ${result.rows.length} clientes...`);

    // Preparar datos para Excel
    const excelData = result.rows.map((cliente: any) => ({
      'ID': cliente.id,
      'Nombre': cliente.nombre || '',
      'RUT Empresa': cliente.rut || '',
      'Representante Legal': cliente.representante_legal || '',
      'RUT Representante': cliente.rut_representante || '',
      'Email': cliente.email || '',
      'Teléfono': cliente.telefono || '',
      'Dirección': cliente.direccion || '',
      'Latitud': cliente.latitud || '',
      'Longitud': cliente.longitud || '',
      'Ciudad': cliente.ciudad || '',
      'Comuna': cliente.comuna || '',
      'Razón Social': cliente.razon_social || '',
      'Estado': cliente.estado || 'Activo',
      'Instalaciones': cliente.instalaciones_count || 0,
      'Fecha Creación': cliente.created_at ? new Date(cliente.created_at).toLocaleDateString('es-CL') : '',
      'Fecha Actualización': cliente.updated_at ? new Date(cliente.updated_at).toLocaleDateString('es-CL') : ''
    }));

    // Crear libro de Excel
    const workbook = XLSX.utils.book_new();
    const worksheet = XLSX.utils.json_to_sheet(excelData);

    // Configurar anchos de columna para mejor visualización
    const columnWidths = [
      { width: 36 }, // ID
      { width: 30 }, // Nombre
      { width: 15 }, // RUT Empresa
      { width: 25 }, // Representante Legal
      { width: 15 }, // RUT Representante
      { width: 30 }, // Email
      { width: 15 }, // Teléfono
      { width: 40 }, // Dirección
      { width: 12 }, // Latitud
      { width: 12 }, // Longitud
      { width: 20 }, // Ciudad
      { width: 20 }, // Comuna
      { width: 30 }, // Razón Social
      { width: 12 }, // Estado
      { width: 15 }, // Instalaciones
      { width: 18 }, // Fecha Creación
      { width: 20 }  // Fecha Actualización
    ];
    worksheet['!cols'] = columnWidths;

    // Agregar hoja al libro
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Clientes');

    // Generar archivo
    const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });

    devLogger.success(' Archivo Excel generado, tamaño:', buffer.length, 'bytes');

    // Crear respuesta con headers para descarga
    const response = new NextResponse(buffer);
    response.headers.set('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    response.headers.set('Content-Disposition', `attachment; filename="clientes_${new Date().toISOString().split('T')[0]}.xlsx"`);

    logger.debug('✅ Archivo Excel de clientes enviado correctamente');
    return response;

  } catch (error) {
    console.error('❌ Error exportando clientes:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor al exportar clientes' },
      { status: 500 }
    );
  }
}
