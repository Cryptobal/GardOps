import { query } from '../src/lib/database';
import { config } from 'dotenv';
import * as path from 'path';

// Cargar variables de entorno
config({ path: path.join(__dirname, '../.env.local') });

async function agregarBancosFaltantes() {
  console.log('🚀 Agregando bancos faltantes a la base de datos...\n');

  try {
    // Bancos que faltan según el CSV
    const bancosFaltantes = [
      {
        nombre: 'Mach',
        codigo: 'MACH',
        descripcion: 'Banco digital Mach'
      },
      {
        nombre: 'MercadoPago',
        codigo: 'MP',
        descripcion: 'Plataforma de pagos MercadoPago'
      },
      {
        nombre: 'Coopeuch',
        codigo: 'COOP',
        descripcion: 'Cooperativa de Ahorro y Crédito Coopeuch'
      },
      {
        nombre: 'Tenpo Prepago S.A.',
        codigo: 'TENPO',
        descripcion: 'Banco digital Tenpo'
      }
    ];

    console.log('📋 Verificando bancos existentes...');
    
    for (const banco of bancosFaltantes) {
      try {
        // Verificar si el banco ya existe
        const existeResult = await query(`
          SELECT id, nombre FROM bancos 
          WHERE LOWER(nombre) = LOWER($1)
        `, [banco.nombre]);

        if (existeResult.rows.length > 0) {
          console.log(`✅ ${banco.nombre} ya existe en la base de datos`);
          continue;
        }

        // Insertar nuevo banco
        const insertResult = await query(`
          INSERT INTO bancos (nombre, codigo)
          VALUES ($1, $2)
          RETURNING id, nombre
        `, [banco.nombre, banco.codigo]);

        const nuevoBanco = insertResult.rows[0];
        console.log(`✅ Agregado: ${nuevoBanco.nombre} (ID: ${nuevoBanco.id})`);

      } catch (error) {
        console.error(`❌ Error agregando ${banco.nombre}:`, error);
      }
    }

    // Mostrar todos los bancos
    console.log('\n📋 Lista completa de bancos:');
    const todosBancos = await query(`
      SELECT id, nombre, codigo
      FROM bancos
      ORDER BY nombre
    `);

    todosBancos.rows.forEach((banco: any) => {
      console.log(`   • ${banco.nombre} (${banco.codigo})`);
    });

    console.log(`\n✅ Total de bancos: ${todosBancos.rows.length}`);

  } catch (error) {
    console.error('\n❌ Error:', error);
    process.exit(1);
  }
}

// Ejecutar script
agregarBancosFaltantes()
  .then(() => {
    console.log('\n🎉 Script completado exitosamente');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n💥 Error fatal:', error);
    process.exit(1);
  }); 