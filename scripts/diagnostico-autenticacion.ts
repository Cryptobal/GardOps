import { sql } from '@vercel/postgres';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

async function diagnosticarAutenticacion() {
  console.log('🔍 DIAGNÓSTICO DE AUTENTICACIÓN RBAC');
  console.log('=' . repeat(60));
  
  try {
    // 1. Verificar estado del usuario Carlos
    console.log('\n📋 1. ESTADO DEL USUARIO CARLOS');
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
    
    console.log('Usuario Carlos:', carlosInfo.rows[0]);
    
    // 2. Verificar permisos del rol
    console.log('\n🔑 2. PERMISOS DEL ROL SUPER ADMIN');
    console.log('-'.repeat(40));
    
    if (carlosInfo.rows[0]?.roles) {
      const roleId = carlosInfo.rows[0].roles.split(', ')[0];
      const permisos = await sql`
        SELECT p.clave, p.descripcion
        FROM roles_permisos rp 
        JOIN permisos p ON rp.permiso_id = p.id 
        WHERE rp.rol_id = ${roleId}::uuid
        AND p.clave LIKE 'rbac.%'
        ORDER BY p.clave
      `;
      
      console.log('Permisos RBAC encontrados:', permisos.rows.map(p => p.clave));
    }
    
    // 3. Probar función de verificación de permisos
    console.log('\n✅ 3. PRUEBA DE VERIFICACIÓN DE PERMISOS');
    console.log('-'.repeat(40));
    
    const userId = carlosInfo.rows[0]?.id;
    if (userId) {
      const permisoTest = await sql`
        SELECT public.fn_usuario_tiene_permiso(${userId}::uuid, 'rbac.platform_admin')
      `;
      console.log('Permiso rbac.platform_admin:', permisoTest.rows[0]);
    }
    
    // 4. Verificar configuración de autenticación
    console.log('\n⚙️ 4. CONFIGURACIÓN DE AUTENTICACIÓN');
    console.log('-'.repeat(40));
    
    console.log('NODE_ENV:', process.env.NODE_ENV);
    console.log('NEXT_PUBLIC_DEV_USER_EMAIL:', process.env.NEXT_PUBLIC_DEV_USER_EMAIL);
    
    // 5. Simular llamada a la API
    console.log('\n🌐 5. SIMULACIÓN DE LLAMADA A LA API');
    console.log('-'.repeat(40));
    
    console.log('Para probar la API, ejecuta:');
    console.log('curl -H "x-user-email: carlos.irigoyen@gard.cl" https://ops.gard.cl/api/admin/rbac/usuarios');
    
  } catch (error) {
    console.error('❌ Error en diagnóstico:', error);
  }
}

diagnosticarAutenticacion();
