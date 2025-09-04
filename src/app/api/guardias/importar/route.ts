import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/database';
import * as XLSX from 'xlsx';
import { geocodificarDireccion, construirDireccionCompleta } from '@/lib/utils/geocoding-batch';
import { getCurrentUserServer } from '@/lib/auth';

// Función para convertir fechas de diferentes formatos
function convertirFecha(fecha: any): string | null {
  if (!fecha) return null;
  
  const fechaStr = fecha.toString().trim();
  if (!fechaStr) return null;
  
  // Intentar diferentes formatos de fecha
  const formatos = [
    // Formato ISO (YYYY-MM-DD)
    /^\d{4}-\d{2}-\d{2}$/,
    // Formato DD/MM/YYYY
    /^\d{1,2}\/\d{1,2}\/\d{4}$/,
    // Formato DD-MM-YYYY
    /^\d{1,2}-\d{1,2}-\d{4}$/,
    // Formato DD.MM.YYYY
    /^\d{1,2}\.\d{1,2}\.\d{4}$/,
    // Formato MM/DD/YYYY
    /^\d{1,2}\/\d{1,2}\/\d{4}$/,
    // Formato con texto (ej: "15 de enero de 2024")
    /^\d{1,2}\s+de\s+\w+\s+de\s+\d{4}$/i
  ];
  
  try {
    // Si es un número (fecha serial de Excel)
    if (!isNaN(fecha) && typeof fecha === 'number') {
      // Excel usa días desde 1900-01-01, pero hay un bug de 1900
      const fechaExcel = new Date((fecha - 25569) * 86400 * 1000);
      if (!isNaN(fechaExcel.getTime())) {
        return fechaExcel.toISOString().split('T')[0];
      }
    }
    
    // Intentar parsear directamente
    const fechaParseada = new Date(fechaStr);
    if (!isNaN(fechaParseada.getTime())) {
      return fechaParseada.toISOString().split('T')[0];
    }
    
    // Manejar formato DD/MM/YYYY específicamente
    if (/^\d{1,2}\/\d{1,2}\/\d{4}$/.test(fechaStr)) {
      const [dia, mes, año] = fechaStr.split('/');
      const fechaFormateada = new Date(parseInt(año), parseInt(mes) - 1, parseInt(dia));
      if (!isNaN(fechaFormateada.getTime())) {
        return fechaFormateada.toISOString().split('T')[0];
      }
    }
    
    // Manejar formato DD-MM-YYYY específicamente
    if (/^\d{1,2}-\d{1,2}-\d{4}$/.test(fechaStr)) {
      const [dia, mes, año] = fechaStr.split('-');
      const fechaFormateada = new Date(parseInt(año), parseInt(mes) - 1, parseInt(dia));
      if (!isNaN(fechaFormateada.getTime())) {
        return fechaFormateada.toISOString().split('T')[0];
      }
    }
    
    return null;
  } catch (error) {
    console.log(`Error convirtiendo fecha: ${fechaStr}`, error);
    return null;
  }
}

export async function POST(request: NextRequest) {
  try {
    console.log('🚀 Importando guardias desde Excel...');
    
    // Obtener tenant_id del usuario autenticado
    const currentUser = getCurrentUserServer(request);
    if (!currentUser?.tenant_id) {
      return NextResponse.json(
        { error: 'Usuario no autenticado o sin tenant_id' },
        { status: 401 }
      );
    }
    const tenantId = currentUser.tenant_id;

    const formData = await request.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return NextResponse.json(
        { error: 'No se proporcionó archivo' },
        { status: 400 }
      );
    }

    // Validar tipo de archivo
    if (!file.name.match(/\.(xlsx|xls)$/i)) {
      return NextResponse.json(
        { error: 'Solo se permiten archivos Excel (.xlsx, .xls)' },
        { status: 400 }
      );
    }

    // Leer archivo Excel
    const buffer = Buffer.from(await file.arrayBuffer());
    const workbook = XLSX.read(buffer, { type: 'buffer' });
    const worksheet = workbook.Sheets[workbook.SheetNames[0]];
    const excelData = XLSX.utils.sheet_to_json(worksheet);

    if (excelData.length === 0) {
      return NextResponse.json(
        { error: 'El archivo Excel no contiene datos' },
        { status: 400 }
      );
    }

    console.log(`📊 Procesando ${excelData.length} filas del Excel...`);

    let actualizados = 0;
    let creados = 0;
    let errores = 0;
    const erroresDetalle: string[] = [];

    // Procesar cada fila del Excel
    for (let i = 0; i < excelData.length; i++) {
      const row = excelData[i] as any;
      const rowNumber = i + 2; // +2 porque Excel empieza en 1 y tenemos header

      try {
        const guardiaId = row['ID']?.trim();
        let isNewGuardia = false;

        // Si no hay ID o está vacío, es un guardia nuevo
        if (!guardiaId) {
          isNewGuardia = true;
        } else {
          // Verificar si el guardia existe
          const guardiaExists = await query(
            'SELECT id FROM guardias WHERE id = $1',
            [guardiaId]
          );
          isNewGuardia = guardiaExists.rows.length === 0;
        }

        if (isNewGuardia) {
          // CREAR NUEVO GUARDIA
          console.log(`🆕 Creando nuevo guardia en fila ${rowNumber}...`);
          
          const insertFields: string[] = [];
          const insertValues: any[] = [];
          let paramIndex = 1;

          // Campos obligatorios para nuevo guardia
          const requiredFields = {
            'Nombre': 'nombre',
            'Apellido Paterno': 'apellido_paterno',
            'Apellido Materno': 'apellido_materno',
            'RUT': 'rut',
            'Email': 'email'
          };

          // Verificar campos obligatorios
          let hasRequiredFieldErrors = false;
          for (const [excelField, dbField] of Object.entries(requiredFields)) {
            if (!row[excelField] || !row[excelField].toString().trim()) {
              erroresDetalle.push(`Fila ${rowNumber}: Campo obligatorio '${excelField}' está vacío`);
              errores++;
              hasRequiredFieldErrors = true;
              break; // Salir del bucle si hay un campo obligatorio faltante
            }
            insertFields.push(dbField);
            insertValues.push(row[excelField].toString().trim());
            paramIndex++;
          }

          // Si faltan campos obligatorios, continuar con la siguiente fila
          if (hasRequiredFieldErrors) continue;

          // Agregar campos opcionales
          const optionalFields: { [key: string]: string } = {
            'Teléfono': 'telefono',
            'Dirección': 'direccion',
            'Ciudad': 'ciudad',
            'Comuna': 'comuna',
            'Región': 'region',
            'Activo': 'activo',
            'Tipo Guardia': 'tipo_guardia',
            'Fecha OS10': 'fecha_os10',
            'Sexo': 'sexo',
            'Nacionalidad': 'nacionalidad',
            'Fecha Nacimiento': 'fecha_nacimiento',
            'AFP': 'afp',
            'Descuento AFP': 'descuento_afp',
            'Previsión Salud': 'prevision_salud',
            'Cotiza Sobre 7': 'cotiza_sobre_7',
            'Monto Pactado UF': 'monto_pactado_uf',
            'Es Pensionado': 'es_pensionado',
            'Asignación Familiar': 'asignacion_familiar',
            'Tramo Asignación': 'tramo_asignacion',
            'Talla Camisa': 'talla_camisa',
            'Talla Pantalón': 'talla_pantalon',
            'Talla Zapato': 'talla_zapato',
            'Altura (cm)': 'altura_cm',
            'Peso (kg)': 'peso_kg',
            // Nuevos campos
            'Monto Anticipo': 'monto_anticipo',
            'PIN': 'pin',
            'Dias Vac. Pendientes': 'dias_vacaciones_pendientes',
            'Fecha Ingreso': 'fecha_ingreso',
            'Fecha Finiquito': 'fecha_finiquito',
            // Campos bancarios
            'Banco': 'banco_id',
            'Tipo de Cuenta': 'tipo_cuenta',
            'Número de Cuenta': 'numero_cuenta'
          };

          // Procesar campos opcionales
          for (const [excelField, dbField] of Object.entries(optionalFields)) {
            if (row[excelField] !== undefined && row[excelField] !== null && row[excelField] !== '') {
              let value = row[excelField];

              // Conversiones especiales para campos opcionales
              if (excelField === 'Activo') {
                value = value === 'Sí' || value === 'SI' || value === 'S' || value === '1' || value === true;
              } else if (excelField === 'Cotiza Sobre 7') {
                value = value === 'Sí' || value === 'SI' || value === 'S' || value === '1' || value === true;
              } else if (excelField === 'Es Pensionado') {
                value = value === 'Sí' || value === 'SI' || value === 'S' || value === '1' || value === true;
              } else if (excelField === 'Asignación Familiar') {
                value = value === 'Sí' || value === 'SI' || value === 'S' || value === '1' || value === true;
              } else if (excelField === 'Fecha Nacimiento') {
                const fechaConvertida = convertirFecha(value);
                if (fechaConvertida) {
                  value = fechaConvertida;
                  console.log(`✅ Fecha Nacimiento convertida: ${row[excelField]} -> ${value}`);
                } else {
                  console.log(`⚠️ Fecha Nacimiento inválida en fila ${rowNumber}: ${value}`);
                  continue; // Saltar este campo si la fecha es inválida
                }
              } else if (excelField === 'Fecha OS10') {
                const fechaConvertida = convertirFecha(value);
                if (fechaConvertida) {
                  value = fechaConvertida;
                  console.log(`✅ Fecha OS10 convertida: ${row[excelField]} -> ${value}`);
                } else {
                  console.log(`⚠️ Fecha OS10 inválida en fila ${rowNumber}: ${value}`);
                  continue; // Saltar este campo si la fecha es inválida
                }
              } else if (excelField === 'Fecha Ingreso') {
                const fechaConvertida = convertirFecha(value);
                if (fechaConvertida) {
                  value = fechaConvertida;
                  console.log(`✅ Fecha Ingreso convertida: ${row[excelField]} -> ${value}`);
                } else {
                  console.log(`⚠️ Fecha Ingreso inválida en fila ${rowNumber}: ${value}`);
                  continue; // Saltar este campo si la fecha es inválida
                }
              } else if (excelField === 'Fecha Finiquito') {
                const fechaConvertida = convertirFecha(value);
                if (fechaConvertida) {
                  value = fechaConvertida;
                  console.log(`✅ Fecha Finiquito convertida: ${row[excelField]} -> ${value}`);
                } else {
                  console.log(`⚠️ Fecha Finiquito inválida en fila ${rowNumber}: ${value}`);
                  continue; // Saltar este campo si la fecha es inválida
                }
              } else if (excelField === 'Monto Anticipo') {
                // Convertir a entero sin decimales
                const numValue = parseInt(value.toString().replace(/[^\d]/g, ''));
                if (!isNaN(numValue) && numValue >= 0 && numValue <= 999999) {
                  value = numValue;
                } else {
                  console.log(`⚠️ Monto anticipo inválido en fila ${rowNumber}: ${value}`);
                  continue; // Saltar este campo si es inválido
                }
              } else if (excelField === 'PIN') {
                // Validar que sea de 4 dígitos
                const pinStr = value.toString().trim();
                if (pinStr.length === 4 && /^[0-9]{4}$/.test(pinStr)) {
                  value = pinStr;
                } else {
                  console.log(`⚠️ PIN inválido en fila ${rowNumber}: ${value} (debe ser 4 dígitos)`);
                  continue; // Saltar este campo si es inválido
                }
              } else if (excelField === 'Dias Vac. Pendientes') {
                const numValue = parseFloat(value);
                if (!isNaN(numValue) && numValue >= 0) {
                  value = numValue;
                } else {
                  console.log(`⚠️ Días vacaciones inválidos en fila ${rowNumber}: ${value}`);
                  continue; // Saltar este campo si es inválido
                }
              } else if (excelField === 'Banco') {
                // Buscar banco por nombre y obtener su UUID
                const bancoNombre = value.toString().trim();
                try {
                  const bancoResult = await query(
                    'SELECT id FROM bancos WHERE LOWER(nombre) = LOWER($1)',
                    [bancoNombre]
                  );
                  
                  if (bancoResult.rows.length > 0) {
                    value = bancoResult.rows[0].id;
                    console.log(`✅ Banco encontrado: ${bancoNombre} -> ${value}`);
                  } else {
                    console.log(`⚠️ Banco no encontrado en fila ${rowNumber}: ${bancoNombre}`);
                    continue; // Saltar este campo si el banco no existe
                  }
                } catch (error) {
                  console.log(`⚠️ Error buscando banco en fila ${rowNumber}: ${bancoNombre}`, error);
                  continue; // Saltar este campo si hay error
                }
              } else if (excelField === 'Tipo de Cuenta') {
                // Convertir tipo de cuenta a valores válidos de la base de datos
                const tipoCuentaRaw = value.toString().trim().toLowerCase();
                if (['cct', 'cuenta corriente'].includes(tipoCuentaRaw)) {
                  value = 'CCT';
                } else if (['cte', 'cuenta vista'].includes(tipoCuentaRaw)) {
                  value = 'CTE';
                } else if (['cta', 'cuenta de ahorro'].includes(tipoCuentaRaw)) {
                  value = 'CTA';
                } else if (['rut', 'cuenta rut'].includes(tipoCuentaRaw)) {
                  value = 'RUT';
                } else {
                  console.log(`⚠️ Tipo de cuenta inválido en fila ${rowNumber}: ${value}. Usando CTE por defecto.`);
                  value = 'CTE'; // Valor por defecto
                }
                console.log(`✅ Tipo de cuenta convertido: ${value.toString().trim()} -> ${value}`);
              } else if (['Descuento AFP', 'Monto Pactado UF', 'Altura (cm)', 'Peso (kg)', 'Talla Zapato'].includes(excelField)) {
                const numValue = parseFloat(value);
                if (!isNaN(numValue)) {
                  value = numValue;
                }
              }

              insertFields.push(dbField);
              insertValues.push(value);
              paramIndex++;
            }
          }

          // Agregar campos por defecto
          insertFields.push('tenant_id', 'created_at', 'updated_at');
          insertValues.push(tenantId);

          // Ejecutar inserción
          const insertQuery = `
            INSERT INTO guardias (${insertFields.join(', ')})
            VALUES (${insertValues.map((_, index) => `$${index + 1}`).join(', ')}, NOW(), NOW())
            RETURNING id
          `;

          const insertResult = await query(insertQuery, insertValues);
          const nuevoGuardiaId = insertResult.rows[0]?.id;
          creados++;

          console.log(`✅ Nuevo guardia creado correctamente en fila ${rowNumber}`);

          // Geocodificación desactivada temporalmente debido a restricciones de API key
          // Los guardias se pueden geocodificar manualmente después de la importación
          if (nuevoGuardiaId && row['Dirección']) {
            console.log(`📍 Dirección registrada para geocodificación posterior: ${row['Dirección']?.toString().trim() || ''}`);
          }

        } else {
          // ACTUALIZAR GUARDIA EXISTENTE
          console.log(`🔄 Actualizando guardia existente ${guardiaId}...`);

          const updateFields: string[] = [];
          const updateValues: any[] = [];
          let paramIndex = 1;

                  // Mapear campos del Excel a la base de datos
        const fieldMappings: { [key: string]: string } = {
          'Nombre': 'nombre',
          'Apellido Paterno': 'apellido_paterno',
          'Apellido Materno': 'apellido_materno',
          'RUT': 'rut',
          'Email': 'email',
          'Teléfono': 'telefono',
          'Dirección': 'direccion',
          'Ciudad': 'ciudad',
          'Comuna': 'comuna',
          'Región': 'region',
          'Activo': 'activo',
          'Tipo Guardia': 'tipo_guardia',
          'Fecha OS10': 'fecha_os10',
          'Sexo': 'sexo',
          'Nacionalidad': 'nacionalidad',
          'Fecha Nacimiento': 'fecha_nacimiento',
          'AFP': 'afp',
          'Descuento AFP': 'descuento_afp',
          'Previsión Salud': 'prevision_salud',
          'Cotiza Sobre 7': 'cotiza_sobre_7',
          'Monto Pactado UF': 'monto_pactado_uf',
          'Es Pensionado': 'es_pensionado',
          'Asignación Familiar': 'asignacion_familiar',
          'Tramo Asignación': 'tramo_asignacion',
          'Talla Camisa': 'talla_camisa',
          'Talla Pantalón': 'talla_pantalon',
          'Talla Zapato': 'talla_zapato',
          'Altura (cm)': 'altura_cm',
          'Peso (kg)': 'peso_kg',
          // Nuevos campos
          'Monto Anticipo': 'monto_anticipo',
          'PIN': 'pin',
          'Dias Vac. Pendientes': 'dias_vacaciones_pendientes',
          'Fecha Ingreso': 'fecha_ingreso',
          'Fecha Finiquito': 'fecha_finiquito',
          // Campos bancarios
          'Banco': 'banco_id',
          'Tipo de Cuenta': 'tipo_cuenta',
          'Número de Cuenta': 'numero_cuenta'
          // NOTA: Instalación Asignada y Rol Actual no se pueden importar directamente
          // porque requieren lógica de negocio adicional para asignar a puestos operativos
        };

          // Procesar cada campo mapeado
          for (const [excelField, dbField] of Object.entries(fieldMappings)) {
            if (row[excelField] !== undefined && row[excelField] !== null && row[excelField] !== '') {
              let value = row[excelField];

              // Conversiones especiales
              if (excelField === 'Activo') {
                value = value === 'Sí' || value === 'SI' || value === 'S' || value === '1' || value === true;
              } else if (excelField === 'Cotiza Sobre 7') {
                value = value === 'Sí' || value === 'SI' || value === 'S' || value === '1' || value === true;
              } else if (excelField === 'Es Pensionado') {
                value = value === 'Sí' || value === 'SI' || value === 'S' || value === '1' || value === true;
              } else if (excelField === 'Asignación Familiar') {
                value = value === 'Sí' || value === 'SI' || value === 'S' || value === '1' || value === true;
              } else if (excelField === 'Fecha Nacimiento') {
                const fechaConvertida = convertirFecha(value);
                if (fechaConvertida) {
                  value = fechaConvertida;
                  console.log(`✅ Fecha Nacimiento convertida para actualización: ${row[excelField]} -> ${value}`);
                } else {
                  console.log(`⚠️ Fecha Nacimiento inválida en fila ${rowNumber}: ${value}`);
                  continue; // Saltar este campo si la fecha es inválida
                }
              } else if (excelField === 'Fecha OS10') {
                const fechaConvertida = convertirFecha(value);
                if (fechaConvertida) {
                  value = fechaConvertida;
                  console.log(`✅ Fecha OS10 convertida para actualización: ${row[excelField]} -> ${value}`);
                } else {
                  console.log(`⚠️ Fecha OS10 inválida en fila ${rowNumber}: ${value}`);
                  continue; // Saltar este campo si la fecha es inválida
                }
              } else if (excelField === 'Fecha Ingreso') {
                const fechaConvertida = convertirFecha(value);
                if (fechaConvertida) {
                  value = fechaConvertida;
                  console.log(`✅ Fecha Ingreso convertida para actualización: ${row[excelField]} -> ${value}`);
                } else {
                  console.log(`⚠️ Fecha Ingreso inválida en fila ${rowNumber}: ${value}`);
                  continue; // Saltar este campo si la fecha es inválida
                }
              } else if (excelField === 'Fecha Finiquito') {
                const fechaConvertida = convertirFecha(value);
                if (fechaConvertida) {
                  value = fechaConvertida;
                  console.log(`✅ Fecha Finiquito convertida para actualización: ${row[excelField]} -> ${value}`);
                } else {
                  console.log(`⚠️ Fecha Finiquito inválida en fila ${rowNumber}: ${value}`);
                  continue; // Saltar este campo si la fecha es inválida
                }
              } else if (excelField === 'Monto Anticipo') {
                // Convertir a entero sin decimales
                const numValue = parseInt(value.toString().replace(/[^\d]/g, ''));
                if (!isNaN(numValue) && numValue >= 0 && numValue <= 999999) {
                  value = numValue;
                } else {
                  console.log(`⚠️ Monto anticipo inválido en fila ${rowNumber}: ${value}`);
                  continue; // Saltar este campo si es inválido
                }
              } else if (excelField === 'PIN') {
                // Validar que sea de 4 dígitos
                const pinStr = value.toString().trim();
                if (pinStr.length === 4 && /^[0-9]{4}$/.test(pinStr)) {
                  value = pinStr;
                } else {
                  console.log(`⚠️ PIN inválido en fila ${rowNumber}: ${value} (debe ser 4 dígitos)`);
                  continue; // Saltar este campo si es inválido
                }
              } else if (excelField === 'Dias Vac. Pendientes') {
                const numValue = parseFloat(value);
                if (!isNaN(numValue) && numValue >= 0) {
                  value = numValue;
                } else {
                  console.log(`⚠️ Días vacaciones inválidos en fila ${rowNumber}: ${value}`);
                  continue; // Saltar este campo si es inválido
                }
              } else if (excelField === 'Banco') {
                // Buscar banco por nombre y obtener su UUID
                const bancoNombre = value.toString().trim();
                try {
                  const bancoResult = await query(
                    'SELECT id FROM bancos WHERE LOWER(nombre) = LOWER($1)',
                    [bancoNombre]
                  );
                  
                  if (bancoResult.rows.length > 0) {
                    value = bancoResult.rows[0].id;
                    console.log(`✅ Banco encontrado para actualización: ${bancoNombre} -> ${value}`);
                  } else {
                    console.log(`⚠️ Banco no encontrado en fila ${rowNumber}: ${bancoNombre}`);
                    continue; // Saltar este campo si el banco no existe
                  }
                } catch (error) {
                  console.log(`⚠️ Error buscando banco en fila ${rowNumber}: ${bancoNombre}`, error);
                  continue; // Saltar este campo si hay error
                }
              } else if (excelField === 'Tipo de Cuenta') {
                // Convertir tipo de cuenta a valores válidos de la base de datos
                const tipoCuentaRaw = value.toString().trim().toLowerCase();
                if (['cct', 'cuenta corriente'].includes(tipoCuentaRaw)) {
                  value = 'CCT';
                } else if (['cte', 'cuenta vista'].includes(tipoCuentaRaw)) {
                  value = 'CTE';
                } else if (['cta', 'cuenta de ahorro'].includes(tipoCuentaRaw)) {
                  value = 'CTA';
                } else if (['rut', 'cuenta rut'].includes(tipoCuentaRaw)) {
                  value = 'RUT';
                } else {
                  console.log(`⚠️ Tipo de cuenta inválido en fila ${rowNumber}: ${value}. Usando CTE por defecto.`);
                  value = 'CTE'; // Valor por defecto
                }
                console.log(`✅ Tipo de cuenta convertido para actualización: ${value.toString().trim()} -> ${value}`);
              } else if (['Descuento AFP', 'Monto Pactado UF', 'Altura (cm)', 'Peso (kg)', 'Talla Zapato'].includes(excelField)) {
                const numValue = parseFloat(value);
                if (!isNaN(numValue)) {
                  value = numValue;
                }
              }

              updateFields.push(`${dbField} = $${paramIndex}`);
              updateValues.push(value);
              paramIndex++;
            }
          }

          // Agregar fecha de actualización
          updateFields.push('updated_at = NOW()');

          // Si hay campos para actualizar, ejecutar la actualización
          if (updateFields.length > 1) { // > 1 porque siempre agregamos updated_at
            const updateQuery = `
              UPDATE guardias 
              SET ${updateFields.join(', ')}
              WHERE id = $${paramIndex}
            `;
            updateValues.push(guardiaId);

            await query(updateQuery, updateValues);
            actualizados++;

            console.log(`✅ Guardia ${guardiaId} actualizado correctamente`);
          }
        }

      } catch (error) {
        console.error(`❌ Error procesando fila ${rowNumber}:`, error);
        erroresDetalle.push(`Fila ${rowNumber}: Error interno - ${error instanceof Error ? error.message : 'Error desconocido'}`);
        errores++;
      }
    }

    console.log(`📊 Importación completada: ${creados} creados, ${actualizados} actualizados, ${errores} errores`);

    // Retornar resultado
    return NextResponse.json({
      success: true,
      message: `Importación completada`,
      creados,
      actualizados,
      errores,
      total: excelData.length,
      erroresDetalle: errores > 0 ? erroresDetalle : undefined
    });

  } catch (error) {
    console.error('❌ Error importando guardias:', error);
    return NextResponse.json(
      { 
        error: 'Error interno del servidor al importar',
        details: error instanceof Error ? error.message : 'Error desconocido'
      },
      { status: 500 }
    );
  }
}
