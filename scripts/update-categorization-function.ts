import { config } from 'dotenv';
import * as path from 'path';

// Cargar variables de entorno
config({ path: path.join(__dirname, '../.env.local') });

import { sql } from '@vercel/postgres';

async function updateCategorizationFunction() {
  try {
    console.log('🚀 Actualizando función de categorización automática...\n');

    // Actualizar la función con todas las categorías
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
            WHEN p_clave LIKE 'clientes.%' THEN 'Clientes'
            WHEN p_clave LIKE 'instalaciones.%' THEN 'Instalaciones'
            WHEN p_clave LIKE 'guardias.%' THEN 'Guardias'
            WHEN p_clave LIKE 'pauta-diaria.%' THEN 'Pauta Diaria'
            WHEN p_clave LIKE 'pauta-mensual.%' THEN 'Pauta Mensual'
            WHEN p_clave LIKE 'reportes.%' THEN 'Reportes'
            WHEN p_clave LIKE 'auditoria.%' THEN 'Auditoría'
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

    console.log('✅ Función de categorización actualizada');

    // Recategorizar permisos existentes que estén en "Otros"
    console.log('\n📝 Recategorizando permisos existentes...');
    
    const updateResult = await sql`
      UPDATE permisos SET categoria = 
        CASE 
          WHEN clave LIKE 'turnos.%' THEN 'Turnos'
          WHEN clave LIKE 'payroll.%' THEN 'Payroll'
          WHEN clave LIKE 'maestros.%' THEN 'Maestros'
          WHEN clave LIKE 'rbac.%' THEN 'RBAC'
          WHEN clave LIKE 'usuarios.%' THEN 'Usuarios'
          WHEN clave LIKE 'config.%' THEN 'Configuración'
          WHEN clave LIKE 'documentos.%' THEN 'Documentos'
          WHEN clave LIKE 'clientes.%' THEN 'Clientes'
          WHEN clave LIKE 'instalaciones.%' THEN 'Instalaciones'
          WHEN clave LIKE 'guardias.%' THEN 'Guardias'
          WHEN clave LIKE 'pauta-diaria.%' THEN 'Pauta Diaria'
          WHEN clave LIKE 'pauta-mensual.%' THEN 'Pauta Mensual'
          WHEN clave LIKE 'reportes.%' THEN 'Reportes'
          WHEN clave LIKE 'auditoria.%' THEN 'Auditoría'
          ELSE categoria
        END
      WHERE categoria = 'Otros' OR categoria IS NULL
    `;

    console.log(`✅ ${updateResult.rowCount} permisos recategorizados`);

    // Mostrar estadísticas finales
    const categorias = await sql`
      SELECT categoria, COUNT(*) as total
      FROM permisos 
      WHERE categoria IS NOT NULL
      GROUP BY categoria
      ORDER BY categoria
    `;

    console.log('\n📂 Categorías finales:');
    categorias.rows.forEach((cat: any) => {
      console.log(`   - ${cat.categoria}: ${cat.total} permisos`);
    });

    // Mostrar permisos por módulo
    console.log('\n📋 Resumen por módulo:');
    const modulos = [
      { nombre: 'Clientes', prefijo: 'clientes.' },
      { nombre: 'Instalaciones', prefijo: 'instalaciones.' },
      { nombre: 'Guardias', prefijo: 'guardias.' },
      { nombre: 'Pauta Diaria', prefijo: 'pauta-diaria.' },
      { nombre: 'Pauta Mensual', prefijo: 'pauta-mensual.' },
      { nombre: 'Documentos', prefijo: 'documentos.' },
      { nombre: 'Reportes', prefijo: 'reportes.' },
      { nombre: 'Auditoría', prefijo: 'auditoria.' }
    ];

    for (const modulo of modulos) {
      const count = await sql`
        SELECT COUNT(*) as total FROM permisos WHERE clave LIKE ${modulo.prefijo + '%'}
      `;
      console.log(`   - ${modulo.nombre}: ${count.rows[0].total} permisos`);
    }

    console.log('\n🎉 Función de categorización actualizada exitosamente!');

  } catch (error) {
    console.error('❌ Error durante la actualización:', error);
    throw error;
  }
}

updateCategorizationFunction().then(() => {
  console.log('\n🏁 Script completado');
  process.exit(0);
}).catch((error) => {
  console.error('💥 Error fatal:', error);
  process.exit(1);
});
