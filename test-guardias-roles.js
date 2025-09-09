const { Pool } = require('pg');
require('dotenv').config({ path: '.env.local' });

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

async function testGuardiasRoles() {
  console.log('🔍 TEST: Verificando guardias con roles asignados\n');
  
  try {
    // 1. Verificar estructura de la tabla
    console.log('1️⃣ Verificando estructura de as_turnos_puestos_operativos...');
    const estructura = await pool.query(`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns
      WHERE table_name = 'as_turnos_puestos_operativos'
      ORDER BY ordinal_position
    `);
    
    console.log('Columnas encontradas:');
    estructura.rows.forEach(col => {
      console.log(`  - ${col.column_name}: ${col.data_type} (${col.is_nullable === 'YES' ? 'nullable' : 'not null'})`);
    });

    // 2. Verificar datos en la tabla
    console.log('\n2️⃣ Verificando datos en as_turnos_puestos_operativos...');
    const puestos = await pool.query(`
      SELECT 
        po.id,
        po.instalacion_id,
        po.rol_id,
        po.guardia_id,
        po.nombre_puesto,
        po.es_ppc,
        po.activo,
        rs.nombre as rol_nombre,
        g.nombre || ' ' || g.apellido_paterno as guardia_nombre,
        i.nombre as instalacion_nombre
      FROM as_turnos_puestos_operativos po
      LEFT JOIN as_turnos_roles_servicio rs ON po.rol_id = rs.id
      LEFT JOIN guardias g ON po.guardia_id = g.id
      LEFT JOIN instalaciones i ON po.instalacion_id = i.id
      WHERE po.activo = true
      ORDER BY po.instalacion_id, po.nombre_puesto
      LIMIT 10
    `);
    
    console.log(`Total puestos operativos: ${puestos.rows.length}`);
    if (puestos.rows.length > 0) {
      console.log('\nPuestos encontrados:');
      puestos.rows.forEach((puesto, index) => {
        console.log(`  ${index + 1}. ${puesto.instalacion_nombre} - ${puesto.rol_nombre || 'Sin rol'} - ${puesto.guardia_nombre || 'Sin guardia'}`);
      });
    }

    // 3. Probar la consulta del API de guardias
    console.log('\n3️⃣ Probando consulta del API de guardias...');
    const guardias = await pool.query(`
      SELECT 
        g.id::text, 
        trim(concat_ws(' ', g.nombre, g.apellido_paterno, g.apellido_materno)) AS nombre,
        g.rut,
        CASE WHEN g.activo THEN 'activo' ELSE 'inactivo' END as estado,
        g.tipo_guardia,
        g.email,
        g.telefono,
        g.direccion,
        g.fecha_os10,
        g.created_at,
        g.updated_at,
        -- Información de instalación asignada
        po.instalacion_id,
        i.nombre as instalacion_asignada,
        -- Información del rol asignado
        rs.nombre as rol_actual
      FROM public.guardias g
      LEFT JOIN public.as_turnos_puestos_operativos po ON po.guardia_id = g.id AND po.activo = true
      LEFT JOIN public.instalaciones i ON i.id = po.instalacion_id
      LEFT JOIN public.as_turnos_roles_servicio rs ON rs.id = po.rol_id
      WHERE g.activo = true
      ORDER BY g.nombre
      LIMIT 5
    `);
    
    console.log(`Total guardias con datos: ${guardias.rows.length}`);
    if (guardias.rows.length > 0) {
      console.log('\nGuardias encontrados:');
      guardias.rows.forEach((guardia, index) => {
        console.log(`  ${index + 1}. ${guardia.nombre} - ${guardia.instalacion_asignada || 'Sin asignar'} - ${guardia.rol_actual || 'Sin rol'}`);
      });
    }

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await pool.end();
  }
}

testGuardiasRoles();
