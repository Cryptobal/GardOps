import { config } from 'dotenv';
import path from 'path';

// Cargar variables de entorno
config({ path: path.join(__dirname, '../.env.local') });

import { query } from '../src/lib/database';

async function createPinFunction() {
  console.log('🚀 Creando función para generar PINs únicos...\n');

  try {
    // Crear función para generar PIN único
    const createFunctionSQL = `
      CREATE OR REPLACE FUNCTION generar_pin_unico() RETURNS VARCHAR(4) AS $$
      DECLARE
          nuevo_pin VARCHAR(4);
          pin_existe BOOLEAN;
      BEGIN
          LOOP
              -- Generar PIN de 4 dígitos aleatorio
              nuevo_pin := LPAD(FLOOR(RANDOM() * 10000)::TEXT, 4, '0');
              
              -- Verificar si el PIN ya existe
              SELECT EXISTS(SELECT 1 FROM guardias WHERE pin = nuevo_pin) INTO pin_existe;
              
              -- Si no existe, salir del bucle
              IF NOT pin_existe THEN
                  EXIT;
              END IF;
          END LOOP;
          
          RETURN nuevo_pin;
      END;
      $$ LANGUAGE plpgsql;
    `;

    console.log('⚡ Creando función generar_pin_unico...');
    await query(createFunctionSQL);
    console.log('✅ Función crear_pin_unico creada exitosamente\n');

    // Crear función para asignar PIN automáticamente
    const createTriggerFunctionSQL = `
      CREATE OR REPLACE FUNCTION asignar_pin_automatico() RETURNS TRIGGER AS $$
      BEGIN
          -- Solo asignar PIN si no se proporcionó uno
          IF NEW.pin IS NULL OR NEW.pin = '' THEN
              NEW.pin := generar_pin_unico();
          END IF;
          
          RETURN NEW;
      END;
      $$ LANGUAGE plpgsql;
    `;

    console.log('⚡ Creando función asignar_pin_automatico...');
    await query(createTriggerFunctionSQL);
    console.log('✅ Función asignar_pin_automatico creada exitosamente\n');

    // Crear el trigger
    const createTriggerSQL = `
      DROP TRIGGER IF EXISTS trigger_asignar_pin_guardias ON guardias;
      CREATE TRIGGER trigger_asignar_pin_guardias
          BEFORE INSERT ON guardias
          FOR EACH ROW
          EXECUTE FUNCTION asignar_pin_automatico();
    `;

    console.log('⚡ Creando trigger para asignar PIN automáticamente...');
    await query(createTriggerSQL);
    console.log('✅ Trigger creado exitosamente\n');

    // Probar la función
    console.log('🧪 Probando función de generación de PIN...');
    const testResult = await query('SELECT generar_pin_unico() as pin_generado');
    console.log(`✅ PIN generado de prueba: ${testResult.rows[0].pin_generado}\n`);

    console.log('✅ Todas las funciones y triggers creados exitosamente!');
    
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

createPinFunction();
