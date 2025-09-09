import { query } from '../src/lib/database';
import * as fs from 'fs';
import * as path from 'path';
import { config } from 'dotenv';

// Cargar variables de entorno
config({ path: path.join(__dirname, '../.env.local') });

interface BancoData {
  id: string;
  nombre: string;
  codigo: string;
}

interface CSVRow {
  rut: string;
  banco: string;
  tipo_cuenta: string;
  numero_cuenta: string;
}

interface GuardiaData {
  id: string;
  rut: string;
  nombre: string;
  apellido_paterno: string;
  apellido_materno: string;
}

async function actualizarDatosBancarios() {
  console.log('🚀 Iniciando actualización de datos bancarios de guardias...\n');

  try {
    // 1. Cargar datos de bancos desde la base de datos
    console.log('📋 Cargando bancos desde la base de datos...');
    const bancosResult = await query(`
      SELECT id, nombre, codigo
      FROM bancos
      ORDER BY nombre
    `);
    
    const bancos: BancoData[] = bancosResult.rows;
    console.log(`✅ Se encontraron ${bancos.length} bancos en la base de datos`);

    // Crear mapeo de nombres de bancos a IDs
    const bancoMapping: { [key: string]: string } = {};
    
    // Mapeo directo de nombres
    bancos.forEach(banco => {
      bancoMapping[banco.nombre.toLowerCase()] = banco.id;
    });

    // Mapeo adicional para variaciones comunes
    const mapeoVariaciones: { [key: string]: string } = {
      'banco estado': '756a508e-948c-40d4-b675-ce4e1a16daf1', // Banco del Estado de Chile
      'banco chile': '9aaa69ff-8981-4534-b8cf-bb3888cfc3f1', // Banco de Chile
      'banco santander': 'dfc676af-0c8d-4475-a831-b313e513c21b', // Banco Santander Chile
      'banco bci': 'd8f390a2-2466-4bc8-9032-903a0e84e85b', // Banco de Crédito e Inversiones
      'banco falabella': 'eaf03a6a-c53a-43b5-8eda-80f0c44cef40', // Banco Falabella
      'banco ripley': '7b4d5794-241f-4267-aa43-9bae55e7b82f', // Banco Ripley
      'banco scotiabank': 'ae18bf67-9429-4f68-8463-d09356b08ef2', // Scotiabank Chile
      'scotiabank': 'ae18bf67-9429-4f68-8463-d09356b08ef2', // Scotiabank Chile
      'mach': 'bda92040-ac11-4e2c-b8c9-dd017f48be09', // Mach
      'mercadopago': '06ec2d0a-7a22-44b7-9131-ae4089a96543', // MercadoPago
      'coopeuch': '4870c49b-6be2-4f54-adb5-9783274bb467', // Coopeuch
      'tenpo prepago s.a': '36cb4f56-61ad-4d0a-9f27-fcd4643e23bd', // Tenpo Prepago S.A.
      'banco bci nova': 'd8f390a2-2466-4bc8-9032-903a0e84e85b', // Banco BCI Nova -> BCI
      'ninguno': '', // Sin banco
    };

    // Combinar mapeos
    Object.assign(bancoMapping, mapeoVariaciones);

    // 2. Leer archivo CSV
    console.log('📋 Leyendo archivo CSV...');
    const csvPath = path.join(__dirname, '../Datos cuentas y bancos.csv');
    
    if (!fs.existsSync(csvPath)) {
      throw new Error(`No se encontró el archivo: ${csvPath}`);
    }

    const csvContent = fs.readFileSync(csvPath, 'utf-8');
    const lines = csvContent.split('\n').filter(line => line.trim());
    
    // Parsear CSV (asumiendo formato: RUT;Banco;Tipo Cuenta;N° Cuenta)
    const csvData: CSVRow[] = [];
    
    for (let i = 1; i < lines.length; i++) { // Saltar header
      const line = lines[i].trim();
      if (!line || line === ';;;') continue;
      
      const parts = line.split(';');
      if (parts.length >= 4) {
        csvData.push({
          rut: parts[0].trim(),
          banco: parts[1].trim().toLowerCase(),
          tipo_cuenta: parts[2].trim(),
          numero_cuenta: parts[3].trim()
        });
      }
    }

    console.log(`✅ Se cargaron ${csvData.length} registros del CSV`);

    // 3. Obtener guardias de la base de datos
    console.log('📋 Obteniendo guardias de la base de datos...');
    const guardiasResult = await query(`
      SELECT id, rut, nombre, apellido_paterno, apellido_materno
      FROM guardias
      WHERE rut IS NOT NULL AND rut != ''
    `);
    
    const guardias: GuardiaData[] = guardiasResult.rows;
    console.log(`✅ Se encontraron ${guardias.length} guardias en la base de datos`);

    // 4. Crear mapeo de RUTs a guardias
    const guardiasPorRut: { [key: string]: GuardiaData } = {};
    guardias.forEach(guardia => {
      guardiasPorRut[guardia.rut] = guardia;
    });

    // 5. Procesar actualizaciones
    console.log('\n🔄 Procesando actualizaciones...');
    
    let actualizados = 0;
    let noEncontrados = 0;
    let bancosNoEncontrados = 0;
    let errores = 0;
    const erroresDetalle: string[] = [];

    for (const csvRow of csvData) {
      try {
        // Buscar guardia por RUT
        const guardia = guardiasPorRut[csvRow.rut];
        
        if (!guardia) {
          noEncontrados++;
          console.log(`⚠️  Guardia no encontrado: ${csvRow.rut}`);
          continue;
        }

        // Buscar banco
        const bancoId = bancoMapping[csvRow.banco];
        
        if (bancoId === null) {
          bancosNoEncontrados++;
          console.log(`⚠️  Banco no encontrado: ${csvRow.banco} (RUT: ${csvRow.rut})`);
          continue;
        }

        if (!bancoId) {
          bancosNoEncontrados++;
          console.log(`⚠️  Banco no mapeado: ${csvRow.banco} (RUT: ${csvRow.rut})`);
          continue;
        }

        // Normalizar tipo de cuenta
        let tipoCuenta = csvRow.tipo_cuenta.toLowerCase();
        if (tipoCuenta.includes('cuenta rut')) tipoCuenta = 'RUT';
        else if (tipoCuenta.includes('cuenta vista')) tipoCuenta = 'CTA';
        else if (tipoCuenta.includes('cuenta corriente')) tipoCuenta = 'CTE';
        else if (tipoCuenta.includes('cuenta de ahorro')) tipoCuenta = 'CTA';
        else if (tipoCuenta.includes('chequera electronica')) tipoCuenta = 'CTE';
        else tipoCuenta = 'CTE'; // Por defecto

        // Actualizar guardia
        await query(`
          UPDATE guardias 
          SET 
            banco = $1,
            tipo_cuenta = $2,
            numero_cuenta = $3,
            updated_at = CURRENT_TIMESTAMP
          WHERE id = $4
        `, [bancoId, tipoCuenta, csvRow.numero_cuenta, guardia.id]);

        actualizados++;
        console.log(`✅ Actualizado: ${guardia.nombre} ${guardia.apellido_paterno} (${csvRow.rut}) - ${csvRow.banco}`);

      } catch (error) {
        errores++;
        const errorMsg = `Error procesando RUT ${csvRow.rut}: ${error}`;
        erroresDetalle.push(errorMsg);
        console.error(`❌ ${errorMsg}`);
      }
    }

    // 6. Mostrar resumen
    console.log('\n📊 RESUMEN DE ACTUALIZACIÓN');
    console.log('========================');
    console.log(`✅ Guardias actualizados: ${actualizados}`);
    console.log(`⚠️  Guardias no encontrados: ${noEncontrados}`);
    console.log(`⚠️  Bancos no encontrados: ${bancosNoEncontrados}`);
    console.log(`❌ Errores: ${errores}`);

    if (erroresDetalle.length > 0) {
      console.log('\n❌ DETALLE DE ERRORES:');
      erroresDetalle.forEach(error => console.log(`   ${error}`));
    }

    // 7. Verificar resultados
    console.log('\n🔍 Verificando resultados...');
    const verificacionResult = await query(`
      SELECT 
        COUNT(*) as total_guardias,
        COUNT(banco) as con_banco,
        COUNT(tipo_cuenta) as con_tipo_cuenta,
        COUNT(numero_cuenta) as con_numero_cuenta
      FROM guardias
      WHERE rut IS NOT NULL AND rut != ''
    `);

    const stats = verificacionResult.rows[0];
    console.log(`📊 Estadísticas finales:`);
    console.log(`   • Total guardias: ${stats.total_guardias}`);
    console.log(`   • Con banco: ${stats.con_banco}`);
    console.log(`   • Con tipo cuenta: ${stats.con_tipo_cuenta}`);
    console.log(`   • Con número cuenta: ${stats.con_numero_cuenta}`);

    console.log('\n✅ Actualización de datos bancarios completada');

  } catch (error) {
    console.error('\n❌ Error en la actualización:', error);
    process.exit(1);
  }
}

// Ejecutar script
actualizarDatosBancarios()
  .then(() => {
    console.log('\n🎉 Script completado exitosamente');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n💥 Error fatal:', error);
    process.exit(1);
  }); 