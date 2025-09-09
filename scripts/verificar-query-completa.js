const { Pool } = require('pg');
require('dotenv').config({ path: '.env.local' });

async function verificarQueryCompleta() {
  console.log('🔍 VERIFICANDO QUERY DEL ENDPOINT COMPLETA');
  console.log('==========================================\n');

  const pool = new Pool({
    connectionString: process.env.DATABASE_URL
  });

  try {
    const instalacionId = '0e8ba906-e64b-4d4d-a104-ba29f21f48a9';
    
    console.log('🔍 Instalación:', instalacionId);

    // Usar exactamente la misma consulta que el endpoint /completa
    const puestosResult = await pool.query(`
      SELECT 
        po.id,
        po.instalacion_id,
        po.rol_id,
        po.guardia_id,
        po.nombre_puesto,
        po.es_ppc,
        po.activo,
        po.creado_en,
        po.tipo_puesto_id,
        COALESCE(rs.nombre, 'Sin rol asignado') as rol_nombre,
        COALESCE(rs.dias_trabajo, 0) as dias_trabajo,
        COALESCE(rs.dias_descanso, 0) as dias_descanso,
        COALESCE(rs.horas_turno, 0) as horas_turno,
        COALESCE(rs.hora_inicio, '00:00') as hora_inicio,
        COALESCE(rs.hora_termino, '00:00') as hora_termino,
        COALESCE(rs.estado, 'Inactivo') as rol_estado,
        COALESCE(g.nombre || ' ' || g.apellido_paterno, 'Sin guardia') as guardia_nombre,
        COALESCE(tp.nombre, 'Sin tipo') as tipo_nombre,
        COALESCE(tp.emoji, '🏢') as tipo_emoji,
        COALESCE(tp.color, '#666666') as tipo_color
      FROM as_turnos_puestos_operativos po
      LEFT JOIN as_turnos_roles_servicio rs ON po.rol_id = rs.id
      LEFT JOIN guardias g ON po.guardia_id = g.id
      LEFT JOIN cat_tipos_puesto tp ON po.tipo_puesto_id = tp.id
      WHERE po.instalacion_id = $1
        AND (po.activo = true OR po.activo IS NULL)
      ORDER BY po.rol_id, po.nombre_puesto
    `, [instalacionId]);
    
    console.log(`📊 Puestos encontrados con query del endpoint /completa: ${puestosResult.rows.length}\n`);
    
    puestosResult.rows.forEach((row, index) => {
      console.log(`${index + 1}. ID: ${row.id}`);
      console.log(`   Nombre: ${row.nombre_puesto}`);
      console.log(`   Instalación: ${row.instalacion_id}`);
      console.log(`   Rol: ${row.rol_nombre} (${row.rol_id})`);
      console.log(`   PPC: ${row.es_ppc}`);
      console.log(`   Activo: ${row.activo}`);
      console.log(`   Guardia: ${row.guardia_id ? 'Sí' : 'No'}`);
      console.log('');
    });

    // Verificar si hay algún problema con la tabla
    console.log('\n🔍 VERIFICANDO ESTRUCTURA DE LA TABLA:');
    const tableInfo = await pool.query(`
      SELECT 
        table_name,
        column_name,
        data_type
      FROM information_schema.columns 
      WHERE table_name = 'as_turnos_puestos_operativos'
      ORDER BY ordinal_position
    `);
    
    console.log('📊 Columnas de la tabla as_turnos_puestos_operativos:');
    tableInfo.rows.forEach((row, index) => {
      console.log(`  ${index + 1}. ${row.column_name} (${row.data_type})`);
    });

    // Verificar si hay datos en la tabla sin filtros
    console.log('\n🔍 VERIFICANDO DATOS SIN FILTROS:');
    const todosDatos = await pool.query(`
      SELECT COUNT(*) as total FROM as_turnos_puestos_operativos
    `);
    
    console.log(`📊 Total de registros en la tabla: ${todosDatos.rows[0].total}`);

    if (parseInt(todosDatos.rows[0].total) > 0) {
      const muestra = await pool.query(`
        SELECT id, instalacion_id, nombre_puesto, activo 
        FROM as_turnos_puestos_operativos 
        LIMIT 5
      `);
      
      console.log('📊 Muestra de datos:');
      muestra.rows.forEach((row, index) => {
        console.log(`  ${index + 1}. ID: ${row.id}, Instalación: ${row.instalacion_id}, Nombre: ${row.nombre_puesto}, Activo: ${row.activo}`);
      });
    }

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await pool.end();
  }
}

verificarQueryCompleta().then(() => {
  console.log('\n✅ Verificación completada');
  process.exit(0);
}).catch((error) => {
  console.error('❌ Error:', error);
  process.exit(1);
});
