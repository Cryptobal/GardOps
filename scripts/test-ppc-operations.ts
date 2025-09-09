import { Client } from 'pg';
import dotenv from 'dotenv';

// Cargar variables de entorno
dotenv.config({ path: '.env.local' });

async function testPPCOperations() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
  });

  try {
    await client.connect();
    console.log('🔗 Conectado a la base de datos');

    // Buscar un PPC existente para probar
    const ppcData = await client.query(`
      SELECT id, puesto_id, guardia_id, estado, reemplazo_guardia_id
      FROM as_turnos_pauta_mensual 
      WHERE estado = 'cubierto' 
      LIMIT 1
    `);

    if (ppcData.rows.length === 0) {
      console.log('❌ No se encontraron PPCs para probar');
      return;
    }

    const ppc = ppcData.rows[0];
    console.log('📋 PPC encontrado para pruebas:', ppc);

    // Buscar un guardia disponible para asignar
    const guardiaData = await client.query(`
      SELECT id, nombre, apellido
      FROM guardias 
      WHERE activo = true 
      LIMIT 1
    `);

    if (guardiaData.rows.length === 0) {
      console.log('❌ No se encontraron guardias para probar');
      return;
    }

    const guardia = guardiaData.rows[0];
    console.log('👤 Guardia encontrado para pruebas:', guardia);

    // Probar editar PPC
    console.log('\n🧪 Probando editar PPC...');
    try {
      await client.query(`
        UPDATE as_turnos_pauta_mensual 
        SET guardia_id = $2,
            observaciones = 'Prueba de edición PPC',
            updated_at = NOW()
        WHERE id = $1
      `, [ppc.id, guardia.id]);

      await client.query(`
        UPDATE TE_turnos_extras 
        SET guardia_id = $2,
            updated_at = NOW()
        WHERE pauta_id = $1 AND estado = 'ppc'
      `, [ppc.id, guardia.id]);

      console.log('✅ Edición de PPC exitosa');
    } catch (error) {
      console.error('❌ Error editando PPC:', error);
    }

    // Probar eliminar PPC
    console.log('\n🧪 Probando eliminar PPC...');
    try {
      await client.query(`
        UPDATE as_turnos_pauta_mensual 
        SET estado = 'sin_cubrir',
            reemplazo_guardia_id = NULL,
            observaciones = 'Prueba de eliminación PPC',
            updated_at = NOW()
        WHERE id = $1
      `, [ppc.id]);

      await client.query(`
        DELETE FROM TE_turnos_extras 
        WHERE pauta_id = $1 AND estado = 'ppc'
      `, [ppc.id]);

      console.log('✅ Eliminación de PPC exitosa');
    } catch (error) {
      console.error('❌ Error eliminando PPC:', error);
    }

    // Verificar estado final
    const finalState = await client.query(`
      SELECT id, puesto_id, guardia_id, estado, reemplazo_guardia_id, observaciones
      FROM as_turnos_pauta_mensual 
      WHERE id = $1
    `, [ppc.id]);

    console.log('\n📋 Estado final del PPC:', finalState.rows[0]);

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await client.end();
    console.log('🔌 Conexión cerrada');
  }
}

testPPCOperations(); 