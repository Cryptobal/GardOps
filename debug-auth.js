const { sql } = require('@vercel/postgres');
require('dotenv').config({ path: '.env.local' });

(async () => {
  try {
    console.log('🔍 VERIFICANDO PROCESO DE AUTENTICACIÓN...\n');
    
    // 1. Verificar que el usuario existe y tiene la contraseña correcta
    const usuario = await sql`
      SELECT id, email, password, activo
      FROM usuarios 
      WHERE email = 'central@gard.cl'
    `;
    
    if (usuario.rows.length === 0) {
      console.log('❌ Usuario NO existe');
      return;
    }
    
    const user = usuario.rows[0];
    console.log('📊 Usuario en BD:');
    console.log('  • ID:', user.id);
    console.log('  • Email:', user.email);
    console.log('  • Activo:', user.activo);
    console.log('  • Password hash:', user.password);
    
    // 2. Generar el hash que debería coincidir
    const testPassword = 'central123';
    const salt = 'gardops-salt-2024';
    const expectedHash = Buffer.from(testPassword + salt).toString('base64');
    
    console.log('\n🔐 VERIFICACIÓN DE HASH:');
    console.log('  • Contraseña ingresada: central123');
    console.log('  • Salt usado: gardops-salt-2024');
    console.log('  • Hash esperado:', expectedHash);
    console.log('  • Hash en BD:', user.password);
    console.log('  • ¿Coinciden?:', user.password === expectedHash ? '✅ SÍ' : '❌ NO');
    
    // 3. Verificar el proceso de autenticación paso a paso
    console.log('\n🧪 SIMULANDO AUTENTICACIÓN:');
    
    // Simular el mismo proceso que usa la función comparePassword
    const comparePassword = (plainPassword, hashedPassword) => {
      const testHash = Buffer.from(plainPassword + salt).toString('base64');
      console.log('    • Hash generado para comparación:', testHash);
      return testHash === hashedPassword;
    };
    
    const authResult = comparePassword('central123', user.password);
    console.log('    • Resultado de autenticación:', authResult ? '✅ ÉXITO' : '❌ FALLO');
    
    // 4. Si no coincide, actualizar la contraseña
    if (!authResult) {
      console.log('\n🔧 ACTUALIZANDO CONTRASEÑA...');
      await sql`
        UPDATE usuarios 
        SET password = ${expectedHash}
        WHERE email = 'central@gard.cl'
      `;
      console.log('✅ Contraseña actualizada');
      
      // Verificar que ahora sí funciona
      const newAuthResult = comparePassword('central123', expectedHash);
      console.log('    • Nueva verificación:', newAuthResult ? '✅ ÉXITO' : '❌ FALLO');
    }
    
    console.log('\n✅ CREDENCIALES FINALES:');
    console.log('  • Email: central@gard.cl');
    console.log('  • Contraseña: central123');
    
    await sql.end();
  } catch (error) {
    console.error('Error:', error);
  }
})(); 