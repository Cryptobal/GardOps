// Función para generar dígito verificador
function calcularDigitoVerificador(numero: string): string {
  let suma = 0;
  let multiplicador = 2;
  
  for (let i = numero.length - 1; i >= 0; i--) {
    suma += parseInt(numero[i]) * multiplicador;
    multiplicador = multiplicador === 7 ? 2 : multiplicador + 1;
  }
  
  const dvEsperado = 11 - (suma % 11);
  if (dvEsperado === 11) return '0';
  if (dvEsperado === 10) return 'k';
  return dvEsperado.toString();
}

// Función para generar RUT válido
function generarRutValido(): string {
  // Generar número aleatorio de 7-8 dígitos
  const longitud = Math.random() > 0.5 ? 7 : 8;
  let numero = '';
  
  for (let i = 0; i < longitud; i++) {
    numero += Math.floor(Math.random() * 10).toString();
  }
  
  // Calcular dígito verificador
  const dv = calcularDigitoVerificador(numero);
  
  return `${numero}-${dv}`;
}

// Generar y mostrar RUTs válidos
console.log('🔢 Generando RUTs válidos...\n');

for (let i = 0; i < 5; i++) {
  const rut = generarRutValido();
  console.log(`RUT ${i + 1}: ${rut}`);
}

console.log('\n✅ Todos los RUTs generados son válidos y pueden ser usados para testing.'); 