import { config } from 'dotenv';
import * as path from 'path';

// Cargar variables de entorno
config({ path: path.join(__dirname, '../.env.local') });

import { sql } from '@vercel/postgres';

async function migratePermisosCategorias() {
  try {
    console.log('🚀 Iniciando migración de permisos con categorías...\n');

    // 1. Agregar columna categoria si no existe
    console.log('📋 Paso 1: Agregando columna categoria...');
    await sql`
      ALTER TABLE permisos 
      ADD COLUMN IF NOT EXISTS categoria VARCHAR(50)
    `;
    console.log('✅ Columna categoria agregada');

    // 2. Crear índice para optimizar consultas
    console.log('📋 Paso 2: Creando índice...');
    await sql`
      CREATE INDEX IF NOT EXISTS idx_permisos_categoria ON permisos(categoria)
    `;
    console.log('✅ Índice creado');

    // 3. Categorizar permisos existentes
    console.log('📋 Paso 3: Categorizando permisos existentes...');
    const updateResult = await sql`
      UPDATE permisos SET categoria = 
        CASE 
          WHEN clave LIKE 'turnos.%' THEN 'Turnos'
          WHEN clave LIKE 'payroll.%' THEN 'Payroll'
          WHEN clave LIKE 'maestros.%' THEN 'Maestros'
          WHEN clave LIKE 'rbac.%' THEN 'RBAC'
          WHEN clave LIKE 'usuarios.%' THEN 'Usuarios'
          WHEN clave IN ('config.manage', 'documentos.manage') THEN 'Configuración'
          ELSE 'Otros'
        END
      WHERE categoria IS NULL
    `;
    console.log(`✅ ${updateResult.rowCount} permisos categorizados`);

    // 4. Crear función helper para nuevos permisos
    console.log('📋 Paso 4: Creando función helper...');
    await sql`
      CREATE OR REPLACE FUNCTION insert_permiso_auto_categoria(
        p_clave TEXT,
        p_descripcion TEXT
      ) RETURNS UUID AS $$
      DECLARE
        v_categoria TEXT;
        v_id UUID;
      BEGIN
        -- Determinar categoría automáticamente
        v_categoria := 
          CASE 
            WHEN p_clave LIKE 'turnos.%' THEN 'Turnos'
            WHEN p_clave LIKE 'payroll.%' THEN 'Payroll'
            WHEN p_clave LIKE 'maestros.%' THEN 'Maestros'
            WHEN p_clave LIKE 'rbac.%' THEN 'RBAC'
            WHEN p_clave LIKE 'usuarios.%' THEN 'Usuarios'
            WHEN p_clave LIKE 'config.%' THEN 'Configuración'
            WHEN p_clave LIKE 'documentos.%' THEN 'Documentos'
            ELSE 'Otros'
          END;
        
        -- Insertar permiso
        INSERT INTO permisos (clave, descripcion, categoria)
        VALUES (p_clave, p_descripcion, v_categoria)
        RETURNING id INTO v_id;
        
        RETURN v_id;
      END;
      $$ LANGUAGE plpgsql
    `;
    console.log('✅ Función helper creada');

    // 5. Verificar resultados
    console.log('📋 Paso 5: Verificando resultados...');
    const categorias = await sql`
      SELECT categoria, COUNT(*) as total
      FROM permisos 
      WHERE categoria IS NOT NULL
      GROUP BY categoria
      ORDER BY categoria
    `;

    console.log('\n📊 Categorías creadas:');
    categorias.rows.forEach((cat: any) => {
      console.log(`   - ${cat.categoria}: ${cat.total} permisos`);
    });

    // 6. Contar permisos en uso
    const permisosEnUso = await sql`
      SELECT COUNT(DISTINCT p.id) as total_en_uso
      FROM permisos p
      JOIN roles_permisos rp ON rp.permiso_id = p.id
    `;

    console.log(`\n📈 Permisos en uso: ${permisosEnUso.rows[0].total_en_uso}`);

    console.log('\n🎉 Migración completada exitosamente!');

  } catch (error) {
    console.error('❌ Error durante la migración:', error);
    throw error;
  }
}

migratePermisosCategorias().then(() => {
  console.log('\n🏁 Script completado');
  process.exit(0);
}).catch((error) => {
  console.error('💥 Error fatal:', error);
  process.exit(1);
});
