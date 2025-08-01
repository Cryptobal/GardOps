import { query } from '../src/lib/database';
import * as fs from 'fs';
import * as path from 'path';

async function detectarReferenciasAntiguas() {
  console.log('🔍 DETECTANDO REFERENCIAS A TABLAS ANTIGUAS\n');

  // =====================================================
  // 1. VERIFICAR EXISTENCIA DE TABLAS ANTIGUAS
  // =====================================================
  console.log('📋 1. VERIFICANDO EXISTENCIA DE TABLAS ANTIGUAS:');
  
  const tablasAntiguas = [
    'turnos_instalacion',
    'roles_servicio',
    'requisitos_puesto',
    'puestos_por_cubrir',
    'asignaciones_guardias'
  ];

  const tablasAntiguasExistentes = [];
  const tablasAntiguasInexistentes = [];

  for (const tabla of tablasAntiguas) {
    const result = await query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_name = $1
      ) as existe
    `, [tabla]);
    
    if (result.rows[0].existe) {
      tablasAntiguasExistentes.push(tabla);
      console.log(`⚠️ ${tabla} - EXISTE (DEBE MIGRARSE)`);
    } else {
      tablasAntiguasInexistentes.push(tabla);
      console.log(`✅ ${tabla} - NO EXISTE (correcto)`);
    }
  }

  // =====================================================
  // 2. BUSCAR REFERENCIAS EN ARCHIVOS
  // =====================================================
  console.log('\n📋 2. BUSCANDO REFERENCIAS EN ARCHIVOS:');
  
  const directorios = [
    'src/app/api',
    'src/lib/api',
    'src/lib/schemas',
    'src/app/instalaciones',
    'scripts'
  ];

  const referenciasEncontradas: { archivo: string; linea: string; tabla: string }[] = [];

  for (const directorio of directorios) {
    if (fs.existsSync(directorio)) {
      const archivos = obtenerArchivosRecursivamente(directorio, ['.ts', '.tsx', '.js', '.jsx']);
      
      for (const archivo of archivos) {
        const contenido = fs.readFileSync(archivo, 'utf8');
        const lineas = contenido.split('\n');
        
        for (let i = 0; i < lineas.length; i++) {
          const linea = lineas[i];
          const numeroLinea = i + 1;
          
          for (const tabla of tablasAntiguas) {
            if (linea.includes(tabla)) {
              referenciasEncontradas.push({
                archivo: archivo,
                linea: `${numeroLinea}: ${linea.trim()}`,
                tabla: tabla
              });
            }
          }
        }
      }
    }
  }

  // Agrupar referencias por tabla
  const referenciasPorTabla: { [key: string]: any[] } = {};
  tablasAntiguas.forEach(tabla => {
    referenciasPorTabla[tabla] = referenciasEncontradas.filter(ref => ref.tabla === tabla);
  });

  // Mostrar resultados
  for (const tabla of tablasAntiguas) {
    const referencias = referenciasPorTabla[tabla];
    console.log(`\n📋 Referencias a ${tabla}:`);
    
    if (referencias.length === 0) {
      console.log(`   ✅ No se encontraron referencias`);
    } else {
      console.log(`   ⚠️ ${referencias.length} referencias encontradas:`);
      referencias.forEach(ref => {
        console.log(`   - ${ref.archivo}: ${ref.linea}`);
      });
    }
  }

  // =====================================================
  // 3. VERIFICAR ENDPOINTS QUE USAN TABLAS ANTIGUAS
  // =====================================================
  console.log('\n📋 3. VERIFICANDO ENDPOINTS QUE USAN TABLAS ANTIGUAS:');
  
  const endpointsADO = [
    '/api/instalaciones/[id]/turnos',
    '/api/instalaciones/[id]/ppc',
    '/api/roles-servicio'
  ];

  for (const endpoint of endpointsADO) {
    console.log(`\n📡 Endpoint: ${endpoint}`);
    
    // Buscar archivo del endpoint
    const archivoEndpoint = `src/app${endpoint}/route.ts`;
    if (fs.existsSync(archivoEndpoint)) {
      const contenido = fs.readFileSync(archivoEndpoint, 'utf8');
      
      for (const tabla of tablasAntiguas) {
        if (contenido.includes(tabla)) {
          console.log(`   ⚠️ Usa tabla antigua: ${tabla}`);
        }
      }
    }
  }

  // =====================================================
  // 4. VERIFICAR COMPONENTES FRONTEND
  // =====================================================
  console.log('\n📋 4. VERIFICANDO COMPONENTES FRONTEND:');
  
  const componentesFrontend = [
    'src/app/instalaciones/[id]/components/TurnosInstalacion.tsx',
    'src/app/instalaciones/[id]/components/AsignarGuardiaModal.tsx'
  ];

  for (const componente of componentesFrontend) {
    if (fs.existsSync(componente)) {
      console.log(`\n🎨 Componente: ${componente}`);
      const contenido = fs.readFileSync(componente, 'utf8');
      
      for (const tabla of tablasAntiguas) {
        if (contenido.includes(tabla)) {
          console.log(`   ⚠️ Referencia a tabla antigua: ${tabla}`);
        }
      }
    }
  }

  // =====================================================
  // 5. VERIFICAR APIs CLIENTE
  // =====================================================
  console.log('\n📋 5. VERIFICANDO APIs CLIENTE:');
  
  const apisCliente = [
    'src/lib/api/instalaciones.ts',
    'src/lib/api/roles-servicio.ts'
  ];

  for (const api of apisCliente) {
    if (fs.existsSync(api)) {
      console.log(`\n🔌 API: ${api}`);
      const contenido = fs.readFileSync(api, 'utf8');
      
      for (const tabla of tablasAntiguas) {
        if (contenido.includes(tabla)) {
          console.log(`   ⚠️ Referencia a tabla antigua: ${tabla}`);
        }
      }
    }
  }

  // =====================================================
  // 6. RESUMEN FINAL
  // =====================================================
  console.log('\n📋 6. RESUMEN DE DETECCIÓN:');
  
  console.log(`📊 Tablas antiguas existentes: ${tablasAntiguasExistentes.length}/${tablasAntiguas.length}`);
  console.log(`📊 Referencias encontradas: ${referenciasEncontradas.length}`);
  
  const totalReferencias = referenciasEncontradas.length;
  const referenciasPorTablaCount = Object.values(referenciasPorTabla).map(refs => refs.length);
  
  console.log('\n📊 Referencias por tabla:');
  tablasAntiguas.forEach(tabla => {
    const count = referenciasPorTabla[tabla].length;
    console.log(`   - ${tabla}: ${count} referencias`);
  });

  console.log('\n🎯 RECOMENDACIONES:');
  
  if (tablasAntiguasExistentes.length > 0) {
    console.log('1. ⚠️ MIGRAR DATOS DE TABLAS ANTIGUAS:');
    tablasAntiguasExistentes.forEach(tabla => {
      console.log(`   - Migrar datos de ${tabla} a su equivalente ADO`);
    });
  }
  
  if (totalReferencias > 0) {
    console.log('2. ⚠️ ACTUALIZAR CÓDIGO:');
    console.log('   - Reemplazar referencias a tablas antiguas por tablas ADO');
    console.log('   - Actualizar queries SQL en endpoints');
    console.log('   - Actualizar componentes frontend');
  }
  
  console.log('3. ✅ VERIFICAR FUNCIONALIDAD:');
  console.log('   - Probar endpoints después de la migración');
  console.log('   - Verificar que el frontend funcione correctamente');
  
  console.log('4. 📝 ACTUALIZAR DOCUMENTACIÓN:');
  console.log('   - Actualizar README del módulo ADO');
  console.log('   - Documentar cambios en la estructura');

  console.log('\n✅ Detección de referencias antiguas completada');
}

function obtenerArchivosRecursivamente(dir: string, extensiones: string[]): string[] {
  const archivos: string[] = [];
  
  function explorarDirectorio(directorio: string) {
    const items = fs.readdirSync(directorio);
    
    for (const item of items) {
      const rutaCompleta = path.join(directorio, item);
      const stat = fs.statSync(rutaCompleta);
      
      if (stat.isDirectory()) {
        explorarDirectorio(rutaCompleta);
      } else if (stat.isFile()) {
        const extension = path.extname(item);
        if (extensiones.includes(extension)) {
          archivos.push(rutaCompleta);
        }
      }
    }
  }
  
  explorarDirectorio(dir);
  return archivos;
}

// Ejecutar la detección
detectarReferenciasAntiguas().catch(console.error); 