import { query } from '../database';
import { Cliente, CrearClienteData, ActualizarClienteData } from '../schemas/clientes';

import { logger, devLogger, apiLogger } from '@/lib/utils/logger';
// Obtener todos los clientes
export async function obtenerClientes(): Promise<Cliente[]> {
  try {
    const result = await query(`
      SELECT 
        id,
        nombre,
        rut,
        representante_legal,
        rut_representante,
        email,
        telefono,
        direccion,
        latitud,
        longitud,
        razon_social,
        estado,
        created_at,
        updated_at,
        tenant_id
      FROM clientes 
      ORDER BY created_at DESC
    `);
    
    return result.rows;
  } catch (error) {
    console.error('❌ Error obteniendo clientes:', error);
    throw new Error('Error al obtener clientes');
  }
}

// Obtener cliente por ID
export async function obtenerClientePorId(id: string): Promise<Cliente | null> {
  try {
    const result = await query(`
      SELECT 
        id,
        nombre,
        rut,
        representante_legal,
        rut_representante,
        email,
        telefono,
        direccion,
        latitud,
        longitud,
        razon_social,
        estado,
        created_at,
        updated_at,
        tenant_id
      FROM clientes 
      WHERE id = $1
    `, [id]);
    
    return result.rows[0] || null;
  } catch (error) {
    console.error('❌ Error obteniendo cliente:', error);
    throw new Error('Error al obtener cliente');
  }
}

// Crear nuevo cliente
export async function crearCliente(data: CrearClienteData): Promise<Cliente> {
  try {
    const result = await query(`
      INSERT INTO clientes (
        id,
        nombre,
        rut,
        representante_legal,
        rut_representante,
        email,
        telefono,
        direccion,
        latitud,
        longitud,
        razon_social,
        estado,
        created_at,
        updated_at
      ) VALUES (
        gen_random_uuid(),
        $1,
        $2,
        $3,
        $4,
        $5,
        $6,
        $7,
        $8,
        $9,
        $10,
        'Activo',
        NOW(),
        NOW()
      )
      RETURNING 
        id,
        nombre,
        rut,
        representante_legal,
        rut_representante,
        email,
        telefono,
        direccion,
        latitud,
        longitud,
        razon_social,
        estado,
        created_at,
        updated_at,
        tenant_id
    `, [
      data.nombre,
      data.rut,
      data.representante_legal || null,
      data.rut_representante || null,
      data.email || null,
      data.telefono || null,
      data.direccion || null,
      data.latitud || null,
      data.longitud || null,
      data.razon_social || data.nombre // Si no hay razón social, usar el nombre
    ]);
    
    return result.rows[0];
  } catch (error) {
    console.error('❌ Error creando cliente:', error);
    throw new Error('Error al crear cliente');
  }
}

// Actualizar cliente - lógica simplificada y más robusta
export async function actualizarCliente(data: ActualizarClienteData): Promise<Cliente> {
  try {
    devLogger.process(' Actualizando cliente con datos:', data);

    // Validar si se está intentando inactivar el cliente
    if (data.estado === 'Inactivo') {
      // Verificar si el cliente tiene instalaciones activas
      const instalacionesActivas = await query(`
        SELECT COUNT(*) as count 
        FROM instalaciones 
        WHERE cliente_id = $1 AND estado = 'Activo'
      `, [data.id]);

      if (instalacionesActivas.rows[0].count > 0) {
        // Obtener información detallada de las instalaciones
        const instalacionesDetalle = await query(`
          SELECT id, nombre, estado
          FROM instalaciones 
          WHERE cliente_id = $1
          ORDER BY estado DESC, nombre
        `, [data.id]);

        const instalacionesActivasDetalle = instalacionesDetalle.rows.filter((i: any) => i.estado === 'Activo');
        const instalacionesInactivasDetalle = instalacionesDetalle.rows.filter((i: any) => i.estado === 'Inactivo');

        const error = new Error('No se puede inactivar el cliente porque tiene instalaciones activas. Primero debe inactivar todas las instalaciones asociadas.');
        (error as any).instalacionesActivas = instalacionesActivasDetalle;
        (error as any).instalacionesInactivas = instalacionesInactivasDetalle;
        (error as any).clienteId = data.id;
        
        throw error;
      }
    }

    // Construir SET dinámico con todos los campos que vienen en data
    const setClauses: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;

    // Siempre agregar updated_at
    setClauses.push(`updated_at = NOW()`);

    // Agregar campos solo si están presentes en data (excluyendo id)
    const fieldsToUpdate = ['nombre', 'rut', 'representante_legal', 'rut_representante', 
                           'email', 'telefono', 'direccion', 'latitud', 'longitud', 
                           'razon_social', 'estado'];

    fieldsToUpdate.forEach(field => {
      if (field in data && field !== 'id') {
        setClauses.push(`${field} = $${paramIndex++}`);
        
        // Convertir strings vacíos a null para campos opcionales
        let value = (data as any)[field];
        if (typeof value === 'string' && value === '') {
          value = null;
        }
        values.push(value);
      }
    });

    // Agregar el ID al final
    values.push(data.id);

    logger.debug('🔧 SET clauses:', setClauses);
    logger.debug('🔧 Values:', values);

    if (setClauses.length === 1) { // Solo updated_at
      throw new Error('No se proporcionaron campos para actualizar');
    }

    const result = await query(`
      UPDATE clientes 
      SET ${setClauses.join(', ')}
      WHERE id = $${paramIndex}
      RETURNING 
        id,
        nombre,
        rut,
        representante_legal,
        rut_representante,
        email,
        telefono,
        direccion,
        latitud,
        longitud,
        razon_social,
        estado,
        created_at,
        updated_at,
        tenant_id
    `, values);
    
    if (result.rowCount === 0) {
      throw new Error('Cliente no encontrado');
    }

    logger.debug('✅ Cliente actualizado exitosamente');
    return result.rows[0];
  } catch (error) {
    console.error('❌ Error actualizando cliente:', error);
    throw error;
  }
}

// Eliminar cliente
export async function eliminarCliente(id: string): Promise<void> {
  try {
    const result = await query(`
      DELETE FROM clientes WHERE id = $1
    `, [id]);
    
    if (result.rowCount === 0) {
      throw new Error('Cliente no encontrado');
    }
  } catch (error) {
    console.error('❌ Error eliminando cliente:', error);
    throw new Error('Error al eliminar cliente');
  }
}

// Verificar si existe cliente por RUT
export async function existeClientePorRut(rut: string, excludeId?: string): Promise<boolean> {
  try {
    const result = await query(`
      SELECT id FROM clientes 
      WHERE rut = $1 
      ${excludeId ? 'AND id != $2' : ''}
    `, excludeId ? [rut, excludeId] : [rut]);
    
    return result.rows.length > 0;
  } catch (error) {
    console.error('❌ Error verificando RUT:', error);
    return false;
  }
} 