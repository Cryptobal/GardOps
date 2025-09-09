import { query } from '../src/lib/database';

async function testValidacionClientes() {
  try {
    console.log('🔍 Probando validación de clientes con instalaciones activas...\n');

    // 1. Buscar clientes que tienen instalaciones activas
    console.log('1. Buscando clientes con instalaciones activas...');
    const clientesConInstalacionesActivas = await query(`
      SELECT DISTINCT 
        c.id as cliente_id,
        c.nombre as cliente_nombre,
        c.estado as cliente_estado,
        COUNT(i.id) as total_instalaciones,
        COUNT(CASE WHEN i.estado = 'Activo' THEN 1 END) as instalaciones_activas,
        COUNT(CASE WHEN i.estado = 'Inactivo' THEN 1 END) as instalaciones_inactivas
      FROM clientes c
      LEFT JOIN instalaciones i ON c.id = i.cliente_id
      GROUP BY c.id, c.nombre, c.estado
      HAVING COUNT(CASE WHEN i.estado = 'Activo' THEN 1 END) > 0
      ORDER BY instalaciones_activas DESC, c.nombre
    `);

    if (clientesConInstalacionesActivas.rows.length === 0) {
      console.log('❌ No se encontraron clientes con instalaciones activas');
      console.log('💡 Para probar la validación, necesitas:');
      console.log('   1. Crear un cliente');
      console.log('   2. Crear una instalación asociada a ese cliente');
      console.log('   3. Asegurarte de que la instalación esté en estado "Activo"');
      return;
    }

    console.log(`✅ Se encontraron ${clientesConInstalacionesActivas.rows.length} clientes con instalaciones activas:\n`);

    // Mostrar detalles de cada cliente
    for (const cliente of clientesConInstalacionesActivas.rows) {
      console.log(`📋 Cliente: ${cliente.cliente_nombre}`);
      console.log(`   ID: ${cliente.cliente_id}`);
      console.log(`   Estado actual: ${cliente.cliente_estado}`);
      console.log(`   Total instalaciones: ${cliente.total_instalaciones}`);
      console.log(`   Instalaciones activas: ${cliente.instalaciones_activas}`);
      console.log(`   Instalaciones inactivas: ${cliente.instalaciones_inactivas}`);

      // Obtener detalles de las instalaciones
      const instalacionesDetalle = await query(`
        SELECT id, nombre, estado, cliente_id
        FROM instalaciones 
        WHERE cliente_id = $1
        ORDER BY estado DESC, nombre
      `, [cliente.cliente_id]);

      console.log('   📍 Instalaciones:');
      instalacionesDetalle.rows.forEach((inst: any) => {
        const statusIcon = inst.estado === 'Activo' ? '🟢' : '🔴';
        console.log(`      ${statusIcon} ${inst.nombre} (${inst.estado})`);
      });
      console.log('');
    }

    // 2. Probar la validación intentando inactivar un cliente con instalaciones activas usando la API
    const clienteParaProbar = clientesConInstalacionesActivas.rows[0];
    console.log(`2. Probando validación con cliente: ${clienteParaProbar.cliente_nombre}`);
    
    try {
      // Obtener datos completos del cliente
      const clienteCompleto = await query(`
        SELECT * FROM clientes WHERE id = $1
      `, [clienteParaProbar.cliente_id]);

      if (clienteCompleto.rows.length === 0) {
        console.log('❌ No se pudo obtener los datos del cliente');
        return;
      }

      const clienteData = clienteCompleto.rows[0];
      
      // Intentar inactivar el cliente usando la API
      const response = await fetch('http://localhost:3000/api/clientes', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...clienteData,
          estado: 'Inactivo'
        }),
      });

      const result = await response.json();

      if (response.ok) {
        console.log('❌ ERROR: La validación no está funcionando correctamente');
        console.log('   El cliente se inactivó cuando debería haber sido bloqueado');
        
        // Revertir el cambio
        await query(`
          UPDATE clientes 
          SET estado = $1, updated_at = NOW()
          WHERE id = $2
        `, [clienteParaProbar.cliente_estado, clienteParaProbar.cliente_id]);
        console.log('   ✅ Cambio revertido');

      } else if (response.status === 400 && result.instalacionesActivas) {
        console.log('✅ Validación funcionando correctamente');
        console.log('   El cliente no se pudo inactivar debido a instalaciones activas');
        console.log(`   Error: ${result.error}`);
        console.log(`   Instalaciones activas: ${result.instalacionesActivas.length}`);
        console.log(`   Instalaciones inactivas: ${result.instalacionesInactivas?.length || 0}`);
      } else {
        console.log('❌ Error inesperado:', result.error || 'Error desconocido');
      }

    } catch (error: any) {
      console.log('❌ Error de conexión:', error.message);
      console.log('💡 Asegúrate de que el servidor esté ejecutándose en http://localhost:3000');
    }

    // 3. Probar con un cliente sin instalaciones activas
    console.log('\n3. Probando con cliente sin instalaciones activas...');
    const clientesSinInstalacionesActivas = await query(`
      SELECT DISTINCT 
        c.id as cliente_id,
        c.nombre as cliente_nombre,
        c.estado as cliente_estado
      FROM clientes c
      LEFT JOIN instalaciones i ON c.id = i.cliente_id
      GROUP BY c.id, c.nombre, c.estado
      HAVING COUNT(CASE WHEN i.estado = 'Activo' THEN 1 END) = 0
      LIMIT 1
    `);

    if (clientesSinInstalacionesActivas.rows.length > 0) {
      const clienteSinInstalaciones = clientesSinInstalacionesActivas.rows[0];
      console.log(`   Probando con: ${clienteSinInstalaciones.cliente_nombre}`);
      
      try {
        // Obtener datos completos del cliente
        const clienteCompleto = await query(`
          SELECT * FROM clientes WHERE id = $1
        `, [clienteSinInstalaciones.cliente_id]);

        if (clienteCompleto.rows.length === 0) {
          console.log('❌ No se pudo obtener los datos del cliente');
          return;
        }

        const clienteData = clienteCompleto.rows[0];
        
        // Intentar inactivar el cliente usando la API
        const response = await fetch('http://localhost:3000/api/clientes', {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            ...clienteData,
            estado: 'Inactivo'
          }),
        });

        const result = await response.json();

        if (response.ok) {
          console.log('✅ Cliente sin instalaciones activas se inactivó correctamente');
          
          // Revertir el cambio
          await query(`
            UPDATE clientes 
            SET estado = $1, updated_at = NOW()
            WHERE id = $2
          `, [clienteSinInstalaciones.cliente_estado, clienteSinInstalaciones.cliente_id]);
          console.log('   ✅ Cambio revertido');

        } else {
          console.log('❌ Error inesperado:', result.error || 'Error desconocido');
        }

      } catch (error: any) {
        console.log('❌ Error de conexión:', error.message);
      }
    } else {
      console.log('   No se encontraron clientes sin instalaciones activas para probar');
    }

    console.log('\n🎯 Resumen de la prueba:');
    console.log('   - La validación debe impedir inactivar clientes con instalaciones activas');
    console.log('   - Los clientes sin instalaciones activas deben poder inactivarse normalmente');
    console.log('   - El modal de error debe mostrarse en el frontend cuando se intente inactivar');

  } catch (error) {
    console.error('❌ Error en la prueba:', error);
  } finally {
    process.exit(0);
  }
}

testValidacionClientes(); 