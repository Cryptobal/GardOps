import { config } from 'dotenv';
import * as path from 'path';

// Cargar variables de entorno
config({ path: path.join(__dirname, '../.env.local') });

import { sql } from '@vercel/postgres';

async function corregirAsignacionAdmin() {
  try {
    console.log('🔧 CORRIGIENDO ASIGNACIÓN DE ROL ADMIN\n');

    // ===============================================
    // 1. VERIFICAR ROLES ADMIN EXISTENTES
    // ===============================================
    console.log('1️⃣ Verificando roles Admin existentes...');
    
    const rolesAdmin = await sql`
      SELECT id, nombre, descripcion, tenant_id, activo
      FROM roles
      WHERE nombre = 'Admin'
      ORDER BY created_at ASC
    `;

    console.log('📋 Roles Admin encontrados:');
    rolesAdmin.rows.forEach((rol: any, index: number) => {
      const tipo = rol.tenant_id ? 'Tenant' : 'Global';
      const estado = rol.activo ? '🟢' : '🔴';
      console.log(`   ${index + 1}. ${estado} ${rol.nombre} (${tipo}): ${rol.descripcion}`);
      console.log(`      ID: ${rol.id}`);
      console.log(`      Tenant: ${rol.tenant_id}`);
      console.log('');
    });

    // ===============================================
    // 2. IDENTIFICAR EL ROL ADMIN CORRECTO
    // ===============================================
    console.log('2️⃣ Identificando rol Admin correcto...');
    
    const rolAdminCorrecto = rolesAdmin.rows.find((r: any) => 
      r.activo && 
      r.tenant_id === 'accebf8a-bacc-41fa-9601-ed39cb320a52' &&
      r.descripcion.includes('acceso total')
    );

    if (!rolAdminCorrecto) {
      console.log('❌ No se encontró el rol Admin correcto');
      return;
    }

    console.log(`✅ Rol Admin correcto: ${rolAdminCorrecto.id}`);
    console.log(`   Descripción: ${rolAdminCorrecto.descripcion}`);

    // ===============================================
    // 3. VERIFICAR ASIGNACIÓN ACTUAL DEL USUARIO
    // ===============================================
    console.log('\n3️⃣ Verificando asignación actual del usuario admin@gard.cl...');
    
    const usuarioAdmin = await sql`
      SELECT id, email, nombre
      FROM usuarios
      WHERE email = 'admin@gard.cl'
    `;

    if (usuarioAdmin.rows.length === 0) {
      console.log('❌ Usuario admin@gard.cl no encontrado');
      return;
    }

    const userId = usuarioAdmin.rows[0].id;
    console.log(`✅ Usuario encontrado: ${usuarioAdmin.rows[0].email} (ID: ${userId})`);

    // Verificar asignación actual
    const asignacionActual = await sql`
      SELECT r.id, r.nombre, r.descripcion, r.tenant_id
      FROM usuarios_roles ur
      JOIN roles r ON r.id = ur.rol_id
      WHERE ur.usuario_id = ${userId}
    `;

    console.log('📋 Asignación actual:');
    if (asignacionActual.rows.length > 0) {
      asignacionActual.rows.forEach((asignacion: any) => {
        const tipo = asignacion.tenant_id ? 'Tenant' : 'Global';
        console.log(`   - ${asignacion.nombre} (${tipo}): ${asignacion.descripcion}`);
        console.log(`     ID: ${asignacion.id}`);
      });
    } else {
      console.log('   ⚠️  Sin asignación de rol');
    }

    // ===============================================
    // 4. CORREGIR ASIGNACIÓN
    // ===============================================
    console.log('\n4️⃣ Corrigiendo asignación...');
    
    // Eliminar asignaciones incorrectas
    await sql`
      DELETE FROM usuarios_roles 
      WHERE usuario_id = ${userId}
    `;
    console.log('   🧹 Asignaciones anteriores eliminadas');

    // Asignar el rol correcto
    await sql`
      INSERT INTO usuarios_roles (usuario_id, rol_id)
      VALUES (${userId}, ${rolAdminCorrecto.id})
    `;
    console.log(`   ✅ Rol Admin correcto asignado (ID: ${rolAdminCorrecto.id})`);

    // ===============================================
    // 5. VERIFICAR CORRECCIÓN
    // ===============================================
    console.log('\n5️⃣ Verificando corrección...');
    
    const asignacionCorregida = await sql`
      SELECT r.id, r.nombre, r.descripcion, r.tenant_id
      FROM usuarios_roles ur
      JOIN roles r ON r.id = ur.rol_id
      WHERE ur.usuario_id = ${userId}
    `;

    console.log('📋 Asignación corregida:');
    if (asignacionCorregida.rows.length > 0) {
      asignacionCorregida.rows.forEach((asignacion: any) => {
        const tipo = asignacion.tenant_id ? 'Tenant' : 'Global';
        console.log(`   ✅ ${asignacion.nombre} (${tipo}): ${asignacion.descripcion}`);
      });
    } else {
      console.log('   ❌ Sin asignación de rol');
    }

    // Verificar permisos
    console.log('\n🔐 Verificando permisos del usuario admin@gard.cl:');
    const permisosAVerificar = [
      'usuarios.manage',
      'turnos.view',
      'turnos.edit',
      'payroll.view',
      'payroll.edit',
      'maestros.view',
      'maestros.edit',
      'documentos.manage',
      'config.manage'
    ];

    for (const permiso of permisosAVerificar) {
      try {
        const resultado = await sql`
          SELECT public.fn_usuario_tiene_permiso(${userId}, ${permiso}) as tiene_permiso
        `;
        
        const tienePermiso = resultado.rows[0].tiene_permiso;
        const icono = tienePermiso ? '✅' : '❌';
        console.log(`   ${icono} ${permiso}: ${tienePermiso ? 'SÍ' : 'NO'}`);
      } catch (error) {
        console.log(`   ⚠️  ${permiso}: Error al verificar`);
      }
    }

    console.log('\n🎉 CORRECCIÓN COMPLETADA');
    console.log('✅ El usuario admin@gard.cl ahora tiene el rol Admin correcto');
    console.log('✅ Los permisos deberían funcionar correctamente');

  } catch (error) {
    console.error('❌ Error:', error);
  }
}

corregirAsignacionAdmin().then(() => {
  console.log('\n🏁 Script completado');
  process.exit(0);
});
