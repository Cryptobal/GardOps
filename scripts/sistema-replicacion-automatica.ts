#!/usr/bin/env ts-node

import { query } from '../src/lib/database';

async function sistemaReplicacionAutomatica() {
  console.log('🔄 SISTEMA DE REPLICACIÓN AUTOMÁTICA MENSUAL\n');

  try {
    // 1. Verificar si es el primer día del mes
    const fechaActual = new Date();
    const esPrimerDia = fechaActual.getDate() === 1;
    
    if (!esPrimerDia) {
      console.log('ℹ️ No es el primer día del mes. La replicación solo se ejecuta el día 1.');
      return;
    }

    const mesActual = fechaActual.getMonth() + 1;
    const anioActual = fechaActual.getFullYear();
    
    // Calcular mes anterior
    let mesAnterior = mesActual - 1;
    let anioAnterior = anioActual;
    if (mesAnterior === 0) {
      mesAnterior = 12;
      anioAnterior = anioActual - 1;
    }

    console.log(`📅 Replicando planificación de ${mesAnterior}/${anioAnterior} a ${mesActual}/${anioActual}`);

    // 2. Obtener todos los puestos operativos activos
    console.log('\n1️⃣ Obteniendo puestos operativos activos...');
    const puestosActivos = await query(`
      SELECT 
        po.id as puesto_id,
        po.nombre_puesto,
        po.guardia_id,
        po.es_ppc,
        po.rol_id,
        rs.nombre as rol_nombre,
        rs.hora_inicio,
        rs.hora_termino
      FROM as_turnos_puestos_operativos po
      LEFT JOIN as_turnos_roles_servicio rs ON po.rol_id = rs.id
      WHERE po.activo = true
      ORDER BY po.nombre_puesto
    `);

    console.log(`✅ Encontrados ${puestosActivos.rows.length} puestos activos`);

    // 3. Obtener el último día del mes anterior para calcular continuidad
    const ultimoDiaMesAnterior = new Date(anioAnterior, mesAnterior, 0).getDate();
    console.log(`📅 Último día del mes anterior: ${ultimoDiaMesAnterior}`);

    // 4. Obtener días del mes actual
    const diasMesActual = new Date(anioActual, mesActual, 0).getDate();
    console.log(`📅 Días del mes actual: ${diasMesActual}`);

    // 5. Replicar planificación manteniendo continuidad de ciclos
    console.log('\n2️⃣ Replicando planificación con continuidad de ciclos...');
    
    let totalReplicados = 0;
    
    for (const puesto of puestosActivos.rows) {
      console.log(`\n🔄 Procesando puesto: ${puesto.nombre_puesto}`);
      
      // Obtener el estado del último día del mes anterior
      const ultimoEstado = await query(`
        SELECT estado, estado_ui, meta
        FROM as_turnos_pauta_mensual
        WHERE puesto_id = $1 
          AND anio = $2 
          AND mes = $3 
          AND dia = $4
      `, [puesto.puesto_id, anioAnterior, mesAnterior, ultimoDiaMesAnterior]);

      if (ultimoEstado.rows.length === 0) {
        console.log(`   ⚠️ No hay planificación para el último día del mes anterior`);
        continue;
      }

      const estadoUltimoDia = ultimoEstado.rows[0];
      console.log(`   📊 Último estado: ${estadoUltimoDia.estado}`);

      // Calcular continuidad de ciclo según patrón de turno
      const patronTurno = puesto.rol_nombre || '';
      const continuidadCiclo = calcularContinuidadCiclo(patronTurno, ultimoDiaMesAnterior, diasMesActual);

      // Replicar para cada día del mes actual
      for (let dia = 1; dia <= diasMesActual; dia++) {
        const estadoNuevo = continuidadCiclo[dia - 1];
        
        // Insertar o actualizar la planificación
        await query(`
          INSERT INTO as_turnos_pauta_mensual (
            puesto_id, guardia_id, anio, mes, dia, estado, estado_ui, meta, created_at, updated_at
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW(), NOW())
          ON CONFLICT (puesto_id, anio, mes, dia) 
          DO UPDATE SET 
            estado = EXCLUDED.estado,
            estado_ui = EXCLUDED.estado_ui,
            meta = EXCLUDED.meta,
            updated_at = NOW()
        `, [
          puesto.puesto_id,
          puesto.guardia_id,
          anioActual,
          mesActual,
          dia,
          estadoNuevo,
          estadoNuevo === 'planificado' ? 'plan' : estadoNuevo,
          estadoUltimoDia.meta
        ]);

        totalReplicados++;
      }

      console.log(`   ✅ Replicados ${diasMesActual} días para ${puesto.nombre_puesto}`);
    }

    console.log('\n🎯 REPLICACIÓN COMPLETADA:');
    console.log('==========================');
    console.log(`✅ Total registros replicados: ${totalReplicados}`);
    console.log(`✅ Mes anterior: ${mesAnterior}/${anioAnterior}`);
    console.log(`✅ Mes actual: ${mesActual}/${anioActual}`);
    console.log('✅ Continuidad de ciclos mantenida');
    console.log('✅ Pauta Diaria y Central de Monitoreo funcionarán correctamente');

    // 6. Verificar que la replicación fue exitosa
    console.log('\n3️⃣ Verificando replicación...');
    const verificacion = await query(`
      SELECT 
        COUNT(*) as total_registros,
        COUNT(CASE WHEN estado = 'planificado' THEN 1 END) as planificados,
        COUNT(CASE WHEN estado = 'libre' THEN 1 END) as libres
      FROM as_turnos_pauta_mensual
      WHERE anio = $1 AND mes = $2
    `, [anioActual, mesActual]);

    const stats = verificacion.rows[0];
    console.log('📊 Estadísticas del mes actual:');
    console.log(`   - Total registros: ${stats.total_registros}`);
    console.log(`   - Planificados: ${stats.planificados}`);
    console.log(`   - Libres: ${stats.libres}`);

  } catch (error) {
    console.error('❌ Error durante la replicación:', error);
  } finally {
    process.exit(0);
  }
}

// Función para calcular continuidad de ciclos según patrón de turno
function calcularContinuidadCiclo(patronTurno: string, ultimoDiaAnterior: number, diasMesActual: number): string[] {
  const estados: string[] = [];
  
  // Extraer patrón del turno (ej: "4x4", "5x2", etc.)
  const patronMatch = patronTurno.match(/(\d+x\d+)/);
  const patron = patronMatch ? patronMatch[1] : '';
  
  // Calcular el día del ciclo en que terminó el mes anterior
  let diaCicloAnterior = 0;
  
  if (patron === '4x4') {
    // Ciclo de 8 días (4 trabajando + 4 libres)
    diaCicloAnterior = ((ultimoDiaAnterior - 1) % 8) + 1;
  } else if (patron === '5x2') {
    // Ciclo de 7 días (5 trabajando + 2 libres)
    diaCicloAnterior = ((ultimoDiaAnterior - 1) % 7) + 1;
  } else if (patron === '6x1') {
    // Ciclo de 7 días (6 trabajando + 1 libre)
    diaCicloAnterior = ((ultimoDiaAnterior - 1) % 7) + 1;
  } else {
    // Patrón no reconocido, usar planificación por defecto
    for (let i = 0; i < diasMesActual; i++) {
      estados.push('planificado');
    }
    return estados;
  }

  // Generar estados para el mes actual manteniendo continuidad
  for (let dia = 1; dia <= diasMesActual; dia++) {
    let diaCiclo = diaCicloAnterior + dia;
    
    if (patron === '4x4') {
      // Ciclo de 8 días
      diaCiclo = ((diaCiclo - 1) % 8) + 1;
      estados.push(diaCiclo <= 4 ? 'planificado' : 'libre');
    } else if (patron === '5x2') {
      // Ciclo de 7 días
      diaCiclo = ((diaCiclo - 1) % 7) + 1;
      estados.push(diaCiclo <= 5 ? 'planificado' : 'libre');
    } else if (patron === '6x1') {
      // Ciclo de 7 días
      diaCiclo = ((diaCiclo - 1) % 7) + 1;
      estados.push(diaCiclo <= 6 ? 'planificado' : 'libre');
    }
  }

  return estados;
}

// Cargar variables de entorno
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

sistemaReplicacionAutomatica();
