import fs from 'fs';
import { execSync } from 'child_process';

function fixAuthzImports() {
  console.log('🔧 Actualizando importaciones de authz-ui...');
  
  try {
    // Encontrar archivos que importan authz-ui
    const findCmd = "find src -name '*.tsx' -o -name '*.ts' | xargs grep -l '@/lib/authz-ui'";
    const files = execSync(findCmd, { encoding: 'utf8' }).trim().split('\n').filter(f => f);
    
    console.log(`📝 Encontrados ${files.length} archivos con importaciones de authz-ui`);
    
    for (const file of files) {
      console.log(`🔧 Actualizando ${file}`);
      
      let content = fs.readFileSync(file, 'utf8');
      
      // Reemplazar la importación
      content = content.replace(
        /from ['"]@\/lib\/authz-ui['"]/g,
        "from '@/lib/authz-ui'"
      );
      
      fs.writeFileSync(file, content, 'utf8');
    }
    
    console.log('✅ Actualización de importaciones completada');
    
  } catch (error) {
    console.error('❌ Error:', error);
  }
}

fixAuthzImports();
