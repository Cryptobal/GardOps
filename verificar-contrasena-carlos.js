const { sql } = require('@vercel/postgres');

async function verificarContrasenaCarlos() {
  try {
    console.log('🔍 Verificando contraseña de Carlos en la base de datos...');
    
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
    console.log('   Contraseña en BD:', user.password || 'NULL');
    
    // Probar diferentes contraseñas
    const contraseñas = ['carlos123', 'admin', 'password', '123456', 'carlos'];
    
    for (const contraseña of contraseñas) {
      const salt = 'gardops-salt-2024';
      const hashed = Buffer.from(contraseña + salt).toString('base64');
      
      if (user.password === hashed) {
        console.log(`✅ ¡CONTRASEÑA ENCONTRADA!: "${contraseña}"`);
        return;
      }
    }
    
    console.log('❌ Ninguna de las contraseñas probadas coincide');
    console.log('🔧 Configurando nueva contraseña: carlos123');
    
    // Configurar nueva contraseña
    const nuevaContraseña = 'carlos123';
    const salt = 'gardops-salt-2024';
    const hashedNueva = Buffer.from(nuevaContraseña + salt).toString('base64');
    
    const updateResult = await sql`
      UPDATE usuarios 
      SET password = ${hashedNueva}
      WHERE email = 'carlos.irigoyen@gard.cl'
    `;
    
    if (updateResult.rowCount > 0) {
      console.log('✅ Contraseña actualizada exitosamente');
      console.log('📧 Email: carlos.irigoyen@gard.cl');
      console.log('🔑 Nueva contraseña: carlos123');
    } else {
      console.log('❌ Error al actualizar contraseña');
    }
    
  } catch (error) {
    console.error('❌ Error:', error);
  }
}

verificarContrasenaCarlos();
