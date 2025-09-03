import { Usuario, CreateUsuarioData, LoginCredentials, AuthResponse } from '../schemas/usuarios';
import { signToken, hashPassword, comparePassword } from '../auth';
import { query } from '../database';
import { sql as vercelSql } from '@vercel/postgres';

// Funciones para manejo de usuarios en base de datos PostgreSQL
export async function createUser(data: CreateUsuarioData): Promise<Usuario | null> {
  try {
    // Verificar si el email ya existe
    const existingUser = await query('SELECT id FROM usuarios WHERE email = $1', [data.email]);
    if (existingUser.rows.length > 0) {
      return null;
    }

    // Hash de la contraseña
    const hashedPassword = hashPassword(data.password);

    // Insertar nuevo usuario
    const result = await query(`
      INSERT INTO usuarios (email, password, nombre, apellido, rol, telefono, tenant_id)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING id, email, nombre, apellido, rol, activo, fecha_creacion, telefono, tenant_id
    `, [data.email, hashedPassword, data.nombre, data.apellido, data.rol, data.telefono, data.tenant_id]);

    const user = result.rows[0];
    return {
      id: user.id,
      email: user.email,
      password: hashedPassword,
      nombre: user.nombre,
      apellido: user.apellido,
      rol: user.rol,
      activo: user.activo,
      fechaCreacion: user.fecha_creacion,
      telefono: user.telefono,
      tenant_id: user.tenant_id
    };
  } catch (error) {
    console.error('Error creando usuario:', error);
    return null;
  }
}

export async function authenticateUser(credentials: LoginCredentials): Promise<AuthResponse | null> {
  try {
    // 1) Buscar usuario por email y verificar contraseña con Base64+salt
    let user: any = null;
    try {
      const rows = await vercelSql<{
        id: string;
        email: string;
        nombre: string;
        apellido: string;
        tenant_id: string;
      }>`
        SELECT id::text as id, email, nombre, apellido, tenant_id::text as tenant_id, password
        FROM public.usuarios
        WHERE lower(email) = lower(${credentials.email})
          AND activo = true
        LIMIT 1
      `;
      
      const u = rows?.rows?.[0] ?? null;
      if (u && comparePassword(credentials.password, u.password)) {
        user = { 
          id: u.id, 
          email: u.email, 
          nombre: u.nombre, 
          apellido: u.apellido, 
          tenant_id: u.tenant_id 
        };
      }
    } catch (e) {
      console.error('Error en autenticación Vercel Postgres:', e);
    }

    // 2) Fallback a DATABASE_URL pool si no encontramos usuario
    if (!user) {
      try {
        const res = await query(
          `SELECT id::text as id, email, nombre, apellido, tenant_id::text as tenant_id, password
           FROM public.usuarios
           WHERE lower(email) = lower($1) AND activo = true
           LIMIT 1`,
          [credentials.email]
        );
        
        const u = res?.rows?.[0] ?? null;
        if (u && comparePassword(credentials.password, u.password)) {
          user = { 
            id: u.id, 
            email: u.email, 
            nombre: u.nombre, 
            apellido: u.apellido, 
            tenant_id: u.tenant_id 
          };
        }
      } catch (e) {
        console.error('Error en autenticación fallback:', e);
      }
    }

    if (!user) {
      // 3) Fallback: comparar usando bcrypt en Node si el hash guardado es de ese formato
      try {
        const res2 = await query(
          `SELECT id::text as id, email, password, nombre, apellido, rol, tenant_id::text as tenant_id
           FROM public.usuarios
           WHERE lower(email) = lower($1) AND activo = true
           LIMIT 1`,
          [credentials.email]
        );
        const u2 = res2?.rows?.[0] ?? null;
        if (u2 && comparePassword(credentials.password, u2.password)) {
          user = { id: u2.id, email: u2.email, nombre: u2.nombre, apellido: u2.apellido, rol: u2.rol, tenant_id: u2.tenant_id };
        }
      } catch {}
    }

    if (!user) return null;

    // Actualizar último acceso
    try {
      await vercelSql`UPDATE public.usuarios SET ultimo_acceso = NOW() WHERE id = ${user.id}::uuid`;
    } catch {
      try { await query('UPDATE public.usuarios SET ultimo_acceso = NOW() WHERE id = $1::uuid', [user.id]); } catch {}
    }

    // Obtener rol desde usuarios_roles
    let userRole = 'Sin rol';
    try {
      const roleResult = await vercelSql`
        SELECT r.nombre
        FROM usuarios_roles ur
        JOIN roles r ON ur.rol_id = r.id
        WHERE ur.usuario_id = ${user.id}::uuid
        LIMIT 1
      `;
      if (roleResult.rows.length > 0) {
        userRole = roleResult.rows[0].nombre;
      }
    } catch (e) {
      console.error('Error obteniendo rol:', e);
    }

    // Crear JWT token con tenant_id
    const access_token = signToken({
      user_id: user.id,
      email: user.email,
      name: `${user.nombre} ${user.apellido}`.trim(),
      nombre: user.nombre,
      apellido: user.apellido,
      rol: userRole,
      tenant_id: user.tenant_id
    });

    return {
      access_token,
      user: {
        id: user.id,
        email: user.email,
        nombre: user.nombre,
        apellido: user.apellido,
        rol: userRole,
        tenant_id: user.tenant_id
      }
    };
  } catch (error) {
    console.error('Error autenticando usuario:', error);
    return null;
  }
}

export async function findUserByEmail(email: string): Promise<Usuario | null> {
  try {
    const result = await query(`
      SELECT id, email, password, nombre, apellido, rol, activo, fecha_creacion, ultimo_acceso, telefono, avatar, tenant_id
      FROM usuarios 
      WHERE email = $1 AND activo = true
    `, [email]);

    if (result.rows.length === 0) {
      return null;
    }

    const row = result.rows[0];
    return {
      id: row.id,
      email: row.email,
      password: row.password,
      nombre: row.nombre,
      apellido: row.apellido,
      rol: row.rol,
      activo: row.activo,
      fechaCreacion: row.fecha_creacion,
      ultimoAcceso: row.ultimo_acceso,
      telefono: row.telefono,
      avatar: row.avatar,
      tenant_id: row.tenant_id
    };
  } catch (error) {
    console.error('Error buscando usuario por email:', error);
    return null;
  }
}

export async function findUserById(id: string): Promise<Usuario | null> {
  try {
    const result = await query(`
      SELECT id, email, password, nombre, apellido, rol, activo, fecha_creacion, ultimo_acceso, telefono, avatar, tenant_id
      FROM usuarios 
      WHERE id = $1 AND activo = true
    `, [id]);

    if (result.rows.length === 0) {
      return null;
    }

    const row = result.rows[0];
    return {
      id: row.id,
      email: row.email,
      password: row.password,
      nombre: row.nombre,
      apellido: row.apellido,
      rol: row.rol,
      activo: row.activo,
      fechaCreacion: row.fecha_creacion,
      ultimoAcceso: row.ultimo_acceso,
      telefono: row.telefono,
      avatar: row.avatar,
      tenant_id: row.tenant_id
    };
  } catch (error) {
    console.error('Error buscando usuario por ID:', error);
    return null;
  }
}

export async function getAllUsers(tenantId?: string): Promise<Usuario[]> {
  try {
    let sql = `
      SELECT id, email, password, nombre, apellido, rol, activo, fecha_creacion, ultimo_acceso, telefono, avatar, tenant_id
      FROM usuarios 
      WHERE activo = true
    `;
    
    const params: any[] = [];
    
    if (tenantId) {
      sql += ' AND tenant_id = $1';
      params.push(tenantId);
    }
    
    sql += ' ORDER BY fecha_creacion DESC';

    const result = await query(sql, params);

    return result.rows.map((row: any) => ({
      id: row.id,
      email: row.email,
      password: row.password,
      nombre: row.nombre,
      apellido: row.apellido,
      rol: row.rol,
      activo: row.activo,
      fechaCreacion: row.fecha_creacion,
      ultimoAcceso: row.ultimo_acceso,
      telefono: row.telefono,
      avatar: row.avatar,
      tenant_id: row.tenant_id
    }));
  } catch (error) {
    console.error('Error obteniendo usuarios:', error);
    return [];
  }
}

export async function updateUser(id: string, updates: Partial<Usuario>): Promise<Usuario | null> {
  try {
    // No permitir actualizar ciertos campos críticos
    const { password, id: _, fechaCreacion, tenant_id, ...safeUpdates } = updates;
    
    if (Object.keys(safeUpdates).length === 0) {
      return await findUserById(id);
    }

    const setClause = Object.keys(safeUpdates)
      .map((key, index) => `${key} = $${index + 2}`)
      .join(', ');
    
    const values = [id, ...Object.values(safeUpdates)];

    const result = await query(`
      UPDATE usuarios 
      SET ${setClause}
      WHERE id = $1 AND activo = true
      RETURNING id, email, password, nombre, apellido, rol, activo, fecha_creacion, ultimo_acceso, telefono, avatar, tenant_id
    `, values);

    if (result.rows.length === 0) {
      return null;
    }

    const row = result.rows[0];
    return {
      id: row.id,
      email: row.email,
      password: row.password,
      nombre: row.nombre,
      apellido: row.apellido,
      rol: row.rol,
      activo: row.activo,
      fechaCreacion: row.fecha_creacion,
      ultimoAcceso: row.ultimo_acceso,
      telefono: row.telefono,
      avatar: row.avatar,
      tenant_id: row.tenant_id
    };
  } catch (error) {
    console.error('Error actualizando usuario:', error);
    return null;
  }
}

export async function deleteUser(id: string): Promise<boolean> {
  try {
    // Soft delete - marcar como inactivo
    const result = await query(`
      UPDATE usuarios 
      SET activo = false 
      WHERE id = $1
    `, [id]);

    return result.rowCount > 0;
  } catch (error) {
    console.error('Error eliminando usuario:', error);
    return false;
  }
}

export async function changeUserPassword(id: string, oldPassword: string, newPassword: string): Promise<boolean> {
  try {
    // Verificar contra el hash almacenado usando crypt() en la BD (compatible con bcrypt/pgcrypto)
    const verify = await query(
      `SELECT 1 FROM public.usuarios WHERE id = $1 AND password = crypt($2, password) LIMIT 1`,
      [id, oldPassword]
    );
    if (verify.rows.length === 0) return false;

    // Actualizar usando gen_salt('bf') para mantener formato bcrypt
    const result = await query(
      `UPDATE public.usuarios SET password = crypt($2, gen_salt('bf')) WHERE id = $1`,
      [id, newPassword]
    );
    return result.rowCount > 0;
  } catch (error) {
    console.error('Error cambiando contraseña:', error);
    return false;
  }
}

// Función DESHABILITADA - Ya no crear usuarios por defecto automáticamente
export async function initializeDefaultUsers(): Promise<void> {
  console.log('🚫 initializeDefaultUsers DESHABILITADA - Los usuarios se crean manualmente desde el frontend');
  console.log('✅ No se crearán usuarios automáticamente');
  return;
} 