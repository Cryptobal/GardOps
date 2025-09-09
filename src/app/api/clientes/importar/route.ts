import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/database';
import * as XLSX from 'xlsx';
import { getCurrentUserServer } from '@/lib/auth';

import { logger, devLogger, apiLogger } from '@/lib/utils/logger';
export async function POST(request: NextRequest) {
  try {
    logger.debug('🚀 Importando clientes desde Excel...');
    
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

    // Leer archivo Excel
    const buffer = Buffer.from(await file.arrayBuffer());
    const workbook = XLSX.read(buffer, { type: 'buffer' });
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    const excelData = XLSX.utils.sheet_to_json(worksheet);

    logger.debug(`📊 Procesando ${excelData.length} filas del archivo Excel`);

    let creados = 0;
    let actualizados = 0;
    let errores = 0;
    const erroresDetalle: string[] = [];

    // Procesar cada fila del Excel
    for (let i = 0; i < excelData.length; i++) {
      const rowNumber = i + 2; // +2 porque Excel empieza en 1 y la primera fila son headers
      const row = excelData[i] as any;
      
      try {
        logger.debug(`🔍 Procesando fila ${rowNumber}...`);
        
        // Verificar si ya existe el cliente por RUT
        let clienteId = null;
        if (row['RUT Empresa']) {
          const existingClientQuery = `
            SELECT id FROM clientes 
            WHERE rut = $1 AND tenant_id = $2
          `;
          const existingClient = await query(existingClientQuery, [row['RUT Empresa'].toString().trim(), tenantId]);
          if (existingClient.rows.length > 0) {
            clienteId = existingClient.rows[0].id;
          }
        }

        if (!clienteId) {
          // CREAR NUEVO CLIENTE
          logger.debug(`🆕 Creando nuevo cliente en fila ${rowNumber}...`);
          
          const insertFields: string[] = [];
          const insertValues: any[] = [];
          let paramIndex = 1;

          // Campos obligatorios para nuevo cliente
          const requiredFields = {
            'Nombre': 'nombre',
            'RUT Empresa': 'rut'
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
            'Representante Legal': 'representante_legal',
            'RUT Representante': 'rut_representante',
            'Email': 'email',
            'Teléfono': 'telefono',
            'Dirección': 'direccion',
            'Latitud': 'latitud',
            'Longitud': 'longitud',
            'Ciudad': 'ciudad',
            'Comuna': 'comuna',
            'Razón Social': 'razon_social',
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
            INSERT INTO clientes (${insertFields.join(', ')}, tenant_id, created_at, updated_at)
            VALUES (${placeholders}, $${insertValues.length + 1}, NOW(), NOW())
            RETURNING id
          `;
          
          // Agregar tenant_id a los valores
          insertValues.push(tenantId);

          const insertResult = await query(insertQuery, insertValues);
          creados++;
          logger.debug(`✅ Cliente creado con ID: ${insertResult.rows[0].id}`);

        } else {
          // ACTUALIZAR CLIENTE EXISTENTE
          logger.debug(`📝 Actualizando cliente existente: ${clienteId}`);
          
          const updateFields: string[] = [];
          const updateValues: any[] = [];
          let paramIndex = 1;

          // Campos que se pueden actualizar
          const updateableFields: { [key: string]: string } = {
            'Nombre': 'nombre',
            'RUT Empresa': 'rut',
            'Representante Legal': 'representante_legal',
            'RUT Representante': 'rut_representante',
            'Email': 'email',
            'Teléfono': 'telefono',
            'Dirección': 'direccion',
            'Latitud': 'latitud',
            'Longitud': 'longitud',
            'Ciudad': 'ciudad',
            'Comuna': 'comuna',
            'Razón Social': 'razon_social',
            'Estado': 'estado'
          };

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
            updateValues.push(clienteId);

            const updateQuery = `
              UPDATE clientes 
              SET ${updateFields.join(', ')}
              WHERE id = $${paramIndex}
            `;

            await query(updateQuery, updateValues);
            actualizados++;
            logger.debug(`✅ Cliente actualizado: ${clienteId}`);
          } else {
            logger.debug(`⚠️ No hay cambios para el cliente: ${clienteId}`);
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

    devLogger.success(' Importación de clientes completada:', response);
    return NextResponse.json(response);

  } catch (error) {
    console.error('❌ Error importando clientes:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor al importar clientes' },
      { status: 500 }
    );
  }
}
