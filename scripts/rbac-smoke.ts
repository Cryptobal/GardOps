import { query } from '../src/lib/database';

// Colores para output
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  gray: '\x1b[90m'
};

async function rbacSmokeTest() {
  console.log(`${colors.cyan}🚀 RBAC SMOKE TEST${colors.reset}`);
  console.log('='*50);
  
  let testPassed = true;
  let transaction = false;
  
  try {
    // Iniciar transacción
    console.log(`\n${colors.blue}📦 Iniciando transacción...${colors.reset}`);
    await query('BEGIN');
    transaction = true;
    
    // ============================================
    // 1. LISTAR ROLES Y PERMISOS EXISTENTES
    // ============================================
    console.log(`\n${colors.yellow}📋 1. LISTANDO ROLES EXISTENTES:${colors.reset}`);
    
    const rolesQuery = `
      SELECT 
        r.id,
        r.nombre,
        r.descripcion,
        r.tenant_id,
        COUNT(DISTINCT rp.permiso_id) as num_permisos
      FROM roles r
      LEFT JOIN roles_permisos rp ON rp.rol_id = r.id
      GROUP BY r.id, r.nombre, r.descripcion, r.tenant_id
      ORDER BY r.nombre;
    `;
    
    const roles = await query(rolesQuery);
    const rolesRows = Array.isArray(roles) ? roles : (roles.rows || []);
    
    if (rolesRows.length > 0) {
      rolesRows.forEach((rol: any) => {
        console.log(`  ${colors.green}✓${colors.reset} ${rol.nombre}: ${rol.descripcion || 'Sin descripción'}`);
        console.log(`    ${colors.gray}Permisos asignados: ${rol.num_permisos}${colors.reset}`);
      });
    } else {
      console.log(`  ${colors.red}❌ No se encontraron roles${colors.reset}`);
      testPassed = false;
    }
    
    console.log(`\n${colors.yellow}📋 2. LISTANDO PERMISOS EXISTENTES:${colors.reset}`);
    
    const permisosQuery = `
      SELECT 
        p.id,
        p.clave,
        p.descripcion,
        COUNT(DISTINCT rp.rol_id) as num_roles_asignados
      FROM permisos p
      LEFT JOIN roles_permisos rp ON rp.permiso_id = p.id
      GROUP BY p.id, p.clave, p.descripcion
      ORDER BY p.clave;
    `;
    
    const permisos = await query(permisosQuery);
    const permisosRows = Array.isArray(permisos) ? permisos : (permisos.rows || []);
    
    if (permisosRows.length > 0) {
      console.log(`  ${colors.green}✓ Encontrados ${permisosRows.length} permisos:${colors.reset}`);
      permisosRows.forEach((permiso: any) => {
        console.log(`    • ${permiso.clave}: ${permiso.descripcion || 'Sin descripción'}`);
        console.log(`      ${colors.gray}Asignado a ${permiso.num_roles_asignados} rol(es)${colors.reset}`);
      });
    } else {
      console.log(`  ${colors.red}❌ No se encontraron permisos${colors.reset}`);
      testPassed = false;
    }
    
    // ============================================
    // 2. CREAR USUARIO DE PRUEBA
    // ============================================
    console.log(`\n${colors.yellow}📋 3. CREANDO USUARIO DE PRUEBA:${colors.reset}`);
    
    // Obtener tenant_id
    const tenantResult = await query('SELECT id FROM tenants LIMIT 1');
    const tenantRows = Array.isArray(tenantResult) ? tenantResult : (tenantResult.rows || []);
    const tenantId = tenantRows[0]?.id;
    
    if (!tenantId) {
      console.log(`  ${colors.red}❌ No se encontró ningún tenant${colors.reset}`);
      testPassed = false;
    } else {
      // Crear usuario demo
      const createUserQuery = `
        INSERT INTO usuarios (
          email,
          password,
          nombre,
          apellido,
          rol,
          activo,
          tenant_id
        ) VALUES (
          'demo.rbac@test.com',
          'hashed_password_demo',
          'Demo',
          'RBAC Test',
          'admin',
          true,
          $1
        )
        RETURNING id, email, nombre, apellido;
      `;
      
      const userResult = await query(createUserQuery, [tenantId]);
      const userRows = Array.isArray(userResult) ? userResult : (userResult.rows || []);
      const newUser = userRows[0];
      
      if (newUser) {
        console.log(`  ${colors.green}✓ Usuario creado:${colors.reset}`);
        console.log(`    Email: ${newUser.email}`);
        console.log(`    Nombre: ${newUser.nombre} ${newUser.apellido}`);
        console.log(`    ID: ${newUser.id}`);
        
        // ============================================
        // 3. ASOCIAR USUARIO AL ROL ADMIN
        // ============================================
        console.log(`\n${colors.yellow}📋 4. ASOCIANDO USUARIO AL ROL ADMIN:${colors.reset}`);
        
        // Obtener rol admin para el tenant
        const adminRoleQuery = `
          SELECT id, nombre 
          FROM roles 
          WHERE nombre = 'admin' 
          AND tenant_id = $1
          LIMIT 1;
        `;
        
        const adminRoleResult = await query(adminRoleQuery, [tenantId]);
        const adminRoleRows = Array.isArray(adminRoleResult) ? adminRoleResult : (adminRoleResult.rows || []);
        const adminRole = adminRoleRows[0];
        
        if (adminRole) {
          // Asociar usuario al rol
          const assignRoleQuery = `
            INSERT INTO usuarios_roles (usuario_id, rol_id)
            VALUES ($1, $2)
            RETURNING usuario_id, rol_id;
          `;
          
          const assignResult = await query(assignRoleQuery, [newUser.id, adminRole.id]);
          const assignRows = Array.isArray(assignResult) ? assignResult : (assignResult.rows || []);
          
          if (assignRows[0]) {
            console.log(`  ${colors.green}✓ Usuario asociado al rol ${adminRole.nombre}${colors.reset}`);
            
            // Verificar permisos efectivos
            console.log(`\n${colors.yellow}📋 5. VERIFICANDO PERMISOS EFECTIVOS:${colors.reset}`);
            
            const userPermissionsQuery = `
              SELECT DISTINCT p.clave, p.descripcion
              FROM usuarios u
              JOIN usuarios_roles ur ON ur.usuario_id = u.id
              JOIN roles r ON r.id = ur.rol_id
              JOIN roles_permisos rp ON rp.rol_id = r.id
              JOIN permisos p ON p.id = rp.permiso_id
              WHERE u.id = $1
              ORDER BY p.clave;
            `;
            
            const permissions = await query(userPermissionsQuery, [newUser.id]);
            const permissionsRows = Array.isArray(permissions) ? permissions : (permissions.rows || []);
            
            if (permissionsRows.length > 0) {
              console.log(`  ${colors.green}✓ El usuario tiene ${permissionsRows.length} permisos:${colors.reset}`);
              permissionsRows.forEach((perm: any) => {
                console.log(`    • ${perm.clave}: ${perm.descripcion || ''}`);
              });
            } else {
              console.log(`  ${colors.red}❌ El usuario no tiene permisos asignados${colors.reset}`);
              testPassed = false;
            }
            
            // Probar función helper
            console.log(`\n${colors.yellow}📋 6. PROBANDO FUNCIÓN HELPER:${colors.reset}`);
            
            const checkPermQueries = [
              { email: newUser.email, permiso: 'turnos.view' },
              { email: newUser.email, permiso: 'turnos.edit' },
              { email: newUser.email, permiso: 'payroll.manage' },
              { email: newUser.email, permiso: 'inexistente.accion' }
            ];
            
            for (const check of checkPermQueries) {
              const checkQuery = `
                SELECT fn_usuario_tiene_permiso($1, $2) as tiene_permiso;
              `;
              
              const result = await query(checkQuery, [check.email, check.permiso]);
              const resultRows = Array.isArray(result) ? result : (result.rows || []);
              const hasPermission = resultRows[0]?.tiene_permiso;
              
              if (check.permiso === 'inexistente.accion') {
                if (!hasPermission) {
                  console.log(`  ${colors.green}✓ Correctamente denegado: ${check.permiso}${colors.reset}`);
                } else {
                  console.log(`  ${colors.red}❌ Error: No debería tener permiso para ${check.permiso}${colors.reset}`);
                  testPassed = false;
                }
              } else {
                if (hasPermission) {
                  console.log(`  ${colors.green}✓ Tiene permiso: ${check.permiso}${colors.reset}`);
                } else {
                  console.log(`  ${colors.yellow}⚠️ No tiene permiso: ${check.permiso}${colors.reset}`);
                }
              }
            }
          } else {
            console.log(`  ${colors.red}❌ Error al asociar usuario al rol${colors.reset}`);
            testPassed = false;
          }
        } else {
          console.log(`  ${colors.red}❌ No se encontró el rol admin${colors.reset}`);
          testPassed = false;
        }
      } else {
        console.log(`  ${colors.red}❌ Error al crear usuario${colors.reset}`);
        testPassed = false;
      }
    }
    
    // ============================================
    // 7. ESTADÍSTICAS FINALES
    // ============================================
    console.log(`\n${colors.cyan}📊 ESTADÍSTICAS FINALES:${colors.reset}`);
    
    const statsQuery = `
      SELECT 
        (SELECT COUNT(*) FROM usuarios) as total_usuarios,
        (SELECT COUNT(*) FROM usuarios WHERE activo = true) as usuarios_activos,
        (SELECT COUNT(*) FROM roles) as total_roles,
        (SELECT COUNT(*) FROM permisos) as total_permisos,
        (SELECT COUNT(*) FROM usuarios_roles) as asignaciones_usuario_rol,
        (SELECT COUNT(*) FROM roles_permisos) as asignaciones_rol_permiso;
    `;
    
    const stats = await query(statsQuery);
    const statsRows = Array.isArray(stats) ? stats : (stats.rows || []);
    const stat = statsRows[0];
    
    if (stat) {
      console.log(`  • Usuarios totales: ${stat.total_usuarios} (${stat.usuarios_activos} activos)`);
      console.log(`  • Roles: ${stat.total_roles}`);
      console.log(`  • Permisos: ${stat.total_permisos}`);
      console.log(`  • Asignaciones usuario-rol: ${stat.asignaciones_usuario_rol}`);
      console.log(`  • Asignaciones rol-permiso: ${stat.asignaciones_rol_permiso}`);
    }
    
    // Rollback de la transacción
    console.log(`\n${colors.yellow}🔄 Ejecutando ROLLBACK (todos los cambios se deshacen)...${colors.reset}`);
    await query('ROLLBACK');
    transaction = false;
    
    // Resultado final
    console.log('\n' + '='*50);
    if (testPassed) {
      console.log(`${colors.green}✅ SMOKE TEST COMPLETADO EXITOSAMENTE${colors.reset}`);
    } else {
      console.log(`${colors.red}❌ SMOKE TEST COMPLETADO CON ERRORES${colors.reset}`);
    }
    
  } catch (error) {
    console.error(`\n${colors.red}❌ Error en smoke test:${colors.reset}`, error);
    
    // Hacer rollback si hay transacción activa
    if (transaction) {
      try {
        await query('ROLLBACK');
        console.log(`${colors.yellow}🔄 Transacción revertida${colors.reset}`);
      } catch (rollbackError) {
        console.error(`${colors.red}❌ Error al hacer rollback:${colors.reset}`, rollbackError);
      }
    }
    
    process.exit(1);
  }
}

// Ejecutar smoke test
rbacSmokeTest().catch(console.error);
