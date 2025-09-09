// Script para probar el cálculo de sueldo

// Usar importaciones dinámicas para evitar problemas con los paths
const { calcularSueldo } = require('../src/lib/sueldo/calcularSueldo');
const { formatearCLP } = require('../src/lib/sueldo/utils/redondeo');

async function testCalculo() {
  console.log('🧪 Probando cálculo de sueldo...\n');
  
  try {
    const input = {
      sueldoBase: 1000000,
      fecha: new Date('2025-01-01'),
      afp: 'habitat',
      tipoContrato: 'indefinido',
      horasExtras: { cincuenta: 15, cien: 0 }, // Solo se consideran las horas al 50%
      bonos: {
        nocturnidad: 50000,
        festivo: 30000
      },
      comisiones: 100000,
      noImponible: {
        colacion: 70000,
        movilizacion: 50000
      },
      anticipos: 50000,
      judiciales: 0,
      apv: 0,
      cuenta2: 0,
      cotizacionAdicionalUF: 0.4,
      diasAusencia: 2
    };
    
    console.log('📋 DATOS DE ENTRADA:');
    console.log('=' + '='.repeat(50));
    console.log(`   Sueldo Base: ${formatearCLP(input.sueldoBase)}`);
    console.log(`   AFP: ${input.afp}`);
    console.log(`   Tipo Contrato: ${input.tipoContrato}`);
    console.log(`   Horas Extras 50%: ${input.horasExtras?.cincuenta} (solo estas se consideran)`);
    console.log(`   Horas Extras 100%: ${input.horasExtras?.cien} (no se consideran en el cálculo)`);
    console.log(`   Bonos Nocturnidad: ${formatearCLP(input.bonos?.nocturnidad || 0)}`);
    console.log(`   Bonos Festivo: ${formatearCLP(input.bonos?.festivo || 0)}`);
    console.log(`   Comisiones: ${formatearCLP(input.comisiones || 0)}`);
    console.log(`   Colación: ${formatearCLP(input.noImponible?.colacion || 0)}`);
    console.log(`   Movilización: ${formatearCLP(input.noImponible?.movilizacion || 0)}`);
    console.log(`   Anticipos: ${formatearCLP(input.anticipos || 0)}`);
    console.log(`   Cotización Adicional UF: ${input.cotizacionAdicionalUF}`);
    console.log(`   Días Ausencia: ${input.diasAusencia}`);
    
    console.log('\n⏳ Calculando...\n');
    
    const resultado = await calcularSueldo(input);
    
    console.log('📊 RESULTADOS:');
    console.log('=' + '='.repeat(50));
    
    console.log('\n📈 IMPONIBLE:');
    console.log(`   Sueldo Base: ${formatearCLP(resultado.imponible.sueldoBase)}`);
    if (resultado.imponible.descuentoDiasAusencia > 0) {
      console.log(`   Descuento Días Ausencia: -${formatearCLP(resultado.imponible.descuentoDiasAusencia)}`);
      console.log(`   Sueldo Base Ajustado: ${formatearCLP(resultado.imponible.sueldoBaseAjustado)}`);
    }
    console.log(`   Gratificación Legal: ${formatearCLP(resultado.imponible.gratificacionLegal)}`);
    console.log(`   Horas Extras: ${formatearCLP(resultado.imponible.horasExtras)}`);
    console.log(`   Comisiones: ${formatearCLP(resultado.imponible.comisiones)}`);
    console.log(`   Bonos: ${formatearCLP(resultado.imponible.bonos)}`);
    console.log(`   ➤ TOTAL IMPONIBLE: ${formatearCLP(resultado.imponible.total)}`);
    
    console.log('\n💼 COTIZACIONES:');
    console.log(`   AFP (${resultado.parametros.comisionAfp?.toFixed(2)}%): ${formatearCLP(resultado.cotizaciones.afp)}`);
    console.log(`   Salud (7% + ${input.cotizacionAdicionalUF} UF): ${formatearCLP(resultado.cotizaciones.salud)}`);
    console.log(`   AFC (0.6%): ${formatearCLP(resultado.cotizaciones.afc)}`);
    console.log(`   ➤ TOTAL COTIZACIONES: ${formatearCLP(resultado.cotizaciones.total)}`);
    
    console.log('\n📋 NO IMPONIBLE:');
    console.log(`   Colación: ${formatearCLP(resultado.noImponible.colacion)}`);
    console.log(`   Movilización: ${formatearCLP(resultado.noImponible.movilizacion)}`);
    console.log(`   ➤ TOTAL NO IMPONIBLE: ${formatearCLP(resultado.noImponible.total)}`);
    
    console.log('\n💰 IMPUESTO:');
    console.log(`   Base Tributable: ${formatearCLP(resultado.impuesto.baseTributable)}`);
    console.log(`   Factor: ${(resultado.impuesto.factor * 100).toFixed(1)}%`);
    console.log(`   Rebaja: ${formatearCLP(resultado.impuesto.rebaja)}`);
    console.log(`   ➤ IMPUESTO ÚNICO: ${formatearCLP(resultado.impuesto.impuestoUnico)}`);
    
    console.log('\n📉 DESCUENTOS:');
    console.log(`   Anticipos: ${formatearCLP(resultado.descuentos.anticipos)}`);
    console.log(`   ➤ TOTAL DESCUENTOS: ${formatearCLP(resultado.descuentos.total)}`);
    
    console.log('\n');
    console.log('=' + '='.repeat(50));
    console.log(`🎯 SUELDO LÍQUIDO: ${formatearCLP(resultado.sueldoLiquido)}`);
    console.log('=' + '='.repeat(50));
    
    console.log('\n🏢 COSTOS EMPLEADOR:');
    console.log(`   SIS (1.88%): ${formatearCLP(resultado.empleador.sis)}`);
    console.log(`   AFC (2.4%): ${formatearCLP(resultado.empleador.afc)}`);
    console.log(`   Mutual (0.90%): ${formatearCLP(resultado.empleador.mutual)}`);
    console.log(`   Reforma Previsional (1%): ${formatearCLP(resultado.empleador.reformaPrevisional)}`);
    console.log(`   ➤ COSTO TOTAL EMPLEADOR: ${formatearCLP(resultado.empleador.costoTotal)}`);
    
    console.log('\n✅ Cálculo completado exitosamente!');
    
    process.exit(0);
    
  } catch (error) {
    console.error('\n❌ Error en el cálculo:');
    console.error(error);
    process.exit(1);
  }
}

// Ejecutar el test
testCalculo();
