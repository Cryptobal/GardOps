// Simular exactamente la lógica del frontend
function testFechaPautaDiaria(fechaString: string) {
  console.log(`\n🔍 Probando fecha: ${fechaString}`);
  
  const fechaObj = new Date(fechaString);
  const anio = fechaObj.getFullYear();
  const mes = fechaObj.getMonth() + 1;
  const dia = fechaObj.getDate();
  
  console.log(`📅 Fecha original: ${fechaString}`);
  console.log(`📅 Fecha objeto: ${fechaObj.toISOString()}`);
  console.log(`📅 Año: ${anio}`);
  console.log(`📅 Mes: ${mes}`);
  console.log(`📅 Día: ${dia}`);
  
  // Construir la URL que se enviaría a la API
  const url = `/api/pauta-diaria?anio=${anio}&mes=${mes}&dia=${dia}`;
  console.log(`🌐 URL generada: ${url}`);
  
  return { anio, mes, dia, url };
}

// Probar con diferentes fechas
console.log('🧪 Probando cálculo de fechas en pauta diaria');

testFechaPautaDiaria('2025-08-05');
testFechaPautaDiaria('2025-08-06');
testFechaPautaDiaria('2025-08-07');
testFechaPautaDiaria('2025-08-08');
testFechaPautaDiaria('2025-08-09');

console.log('\n💡 Si las fechas se están calculando correctamente,');
console.log('el problema podría estar en la zona horaria o en la API.'); 