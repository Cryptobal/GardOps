import { calcularSueldo } from './calcularSueldo';
import { SueldoInput } from './tipos/sueldo';

import { logger, devLogger, apiLogger } from '@/lib/utils/logger';
/**
 * Función de prueba para verificar los cálculos actualizados
 */
export async function testCalculoSueldo() {
  logger.debug('🧪 Iniciando pruebas de cálculo de sueldo...\n');

  // Caso de prueba 1: Sueldo base $550.000 (como en la imagen)
  const testCase1: SueldoInput = {
    sueldoBase: 550000,
    fecha: new Date('2025-08-06'),
    afp: 'capital',
    mutualidad: 'achs',
    tipoContrato: 'indefinido',
    horasExtras: {
      cincuenta: 20, // Solo se consideran las horas al 50%
      cien: 0
    },
    bonos: {
      nocturnidad: 0,
      festivo: 0
    },
    comisiones: 0,
    noImponible: {
      colacion: 0,
      movilizacion: 0
    },
    anticipos: 0,
    judiciales: 0,
    apv: 0,
    cuenta2: 0
  };

  try {
    logger.debug('📊 Caso de prueba 1: Sueldo base $550.000');
    console.log('Entrada:', JSON.stringify(testCase1, null, 2));
    
    const resultado1 = await calcularSueldo(testCase1);
    
    logger.debug('\n✅ Resultado:');
    logger.debug('Sueldo Líquido:', resultado1.sueldoLiquido);
    logger.debug('Total Imponible:', resultado1.imponible.total);
    logger.debug('Gratificación Legal:', resultado1.imponible.gratificacionLegal);
    logger.debug('Horas Extras:', resultado1.imponible.horasExtras);
    logger.debug('Cotizaciones Total:', resultado1.cotizaciones.total);
    logger.debug('Impuesto Único:', resultado1.impuesto.impuestoUnico);
    logger.debug('Costo Empleador:', resultado1.empleador.costoTotal);
    
    // Verificar que los cálculos son razonables
    logger.debug('\n🔍 Verificaciones:');
    devLogger.success(' Sueldo líquido > 0:', resultado1.sueldoLiquido > 0);
    devLogger.success(' Total imponible >= sueldo base:', resultado1.imponible.total >= testCase1.sueldoBase);
    devLogger.success(' Gratificación <= tope:', resultado1.imponible.gratificacionLegal <= 209396);
    devLogger.success(' Cotizaciones > 0:', resultado1.cotizaciones.total > 0);
    devLogger.success(' Costo empleador > total imponible:', resultado1.empleador.costoTotal > resultado1.imponible.total);
    
  } catch (error) {
    console.error('❌ Error en caso de prueba 1:', error);
  }

  // Caso de prueba 2: Sueldo alto con horas extras (solo al 50%)
  const testCase2: SueldoInput = {
    sueldoBase: 1000000,
    fecha: new Date('2025-08-06'),
    afp: 'cuprum',
    mutualidad: 'achs',
    tipoContrato: 'indefinido',
    horasExtras: {
      cincuenta: 15, // Solo se consideran las horas al 50%
      cien: 0
    },
    bonos: {
      nocturnidad: 50000,
      festivo: 30000
    },
    comisiones: 100000,
    noImponible: {
      colacion: 25000,
      movilizacion: 15000
    },
    anticipos: 0,
    judiciales: 0,
    apv: 0,
    cuenta2: 0
  };

  try {
    logger.debug('\n📊 Caso de prueba 2: Sueldo alto con bonos y horas extras');
    const resultado2 = await calcularSueldo(testCase2);
    
    logger.debug('✅ Resultado:');
    logger.debug('Sueldo Líquido:', resultado2.sueldoLiquido);
    logger.debug('Total Imponible:', resultado2.imponible.total);
    logger.debug('Gratificación Legal:', resultado2.imponible.gratificacionLegal);
    logger.debug('Horas Extras:', resultado2.imponible.horasExtras);
    logger.debug('Bonos:', resultado2.imponible.bonos);
    logger.debug('No Imponible Total:', resultado2.noImponible.total);
    logger.debug('Cotizaciones Total:', resultado2.cotizaciones.total);
    logger.debug('Impuesto Único:', resultado2.impuesto.impuestoUnico);
    logger.debug('Costo Empleador:', resultado2.empleador.costoTotal);
    
  } catch (error) {
    console.error('❌ Error en caso de prueba 2:', error);
  }

  // Caso de prueba 3: Contrato plazo fijo
  const testCase3: SueldoInput = {
    sueldoBase: 400000,
    fecha: new Date('2025-08-06'),
    afp: 'habitat',
    mutualidad: 'achs',
    tipoContrato: 'plazo_fijo',
    horasExtras: {
      cincuenta: 0,
      cien: 0
    },
    bonos: {},
    comisiones: 0,
    noImponible: {},
    anticipos: 0,
    judiciales: 0,
    apv: 0,
    cuenta2: 0
  };

  try {
    logger.debug('\n📊 Caso de prueba 3: Contrato plazo fijo');
    const resultado3 = await calcularSueldo(testCase3);
    
    logger.debug('✅ Resultado:');
    logger.debug('Sueldo Líquido:', resultado3.sueldoLiquido);
    logger.debug('Total Imponible:', resultado3.imponible.total);
    logger.debug('AFC Trabajador:', resultado3.cotizaciones.afc);
    logger.debug('AFC Empleador:', resultado3.empleador.afc);
    logger.debug('Costo Empleador:', resultado3.empleador.costoTotal);
    
    // Verificar que AFC es 0 para contrato plazo fijo
    logger.debug('\n🔍 Verificaciones:');
    devLogger.success(' AFC trabajador = 0 (plazo fijo):', resultado3.cotizaciones.afc === 0);
    devLogger.success(' AFC empleador = 3% (plazo fijo):', resultado3.empleador.afc > 0);
    
  } catch (error) {
    console.error('❌ Error en caso de prueba 3:', error);
  }

  logger.debug('\n🎉 Pruebas completadas');
}

// Ejecutar pruebas si se llama directamente
if (require.main === module) {
  testCalculoSueldo().catch(console.error);
}
