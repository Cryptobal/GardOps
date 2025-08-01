import fs from 'fs';
import path from 'path';

function checkClientesDependencies() {
  try {
    console.log('🔍 Verificando dependencias del módulo de clientes...');
    
    // 1. Verificar que el archivo principal existe
    const clientesPagePath = path.join(process.cwd(), 'src/app/clientes/page.tsx');
    if (!fs.existsSync(clientesPagePath)) {
      console.log('❌ Error: No se encuentra src/app/clientes/page.tsx');
      return;
    }
    console.log('✅ src/app/clientes/page.tsx existe');
    
    // 2. Verificar que la API existe
    const clientesAPIPath = path.join(process.cwd(), 'src/app/api/clientes/route.ts');
    if (!fs.existsSync(clientesAPIPath)) {
      console.log('❌ Error: No se encuentra src/app/api/clientes/route.ts');
      return;
    }
    console.log('✅ src/app/api/clientes/route.ts existe');
    
    // 3. Verificar que los esquemas existen
    const schemasPath = path.join(process.cwd(), 'src/lib/schemas/clientes.ts');
    if (!fs.existsSync(schemasPath)) {
      console.log('❌ Error: No se encuentra src/lib/schemas/clientes.ts');
      return;
    }
    console.log('✅ src/lib/schemas/clientes.ts existe');
    
    // 4. Verificar que la API lib existe
    const apiLibPath = path.join(process.cwd(), 'src/lib/api/clientes.ts');
    if (!fs.existsSync(apiLibPath)) {
      console.log('❌ Error: No se encuentra src/lib/api/clientes.ts');
      return;
    }
    console.log('✅ src/lib/api/clientes.ts existe');
    
    // 5. Verificar componentes UI necesarios
    const uiComponents = [
      'src/components/ui/modal.tsx',
      'src/components/ui/button.tsx',
      'src/components/ui/input.tsx',
      'src/components/ui/switch.tsx',
      'src/components/ui/badge.tsx',
      'src/components/ui/card.tsx',
      'src/components/ui/toast.tsx',
      'src/components/ui/data-table.tsx',
      'src/components/ui/page-header.tsx',
      'src/components/ui/filter-bar.tsx',
      'src/components/ui/entity-modal.tsx',
      'src/components/ui/entity-tabs.tsx',
      'src/components/ui/input-direccion.tsx'
    ];
    
    console.log('\n🔧 Verificando componentes UI...');
    let missingComponents = 0;
    uiComponents.forEach(componentPath => {
      const fullPath = path.join(process.cwd(), componentPath);
      if (fs.existsSync(fullPath)) {
        console.log(`✅ ${componentPath}`);
      } else {
        console.log(`❌ ${componentPath} - NO ENCONTRADO`);
        missingComponents++;
      }
    });
    
    if (missingComponents > 0) {
      console.log(`\n⚠️ Faltan ${missingComponents} componentes UI`);
    } else {
      console.log('\n✅ Todos los componentes UI están presentes');
    }
    
    // 6. Verificar componentes compartidos
    const sharedComponents = [
      'src/components/shared/document-manager.tsx',
      'src/components/shared/log-viewer.tsx'
    ];
    
    console.log('\n📁 Verificando componentes compartidos...');
    sharedComponents.forEach(componentPath => {
      const fullPath = path.join(process.cwd(), componentPath);
      if (fs.existsSync(fullPath)) {
        console.log(`✅ ${componentPath}`);
      } else {
        console.log(`❌ ${componentPath} - NO ENCONTRADO`);
      }
    });
    
    // 7. Verificar que el archivo de logs existe
    const logsPath = path.join(process.cwd(), 'src/lib/api/logs-clientes.ts');
    if (fs.existsSync(logsPath)) {
      console.log('✅ src/lib/api/logs-clientes.ts existe');
    } else {
      console.log('⚠️ src/lib/api/logs-clientes.ts no encontrado (opcional)');
    }
    
    // 8. Verificar package.json para dependencias
    const packageJsonPath = path.join(process.cwd(), 'package.json');
    if (fs.existsSync(packageJsonPath)) {
      const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
      
      console.log('\n📦 Verificando dependencias...');
      const requiredDeps = [
        'react', 'next', 'typescript', 'tailwindcss', 
        'framer-motion', 'lucide-react', '@radix-ui/react-switch'
      ];
      
      const allDeps = {
        ...packageJson.dependencies,
        ...packageJson.devDependencies
      };
      
      requiredDeps.forEach(dep => {
        if (allDeps[dep]) {
          console.log(`✅ ${dep}: ${allDeps[dep]}`);
        } else {
          console.log(`❌ ${dep}: NO INSTALADO`);
        }
      });
    }
    
    // 9. Verificar archivo de configuración de Tailwind
    const tailwindConfigPath = path.join(process.cwd(), 'tailwind.config.ts');
    if (fs.existsSync(tailwindConfigPath)) {
      console.log('✅ tailwind.config.ts existe');
    } else {
      console.log('❌ tailwind.config.ts no encontrado');
    }
    
    // 10. Verificar archivo de configuración de TypeScript
    const tsConfigPath = path.join(process.cwd(), 'tsconfig.json');
    if (fs.existsSync(tsConfigPath)) {
      console.log('✅ tsconfig.json existe');
    } else {
      console.log('❌ tsconfig.json no encontrado');
    }
    
    console.log('\n🎉 Verificación de dependencias completada');
    
  } catch (error) {
    console.error('❌ Error verificando dependencias:', error);
  }
}

// Ejecutar si se llama directamente
if (require.main === module) {
  checkClientesDependencies();
}

export { checkClientesDependencies }; 