import fs from 'fs';
import path from 'path';

const filePath = path.join(process.cwd(), 'src/app/api/pauta-diaria/route.ts');

console.log('🔧 Corrigiendo lógica del estado "trabajado" en pauta diaria...');

// Leer el archivo
let content = fs.readFileSync(filePath, 'utf8');

// Buscar y reemplazar la lógica problemática
const oldLogic = `} else if (row.estado === 'trabajado' && !row.reemplazo_guardia_id) {
        // Si está marcado como trabajado pero no tiene confirmación de reemplazo, corregir a 'T'
        estadoCorregido = 'T';
        console.log(\`🔧 Corrigiendo estado de 'trabajado' a 'T' para puesto \${row.puesto_id} (sin reemplazo)\`);
      }`;

const newLogic = `} else if (row.estado === 'trabajado') {
        // Mantener estado 'trabajado' cuando está marcado como asistido
        estadoCorregido = 'trabajado';
        console.log(\`✅ Manteniendo estado 'trabajado' para puesto \${row.puesto_id} (asistido)\`);
      }`;

if (content.includes(oldLogic)) {
  content = content.replace(oldLogic, newLogic);
  fs.writeFileSync(filePath, content, 'utf8');
  console.log('✅ Lógica corregida exitosamente');
} else {
  console.log('❌ No se encontró la lógica problemática');
}

console.log('🎯 Cambios aplicados:');
console.log('- El estado "trabajado" ya no se convierte a "T"');
console.log('- Los guardias marcados como asistidos mantendrán su estado visual');
console.log('- El botón "Asistió" ahora funcionará correctamente'); 