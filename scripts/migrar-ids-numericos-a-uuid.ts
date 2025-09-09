import { query } from '../src/lib/database';
import { v4 as uuidv4 } from 'uuid';

interface InstalacionConIdNumerico {
  id: string;
  nombre: string;
  cliente_id: string | null;
  direccion: string;
  latitud: number | null;
  longitud: number | null;
  ciudad: string;
  comuna: string;
  valor_turno_extra: number;
  estado: string;
  created_at: string;
  updated_at: string;
}

interface MapeoId {
  idViejo: string;
  idNuevo: string;
  nombre: string;
}

async function migrarIdsNumericosAUUID() {
  console.log('🚀 Iniciando migración de IDs numéricos a UUIDs...');
  
  try {
    // 1. Encontrar instalaciones con IDs numéricos
    console.log('📋 Buscando instalaciones con IDs numéricos...');
    const instalacionesNumericas = await query(`
      SELECT id, nombre, cliente_id, direccion, latitud, longitud, ciudad, comuna, 
             valor_turno_extra, estado, created_at, updated_at
      FROM instalaciones 
      WHERE id ~ '^[0-9]+$'
      ORDER BY CAST(id AS INTEGER)
    `);

    if (instalacionesNumericas.rows.length === 0) {
      console.log('✅ No se encontraron instalaciones con IDs numéricos. La migración no es necesaria.');
      return;
    }

    console.log(`📊 Encontradas ${instalacionesNumericas.rows.length} instalaciones con IDs numéricos:`);
    instalacionesNumericas.rows.forEach((row: InstalacionConIdNumerico) => {
      console.log(`   - ID: ${row.id} | Nombre: ${row.nombre}`);
    });

    // 2. Crear mapeo de IDs viejos a nuevos
    const mapeoIds: MapeoId[] = instalacionesNumericas.rows.map((row: InstalacionConIdNumerico) => ({
      idViejo: row.id,
      idNuevo: uuidv4(),
      nombre: row.nombre
    }));

    console.log('\n🔄 Mapeo de IDs:');
    mapeoIds.forEach((m: MapeoId) => {
      console.log(`   ${m.idViejo} → ${m.idNuevo} (${m.nombre})`);
    });

    // 3. Iniciar transacción
    console.log('\n💾 Iniciando transacción de migración...');
    await query('BEGIN');

    try {
      // 4. Actualizar tabla principal de instalaciones
      console.log('📝 Actualizando tabla instalaciones...');
      for (const mapeo of mapeoIds) {
        await query(`
          UPDATE instalaciones 
          SET id = $1, updated_at = NOW() AT TIME ZONE 'America/Santiago'
          WHERE id = $2
        `, [mapeo.idNuevo, mapeo.idViejo]);
        console.log(`   ✅ Instalación "${mapeo.nombre}" migrada: ${mapeo.idViejo} → ${mapeo.idNuevo}`);
      }

      // 5. Actualizar tablas relacionadas
      console.log('\n🔗 Actualizando tablas relacionadas...');

      // Tabla: as_turnos_configuracion
      console.log('   📋 Actualizando as_turnos_configuracion...');
      for (const mapeo of mapeoIds) {
        const turnosResult = await query(`
          UPDATE as_turnos_configuracion 
          SET instalacion_id = $1, updated_at = NOW() AT TIME ZONE 'America/Santiago'
          WHERE instalacion_id = $2
        `, [mapeo.idNuevo, mapeo.idViejo]);
        if (turnosResult.rowCount > 0) {
          console.log(`     ✅ ${turnosResult.rowCount} turnos actualizados para "${mapeo.nombre}"`);
        }
      }

      // Tabla: as_turnos_requisitos
      console.log('   📋 Actualizando as_turnos_requisitos...');
      for (const mapeo of mapeoIds) {
        const requisitosResult = await query(`
          UPDATE as_turnos_requisitos 
          SET instalacion_id = $1, updated_at = NOW() AT TIME ZONE 'America/Santiago'
          WHERE instalacion_id = $2
        `, [mapeo.idNuevo, mapeo.idViejo]);
        if (requisitosResult.rowCount > 0) {
          console.log(`     ✅ ${requisitosResult.rowCount} requisitos actualizados para "${mapeo.nombre}"`);
        }
      }

      // Tabla: as_turnos_asignaciones (a través de requisitos)
      console.log('   📋 Actualizando as_turnos_asignaciones...');
      for (const mapeo of mapeoIds) {
        const asignacionesResult = await query(`
          UPDATE as_turnos_asignaciones 
          SET updated_at = NOW() AT TIME ZONE 'America/Santiago'
          WHERE requisito_puesto_id IN (
            SELECT id FROM as_turnos_requisitos WHERE instalacion_id = $1
          )
        `, [mapeo.idNuevo]);
        if (asignacionesResult.rowCount > 0) {
          console.log(`     ✅ ${asignacionesResult.rowCount} asignaciones actualizadas para "${mapeo.nombre}"`);
        }
      }

      // Tabla: as_turnos_ppc (a través de requisitos)
      console.log('   📋 Actualizando as_turnos_ppc...');
      for (const mapeo of mapeoIds) {
        const ppcResult = await query(`
          UPDATE as_turnos_ppc 
          SET updated_at = NOW() AT TIME ZONE 'America/Santiago'
          WHERE requisito_puesto_id IN (
            SELECT id FROM as_turnos_requisitos WHERE instalacion_id = $1
          )
        `, [mapeo.idNuevo]);
        if (ppcResult.rowCount > 0) {
          console.log(`     ✅ ${ppcResult.rowCount} PPCs actualizados para "${mapeo.nombre}"`);
        }
      }

      // Tabla: logs_instalaciones
      console.log('   📋 Actualizando logs_instalaciones...');
      for (const mapeo of mapeoIds) {
        const logsResult = await query(`
          UPDATE logs_instalaciones 
          SET instalacion_id = $1
          WHERE instalacion_id = $2
        `, [mapeo.idNuevo, mapeo.idViejo]);
        if (logsResult.rowCount > 0) {
          console.log(`     ✅ ${logsResult.rowCount} logs actualizados para "${mapeo.nombre}"`);
        }
      }

      // Tabla: documentos_instalaciones
      console.log('   📋 Actualizando documentos_instalaciones...');
      for (const mapeo of mapeoIds) {
        const docsResult = await query(`
          UPDATE documentos_instalaciones 
          SET instalacion_id = $1, updated_at = NOW() AT TIME ZONE 'America/Santiago'
          WHERE instalacion_id = $2
        `, [mapeo.idNuevo, mapeo.idViejo]);
        if (docsResult.rowCount > 0) {
          console.log(`     ✅ ${docsResult.rowCount} documentos actualizados para "${mapeo.nombre}"`);
        }
      }

      // Tabla: pautas_mensuales
      console.log('   📋 Actualizando pautas_mensuales...');
      for (const mapeo of mapeoIds) {
        const pautasResult = await query(`
          UPDATE pautas_mensuales 
          SET instalacion_id = $1, updated_at = NOW() AT TIME ZONE 'America/Santiago'
          WHERE instalacion_id = $2
        `, [mapeo.idNuevo, mapeo.idViejo]);
        if (pautasResult.rowCount > 0) {
          console.log(`     ✅ ${pautasResult.rowCount} pautas actualizadas para "${mapeo.nombre}"`);
        }
      }

      // 6. Confirmar transacción
      await query('COMMIT');
      console.log('\n✅ Migración completada exitosamente!');

      // 7. Generar reporte final
      console.log('\n📊 REPORTE FINAL DE MIGRACIÓN:');
      console.log(`   • Instalaciones migradas: ${mapeoIds.length}`);
      console.log('   • Tablas actualizadas:');
      console.log('     - instalaciones');
      console.log('     - as_turnos_configuracion');
      console.log('     - as_turnos_requisitos');
      console.log('     - as_turnos_asignaciones');
      console.log('     - as_turnos_ppc');
      console.log('     - logs_instalaciones');
      console.log('     - documentos_instalaciones');
      console.log('     - pautas_mensuales');

      // 8. Verificar que no queden IDs numéricos
      const verificacion = await query(`
        SELECT COUNT(*) as count 
        FROM instalaciones 
        WHERE id ~ '^[0-9]+$'
      `);
      
      if (verificacion.rows[0].count === '0') {
        console.log('\n✅ VERIFICACIÓN EXITOSA: No quedan instalaciones con IDs numéricos.');
      } else {
        console.log(`\n⚠️  ADVERTENCIA: Aún quedan ${verificacion.rows[0].count} instalaciones con IDs numéricos.`);
      }

      // 9. Guardar mapeo en archivo para referencia
      const fs = require('fs');
      const mapeoData = {
        fecha: new Date().toISOString(),
        instalacionesMigradas: mapeoIds.length,
        mapeo: mapeoIds
      };
      
      fs.writeFileSync(
        'scripts/mapeo-ids-migracion.json', 
        JSON.stringify(mapeoData, null, 2)
      );
      console.log('\n💾 Mapeo guardado en: scripts/mapeo-ids-migracion.json');

    } catch (error) {
      await query('ROLLBACK');
      console.error('❌ Error durante la migración:', error);
      throw error;
    }

  } catch (error) {
    console.error('❌ Error fatal en la migración:', error);
    process.exit(1);
  }
}

// Ejecutar migración
if (require.main === module) {
  migrarIdsNumericosAUUID()
    .then(() => {
      console.log('\n🎉 Migración completada. El sistema ahora debería funcionar correctamente.');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n💥 Error en la migración:', error);
      process.exit(1);
    });
}

export { migrarIdsNumericosAUUID }; 