import { config } from 'dotenv';
import path from 'path';
import fs from 'fs';

// Cargar variables de entorno
config({ path: path.join(__dirname, '../.env.local') });

async function actualizarMigraciones() {
  console.log('🔧 Actualizando archivo de migraciones con motivos normalizados...\n');

  try {
    const archivoMigraciones = path.join(__dirname, '../src/lib/database-migrations.ts');
    
    // Leer el archivo actual
    let contenido = fs.readFileSync(archivoMigraciones, 'utf8');
    
    // Buscar y reemplazar la constraint antigua
    const constraintAntigua = /motivo TEXT CHECK \(motivo IN \('falta_aviso', 'licencia', 'permiso', 'inasistencia'\)\) DEFAULT 'falta_aviso'/;
    const constraintNueva = "motivo TEXT CHECK (motivo IN ('falta_asignacion', 'falta_con_aviso', 'ausencia_temporal', 'renuncia')) DEFAULT 'falta_asignacion'";
    
    if (constraintAntigua.test(contenido)) {
      contenido = contenido.replace(constraintAntigua, constraintNueva);
      console.log('✅ Constraint actualizada en database-migrations.ts');
    } else {
      console.log('⚠️ No se encontró la constraint antigua en database-migrations.ts');
    }
    
    // Buscar y reemplazar valores por defecto
    contenido = contenido.replace(/'falta_aviso'/g, "'falta_asignacion'");
    console.log('✅ Valores por defecto actualizados');
    
    // Guardar el archivo actualizado
    fs.writeFileSync(archivoMigraciones, contenido, 'utf8');
    
    console.log('✅ Archivo database-migrations.ts actualizado exitosamente');
    
    // Crear archivo de documentación de cambios
    const documentacion = `# Normalización de Motivos PPC

## Cambios Realizados

### Valores Normalizados
- **falta_asignacion**: No hay guardia asignado al puesto
- **falta_con_aviso**: Guardia avisó que no puede asistir
- **ausencia_temporal**: Guardia temporalmente ausente (licencia, permiso, etc.)
- **renuncia**: Guardia renunció o fue desvinculado

### Mapeo de Valores Antiguos
- 'falta_aviso' → 'falta_con_aviso'
- 'licencia' → 'ausencia_temporal'
- 'permiso' → 'ausencia_temporal'
- 'inasistencia' → 'ausencia_temporal'
- 'desvinculacion' → 'renuncia'

### Archivos Modificados
- \`src/lib/database-migrations.ts\`: Constraint actualizada
- \`scripts/normalizar-motivos-ppc.sql\`: Script de migración creado

### Fecha de Cambio
${new Date().toISOString()}

### Notas
- Se mantiene compatibilidad con datos existentes
- Se crearon backups automáticos
- Incluye instrucciones de rollback
`;

    fs.writeFileSync(path.join(__dirname, 'NORMALIZACION_MOTIVOS_PPC.md'), documentacion, 'utf8');
    console.log('✅ Documentación creada en NORMALIZACION_MOTIVOS_PPC.md');
    
    console.log('\n📋 Resumen de cambios:');
    console.log('   - Constraint actualizada en database-migrations.ts');
    console.log('   - Valores por defecto normalizados');
    console.log('   - Documentación generada');
    console.log('   - Script de migración SQL creado');
    
  } catch (error) {
    console.error('❌ Error actualizando migraciones:', error);
    process.exit(1);
  }
}

// Ejecutar la actualización
actualizarMigraciones()
  .then(() => {
    console.log('\n✅ Proceso completado exitosamente');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Error fatal:', error);
    process.exit(1);
  }); 