require('dotenv').config({ path: '.env.local' });
const { Pool } = require('pg');

async function fixTenantIds() {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  const tenantGardId = '1397e653-a702-4020-9702-3ae4f3f8b337';

  try {
    console.log('🔧 Iniciando corrección de tenant_ids...');

    // 1. Actualizar as_turnos_pauta_mensual
    const pautaResult = await pool.query(
      'UPDATE as_turnos_pauta_mensual SET tenant_id = $1 WHERE tenant_id IS NULL',
      [tenantGardId]
    );
    console.log('✅ Pauta mensual actualizada:', pautaResult.rowCount, 'registros');

    // 2. Actualizar as_turnos_puestos_operativos
    const puestosResult = await pool.query(
      'UPDATE as_turnos_puestos_operativos SET tenant_id = $1 WHERE tenant_id IS NULL',
      [tenantGardId]
    );
    console.log('✅ Puestos operativos actualizados:', puestosResult.rowCount, 'registros');

    // 3. Actualizar as_turnos_roles_servicio
    const rolesResult = await pool.query(
      'UPDATE as_turnos_roles_servicio SET tenant_id = $1 WHERE tenant_id IS NULL',
      [tenantGardId]
    );
    console.log('✅ Roles servicio actualizados:', rolesResult.rowCount, 'registros');

    // 4. Actualizar central_config_instalacion
    const configResult = await pool.query(
      'UPDATE central_config_instalacion SET tenant_id = $1 WHERE tenant_id IS NULL',
      [tenantGardId]
    );
    console.log('✅ Config instalación actualizada:', configResult.rowCount, 'registros');

    // 5. Actualizar central_llamados
    const llamadosResult = await pool.query(
      'UPDATE central_llamados SET tenant_id = $1 WHERE tenant_id IS NULL',
      [tenantGardId]
    );
    console.log('✅ Central llamados actualizado:', llamadosResult.rowCount, 'registros');

    // 6. Verificar la vista
    const vistaResult = await pool.query('SELECT COUNT(*) as total FROM central_v_llamados_automaticos');
    console.log('📊 Total registros en vista después del fix:', vistaResult.rows[0].total);

    console.log('🎉 Corrección completada exitosamente!');

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await pool.end();
  }
}

fixTenantIds();

