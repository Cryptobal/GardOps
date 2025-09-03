import { NextRequest, NextResponse } from 'next/server';
import * as XLSX from 'xlsx';

export async function GET(request: NextRequest) {
  try {
    console.log('🚀 Generando plantilla Excel para nuevas instalaciones...');

    // Crear datos de ejemplo (solo headers y una fila de ejemplo)
    const excelData = [
      {
        'ID': '', // Dejar vacío para nuevas instalaciones
        'Nombre': 'Instalación Ejemplo',
        'Cliente': 'Empresa Ejemplo S.A.',
        'RUT Cliente': '12345678-9',
        'Dirección': 'Av. Providencia 1234, Santiago',
        'Latitud': '', // Se puede llenar automáticamente
        'Longitud': '', // Se puede llenar automáticamente
        'Ciudad': 'Santiago',
        'Comuna': 'Providencia',
        'Teléfono': '+56 2 1234 5678',
        'Valor Turno Extra': '50000',
        'Estado': 'Activo'
      }
    ];

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
      { width: 12 }  // Estado
    ];
    worksheet['!cols'] = columnWidths;

    // Agregar hoja al libro
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Nuevas Instalaciones');

    // Generar archivo
    const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });

    console.log('✅ Plantilla Excel de instalaciones generada, tamaño:', buffer.length, 'bytes');

    // Crear respuesta con headers para descarga
    const response = new NextResponse(buffer);
    response.headers.set('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    response.headers.set('Content-Disposition', `attachment; filename="plantilla_nuevas_instalaciones.xlsx"`);

    console.log('✅ Plantilla Excel de instalaciones enviada correctamente');
    return response;

  } catch (error) {
    console.error('❌ Error generando plantilla de instalaciones:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor al generar plantilla de instalaciones' },
      { status: 500 }
    );
  }
}
