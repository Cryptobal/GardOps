import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@vercel/postgres';
import * as XLSX from 'xlsx';
import { calcularNomenclaturaRol } from '@/lib/utils/calcularNomenclaturaRol';

export async function POST(request: NextRequest) {
  try {
    console.log('🚀 Importando roles de servicio desde Excel...');

    // Obtener tenantId del usuario autenticado
    let tenantId = request.nextUrl.searchParams.get('tenantId');
    if (!tenantId) {
      const email = request.headers.get('x-user-email');
      if (email) {
        const t = await sql`SELECT tenant_id::text AS tid FROM usuarios WHERE lower(email)=lower(${email}) LIMIT 1`;
        tenantId = t.rows?.[0]?.tid || null;
      }
    }

    console.log('🔍 Importando roles para tenant:', tenantId);

    // Obtener el archivo del formulario
    const formData = await request.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return NextResponse.json(
        { error: 'No se proporcionó archivo' },
        { status: 400 }
      );
    }

    // Leer el archivo Excel
    const buffer = await file.arrayBuffer();
    const workbook = XLSX.read(buffer, { type: 'buffer' });
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    const data = XLSX.utils.sheet_to_json(worksheet);

    if (!data || data.length === 0) {
      return NextResponse.json(
        { error: 'El archivo está vacío o no contiene datos válidos' },
        { status: 400 }
      );
    }

    console.log(`📊 Procesando ${data.length} registros...`);

    const resultados = {
      exitosos: 0,
      errores: 0,
      detalles: [] as any[]
    };

    // Procesar cada registro
    for (let i = 0; i < data.length; i++) {
      const row = data[i] as any;
      const rowNumber = i + 2; // +2 porque Excel empieza en 1 y la primera fila es header

      try {
        // Validar campos requeridos
        const nombre = row['Nombre']?.toString().trim();
        const diasTrabajo = parseInt(row['Días Trabajo']) || 0;
        const diasDescanso = parseInt(row['Días Descanso']) || 0;
        const horasTurno = parseInt(row['Horas Turno']) || 0;
        const horaInicio = row['Hora Inicio']?.toString().trim();
        const horaTermino = row['Hora Termino']?.toString().trim();
        const estado = row['Estado']?.toString().trim() || 'Activo';

        if (!nombre || !horaInicio || !horaTermino) {
          throw new Error('Faltan campos requeridos: Nombre, Hora Inicio, Hora Termino');
        }

        if (diasTrabajo <= 0 || diasDescanso <= 0 || horasTurno <= 0) {
          throw new Error('Días de trabajo, días de descanso y horas de turno deben ser mayores a 0');
        }

        // Validar formato de horas
        const horaInicioRegex = /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/;
        const horaTerminoRegex = /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/;

        if (!horaInicioRegex.test(horaInicio) || !horaTerminoRegex.test(horaTermino)) {
          throw new Error('Formato de hora inválido. Use HH:MM (ej: 08:00)');
        }

        // Validar estado
        if (!['Activo', 'Inactivo'].includes(estado)) {
          throw new Error('Estado debe ser "Activo" o "Inactivo"');
        }

        // Verificar si el rol ya existe
        const existingRole = await sql`
          SELECT id FROM as_turnos_roles_servicio 
          WHERE nombre = ${nombre}
          AND (tenant_id::text = ${tenantId} OR (tenant_id IS NULL AND ${tenantId} = '1'))
        `;

        if (existingRole.rows.length > 0) {
          throw new Error('Ya existe un rol con este nombre');
        }

        // Calcular nomenclatura automática si no se proporciona
        let nombreFinal = nombre;
        if (!nombre.includes('x') || !nombre.includes('/')) {
          try {
            const nomenclaturaCalculada = calcularNomenclaturaRol({
              dias_trabajo: diasTrabajo,
              dias_descanso: diasDescanso,
              hora_inicio: horaInicio,
              hora_termino: horaTermino,
              tipo_turno: nombre.toLowerCase().includes('noche') ? 'Noche' : 'Día'
            });
            nombreFinal = nomenclaturaCalculada.nomenclatura;
          } catch (calcError) {
            console.log('⚠️ No se pudo calcular nomenclatura, usando nombre original');
          }
        }

        // Insertar el rol
        const insertResult = await sql`
          INSERT INTO as_turnos_roles_servicio (
            nombre,
            dias_trabajo,
            dias_descanso,
            horas_turno,
            hora_inicio,
            hora_termino,
            estado,
            tenant_id,
            created_at,
            updated_at
          ) VALUES (
            ${nombreFinal},
            ${diasTrabajo},
            ${diasDescanso},
            ${horasTurno},
            ${horaInicio},
            ${horaTermino},
            ${estado},
            ${tenantId},
            NOW(),
            NOW()
          ) RETURNING id, nombre
        `;

        resultados.exitosos++;
        resultados.detalles.push({
          fila: rowNumber,
          nombre: nombreFinal,
          estado: 'Éxito',
          mensaje: 'Rol creado correctamente'
        });

        console.log(`✅ Fila ${rowNumber}: Rol creado - ${nombreFinal}`);

      } catch (error: any) {
        resultados.errores++;
        resultados.detalles.push({
          fila: rowNumber,
          nombre: row['Nombre'] || 'Sin nombre',
          estado: 'Error',
          mensaje: error.message
        });

        console.log(`❌ Fila ${rowNumber}: ${error.message}`);
      }
    }

    console.log(`📊 Importación completada: ${resultados.exitosos} exitosos, ${resultados.errores} errores`);

    return NextResponse.json({
      success: true,
      message: `Importación completada: ${resultados.exitosos} roles creados, ${resultados.errores} errores`,
      resultados
    });

  } catch (error) {
    console.error('❌ Error importando roles de servicio:', error);
    return NextResponse.json(
      { error: 'Error al importar roles de servicio' },
      { status: 500 }
    );
  }
}
