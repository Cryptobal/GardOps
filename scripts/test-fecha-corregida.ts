// Simular la lógica corregida del frontend
function testFechaCorregida(fechaString: string) {
  console.log(`\n🔍 Probando fecha corregida: ${fechaString}`);
  
  // Lógica anterior (problemática)
  const fechaObj = new Date(fechaString);
  const anioAnterior = fechaObj.getFullYear();
  const mesAnterior = fechaObj.getMonth() + 1;
  const diaAnterior = fechaObj.getDate();
  
  // Lógica corregida
  const [anio, mes, dia] = fechaString.split('-').map(Number);
  
  console.log(`📅 Fecha original: ${fechaString}`);
  console.log(`❌ Lógica anterior - Año: ${anioAnterior}, Mes: ${mesAnterior}, Día: ${diaAnterior}`);
  console.log(`✅ Lógica corregida - Año: ${anio}, Mes: ${mes}, Día: ${dia}`);
  
  // Construir las URLs
  const urlAnterior = `/api/pauta-diaria?anio=${anioAnterior}&mes=${mesAnterior}&dia=${diaAnterior}`;
  const urlCorregida = `/api/pauta-diaria?anio=${anio}&mes=${mes}&dia=${dia}`;
  
  console.log(`❌ URL anterior: ${urlAnterior}`);
  console.log(`✅ URL corregida: ${urlCorregida}`);
  
  return { anio, mes, dia, urlCorregida };
}

// Probar con diferentes fechas
console.log('🧪 Probando corrección de fechas en pauta diaria');

testFechaCorregida('2025-08-05');
testFechaCorregida('2025-08-06');
testFechaCorregida('2025-08-07');
testFechaCorregida('2025-08-08');
testFechaCorregida('2025-08-09');

console.log('\n✅ La corrección debería resolver el desfase de un día.'); 