import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/database';
import { logCRUD } from '@/lib/logging';

// Función de validación de integridad de datos
const validarActualizaciones = (actualizaciones: any[]): string[] => {
  const errores: string[] = [];
  
  if (!Array.isArray(actualizaciones)) {
    errores.push('Las actualizaciones deben ser un array');
    return errores;
  }
  
  actualizaciones.forEach((actualizacion, index) => {
    if (!actualizacion || typeof actualizacion !== 'object') {
      errores.push(`Actualización ${index}: debe ser un objeto válido`);
      return;
    }
    
    if (!actualizacion.puesto_id) {
      errores.push(`Actualización ${index}: puesto_id es requerido`);
    }
    
    if (!actualizacion.anio || !actualizacion.mes || !actualizacion.dia) {
      errores.push(`Actualización ${index}: anio, mes y dia son requeridos`);
    }
    
    if (!['trabajado', 'libre'].includes(actualizacion.estado)) {
      errores.push(`Actualización ${index}: estado debe ser 'trabajado' o 'libre'`);
    }
  });
  
  return errores;
};

export async function POST(request: NextRequest) {
  const startTime = Date.now();
  const timestamp = new Date().toISOString();
  
  try {
    console.log(`[${timestamp}] 🚀 Iniciando guardado de pauta mensual`);
    
    const body = await request.json();
    const { instalacion_id, anio, mes, actualizaciones } = body;
    
    // Por ahora usar un tenant_id fijo para testing
    const tenantId = 'accebf8a-bacc-41fa-9601-ed39cb320a52';
    const usuario = 'admin@test.com'; // En producción, obtener del token de autenticación

    console.log(`[${timestamp}] 📥 Datos recibidos:`, { 
      instalacion_id, 
      anio, 
      mes, 
      total_actualizaciones: actualizaciones?.length || 0 
    });

    // Validación de parámetros básicos
    if (!instalacion_id || !anio || !mes) {
      console.log(`[${timestamp}] ❌ Validación fallida: parámetros requeridos faltantes`);
      return NextResponse.json(
        { error: 'Parámetros requeridos: instalacion_id, anio, mes' },
        { status: 400 }
      );
    }

    // Validación de estructura de actualizaciones
    if (!actualizaciones || !Array.isArray(actualizaciones) || actualizaciones.length === 0) {
      console.log(`[${timestamp}] ❌ Validación fallida: actualizaciones inválidas`);
      return NextResponse.json(
        { error: 'Las actualizaciones deben ser un array válido con datos de turnos' },
        { status: 400 }
      );
    }

    // Validación de integridad de datos
    const erroresValidacion = validarActualizaciones(actualizaciones);
    if (erroresValidacion.length > 0) {
      console.log(`[${timestamp}] ❌ Errores de validación:`, erroresValidacion);
      return NextResponse.json(
        { error: 'Datos inválidos', detalles: erroresValidacion },
        { status: 400 }
      );
    }

    console.log(`[${timestamp}] ✅ Validación exitosa, procediendo con guardado`);

    // Obtener datos anteriores para el log
    const pautaAnterior = await query(`
      SELECT pm.*, po.nombre_puesto
      FROM as_turnos_pauta_mensual pm
      INNER JOIN as_turnos_puestos_operativos po ON pm.puesto_id = po.id
      WHERE po.instalacion_id = $1 
        AND pm.anio = $2 
        AND pm.mes = $3
    `, [instalacion_id, anio, mes]);

    console.log(`[${timestamp}] 🔍 Procesando ${actualizaciones.length} actualizaciones...`);

    // Procesar cada actualización
    const operaciones = [];
    let totalOperaciones = 0;
    
    for (const actualizacion of actualizaciones) {
      const { puesto_id, guardia_id, anio: anioAct, mes: mesAct, dia, estado } = actualizacion;
      
      console.log(`[${timestamp}] 🔄 Procesando actualización:`, { puesto_id, guardia_id, dia, estado });
      
      // Verificar si existe un registro para este puesto, día y mes
      const registroExistente = await query(`
        SELECT COUNT(*) as count
        FROM as_turnos_pauta_mensual pm
        WHERE pm.puesto_id = $1 
          AND pm.anio = $2 
          AND pm.mes = $3 
          AND pm.dia = $4
      `, [puesto_id, anioAct, mesAct, dia]);

      const existeRegistro = parseInt(registroExistente.rows[0].count) > 0;
      
      if (existeRegistro) {
        // Actualizar registro existente
        operaciones.push(
          query(`
            UPDATE as_turnos_pauta_mensual 
            SET estado = $1, 
                guardia_id = $2,
                updated_at = NOW()
            WHERE puesto_id = $3 
              AND anio = $4 
              AND mes = $5 
              AND dia = $6
          `, [estado, guardia_id, puesto_id, anioAct, mesAct, dia])
        );
      } else {
        // Insertar nuevo registro
        operaciones.push(
          query(`
            INSERT INTO as_turnos_pauta_mensual 
            (puesto_id, guardia_id, anio, mes, dia, estado, created_at, updated_at)
            VALUES ($1, $2, $3, $4, $5, $6, NOW(), NOW())
          `, [puesto_id, guardia_id, anioAct, mesAct, dia, estado])
        );
      }
      totalOperaciones++;
    }

    console.log(`[${timestamp}] ⏳ Ejecutando ${totalOperaciones} operaciones en paralelo...`);
    await Promise.all(operaciones);

    // Obtener datos después de la actualización para el log
    const pautaDespues = await query(`
      SELECT pm.*, po.nombre_puesto
      FROM as_turnos_pauta_mensual pm
      INNER JOIN as_turnos_puestos_operativos po ON pm.puesto_id = po.id
      WHERE po.instalacion_id = $1 
        AND pm.anio = $2 
        AND pm.mes = $3
    `, [instalacion_id, anio, mes]);

    // Crear un ID único para la pauta mensual
    const pautaId = `${instalacion_id}_${anio}_${mes}`;
    
    // Log de actualización de pauta mensual
    await logCRUD(
      'pauta_mensual',
      pautaId,
      'UPDATE',
      usuario,
      {
        instalacion_id,
        anio: parseInt(anio),
        mes: parseInt(mes),
        registros_anteriores: pautaAnterior.rows.length,
        pauta_anterior: pautaAnterior.rows
      },
      {
        instalacion_id,
        anio: parseInt(anio),
        mes: parseInt(mes),
        registros_despues: pautaDespues.rows.length,
        pauta_despues: pautaDespues.rows,
        total_operaciones,
        tiempo_procesamiento_ms: Date.now() - startTime
      },
      tenantId
    );

    const endTime = Date.now();
    const duration = endTime - startTime;
    
    console.log(`[${timestamp}] ✅ Pauta mensual actualizada exitosamente`);
    console.log(`[${timestamp}] 📊 Resumen: ${actualizaciones.length} actualizaciones, ${totalOperaciones} operaciones`);
    console.log(`[${timestamp}] ⏱️ Tiempo total: ${duration}ms`);

    return NextResponse.json({
      success: true,
      message: 'Pauta mensual actualizada exitosamente',
      instalacion_id,
      anio,
      mes,
      metadata: {
        total_actualizaciones: actualizaciones.length,
        total_operaciones: totalOperaciones,
        tiempo_procesamiento_ms: duration,
        timestamp: timestamp
      }
    });

  } catch (error) {
    const errorTime = new Date().toISOString();
    console.error(`[${errorTime}] ❌ Error guardando pauta mensual:`, error);
    
    // Log del error
    await logCRUD(
      'pauta_mensual',
      'ERROR',
      'ERROR',
      'admin@test.com',
      null,
      {
        error: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined,
        endpoint: '/api/pauta-mensual/guardar',
        method: 'POST'
      },
      'accebf8a-bacc-41fa-9601-ed39cb320a52'
    );
    
    return NextResponse.json(
      { 
        error: 'Error interno del servidor al guardar la pauta mensual',
        timestamp: errorTime,
        detalles: process.env.NODE_ENV === 'development' ? error : undefined
      },
      { status: 500 }
    );
  }
} 