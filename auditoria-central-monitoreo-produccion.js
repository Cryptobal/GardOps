// Auditoría Central de Monitoreo - Problema Local vs Producción
require('dotenv').config({ path: '.env.production' });

// Configurar la variable de entorno para Vercel Postgres
process.env.POSTGRES_URL = process.env.DATABASE_URL;

const { sql } = require('@vercel/postgres');

async function auditoriaCentralMonitoreo() {
  console.log('🔍 AUDITORÍA CENTRAL DE MONITOREO - LOCAL VS PRODUCCIÓN\n');
  console.log('📋 Verificando configuración y datos en producción...\n');

  try {
    // 1. Verificar conexión a la base de datos
    console.log('1. 🔌 Verificando conexión a la base de datos...');
    const connectionTest = await sql`SELECT current_database(), current_user, version()`;
    console.log(`   ✅ Conectado a: ${connectionTest.rows[0].current_database}`);
    console.log(`   ✅ Usuario: ${connectionTest.rows[0].current_user}`);
    console.log(`   ✅ PostgreSQL: ${connectionTest.rows[0].version.split(' ')[0]}\n`);

    // 2. Verificar tablas del Central de Monitoreo
    console.log('2. 📊 Verificando tablas del Central de Monitoreo...');
    
    const tables = [
      'central_config_instalacion',
      'central_llamados',
      'central_v_llamados_automaticos',
      'central_v_turnos_activos'
    ];

    for (const table of tables) {
      const tableExists = await sql`
        SELECT EXISTS (
          SELECT FROM information_schema.tables 
          WHERE table_schema = 'public' 
          AND table_name = ${table}
        ) as existe
      `;
      console.log(`   ${tableExists.rows[0].existe ? '✅' : '❌'} ${table}`);
    }
    console.log('');

    // 3. Verificar datos en las tablas
    console.log('3. 📈 Verificando datos en las tablas...');
    
    // Configuraciones de instalaciones
    const configs = await sql`
      SELECT COUNT(*) as total FROM central_config_instalacion
    `;
    console.log(`   📋 Configuraciones: ${configs.rows[0].total}`);
    
    // Llamados
    const llamados = await sql`
      SELECT COUNT(*) as total FROM central_llamados
    `;
    console.log(`   📞 Llamados: ${llamados.rows[0].total}`);
    
    // Vista de llamados automáticos
    const llamadosAuto = await sql`
      SELECT COUNT(*) as total FROM central_v_llamados_automaticos
    `;
    console.log(`   🤖 Llamados automáticos: ${llamadosAuto.rows[0].total}`);
    
    // Vista de turnos activos
    const turnosActivos = await sql`
      SELECT COUNT(*) as total FROM central_v_turnos_activos
    `;
    console.log(`   👥 Turnos activos: ${turnosActivos.rows[0].total}`);
    console.log('');

    // 4. Verificar permisos del usuario carlos
    console.log('4. 👤 Verificando permisos del usuario carlos...');
    const user = await sql`
      SELECT id, email, nombre FROM usuarios 
      WHERE email = 'carlos.irigoyen@gard.cl'
    `;
    
    if (user.rows.length > 0) {
      console.log(`   ✅ Usuario encontrado: ${user.rows[0].nombre} (${user.rows[0].email})`);
      
      // Verificar roles
      const roles = await sql`
        SELECT r.nombre
        FROM usuarios_roles ur
        INNER JOIN roles r ON ur.rol_id = r.id
        WHERE ur.usuario_id = ${user.rows[0].id}
      `;
      
      console.log(`   🎭 Roles asignados: ${roles.rows.length}`);
      roles.rows.forEach(r => console.log(`      - ${r.nombre}`));
      
      // Verificar permisos específicos de central monitoring
      const permisos = await sql`
        SELECT DISTINCT p.clave
        FROM usuarios u
        INNER JOIN usuarios_roles ur ON u.id = ur.usuario_id
        INNER JOIN roles_permisos rp ON ur.rol_id = rp.rol_id
        INNER JOIN permisos p ON rp.permiso_id = p.id
        WHERE u.id = ${user.rows[0].id}
        AND p.clave LIKE 'central_monitoring.%'
      `;
      
      console.log(`   🔐 Permisos central_monitoring: ${permisos.rows.length}`);
      permisos.rows.forEach(p => console.log(`      - ${p.clave}`));
      
    } else {
      console.log('   ❌ Usuario carlos no encontrado');
    }
    console.log('');

    // 5. Verificar instalaciones activas
    console.log('5. 🏢 Verificando instalaciones activas...');
    const instalaciones = await sql`
      SELECT COUNT(*) as total FROM instalaciones WHERE estado = 'Activo'
    `;
    console.log(`   🏢 Instalaciones activas: ${instalaciones.rows[0].total}`);
    
    // Verificar instalaciones con configuración
    const instalacionesConConfig = await sql`
      SELECT COUNT(DISTINCT cci.instalacion_id) as total
      FROM central_config_instalacion cci
      INNER JOIN instalaciones i ON cci.instalacion_id = i.id
      WHERE i.estado = 'Activo'
    `;
    console.log(`   ⚙️  Instalaciones con configuración: ${instalacionesConConfig.rows[0].total}`);
    console.log('');

    // 6. Verificar turnos activos hoy
    console.log('6. 📅 Verificando turnos activos hoy...');
    const turnosHoy = await sql`
      SELECT 
        i.nombre as instalacion,
        g.nombre as guardia,
        r.nombre as rol,
        t.hora_inicio,
        t.hora_termino
      FROM turnos t
      INNER JOIN instalaciones i ON t.instalacion_id = i.id
      INNER JOIN guardias g ON t.guardia_id = g.id
      INNER JOIN roles r ON t.rol_id = r.id
      WHERE i.estado = 'Activo'
      AND t.fecha = CURRENT_DATE
      LIMIT 5
    `;
    
    console.log(`   📋 Turnos hoy: ${turnosHoy.rows.length}`);
    turnosHoy.rows.forEach(t => {
      console.log(`      - ${t.instalacion}: ${t.guardia} (${t.rol}) ${t.hora_inicio}-${t.hora_termino}`);
    });
    console.log('');

    // 7. Verificar variables de entorno críticas
    console.log('7. 🔧 Verificando variables de entorno...');
    console.log(`   🌍 NODE_ENV: ${process.env.NODE_ENV || 'No definido'}`);
    console.log(`   🗄️  DATABASE_URL: ${process.env.DATABASE_URL ? '✅ Configurado' : '❌ No configurado'}`);
    console.log(`   🔑 JWT_SECRET: ${process.env.JWT_SECRET ? '✅ Configurado' : '❌ No configurado'}`);
    console.log(`   🌐 NEXT_PUBLIC_API_BASE_URL: ${process.env.NEXT_PUBLIC_API_BASE_URL || 'No definido'}`);
    console.log('');

    // 8. Verificar funciones de base de datos
    console.log('8. ⚙️ Verificando funciones de base de datos...');
    const functions = [
      'fn_usuario_tiene_permiso',
      'fn_generar_llamados_automaticos'
    ];

    for (const func of functions) {
      const funcExists = await sql`
        SELECT EXISTS (
          SELECT FROM information_schema.routines 
          WHERE routine_schema = 'public' 
          AND routine_name = ${func}
        ) as existe
      `;
      console.log(`   ${funcExists.rows[0].existe ? '✅' : '❌'} ${func}`);
    }
    console.log('');

    // 9. Verificar vistas
    console.log('9. 👁️ Verificando vistas...');
    const views = [
      'central_v_llamados_automaticos',
      'central_v_turnos_activos'
    ];

    for (const view of views) {
      const viewExists = await sql`
        SELECT EXISTS (
          SELECT FROM information_schema.views 
          WHERE table_schema = 'public' 
          AND table_name = ${view}
        ) as existe
      `;
      console.log(`   ${viewExists.rows[0].existe ? '✅' : '❌'} ${view}`);
    }
    console.log('');

    // 10. Resumen y recomendaciones
    console.log('📋 RESUMEN Y RECOMENDACIONES\n');
    console.log('🔍 Posibles causas del problema:');
    console.log('   1. Variables de entorno no configuradas en producción');
    console.log('   2. Permisos de usuario no asignados correctamente');
    console.log('   3. Datos de instalaciones/turnos no sincronizados');
    console.log('   4. Funciones o vistas de BD no creadas en producción');
    console.log('   5. Configuración de CEL/Vercel incorrecta');
    console.log('');
    console.log('🛠️ Acciones recomendadas:');
    console.log('   1. Verificar variables de entorno en Vercel');
    console.log('   2. Ejecutar migraciones de BD en producción');
    console.log('   3. Verificar permisos del usuario carlos');
    console.log('   4. Sincronizar datos de instalaciones');
    console.log('   5. Verificar logs de la aplicación en producción');

  } catch (error) {
    console.error('❌ Error en la auditoría:', error);
  } finally {
    process.exit(0);
  }
}

auditoriaCentralMonitoreo();