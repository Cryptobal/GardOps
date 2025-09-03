import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/database';
import * as XLSX from 'xlsx';

export async function GET(request: NextRequest) {
  try {
    console.log('🚀 Exportando instalaciones a Excel...');

    // Consulta para obtener todas las instalaciones con sus datos completos
    const result = await query(`
      SELECT 
        i.id,
        i.nombre,
        i.direccion,
        i.latitud,
        i.longitud,
        i.ciudad,
        i.comuna,
        i.telefono,
        i.valor_turno_extra,
        i.estado,
        i.created_at,
        i.updated_at,
        
        -- Información del cliente asociado
        c.nombre as cliente_nombre,
        c.rut as cliente_rut,
        
        -- Contar puestos operativos y guardias asignados
        COUNT(DISTINCT po.id) as puestos_operativos,
        COUNT(DISTINCT po.guardia_id) as guardias_asignados
        
      FROM instalaciones i
      LEFT JOIN clientes c ON c.id = i.cliente_id
      LEFT JOIN as_turnos_puestos_operativos po ON po.instalacion_id = i.id AND po.activo = true
      GROUP BY i.id, i.nombre, i.direccion, i.latitud, i.longitud, 
               i.ciudad, i.comuna, i.telefono, i.valor_turno_extra, i.estado, 
               i.created_at, i.updated_at, c.nombre, c.rut
      ORDER BY i.nombre
    `);

    if (result.rows.length === 0) {
      return NextResponse.json(
        { error: 'No hay instalaciones para exportar' },
        { status: 404 }
      );
    }

    console.log(`📊 Exportando ${result.rows.length} instalaciones...`);

    // Preparar datos para Excel
    const excelData = result.rows.map((instalacion: any) => ({
      'ID': instalacion.id,
      'Nombre': instalacion.nombre || '',
      'Cliente': instalacion.cliente_nombre || '',
      'RUT Cliente': instalacion.cliente_rut || '',
      'Dirección': instalacion.direccion || '',
      'Latitud': instalacion.latitud || '',
      'Longitud': instalacion.longitud || '',
      'Ciudad': instalacion.ciudad || '',
      'Comuna': instalacion.comuna || '',
      'Teléfono': instalacion.telefono || '',
      'Valor Turno Extra': instalacion.valor_turno_extra || 0,
      'Estado': instalacion.estado || 'Activo',
      'Puestos Operativos': instalacion.puestos_operativos || 0,
      'Guardias Asignados': instalacion.guardias_asignados || 0,
      'Fecha Creación': instalacion.created_at ? new Date(instalacion.created_at).toLocaleDateString('es-CL') : '',
      'Fecha Actualización': instalacion.updated_at ? new Date(instalacion.updated_at).toLocaleDateString('es-CL') : ''
    }));

    // Crear libro de Excel
    const workbook = XLSX.utils.book_new();
    const worksheet = XLSX.utils.json_to_sheet(excelData);

    // Configurar anchos de columna para mejor visualización
    const columnWidths = [
      { width: 36 }, // ID
      { width: 30 }, // Nombre
      { width: 30 }, // Cliente
      { width: 15 }, // RUT Cliente
      { width: 40 }, // Dirección
      { width: 12 }, // Latitud
      { width: 12 }, // Longitud
      { width: 20 }, // Ciudad
      { width: 20 }, // Comuna
      { width: 15 }, // Teléfono
      { width: 18 }, // Valor Turno Extra
      { width: 12 }, // Estado
      { width: 18 }, // Puestos Operativos
      { width: 18 }, // Guardias Asignados
      { width: 18 }, // Fecha Creación
      { width: 20 }  // Fecha Actualización
    ];
    worksheet['!cols'] = columnWidths;

    // Agregar hoja al libro
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Instalaciones');

    // Generar archivo
    const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });

    console.log('✅ Archivo Excel generado, tamaño:', buffer.length, 'bytes');

    // Crear respuesta con headers para descarga
    const response = new NextResponse(buffer);
    response.headers.set('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    response.headers.set('Content-Disposition', `attachment; filename="instalaciones_${new Date().toISOString().split('T')[0]}.xlsx"`);

    console.log('✅ Archivo Excel de instalaciones enviado correctamente');
    return response;

  } catch (error) {
    console.error('❌ Error exportando instalaciones:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor al exportar instalaciones' },
      { status: 500 }
    );
  }
}
