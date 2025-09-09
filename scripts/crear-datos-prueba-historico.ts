import { query } from '../src/lib/database';

async function crearDatosPruebaHistorico() {
  try {
    console.log('🔄 Creando datos de prueba para historial mensual...');
    
    // Obtener guardias
    const guardias = await query(`
      SELECT id, nombre, apellido_paterno 
      FROM guardias 
      WHERE activo = true
      LIMIT 5
    `);
    
    if (guardias.rows.length === 0) {
      console.log('❌ No hay guardias activos en la base de datos');
      return;
    }
    
    console.log(`📋 Guardias encontrados: ${guardias.rows.length}`);
    
    // Obtener puestos operativos
    const puestos = await query(`
      SELECT id, nombre_puesto, instalacion_id, guardia_id
      FROM as_turnos_puestos_operativos 
      WHERE activo = true
      LIMIT 10
    `);
    
    if (puestos.rows.length === 0) {
      console.log('❌ No hay puestos operativos en la base de datos');
      return;
    }
    
    console.log(`📋 Puestos encontrados: ${puestos.rows.length}`);
    
    // Crear datos para el mes actual
    const fecha = new Date();
    const anio = fecha.getFullYear();
    const mes = fecha.getMonth() + 1;
    const diasEnMes = new Date(anio, mes, 0).getDate();
    
    console.log(`📅 Creando datos para ${anio}-${mes} (${diasEnMes} días)`);
    
    let registrosCreados = 0;
    let registrosActualizados = 0;
    
    // Verificar datos existentes para el mes actual
    const datosExistentes = await query(`
      SELECT COUNT(*) as total 
      FROM as_turnos_pauta_mensual 
      WHERE anio = $1 AND mes = $2
    `, [anio, mes]);
    
    console.log(`📊 Datos existentes para ${anio}-${mes}: ${datosExistentes.rows[0].total}`);
    
    if (parseInt(datosExistentes.rows[0].total) > 0) {
      console.log('⚠️  Ya existen datos para este mes. Agregando solo datos faltantes...');
    }
    
    // Crear datos de prueba
    for (const guardia of guardias.rows) {
      // Asignar guardia a algunos puestos
      const puestosParaGuardia = puestos.rows.filter(p => p.guardia_id === guardia.id);
      
      if (puestosParaGuardia.length === 0) {
        // Si no tiene puestos asignados, asignar algunos aleatoriamente
        const puestosAleatorios = puestos.rows.slice(0, 2);
        
        for (const puesto of puestosAleatorios) {
          for (let dia = 1; dia <= diasEnMes; dia++) {
            // Crear patrón de trabajo (trabaja 5 días, descansa 2)
            const estado = (dia % 7) <= 5 ? 'trabajado' : 'libre';
            
            // Agregar algunos días especiales
            let estadoFinal = estado;
            let observacion = null;
            
            if (dia === 15) {
              estadoFinal = 'permiso';
              observacion = 'Permiso personal';
            } else if (dia === 20) {
              estadoFinal = 'reemplazo';
              observacion = 'Reemplazado por otro guardia';
            } else if (dia === 25) {
              estadoFinal = 'licencia';
              observacion = 'Licencia médica';
            }
            
            try {
              await query(`
                INSERT INTO as_turnos_pauta_mensual (
                  puesto_id, guardia_id, anio, mes, dia, estado, observaciones
                ) VALUES ($1, $2, $3, $4, $5, $6, $7)
                ON CONFLICT (puesto_id, anio, mes, dia) DO NOTHING
              `, [
                puesto.id,
                guardia.id,
                anio,
                mes,
                dia,
                estadoFinal,
                observacion
              ]);
              
              registrosCreados++;
            } catch (error) {
              console.log(`⚠️  Error creando registro para día ${dia}: ${error}`);
            }
          }
        }
      } else {
        // Si ya tiene puestos asignados, crear datos para esos puestos
        for (const puesto of puestosParaGuardia) {
          for (let dia = 1; dia <= diasEnMes; dia++) {
            const estado = (dia % 7) <= 5 ? 'trabajado' : 'libre';
            
            try {
              await query(`
                INSERT INTO as_turnos_pauta_mensual (
                  puesto_id, guardia_id, anio, mes, dia, estado, observaciones
                ) VALUES ($1, $2, $3, $4, $5, $6, $7)
                ON CONFLICT (puesto_id, anio, mes, dia) DO NOTHING
              `, [
                puesto.id,
                guardia.id,
                anio,
                mes,
                dia,
                estado,
                `Turno normal - ${estado}`
              ]);
              
              registrosCreados++;
            } catch (error) {
              console.log(`⚠️  Error creando registro para día ${dia}: ${error}`);
            }
          }
        }
      }
    }
    
    console.log(`✅ Creados ${registrosCreados} registros de prueba`);
    
    // Verificar datos creados
    const totalRegistros = await query(`
      SELECT COUNT(*) as total 
      FROM as_turnos_pauta_mensual 
      WHERE anio = $1 AND mes = $2
    `, [anio, mes]);
    
    console.log(`📊 Total de registros para ${anio}-${mes}: ${totalRegistros.rows[0].total}`);
    
    // Mostrar resumen por guardia
    const resumenPorGuardia = await query(`
      SELECT 
        g.nombre,
        g.apellido_paterno,
        COUNT(*) as total_dias,
        COUNT(CASE WHEN pm.estado = 'trabajado' THEN 1 END) as dias_trabajados,
        COUNT(CASE WHEN pm.estado = 'libre' THEN 1 END) as dias_libres,
        COUNT(CASE WHEN pm.estado = 'permiso' THEN 1 END) as dias_permiso,
        COUNT(CASE WHEN pm.estado = 'reemplazo' THEN 1 END) as dias_reemplazo,
        COUNT(CASE WHEN pm.estado = 'licencia' THEN 1 END) as dias_licencia
      FROM as_turnos_pauta_mensual pm
      INNER JOIN guardias g ON pm.guardia_id = g.id
      WHERE pm.anio = $1 AND pm.mes = $2
      GROUP BY g.id, g.nombre, g.apellido_paterno
      ORDER BY g.nombre
    `, [anio, mes]);
    
    console.log('\n📋 Resumen por guardia:');
    resumenPorGuardia.rows.forEach((guardia: any) => {
      console.log(`  - ${guardia.nombre} ${guardia.apellido_paterno}:`);
      console.log(`    Total: ${guardia.total_dias}, Trabajados: ${guardia.dias_trabajados}, Libres: ${guardia.dias_libres}`);
      console.log(`    Permisos: ${guardia.dias_permiso}, Reemplazos: ${guardia.dias_reemplazo}, Licencias: ${guardia.dias_licencia}`);
    });
    
    console.log('\n✅ Datos de prueba creados exitosamente');
    
  } catch (error) {
    console.error('❌ Error creando datos de prueba:', error);
  }
}

// Ejecutar el script
crearDatosPruebaHistorico().then(() => {
  console.log('🏁 Script finalizado');
  process.exit(0);
}).catch((error) => {
  console.error('💥 Error fatal:', error);
  process.exit(1);
});
