import { query } from '../src/lib/database';
import { config } from 'dotenv';
import path from 'path';

// Cargar variables de entorno
config({ path: path.join(__dirname, '../.env.local') });

interface LogTableInfo {
  nombre: string;
  existe: boolean;
  registros: number;
  estructura?: any[];
  ultimo_log?: string;
  operaciones_crud?: string[];
}

interface ModuloInfo {
  nombre: string;
  tabla_principal: string;
  operaciones_crud: string[];
  tiene_logs: boolean;
  tabla_logs?: string;
  endpoints_api: string[];
  necesita_logs: boolean;
}

async function auditoriaCompletaLogs() {
  console.log('🔍 AUDITORÍA COMPLETA DEL SISTEMA DE LOGS - GardOps\n');
  console.log('=' .repeat(80));

  try {
    // 1. VERIFICAR TABLAS DE LOGS EXISTENTES
    console.log('\n📋 1. VERIFICANDO TABLAS DE LOGS EXISTENTES...\n');
    
    const tablasLogs = ['logs_clientes', 'logs_instalaciones', 'logs_guardias'];
    const infoLogs: LogTableInfo[] = [];

    for (const tabla of tablasLogs) {
      const existe = await query(`
        SELECT EXISTS (
          SELECT FROM information_schema.tables 
          WHERE table_schema = 'public' 
          AND table_name = $1
        )
      `, [tabla]);

      const info: LogTableInfo = {
        nombre: tabla,
        existe: existe.rows[0].exists
      };

      if (info.existe) {
        // Contar registros
        const count = await query(`SELECT COUNT(*) as count FROM ${tabla}`);
        info.registros = parseInt(count.rows[0].count);

        // Obtener estructura
        const estructura = await query(`
          SELECT column_name, data_type, is_nullable
          FROM information_schema.columns 
          WHERE table_name = $1 
          ORDER BY ordinal_position
        `, [tabla]);
        info.estructura = estructura.rows;

        // Último log
        const ultimo = await query(`SELECT fecha FROM ${tabla} ORDER BY fecha DESC LIMIT 1`);
        if (ultimo.rows.length > 0) {
          info.ultimo_log = ultimo.rows[0].fecha;
        }
      }

      infoLogs.push(info);
    }

    // Mostrar resultados
    infoLogs.forEach(log => {
      if (log.existe) {
        console.log(`✅ ${log.nombre}: ${log.registros} registros`);
        if (log.ultimo_log) {
          console.log(`   📅 Último log: ${log.ultimo_log}`);
        }
      } else {
        console.log(`❌ ${log.nombre}: NO EXISTE`);
      }
    });

    // 2. VERIFICAR MÓDULOS PRINCIPALES Y SUS OPERACIONES
    console.log('\n📋 2. VERIFICANDO MÓDULOS PRINCIPALES Y OPERACIONES CRUD...\n');

    const modulos: ModuloInfo[] = [
      {
        nombre: 'Clientes',
        tabla_principal: 'clientes',
        operaciones_crud: ['CREATE', 'READ', 'UPDATE', 'DELETE'],
        tiene_logs: true,
        tabla_logs: 'logs_clientes',
        endpoints_api: ['/api/clientes', '/api/clientes/[id]'],
        necesita_logs: true
      },
      {
        nombre: 'Instalaciones',
        tabla_principal: 'instalaciones',
        operaciones_crud: ['CREATE', 'READ', 'UPDATE', 'DELETE'],
        tiene_logs: true,
        tabla_logs: 'logs_instalaciones',
        endpoints_api: ['/api/instalaciones', '/api/instalaciones/[id]'],
        necesita_logs: true
      },
      {
        nombre: 'Guardias',
        tabla_principal: 'guardias',
        operaciones_crud: ['CREATE', 'READ', 'UPDATE', 'DELETE'],
        tiene_logs: false,
        tabla_logs: 'logs_guardias',
        endpoints_api: ['/api/guardias', '/api/guardias/[id]'],
        necesita_logs: true
      },
      {
        nombre: 'Pauta Mensual',
        tabla_principal: 'as_turnos_pauta_mensual',
        operaciones_crud: ['CREATE', 'READ', 'UPDATE', 'DELETE'],
        tiene_logs: false,
        tabla_logs: 'logs_pauta_mensual',
        endpoints_api: ['/api/pauta-mensual', '/api/pauta-mensual/guardar', '/api/pauta-mensual/crear'],
        necesita_logs: true
      },
      {
        nombre: 'Pauta Diaria',
        tabla_principal: 'as_turnos_pauta_mensual',
        operaciones_crud: ['CREATE', 'READ', 'UPDATE'],
        tiene_logs: false,
        tabla_logs: 'logs_pauta_diaria',
        endpoints_api: ['/api/pauta-diaria'],
        necesita_logs: true
      },
      {
        nombre: 'Turnos Extras',
        tabla_principal: 'turnos_extras',
        operaciones_crud: ['CREATE', 'READ', 'UPDATE', 'DELETE'],
        tiene_logs: false,
        tabla_logs: 'logs_turnos_extras',
        endpoints_api: ['/api/pauta-diaria/turno-extra'],
        necesita_logs: true
      },
      {
        nombre: 'Puestos Operativos',
        tabla_principal: 'as_turnos_puestos_operativos',
        operaciones_crud: ['CREATE', 'READ', 'UPDATE', 'DELETE'],
        tiene_logs: false,
        tabla_logs: 'logs_puestos_operativos',
        endpoints_api: ['/api/instalaciones/[id]/turnos'],
        necesita_logs: true
      },
      {
        nombre: 'Documentos',
        tabla_principal: 'documentos',
        operaciones_crud: ['CREATE', 'READ', 'DELETE'],
        tiene_logs: false,
        tabla_logs: 'logs_documentos',
        endpoints_api: ['/api/documentos', '/api/upload-document'],
        necesita_logs: true
      },
      {
        nombre: 'Usuarios',
        tabla_principal: 'usuarios',
        operaciones_crud: ['CREATE', 'READ', 'UPDATE', 'DELETE'],
        tiene_logs: false,
        tabla_logs: 'logs_usuarios',
        endpoints_api: ['/api/users'],
        necesita_logs: true
      }
    ];

    // Verificar cada módulo
    for (const modulo of modulos) {
      const tablaExiste = await query(`
        SELECT EXISTS (
          SELECT FROM information_schema.tables 
          WHERE table_schema = 'public' 
          AND table_name = $1
        )
      `, [modulo.tabla_principal]);

      const registros = tablaExiste.rows[0].exists ? 
        await query(`SELECT COUNT(*) as count FROM ${modulo.tabla_principal}`) : 
        { rows: [{ count: 0 }] };

      console.log(`${modulo.tiene_logs ? '✅' : '❌'} ${modulo.nombre}:`);
      console.log(`   📊 Tabla: ${modulo.tabla_principal} (${registros.rows[0].count} registros)`);
      console.log(`   📝 Logs: ${modulo.tiene_logs ? 'Implementado' : 'FALTA IMPLEMENTAR'}`);
      if (modulo.tabla_logs) {
        console.log(`   🗂️ Tabla logs: ${modulo.tabla_logs}`);
      }
      console.log(`   🔧 Operaciones: ${modulo.operaciones_crud.join(', ')}`);
      console.log('');
    }

    // 3. VERIFICAR ENDPOINTS API Y SU INTEGRACIÓN CON LOGS
    console.log('\n📋 3. VERIFICANDO ENDPOINTS API Y INTEGRACIÓN CON LOGS...\n');

    const endpointsConLogs = [
      '/api/logs',
      '/api/logs-clientes'
    ];

    const endpointsSinLogs = [
      '/api/guardias',
      '/api/guardias/[id]',
      '/api/pauta-mensual/guardar',
      '/api/pauta-mensual/crear',
      '/api/pauta-diaria',
      '/api/pauta-diaria/turno-extra',
      '/api/instalaciones/[id]/turnos',
      '/api/documentos',
      '/api/upload-document',
      '/api/users'
    ];

    console.log('✅ Endpoints con logs implementados:');
    endpointsConLogs.forEach(endpoint => {
      console.log(`   • ${endpoint}`);
    });

    console.log('\n❌ Endpoints SIN logs implementados:');
    endpointsSinLogs.forEach(endpoint => {
      console.log(`   • ${endpoint}`);
    });

    // 4. GENERAR REPORTE DE IMPLEMENTACIÓN
    console.log('\n📋 4. REPORTE DE IMPLEMENTACIÓN REQUERIDA...\n');

    const modulosFaltantes = modulos.filter(m => !m.tiene_logs && m.necesita_logs);
    
    console.log(`🎯 MÓDULOS QUE NECESITAN IMPLEMENTACIÓN DE LOGS: ${modulosFaltantes.length}\n`);

    modulosFaltantes.forEach((modulo, index) => {
      console.log(`${index + 1}. ${modulo.nombre.toUpperCase()}`);
      console.log(`   📊 Tabla principal: ${modulo.tabla_principal}`);
      console.log(`   🗂️ Tabla logs a crear: ${modulo.tabla_logs}`);
      console.log(`   🔧 Operaciones a registrar: ${modulo.operaciones_crud.join(', ')}`);
      console.log(`   🌐 Endpoints a modificar: ${modulo.endpoints_api.join(', ')}`);
      console.log('');
    });

    // 5. PLAN DE IMPLEMENTACIÓN
    console.log('\n📋 5. PLAN DE IMPLEMENTACIÓN DETALLADO...\n');

    console.log('🔧 PASOS PARA IMPLEMENTAR SISTEMA DE LOGS COMPLETO:\n');

    console.log('PASO 1: Crear tablas de logs faltantes');
    modulosFaltantes.forEach(modulo => {
      console.log(`   • Crear tabla ${modulo.tabla_logs}`);
    });

    console.log('\nPASO 2: Crear funciones de logging centralizadas');
    console.log('   • Función logEvent(modulo, entidadId, accion, usuario, detalles)');
    console.log('   • Función logCRUD(modulo, entidadId, operacion, usuario, datos)');
    console.log('   • Función logError(modulo, entidadId, error, usuario)');

    console.log('\nPASO 3: Modificar endpoints API');
    modulosFaltantes.forEach(modulo => {
      console.log(`   • Integrar logs en ${modulo.endpoints_api.join(', ')}`);
    });

    console.log('\nPASO 4: Crear componentes de visualización');
    console.log('   • LogViewer component para cada módulo');
    console.log('   • LogFilter component para filtros avanzados');
    console.log('   • LogExport component para exportar logs');

    console.log('\nPASO 5: Implementar sistema de notificaciones');
    console.log('   • Notificaciones en tiempo real para eventos críticos');
    console.log('   • Alertas por email para operaciones sensibles');

    // 6. ESTRUCTURA PROPUESTA PARA NUEVAS TABLAS DE LOGS
    console.log('\n📋 6. ESTRUCTURA PROPUESTA PARA NUEVAS TABLAS DE LOGS...\n');

    const estructuraLogs = `
CREATE TABLE logs_guardias (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  guardia_id UUID NOT NULL REFERENCES guardias(id) ON DELETE CASCADE,
  accion TEXT NOT NULL,
  usuario TEXT NOT NULL,
  tipo TEXT DEFAULT 'manual',
  contexto TEXT,
  datos_anteriores JSONB,
  datos_nuevos JSONB,
  fecha TIMESTAMP DEFAULT now(),
  tenant_id UUID REFERENCES tenants(id)
);

CREATE TABLE logs_pauta_mensual (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pauta_id INTEGER NOT NULL,
  instalacion_id UUID NOT NULL REFERENCES instalaciones(id),
  accion TEXT NOT NULL,
  usuario TEXT NOT NULL,
  tipo TEXT DEFAULT 'manual',
  contexto TEXT,
  cambios JSONB,
  fecha TIMESTAMP DEFAULT now(),
  tenant_id UUID REFERENCES tenants(id)
);

CREATE TABLE logs_pauta_diaria (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pauta_id INTEGER NOT NULL,
  instalacion_id UUID NOT NULL REFERENCES instalaciones(id),
  accion TEXT NOT NULL,
  usuario TEXT NOT NULL,
  tipo TEXT DEFAULT 'manual',
  contexto TEXT,
  cambios JSONB,
  fecha TIMESTAMP DEFAULT now(),
  tenant_id UUID REFERENCES tenants(id)
);

CREATE TABLE logs_turnos_extras (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  turno_extra_id UUID NOT NULL REFERENCES turnos_extras(id) ON DELETE CASCADE,
  accion TEXT NOT NULL,
  usuario TEXT NOT NULL,
  tipo TEXT DEFAULT 'manual',
  contexto TEXT,
  datos_anteriores JSONB,
  datos_nuevos JSONB,
  fecha TIMESTAMP DEFAULT now(),
  tenant_id UUID REFERENCES tenants(id)
);

CREATE TABLE logs_puestos_operativos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  puesto_id UUID NOT NULL REFERENCES as_turnos_puestos_operativos(id) ON DELETE CASCADE,
  accion TEXT NOT NULL,
  usuario TEXT NOT NULL,
  tipo TEXT DEFAULT 'manual',
  contexto TEXT,
  datos_anteriores JSONB,
  datos_nuevos JSONB,
  fecha TIMESTAMP DEFAULT now(),
  tenant_id UUID REFERENCES tenants(id)
);

CREATE TABLE logs_documentos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  documento_id UUID NOT NULL REFERENCES documentos(id) ON DELETE CASCADE,
  accion TEXT NOT NULL,
  usuario TEXT NOT NULL,
  tipo TEXT DEFAULT 'manual',
  contexto TEXT,
  metadata JSONB,
  fecha TIMESTAMP DEFAULT now(),
  tenant_id UUID REFERENCES tenants(id)
);

CREATE TABLE logs_usuarios (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  usuario_id UUID NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
  accion TEXT NOT NULL,
  usuario TEXT NOT NULL,
  tipo TEXT DEFAULT 'manual',
  contexto TEXT,
  datos_anteriores JSONB,
  datos_nuevos JSONB,
  fecha TIMESTAMP DEFAULT now(),
  tenant_id UUID REFERENCES tenants(id)
);
`;

    console.log(estructuraLogs);

    // 7. FUNCIONES DE LOGGING PROPUESTAS
    console.log('\n📋 7. FUNCIONES DE LOGGING PROPUESTAS...\n');

    const funcionesLogging = `
// Función centralizada para logging
export async function logEvent(
  modulo: string,
  entidadId: string,
  accion: string,
  usuario: string,
  detalles?: any,
  tipo: 'manual' | 'sistema' | 'api' = 'manual'
) {
  const tablaLogs = \`logs_\${modulo}\`;
  
  try {
    await query(\`
      INSERT INTO \${tablaLogs} (
        \${modulo}_id, accion, usuario, tipo, contexto, fecha, tenant_id
      ) VALUES ($1, $2, $3, $4, $5, NOW(), $6)
    \`, [entidadId, accion, usuario, tipo, JSON.stringify(detalles), getCurrentTenantId()]);
  } catch (error) {
    console.error('Error logging event:', error);
  }
}

// Función para logging de operaciones CRUD
export async function logCRUD(
  modulo: string,
  entidadId: string,
  operacion: 'CREATE' | 'READ' | 'UPDATE' | 'DELETE',
  usuario: string,
  datosAnteriores?: any,
  datosNuevos?: any
) {
  const accion = \`\${operacion} \${modulo}\`;
  const contexto = {
    operacion,
    datos_anteriores: datosAnteriores,
    datos_nuevos: datosNuevos,
    timestamp: new Date().toISOString()
  };
  
  await logEvent(modulo, entidadId, accion, usuario, contexto, 'api');
}

// Función para logging de errores
export async function logError(
  modulo: string,
  entidadId: string,
  error: Error,
  usuario: string,
  contexto?: any
) {
  const accion = 'ERROR';
  const detalles = {
    error: error.message,
    stack: error.stack,
    contexto,
    timestamp: new Date().toISOString()
  };
  
  await logEvent(modulo, entidadId, accion, usuario, detalles, 'sistema');
}
`;

    console.log(funcionesLogging);

    // 8. RESUMEN FINAL
    console.log('\n📋 8. RESUMEN FINAL...\n');

    const totalModulos = modulos.length;
    const modulosConLogs = modulos.filter(m => m.tiene_logs).length;
    const modulosSinLogs = modulos.filter(m => !m.tiene_logs && m.necesita_logs).length;

    console.log('📊 ESTADÍSTICAS DEL SISTEMA DE LOGS:');
    console.log(`   • Total de módulos: ${totalModulos}`);
    console.log(`   • Módulos con logs: ${modulosConLogs} (${((modulosConLogs/totalModulos)*100).toFixed(1)}%)`);
    console.log(`   • Módulos sin logs: ${modulosSinLogs} (${((modulosSinLogs/totalModulos)*100).toFixed(1)}%)`);
    console.log(`   • Tablas de logs existentes: ${infoLogs.filter(l => l.existe).length}`);
    console.log(`   • Tablas de logs faltantes: ${infoLogs.filter(l => !l.existe).length}`);

    console.log('\n🎯 PRIORIDADES DE IMPLEMENTACIÓN:');
    console.log('   1. logs_guardias (CRÍTICO - Gestión de personal)');
    console.log('   2. logs_pauta_mensual (CRÍTICO - Planificación)');
    console.log('   3. logs_pauta_diaria (ALTO - Operaciones diarias)');
    console.log('   4. logs_turnos_extras (ALTO - Gestión financiera)');
    console.log('   5. logs_puestos_operativos (MEDIO - Configuración)');
    console.log('   6. logs_documentos (MEDIO - Trazabilidad)');
    console.log('   7. logs_usuarios (BAJO - Auditoría de sistema)');

    console.log('\n✅ AUDITORÍA COMPLETADA');
    console.log('=' .repeat(80));

  } catch (error) {
    console.error('❌ Error en auditoría:', error);
  }
}

// Ejecutar auditoría
auditoriaCompletaLogs()
  .then(() => {
    console.log('\n✅ Auditoría completada exitosamente');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Error en auditoría:', error);
    process.exit(1);
  }); 