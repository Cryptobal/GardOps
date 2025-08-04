import { query, checkTableExists } from '../src/lib/database';

async function agregarObservacionesPauta() {
  try {
    console.log('🔄 Agregando columna observaciones a as_turnos_pauta_mensual...');
    
    // Verificar si la tabla existe
    const tablaExiste = await checkTableExists('as_turnos_pauta_mensual');
    if (!tablaExiste) {
      console.log('❌ La tabla as_turnos_pauta_mensual no existe');
      return;
    }

    // Verificar si la columna observaciones ya existe
    const columnCheck = await query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'as_turnos_pauta_mensual' 
      AND column_name = 'observaciones'
    `);

    if (columnCheck.rows.length === 0) {
      console.log('📝 Agregando columna observaciones...');
      await query(`
        ALTER TABLE as_turnos_pauta_mensual 
        ADD COLUMN observaciones TEXT
      `);
      console.log('✅ Columna observaciones agregada');
    } else {
      console.log('✅ La columna observaciones ya existe');
    }

    // Crear datos de prueba para la fecha actual
    console.log('📝 Creando datos de prueba...');
    
    // Obtener algunos puestos operativos activos
    const puestos = await query(`
      SELECT po.id, po.nombre_puesto, po.instalacion_id, i.nombre as instalacion_nombre
      FROM as_turnos_puestos_operativos po
      INNER JOIN instalaciones i ON po.instalacion_id = i.id
      WHERE po.activo = true
      LIMIT 5
    `);

    if (puestos.rows.length === 0) {
      console.log('❌ No hay puestos operativos activos');
      return;
    }

    // Obtener algunos guardias activos
    const guardias = await query(`
      SELECT id, nombre, apellido_paterno, apellido_materno
      FROM guardias
      WHERE activo = true
      LIMIT 10
    `);

    if (guardias.rows.length === 0) {
      console.log('❌ No hay guardias activos');
      return;
    }

    // Fecha actual
    const fecha = new Date();
    const anio = fecha.getFullYear();
    const mes = fecha.getMonth() + 1;
    const dia = fecha.getDate();

    console.log(`📅 Creando datos para: ${anio}-${mes}-${dia}`);

    // Crear turnos de prueba
    let turnosCreados = 0;
    
    for (const puesto of puestos.rows) {
      // Asignar guardia aleatorio
      const guardia = guardias.rows[Math.floor(Math.random() * guardias.rows.length)];
      
      // Estados posibles
      const estados = ['trabajado', 'libre', 'permiso'];
      const estado = estados[Math.floor(Math.random() * estados.length)];

      try {
        await query(`
          INSERT INTO as_turnos_pauta_mensual (
            puesto_id, 
            guardia_id, 
            anio, 
            mes, 
            dia, 
            estado,
            observaciones
          ) VALUES ($1, $2, $3, $4, $5, $6, $7)
          ON CONFLICT (puesto_id, guardia_id, anio, mes, dia) DO NOTHING
        `, [
          puesto.id,
          guardia.id,
          anio,
          mes,
          dia,
          estado,
          estado === 'trabajado' ? 'Turno normal' : 
          estado === 'libre' ? 'Día libre' : 'Permiso personal'
        ]);

        turnosCreados++;
        console.log(`✅ Turno creado: ${puesto.instalacion_nombre} - ${puesto.nombre_puesto} - ${guardia.nombre} ${guardia.apellido_paterno}`);
      } catch (error) {
        console.log(`⚠️  Error creando turno para ${puesto.nombre_puesto}:`, error);
      }
    }

    console.log(`🎉 Proceso completado. ${turnosCreados} turnos creados para ${anio}-${mes}-${dia}`);

  } catch (error) {
    console.error('❌ Error en el proceso:', error);
  }
}

agregarObservacionesPauta(); 