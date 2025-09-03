import { NextRequest, NextResponse } from 'next/server';
import * as XLSX from 'xlsx';

export async function GET(request: NextRequest) {
  try {
    console.log('🚀 Generando plantilla Excel para nuevos clientes...');

    // Crear datos de ejemplo (solo headers y una fila de ejemplo)
    const excelData = [
      {
        'ID': '', // Dejar vacío para nuevos clientes
        'Nombre': 'Empresa Ejemplo S.A.',
        'RUT Empresa': '12345678-9',
        'Representante Legal': 'Juan Pérez González',
        'RUT Representante': '98765432-1',
        'Email': 'contacto@empresaejemplo.cl',
        'Teléfono': '+56 2 1234 5678',
        'Dirección': 'Av. Providencia 1234, Santiago',
        'Latitud': '', // Se puede llenar automáticamente
        'Longitud': '', // Se puede llenar automáticamente
        'Ciudad': 'Santiago',
        'Comuna': 'Providencia',
        'Razón Social': 'Empresa Ejemplo Sociedad Anónima',
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
      { width: 12 }  // Estado
    ];
    worksheet['!cols'] = columnWidths;

    // Agregar hoja al libro
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Nuevos Clientes');

    // Generar archivo
    const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });

    console.log('✅ Plantilla Excel de clientes generada, tamaño:', buffer.length, 'bytes');

    // Crear respuesta con headers para descarga
    const response = new NextResponse(buffer);
    response.headers.set('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    response.headers.set('Content-Disposition', `attachment; filename="plantilla_nuevos_clientes.xlsx"`);

    console.log('✅ Plantilla Excel de clientes enviada correctamente');
    return response;

  } catch (error) {
    console.error('❌ Error generando plantilla de clientes:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor al generar plantilla de clientes' },
      { status: 500 }
    );
  }
}
