import { query } from '../src/lib/database';

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

async function testGuardarDebug() {
  const startTime = Date.now();
  const timestamp = new Date().toISOString();
  
  try {
    console.log(`[${timestamp}] 🚀 Iniciando guardado de pauta mensual DEBUG`);
    
    const instalacion_id = '15631bd6-03a9-459d-ae60-fc480f7f3e84';
    const anio = 2025;
    const mes = 8;
    const pauta = [
      {
        "guardia_id": "2fcd5bb0-d854-47f3-aa89-c7e6cceaab3b",
        "dias": Array(31).fill('L')
      },
      {
        "guardia_id": "817d21b0-d5ef-4438-8adf-6258585b23a3",
        "dias": Array(31).fill(0).map((_, i) => i % 2 === 0 ? 'T' : 'L')
      }
    ];

    console.log(`[${timestamp}] 📥 Datos recibidos:`, { 
      instalacion_id, 
      anio, 
      mes, 
      total_asignaciones: pauta?.length || 0 
    });

    // Validación de parámetros básicos
    if (!instalacion_id || !anio || !mes) {
      console.log(`[${timestamp}] ❌ Validación fallida: parámetros requeridos faltantes`);
      return;
    }

    // Validación de estructura de pauta
    if (!pauta || !Array.isArray(pauta) || pauta.length === 0) {
      console.log(`[${timestamp}] ❌ Validación fallida: pauta inválida`);
      return;
    }

    // Validación de integridad de datos
    const erroresValidacion = validarAsignaciones(pauta);
    if (erroresValidacion.length > 0) {
      console.log(`[${timestamp}] ❌ Errores de validación:`, erroresValidacion);
      return;
    }

    console.log(`[${timestamp}] ✅ Validación exitosa, procediendo con guardado`);

    // Verificar que existe pauta para esta instalación en este mes
    const pautaExistente = await query(`
      SELECT COUNT(*) as count
      FROM as_turnos_pauta_mensual pm
      INNER JOIN as_turnos_puestos_operativos po ON pm.puesto_id = po.id
      WHERE po.instalacion_id = $1 
        AND pm.anio = $2 
        AND pm.mes = $3
    `, [instalacion_id, anio, mes]);

    const tienePautaBase = parseInt(pautaExistente.rows[0].count) > 0;
    
    if (!tienePautaBase) {
      console.log(`[${timestamp}] ⚠️ No existe pauta base, creando registros nuevos...`);
    } else {
      console.log(`[${timestamp}] 🔍 Pauta base encontrada, actualizando asignaciones...`);
    }

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
    const operacionesInfo = [];
    let totalOperaciones = 0;
    
    for (const puesto of todosLosPuestos.rows) {
      const puestoId = puesto.puesto_id;
      const esPPC = puesto.es_ppc;
      const guardiaId = puesto.guardia_id || puestoId; // Para PPCs usar el puesto_id como guardia_id
      
      console.log(`[${timestamp}] 🔄 Procesando puesto: ${puesto.nombre_puesto} (PPC: ${esPPC})`);
      
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
        
        if (tienePautaBase) {
          // Actualizar registro existente
          const operacionPromise = query(`
            UPDATE as_turnos_pauta_mensual 
            SET estado = $1, 
                updated_at = NOW()
            WHERE puesto_id = $2 
              AND guardia_id = $3 
              AND anio = $4 
              AND mes = $5 
              AND dia = $6
          `, [tipoDB, puestoId, guardiaId, anio, mes, dia]).catch(error => {
            console.error(`[${timestamp}] ❌ Error en UPDATE para puesto ${puestoId}, día ${dia}:`, error);
            throw error;
          });
          operaciones.push(operacionPromise);
          operacionesInfo.push({ tipo: 'UPDATE', puesto: puesto.nombre_puesto, dia, estado: tipoDB });
        } else {
          // Insertar nuevo registro
          const operacionPromise = query(`
            INSERT INTO as_turnos_pauta_mensual 
            (puesto_id, guardia_id, anio, mes, dia, estado, created_at, updated_at)
            VALUES ($1, $2, $3, $4, $5, $6, NOW(), NOW())
          `, [puestoId, guardiaId, anio, mes, dia, tipoDB]).catch(error => {
            console.error(`[${timestamp}] ❌ Error en INSERT para puesto ${puestoId}, día ${dia}:`, error);
            throw error;
          });
          operaciones.push(operacionPromise);
          operacionesInfo.push({ tipo: 'INSERT', puesto: puesto.nombre_puesto, dia, estado: tipoDB });
        }
        totalOperaciones++;
      }
    }

    console.log(`[${timestamp}] ⏳ Ejecutando ${totalOperaciones} operaciones en paralelo...`);
    console.log(`[${timestamp}] 📋 Detalle de operaciones por puesto:`);
    
    const operacionesPorPuesto = {};
    operacionesInfo.forEach(op => {
      if (!operacionesPorPuesto[op.puesto]) {
        operacionesPorPuesto[op.puesto] = 0;
      }
      operacionesPorPuesto[op.puesto]++;
    });
    
    Object.entries(operacionesPorPuesto).forEach(([puesto, count]) => {
      console.log(`[${timestamp}]    - ${puesto}: ${count} operaciones`);
    });

    const resultados = await Promise.allSettled(operaciones);
    
    console.log(`[${timestamp}] 📊 Resultados de las operaciones:`);
    let exitosas = 0;
    let fallidas = 0;
    
    resultados.forEach((resultado, index) => {
      if (resultado.status === 'fulfilled') {
        exitosas++;
      } else {
        fallidas++;
        const info = operacionesInfo[index];
        console.error(`[${timestamp}] ❌ Operación ${index} falló (${info.puesto}, día ${info.dia}):`, resultado.reason);
      }
    });

    console.log(`[${timestamp}] ✅ Operaciones exitosas: ${exitosas}`);
    console.log(`[${timestamp}] ❌ Operaciones fallidas: ${fallidas}`);

    const endTime = Date.now();
    const duration = endTime - startTime;
    
    console.log(`[${timestamp}] ✅ Pauta mensual actualizada exitosamente`);
    console.log(`[${timestamp}] 📊 Resumen: ${pauta.length} guardias, ${totalOperaciones} días actualizados`);
    console.log(`[${timestamp}] ⏱️ Tiempo total: ${duration}ms`);

    // Verificar lo que realmente se guardó
    console.log(`\n[${timestamp}] 🔍 Verificando registros guardados...`);
    const verificacion = await query(`
      SELECT 
        COUNT(*) as total_registros,
        COUNT(DISTINCT pm.puesto_id) as puestos_unicos,
        COUNT(DISTINCT pm.guardia_id) as guardias_unicas
      FROM as_turnos_pauta_mensual pm
      INNER JOIN as_turnos_puestos_operativos po ON pm.puesto_id = po.id
      WHERE po.instalacion_id = $1 
        AND pm.anio = $2 
        AND pm.mes = $3
    `, [instalacion_id, anio, mes]);

    const result = verificacion.rows[0];
    console.log(`[${timestamp}] 📊 Verificación final:`);
    console.log(`[${timestamp}]    - Total registros: ${result.total_registros}`);
    console.log(`[${timestamp}]    - Puestos únicos: ${result.puestos_unicos}`);
    console.log(`[${timestamp}]    - Guardias únicas: ${result.guardias_unicas}`);

  } catch (error) {
    const errorTime = new Date().toISOString();
    console.error(`[${errorTime}] ❌ Error guardando pauta mensual:`, error);
  } finally {
    process.exit(0);
  }
}

testGuardarDebug();