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

    // Obtener TODAS las versiones de la función
    const { rows: allVersions } = await client.query(`
      SELECT 
        oid::regprocedure as full_signature,
        proname as function_name,
        pronargs as num_args,
        proargnames as arg_names,
        proargtypes::regtype[] as arg_types,
        prorettype::regtype as return_type,
        prosrc as source_preview
      FROM pg_proc 
      WHERE proname = 'fn_marcar_asistencia' 
      AND pronamespace = 'as_turnos'::regnamespace
      ORDER BY pronargs
    `);

    console.log('\n📋 TODAS las versiones de fn_marcar_asistencia:');
    allVersions.forEach((ver, idx) => {
      console.log(`\n--- Versión ${idx + 1} ---`);
      console.log(`Firma completa: ${ver.full_signature}`);
      console.log(`Número de argumentos: ${ver.num_args}`);
      console.log(`Nombres de argumentos: ${ver.arg_names?.join(', ') || 'N/A'}`);
      console.log(`Tipos de argumentos: ${ver.arg_types || 'N/A'}`);
      console.log(`Tipo de retorno: ${ver.return_type}`);
      console.log(`Preview del código (primeros 200 chars):`);
      console.log(ver.source_preview?.substring(0, 200) + '...');
    });

    // Buscar específicamente la versión con jsonb
    const { rows: jsonbVersion } = await client.query(`
      SELECT 
        pg_get_functiondef(oid) as full_definition
      FROM pg_proc 
      WHERE proname = 'fn_marcar_asistencia' 
      AND pronamespace = 'as_turnos'::regnamespace
      AND proargtypes::text LIKE '%jsonb%'
    `);

    if (jsonbVersion.length > 0) {
      console.log('\n\n📄 DEFINICIÓN COMPLETA de la versión con jsonb:');
      console.log(jsonbVersion[0].full_definition);
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
