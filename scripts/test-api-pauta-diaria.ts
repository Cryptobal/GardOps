import { Client } from 'pg';

async function testApiPautaDiaria() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
  });

  try {
    await client.connect();
    console.log('🔗 Conectado a la base de datos');

    // Ejecutar la misma consulta que usa la API
    const pautaDiaria = await client.query(`
      SELECT 
        pm.id as puesto_id,
        po.nombre_puesto,
        po.es_ppc,
        
        -- Datos del guardia original asignado al puesto
        pm.guardia_id as guardia_original_id,
        g.nombre as guardia_original_nombre,
        g.apellido_paterno as guardia_original_apellido_paterno,
        g.apellido_materno as guardia_original_apellido_materno,
        
        -- Datos de la instalación
        i.id as instalacion_id,
        i.nombre as instalacion_nombre,
        
        -- Estado y observaciones
        pm.estado,
        pm.observaciones,
        
        -- Datos del reemplazo/cobertura
        te.guardia_id as reemplazo_guardia_id,
        rg.nombre as reemplazo_nombre,
        rg.apellido_paterno as reemplazo_apellido_paterno,
        rg.apellido_materno as reemplazo_apellido_materno
        
      FROM as_turnos_pauta_mensual pm
      INNER JOIN as_turnos_puestos_operativos po ON pm.puesto_id = po.id
      INNER JOIN instalaciones i ON po.instalacion_id = i.id
      LEFT JOIN guardias g ON pm.guardia_id = g.id
      LEFT JOIN turnos_extras te ON pm.id = te.pauta_id
      LEFT JOIN guardias rg ON te.guardia_id = rg.id
      
      WHERE pm.anio = 2025 AND pm.mes = 8 AND pm.dia = 5
        AND pm.estado IN ('trabajado', 'reemplazo', 'sin_cobertura')
        AND po.activo = true
      
      ORDER BY i.nombre, po.nombre_puesto
    `);

    console.log(`📊 Resultado de la consulta para 5/8/2025: ${pautaDiaria.rows.length} registros`);
    
    pautaDiaria.rows.forEach((row, index) => {
      console.log(`\n${index + 1}. Puesto: ${row.nombre_puesto} (${row.es_ppc ? 'PPC' : 'Guardia'})`);
      console.log(`   Estado: ${row.estado}`);
      console.log(`   Guardia original: ${row.guardia_original_nombre} ${row.guardia_original_apellido_paterno || ''}`);
      console.log(`   Reemplazo: ${row.reemplazo_nombre} ${row.reemplazo_apellido_paterno || ''}`);
      console.log(`   Instalación: ${row.instalacion_nombre}`);
    });

    // También verificar qué pasa si quitamos el filtro de estado
    const todosLosRegistros = await client.query(`
      SELECT 
        pm.id as puesto_id,
        po.nombre_puesto,
        po.es_ppc,
        pm.estado,
        i.nombre as instalacion_nombre
      FROM as_turnos_pauta_mensual pm
      INNER JOIN as_turnos_puestos_operativos po ON pm.puesto_id = po.id
      INNER JOIN instalaciones i ON po.instalacion_id = i.id
      WHERE pm.anio = 2025 AND pm.mes = 8 AND pm.dia = 5
        AND po.activo = true
      ORDER BY po.nombre_puesto
    `);

    console.log(`\n📊 Todos los registros para 5/8/2025 (sin filtro de estado): ${todosLosRegistros.rows.length}`);
    todosLosRegistros.rows.forEach((row, index) => {
      console.log(`   ${index + 1}. ${row.nombre_puesto} (${row.es_ppc ? 'PPC' : 'Guardia'}) - ${row.estado}`);
    });

  } catch (error) {
    console.error('❌ Error ejecutando la prueba:', error);
  } finally {
    await client.end();
    console.log('🔌 Conexión cerrada');
  }
}

// Cargar variables de entorno
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

testApiPautaDiaria(); 