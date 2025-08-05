import { Client } from 'pg';

async function debugPautaDia5() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
  });

  try {
    await client.connect();
    console.log('🔗 Conectado a la base de datos');

    // Verificar todos los registros para el día 5 de agosto de 2025
    const registros = await client.query(`
      SELECT 
        pm.id,
        pm.puesto_id,
        pm.guardia_id,
        pm.estado,
        pm.observaciones,
        po.nombre_puesto,
        po.es_ppc,
        i.nombre as instalacion_nombre,
        g.nombre as guardia_nombre,
        g.apellido_paterno as guardia_apellido
      FROM as_turnos_pauta_mensual pm
      INNER JOIN as_turnos_puestos_operativos po ON pm.puesto_id = po.id
      INNER JOIN instalaciones i ON po.instalacion_id = i.id
      LEFT JOIN guardias g ON pm.guardia_id = g.id
      WHERE pm.anio = 2025 AND pm.mes = 8 AND pm.dia = 5
      ORDER BY po.nombre_puesto
    `);

    console.log(`📊 Registros encontrados para 5/8/2025: ${registros.rows.length}`);
    
    registros.rows.forEach((row, index) => {
      console.log(`\n${index + 1}. Puesto: ${row.nombre_puesto} (${row.es_ppc ? 'PPC' : 'Guardia'})`);
      console.log(`   Estado: ${row.estado}`);
      console.log(`   Guardia: ${row.guardia_nombre} ${row.guardia_apellido || ''}`);
      console.log(`   Observaciones: ${row.observaciones || 'N/A'}`);
      console.log(`   Instalación: ${row.instalacion_nombre}`);
    });

    // Verificar también los días 6, 7 y 8
    for (let dia = 6; dia <= 8; dia++) {
      const registrosDia = await client.query(`
        SELECT 
          pm.id,
          pm.puesto_id,
          pm.estado,
          po.nombre_puesto,
          po.es_ppc,
          i.nombre as instalacion_nombre
        FROM as_turnos_pauta_mensual pm
        INNER JOIN as_turnos_puestos_operativos po ON pm.puesto_id = po.id
        INNER JOIN instalaciones i ON po.instalacion_id = i.id
        WHERE pm.anio = 2025 AND pm.mes = 8 AND pm.dia = $1
          AND pm.estado IN ('trabajado', 'reemplazo', 'sin_cobertura')
        ORDER BY po.nombre_puesto
      `, [dia]);

      console.log(`\n📅 Día ${dia}/8/2025 - Puestos con turno: ${registrosDia.rows.length}`);
      registrosDia.rows.forEach((row, index) => {
        console.log(`   ${index + 1}. ${row.nombre_puesto} (${row.es_ppc ? 'PPC' : 'Guardia'}) - ${row.estado}`);
      });
    }

  } catch (error) {
    console.error('❌ Error ejecutando el debug:', error);
  } finally {
    await client.end();
    console.log('🔌 Conexión cerrada');
  }
}

// Cargar variables de entorno
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

debugPautaDia5(); 