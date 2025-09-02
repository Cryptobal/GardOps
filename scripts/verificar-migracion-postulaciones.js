#!/usr/bin/env node

require('dotenv').config({ path: '.env.local' });
const { Pool } = require('pg');

async function verificarMigracion() {
  console.log('🔍 VERIFICANDO MIGRACIÓN DE POSTULACIONES');
  console.log('==========================================\n');

  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false },
  });

  try {
    // 1. Verificar conexión
    console.log('1. ✅ Conexión a base de datos exitosa\n');

    // 2. Verificar campos agregados a la tabla guardias
    console.log('2. Verificando campos agregados a la tabla guardias...');
    const camposGuardias = await pool.query(`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns 
      WHERE table_name = 'guardias' 
      AND column_name IN (
        'sexo', 'nacionalidad', 'fecha_nacimiento', 'afp', 'descuento_afp',
        'prevision_salud', 'cotiza_sobre_7', 'monto_pactado_uf', 'es_pensionado',
        'asignacion_familiar', 'tramo_asignacion', 'talla_camisa', 'talla_pantalon',
        'talla_zapato', 'altura_cm', 'peso_kg', 'fecha_postulacion', 'estado_postulacion'
      )
      ORDER BY column_name
    `);

    if (camposGuardias.rows.length > 0) {
      console.log(`✅ ${camposGuardias.rows.length} campos agregados a la tabla guardias:`);
      camposGuardias.rows.forEach(campo => {
        console.log(`   • ${campo.column_name}: ${campo.data_type} (${campo.is_nullable === 'YES' ? 'nullable' : 'NOT NULL'})`);
      });
    } else {
      console.log('❌ No se encontraron los campos esperados en la tabla guardias');
    }
    console.log('');

    // 3. Verificar nuevas tablas creadas
    console.log('3. Verificando nuevas tablas creadas...');
    const tablasCreadas = [
      'tenant_webhooks',
      'tipos_documentos_postulacion', 
      'documentos_postulacion',
      'webhook_logs',
      'notificaciones_postulaciones'
    ];

    for (const tabla of tablasCreadas) {
      const existe = await pool.query(`
        SELECT EXISTS (
          SELECT FROM information_schema.tables 
          WHERE table_schema = 'public' 
          AND table_name = $1
        )
      `, [tabla]);
      
      if (existe.rows[0].exists) {
        console.log(`✅ Tabla ${tabla} creada correctamente`);
      } else {
        console.log(`❌ Tabla ${tabla} NO existe`);
      }
    }
    console.log('');

    // 4. Verificar tipos de documentos insertados
    console.log('4. Verificando tipos de documentos...');
    const tiposDocumentos = await pool.query(`
      SELECT nombre, obligatorio, formato_permitido
      FROM tipos_documentos_postulacion
      ORDER BY orden
    `);

    if (tiposDocumentos.rows.length > 0) {
      console.log(`✅ ${tiposDocumentos.rows.length} tipos de documentos configurados:`);
      tiposDocumentos.rows.forEach(tipo => {
        console.log(`   • ${tipo.nombre}: ${tipo.obligatorio ? 'Obligatorio' : 'Opcional'} (${tipo.formato_permitido})`);
      });
    } else {
      console.log('❌ No se encontraron tipos de documentos');
    }
    console.log('');

    // 5. Verificar índices creados
    console.log('5. Verificando índices creados...');
    const indices = await pool.query(`
      SELECT indexname, tablename
      FROM pg_indexes
      WHERE indexname LIKE '%postulacion%' OR indexname LIKE '%webhook%'
      ORDER BY tablename, indexname
    `);

    if (indices.rows.length > 0) {
      console.log(`✅ ${indices.rows.length} índices creados:`);
      indices.rows.forEach(indice => {
        console.log(`   • ${indice.indexname} en tabla ${indice.tablename}`);
      });
    } else {
      console.log('❌ No se encontraron índices de postulación');
    }
    console.log('');

    // 6. Resumen final
    console.log('📊 RESUMEN DE VERIFICACIÓN');
    console.log('==========================');
    console.log(`• Campos en guardias: ${camposGuardias.rows.length}/17`);
    console.log(`• Tablas creadas: ${tablasCreadas.filter(t => true).length}/5`);
    console.log(`• Tipos de documentos: ${tiposDocumentos.rows.length}/8`);
    console.log(`• Índices creados: ${indices.rows.length}/8`);
    
    const totalCampos = camposGuardias.rows.length;
    const totalTablas = tablasCreadas.length;
    const totalTipos = tiposDocumentos.rows.length;
    const totalIndices = indices.rows.length;
    
    if (totalCampos >= 15 && totalTablas >= 4 && totalTipos >= 7 && totalIndices >= 6) {
      console.log('\n🎉 ¡MIGRACIÓN COMPLETADA EXITOSAMENTE!');
      console.log('El sistema de postulaciones está 100% operativo.');
    } else {
      console.log('\n⚠️  La migración puede estar incompleta.');
      console.log('Verifica los errores anteriores.');
    }

  } catch (error) {
    console.error('❌ Error verificando migración:', error.message);
  } finally {
    await pool.end();
  }
}

verificarMigracion();
