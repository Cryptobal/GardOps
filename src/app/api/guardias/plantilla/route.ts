import { NextRequest, NextResponse } from 'next/server';
import * as XLSX from 'xlsx';

export async function GET(request: NextRequest) {
  try {
    console.log('🚀 Generando plantilla Excel para nuevos guardias...');

    // Crear datos de ejemplo (solo headers y una fila de ejemplo)
    const excelData = [
      {
        'ID': '', // Dejar vacío para nuevos guardias
        'Nombre': 'Juan',
        'Apellido Paterno': 'Pérez',
        'Apellido Materno': 'González',
        'RUT': '12345678-9',
        'Email': 'juan.perez@email.com',
        'Teléfono': '+56912345678',
        'Dirección': 'Av. Providencia 123',
        'Ciudad': 'Santiago',
        'Comuna': 'Providencia',
        'Región': 'Metropolitana',
        'Activo': 'Sí',
        'Tipo Guardia': 'contratado',
        'Fecha OS10': '2025-12-31',
        'Instalación Asignada': 'Condominio La Florida',
        'Rol Actual': 'Guardia Principal',
        'Sexo': 'Masculino',
        'Nacionalidad': 'Chilena',
        'Fecha Nacimiento': '1990-05-15',
        'AFP': 'Capital',
        'Descuento AFP': '1.00',
        'Previsión Salud': 'FONASA',
        'Cotiza Sobre 7': 'No',
        'Monto Pactado UF': '87.80',
        'Es Pensionado': 'No',
        'Asignación Familiar': 'No',
        'Tramo Asignación': '',
        'Talla Camisa': 'L',
        'Talla Pantalón': '42',
        'Talla Zapato': '42',
        'Altura (cm)': '175',
        'Peso (kg)': '70'
      }
    ];

    // Crear libro de Excel
    const workbook = XLSX.utils.book_new();
    const worksheet = XLSX.utils.json_to_sheet(excelData);

    // Configurar anchos de columna
    const columnWidths = [
      { width: 36 }, // ID
      { width: 20 }, // Nombre
      { width: 20 }, // Apellido Paterno
      { width: 20 }, // Apellido Materno
      { width: 15 }, // RUT
      { width: 30 }, // Email
      { width: 15 }, // Teléfono
      { width: 40 }, // Dirección
      { width: 20 }, // Ciudad
      { width: 20 }, // Comuna
      { width: 20 }, // Región
      { width: 10 }, // Activo
      { width: 15 }, // Tipo Guardia
      { width: 15 }, // Fecha OS10
      { width: 30 }, // Instalación Asignada
      { width: 20 }, // Rol Actual
      { width: 15 }, // Sexo
      { width: 15 }, // Nacionalidad
      { width: 20 }, // Fecha Nacimiento
      { width: 20 }, // AFP
      { width: 15 }, // Descuento AFP
      { width: 20 }, // Previsión Salud
      { width: 15 }, // Cotiza Sobre 7
      { width: 20 }, // Monto Pactado UF
      { width: 15 }, // Es Pensionado
      { width: 20 }, // Asignación Familiar
      { width: 20 }, // Tramo Asignación
      { width: 15 }, // Talla Camisa
      { width: 20 }, // Talla Pantalón
      { width: 15 }, // Talla Zapato
      { width: 15 }, // Altura
      { width: 15 }  // Peso
    ];
    worksheet['!cols'] = columnWidths;

    // Agregar hoja al libro
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Nuevos Guardias');

    // Generar archivo
    const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });

    console.log('✅ Plantilla Excel generada, tamaño:', buffer.length, 'bytes');

    // Crear respuesta con headers para descarga
    const response = new NextResponse(buffer);
    response.headers.set('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    response.headers.set('Content-Disposition', `attachment; filename="plantilla_nuevos_guardias.xlsx"`);

    console.log('✅ Plantilla Excel enviada correctamente');
    return response;

  } catch (error) {
    console.error('❌ Error generando plantilla:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor al generar plantilla' },
      { status: 500 }
    );
  }
}
