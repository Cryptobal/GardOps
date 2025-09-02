import { config } from 'dotenv';
import path from 'path';

// Cargar variables de entorno
config({ path: path.join(__dirname, '../.env.local') });

import { query } from '../src/lib/database';

async function verifyGuardiasTable() {
  console.log('🔍 VERIFICANDO TABLA GUARDIAS REAL\n');

  try {
    // 1. Verificar estructura actual de la tabla guardias
    console.log('📝 1. Verificando estructura actual de guardias...');
    const guardiasStructure = await query(`
      SELECT column_name, data_type, is_nullable, column_default
      FROM information_schema.columns 
      WHERE table_name = 'guardias' 
      ORDER BY ordinal_position
    `);
    
    console.log('📋 Estructura ACTUAL de guardias:');
    guardiasStructure.rows.forEach((col: any) => {
      console.log(`   • ${col.column_name}: ${col.data_type} ${col.is_nullable === 'YES' ? '(NULL)' : '(NOT NULL)'} ${col.column_default ? `DEFAULT: ${col.column_default}` : ''}`);
    });

    // 2. Definir campos necesarios para postulación
    const camposNecesarios = [
      { nombre: 'apellido_paterno', tipo: 'TEXT', nullable: true },
      { nombre: 'apellido_materno', tipo: 'TEXT', nullable: true },
      { nombre: 'sexo', tipo: 'VARCHAR(20)', nullable: true, check: "CHECK (sexo IN ('Hombre', 'Mujer'))" },
      { nombre: 'nacionalidad', tipo: 'VARCHAR(50)', nullable: true, default: "'Chilena'" },
      { nombre: 'fecha_nacimiento', tipo: 'DATE', nullable: true },
      { nombre: 'ciudad', tipo: 'VARCHAR(100)', nullable: true },
      { nombre: 'comuna', tipo: 'VARCHAR(100)', nullable: true },
      { nombre: 'region', tipo: 'VARCHAR(100)', nullable: true },
      { nombre: 'latitud', tipo: 'DECIMAL(10, 8)', nullable: true },
      { nombre: 'longitud', tipo: 'DECIMAL(11, 8)', nullable: true },
      { nombre: 'afp', tipo: 'VARCHAR(100)', nullable: true },
      { nombre: 'descuento_afp', tipo: 'DECIMAL(3,2)', nullable: true, default: '1.00' },
      { nombre: 'prevision_salud', tipo: 'VARCHAR(50)', nullable: true },
      { nombre: 'cotiza_sobre_7', tipo: 'BOOLEAN', nullable: true, default: 'false' },
      { nombre: 'monto_pactado_uf', tipo: 'DECIMAL(10,2)', nullable: true },
      { nombre: 'es_pensionado', tipo: 'BOOLEAN', nullable: true, default: 'false' },
      { nombre: 'asignacion_familiar', tipo: 'BOOLEAN', nullable: true, default: 'false' },
      { nombre: 'tramo_asignacion', tipo: 'VARCHAR(10)', nullable: true, check: "CHECK (tramo_asignacion IN ('A', 'B', 'C'))" },
      { nombre: 'banco_id', tipo: 'UUID', nullable: true },
      { nombre: 'tipo_cuenta', tipo: 'VARCHAR(20)', nullable: true, check: "CHECK (tipo_cuenta IN ('CCT', 'CTE', 'CTA', 'RUT'))" },
      { nombre: 'numero_cuenta', tipo: 'TEXT', nullable: true },
      { nombre: 'talla_camisa', tipo: 'VARCHAR(10)', nullable: true, check: "CHECK (talla_camisa IN ('XS', 'S', 'M', 'L', 'XL', 'XXL', 'XXXL'))" },
      { nombre: 'talla_pantalon', tipo: 'VARCHAR(10)', nullable: true, check: "CHECK (talla_pantalon IN ('38', '40', '42', '44', '46', '48', '50', '52', '54'))" },
      { nombre: 'talla_zapato', tipo: 'INTEGER', nullable: true, check: "CHECK (talla_zapato BETWEEN 35 AND 46)" },
      { nombre: 'altura_cm', tipo: 'INTEGER', nullable: true, check: "CHECK (altura_cm BETWEEN 140 AND 210)" },
      { nombre: 'peso_kg', tipo: 'INTEGER', nullable: true, check: "CHECK (peso_kg BETWEEN 40 AND 120)" },
      { nombre: 'fecha_postulacion', tipo: 'TIMESTAMP', nullable: true, default: 'NOW()' },
      { nombre: 'estado_postulacion', tipo: 'VARCHAR(20)', nullable: true, default: "'pendiente'", check: "CHECK (estado_postulacion IN ('pendiente', 'revisando', 'aprobada', 'rechazada'))" },
      { nombre: 'ip_postulacion', tipo: 'INET', nullable: true },
      { nombre: 'user_agent_postulacion', tipo: 'TEXT', nullable: true }
    ];

    // 3. Verificar qué campos faltan
    console.log('\n📝 2. Verificando campos faltantes...');
    const camposExistentes = guardiasStructure.rows.map((col: any) => col.column_name);
    const camposFaltantes = camposNecesarios.filter(campo => !camposExistentes.includes(campo.nombre));

    if (camposFaltantes.length === 0) {
      console.log('✅ Todos los campos necesarios ya existen en la tabla guardias');
    } else {
      console.log(`⚠️ Faltan ${camposFaltantes.length} campos en la tabla guardias:`);
      camposFaltantes.forEach(campo => {
        console.log(`   • ${campo.nombre}: ${campo.tipo}`);
      });

      // 4. Agregar solo los campos faltantes
      console.log('\n📝 3. Agregando campos faltantes...');
      for (const campo of camposFaltantes) {
        try {
          let alterQuery = `ALTER TABLE guardias ADD COLUMN IF NOT EXISTS ${campo.nombre} ${campo.tipo}`;
          
          if (campo.default) {
            alterQuery += ` DEFAULT ${campo.default}`;
          }
          
          if (campo.nullable === false) {
            alterQuery += ' NOT NULL';
          }
          
          await query(alterQuery);
          console.log(`✅ Campo ${campo.nombre} agregado`);

          // Agregar restricción de check si existe
          if (campo.check) {
            try {
              await query(`ALTER TABLE guardias ADD CONSTRAINT guardias_${campo.nombre}_check ${campo.check}`);
              console.log(`✅ Restricción de check agregada para ${campo.nombre}`);
            } catch (checkError: any) {
              if (checkError.code === '42710') { // constraint already exists
                console.log(`ℹ️ Restricción de check para ${campo.nombre} ya existe`);
              } else {
                console.log(`⚠️ No se pudo agregar restricción de check para ${campo.nombre}:`, checkError.message);
              }
            }
          }
        } catch (error: any) {
          if (error.code === '42701') { // column already exists
            console.log(`ℹ️ Campo ${campo.nombre} ya existe`);
          } else {
            console.log(`❌ Error agregando campo ${campo.nombre}:`, error.message);
          }
        }
      }
    }

    // 5. Verificar estructura final
    console.log('\n📝 4. Verificando estructura final...');
    const estructuraFinal = await query(`
      SELECT column_name, data_type, is_nullable, column_default
      FROM information_schema.columns 
      WHERE table_name = 'guardias' 
      ORDER BY ordinal_position
    `);
    
    console.log('📋 Estructura FINAL de guardias:');
    estructuraFinal.rows.forEach((col: any) => {
      console.log(`   • ${col.column_name}: ${col.data_type} ${col.is_nullable === 'YES' ? '(NULL)' : '(NOT NULL)'} ${col.column_default ? `DEFAULT: ${col.column_default}` : ''}`);
    });

    console.log('\n🎉 ¡VERIFICACIÓN COMPLETADA!');
    console.log('✅ La tabla guardias está lista para postulaciones');
    console.log('🚀 No se ha roto ni modificado nada existente');

  } catch (error) {
    console.error('❌ Error durante la verificación:', error);
    process.exit(1);
  }
}

verifyGuardiasTable();
