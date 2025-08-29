import fs from 'fs';
import { execSync } from 'child_process';

function fixUseClientDirective() {
  console.log('🔧 Corrigiendo directiva "use client"...');
  
  try {
    // Encontrar archivos que tienen 'use client' después de imports
    const findCmd = "find src -name '*.tsx' -exec grep -l \"'use client'\" {} \\;";
    const files = execSync(findCmd, { encoding: 'utf8' }).trim().split('\n').filter(f => f);
    
    console.log(`📝 Encontrados ${files.length} archivos con 'use client'`);
    
    for (const file of files) {
      console.log(`🔧 Verificando ${file}`);
      
      let content = fs.readFileSync(file, 'utf8');
      
      // Verificar si 'use client' está después de imports
      if (content.includes("import") && content.indexOf("'use client'") > content.indexOf("import")) {
        console.log(`🔧 Corrigiendo ${file}`);
        
        // Remover 'use client' de su posición actual
        content = content.replace(/\s*'use client';\s*\n/, '\n');
        
        // Agregar 'use client' al principio del archivo
        content = "'use client';\n\n" + content;
        
        fs.writeFileSync(file, content, 'utf8');
        console.log(`✅ Corregido ${file}`);
      }
    }
    
    console.log('✅ Corrección de directiva "use client" completada');
    
  } catch (error) {
    console.error('❌ Error:', error);
  }
}

fixUseClientDirective();
