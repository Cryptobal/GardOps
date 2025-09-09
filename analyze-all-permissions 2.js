const { sql } = require('@vercel/postgres');
require('dotenv').config({ path: '.env.local' });

(async () => {
  try {
    console.log('🔍 ANÁLISIS COMPLETO DEL SISTEMA DE PERMISOS...\n');
    
    const tenantId = '1397e653-a702-4020-9702-3ae4f3f8b337';
    
    // 1. TODOS LOS ROLES
    const rolesData = await sql`
      SELECT id, nombre FROM roles 
      WHERE tenant_id = ${tenantId}
      ORDER BY nombre
    `;
    
    console.log('🎭 ROLES DISPONIBLES:');
    rolesData.rows.forEach((r, i) => {
      console.log(`${i+1}. ${r.nombre}`);
    });
    
    // 2. MÓDULOS DEL MENÚ Y SUS PERMISOS REQUERIDOS
    const modulosMenu = [
      { nombre: 'Inicio', permisos: [] }, // Sin permisos
      { nombre: 'Clientes', permisos: ['clientes.view'] },
      { nombre: 'Instalaciones', permisos: ['instalaciones.view'] },
      { nombre: 'Guardias', permisos: ['guardias.view'] },
      { nombre: 'Pauta Mensual', permisos: ['pautas.view'] },
      { nombre: 'Pauta Diaria', permisos: ['pautas.view'] },
      { nombre: 'Central de Monitoreo', permisos: ['central_monitoring.view'] },
      { nombre: 'Turnos Extras', permisos: ['turnos.view'] },
      { nombre: 'Payroll', permisos: ['payroll.view'] },
      { nombre: 'PPC', permisos: ['ppc.view'] },
      { nombre: 'Documentos', permisos: ['documentos.view'] },
      { nombre: 'Alertas y KPIs', permisos: ['reportes.view'] },
      { nombre: 'Asignaciones', permisos: ['asignaciones.view'] },
      { nombre: 'Configuración', permisos: ['configuracion.view'] }
    ];
    
    // 3. ANÁLISIS POR ROL
    console.log('\n📊 ANÁLISIS DE ACCESO POR ROL:\n');
    
    for (const rol of rolesData.rows) {
      console.log(`🎭 ROL: ${rol.nombre}`);
      console.log('=' .repeat(50));
      
      // Obtener permisos del rol
      const permisosRol = await sql`
        SELECT p.clave, p.categoria
        FROM roles_permisos rp
        JOIN permisos p ON rp.permiso_id = p.id
        WHERE rp.rol_id = ${rol.id}
        ORDER BY p.categoria, p.clave
      `;
      
      const permisosSet = new Set(permisosRol.rows.map(p => p.clave));
      
      console.log(`📋 Permisos asignados: ${permisosRol.rows.length}`);
      if (permisosRol.rows.length === 0) {
        console.log('❌ SIN PERMISOS ASIGNADOS');
      }
      
      // Verificar acceso a cada módulo
      console.log('\n🚪 ACCESO A MÓDULOS:');
      modulosMenu.forEach(modulo => {
        let tieneAcceso = false;
        
        if (modulo.permisos.length === 0) {
          // Módulo sin permisos requeridos (como Inicio)
          tieneAcceso = true;
        } else {
          // Verificar si tiene alguno de los permisos requeridos
          tieneAcceso = modulo.permisos.some(perm => {
            // Verificar permiso exacto o wildcard
            return permisosSet.has(perm) || 
                   permisosSet.has(perm.split('.')[0] + '.*') ||
                   permisosSet.has('*');
          });
        }
        
        const status = tieneAcceso ? '✅ PUEDE ACCEDER' : '❌ SIN ACCESO';
        const permisosStr = modulo.permisos.length > 0 ? `(requiere: ${modulo.permisos.join(', ')})` : '(sin permisos)';
        console.log(`  ${modulo.nombre}: ${status} ${permisosStr}`);
      });
      
      console.log('\n');
    }
    
    // 4. USUARIOS Y SUS ROLES
    console.log('👥 USUARIOS Y SUS ROLES:');
    const usuarios = await sql`
      SELECT u.email, u.nombre, r.nombre as rol
      FROM usuarios u
      LEFT JOIN usuarios_roles ur ON u.id = ur.usuario_id
      LEFT JOIN roles r ON ur.rol_id = r.id
      ORDER BY u.email
    `;
    
    usuarios.rows.forEach(u => {
      console.log(`• ${u.email} (${u.nombre}) → ${u.rol || 'SIN ROL'}`);
    });
    
    await sql.end();
  } catch (error) {
    console.error('Error:', error);
  }
})();
