import { config } from 'dotenv';
import path from 'path';

// Cargar variables de entorno
config({ path: path.join(__dirname, '../.env.local') });

import { query } from '../src/lib/database';

async function calcularVacaciones() {
  console.log('🚀 Calculando días de vacaciones para guardias activos...\n');

  try {
    // Obtener todos los guardias activos
    const guardiasActivos = await query(`
      SELECT 
        id, 
        nombre, 
        apellido_paterno, 
        apellido_materno,
        fecha_ingreso,
        dias_vacaciones_pendientes
      FROM guardias 
      WHERE activo = true 
        AND fecha_ingreso IS NOT NULL
      ORDER BY nombre, apellido_paterno
    `);

    if (guardiasActivos.rows.length === 0) {
      console.log('❌ No hay guardias activos con fecha de ingreso para calcular vacaciones');
      return;
    }

    console.log(`📊 Procesando ${guardiasActivos.rows.length} guardias activos...\n`);

    let actualizados = 0;
    const errores: string[] = [];
    const fechaActual = new Date();
    const mesActual = fechaActual.getMonth() + 1; // 1-12
    const añoActual = fechaActual.getFullYear();

    console.log(`📅 Fecha de cálculo: ${fechaActual.toLocaleDateString('es-CL')}`);
    console.log(`📅 Mes actual: ${mesActual}/${añoActual}`);
    console.log(`📅 Días a agregar por guardia: 1.25\n`);

    for (const guardia of guardiasActivos.rows) {
      try {
        const fechaIngreso = new Date(guardia.fecha_ingreso);
        const diasActuales = guardia.dias_vacaciones_pendientes || 0;

        // Calcular meses trabajados desde la fecha de ingreso
        const mesesTrabajados = (añoActual - fechaIngreso.getFullYear()) * 12 + 
                               (mesActual - (fechaIngreso.getMonth() + 1));

        // Sumar 1.25 días a los días actuales
        const nuevosDias = diasActuales + 1.25;

        // Actualizar en la base de datos
        await query(`
          UPDATE guardias 
          SET dias_vacaciones_pendientes = $1,
              updated_at = NOW()
          WHERE id = $2
        `, [nuevosDias, guardia.id]);

        actualizados++;
        console.log(`✅ ${guardia.nombre} ${guardia.apellido_paterno}: ${diasActuales} → ${nuevosDias} días (${mesesTrabajados} meses trabajados)`);

      } catch (error) {
        const errorMsg = `Error procesando guardia ${guardia.nombre} ${guardia.apellido_paterno}: ${error instanceof Error ? error.message : 'Error desconocido'}`;
        errores.push(errorMsg);
        console.error(`❌ ${errorMsg}`);
      }
    }

    console.log(`\n📊 RESUMEN:`);
    console.log(`   • Guardias procesados: ${guardiasActivos.rows.length}`);
    console.log(`   • Guardias actualizados: ${actualizados}`);
    console.log(`   • Errores: ${errores.length}`);
    console.log(`   • Días agregados por guardia: 1.25`);
    console.log(`   • Total días agregados: ${actualizados * 1.25}`);

    if (errores.length > 0) {
      console.log(`\n❌ ERRORES:`);
      errores.forEach(error => console.log(`   • ${error}`));
    }

    console.log('\n✅ Cálculo de vacaciones completado!');
    
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

// Función para mostrar estadísticas
async function mostrarEstadisticas() {
  console.log('📊 ESTADÍSTICAS DE VACACIONES\n');

  try {
    // Estadísticas generales
    const stats = await query(`
      SELECT 
        COUNT(*) as total_guardias,
        COUNT(CASE WHEN activo = true THEN 1 END) as guardias_activos,
        COUNT(CASE WHEN activo = true AND fecha_ingreso IS NOT NULL THEN 1 END) as con_fecha_ingreso,
        ROUND(AVG(CASE WHEN activo = true THEN dias_vacaciones_pendientes END), 2) as promedio_dias,
        ROUND(SUM(CASE WHEN activo = true THEN dias_vacaciones_pendientes END), 2) as total_dias_acumulados
      FROM guardias
    `);

    const stat = stats.rows[0];
    console.log(`📈 ESTADÍSTICAS GENERALES:`);
    console.log(`   • Total guardias: ${stat.total_guardias}`);
    console.log(`   • Guardias activos: ${stat.guardias_activos}`);
    console.log(`   • Con fecha de ingreso: ${stat.con_fecha_ingreso}`);
    console.log(`   • Promedio días vacaciones: ${stat.promedio_dias || 0}`);
    console.log(`   • Total días acumulados: ${stat.total_dias_acumulados || 0}\n`);

    // Guardias con más días de vacaciones
    const topVacaciones = await query(`
      SELECT 
        nombre,
        apellido_paterno,
        apellido_materno,
        dias_vacaciones_pendientes,
        fecha_ingreso
      FROM guardias 
      WHERE activo = true 
        AND dias_vacaciones_pendientes > 0
      ORDER BY dias_vacaciones_pendientes DESC 
      LIMIT 5
    `);

    if (topVacaciones.rows.length > 0) {
      console.log(`🏆 TOP 5 GUARDIAS CON MÁS VACACIONES:`);
      topVacaciones.rows.forEach((guardia, index) => {
        console.log(`   ${index + 1}. ${guardia.nombre} ${guardia.apellido_paterno}: ${guardia.dias_vacaciones_pendientes} días`);
      });
      console.log('');
    }

    // Guardias sin días de vacaciones
    const sinVacaciones = await query(`
      SELECT 
        nombre,
        apellido_paterno,
        apellido_materno,
        fecha_ingreso
      FROM guardias 
      WHERE activo = true 
        AND (dias_vacaciones_pendientes IS NULL OR dias_vacaciones_pendientes = 0)
        AND fecha_ingreso IS NOT NULL
      ORDER BY fecha_ingreso ASC
      LIMIT 5
    `);

    if (sinVacaciones.rows.length > 0) {
      console.log(`⚠️ GUARDIAS SIN DÍAS DE VACACIONES:`);
      sinVacaciones.rows.forEach((guardia, index) => {
        console.log(`   ${index + 1}. ${guardia.nombre} ${guardia.apellido_paterno} (ingreso: ${guardia.fecha_ingreso})`);
      });
    }

  } catch (error) {
    console.error('❌ Error obteniendo estadísticas:', error);
  }
}

// Ejecutar según argumentos
const args = process.argv.slice(2);
if (args.includes('--stats') || args.includes('-s')) {
  mostrarEstadisticas();
} else {
  calcularVacaciones();
}
