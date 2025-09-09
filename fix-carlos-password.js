const { sql } = require('@vercel/postgres');
const bcrypt = require('bcryptjs');

async function fixCarlosPassword() {
  try {
    console.log('🔧 Arreglando contraseña de Carlos Irigoyen...');
    
    // Hashear nueva contraseña
    const newPassword = 'carlos123';
    const hashedPassword = bcrypt.hashSync(newPassword, 10);
    
    // Actualizar contraseña en la base de datos
    const result = await sql`
      UPDATE usuarios 
      SET password = ${hashedPassword}
      WHERE email = 'carlos.irigoyen@gard.cl'
    `;
    
    if (result.rowCount > 0) {
      console.log('✅ Contraseña actualizada exitosamente');
      console.log('📧 Email: carlos.irigoyen@gard.cl');
      console.log('🔑 Nueva contraseña: carlos123');
    } else {
      console.log('❌ No se encontró el usuario carlos.irigoyen@gard.cl');
    }
    
  } catch (error) {
    console.error('❌ Error:', error);
  }
}

fixCarlosPassword();
