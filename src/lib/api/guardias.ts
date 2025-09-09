import { query } from '../database';

import { logger, devLogger, apiLogger } from '@/lib/utils/logger';
export interface Guardia {
  id: string;
  tenant_id: string;
  nombre: string;
  apellido: string;
  email?: string;
  telefono?: string;
  activo: boolean;
  creado_en: Date;
  legacy_id?: number;
}

export interface CreateGuardiaData {
  tenant_id: string;
  nombre: string;
  apellido: string;
  email?: string;
  telefono?: string;
}

// Obtener todos los guardias filtrados por tenant_id
export async function getAllGuardias(tenantId: string): Promise<Guardia[]> {
  try {
    const result = await query(`
      SELECT id, tenant_id, nombre, apellido, email, telefono, activo, creado_en, legacy_id
      FROM guardias 
      WHERE tenant_id = $1 AND activo = true
      ORDER BY apellido, nombre
    `, [tenantId]);

    return result.rows.map((row: any) => ({
      id: row.id,
      tenant_id: row.tenant_id,
      nombre: row.nombre,
      apellido: row.apellido,
      email: row.email,
      telefono: row.telefono,
      activo: row.activo,
      creado_en: row.creado_en,
      legacy_id: row.legacy_id
    }));
  } catch (error) {
    logger.error('Error obteniendo guardias::', error);
    return [];
  }
}

// Crear nuevo guardia
export async function createGuardia(data: CreateGuardiaData): Promise<Guardia | null> {
  try {
    // Verificar que el email no exista si se proporciona
    if (data.email) {
      const existingGuardia = await query(
        'SELECT id FROM guardias WHERE email = $1 AND tenant_id = $2', 
        [data.email, data.tenant_id]
      );
      if (existingGuardia.rows.length > 0) {
        throw new Error('Ya existe un guardia con ese email en este tenant');
      }
    }

    const result = await query(`
      INSERT INTO guardias (tenant_id, nombre, apellido, email, telefono)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING id, tenant_id, nombre, apellido, email, telefono, activo, creado_en
    `, [data.tenant_id, data.nombre, data.apellido, data.email, data.telefono]);

    const row = result.rows[0];
    return {
      id: row.id,
      tenant_id: row.tenant_id,
      nombre: row.nombre,
      apellido: row.apellido,
      email: row.email,
      telefono: row.telefono,
      activo: row.activo,
      creado_en: row.creado_en
    };
  } catch (error) {
    logger.error('Error creando guardia::', error);
    return null;
  }
}

// Obtener guardia por ID (con verificación de tenant)
export async function getGuardiaById(id: string, tenantId: string): Promise<Guardia | null> {
  try {
    const result = await query(`
      SELECT id, tenant_id, nombre, apellido, email, telefono, activo, creado_en, legacy_id
      FROM guardias 
      WHERE id = $1 AND tenant_id = $2 AND activo = true
    `, [id, tenantId]);

    if (result.rows.length === 0) {
      return null;
    }

    const row = result.rows[0];
    return {
      id: row.id,
      tenant_id: row.tenant_id,
      nombre: row.nombre,
      apellido: row.apellido,
      email: row.email,
      telefono: row.telefono,
      activo: row.activo,
      creado_en: row.creado_en,
      legacy_id: row.legacy_id
    };
  } catch (error) {
    logger.error('Error obteniendo guardia por ID::', error);
    return null;
  }
}

// Actualizar guardia
export async function updateGuardia(id: string, tenantId: string, updates: Partial<CreateGuardiaData>): Promise<Guardia | null> {
  try {
    // Verificar que el guardia pertenece al tenant
    const existing = await getGuardiaById(id, tenantId);
    if (!existing) {
      return null;
    }

    // Verificar email único si se está actualizando
    if (updates.email && updates.email !== existing.email) {
      const emailExists = await query(
        'SELECT id FROM guardias WHERE email = $1 AND tenant_id = $2 AND id != $3', 
        [updates.email, tenantId, id]
      );
      if (emailExists.rows.length > 0) {
        throw new Error('Ya existe otro guardia con ese email en este tenant');
      }
    }

    const setClause = Object.keys(updates)
      .map((key, index) => `${key} = $${index + 3}`)
      .join(', ');
    
    const values = [id, tenantId, ...Object.values(updates)];

    const result = await query(`
      UPDATE guardias 
      SET ${setClause}
      WHERE id = $1 AND tenant_id = $2 AND activo = true
      RETURNING id, tenant_id, nombre, apellido, email, telefono, activo, creado_en, legacy_id
    `, values);

    if (result.rows.length === 0) {
      return null;
    }

    const row = result.rows[0];
    return {
      id: row.id,
      tenant_id: row.tenant_id,
      nombre: row.nombre,
      apellido: row.apellido,
      email: row.email,
      telefono: row.telefono,
      activo: row.activo,
      creado_en: row.creado_en,
      legacy_id: row.legacy_id
    };
  } catch (error) {
    logger.error('Error actualizando guardia::', error);
    return null;
  }
}

// Eliminar guardia (soft delete)
export async function deleteGuardia(id: string, tenantId: string): Promise<boolean> {
  try {
    const result = await query(`
      UPDATE guardias 
      SET activo = false 
      WHERE id = $1 AND tenant_id = $2
    `, [id, tenantId]);

    return result.rowCount > 0;
  } catch (error) {
    logger.error('Error eliminando guardia::', error);
    return false;
  }
}

// Buscar guardias por nombre/apellido filtrado por tenant
export async function searchGuardias(searchTerm: string, tenantId: string): Promise<Guardia[]> {
  try {
    const result = await query(`
      SELECT id, tenant_id, nombre, apellido, email, telefono, activo, creado_en, legacy_id
      FROM guardias 
      WHERE tenant_id = $1 AND activo = true
      AND (
        LOWER(nombre) LIKE LOWER($2) OR 
        LOWER(apellido) LIKE LOWER($2) OR
        LOWER(CONCAT(nombre, ' ', apellido)) LIKE LOWER($2)
      )
      ORDER BY apellido, nombre
    `, [tenantId, `%${searchTerm}%`]);

    return result.rows.map((row: any) => ({
      id: row.id,
      tenant_id: row.tenant_id,
      nombre: row.nombre,
      apellido: row.apellido,
      email: row.email,
      telefono: row.telefono,
      activo: row.activo,
      creado_en: row.creado_en,
      legacy_id: row.legacy_id
    }));
  } catch (error) {
    logger.error('Error buscando guardias::', error);
    return [];
  }
} 

// Eliminar guardia completamente (hard delete)
export async function eliminarGuardiaCompleto(id: string, tenantId: string): Promise<boolean> {
  try {
    // Verificar si el guardia tiene asignaciones activas
    const asignacionesResult = await query(`
      SELECT COUNT(*) as total_asignaciones
      FROM as_turnos_puestos_operativos 
      WHERE guardia_id = $1 AND activo = true
    `, [id]);

    const totalAsignaciones = parseInt(asignacionesResult.rows[0].total_asignaciones);

    if (totalAsignaciones > 0) {
      throw new Error(`No se puede eliminar el guardia porque tiene ${totalAsignaciones} asignación(es) activa(s)`);
    }

    const result = await query(`
      DELETE FROM guardias 
      WHERE id = $1 AND tenant_id = $2
    `, [id, tenantId]);

    return result.rowCount > 0;
  } catch (error) {
    logger.error('Error eliminando guardia completamente::', error);
    throw error;
  }
} 