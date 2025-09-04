import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/database';
import * as XLSX from 'xlsx';

export async function GET(request: NextRequest) {
  try {
    console.log('🚀 Exportando guardias a Excel...');

    // Consulta con información de instalación y rol, pero más robusta
    const result = await query(`
      SELECT 
        g.id,
        g.nombre,
        g.apellido_paterno,
        g.apellido_materno,
        g.rut,
        g.email,
        g.telefono,
        g.direccion,
        g.latitud,
        g.longitud,
        g.ciudad,
        g.comuna,
        g.region,
        g.activo,
        g.tipo_guardia,
        g.fecha_os10,
        g.created_at,
        g.updated_at,
        
        -- Campos adicionales de postulación (si existen)
        COALESCE(g.sexo, '') as sexo,
        COALESCE(g.nacionalidad, '') as nacionalidad,
        COALESCE(g.fecha_nacimiento::text, '') as fecha_nacimiento,
        COALESCE(g.afp, '') as afp,
        COALESCE(g.descuento_afp::text, '') as descuento_afp,
        COALESCE(g.prevision_salud, '') as prevision_salud,
        COALESCE(g.cotiza_sobre_7::text, '') as cotiza_sobre_7,
        COALESCE(g.monto_pactado_uf::text, '') as monto_pactado_uf,
        COALESCE(g.es_pensionado::text, '') as es_pensionado,
        COALESCE(g.asignacion_familiar::text, '') as asignacion_familiar,
        COALESCE(g.tramo_asignacion, '') as tramo_asignacion,
        COALESCE(g.talla_camisa, '') as talla_camisa,
        COALESCE(g.talla_pantalon, '') as talla_pantalon,
        COALESCE(g.talla_zapato::text, '') as talla_zapato,
        COALESCE(g.altura_cm::text, '') as altura_cm,
        COALESCE(g.peso_kg::text, '') as peso_kg,
        
        -- Campos bancarios
        COALESCE(b.nombre, '') as banco,
        COALESCE(g.tipo_cuenta, '') as tipo_cuenta,
        COALESCE(g.numero_cuenta, '') as numero_cuenta,
        
        -- Información de instalación asignada (crítica para operaciones)
        COALESCE(i.nombre, '') as instalacion_asignada,
        COALESCE(rs.nombre, '') as rol_actual
        
      FROM guardias g
      LEFT JOIN as_turnos_puestos_operativos po ON po.guardia_id = g.id AND po.activo = true
      LEFT JOIN instalaciones i ON i.id = po.instalacion_id
      LEFT JOIN as_turnos_roles_servicio rs ON rs.id = po.rol_id
      LEFT JOIN bancos b ON b.id = g.banco_id
      ORDER BY g.nombre, g.apellido_paterno, g.apellido_materno
    `);

    if (result.rows.length === 0) {
      return NextResponse.json(
        { error: 'No hay guardias para exportar' },
        { status: 404 }
      );
    }

    console.log(`📊 Exportando ${result.rows.length} guardias...`);

    // Preparar datos para Excel
    const excelData = result.rows.map((guardia: any) => ({
      'ID': guardia.id,
      'Nombre': guardia.nombre || '',
      'Apellido Paterno': guardia.apellido_paterno || '',
      'Apellido Materno': guardia.apellido_materno || '',
      'RUT': guardia.rut || '',
      'Email': guardia.email || '',
      'Teléfono': guardia.telefono || '',
      'Dirección': guardia.direccion || '',
      'Ciudad': guardia.ciudad || '',
      'Comuna': guardia.comuna || '',
      'Región': guardia.region || '',
      'Activo': guardia.activo ? 'Sí' : 'No',
      'Tipo Guardia': guardia.tipo_guardia || '',
      'Fecha OS10': guardia.fecha_os10 || '',
      'Instalación Asignada': guardia.instalacion_asignada || '',
      'Rol Actual': guardia.rol_actual || '',
      'Sexo': guardia.sexo || '',
      'Nacionalidad': guardia.nacionalidad || '',
      'Fecha Nacimiento': guardia.fecha_nacimiento || '',
      'AFP': guardia.afp || '',
      'Descuento AFP': guardia.descuento_afp || '',
      'Previsión Salud': guardia.prevision_salud || '',
      'Cotiza Sobre 7': guardia.cotiza_sobre_7 || '',
      'Monto Pactado UF': guardia.monto_pactado_uf || '',
      'Es Pensionado': guardia.es_pensionado || '',
      'Asignación Familiar': guardia.asignacion_familiar || '',
      'Tramo Asignación': guardia.tramo_asignacion || '',
      'Talla Camisa': guardia.talla_camisa || '',
      'Talla Pantalón': guardia.talla_pantalon || '',
      'Talla Zapato': guardia.talla_zapato || '',
      'Altura (cm)': guardia.altura_cm || '',
      'Peso (kg)': guardia.peso_kg || '',
      // Campos bancarios
      'Banco': guardia.banco || '',
      'Tipo de Cuenta': guardia.tipo_cuenta || '',
      'Número de Cuenta': guardia.numero_cuenta || '',
      'Fecha Creación': guardia.created_at || '',
      'Fecha Actualización': guardia.updated_at || ''
    }));

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
      { width: 15 }, // Peso
      // Campos bancarios
      { width: 25 }, // Banco
      { width: 15 }, // Tipo de Cuenta
      { width: 20 }, // Número de Cuenta
      { width: 20 }, // Fecha Creación
      { width: 20 }  // Fecha Actualización
    ];
    worksheet['!cols'] = columnWidths;

    // Agregar hoja al libro
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Guardias');

    // Generar archivo
    const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });

    console.log('✅ Archivo Excel generado, tamaño:', buffer.length, 'bytes');

    // Crear respuesta con headers para descarga
    const response = new NextResponse(buffer);
    response.headers.set('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    response.headers.set('Content-Disposition', `attachment; filename="guardias_${new Date().toISOString().split('T')[0]}.xlsx"`);

    console.log('✅ Archivo Excel enviado correctamente');
    return response;

  } catch (error) {
    console.error('❌ Error exportando guardias:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor al exportar' },
      { status: 500 }
    );
  }
}
