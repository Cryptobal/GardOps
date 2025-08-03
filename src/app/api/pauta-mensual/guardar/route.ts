import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/database';

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

    // Verificar que existe pauta para esta instalación en este mes
    const pautaExistente = await query(`
      SELECT COUNT(*) as count
      FROM as_turnos_pauta_mensual
      WHERE instalacion_id = $1 
        AND anio = $2 
        AND mes = $3
    `, [instalacion_id, anio, mes]);

    const tienePautaBase = parseInt(pautaExistente.rows[0].count) > 0;
    
    if (!tienePautaBase) {
      console.log(`[${timestamp}] ⚠️ No existe pauta base, creando registros nuevos...`);
    } else {
      console.log(`[${timestamp}] 🔍 Pauta base encontrada, actualizando asignaciones...`);
    }

    // Procesar cada día de la pauta
    const operaciones = [];
    let totalOperaciones = 0;
    
    for (const guardiaPauta of pauta) {
      // Validar estructura de cada guardia
      if (!guardiaPauta || !guardiaPauta.guardia_id || !Array.isArray(guardiaPauta.dias)) {
        console.warn(`[${timestamp}] ⚠️ Estructura de guardia inválida:`, guardiaPauta);
        continue;
      }

      const { guardia_id, dias } = guardiaPauta;
      
      // Manejar IDs de PPC correctamente
      let realGuardiaId = guardia_id;
      if (guardia_id.includes('_')) {
        // Es un PPC con sufijo (ej: "20d640b3-e6b5-4868-af91-2571a313b766_1")
        // Usar el ID completo para PPCs
        realGuardiaId = guardia_id;
      } else {
        // Es un guardia real, usar el ID tal como viene
        realGuardiaId = guardia_id;
      }
      
      for (let diaIndex = 0; diaIndex < dias.length; diaIndex++) {
        const dia = diaIndex + 1;
        const estado = dias[diaIndex];
        
        // Validar que el estado sea válido
        if (estado === undefined || estado === null) {
          console.warn(`[${timestamp}] ⚠️ Estado inválido para guardia ${guardia_id}, día ${dia}:`, estado);
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
        
        console.log(`[${timestamp}] 🔄 Procesando guardia ${guardia_id} (real: ${realGuardiaId}), día ${dia}: ${estado} -> ${tipoDB}`);
        
        if (tienePautaBase) {
          // Actualizar registro existente
          operaciones.push(
            query(`
              UPDATE as_turnos_pauta_mensual 
              SET estado = $1, 
                  updated_at = NOW()
              WHERE instalacion_id = $2 
                AND guardia_id = $3 
                AND anio = $4 
                AND mes = $5 
                AND dia = $6
            `, [tipoDB, instalacion_id, realGuardiaId, anio, mes, dia])
          );
        } else {
          // Insertar nuevo registro
          operaciones.push(
            query(`
              INSERT INTO as_turnos_pauta_mensual 
              (instalacion_id, guardia_id, anio, mes, dia, estado, created_at, updated_at)
              VALUES ($1, $2, $3, $4, $5, $6, NOW(), NOW())
              ON CONFLICT (instalacion_id, guardia_id, anio, mes, dia) 
              DO UPDATE SET 
                estado = EXCLUDED.estado,
                updated_at = NOW()
            `, [instalacion_id, realGuardiaId, anio, mes, dia, tipoDB])
          );
        }
        totalOperaciones++;
      }
    }

    console.log(`[${timestamp}] ⏳ Ejecutando ${totalOperaciones} operaciones en paralelo...`);
    await Promise.all(operaciones);

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