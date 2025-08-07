import { query } from '../src/lib/database';

async function testHistoricoMensual() {
  try {
    console.log('🔍 Verificando estructura de tabla as_turnos_pauta_mensual...');
    
    // Verificar estructura de la tabla
    const estructura = await query(`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns 
      WHERE table_name = 'as_turnos_pauta_mensual'
      ORDER BY ordinal_position
    `);
    
    console.log('📋 Estructura de la tabla as_turnos_pauta_mensual:');
    estructura.rows.forEach((col: any) => {
      console.log(`  - ${col.column_name}: ${col.data_type} ${col.is_nullable === 'YES' ? 'NULL' : 'NOT NULL'}`);
    });
    
    // Verificar si hay datos de prueba
    const datosExistentes = await query(`
      SELECT COUNT(*) as total FROM as_turnos_pauta_mensual
    `);
    
    console.log(`\n📊 Total de registros en la tabla: ${datosExistentes.rows[0].total}`);
    
    if (parseInt(datosExistentes.rows[0].total) === 0) {
      console.log('⚠️  No hay datos en la tabla. Creando datos de prueba...');
      
      // Obtener algunos guardias para crear datos de prueba
      const guardias = await query(`
        SELECT id, nombre, apellido_paterno 
        FROM guardias 
        LIMIT 3
      `);
      
      if (guardias.rows.length === 0) {
        console.log('❌ No hay guardias en la base de datos');
        return;
      }
      
      // Obtener algunos puestos operativos
      const puestos = await query(`
        SELECT id, nombre_puesto, instalacion_id
        FROM as_turnos_puestos_operativos 
        WHERE activo = true
        LIMIT 3
      `);
      
      if (puestos.rows.length === 0) {
        console.log('❌ No hay puestos operativos en la base de datos');
        return;
      }
      
      // Crear datos de prueba para el mes actual
      const fecha = new Date();
      const anio = fecha.getFullYear();
      const mes = fecha.getMonth() + 1;
      
      console.log(`📅 Creando datos de prueba para ${anio}-${mes}`);
      
      let registrosCreados = 0;
      
      for (const guardia of guardias.rows) {
        for (const puesto of puestos.rows) {
          // Crear algunos días de prueba
          for (let dia = 1; dia <= 5; dia++) {
            const estados = ['trabajado', 'libre', 'permiso', 'reemplazo'];
            const estado = estados[Math.floor(Math.random() * estados.length)];
            
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
                `Dato de prueba - ${estado}`
              ]);
              
              registrosCreados++;
            } catch (error) {
              console.log(`⚠️  Error creando registro: ${error}`);
            }
          }
        }
      }
      
      console.log(`✅ Creados ${registrosCreados} registros de prueba`);
    }
    
    // Probar consulta del historial
    console.log('\n🔍 Probando consulta de historial mensual...');
    
    const guardiaTest = await query(`
      SELECT id, nombre, apellido_paterno 
      FROM guardias 
      LIMIT 1
    `);
    
    if (guardiaTest.rows.length > 0) {
      const guardiaId = guardiaTest.rows[0].id;
      const fecha = new Date();
      const anio = fecha.getFullYear();
      const mes = fecha.getMonth() + 1;
      
      console.log(`📊 Probando historial para guardia ${guardiaTest.rows[0].nombre} ${guardiaTest.rows[0].apellido_paterno}`);
      
      const historial = await query(`
        SELECT 
          pm.id,
          pm.dia,
          pm.estado,
          pm.observaciones,
          pm.reemplazo_guardia_id,
          po.nombre_puesto,
          po.es_ppc,
          i.nombre as instalacion_nombre
        FROM as_turnos_pauta_mensual pm
        INNER JOIN as_turnos_puestos_operativos po ON pm.puesto_id = po.id
        INNER JOIN instalaciones i ON po.instalacion_id = i.id
        WHERE pm.guardia_id = $1 
          AND pm.anio = $2 
          AND pm.mes = $3
          AND po.activo = true
        ORDER BY pm.dia ASC
      `, [guardiaId, anio, mes]);
      
      console.log(`✅ Consulta exitosa. Registros encontrados: ${historial.rows.length}`);
      
      if (historial.rows.length > 0) {
        console.log('\n📋 Primeros registros:');
        historial.rows.slice(0, 3).forEach((reg: any, index: number) => {
          console.log(`  ${index + 1}. Día ${reg.dia}: ${reg.estado} - ${reg.nombre_puesto} (${reg.instalacion_nombre})`);
        });
      }
    }
    
    console.log('\n✅ Prueba de historial mensual completada exitosamente');
    
  } catch (error) {
    console.error('❌ Error en la prueba:', error);
  }
}

// Ejecutar la prueba
testHistoricoMensual().then(() => {
  console.log('🏁 Prueba finalizada');
  process.exit(0);
}).catch((error) => {
  console.error('💥 Error fatal:', error);
  process.exit(1);
});

