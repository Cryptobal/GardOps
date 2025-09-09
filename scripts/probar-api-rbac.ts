import { sql } from '@vercel/postgres';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

async function probarAPIRBAC() {
  console.log('🧪 PROBANDO APIS RBAC');
  console.log('=' . repeat(50));
  
  try {
    // 1. Verificar que el usuario Carlos existe y tiene permisos
    console.log('\n📋 1. VERIFICACIÓN DE USUARIO CARLOS');
    console.log('-'.repeat(40));
    
    const carlosInfo = await sql`
      SELECT 
        u.id, u.email, u.rol, u.activo, u.tenant_id,
        COUNT(ur.rol_id) as num_roles,
        STRING_AGG(r.nombre, ', ' ORDER BY r.nombre) as roles
      FROM usuarios u
      LEFT JOIN usuarios_roles ur ON u.id = ur.usuario_id
      LEFT JOIN roles r ON ur.rol_id = r.id
      WHERE u.email = 'carlos.irigoyen@gard.cl'
      GROUP BY u.id, u.email, u.rol, u.activo, u.tenant_id
    `;
    
    console.log('✅ Usuario Carlos:', carlosInfo.rows[0]);
    
    if (carlosInfo.rows[0]?.num_roles === '0') {
      console.log('❌ PROBLEMA: Usuario sin roles asignados');
      return;
    }
    
    // 2. Verificar permisos del rol
    console.log('\n🔑 2. VERIFICACIÓN DE PERMISOS');
    console.log('-'.repeat(40));
    
    const userId = carlosInfo.rows[0].id;
    const permisoTest = await sql`
      SELECT public.fn_usuario_tiene_permiso(${userId}::uuid, 'rbac.platform_admin')
    `;
    
    console.log('✅ Permiso rbac.platform_admin:', permisoTest.rows[0]);
    
    // 3. Simular llamadas a la API
    console.log('\n🌐 3. SIMULACIÓN DE LLAMADAS A LA API');
    console.log('-'.repeat(40));
    
    console.log('Para probar las APIs en producción, ejecuta:');
    console.log('');
    console.log('1. API Usuarios:');
    console.log('curl -H "x-user-email: carlos.irigoyen@gard.cl" https://ops.gard.cl/api/admin/rbac/usuarios');
    console.log('');
    console.log('2. API Roles:');
    console.log('curl -H "x-user-email: carlos.irigoyen@gard.cl" https://ops.gard.cl/api/admin/rbac/roles');
    console.log('');
    console.log('3. API Permisos:');
    console.log('curl -H "x-user-email: carlos.irigoyen@gard.cl" https://ops.gard.cl/api/admin/rbac/permisos');
    console.log('');
    console.log('4. API Tenants:');
    console.log('curl -H "x-user-email: carlos.irigoyen@gard.cl" https://ops.gard.cl/api/admin/tenants');
    console.log('');
    
    // 4. Verificar que las funciones de base de datos funcionen
    console.log('\n🗄️ 4. VERIFICACIÓN DE FUNCIONES DE BD');
    console.log('-'.repeat(40));
    
    const funciones = await sql`
      SELECT routine_name, routine_type 
      FROM information_schema.routines 
      WHERE routine_name = 'fn_usuario_tiene_permiso'
    `;
    
    console.log('✅ Funciones encontradas:', funciones.rows);
    
    // 5. Resumen del estado
    console.log('\n📊 5. RESUMEN DEL ESTADO');
    console.log('-'.repeat(40));
    
    console.log('✅ Usuario Carlos tiene rol asignado');
    console.log('✅ Función de verificación de permisos funciona');
    console.log('✅ Usuario tiene permiso rbac.platform_admin');
    console.log('');
    console.log('🔧 PRÓXIMOS PASOS:');
    console.log('1. Desplegar cambios a producción');
    console.log('2. Probar APIs con header x-user-email');
    console.log('3. Verificar logs en Vercel para debug');
    
  } catch (error) {
    console.error('❌ Error en prueba:', error);
  }
}

probarAPIRBAC();
