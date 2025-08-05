import { format } from 'date-fns';

// Simular la lógica de fecha inicial del frontend
const fechaInicial = (() => {
  const ahora = new Date();
  const fechaLocal = format(ahora, 'yyyy-MM-dd');
  console.log('🕐 Fecha actual del sistema:', fechaLocal);
  console.log('🕐 Hora actual:', ahora.toLocaleTimeString());
  return fechaLocal;
})();

console.log('📅 Fecha inicial calculada:', fechaInicial);

// Verificar si estamos en agosto de 2025
const ahora = new Date();
const anio = ahora.getFullYear();
const mes = ahora.getMonth() + 1; // getMonth() devuelve 0-11

console.log(`📅 Año actual: ${anio}, Mes actual: ${mes}`);

if (anio !== 2025 || mes !== 8) {
  console.log('⚠️ ADVERTENCIA: No estamos en agosto de 2025');
  console.log('💡 La fecha inicial será incorrecta para ver la pauta de agosto 2025');
  console.log('💡 Deberías navegar manualmente al 5 de agosto de 2025 en la interfaz');
} else {
  console.log('✅ Estamos en agosto de 2025, la fecha inicial debería ser correcta');
}

// Mostrar cómo sería la fecha para el 5 de agosto de 2025
const fecha5Agosto = '2025-08-05';
console.log(`📅 Fecha para el 5 de agosto de 2025: ${fecha5Agosto}`);

// Verificar si la fecha inicial coincide
if (fechaInicial === fecha5Agosto) {
  console.log('✅ La fecha inicial coincide con el 5 de agosto de 2025');
} else {
  console.log('❌ La fecha inicial NO coincide con el 5 de agosto de 2025');
  console.log('💡 Esto explica por qué la pauta diaria muestra datos incorrectos');
} 