#!/usr/bin/env tsx

import * as dotenv from 'dotenv';
import { query } from '../src/lib/database';

// Cargar variables de entorno
dotenv.config({ path: '.env.local' });

// RUTs específicos a verificar
const rutsEspecificos = [
  '12833245-6',
  '21381703-5', 
  '9178825-K',
  '13211292-4',
  '18563612-7'
];

async function verificarGuardiasEspecificos() {
  console.log('🔍 Verificando si los guardias específicos ya existen...\n');

  try {
    for (const rut of rutsEspecificos) {
      const result = await query(`
        SELECT 
          id,
          rut,
          nombre,
          apellido_paterno,
          apellido_materno,
          email,
          telefono,
          direccion,
          comuna,
          ciudad,
          activo,
          latitud,
          longitud
        FROM guardias 
        WHERE rut = $1
      `, [rut]);

      if (result.rows.length > 0) {
        const guardia = result.rows[0];
        console.log(`✅ ${rut} - ${guardia.nombre} ${guardia.apellido_paterno} ${guardia.apellido_materno}`);
        console.log(`   Email: ${guardia.email || 'Vacío'}`);
        console.log(`   Teléfono: ${guardia.telefono || 'Vacío'}`);
        console.log(`   Dirección: ${guardia.direccion || 'Vacía'}`);
        console.log(`   Activo: ${guardia.activo}`);
        console.log(`   Coordenadas: ${guardia.latitud ? 'Sí' : 'No'}`);
        console.log(`   ID: ${guardia.id}`);
        console.log('');
      } else {
        console.log(`❌ ${rut} - NO EXISTE en la base de datos`);
        console.log('');
      }
    }

    // Verificar emails duplicados
    console.log('🔍 Verificando emails duplicados...\n');
    
    const emailsResult = await query(`
      SELECT email, COUNT(*) as cantidad
      FROM guardias 
      WHERE email IS NOT NULL AND email != ''
      GROUP BY email 
      HAVING COUNT(*) > 1
      ORDER BY cantidad DESC
    `);

    if (emailsResult.rows.length > 0) {
      console.log('⚠️  Emails duplicados encontrados:');
      emailsResult.rows.forEach((row: any) => {
        console.log(`   ${row.email}: ${row.cantidad} veces`);
      });
    } else {
      console.log('✅ No hay emails duplicados');
    }

    // Verificar emails vacíos
    const emailsVaciosResult = await query(`
      SELECT COUNT(*) as cantidad
      FROM guardias 
      WHERE email IS NULL OR email = ''
    `);
    
    console.log(`\n📊 Emails vacíos: ${emailsVaciosResult.rows[0].cantidad}`);

  } catch (error) {
    console.error('❌ Error al verificar guardias:', error);
  }
}

// Ejecutar el script
if (require.main === module) {
  verificarGuardiasEspecificos()
    .then(() => {
      console.log('🎉 Verificación completada');
      process.exit(0);
    })
    .catch((error) => {
      console.error('💥 Error en la verificación:', error);
      process.exit(1);
    });
}

export { verificarGuardiasEspecificos }; 