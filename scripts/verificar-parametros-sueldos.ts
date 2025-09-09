import * as dotenv from 'dotenv';
import { sql } from '@vercel/postgres';

// Cargar variables de entorno
dotenv.config({ path: '.env.local' });

async function verificarYCrearParametrosSueldos() {
  console.log('🔍 Verificando parámetros de sueldos...');

  try {
    // 1. Verificar si las tablas existen
    console.log('📋 Verificando existencia de tablas...');
    
    const tablas = [
      'sueldo_parametros_generales',
      'sueldo_afp', 
      'sueldo_tramos_impuesto',
      'sueldo_asignacion_familiar'
    ];

    for (const tabla of tablas) {
      const existe = await sql`
        SELECT EXISTS (
          SELECT FROM information_schema.tables 
          WHERE table_schema = 'public' 
          AND table_name = ${tabla}
        )
      `;
      console.log(`${existe.rows[0].exists ? '✅' : '❌'} Tabla ${tabla}: ${existe.rows[0].exists ? 'EXISTE' : 'NO EXISTE'}`);
    }

    // 2. Verificar datos para 2025-08
    console.log('\n📊 Verificando datos para período 2025-08...');
    
    const parametros = await sql`
      SELECT COUNT(*) as count FROM sueldo_parametros_generales WHERE periodo = '2025-08'
    `;
    console.log(`📈 Parámetros generales: ${parametros.rows[0].count} registros`);

    const afps = await sql`
      SELECT COUNT(*) as count FROM sueldo_afp WHERE periodo = '2025-08'
    `;
    console.log(`📈 AFPs: ${afps.rows[0].count} registros`);

    const tramos = await sql`
      SELECT COUNT(*) as count FROM sueldo_tramos_impuesto WHERE periodo = '2025-08'
    `;
    console.log(`📈 Tramos de impuesto: ${tramos.rows[0].count} registros`);

    const asignacion = await sql`
      SELECT COUNT(*) as count FROM sueldo_asignacion_familiar WHERE periodo = '2025-08'
    `;
    console.log(`📈 Asignación familiar: ${asignacion.rows[0].count} registros`);

    // 3. Si no hay datos, crearlos
    if (parseInt(parametros.rows[0].count) === 0) {
      console.log('\n🔧 Creando parámetros generales para 2025-08...');
      
      const parametrosGenerales = [
        { parametro: 'UF_ULTIMO_DIA', valor: '39133', descripcion: 'Valor UF último día del mes' },
        { parametro: 'FAC_SIS', valor: '0.0188', descripcion: 'Factor SIS (Seguro de Invalidez y Sobrevivencia)' },
        { parametro: 'FAC_SS', valor: '0.009', descripcion: 'Factor SS (Seguro Social)' },
        { parametro: 'FAC_AFP_EMP', valor: '0.001', descripcion: 'Factor AFP Empleador' },
        { parametro: 'FAC_RENT_PROT', valor: '0.009', descripcion: 'Factor Renta Protegida' },
        { parametro: 'UF_TOPE_AFP', valor: '87.8', descripcion: 'UF Tope AFP' },
        { parametro: 'UF_TOPE_AFC', valor: '131.9', descripcion: 'UF Tope AFC' },
        { parametro: 'UF_TOPE_INP', valor: '60', descripcion: 'UF Tope INP' },
        { parametro: 'UF_TOPE_APV_MENSUAL', valor: '50', descripcion: 'UF Tope APV Mensual' },
        { parametro: 'UF_TOPE_APV_ANUAL', valor: '600', descripcion: 'UF Tope APV Anual' },
        { parametro: 'MIN_IMPO', valor: '529000', descripcion: 'Mínimo imponible general' },
        { parametro: 'MIN_IMPO_18_65', valor: '394622', descripcion: 'Mínimo imponible -18 +65 años' },
        { parametro: 'MIN_IMPO_TRAB_CASA_PART', valor: '529000', descripcion: 'Mínimo imponible trabajador casa particular' },
        { parametro: 'AFC_EMP_INDEF', valor: '0.024', descripcion: 'AFC Empleador Indefinido' },
        { parametro: 'AFC_EMP_FIJO', valor: '0.03', descripcion: 'AFC Empleador Fijo' },
        { parametro: 'AFC_EMPL_INDEF', valor: '0.006', descripcion: 'AFC Empleado Indefinido' },
        { parametro: 'AFC_EMPL_FIJO', valor: '0', descripcion: 'AFC Empleado Fijo' },
        { parametro: 'UTM', valor: '68647', descripcion: 'Unidad Tributaria Mensual' }
      ];

      for (const param of parametrosGenerales) {
        await sql`
          INSERT INTO sueldo_parametros_generales (periodo, parametro, valor, descripcion)
          VALUES ('2025-08', ${param.parametro}, ${param.valor}, ${param.descripcion})
          ON CONFLICT (periodo, parametro) DO NOTHING
        `;
      }
      console.log('✅ Parámetros generales creados');
    }

    if (parseInt(afps.rows[0].count) === 0) {
      console.log('\n🔧 Creando AFPs para 2025-08...');
      
      const afpsData = [
        { codigo: 'capital', nombre: 'AFP Capital', tasa: 11.44 },
        { codigo: 'cuprum', nombre: 'AFP Cuprum', tasa: 11.44 },
        { codigo: 'habitat', nombre: 'AFP Habitat', tasa: 11.27 },
        { codigo: 'modelo', nombre: 'AFP Modelo', tasa: 10.77 },
        { codigo: 'planvital', nombre: 'AFP PlanVital', tasa: 11.10 },
        { codigo: 'provida', nombre: 'AFP ProVida', tasa: 11.45 },
        { codigo: 'uno', nombre: 'AFP UNO', tasa: 10.69 },
        { codigo: 'EMPART', nombre: 'Empart', tasa: 21.84 },
        { codigo: 'INP_SSS', nombre: 'INP SSS', tasa: 18.84 },
        { codigo: 'CADDEMED', nombre: 'Caddemed', tasa: 20.2 }
      ];

      for (const afp of afpsData) {
        await sql`
          INSERT INTO sueldo_afp (periodo, codigo, nombre, tasa)
          VALUES ('2025-08', ${afp.codigo}, ${afp.nombre}, ${afp.tasa})
          ON CONFLICT (periodo, codigo) DO NOTHING
        `;
      }
      console.log('✅ AFPs creadas');
    }

    if (parseInt(tramos.rows[0].count) === 0) {
      console.log('\n🔧 Creando tramos de impuesto para 2025-08...');
      
      const tramosData = [
        { tramo: 1, desde: 0, hasta: 1500000, factor: 0, rebaja: 0, tasa_max: 0 },
        { tramo: 2, desde: 1500001, hasta: 2500000, factor: 0.04, rebaja: 60000, tasa_max: 4 },
        { tramo: 3, desde: 2500001, hasta: 3500000, factor: 0.08, rebaja: 160000, tasa_max: 8 },
        { tramo: 4, desde: 3500001, hasta: 4500000, factor: 0.135, rebaja: 327500, tasa_max: 13.5 },
        { tramo: 5, desde: 4500001, hasta: 5500000, factor: 0.23, rebaja: 765000, tasa_max: 23 },
        { tramo: 6, desde: 5500001, hasta: 6500000, factor: 0.304, rebaja: 1127000, tasa_max: 30.4 },
        { tramo: 7, desde: 6500001, hasta: 999999999, factor: 0.35, rebaja: 1627000, tasa_max: 35 }
      ];

      for (const tramo of tramosData) {
        await sql`
          INSERT INTO sueldo_tramos_impuesto (periodo, tramo, desde, hasta, factor, rebaja, tasa_max)
          VALUES ('2025-08', ${tramo.tramo}, ${tramo.desde}, ${tramo.hasta}, ${tramo.factor}, ${tramo.rebaja}, ${tramo.tasa_max})
          ON CONFLICT (periodo, tramo) DO NOTHING
        `;
      }
      console.log('✅ Tramos de impuesto creados');
    }

    if (parseInt(asignacion.rows[0].count) === 0) {
      console.log('\n🔧 Creando asignación familiar para 2025-08...');
      
      const asignacionData = [
        { tramo: '-', desde: 0, hasta: 0, monto: 0 },
        { tramo: 'A', desde: 1, hasta: 620251, monto: 22007 },
        { tramo: 'B', desde: 620252, hasta: 905941, monto: 13505 },
        { tramo: 'C', desde: 905942, hasta: 1412957, monto: 4267 },
        { tramo: 'D', desde: 1412958, hasta: null, monto: 0 }
      ];

      for (const item of asignacionData) {
        await sql`
          INSERT INTO sueldo_asignacion_familiar (periodo, tramo, desde, hasta, monto)
          VALUES ('2025-08', ${item.tramo}, ${item.desde}, ${item.hasta}, ${item.monto})
          ON CONFLICT (periodo, tramo) DO NOTHING
        `;
      }
      console.log('✅ Asignación familiar creada');
    }

    console.log('\n✅ Verificación completada!');
    console.log('📊 Resumen:');
    console.log('- Parámetros generales: ✅');
    console.log('- AFPs: ✅');
    console.log('- Tramos de impuesto: ✅');
    console.log('- Asignación familiar: ✅');
    console.log('- Tabla de cargas familiares: ✅ (sueldo_asignacion_familiar)');

  } catch (error) {
    console.error('❌ Error durante la verificación:', error);
    throw error;
  }
}

// Ejecutar si se llama directamente
if (require.main === module) {
  verificarYCrearParametrosSueldos()
    .then(() => {
      console.log('🎉 Script completado exitosamente');
      process.exit(0);
    })
    .catch((error) => {
      console.error('💥 Error en el script:', error);
      process.exit(1);
    });
}

export { verificarYCrearParametrosSueldos };
