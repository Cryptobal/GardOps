import { Client } from 'pg';

async function verificarDesfasePautaDiaria() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
  });

  try {
    await client.connect();
    console.log('🔗 Conectado a la base de datos');

    // Verificar los días 5, 6, 7, 8 y 9 de agosto
    for (let dia = 5; dia <= 9; dia++) {
      const puestosTrabajado = await client.query(`
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

      console.log(`\n📅 Día ${dia}/8/2025 - Puestos con turno: ${puestosTrabajado.rows.length}`);
      puestosTrabajado.rows.forEach((row, index) => {
        console.log(`   ${index + 1}. ${row.nombre_puesto} (${row.es_ppc ? 'PPC' : 'Guardia'}) - ${row.estado}`);
      });
    }

    console.log('\n🔍 Análisis del desfase:');
    console.log('Si el día 5 muestra 3 puestos pero debería mostrar 1,');
    console.log('y los días 6,7,8,9 muestran 1 puesto correctamente,');
    console.log('entonces la pauta diaria está mostrando datos de un día antes.');

  } catch (error) {
    console.error('❌ Error ejecutando la verificación:', error);
  } finally {
    await client.end();
    console.log('🔌 Conexión cerrada');
  }
}

// Cargar variables de entorno
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

verificarDesfasePautaDiaria(); 