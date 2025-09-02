// Script para diagnosticar y corregir el problema del formulario de guardias en producción
const https = require('https');

async function diagnosticarProblemaGuardias() {
  console.log('🔍 Diagnosticando problema del formulario de guardias en producción...\n');
  
  // 1. Verificar variables de entorno críticas
  console.log('1️⃣ Verificando variables de entorno:');
  const envVars = ['DATABASE_URL', 'POSTGRES_URL', 'JWT_SECRET', 'NODE_ENV'];
  envVars.forEach(env => {
    console.log(`   ${env}: ${process.env[env] ? '✅ Configurada' : '❌ Faltante'}`);
  });
  
  // 2. Verificar configuración de producción
  console.log('\n2️⃣ Configuración de entorno:');
  console.log(`   NODE_ENV: ${process.env.NODE_ENV}`);
  console.log(`   VERCEL: ${process.env.VERCEL || 'No'}`);
  console.log(`   VERCEL_ENV: ${process.env.VERCEL_ENV || 'No definido'}`);
  
  // 3. Verificar conexión a base de datos
  console.log('\n3️⃣ Verificando conexión a base de datos...');
  try {
    if (process.env.NODE_ENV === 'production') {
      const { sql } = require('@vercel/postgres');
      const result = await sql`SELECT 1 as test`;
      console.log('   ✅ Conexión a base de datos exitosa');
    } else {
      const { query } = require('./src/lib/database');
      await query('SELECT 1');
      console.log('   ✅ Conexión a base de datos exitosa');
    }
  } catch (error) {
    console.log('   ❌ Error de conexión:', error.message);
  }
  
  // 4. Verificar tabla de permisos
  console.log('\n4️⃣ Verificando tabla de permisos...');
  try {
    if (process.env.NODE_ENV === 'production') {
      const { sql } = require('@vercel/postgres');
      const result = await sql`
        SELECT EXISTS (
          SELECT FROM information_schema.tables 
          WHERE table_schema = 'public' 
          AND table_name = 'permisos'
        ) as exists
      `;
      console.log(`   Tabla permisos: ${result.rows[0].exists ? '✅ Existe' : '❌ No existe'}`);
    }
  } catch (error) {
    console.log('   ❌ Error verificando tabla permisos:', error.message);
  }
  
  // 5. Verificar función de permisos
  console.log('\n5️⃣ Verificando función de permisos...');
  try {
    if (process.env.NODE_ENV === 'production') {
      const { sql } = require('@vercel/postgres');
      const result = await sql`
        SELECT EXISTS (
          SELECT FROM pg_proc 
          WHERE proname = 'fn_usuario_tiene_permiso'
        ) as exists
      `;
      console.log(`   Función fn_usuario_tiene_permiso: ${result.rows[0].exists ? '✅ Existe' : '❌ No existe'}`);
    }
  } catch (error) {
    console.log('   ❌ Error verificando función:', error.message);
  }
  
  console.log('\n🔧 Soluciones recomendadas:');
  console.log('   1. Verificar que DATABASE_URL esté configurada en Vercel');
  console.log('   2. Verificar que la tabla "permisos" exista en producción');
  console.log('   3. Verificar que la función "fn_usuario_tiene_permiso" exista');
  console.log('   4. Revisar los logs de Vercel para errores específicos');
  console.log('   5. Verificar que el usuario tenga el permiso "guardias.view"');
}

async function crearMigracionPermisos() {
  console.log('\n🛠️ Creando migración de permisos...');
  
  const migracionSQL = `
-- Migración para corregir permisos de guardias en producción

-- 1. Crear tabla de permisos si no existe
CREATE TABLE IF NOT EXISTS public.permisos (
    id SERIAL PRIMARY KEY,
    nombre VARCHAR(255) NOT NULL UNIQUE,
    descripcion TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 2. Insertar permisos básicos de guardias
INSERT INTO public.permisos (nombre, descripcion) VALUES
('guardias.view', 'Ver lista de guardias'),
('guardias.create', 'Crear nuevos guardias'),
('guardias.edit', 'Editar guardias existentes'),
('guardias.delete', 'Eliminar guardias')
ON CONFLICT (nombre) DO NOTHING;

-- 3. Crear función de verificación de permisos si no existe
CREATE OR REPLACE FUNCTION public.fn_usuario_tiene_permiso(
    p_usuario_id UUID,
    p_permiso VARCHAR(255)
) RETURNS BOOLEAN AS $$
DECLARE
    v_tiene_permiso BOOLEAN := false;
BEGIN
    -- Verificar si el usuario es admin (bypass)
    SELECT EXISTS (
        SELECT 1 FROM public.usuarios u
        JOIN public.roles r ON u.rol_id = r.id
        WHERE u.id = p_usuario_id AND r.nombre = 'admin'
    ) INTO v_tiene_permiso;
    
    IF v_tiene_permiso THEN
        RETURN true;
    END IF;
    
    -- Verificar permisos específicos del rol
    SELECT EXISTS (
        SELECT 1 FROM public.usuarios u
        JOIN public.roles r ON u.rol_id = r.id
        JOIN public.roles_permisos rp ON r.id = rp.rol_id
        JOIN public.permisos p ON rp.permiso_id = p.id
        WHERE u.id = p_usuario_id AND p.nombre = p_permiso
    ) INTO v_tiene_permiso;
    
    RETURN v_tiene_permiso;
END;
$$ LANGUAGE plpgsql;

-- 4. Asignar permisos de guardias al rol admin si existe
INSERT INTO public.roles_permisos (rol_id, permiso_id)
SELECT r.id, p.id
FROM public.roles r
CROSS JOIN public.permisos p
WHERE r.nombre = 'admin' 
AND p.nombre LIKE 'guardias.%'
ON CONFLICT DO NOTHING;

-- 5. Crear usuario de prueba si no existe (solo para desarrollo)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM public.usuarios WHERE email = 'admin@gardops.com') THEN
        INSERT INTO public.usuarios (
            email, 
            nombre, 
            activo, 
            rol_id,
            created_at
        ) VALUES (
            'admin@gardops.com',
            'Administrador',
            true,
            (SELECT id FROM public.roles WHERE nombre = 'admin' LIMIT 1),
            CURRENT_TIMESTAMP
        );
    END IF;
END $$;
`;

  console.log('SQL de migración generado. Ejecutar en la base de datos de producción.');
  return migracionSQL;
}

// Ejecutar diagnóstico
if (require.main === module) {
  diagnosticarProblemaGuardias()
    .then(() => {
      console.log('\n✅ Diagnóstico completado');
      return crearMigracionPermisos();
    })
    .then((sql) => {
      console.log('\n📝 Migración SQL creada exitosamente');
    })
    .catch(error => {
      console.error('❌ Error:', error);
    });
}

module.exports = {
  diagnosticarProblemaGuardias,
  crearMigracionPermisos
};