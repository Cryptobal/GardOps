import { NextRequest, NextResponse } from 'next/server';
import * as XLSX from 'xlsx';

export async function GET(request: NextRequest) {
  try {
    console.log('🚀 Generando template para roles de servicio...');

    // Datos de ejemplo para el template
    const templateData = [
      {
        'Nombre': 'Día 4x4x12 / 08:00 20:00',
        'Días Trabajo': 4,
        'Días Descanso': 4,
        'Horas Turno': 12,
        'Hora Inicio': '08:00',
        'Hora Termino': '20:00',
        'Estado': 'Activo'
      },
      {
        'Nombre': 'Noche 4x4x12 / 20:00 08:00',
        'Días Trabajo': 4,
        'Días Descanso': 4,
        'Horas Turno': 12,
        'Hora Inicio': '20:00',
        'Hora Termino': '08:00',
        'Estado': 'Activo'
      },
      {
        'Nombre': 'Día 5x2x12 / 08:00 20:00',
        'Días Trabajo': 5,
        'Días Descanso': 2,
        'Horas Turno': 12,
        'Hora Inicio': '08:00',
        'Hora Termino': '20:00',
        'Estado': 'Activo'
      }
    ];

    // Crear libro de Excel
    const workbook = XLSX.utils.book_new();
    const worksheet = XLSX.utils.json_to_sheet(templateData);

    // Configurar anchos de columna
    const columnWidths = [
      { width: 40 }, // Nombre
      { width: 15 }, // Días Trabajo
      { width: 15 }, // Días Descanso
      { width: 15 }, // Horas Turno
      { width: 15 }, // Hora Inicio
      { width: 15 }, // Hora Termino
      { width: 12 }  // Estado
    ];
    worksheet['!cols'] = columnWidths;

    // Agregar hoja al libro
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Roles de Servicio');

    // Generar archivo
    const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });

    // Crear respuesta con el archivo
    const response = new NextResponse(buffer);
    response.headers.set('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    response.headers.set('Content-Disposition', 'attachment; filename="template_roles_servicio.xlsx"');

    console.log('✅ Template de roles de servicio generado exitosamente');
    return response;

  } catch (error) {
    console.error('❌ Error generando template de roles de servicio:', error);
    return NextResponse.json(
      { error: 'Error al generar template' },
      { status: 500 }
    );
  }
}
