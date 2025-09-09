import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@vercel/postgres';
import { requirePlatformAdmin } from '@/lib/auth/rbac';

export async function POST(req: NextRequest) {
  try {
    // Verificar permisos de administrador de plataforma
    const authResult = await requirePlatformAdmin(req);
    if (!authResult.ok) {
      return NextResponse.json(
        { error: 'Acceso denegado. Se requieren permisos de Platform Admin.' },
        { status: authResult.status }
      );
    }

    const { action } = await req.json();
    console.log(`🔧 Ejecutando optimización: ${action}`);

    switch (action) {
      case 'unificar-nomenclatura':
        return await unificarNomenclatura();
      
      case 'simplificar-roles-usuario':
        return await simplificarRolesUsuario();
      
      case 'crear-auditoria':
        return await crearSistemaAuditoria();
      
      default:
        return NextResponse.json(
          { error: 'Acción no válida' },
          { status: 400 }
        );
    }

  } catch (error) {
    console.error('❌ Error ejecutando optimización:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

// ===============================================
// 1. UNIFICAR NOMENCLATURA DE PERMISOS
// ===============================================
async function unificarNomenclatura() {
  console.log('🔧 Unificando nomenclatura de permisos...');

  try {
    // 1.1 Estandarizar permisos de pauta (pauta_diaria -> pauta-diaria)
    const estandarizarPauta = await sql`
      UPDATE permisos 
      SET clave = REPLACE(clave, 'pauta_diaria', 'pauta-diaria')
      WHERE clave LIKE 'pauta_diaria%'
      RETURNING id, clave
    `;

    console.log(`   ✅ Permisos de pauta estandarizados: ${estandarizarPauta.rows.length}`);

    // 1.2 Estandarizar separadores (usar solo guiones)
    const permisosConGuiones = await sql`
      SELECT id, clave 
      FROM permisos 
      WHERE clave LIKE '%_%' 
      AND clave NOT LIKE 'rbac.%'
      AND clave NOT LIKE 'central_monitoring.%'
    `;

    let permisosActualizados = 0;
    for (const permiso of permisosConGuiones.rows) {
      const nuevaClave = permiso.clave.replace(/_/g, '-');
      if (nuevaClave !== permiso.clave) {
        await sql`
          UPDATE permisos 
          SET clave = ${nuevaClave}
          WHERE id = ${permiso.id}
        `;
        permisosActualizados++;
      }
    }

    console.log(`   ✅ Permisos con separadores estandarizados: ${permisosActualizados}`);

    // 1.3 Verificar resultado
    const inconsistencias = await sql`
      SELECT COUNT(*) as count
      FROM permisos 
      WHERE (clave LIKE '%_%' AND clave LIKE '%-%')
      OR (clave LIKE 'pauta_diaria%')
    `;

    const inconsistenciasRestantes = inconsistencias.rows[0].count;

    return NextResponse.json({
      success: true,
      message: 'Nomenclatura de permisos unificada exitosamente',
      data: {
        permisosPautaEstandarizados: estandarizarPauta.rows.length,
        permisosSeparadoresEstandarizados: permisosActualizados,
        inconsistenciasRestantes
      }
    });

  } catch (error) {
    console.error('❌ Error unificando nomenclatura:', error);
    throw error;
  }
}

// ===============================================
// 2. SIMPLIFICAR ROLES DEL USUARIO PRINCIPAL
// ===============================================
async function simplificarRolesUsuario() {
  console.log('🔧 Simplificando roles del usuario principal...');

  try {
    // 2.1 Obtener usuario Carlos
    const usuario = await sql`
      SELECT id FROM usuarios WHERE email = 'carlos.irigoyen@gard.cl'
    `;

    if (usuario.rows.length === 0) {
      return NextResponse.json(
        { error: 'Usuario Carlos no encontrado' },
        { status: 404 }
      );
    }

    const usuarioId = usuario.rows[0].id;

    // 2.2 Eliminar roles duplicados y excesivos
    const rolesAEliminar = await sql`
      DELETE FROM usuarios_roles 
      WHERE usuario_id = ${usuarioId}
      AND rol_id IN (
        SELECT r.id 
        FROM roles r 
        WHERE r.nombre IN (
          'Consulta',
          'Operador', 
          'Supervisor',
          'Tenant Admin',
          'Central Monitoring Operator',
          'central_monitoring.operator',
          'Perfil Básico'
        )
      )
      RETURNING rol_id
    `;

    console.log(`   ✅ Roles eliminados: ${rolesAEliminar.rows.length}`);

    // 2.3 Mantener solo el rol Super Admin
    const superAdmin = await sql`
      SELECT id FROM roles WHERE nombre = 'Super Admin'
    `;

    if (superAdmin.rows.length > 0) {
      const superAdminId = superAdmin.rows[0].id;
      
      // Verificar si ya tiene el rol Super Admin
      const tieneSuperAdmin = await sql`
        SELECT 1 FROM usuarios_roles 
        WHERE usuario_id = ${usuarioId} AND rol_id = ${superAdminId}
      `;

      if (tieneSuperAdmin.rows.length === 0) {
        await sql`
          INSERT INTO usuarios_roles (usuario_id, rol_id)
          VALUES (${usuarioId}, ${superAdminId})
        `;
        console.log('   ✅ Rol Super Admin asignado');
      }
    }

    // 2.4 Verificar resultado
    const rolesFinales = await sql`
      SELECT r.nombre
      FROM usuarios_roles ur
      JOIN roles r ON ur.rol_id = r.id
      WHERE ur.usuario_id = ${usuarioId}
    `;

    return NextResponse.json({
      success: true,
      message: 'Roles del usuario principal simplificados exitosamente',
      data: {
        rolesEliminados: rolesAEliminar.rows.length,
        rolesFinales: rolesFinales.rows.map(r => r.nombre),
        totalRolesFinales: rolesFinales.rows.length
      }
    });

  } catch (error) {
    console.error('❌ Error simplificando roles:', error);
    throw error;
  }
}

// ===============================================
// 3. CREAR SISTEMA DE AUDITORÍA
// ===============================================
async function crearSistemaAuditoria() {
  console.log('🔧 Creando sistema de auditoría...');

  try {
    // 3.1 Crear tabla de auditoría si no existe
    const crearTablaAuditoria = await sql`
      CREATE TABLE IF NOT EXISTS auditoria_rbac (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        usuario_id UUID REFERENCES usuarios(id),
        accion VARCHAR(50) NOT NULL,
        tabla_afectada VARCHAR(50) NOT NULL,
        registro_id UUID,
        datos_anteriores JSONB,
        datos_nuevos JSONB,
        timestamp TIMESTAMP DEFAULT NOW(),
        ip_address INET,
        user_agent TEXT
      )
    `;

    // 3.2 Crear índices para auditoría
    const crearIndices = await sql`
      CREATE INDEX IF NOT EXISTS idx_auditoria_rbac_usuario ON auditoria_rbac(usuario_id);
      CREATE INDEX IF NOT EXISTS idx_auditoria_rbac_timestamp ON auditoria_rbac(timestamp);
      CREATE INDEX IF NOT EXISTS idx_auditoria_rbac_accion ON auditoria_rbac(accion);
    `;

    // 3.3 Crear función de auditoría
    const crearFuncionAuditoria = await sql`
      CREATE OR REPLACE FUNCTION fn_auditar_rbac(
        p_usuario_id UUID,
        p_accion VARCHAR(50),
        p_tabla_afectada VARCHAR(50),
        p_registro_id UUID DEFAULT NULL,
        p_datos_anteriores JSONB DEFAULT NULL,
        p_datos_nuevos JSONB DEFAULT NULL
      ) RETURNS VOID AS $$
      BEGIN
        INSERT INTO auditoria_rbac (
          usuario_id, 
          accion, 
          tabla_afectada, 
          registro_id, 
          datos_anteriores, 
          datos_nuevos
        ) VALUES (
          p_usuario_id,
          p_accion,
          p_tabla_afectada,
          p_registro_id,
          p_datos_anteriores,
          p_datos_nuevos
        );
      END;
      $$ LANGUAGE plpgsql;
    `;

    // 3.4 Crear trigger para auditoría automática
    const crearTrigger = await sql`
      CREATE OR REPLACE FUNCTION fn_trigger_auditoria_roles_permisos()
      RETURNS TRIGGER AS $$
      BEGIN
        IF TG_OP = 'INSERT' THEN
          PERFORM fn_auditar_rbac(
            NULL, -- usuario_id (se puede obtener del contexto)
            'INSERT',
            TG_TABLE_NAME,
            NEW.id,
            NULL,
            to_jsonb(NEW)
          );
          RETURN NEW;
        ELSIF TG_OP = 'UPDATE' THEN
          PERFORM fn_auditar_rbac(
            NULL,
            'UPDATE',
            TG_TABLE_NAME,
            NEW.id,
            to_jsonb(OLD),
            to_jsonb(NEW)
          );
          RETURN NEW;
        ELSIF TG_OP = 'DELETE' THEN
          PERFORM fn_auditar_rbac(
            NULL,
            'DELETE',
            TG_TABLE_NAME,
            OLD.id,
            to_jsonb(OLD),
            NULL
          );
          RETURN OLD;
        END IF;
        RETURN NULL;
      END;
      $$ LANGUAGE plpgsql;
    `;

    // 3.5 Aplicar trigger a tablas críticas
    const aplicarTriggers = await sql`
      DROP TRIGGER IF EXISTS trigger_auditoria_roles_permisos ON roles_permisos;
      CREATE TRIGGER trigger_auditoria_roles_permisos
        AFTER INSERT OR UPDATE OR DELETE ON roles_permisos
        FOR EACH ROW EXECUTE FUNCTION fn_trigger_auditoria_roles_permisos();
      
      DROP TRIGGER IF EXISTS trigger_auditoria_usuarios_roles ON usuarios_roles;
      CREATE TRIGGER trigger_auditoria_usuarios_roles
        AFTER INSERT OR UPDATE OR DELETE ON usuarios_roles
        FOR EACH ROW EXECUTE FUNCTION fn_trigger_auditoria_roles_permisos();
    `;

    console.log('   ✅ Sistema de auditoría creado exitosamente');

    return NextResponse.json({
      success: true,
      message: 'Sistema de auditoría creado exitosamente',
      data: {
        tablaAuditoria: 'auditoria_rbac',
        funcionAuditoria: 'fn_auditar_rbac',
        triggersCreados: ['roles_permisos', 'usuarios_roles']
      }
    });

  } catch (error) {
    console.error('❌ Error creando sistema de auditoría:', error);
    throw error;
  }
}

export async function GET(req: NextRequest) {
  try {
    // Verificar permisos de administrador de plataforma
    const authResult = await requirePlatformAdmin(req);
    if (!authResult.ok) {
      return NextResponse.json(
        { error: 'Acceso denegado. Se requieren permisos de Platform Admin.' },
        { status: authResult.status }
      );
    }

    // Obtener estado actual de optimizaciones
    const estado = await obtenerEstadoOptimizaciones();

    return NextResponse.json({
      success: true,
      estado
    });

  } catch (error) {
    console.error('❌ Error obteniendo estado de optimizaciones:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

async function obtenerEstadoOptimizaciones() {
  // Verificar inconsistencias en nomenclatura
  const inconsistencias = await sql`
    SELECT COUNT(*) as count
    FROM permisos 
    WHERE (clave LIKE '%_%' AND clave LIKE '%-%')
    OR (clave LIKE 'pauta_diaria%')
  `;

  // Verificar roles del usuario principal
  const rolesUsuario = await sql`
    SELECT COUNT(*) as count
    FROM usuarios_roles ur
    JOIN usuarios u ON ur.usuario_id = u.id
    WHERE u.email = 'carlos.irigoyen@gard.cl'
  `;

  // Verificar sistema de auditoría
  const auditoriaExiste = await sql`
    SELECT EXISTS (
      SELECT 1 FROM information_schema.tables 
      WHERE table_name = 'auditoria_rbac'
    ) as existe
  `;

  return {
    inconsistenciasNomenclatura: inconsistencias.rows[0].count,
    rolesUsuarioPrincipal: rolesUsuario.rows[0].count,
    sistemaAuditoria: auditoriaExiste.rows[0].existe
  };
}
