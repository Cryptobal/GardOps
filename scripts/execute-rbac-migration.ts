import { query } from '../src/lib/database';
import fs from 'fs';
import path from 'path';

const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m'
};

async function executeRBACMigration() {
  console.log(`${colors.cyan}🚀 EJECUTANDO MIGRACIÓN RBAC${colors.reset}`);
  console.log('='*50);
  
  try {
    // Leer el archivo SQL
    const sqlPath = path.join(__dirname, 'create-rbac-tables-idempotent.sql');
    
    if (!fs.existsSync(sqlPath)) {
      throw new Error(`No se encontró el archivo SQL en: ${sqlPath}`);
    }
    
    console.log(`${colors.blue}📄 Leyendo archivo SQL...${colors.reset}`);
    const sqlContent = fs.readFileSync(sqlPath, 'utf-8');
    
    // Ejecutar el SQL completo de una vez
    // Neon y Postgres pueden manejar múltiples statements
    console.log(`${colors.yellow}⏳ Ejecutando migración completa...${colors.reset}\n`);
    
    try {
      // Ejecutar todo el SQL de una vez
      await query(sqlContent);
      console.log(`${colors.green}✅ SQL ejecutado exitosamente${colors.reset}`);
    } catch (error: any) {
      // Si falla, intentar ejecutar por bloques principales
      console.log(`${colors.yellow}⚠️ Intentando ejecución por bloques...${colors.reset}`);
      
      // Dividir por bloques lógicos principales
      const blocks = sqlContent.split(/\n\n--\s*=+\n/);
      
      for (let i = 0; i < blocks.length; i++) {
        const block = blocks[i].trim();
        if (!block || block.startsWith('--')) continue;
        
        try {
          await query(block);
          console.log(`  ${colors.green}✓ Bloque ${i+1}/${blocks.length} ejecutado${colors.reset}`);
        } catch (blockError: any) {
          if (blockError.message?.includes('already exists')) {
            console.log(`  ${colors.yellow}⊘ Bloque ${i+1}/${blocks.length} - Ya existe${colors.reset}`);
          } else {
            console.log(`  ${colors.red}✗ Bloque ${i+1}/${blocks.length} - Error: ${blockError.message}${colors.reset}`);
          }
        }
      }
    }
    
    // Verificación post-migración
    console.log('\n' + '='*50);
    console.log(`${colors.cyan}📊 VERIFICACIÓN POST-MIGRACIÓN:${colors.reset}`);
      
    // Verificar el resultado
    console.log(`\n${colors.blue}🔍 Verificando tablas creadas...${colors.reset}`);
    
    const verifyQuery = `
      SELECT 
        table_name,
        (SELECT COUNT(*) FROM information_schema.columns WHERE table_name = t.table_name) as num_columns
      FROM information_schema.tables t
      WHERE table_schema = 'public'
        AND table_name IN ('usuarios', 'roles', 'permisos', 'usuarios_roles', 'roles_permisos')
      ORDER BY table_name;
    `;
    
    const tables = await query(verifyQuery);
    const tableRows = Array.isArray(tables) ? tables : (tables.rows || []);
    
    console.log('\nTablas RBAC:');
    tableRows.forEach((table: any) => {
      console.log(`  • ${table.table_name} (${table.num_columns} columnas)`);
    });
    
    // Verificar datos seed
    const seedQuery = `
      SELECT 
        (SELECT COUNT(*) FROM permisos) as num_permisos,
        (SELECT COUNT(*) FROM roles) as num_roles,
        (SELECT COUNT(*) FROM roles_permisos) as num_asignaciones;
    `;
    
    const seeds = await query(seedQuery);
    const seedRows = Array.isArray(seeds) ? seeds : (seeds.rows || []);
    const seed = seedRows[0];
    
    if (seed) {
      console.log('\nDatos seed:');
      console.log(`  • Permisos: ${seed.num_permisos}`);
      console.log(`  • Roles: ${seed.num_roles}`);
      console.log(`  • Asignaciones rol-permiso: ${seed.num_asignaciones}`);
    }
    
    console.log(`\n${colors.green}🎉 Sistema RBAC listo para usar${colors.reset}`);
    console.log(`\n${colors.blue}Próximo paso: Ejecuta 'npx tsx scripts/rbac-smoke.ts' para probar el sistema${colors.reset}`);
    
  } catch (error) {
    console.error(`\n${colors.red}❌ Error fatal en migración:${colors.reset}`, error);
    process.exit(1);
  }
}

// Ejecutar migración
executeRBACMigration().catch(console.error);
