const { sql } = require('@vercel/postgres');

async function checkCarlosPassword() {
  try {
    console.log('🔍 Verificando contraseña de Carlos Irigoyen...');
    
    // Buscar usuario Carlos
    const result = await sql`
      SELECT id, email, nombre, password 
      FROM usuarios 
      WHERE email = 'carlos.irigoyen@gard.cl'
      LIMIT 1
    `;
    
    if (result.rows.length === 0) {
      console.log('❌ No se encontró el usuario carlos.irigoyen@gard.cl');
      return;
    }
    
    const user = result.rows[0];
    console.log('✅ Usuario encontrado:');
    console.log('   ID:', user.id);
    console.log('   Email:', user.email);
    console.log('   Nombre:', user.nombre);
    console.log('   Contraseña actual:', user.password ? 'Configurada' : 'No configurada');
    
    // Verificar si la contraseña es la correcta
    const testPassword = 'carlos123';
    const salt = 'gardops-salt-2024';
    const hashedTestPassword = Buffer.from(testPassword + salt).toString('base64');
    
    if (user.password === hashedTestPassword) {
      console.log('✅ La contraseña ya es correcta: carlos123');
    } else {
      console.log('❌ La contraseña no es correcta');
      console.log('🔧 Cambiando contraseña a: carlos123');
      
      // Actualizar contraseña
      const updateResult = await sql`
        UPDATE usuarios 
        SET password = ${hashedTestPassword}
        WHERE email = 'carlos.irigoyen@gard.cl'
      `;
      
      if (updateResult.rowCount > 0) {
        console.log('✅ Contraseña actualizada exitosamente');
        console.log('📧 Email: carlos.irigoyen@gard.cl');
        console.log('🔑 Nueva contraseña: carlos123');
      } else {
        console.log('❌ Error al actualizar contraseña');
      }
    }
    
  } catch (error) {
    console.error('❌ Error:', error);
  }
}

checkCarlosPassword();
