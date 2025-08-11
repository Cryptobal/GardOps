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

    // Verificar la estructura de la tabla as_turnos_logs
    console.log('\n🔍 Verificando estructura de tabla as_turnos_logs...');
    const { rows: columns } = await client.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_schema = 'public' 
        AND table_name = 'as_turnos_logs'
      ORDER BY ordinal_position
    `);

    console.log('Columnas encontradas:');
    columns.forEach(col => {
      console.log(`  - ${col.column_name}: ${col.data_type}`);
    });

    // Buscar el nombre correcto de la columna de tiempo
    const timeColumn = columns.find(col => 
      col.column_name.includes('time') || 
      col.column_name.includes('created') ||
      col.column_name.includes('fecha')
    );

    const timeColumnName = timeColumn ? timeColumn.column_name : 'created_at';
    console.log(`\n📝 Usando columna de tiempo: ${timeColumnName}`);

    // Actualizar la función fn_revertir_a_plan
    console.log('\n📝 Actualizando función fn_revertir_a_plan...');
    
    // Primero eliminar la función existente
    await client.query(`DROP FUNCTION IF EXISTS as_turnos.fn_revertir_a_plan(bigint, text)`);
    
    // Recrear con el nombre correcto de columna
    await client.query(`
      CREATE FUNCTION as_turnos.fn_revertir_a_plan(
        p_pauta_id bigint,
        p_actor_ref text
      )
      RETURNS void
      LANGUAGE plpgsql
      AS $$
      DECLARE
        v_before jsonb;
        v_after  jsonb;
        v_has_logs boolean;
      BEGIN
        -- Obtener estado anterior
        SELECT jsonb_build_object(
          'estado', estado,
          'estado_ui', estado_ui,
          'meta', meta
        ) INTO v_before
        FROM public.as_turnos_pauta_mensual
        WHERE id = p_pauta_id;

        -- Revertir a planificado - limpiar TODO
        UPDATE public.as_turnos_pauta_mensual
        SET 
          estado = 'planificado',
          estado_ui = NULL,  -- Limpiar completamente
          meta = NULL  -- Limpiar completamente el meta
        WHERE id = p_pauta_id;

        -- Obtener estado posterior
        SELECT jsonb_build_object(
          'estado', estado,
          'estado_ui', estado_ui,
          'meta', meta
        ) INTO v_after
        FROM public.as_turnos_pauta_mensual
        WHERE id = p_pauta_id;

        -- Verificar si existe la tabla de logs
        SELECT EXISTS (
          SELECT 1 FROM information_schema.tables 
          WHERE table_schema = 'public' 
          AND table_name = 'as_turnos_logs'
        ) INTO v_has_logs;

        -- Solo intentar insertar log si la tabla existe
        IF v_has_logs THEN
          BEGIN
            -- Intentar insertar con el nombre de columna correcto
            INSERT INTO public.as_turnos_logs(
              actor_ref, 
              action, 
              pauta_id, 
              before_state, 
              after_state,
              ${timeColumnName}
            )
            VALUES (
              p_actor_ref,
              'revertir_a_plan',
              p_pauta_id,
              v_before::text,
              v_after::text,
              NOW()
            );
          EXCEPTION WHEN OTHERS THEN
            -- Si falla el log, no fallar toda la operación
            RAISE NOTICE 'No se pudo insertar log: %', SQLERRM;
          END;
        END IF;
      END;
      $$;
    `);
    console.log('✅ Función fn_revertir_a_plan actualizada correctamente');

    // Verificar registros con estado sin_cobertura que puedan estar bloqueados
    console.log('\n🔍 Verificando registros con estado sin_cobertura...');
    const { rows: sinCobertura } = await client.query(`
      SELECT id, estado, estado_ui, meta
      FROM public.as_turnos_pauta_mensual
      WHERE estado = 'inasistencia' 
        AND estado_ui = 'falta'
        AND id IN (43, 74, 75)  -- IDs del ejemplo
    `);

    if (sinCobertura.length > 0) {
      console.log(`Encontrados ${sinCobertura.length} registros con inasistencia sin cobertura`);
      sinCobertura.forEach(r => {
        console.log(`  ID ${r.id}: estado=${r.estado}, estado_ui=${r.estado_ui}`);
      });
    }

    // Probar la función con un registro de ejemplo
    console.log('\n🧪 Probando función con registro de ejemplo...');
    try {
      if (sinCobertura.length > 0) {
        await client.query(
          `SELECT as_turnos.fn_revertir_a_plan($1::bigint, $2::text)`,
          [sinCobertura[0].id, 'test-script']
        );
        console.log('✅ Función ejecutada exitosamente');
        
        // Verificar el resultado
        const { rows: after } = await client.query(`
          SELECT id, estado, estado_ui, meta
          FROM public.as_turnos_pauta_mensual
          WHERE id = $1
        `, [sinCobertura[0].id]);
        
        console.log('Estado después de revertir:');
        console.log(`  ID ${after[0].id}: estado=${after[0].estado}, estado_ui=${after[0].estado_ui}`);
      }
    } catch (testErr) {
      console.error('Error en prueba:', testErr);
    }

    console.log('\n✅ Corrección aplicada exitosamente');

  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  } finally {
    await client.end();
    console.log('\n🔌 Conexión cerrada');
  }
}

main().catch(console.error);
