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
  'guardias': ['guardias']
};

async function probarClientesInstalacionesGuardias() {
  try {
    console.log('🧪 PROBANDO CLIENTES, INSTALACIONES Y GUARDIAS');
    console.log('==============================================');
    
    // 1. Obtener todos los permisos disponibles
    const permisosDisponibles = await pool.query(`
      SELECT id, clave, descripcion FROM permisos ORDER BY clave
    `);
    
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
            }
          });
          break;
        case 'view':
          prefixes.forEach(prefix => {
            // Intentar asignar view si existe
            const permisoView = getPermisoId(`${prefix}.view`);
            if (permisoView) {
              permisos.push(permisoView);
            }
          });
          break;
        case 'none':
        default:
          break;
      }
      
      return permisos;
    };
    
    // 4. Probar los 3 módulos específicos
    const modulosParaProbar = ['clientes', 'instalaciones', 'guardias'];
    const niveles = ['none', 'view', 'edit', 'admin'];
    
    console.log('\n🎯 PROBANDO MÓDULOS ESPECÍFICOS:');
    console.log('==================================');
    
    modulosParaProbar.forEach(modulo => {
      console.log(`\n📁 MÓDULO: ${modulo.toUpperCase()}`);
      console.log('─'.repeat(60));
      
      // Mostrar permisos disponibles para este módulo
      const permisosModulo = permisosDisponibles.rows.filter(p => 
        p.clave.startsWith(modulo + '.')
      );
      
      console.log(`📊 Permisos disponibles (${permisosModulo.length}):`);
      permisosModulo.forEach(p => {
        const icono = p.clave.includes('.*') ? '⚙️' : 
                     p.clave.includes('.create') ? '➕' :
                     p.clave.includes('.edit') ? '✏️' :
                     p.clave.includes('.delete') ? '🗑️' :
                     p.clave.includes('.view') ? '👁️' : '📋';
        console.log(`   ${icono} ${p.clave}: ${p.descripcion}`);
      });
      
      console.log('\n🎛️ NIVELES DE ACCESO:');
      
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
        
        console.log(`\n   ${iconos[nivel]} ${nivel.toUpperCase()}: ${permisosClaves.length} permisos`);
        if (permisosClaves.length > 0) {
          permisosClaves.forEach(clave => {
            const permiso = permisosDisponibles.rows.find(p => p.clave === clave);
            const icono = clave.includes('.*') ? '⚙️' : 
                         clave.includes('.create') ? '➕' :
                         clave.includes('.edit') ? '✏️' :
                         clave.includes('.delete') ? '🗑️' :
                         clave.includes('.view') ? '👁️' : '📋';
            console.log(`      ${icono} ${clave}: ${permiso?.descripcion || 'Sin descripción'}`);
          });
        } else {
          console.log(`      (Sin permisos asignados)`);
        }
      });
    });
    
    // 5. Crear un usuario de prueba para verificar permisos
    console.log('\n🧪 PRUEBA PRÁCTICA CON USUARIO DE PRUEBA:');
    console.log('==========================================');
    
    // Verificar si existe un usuario central@gard.cl
    const usuario = await pool.query(`
      SELECT u.email, u.activo, r.nombre as rol
      FROM usuarios u
      LEFT JOIN usuarios_roles ur ON u.id = ur.usuario_id
      LEFT JOIN roles r ON ur.rol_id = r.id
      WHERE u.email = 'central@gard.cl'
    `);
    
    if (usuario.rows.length > 0) {
      const user = usuario.rows[0];
      console.log(`👤 Usuario: ${user.email}`);
      console.log(`📋 Rol: ${user.rol || 'Sin rol'}`);
      console.log(`✅ Activo: ${user.activo ? 'Sí' : 'No'}`);
      
      // Probar permisos específicos para estos módulos
      const permisosParaProbar = [
        'clientes.view', 'clientes.create', 'clientes.edit', 'clientes.delete',
        'instalaciones.view', 'instalaciones.create', 'instalaciones.edit', 'instalaciones.delete',
        'guardias.view', 'guardias.create', 'guardias.edit', 'guardias.delete'
      ];
      
      console.log('\n🔍 VERIFICANDO PERMISOS REALES:');
      for (const perm of permisosParaProbar) {
        const result = await pool.query(
          `SELECT fn_usuario_tiene_permiso($1::text, $2::text) as tiene`,
          ['central@gard.cl', perm]
        );
        const tiene = result.rows[0].tiene;
        const icono = tiene ? '✅' : '❌';
        console.log(`   ${icono} ${perm}: ${tiene}`);
      }
    } else {
      console.log('❌ Usuario central@gard.cl no encontrado');
    }
    
    console.log('\n🎉 PRUEBA COMPLETADA');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await pool.end();
  }
}

probarClientesInstalacionesGuardias();
