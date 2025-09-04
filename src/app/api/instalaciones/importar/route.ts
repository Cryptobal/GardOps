import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/database';
import * as XLSX from 'xlsx';

export async function POST(request: NextRequest) {
  try {
    console.log('🚀 Importando instalaciones desde Excel...');

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
        const instalacionId = row['ID']?.toString().trim();
        let isNewInstalacion = false;

        // Si no hay ID o está vacío, es una instalación nueva
        if (!instalacionId) {
          isNewInstalacion = true;
        } else {
          // Verificar si la instalación existe
          const instalacionExists = await query(
            'SELECT id FROM instalaciones WHERE id = $1',
            [instalacionId]
          );
          isNewInstalacion = instalacionExists.rows.length === 0;
        }

        if (isNewInstalacion) {
          // CREAR NUEVA INSTALACIÓN
          console.log(`🆕 Creando nueva instalación en fila ${rowNumber}...`);
          
          const insertFields: string[] = [];
          const insertValues: any[] = [];
          let paramIndex = 1;

          // Campos obligatorios para nueva instalación
          const requiredFields = {
            'Nombre': 'nombre',
            'Dirección': 'direccion'
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

          // Buscar cliente por nombre o RUT si se proporciona
          let clienteId = null;
          if (row['Cliente'] || row['RUT Cliente']) {
            const clienteNombre = row['Cliente']?.toString().trim();
            const clienteRut = row['RUT Cliente']?.toString().trim();
            
            let clienteQuery = '';
            let clienteParams = [];
            
            if (clienteRut) {
              clienteQuery = 'SELECT id FROM clientes WHERE rut = $1 LIMIT 1';
              clienteParams = [clienteRut];
            } else if (clienteNombre) {
              clienteQuery = 'SELECT id FROM clientes WHERE LOWER(nombre) = LOWER($1) LIMIT 1';
              clienteParams = [clienteNombre];
            }
            
            if (clienteQuery) {
              const clienteResult = await query(clienteQuery, clienteParams);
              if (clienteResult.rows.length > 0) {
                clienteId = clienteResult.rows[0].id;
              } else {
                erroresDetalle.push(`Fila ${rowNumber}: Cliente '${clienteNombre || clienteRut}' no encontrado`);
                errores++;
                continue;
              }
            }
          }

          // Agregar cliente_id si se encontró
          if (clienteId) {
            insertFields.push('cliente_id');
            insertValues.push(clienteId);
            paramIndex++;
          }

          // Agregar campos opcionales
          const optionalFields: { [key: string]: string } = {
            'Ciudad': 'ciudad',
            'Comuna': 'comuna',
            'Teléfono': 'telefono',
            'Latitud': 'latitud',
            'Longitud': 'longitud',
            'Valor Turno Extra': 'valor_turno_extra',
            'Estado': 'estado'
          };

          for (const [excelField, dbField] of Object.entries(optionalFields)) {
            if (row[excelField] && row[excelField].toString().trim()) {
              let value = row[excelField].toString().trim();
              
              // Validaciones específicas
              if (dbField === 'latitud' || dbField === 'longitud') {
                const numValue = parseFloat(value);
                if (!isNaN(numValue)) {
                  insertFields.push(dbField);
                  insertValues.push(numValue);
                  paramIndex++;
                }
              } else if (dbField === 'valor_turno_extra') {
                const numValue = parseFloat(value);
                if (!isNaN(numValue)) {
                  insertFields.push(dbField);
                  insertValues.push(numValue);
                  paramIndex++;
                }
              } else {
                insertFields.push(dbField);
                insertValues.push(value);
                paramIndex++;
              }
            }
          }

          // Construir query de inserción
          const placeholders = insertValues.map((_, index) => `$${index + 1}`).join(', ');
          const insertQuery = `
            INSERT INTO instalaciones (${insertFields.join(', ')}, created_at, updated_at)
            VALUES (${placeholders}, NOW(), NOW())
            RETURNING id
          `;

          const insertResult = await query(insertQuery, insertValues);
          creados++;
          console.log(`✅ Instalación creada con ID: ${insertResult.rows[0].id}`);

        } else {
          // ACTUALIZAR INSTALACIÓN EXISTENTE
          console.log(`📝 Actualizando instalación existente: ${instalacionId}`);
          
          const updateFields: string[] = [];
          const updateValues: any[] = [];
          let paramIndex = 1;

          // Buscar cliente por nombre o RUT si se proporciona para actualización
          let clienteId = null;
          if (row['Cliente'] || row['RUT Cliente']) {
            const clienteNombre = row['Cliente']?.toString().trim();
            const clienteRut = row['RUT Cliente']?.toString().trim();
            
            let clienteQuery = '';
            let clienteParams = [];
            
            if (clienteRut) {
              clienteQuery = 'SELECT id FROM clientes WHERE rut = $1 LIMIT 1';
              clienteParams = [clienteRut];
            } else if (clienteNombre) {
              clienteQuery = 'SELECT id FROM clientes WHERE LOWER(nombre) = LOWER($1) LIMIT 1';
              clienteParams = [clienteNombre];
            }
            
            if (clienteQuery) {
              const clienteResult = await query(clienteQuery, clienteParams);
              if (clienteResult.rows.length > 0) {
                clienteId = clienteResult.rows[0].id;
              }
            }
          }

          // Campos que se pueden actualizar
          const updateableFields: { [key: string]: string } = {
            'Nombre': 'nombre',
            'Dirección': 'direccion',
            'Ciudad': 'ciudad',
            'Comuna': 'comuna',
            'Teléfono': 'telefono',
            'Latitud': 'latitud',
            'Longitud': 'longitud',
            'Valor Turno Extra': 'valor_turno_extra',
            'Estado': 'estado'
          };

          // Agregar cliente_id si se encontró
          if (clienteId) {
            updateFields.push(`cliente_id = $${paramIndex}`);
            updateValues.push(clienteId);
            paramIndex++;
          }

          for (const [excelField, dbField] of Object.entries(updateableFields)) {
            if (row[excelField] !== undefined && row[excelField] !== null && row[excelField].toString().trim() !== '') {
              let value = row[excelField].toString().trim();
              
              // Validaciones específicas
              if (dbField === 'latitud' || dbField === 'longitud') {
                const numValue = parseFloat(value);
                if (!isNaN(numValue)) {
                  updateFields.push(`${dbField} = $${paramIndex}`);
                  updateValues.push(numValue);
                  paramIndex++;
                }
              } else if (dbField === 'valor_turno_extra') {
                const numValue = parseFloat(value);
                if (!isNaN(numValue)) {
                  updateFields.push(`${dbField} = $${paramIndex}`);
                  updateValues.push(numValue);
                  paramIndex++;
                }
              } else {
                updateFields.push(`${dbField} = $${paramIndex}`);
                updateValues.push(value);
                paramIndex++;
              }
            }
          }

          if (updateFields.length > 0) {
            // Agregar updated_at
            updateFields.push(`updated_at = $${paramIndex}`);
            updateValues.push(new Date());
            paramIndex++;

            // Agregar ID para WHERE
            updateValues.push(instalacionId);

            const updateQuery = `
              UPDATE instalaciones 
              SET ${updateFields.join(', ')}
              WHERE id = $${paramIndex}
            `;

            await query(updateQuery, updateValues);
            actualizados++;
            console.log(`✅ Instalación actualizada: ${instalacionId}`);
          } else {
            console.log(`⚠️ No hay cambios para la instalación: ${instalacionId}`);
          }
        }

      } catch (error) {
        console.error(`❌ Error procesando fila ${rowNumber}:`, error);
        erroresDetalle.push(`Fila ${rowNumber}: ${error instanceof Error ? error.message : 'Error desconocido'}`);
        errores++;
      }
    }

    // Respuesta final
    const response = {
      success: true,
      creados,
      actualizados,
      errores,
      total: excelData.length,
      erroresDetalle: errores > 0 ? erroresDetalle : undefined
    };

    console.log('✅ Importación de instalaciones completada:', response);
    return NextResponse.json(response);

  } catch (error) {
    console.error('❌ Error importando instalaciones:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor al importar instalaciones' },
      { status: 500 }
    );
  }
}
