import { query } from '../src/lib/database';

async function populateBonosGlobales() {
  try {
    console.log('🚀 Iniciando población de bonos globales...');

    // Verificar si ya existen bonos
    const existingBonos = await query('SELECT COUNT(*) as count FROM sueldo_bonos_globales');
    const count = parseInt(existingBonos.rows[0].count);

    if (count > 0) {
      console.log(`⚠️  Ya existen ${count} bonos en la base de datos.`);
      console.log('¿Deseas continuar y agregar más bonos? (y/n)');
      return;
    }

    // Bonos de ejemplo
    const bonosEjemplo = [
      {
        nombre: 'Colación',
        descripcion: 'Bono para alimentación durante el turno de trabajo',
        imponible: true
      },
      {
        nombre: 'Movilización',
        descripcion: 'Bono para transporte desde y hacia el lugar de trabajo',
        imponible: false
      },
      {
        nombre: 'Responsabilidad',
        descripcion: 'Bono por responsabilidades adicionales en el cargo',
        imponible: true
      },
      {
        nombre: 'Turno Noche',
        descripcion: 'Bono por trabajo en horario nocturno (22:00 - 06:00)',
        imponible: true
      },
      {
        nombre: 'Feriado',
        descripcion: 'Bono por trabajo en días festivos o feriados',
        imponible: true
      },
      {
        nombre: 'Riesgo',
        descripcion: 'Bono por trabajo en condiciones de riesgo o peligro',
        imponible: true
      },
      {
        nombre: 'Zona',
        descripcion: 'Bono por trabajo en zonas remotas o de difícil acceso',
        imponible: true
      },
      {
        nombre: 'Especialidad',
        descripcion: 'Bono por conocimientos o habilidades especializadas',
        imponible: true
      },
      {
        nombre: 'Antigüedad',
        descripcion: 'Bono por años de servicio en la empresa',
        imponible: true
      },
      {
        nombre: 'Presentismo',
        descripcion: 'Bono por asistencia perfecta durante el mes',
        imponible: true
      },
      {
        nombre: 'Rendimiento',
        descripcion: 'Bono por cumplimiento excepcional de objetivos',
        imponible: true
      },
      {
        nombre: 'Transporte',
        descripcion: 'Bono para gastos de transporte público',
        imponible: false
      }
    ];

    console.log(`📝 Insertando ${bonosEjemplo.length} bonos de ejemplo...`);

    for (const bono of bonosEjemplo) {
      try {
        await query(
          `INSERT INTO sueldo_bonos_globales (nombre, descripcion, imponible, activo)
           VALUES ($1, $2, $3, true)`,
          [bono.nombre, bono.descripcion, bono.imponible]
        );
        console.log(`✅ Bono "${bono.nombre}" creado exitosamente`);
      } catch (error) {
        console.error(`❌ Error creando bono "${bono.nombre}":`, error);
      }
    }

    // Verificar el resultado final
    const finalCount = await query('SELECT COUNT(*) as count FROM sueldo_bonos_globales');
    console.log(`\n🎉 Población completada. Total de bonos: ${finalCount.rows[0].count}`);

    // Mostrar estadísticas
    const stats = await query(`
      SELECT 
        COUNT(*) as total,
        COUNT(CASE WHEN activo = true THEN 1 END) as activos,
        COUNT(CASE WHEN activo = false THEN 1 END) as inactivos,
        COUNT(CASE WHEN imponible = true THEN 1 END) as imponibles,
        COUNT(CASE WHEN imponible = false THEN 1 END) as no_imponibles
      FROM sueldo_bonos_globales
    `);

    const statsData = stats.rows[0];
    console.log('\n📊 Estadísticas:');
    console.log(`   Total: ${statsData.total}`);
    console.log(`   Activos: ${statsData.activos}`);
    console.log(`   Inactivos: ${statsData.inactivos}`);
    console.log(`   Imponibles: ${statsData.imponibles}`);
    console.log(`   No Imponibles: ${statsData.no_imponibles}`);

  } catch (error) {
    console.error('❌ Error en la población de bonos globales:', error);
  }
}

// Ejecutar si se llama directamente
if (require.main === module) {
  populateBonosGlobales()
    .then(() => {
      console.log('\n✅ Script completado exitosamente');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n❌ Error ejecutando script:', error);
      process.exit(1);
    });
}

export default populateBonosGlobales;
