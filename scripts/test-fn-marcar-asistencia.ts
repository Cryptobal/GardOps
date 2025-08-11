import dotenv from 'dotenv';
import path from 'path';
import { Client } from 'pg';

dotenv.config({ path: path.join(process.cwd(), '.env.local') });

async function main() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL
  });

  try {
    await client.connect();
    console.log('🔌 Conectado a la base de datos');

    // Buscar un registro de prueba
    const { rows: testRows } = await client.query(`
      SELECT id, estado, meta, estado_ui
      FROM public.as_turnos_pauta_mensual
      WHERE id = 43
      LIMIT 1
    `);

    if (testRows.length === 0) {
      console.log('❌ No se encontró registro con ID 43');
      return;
    }

    const testRow = testRows[0];
    console.log('\n📋 Registro antes de actualizar:');
    console.log(`  ID: ${testRow.id}`);
    console.log(`  Estado: ${testRow.estado}`);
    console.log(`  Estado UI: ${testRow.estado_ui}`);
    console.log(`  Meta:`, testRow.meta);

    // Probar la función
    console.log('\n🧪 Ejecutando fn_marcar_asistencia...');
    
    const testGuardiaId = 'd927ea60-c4f0-4cb3-9570-9f116b14b742';
    
    await client.query(`
      SELECT * FROM as_turnos.fn_marcar_asistencia(
        $1::bigint,
        'reemplazo',
        jsonb_build_object(
          'cobertura_guardia_id', $2::text,
          'estado_ui', 'reemplazo',
          'test', true
        ),
        $3::text
      )
    `, [43, testGuardiaId, 'test-script']);

    // Verificar el resultado
    const { rows: updatedRows } = await client.query(`
      SELECT id, estado, meta, estado_ui
      FROM public.as_turnos_pauta_mensual
      WHERE id = 43
    `);

    const updatedRow = updatedRows[0];
    console.log('\n✅ Registro después de actualizar:');
    console.log(`  ID: ${updatedRow.id}`);
    console.log(`  Estado: ${updatedRow.estado}`);
    console.log(`  Estado UI: ${updatedRow.estado_ui}`);
    console.log(`  Meta:`, JSON.stringify(updatedRow.meta, null, 2));

    // Verificar específicamente el cobertura_guardia_id
    if (updatedRow.meta?.cobertura_guardia_id === testGuardiaId) {
      console.log('\n✅ cobertura_guardia_id se guardó correctamente!');
    } else {
      console.log('\n❌ cobertura_guardia_id NO se guardó correctamente');
      console.log(`  Esperado: ${testGuardiaId}`);
      console.log(`  Obtenido: ${updatedRow.meta?.cobertura_guardia_id}`);
    }

    // Verificar que el JOIN con guardias funcione
    const { rows: joinTest } = await client.query(`
      SELECT 
        pm.id,
        pm.meta->>'cobertura_guardia_id' as cobertura_id,
        g.nombre,
        g.apellido_paterno,
        g.apellido_materno
      FROM public.as_turnos_pauta_mensual pm
      LEFT JOIN guardias g ON g.id::text = pm.meta->>'cobertura_guardia_id'
      WHERE pm.id = 43
    `);

    if (joinTest[0]) {
      console.log('\n🔍 Verificación del JOIN con guardias:');
      console.log(`  Cobertura ID: ${joinTest[0].cobertura_id}`);
      console.log(`  Guardia: ${joinTest[0].apellido_paterno} ${joinTest[0].apellido_materno}, ${joinTest[0].nombre}`);
    }

  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  } finally {
    await client.end();
    console.log('\n🔌 Conexión cerrada');
  }
}

main().catch(console.error);
