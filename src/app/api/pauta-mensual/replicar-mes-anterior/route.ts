import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/database';

import { logger, devLogger, apiLogger } from '@/lib/utils/logger';
export async function POST(request: NextRequest) {
  try {
    const { anio, mes, instalaciones_ids } = await request.json();
    
    if (!anio || !mes) {
      return NextResponse.json(
        { error: 'Se requieren año y mes' },
        { status: 400 }
      );
    }

    logger.debug(`🚀 Iniciando replicación de pautas del mes anterior`);
    logger.debug(`📅 Mes destino: ${mes}/${anio}`);

    // 1. Calcular mes anterior dinámicamente
    let mesAnterior = mes - 1;
    let anioAnterior = anio;
    
    if (mesAnterior === 0) {
      mesAnterior = 12;
      anioAnterior = anio - 1;
    }
    
    logger.debug(`📅 Mes origen: ${mesAnterior}/${anioAnterior}`);

    // 2. Obtener instalaciones con pauta del mes anterior
    let filtroInstalaciones = '';
    let parametrosInstalaciones: string[] = [];
    
    if (instalaciones_ids && Array.isArray(instalaciones_ids) && instalaciones_ids.length > 0) {
      const placeholders = instalaciones_ids.map((_, index) => `$${index + 3}`).join(',');
      filtroInstalaciones = `AND po.instalacion_id IN (${placeholders})`;
      parametrosInstalaciones = instalaciones_ids;
    }

    const instalacionesConPautaResult = await query(`
      SELECT DISTINCT 
        po.instalacion_id,
        i.nombre as instalacion_nombre
      FROM as_turnos_pauta_mensual pm
      JOIN as_turnos_puestos_operativos po ON pm.puesto_id = po.id
      JOIN instalaciones i ON po.instalacion_id = i.id
      WHERE pm.anio = $1 
        AND pm.mes = $2
        AND po.activo = true
        ${filtroInstalaciones}
      ORDER BY po.instalacion_id
    `, [anioAnterior, mesAnterior, ...parametrosInstalaciones]);

    if (instalacionesConPautaResult.rows.length === 0) {
      return NextResponse.json({
        success: false,
        mensaje: `No hay instalaciones con pauta mensual para ${mesAnterior}/${anioAnterior}`
      });
    }

    logger.debug(`🏢 Instalaciones encontradas: ${instalacionesConPautaResult.rows.length}`);

    // 3. Obtener días del mes actual
    const diasMesActual = new Date(parseInt(anio), parseInt(mes), 0).getDate();
    logger.debug(`📅 Días del mes actual: ${diasMesActual}`);

    // 4. Replicar pautas para TODOS los puestos
    let totalReplicados = 0;
    const resultados = [];

    for (const instalacion of instalacionesConPautaResult.rows) {
      logger.debug(`\n🔄 Procesando instalación: ${instalacion.instalacion_nombre}`);
      
      // Obtener TODOS los puestos operativos de esta instalación
      const puestosResult = await query(`
        SELECT 
          po.id as puesto_id,
          po.nombre_puesto,
          po.guardia_id,
          po.es_ppc,
          po.rol_id
        FROM as_turnos_puestos_operativos po
        WHERE po.instalacion_id = $1 
          AND po.activo = true
        ORDER BY po.nombre_puesto
      `, [instalacion.instalacion_id]);

      logger.debug(`   📊 Puestos encontrados: ${puestosResult.rows.length}`);

      if (puestosResult.rows.length === 0) {
        logger.debug(`   ⚠️ No hay puestos activos para esta instalación`);
        continue;
      }

      let instalacionReplicados = 0;

      for (const puesto of puestosResult.rows) {
        logger.debug(`   🔍 Procesando puesto: ${puesto.nombre_puesto}`);
        
        // Obtener pauta del mes anterior para este puesto
        const pautaMesAnterior = await query(`
          SELECT dia, estado, guardia_id
          FROM as_turnos_pauta_mensual
          WHERE puesto_id = $1 
            AND anio = $2 
            AND mes = $3
          ORDER BY dia
        `, [puesto.puesto_id, anioAnterior, mesAnterior]);

        if (pautaMesAnterior.rows.length === 0) {
          logger.debug(`   ⚠️ No hay pauta del mes anterior para ${puesto.nombre_puesto}, saltando...`);
          continue;
        }

        logger.debug(`   📊 Pauta del mes anterior: ${pautaMesAnterior.rows.length} días`);

        // Detectar patrón real basándose en los datos del mes anterior
        const patronReal = detectarPatronReal(pautaMesAnterior.rows);
        console.log(`   🔍 Patrón detectado: ${patronReal.patron} (ciclo: ${patronReal.ciclo} días)`);

        // Calcular continuidad de la serie
        const estadosMesActual = calcularContinuidadSerie(patronReal, pautaMesAnterior.rows, diasMesActual);
        logger.debug(`   🔄 Estados generados para el mes actual: ${estadosMesActual.length} días`);

        // Replicar para cada día del mes actual
        for (let dia = 1; dia <= diasMesActual; dia++) {
          const estadoNuevo = estadosMesActual[dia - 1];
          
          // Verificar si ya existe pauta para este día
          const pautaExistente = await query(`
            SELECT id FROM as_turnos_pauta_mensual
            WHERE puesto_id = $1 AND anio = $2 AND mes = $3 AND dia = $4
          `, [puesto.puesto_id, parseInt(anio), parseInt(mes), dia]);

          if (pautaExistente.rows.length > 0) {
            logger.debug(`   ⚠️ Ya existe pauta para el día ${dia}, actualizando...`);
            
            // Actualizar pauta existente
            await query(`
              UPDATE as_turnos_pauta_mensual
              SET estado = $1, estado_ui = $2, updated_at = NOW()
              WHERE puesto_id = $3 AND anio = $4 AND mes = $5 AND dia = $6
            `, [
              estadoNuevo,
              estadoNuevo === 'planificado' ? 'plan' : estadoNuevo,
              puesto.puesto_id,
              parseInt(anio),
              parseInt(mes),
              dia
            ]);
          } else {
            // Insertar nueva pauta
            const ultimoDia = pautaMesAnterior.rows[pautaMesAnterior.rows.length - 1];
            
            await query(`
              INSERT INTO as_turnos_pauta_mensual (
                puesto_id, guardia_id, anio, mes, dia, estado, estado_ui, created_at, updated_at
              ) VALUES ($1, $2, $3, $4, $5, $6, $7, NOW(), NOW())
            `, [
              puesto.puesto_id,
              ultimoDia.guardia_id,
              parseInt(anio),
              parseInt(mes),
              dia,
              estadoNuevo,
              estadoNuevo === 'planificado' ? 'plan' : estadoNuevo
            ]);
          }
          
          totalReplicados++;
          instalacionReplicados++;
          
          logger.debug(`   ✅ Día ${dia}: ${estadoNuevo}`);
        }
        
        logger.debug(`   ✅ Replicados ${diasMesActual} días para ${puesto.nombre_puesto}`);
      }

      resultados.push({
        instalacion_id: instalacion.instalacion_id,
        instalacion_nombre: instalacion.instalacion_nombre,
        puestos_procesados: puestosResult.rows.length,
        dias_replicados: instalacionReplicados,
        estado: 'completado'
      });

      logger.debug(`   ✅ Instalación ${instalacion.instalacion_nombre}: ${instalacionReplicados} días replicados`);
    }

    logger.debug('\n🎯 REPLICACIÓN COMPLETADA:');
    logger.debug('==========================');
    logger.debug(`✅ Total registros replicados: ${totalReplicados}`);
    logger.debug(`✅ Instalaciones procesadas: ${resultados.length}`);

    return NextResponse.json({
      success: true,
      mensaje: `Pautas replicadas exitosamente de ${mesAnterior}/${anioAnterior} a ${mes}/${anio}`,
      total_replicados: totalReplicados,
      instalaciones_procesadas: resultados.length,
      resultados: resultados,
      mes_origen: `${mesAnterior}/${anioAnterior}`,
      mes_destino: `${mes}/${anio}`
    });

  } catch (error) {
    console.error('❌ Error replicando pautas del mes anterior:', error);
    
    return NextResponse.json(
      { error: 'Error interno del servidor al replicar pautas del mes anterior' },
      { status: 500 }
    );
  }
}

// Función para detectar el patrón real basándose en los datos del mes anterior
function detectarPatronReal(pautaMesAnterior: any[]): { patron: string; ciclo: number; diasTrabajo: number; diasDescanso: number } {
  if (pautaMesAnterior.length === 0) {
    return { patron: 'desconocido', ciclo: 0, diasTrabajo: 0, diasDescanso: 0 };
  }

  // Convertir a array de estados (planificado/libre)
  const estados = pautaMesAnterior.map(row => row.estado === 'planificado' ? 'T' : 'L');
  
  // Buscar patrón 4x4 (ciclo de 8 días)
  if (estados.length >= 8) {
    const patron4x4 = estados.slice(0, 8);
    let es4x4 = true;
    
    for (let i = 8; i < estados.length; i++) {
      if (estados[i] !== patron4x4[i % 8]) {
        es4x4 = false;
        break;
      }
    }
    
    if (es4x4) {
      return { patron: '4x4', ciclo: 8, diasTrabajo: 4, diasDescanso: 4 };
    }
  }
  
  // Buscar patrón 5x2 (ciclo de 7 días)
  if (estados.length >= 7) {
    const patron5x2 = estados.slice(0, 7);
    let es5x2 = true;
    
    for (let i = 7; i < estados.length; i++) {
      if (estados[i] !== patron5x2[i % 7]) {
        es5x2 = false;
        break;
      }
    }
    
    if (es5x2) {
      return { patron: '5x2', ciclo: 7, diasTrabajo: 5, diasDescanso: 2 };
    }
  }

  // Si no se encuentra un patrón claro, usar 4x4 por defecto
  return { patron: '4x4', ciclo: 8, diasTrabajo: 4, diasDescanso: 4 };
}

// Función para calcular la continuidad de la serie - CORREGIDA
function calcularContinuidadSerie(patronReal: any, pautaMesAnterior: any[], diasMesActual: number): string[] {
  const estados: string[] = [];
  
  if (pautaMesAnterior.length === 0) {
    // Si no hay datos del mes anterior, usar planificación por defecto
    for (let i = 0; i < diasMesActual; i++) {
      estados.push('planificado');
    }
    return estados;
  }

  // Determinar en qué posición del ciclo terminó el mes anterior
  // IMPORTANTE: Debemos contar la posición REAL en la secuencia de turnos, no el número del día
  const ultimoDia = pautaMesAnterior[pautaMesAnterior.length - 1];
  
  // Contar cuántos días de trabajo y descanso hay hasta el último día
  let diasTrabajo = 0;
  let diasDescanso = 0;
  
  for (const dia of pautaMesAnterior) {
    if (dia.estado === 'planificado') {
      diasTrabajo++;
    } else {
      diasDescanso++;
    }
  }
  
  // Calcular la posición en el ciclo basándose en el último estado
  let posicionEnCiclo = 0;
  
  if (ultimoDia.estado === 'planificado') {
    // Si el último día fue trabajo, calcular cuántos días de trabajo consecutivos hay al final
    let diasTrabajoConsecutivos = 0;
    for (let i = pautaMesAnterior.length - 1; i >= 0; i--) {
      if (pautaMesAnterior[i].estado === 'planificado') {
        diasTrabajoConsecutivos++;
      } else {
        break;
      }
    }
    posicionEnCiclo = diasTrabajoConsecutivos - 1; // Posición dentro del ciclo de trabajo
  } else {
    // Si el último día fue libre, calcular cuántos días de descanso consecutivos hay al final
    let diasDescansoConsecutivos = 0;
    for (let i = pautaMesAnterior.length - 1; i >= 0; i--) {
      if (pautaMesAnterior[i].estado === 'libre') {
        diasDescansoConsecutivos++;
      } else {
        break;
      }
    }
    posicionEnCiclo = patronReal.diasTrabajo + diasDescansoConsecutivos - 1; // Posición dentro del ciclo de descanso
  }
  
  console.log(`   🔄 Último día: ${ultimoDia.dia} (${ultimoDia.estado}), posición en ciclo: ${posicionEnCiclo}/${patronReal.ciclo}`);

  // Generar estados para el mes actual continuando desde la siguiente posición
  for (let dia = 1; dia <= diasMesActual; dia++) {
    // Calcular la posición en el ciclo para este día del nuevo mes
    const diaEnCiclo = (posicionEnCiclo + dia) % patronReal.ciclo;
    const esDiaTrabajo = diaEnCiclo < patronReal.diasTrabajo;
    
    estados.push(esDiaTrabajo ? 'planificado' : 'libre');
    
    logger.debug(`   🔄 Día ${dia}: posición en ciclo ${diaEnCiclo}, es trabajo: ${esDiaTrabajo} -> ${esDiaTrabajo ? 'planificado' : 'libre'}`);
  }

  return estados;
}
