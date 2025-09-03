const { sql } = require('@vercel/postgres');
require('dotenv').config({ path: '.env.local' });

(async () => {
  try {
    console.log('🔍 VERIFICANDO BASE DE DATOS DE PRODUCCIÓN...\n');
    
    // Verificar usuarios existentes
    const usuarios = await sql`
      SELECT email, nombre, activo, id
      FROM usuarios
      ORDER BY email
    `;
    
    console.log('📊 USUARIOS EN PRODUCCIÓN:');
    if (usuarios.rows.length === 0) {
      console.log('❌ NO HAY USUARIOS EN PRODUCCIÓN');
    } else {
      usuarios.rows.forEach((u, i) => {
        console.log(`${i+1}. ${u.email} - ${u.nombre} (activo: ${u.activo})`);
      });
    }
    
    console.log(`\nTotal: ${usuarios.rows.length} usuarios en producción`);
    
    // Verificar si central@gard.cl existe
    const central = await sql`
      SELECT email, password, activo
      FROM usuarios
      WHERE email = 'central@gard.cl'
    `;
    
    if (central.rows.length === 0) {
      console.log('\n❌ central@gard.cl NO EXISTE en producción');
      console.log('🔧 CREANDO USUARIO EN PRODUCCIÓN...');
      
      const tenantId = '1397e653-a702-4020-9702-3ae4f3f8b337';
      const password = 'central123';
      const salt = 'gardops-salt-2024';
      const hashedPassword = Buffer.from(password + salt).toString('base64');
      
      // Crear usuario
      const newUser = await sql`
        INSERT INTO usuarios (id, email, nombre, apellido, password, activo, tenant_id, fecha_creacion)
        VALUES (
          gen_random_uuid(),
          'central@gard.cl',
          'Central de Monitoreo',
          '',
          ${hashedPassword},
          true,
          ${tenantId},
          NOW()
        )
        RETURNING id, email, nombre
      `;
      
      console.log('✅ Usuario creado en producción:', newUser.rows[0]);
      
      // Asignar rol Operador
      const operadorRole = await sql`
        SELECT id FROM roles 
        WHERE nombre = 'Operador' 
        AND tenant_id = ${tenantId}
      `;
      
      if (operadorRole.rows.length > 0) {
        const userId = newUser.rows[0].id;
        const roleId = operadorRole.rows[0].id;
        
        await sql`
          INSERT INTO usuarios_roles (usuario_id, rol_id)
          VALUES (${userId}, ${roleId})
        `;
        console.log('✅ Rol Operador asignado en producción');
      }
      
    } else {
      console.log('\n✅ central@gard.cl EXISTE en producción');
      const user = central.rows[0];
      console.log('  • Email:', user.email);
      console.log('  • Activo:', user.activo);
      console.log('  • Password hash:', user.password?.substring(0, 30) + '...');
      
      // Verificar si la contraseña es correcta
      const testPassword = 'central123';
      const salt = 'gardops-salt-2024';
      const expectedHash = Buffer.from(testPassword + salt).toString('base64');
      
      if (user.password !== expectedHash) {
        console.log('🔧 ACTUALIZANDO CONTRASEÑA EN PRODUCCIÓN...');
        await sql`
          UPDATE usuarios 
          SET password = ${expectedHash}
          WHERE email = 'central@gard.cl'
        `;
        console.log('✅ Contraseña actualizada en producción');
      }
    }
    
    console.log('\n✅ CREDENCIALES PARA PRODUCCIÓN:');
    console.log('  • URL: https://ops.gard.cl');
    console.log('  • Email: central@gard.cl');
    console.log('  • Contraseña: central123');
    
    await sql.end();
  } catch (error) {
    console.error('Error:', error);
  }
})();
