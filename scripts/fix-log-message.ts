import fs from 'fs';
import path from 'path';

const filePath = path.join(process.cwd(), 'src/app/api/pauta-diaria/route.ts');

console.log('🔧 Actualizando mensaje de log en pauta diaria...');

// Leer el archivo
let content = fs.readFileSync(filePath, 'utf8');

// Buscar y reemplazar el mensaje de log
const oldMessage = `console.log("✅ API Pauta Diaria: Estados corregidos - turnos marcados como 'trabajado' sin confirmación ahora son 'T' (Asignado)");`;

const newMessage = `console.log("✅ API Pauta Diaria: Estados procesados - estado 'trabajado' mantenido para guardias asistidos");`;

if (content.includes(oldMessage)) {
  content = content.replace(oldMessage, newMessage);
  fs.writeFileSync(filePath, content, 'utf8');
  console.log('✅ Mensaje de log actualizado exitosamente');
} else {
  console.log('❌ No se encontró el mensaje de log');
}

console.log('🎯 Cambios aplicados:');
console.log('- Mensaje de log actualizado para reflejar la nueva lógica');
console.log('- Ahora indica que el estado "trabajado" se mantiene'); 