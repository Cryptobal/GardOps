import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@vercel/postgres';
import * as XLSX from 'xlsx';

export async function GET(request: NextRequest) {
  try {
    console.log('🚀 Exportando roles de servicio a Excel...');

    // Obtener tenantId del usuario autenticado
    let tenantId = request.nextUrl.searchParams.get('tenantId');
    if (!tenantId) {
      const email = request.headers.get('x-user-email');
      if (email) {
        const t = await sql`SELECT tenant_id::text AS tid FROM usuarios WHERE lower(email)=lower(${email}) LIMIT 1`;
        tenantId = t.rows?.[0]?.tid || null;
      }
    }

    console.log('🔍 Exportando roles para tenant:', tenantId);

    // Consulta para obtener todos los roles de servicio
    let query = `
      SELECT 
        id,
        nombre,
        dias_trabajo,
        dias_descanso,
        horas_turno,
        hora_inicio,
        hora_termino,
        estado,
        created_at,
        updated_at,
        fecha_inactivacion
      FROM as_turnos_roles_servicio 
      WHERE 1=1
    `;
    
    const params: any[] = [];
    let paramIndex = 1;

    if (tenantId) {
      query += ` AND tenant_id::text = $${paramIndex}`;
      params.push(tenantId);
      paramIndex++;
    }

    query += ` ORDER BY nombre`;

    const result = await sql.query(query, params);

    if (result.rows.length === 0) {
      return NextResponse.json(
        { error: 'No hay roles de servicio para exportar' },
        { status: 404 }
      );
    }

    console.log(`📊 Exportando ${result.rows.length} roles de servicio...`);

    // Preparar datos para Excel
    const excelData = result.rows.map((rol: any) => ({
      'ID': rol.id,
      'Nombre': rol.nombre || '',
      'Días Trabajo': rol.dias_trabajo || 0,
      'Días Descanso': rol.dias_descanso || 0,
      'Horas Turno': rol.horas_turno || 0,
      'Hora Inicio': rol.hora_inicio || '',
      'Hora Termino': rol.hora_termino || '',
      'Estado': rol.estado || 'Activo',
      'Fecha Inactivación': rol.fecha_inactivacion ? new Date(rol.fecha_inactivacion).toLocaleDateString('es-CL') : '',
      'Fecha Creación': rol.created_at ? new Date(rol.created_at).toLocaleDateString('es-CL') : '',
      'Fecha Actualización': rol.updated_at ? new Date(rol.updated_at).toLocaleDateString('es-CL') : ''
    }));

    // Crear libro de Excel
    const workbook = XLSX.utils.book_new();
    const worksheet = XLSX.utils.json_to_sheet(excelData);

    // Configurar anchos de columna para mejor visualización
    const columnWidths = [
      { width: 36 }, // ID
      { width: 40 }, // Nombre
      { width: 15 }, // Días Trabajo
      { width: 15 }, // Días Descanso
      { width: 15 }, // Horas Turno
      { width: 15 }, // Hora Inicio
      { width: 15 }, // Hora Termino
      { width: 12 }, // Estado
      { width: 18 }, // Fecha Inactivación
      { width: 18 }, // Fecha Creación
      { width: 20 }  // Fecha Actualización
    ];
    worksheet['!cols'] = columnWidths;

    // Agregar hoja al libro
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Roles de Servicio');

    // Generar archivo
    const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });

    // Crear respuesta con el archivo
    const response = new NextResponse(buffer);
    response.headers.set('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    response.headers.set('Content-Disposition', `attachment; filename="roles_servicio_${new Date().toISOString().split('T')[0]}.xlsx"`);

    console.log('✅ Roles de servicio exportados exitosamente');
    return response;

  } catch (error) {
    console.error('❌ Error exportando roles de servicio:', error);
    return NextResponse.json(
      { error: 'Error al exportar roles de servicio' },
      { status: 500 }
    );
  }
}
