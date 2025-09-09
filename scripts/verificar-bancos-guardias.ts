import { config } from 'dotenv';
import * as path from 'path';

// Cargar variables de entorno
config({ path: path.join(__dirname, '../.env.local') });

// Importar después de cargar las variables de entorno
import { query } from '../src/lib/database';

async function verificarBancosGuardias() {
  console.log('🔍 Verificando estructura de tabla guardias y bancos...\n');

  try {
    // 1. Verificar estructura de tabla guardias
    console.log('📋 Estructura de tabla guardias:');
    const estructuraGuardias = await query(`
      SELECT column_name, data_type, is_nullable, column_default
      FROM information_schema.columns 
      WHERE table_name = 'guardias' 
      AND column_name IN ('banco_id', 'tipo_cuenta', 'numero_cuenta')
      ORDER BY column_name
    `);

    if (estructuraGuardias.rows.length === 0) {
      console.log('❌ No se encontraron campos bancarios en la tabla guardias');
      console.log('   Los campos banco_id, tipo_cuenta, numero_cuenta no existen');
    } else {
      estructuraGuardias.rows.forEach((col: any) => {
        console.log(`   • ${col.column_name}: ${col.data_type} (nullable: ${col.is_nullable})`);
      });
    }

    // 2. Verificar tabla bancos
    console.log('\n📋 Verificando tabla bancos:');
    const bancosExiste = await query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables
        WHERE table_name = 'bancos'
      );
    `);

    if (!bancosExiste.rows[0].exists) {
      console.log('❌ La tabla bancos no existe');
      return;
    }

    const bancos = await query(`
      SELECT id, nombre, codigo
      FROM bancos
      ORDER BY nombre
      LIMIT 10
    `);

    console.log(`✅ Tabla bancos existe con ${bancos.rows.length} bancos:`);
    bancos.rows.forEach((banco: any) => {
      console.log(`   • ${banco.nombre} (${banco.codigo}) - ID: ${banco.id}`);
    });

    // 3. Verificar datos bancarios en guardias
    console.log('\n📊 Datos bancarios en guardias:');
    const datosBancarios = await query(`
      SELECT 
        COUNT(*) as total_guardias,
        COUNT(banco_id) as con_banco_id,
        COUNT(tipo_cuenta) as con_tipo_cuenta,
        COUNT(numero_cuenta) as con_numero_cuenta,
        COUNT(CASE WHEN banco_id IS NOT NULL AND tipo_cuenta IS NOT NULL AND numero_cuenta IS NOT NULL THEN 1 END) as completos
      FROM guardias
    `);

    const stats = datosBancarios.rows[0];
    console.log(`   • Total guardias: ${stats.total_guardias}`);
    console.log(`   • Con banco_id: ${stats.con_banco_id} (${((stats.con_banco_id / stats.total_guardias) * 100).toFixed(1)}%)`);
    console.log(`   • Con tipo_cuenta: ${stats.con_tipo_cuenta} (${((stats.con_tipo_cuenta / stats.total_guardias) * 100).toFixed(1)}%)`);
    console.log(`   • Con numero_cuenta: ${stats.con_numero_cuenta} (${((stats.con_numero_cuenta / stats.total_guardias) * 100).toFixed(1)}%)`);
    console.log(`   • Datos bancarios completos: ${stats.completos} (${((stats.completos / stats.total_guardias) * 100).toFixed(1)}%)`);

    // 4. Mostrar algunos ejemplos de guardias con datos bancarios
    console.log('\n📋 Ejemplos de guardias con datos bancarios:');
    const ejemplos = await query(`
      SELECT 
        g.id,
        g.nombre,
        g.apellido_paterno,
        g.banco_id,
        g.tipo_cuenta,
        g.numero_cuenta,
        b.nombre as banco_nombre
      FROM guardias g
      LEFT JOIN bancos b ON g.banco_id = b.id
      WHERE g.banco_id IS NOT NULL
      LIMIT 5
    `);

    if (ejemplos.rows.length === 0) {
      console.log('   ❌ No hay guardias con datos bancarios');
    } else {
      ejemplos.rows.forEach((guardia: any) => {
        console.log(`   • ${guardia.nombre} ${guardia.apellido_paterno}:`);
        console.log(`     - Banco: ${guardia.banco_nombre || 'No encontrado'} (${guardia.banco_id})`);
        console.log(`     - Tipo: ${guardia.tipo_cuenta || 'N/A'}`);
        console.log(`     - Número: ${guardia.numero_cuenta || 'N/A'}`);
      });
    }

    // 5. Verificar si hay guardias recientes sin datos bancarios
    console.log('\n📋 Guardias recientes sin datos bancarios:');
    const recientesSinBanco = await query(`
      SELECT 
        id,
        nombre,
        apellido_paterno,
        created_at
      FROM guardias
      WHERE banco_id IS NULL
      ORDER BY created_at DESC
      LIMIT 5
    `);

    if (recientesSinBanco.rows.length > 0) {
      console.log('   Guardias recientes sin banco_id:');
      recientesSinBanco.rows.forEach((guardia: any) => {
        console.log(`   • ${guardia.nombre} ${guardia.apellido_paterno} (creado: ${guardia.created_at})`);
      });
    } else {
      console.log('   ✅ Todos los guardias recientes tienen banco_id');
    }

  } catch (error) {
    console.error('❌ Error verificando datos:', error);
  }
}

// Ejecutar verificación
verificarBancosGuardias()
  .then(() => {
    console.log('\n✅ Verificación completada');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Error en verificación:', error);
    process.exit(1);
  });
