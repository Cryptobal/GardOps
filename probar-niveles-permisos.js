require('dotenv').config({ path: '.env.local' });
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.POSTGRES_URL,
  ssl: { rejectUnauthorized: false }
});

// Mapeo de módulos (igual al del frontend)
const MODULO_PREFIXES = {
  'clientes': ['clientes'],
  'instalaciones': ['instalaciones'],
  'guardias': ['guardias'],
  'pauta-diaria': ['pautas'],
  'pauta-mensual': ['pautas'],
  'documentos': ['documentos'],
  'reportes': ['reportes'],
  'usuarios': ['usuarios'],
  'roles': ['roles'],
  'permisos': ['permisos'],
  'tenants': ['tenants'],
  'estructuras': ['estructuras'],
  'sueldos': ['sueldos'],
  'planillas': ['planillas'],
  'logs': ['logs'],
  'central-monitoring': ['central_monitoring', 'central-monitoring'],
  'configuracion': ['configuracion', 'config'],
  'auditoria': ['auditoria'],
  'rbac': ['rbac'],
  'ppc': ['ppc'],
  'payroll': ['payroll'],
  'turnos': ['turnos', 'turnos_extras'],
  'asignaciones': ['asignaciones']
};

async function probarNivelesPermisos() {
  try {
    console.log('🧪 PROBANDO NIVELES DE PERMISOS');
    console.log('=================================');
    
    // 1. Obtener todos los permisos disponibles
    const permisosDisponibles = await pool.query(`
      SELECT id, clave, descripcion FROM permisos ORDER BY clave
    `);
    
    console.log(`\n📊 Permisos disponibles en BD: ${permisosDisponibles.rows.length}`);
    permisosDisponibles.rows.forEach(p => console.log(`   - ${p.clave}: ${p.descripcion}`));
    
    // 2. Función para obtener ID de permiso
    const getPermisoId = (clave) => {
      const perm = permisosDisponibles.rows.find(p => p.clave === clave);
      return perm ? perm.id : undefined;
    };
    
    // 3. Función para obtener permisos que se asignarían para un nivel
    const obtenerPermisosParaNivel = (modulo, nivel) => {
      const prefixes = MODULO_PREFIXES[modulo] || [modulo];
      const permisos = [];
      
      switch (nivel) {
        case 'admin':
          prefixes.forEach(prefix => {
            // Primero intentar wildcard
            const wildcardId = getPermisoId(`${prefix}.*`);
            if (wildcardId) {
              permisos.push(wildcardId);
            } else {
              // Si no hay wildcard, asignar todos los permisos del módulo
              permisosDisponibles.rows.forEach(p => {
                if (p.clave.startsWith(prefix + '.') && !p.clave.endsWith('.*')) {
                  permisos.push(p.id);
                }
              });
            }
          });
          break;
        case 'edit':
          prefixes.forEach(prefix => {
            // Intentar asignar permisos estándar si existen
            const permisosEstandar = ['view', 'create', 'edit'];
            const permisosEncontrados = permisosEstandar.map(action => getPermisoId(`${prefix}.${action}`)).filter(id => id !== undefined);
            
            if (permisosEncontrados.length > 0) {
              permisos.push(...permisosEncontrados);
            } else {
              // Si no existen permisos estándar, asignar solo algunos permisos (no todos)
              const permisosModulo = permisosDisponibles.rows.filter(p => 
                p.clave.startsWith(prefix + '.') && 
                !p.clave.endsWith('delete') && 
                !p.clave.endsWith('.*')
              );
              
              if (permisosModulo.length > 0) {
                // Para evitar que se detecte como "admin", asignar solo algunos permisos
                const mitad = Math.ceil(permisosModulo.length / 2);
                const permisosSeleccionados = permisosModulo.slice(0, mitad);
                permisosSeleccionados.forEach(p => permisos.push(p.id));
              }
            }
          });
          break;
        case 'view':
          prefixes.forEach(prefix => {
            // Intentar asignar view si existe
            const permisoView = getPermisoId(`${prefix}.view`);
            if (permisoView) {
              permisos.push(permisoView);
            } else {
              // Si no existe view, asignar el primer permiso disponible del módulo
              const primerPermiso = permisosDisponibles.rows.find(p => 
                p.clave.startsWith(prefix + '.') && 
                !p.clave.endsWith('.*')
              );
              if (primerPermiso) {
                permisos.push(primerPermiso.id);
              }
            }
          });
          break;
        case 'none':
        default:
          break;
      }
      
      return permisos;
    };
    
    // 4. Probar diferentes módulos y niveles
    const modulosParaProbar = [
      'pauta-diaria',
      'pauta-mensual', 
      'central-monitoring',
      'turnos',
      'clientes',
      'instalaciones',
      'guardias',
      'configuracion'
    ];
    
    const niveles = ['none', 'view', 'edit', 'admin'];
    
    console.log('\n🎯 PROBANDO DIFERENTES NIVELES:');
    console.log('================================');
    
    modulosParaProbar.forEach(modulo => {
      console.log(`\n📁 MÓDULO: ${modulo}`);
      console.log('─'.repeat(50));
      
      niveles.forEach(nivel => {
        const permisosIds = obtenerPermisosParaNivel(modulo, nivel);
        const permisosClaves = permisosIds.map(id => 
          permisosDisponibles.rows.find(p => p.id === id)?.clave
        ).filter(Boolean);
        
        const iconos = {
          'none': '🚫',
          'view': '👁️',
          'edit': '✏️',
          'admin': '⚙️'
        };
        
        console.log(`   ${iconos[nivel]} ${nivel.toUpperCase()}: ${permisosClaves.length} permisos`);
        if (permisosClaves.length > 0) {
          permisosClaves.forEach(clave => console.log(`      - ${clave}`));
        }
      });
    });
    
    // 5. Verificar si hay inconsistencias
    console.log('\n🔍 VERIFICANDO INCONSISTENCIAS:');
    console.log('================================');
    
    modulosParaProbar.forEach(modulo => {
      const prefixes = MODULO_PREFIXES[modulo] || [modulo];
      const permisosModulo = permisosDisponibles.rows.filter(p => 
        prefixes.some(prefix => p.clave.startsWith(prefix + '.'))
      );
      
      if (permisosModulo.length === 0) {
        console.log(`⚠️  ${modulo}: NO HAY PERMISOS DISPONIBLES`);
        prefixes.forEach(prefix => {
          console.log(`      - Buscando permisos que empiecen con: ${prefix}.`);
        });
      }
    });
    
    console.log('\n🎉 PRUEBA COMPLETADA');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await pool.end();
  }
}

probarNivelesPermisos();
