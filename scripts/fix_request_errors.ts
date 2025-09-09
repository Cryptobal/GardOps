import * as fs from 'fs';
import * as path from 'path';

const API_DIR = path.join(process.cwd(), 'src/app/api');

function fixRequestErrors(dir: string) {
  const files = fs.readdirSync(dir, { withFileTypes: true });
  
  for (const file of files) {
    const fullPath = path.join(dir, file.name);
    
    if (file.isDirectory()) {
      fixRequestErrors(fullPath);
    } else if (file.name.endsWith('.ts') || file.name.endsWith('.tsx')) {
      let content = fs.readFileSync(fullPath, 'utf8');
      let modified = false;
      
      // Corregir requireAuthz(request, ...) a requireAuthz(req, ...)
      const regex = /requireAuthz\(request,/g;
      if (regex.test(content)) {
        content = content.replace(regex, 'requireAuthz(req,');
        modified = true;
        console.log(`✅ Corregido: ${fullPath}`);
      }
      
      if (modified) {
        fs.writeFileSync(fullPath, content, 'utf8');
      }
    }
  }
}

console.log('🔧 Corrigiendo errores de variable request no definida...');
fixRequestErrors(API_DIR);
console.log('✅ Proceso completado');

