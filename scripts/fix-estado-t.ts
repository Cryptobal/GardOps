import { Client } from 'pg';

async function fixEstadoT() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
  });

  try {
    await client.connect();
    console.log('🔗 Conectado a la base de datos');

    // Verificar cuántos registros tienen estado 'T'
    const countBefore = await client.query(`
      SELECT COUNT(*) as registros_con_estado_T 
      FROM as_turnos_pauta_mensual 
      WHERE estado = 'T'
    `);
    
    console.log(`📊 Registros con estado 'T' antes de la corrección: ${countBefore.rows[0].registros_con_estado_t}`);

    if (countBefore.rows[0].registros_con_estado_t > 0) {
      // Actualizar registros con estado 'T' a 'trabajado'
      const updateResult = await client.query(`
        UPDATE as_turnos_pauta_mensual 
        SET estado = 'trabajado', 
            updated_at = NOW()
        WHERE estado = 'T'
      `);

      console.log(`✅ Registros actualizados: ${updateResult.rowCount}`);

      // Verificar que no queden registros con estado 'T'
      const countAfter = await client.query(`
        SELECT COUNT(*) as registros_con_estado_T_despues 
        FROM as_turnos_pauta_mensual 
        WHERE estado = 'T'
      `);

      console.log(`📊 Registros con estado 'T' después de la corrección: ${countAfter.rows[0].registros_con_estado_t_despues}`);

      if (countAfter.rows[0].registros_con_estado_t_despues === 0) {
        console.log('✅ Corrección completada exitosamente');
      } else {
        console.log('⚠️ Aún quedan registros con estado T');
      }
    } else {
      console.log('ℹ️ No hay registros con estado T para corregir');
    }

  } catch (error) {
    console.error('❌ Error ejecutando la corrección:', error);
  } finally {
    await client.end();
    console.log('🔌 Conexión cerrada');
  }
}

// Cargar variables de entorno
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

fixEstadoT(); 