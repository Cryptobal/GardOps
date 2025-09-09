import { config } from 'dotenv';
import path from 'path';

// Cargar variables de entorno
config({ path: path.join(__dirname, '../.env.local') });

import { query } from '../src/lib/database';
import { aplicarPermisoEnPautaMensual } from '../src/lib/db/pautaMensual';
import { procesarFiniquitoYGenerarPPC } from '../src/lib/db/ppc';

async function testPermisosYPPC() {
  console.log('🧪 Probando funcionalidad de permisos y PPCs...\n');

  try {
    // 1. Verificar que las tablas necesarias existen
    console.log('1️⃣ Verificando tablas necesarias...');
    
    const tablasRequeridas = ['pautas_mensuales', 'as_turnos_ppc', 'as_turnos_requisitos', 'guardias'];
    
    for (const tabla of tablasRequeridas) {
      const result = await query(`
        SELECT EXISTS (
          SELECT FROM information_schema.tables 
          WHERE table_schema = 'public' 
          AND table_name = $1
        )
      `, [tabla]);
      
      if (result.rows[0].exists) {
        console.log(`✅ Tabla ${tabla} existe`);
      } else {
        console.log(`❌ Tabla ${tabla} NO existe`);
        return;
      }
    }

    // 2. Obtener un guardia de prueba
    console.log('\n2️⃣ Obteniendo guardia de prueba...');
    const guardias = await query(`
      SELECT id, nombre, apellido_paterno 
      FROM guardias 
      WHERE activo = true 
      LIMIT 1
    `);

    if (guardias.rows.length === 0) {
      console.log('❌ No hay guardias activos para probar');
      return;
    }

    const guardiaPrueba = guardias.rows[0];
    console.log(`✅ Guardia de prueba: ${guardiaPrueba.nombre} ${guardiaPrueba.apellido_paterno} (${guardiaPrueba.id})`);

    // 3. Verificar si el guardia tiene pauta mensual
    console.log('\n3️⃣ Verificando pauta mensual del guardia...');
    const pauta = await query(`
      SELECT COUNT(*) as total
      FROM pautas_mensuales 
      WHERE guardia_id = $1
    `, [guardiaPrueba.id]);

    console.log(`📋 El guardia tiene ${pauta.rows[0].total} registros en pauta mensual`);

    // 4. Probar aplicación de permiso
    console.log('\n4️⃣ Probando aplicación de permiso...');
    
    const fechaInicio = new Date().toISOString().split('T')[0];
    const fechaFin = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]; // 7 días después

    try {
      const resultadoPermiso = await aplicarPermisoEnPautaMensual({
        guardiaId: guardiaPrueba.id,
        fechaInicio,
        fechaFin,
        tipoPermiso: 'vacaciones'
      });

      console.log(`✅ Permiso aplicado: ${resultadoPermiso.updatedRows} días actualizados`);
    } catch (error) {
      console.log(`⚠️ Error aplicando permiso: ${error}`);
    }

    // 5. Verificar PPCs existentes
    console.log('\n5️⃣ Verificando PPCs existentes...');
    const ppcs = await query(`
      SELECT COUNT(*) as total
      FROM as_turnos_ppc 
      WHERE estado = 'Pendiente'
    `);

    console.log(`📋 Hay ${ppcs.rows[0].total} PPCs pendientes en el sistema`);

    // 6. Probar procesamiento de finiquito (simulado)
    console.log('\n6️⃣ Probando procesamiento de finiquito...');
    
    const fechaFiniquito = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]; // 14 días después

    try {
      const resultadoFiniquito = await procesarFiniquitoYGenerarPPC({
        guardiaId: guardiaPrueba.id,
        fechaFiniquito
      });

      console.log(`✅ Finiquito procesado: ${resultadoFiniquito.turnosEliminados} turnos eliminados, ${resultadoFiniquito.ppcsCreados} PPCs creados`);
    } catch (error) {
      console.log(`⚠️ Error procesando finiquito: ${error}`);
    }

    // 7. Verificar PPCs después del finiquito
    console.log('\n7️⃣ Verificando PPCs después del finiquito...');
    const ppcsDespues = await query(`
      SELECT COUNT(*) as total
      FROM as_turnos_ppc 
      WHERE estado = 'Pendiente'
    `);

    console.log(`📋 Ahora hay ${ppcsDespues.rows[0].total} PPCs pendientes en el sistema`);

    console.log('\n✅ Prueba completada exitosamente');

  } catch (error) {
    console.error('❌ Error en la prueba:', error);
  }
}

// Ejecutar la prueba
testPermisosYPPC()
  .then(() => {
    console.log('\n🎉 Prueba finalizada');
    process.exit(0);
  })
  .catch((error) => {
    console.error('💥 Error fatal:', error);
    process.exit(1);
  }); 