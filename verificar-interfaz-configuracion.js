require('dotenv').config({ path: '.env.local' });
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.POSTGRES_URL,
  ssl: { rejectUnauthorized: false }
});

// Mapeo corregido (igual al del frontend)
const MODULO_PREFIXES = {
  'clientes': ['clientes'],
  'instalaciones': ['instalaciones'],
  'guardias': ['guardias'],
  'pauta-diaria': ['pautas'], // CORREGIDO
  'pauta-mensual': ['pautas'], // CORREGIDO
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

async function verificarInterfazConfiguracion() {
  try {
    console.log('🔍 VERIFICANDO INTERFAZ DE CONFIGURACIÓN');
    console.log('==========================================');
    
    // 1. Obtener el rol Operador
    const rol = await pool.query(`SELECT id, nombre FROM roles WHERE nombre = 'Operador'`);
    if (rol.rows.length === 0) {
      console.log('❌ Rol Operador no encontrado');
      return;
    }
    const rolId = rol.rows[0].id;
    console.log(`📋 Rol: ${rol.rows[0].nombre} (ID: ${rolId})`);
    
    // 2. Obtener todos los permisos del rol
    const permisos = await pool.query(`
      SELECT p.clave, p.descripcion
      FROM roles_permisos rp
      JOIN permisos p ON rp.permiso_id = p.id
      WHERE rp.rol_id = $1
      ORDER BY p.clave
    `, [rolId]);
    
    console.log(`\n📊 Permisos actuales del rol Operador (${permisos.rows.length}):`);
    permisos.rows.forEach(p => console.log(`   - ${p.clave}: ${p.descripcion}`));
    
    // 3. Simular la lógica de la interfaz para calcular niveles
    console.log('\n🎯 SIMULANDO INTERFAZ DE CONFIGURACIÓN:');
    console.log('========================================');
    
    const modulos = [
      'pauta-diaria',
      'pauta-mensual', 
      'central-monitoring',
      'turnos',
      'clientes',
      'instalaciones',
      'guardias',
      'configuracion'
    ];
    
    modulos.forEach(modulo => {
      const prefixes = MODULO_PREFIXES[modulo] || [modulo];
      
      // Obtener permisos del módulo
      const permisosDelModulo = permisos.rows.filter(p => 
        prefixes.some(prefix => p.clave.startsWith(prefix + '.'))
      );
      
      // Calcular nivel
      let nivel = 'none';
      if (permisosDelModulo.length === 0) {
        nivel = 'none';
      } else if (permisosDelModulo.some(p => p.clave.includes('.*'))) {
        nivel = 'admin';
      } else if (permisosDelModulo.length >= 4) {
        nivel = 'admin';
      } else if (permisosDelModulo.some(p => 
        p.clave.includes('.create') || 
        p.clave.includes('.edit') || 
        p.clave.includes('.delete')
      )) {
        nivel = 'edit';
      } else {
        nivel = 'view';
      }
      
      const iconos = {
        'none': '🚫',
        'view': '👁️',
        'edit': '✏️',
        'admin': '⚙️'
      };
      
      console.log(`   ${iconos[nivel]} ${modulo}: ${nivel.toUpperCase()} (${permisosDelModulo.length} permisos)`);
      if (permisosDelModulo.length > 0) {
        permisosDelModulo.forEach(p => console.log(`      - ${p.clave}`));
      }
    });
    
    console.log('\n🎉 VERIFICACIÓN COMPLETADA');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await pool.end();
  }
}

verificarInterfazConfiguracion();
