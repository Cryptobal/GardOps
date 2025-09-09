import fs from 'fs';
import { execSync } from 'child_process';

function fixAuthzImportsFinal() {
  console.log('🔧 Corrigiendo importaciones de authz...');
  
  try {
    // Encontrar archivos que importan authz
    const findCmd = "find src -name '*.ts' -o -name '*.tsx' | xargs grep -l '@/lib/authz'";
    const files = execSync(findCmd, { encoding: 'utf8' }).trim().split('\n').filter(f => f);
    
    console.log(`📝 Encontrados ${files.length} archivos con importaciones de authz`);
    
    for (const file of files) {
      console.log(`🔧 Corrigiendo ${file}`);
      
      let content = fs.readFileSync(file, 'utf8');
      
      // Reemplazar la importación
      content = content.replace(
        /from ['"]@\/lib\/authz['"]/g,
        "from '@/lib/authz-api'"
      );
      
      fs.writeFileSync(file, content, 'utf8');
      console.log(`✅ Corregido: ${file}`);
    }
    
    console.log('🎉 ¡Todas las importaciones de authz corregidas!');
    
  } catch (error) {
    console.error('❌ Error:', error);
  }
}

fixAuthzImportsFinal();
