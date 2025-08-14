import { requireAuthz } from '@/lib/authz-api'
import { NextRequest } from 'next/server';
import { query } from '@/lib/database';

export async function POST(req: NextRequest) {
const __req = (typeof req!== 'undefined' ? req : (typeof request !== 'undefined' ? request : (arguments as any)[0]));
const deny = await requireAuthz(__req as any, { resource: 'setup_permissions', action: 'create' });
if (deny) return deny;

  try {
    console.log('🔧 Configurando permisos de turnos...');
    
    // Insertar el permiso si no existe
    await query(`
      INSERT INTO rbac_permisos (codigo, nombre, descripcion) VALUES
        ('turnos.marcar_asistencia', 'Marcar Asistencia', 'Permite marcar asistencia o inasistencia en turnos')
      ON CONFLICT (codigo) DO NOTHING
    `);
    
    // Asignar el permiso al rol admin
    await query(`
      INSERT INTO rbac_roles_permisos (rol_codigo, permiso_cod, granted) VALUES
        ('admin', 'turnos.marcar_asistencia', true)
      ON CONFLICT (rol_codigo, permiso_cod) DO UPDATE SET granted = true
    `);
    
    // Asignar el permiso al rol supervisor
    await query(`
      INSERT INTO rbac_roles_permisos (rol_codigo, permiso_cod, granted) VALUES
        ('supervisor', 'turnos.marcar_asistencia', true)
      ON CONFLICT (rol_codigo, permiso_cod) DO UPDATE SET granted = true
    `);
    
    // Asignar el rol admin al usuario carlos.irigoyen@gard.cl
    await query(`
      INSERT INTO rbac_usuarios_roles (usuario_ref, rol_codigo) VALUES
        ('carlos.irigoyen@gard.cl', 'admin')
      ON CONFLICT (usuario_ref, rol_codigo) DO NOTHING
    `);
    
    console.log('✅ Permisos configurados exitosamente');
    
    return Response.json({ 
      success: true, 
      message: 'Permisos configurados correctamente' 
    });
    
  } catch (error) {
    console.error('❌ Error configurando permisos:', error);
    return Response.json({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Error desconocido' 
    }, { status: 500 });
  }
} 
