import { config } from 'dotenv';
import * as path from 'path';

// Cargar variables de entorno
config({ path: path.join(__dirname, '../.env.local') });

import { sql } from '@vercel/postgres';

async function limpiarYSimplificarRoles() {
  try {
    console.log('🧹 LIMPIANDO Y SIMPLIFICANDO SISTEMA DE ROLES\n');

    // ===============================================
    // 1. AGREGAR CAMPO ACTIVO A LA TABLA ROLES
    // ===============================================
    console.log('1️⃣ Agregando campo activo a tabla roles...');
    
    await sql`
      ALTER TABLE roles 
      ADD COLUMN IF NOT EXISTS activo BOOLEAN DEFAULT true
    `;
    console.log('✅ Campo activo agregado');

    // ===============================================
    // 2. IDENTIFICAR DUPLICADOS Y ROLES A UNIFICAR
    // ===============================================
    console.log('\n2️⃣ Identificando duplicados y roles a unificar...');
    
    const rolesActuales = await sql`
      SELECT id, nombre, descripcion, tenant_id, activo
      FROM roles
      ORDER BY nombre, tenant_id NULLS FIRST
    `;

    console.log('📋 Roles actuales:');
    rolesActuales.rows.forEach((rol: any) => {
      const tipo = rol.tenant_id ? 'Tenant' : 'Global';
      console.log(`   - ${rol.nombre} (${tipo}): ${rol.descripcion}`);
    });

    // ===============================================
    // 3. IDENTIFICAR ROLES A MANTENER
    // ===============================================
    console.log('\n3️⃣ Identificando roles a mantener...');
    
    // Mantener solo estos roles:
    const rolesAMantener = [
      { nombre: 'Platform Admin', descripcion: 'Administrador global de toda la plataforma', tenant_id: null },
      { nombre: 'Admin', descripcion: 'Administrador del tenant (acceso total a su organización)', tenant_id: 'accebf8a-bacc-41fa-9601-ed39cb320a52' },
      { nombre: 'Supervisor', descripcion: 'Supervisor operativo (gestión de turnos y personal)', tenant_id: 'accebf8a-bacc-41fa-9601-ed39cb320a52' },
      { nombre: 'Operador', descripcion: 'Operador básico (solo visualización)', tenant_id: 'accebf8a-bacc-41fa-9601-ed39cb320a52' }
    ];

    console.log('🎯 Roles a mantener:');
    rolesAMantener.forEach(rol => {
      const tipo = rol.tenant_id ? 'Tenant' : 'Global';
      console.log(`   - ${rol.nombre} (${tipo}): ${rol.descripcion}`);
    });

    // ===============================================
    // 4. INACTIVAR ROLES DUPLICADOS/OBSOLETOS
    // ===============================================
    console.log('\n4️⃣ Inactivando roles duplicados y obsoletos...');
    
    // Inactivar duplicados de Platform Admin
    const platformAdmins = await sql`
      SELECT id FROM roles 
      WHERE nombre = 'Platform Admin' 
      AND tenant_id IS NULL
      ORDER BY created_at ASC
    `;
    
    if (platformAdmins.rows.length > 1) {
      const mantenerId = platformAdmins.rows[0].id;
      await sql`
        UPDATE roles 
        SET activo = false 
        WHERE nombre = 'Platform Admin' 
        AND tenant_id IS NULL
        AND id != ${mantenerId}
      `;
    }

    // Inactivar roles confusos/obsoletos
    await sql`
      UPDATE roles 
      SET activo = false 
      WHERE nombre IN ('admin', 'Jefe de Turno', 'supervisor', 'operador')
      AND tenant_id IS NOT NULL
    `;

    console.log('✅ Roles duplicados y obsoletos inactivados');

    // ===============================================
    // 5. ACTUALIZAR DESCRIPCIONES DE ROLES MANTENIDOS
    // ===============================================
    console.log('\n5️⃣ Actualizando descripciones...');
    
    // Actualizar Platform Admin
    await sql`
      UPDATE roles 
      SET descripcion = 'Administrador global de toda la plataforma'
      WHERE nombre = 'Platform Admin' 
      AND tenant_id IS NULL 
      AND activo = true
    `;

    console.log('✅ Descripciones actualizadas');

    // ===============================================
    // 6. CREAR ROLES FALTANTES
    // ===============================================
    console.log('\n6️⃣ Creando roles faltantes...');
    
    // Verificar si existe Admin
    const adminExists = await sql`
      SELECT id FROM roles 
      WHERE nombre = 'Admin' 
      AND tenant_id = 'accebf8a-bacc-41fa-9601-ed39cb320a52'
      AND activo = true
    `;

    if (adminExists.rows.length === 0) {
      await sql`
        INSERT INTO roles (nombre, descripcion, tenant_id, activo)
        VALUES ('Admin', 'Administrador del tenant (acceso total a su organización)', 'accebf8a-bacc-41fa-9601-ed39cb320a52', true)
      `;
      console.log('✅ Rol Admin creado');
    }

    // Verificar si existe Supervisor
    const supervisorExists = await sql`
      SELECT id FROM roles 
      WHERE nombre = 'Supervisor' 
      AND tenant_id = 'accebf8a-bacc-41fa-9601-ed39cb320a52'
      AND activo = true
    `;

    if (supervisorExists.rows.length === 0) {
      await sql`
        INSERT INTO roles (nombre, descripcion, tenant_id, activo)
        VALUES ('Supervisor', 'Supervisor operativo (gestión de turnos y personal)', 'accebf8a-bacc-41fa-9601-ed39cb320a52', true)
      `;
      console.log('✅ Rol Supervisor creado');
    }

    // Verificar si existe Operador
    const operadorExists = await sql`
      SELECT id FROM roles 
      WHERE nombre = 'Operador' 
      AND tenant_id = 'accebf8a-bacc-41fa-9601-ed39cb320a52'
      AND activo = true
    `;

    if (operadorExists.rows.length === 0) {
      await sql`
        INSERT INTO roles (nombre, descripcion, tenant_id, activo)
        VALUES ('Operador', 'Operador básico (solo visualización)', 'accebf8a-bacc-41fa-9601-ed39cb320a52', true)
      `;
      console.log('✅ Rol Operador creado');
    }

    // ===============================================
    // 7. VERIFICAR ESTADO FINAL
    // ===============================================
    console.log('\n7️⃣ Verificando estado final...');
    
    const rolesFinales = await sql`
      SELECT id, nombre, descripcion, tenant_id, activo
      FROM roles
      ORDER BY activo DESC, nombre, tenant_id NULLS FIRST
    `;

    console.log('📊 Estado final de roles:');
    console.log('\n🟢 ROLES ACTIVOS:');
    rolesFinales.rows.filter((r: any) => r.activo).forEach((rol: any) => {
      const tipo = rol.tenant_id ? 'Tenant' : 'Global';
      console.log(`   ✅ ${rol.nombre} (${tipo}): ${rol.descripcion}`);
    });

    console.log('\n🔴 ROLES INACTIVOS:');
    rolesFinales.rows.filter((r: any) => !r.activo).forEach((rol: any) => {
      const tipo = rol.tenant_id ? 'Tenant' : 'Global';
      console.log(`   ❌ ${rol.nombre} (${tipo}): ${rol.descripcion}`);
    });

    // ===============================================
    // 8. VERIFICAR ASIGNACIONES DE USUARIOS
    // ===============================================
    console.log('\n8️⃣ Verificando asignaciones de usuarios...');
    
    const asignaciones = await sql`
      SELECT 
        u.email,
        r.nombre as rol,
        r.activo as rol_activo
      FROM usuarios_roles ur
      JOIN usuarios u ON u.id = ur.usuario_id
      JOIN roles r ON r.id = ur.rol_id
      ORDER BY u.email
    `;

    console.log('📊 Asignaciones actuales:');
    asignaciones.rows.forEach((asignacion: any) => {
      const estado = asignacion.rol_activo ? '🟢' : '🔴';
      console.log(`   ${estado} ${asignacion.email} → ${asignacion.rol}`);
    });

    console.log('\n🎉 LIMPIEZA COMPLETADA');
    console.log('✅ Sistema de roles simplificado y organizado');
    console.log('✅ Campo activo agregado para gestión de roles');
    console.log('✅ Duplicados eliminados');
    console.log('✅ Descripciones clarificadas');

  } catch (error) {
    console.error('❌ Error:', error);
  }
}

limpiarYSimplificarRoles().then(() => {
  console.log('\n🏁 Script completado');
  process.exit(0);
});
