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

    // Obtener la definición completa de la función
    const { rows: funcDef } = await client.query(`
      SELECT 
        proname,
        pg_get_functiondef(oid) as definition,
        proargnames as arg_names,
        pronargs as num_args
      FROM pg_proc 
      WHERE proname = 'fn_marcar_asistencia' 
      AND pronamespace = 'as_turnos'::regnamespace
    `);

    if (funcDef.length > 0) {
      console.log('\n📋 Función fn_marcar_asistencia encontrada:');
      console.log('Número de argumentos:', funcDef[0].num_args);
      console.log('Nombres de argumentos:', funcDef[0].arg_names);
      console.log('\n📄 Definición completa:');
      console.log(funcDef[0].definition);
    } else {
      console.log('⚠️ La función fn_marcar_asistencia no existe');
    }

    // Verificar las columnas de la tabla
    const { rows: columns } = await client.query(`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns 
      WHERE table_schema = 'public' 
      AND table_name = 'as_turnos_pauta_mensual'
      ORDER BY ordinal_position
    `);

    console.log('\n📊 Estructura de la tabla as_turnos_pauta_mensual:');
    columns.forEach(col => {
      console.log(`  - ${col.column_name}: ${col.data_type} (nullable: ${col.is_nullable})`);
    });

    // Ver cómo se está llamando actualmente la función
    console.log('\n🔍 Revisando uso reciente de la función...');
    const { rows: recentMeta } = await client.query(`
      SELECT 
        id,
        estado,
        meta,
        updated_at
      FROM public.as_turnos_pauta_mensual
      WHERE meta IS NOT NULL
      AND meta ? 'action'
      ORDER BY updated_at DESC
      LIMIT 5
    `);

    if (recentMeta.length > 0) {
      console.log('Registros recientes con meta:');
      recentMeta.forEach(row => {
        console.log(`  ID: ${row.id}, Estado: ${row.estado}, Action: ${row.meta?.action}, Updated: ${row.updated_at}`);
        if (row.meta) {
          console.log(`    Meta keys: ${Object.keys(row.meta).join(', ')}`);
        }
      });
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
