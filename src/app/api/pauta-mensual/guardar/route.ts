import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/database';
import { logCRUD } from '@/lib/logging';

// Función de validación de integridad de datos
const validarAsignaciones = (asignaciones: any[]): string[] => {
  const errores: string[] = [];
  
  if (!Array.isArray(asignaciones)) {
    errores.push('Las asignaciones deben ser un array');
    return errores;
  }
  
  asignaciones.forEach((asignacion, index) => {
    if (!asignacion || typeof asignacion !== 'object') {
      errores.push(`Asignación ${index}: debe ser un objeto válido`);
      return;
    }
    
    if (!asignacion.guardia_id) {
      errores.push(`Asignación ${index}: guardia_id es requerido`);
    }
    
    if (!Array.isArray(asignacion.dias)) {
      errores.push(`Asignación ${index}: dias debe ser un array`);
    } else {
      asignacion.dias.forEach((dia: any, diaIndex: number) => {
        if (dia !== undefined && dia !== null && dia !== '' && 
            !['T', 'L', 'P', 'LIC', 'trabajado', 'libre', 'permiso'].includes(dia)) {
          errores.push(`Asignación ${index}, día ${diaIndex + 1}: estado inválido "${dia}"`);
        }
      });
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
    const { instalacion_id, anio, mes, pauta } = body;
    
    // Por ahora usar un tenant_id fijo para testing
    const tenantId = 'accebf8a-bacc-41fa-9601-ed39cb320a52';
    const usuario = 'admin@test.com'; // En producción, obtener del token de autenticación

    console.log(`[${timestamp}] 📥 Datos recibidos:`, { 
      instalacion_id, 
      anio, 
      mes, 
      total_asignaciones: pauta?.length || 0 
    });

    // Validación de parámetros básicos
    if (!instalacion_id || !anio || !mes) {
      console.log(`[${timestamp}] ❌ Validación fallida: parámetros requeridos faltantes`);
      return NextResponse.json(
        { error: 'Parámetros requeridos: instalacion_id, anio, mes' },
        { status: 400 }
      );
    }

    // Validación de estructura de pauta
    if (!pauta || !Array.isArray(pauta) || pauta.length === 0) {
      console.log(`[${timestamp}] ❌ Validación fallida: pauta inválida`);
      return NextResponse.json(
        { error: 'La pauta debe ser un array válido con datos de guardias' },
        { status: 400 }
      );
    }

    // Validación de integridad de datos
    const erroresValidacion = validarAsignaciones(pauta);
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

    // No necesitamos verificar pauta a nivel global, lo haremos por puesto individual
    console.log(`[${timestamp}] 🔍 Verificando pauta por puesto individual...`);

    // Obtener todos los puestos operativos de la instalación (incluyendo PPCs)
    const todosLosPuestos = await query(`
      SELECT po.id as puesto_id, po.guardia_id, po.nombre_puesto, po.es_ppc
      FROM as_turnos_puestos_operativos po
      WHERE po.instalacion_id = $1 AND po.activo = true
      ORDER BY po.nombre_puesto
    `, [instalacion_id]);

    console.log(`[${timestamp}] 📋 Total puestos en instalación: ${todosLosPuestos.rows.length} (incluyendo PPCs)`);

    // Crear un mapa de los datos del frontend para acceso rápido
    const pautaFrontend = new Map();
    for (const guardiaPauta of pauta) {
      if (guardiaPauta && guardiaPauta.guardia_id && Array.isArray(guardiaPauta.dias)) {
        pautaFrontend.set(guardiaPauta.guardia_id, guardiaPauta.dias);
      }
    }

    // Procesar cada puesto operativo (incluyendo PPCs)
    const operaciones = [];
    let totalOperaciones = 0;
    
    for (const puesto of todosLosPuestos.rows) {
      const puestoId = puesto.puesto_id;
      const esPPC = puesto.es_ppc;
      const guardiaId = puesto.guardia_id || puestoId; // Para PPCs usar el puesto_id como guardia_id
      
      console.log(`[${timestamp}] 🔄 Procesando puesto: ${puesto.nombre_puesto} (PPC: ${esPPC})`);
      
      // Verificar si este puesto específico tiene registros existentes
      const pautaPuestoExistente = await query(`
        SELECT COUNT(*) as count
        FROM as_turnos_pauta_mensual pm
        WHERE pm.puesto_id = $1 
          AND pm.anio = $2 
          AND pm.mes = $3
      `, [puestoId, anio, mes]);

      const tienePautaPuesto = parseInt(pautaPuestoExistente.rows[0].count) > 0;
      console.log(`[${timestamp}] 📊 Puesto ${puesto.nombre_puesto}: ${tienePautaPuesto ? 'tiene registros existentes' : 'no tiene registros'} (${pautaPuestoExistente.rows[0].count} registros)`);
      
      // Obtener los días del frontend o usar días vacíos para PPCs
      let dias = pautaFrontend.get(guardiaId);
      if (!dias) {
        if (esPPC) {
          // Para PPCs sin datos en frontend, crear días con estado 'libre'
          const diasDelMes = new Date(parseInt(anio), parseInt(mes), 0).getDate();
          dias = Array.from({ length: diasDelMes }, () => 'L');
        } else {
          console.warn(`[${timestamp}] ⚠️ No se encontraron datos para guardia ${guardiaId}`);
          continue;
        }
      }
      
      for (let diaIndex = 0; diaIndex < dias.length; diaIndex++) {
        const dia = diaIndex + 1;
        const estado = dias[diaIndex];
        
        // Validar que el estado sea válido
        if (estado === undefined || estado === null) {
          console.warn(`[${timestamp}] ⚠️ Estado inválido para guardia ${guardiaId}, día ${dia}:`, estado);
          continue;
        }
      
        // Convertir estado del frontend a formato de base de datos
        let tipoDB = 'libre';
        switch (estado) {
          case 'T':
          case 'turno':
          case 'trabajado':
            tipoDB = 'trabajado';
            break;
          case 'L':
          case 'libre':
            tipoDB = 'libre';
            break;
          case 'P':
          case 'permiso':
            tipoDB = 'permiso';
            break;
          case 'LIC':
          case 'licencia':
            tipoDB = 'permiso'; // Usar permiso para licencias
            break;
          default:
            tipoDB = 'libre';
        }
        
        console.log(`[${timestamp}] 🔄 Procesando guardia ${guardiaId} (puesto: ${puestoId}), día ${dia}: ${estado} -> ${tipoDB}`);
        
        if (tienePautaPuesto) {
          // Actualizar registro existente para este puesto específico
          operaciones.push(
            query(`
              UPDATE as_turnos_pauta_mensual 
              SET estado = $1, 
                  updated_at = NOW()
              WHERE puesto_id = $2 
                AND guardia_id = $3 
                AND anio = $4 
                AND mes = $5 
                AND dia = $6
            `, [tipoDB, puestoId, guardiaId, anio, mes, dia])
          );
        } else {
          // Insertar nuevo registro para este puesto específico
          operaciones.push(
            query(`
              INSERT INTO as_turnos_pauta_mensual 
              (puesto_id, guardia_id, anio, mes, dia, estado, created_at, updated_at)
              VALUES ($1, $2, $3, $4, $5, $6, NOW(), NOW())
            `, [puestoId, guardiaId, anio, mes, dia, tipoDB])
          );
        }
        totalOperaciones++;
      }
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
    console.log(`[${timestamp}] 📊 Resumen: ${pauta.length} guardias, ${totalOperaciones} días actualizados`);
    console.log(`[${timestamp}] ⏱️ Tiempo total: ${duration}ms`);

    return NextResponse.json({
      success: true,
      message: 'Pauta mensual actualizada exitosamente',
      instalacion_id,
      anio,
      mes,
      metadata: {
        total_guardias: pauta.length,
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