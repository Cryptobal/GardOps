import { query } from '../database';
import { Instalacion, CrearInstalacion, ActualizarInstalacion } from '../schemas/instalaciones';

// Obtener todas las instalaciones
export async function obtenerInstalaciones(): Promise<Instalacion[]> {
  try {
    const result = await query(`
      SELECT 
        i.*,
        c.nombre as cliente_nombre,
        c.rut as cliente_rut
      FROM instalaciones i
      LEFT JOIN clientes c ON i.cliente_id = c.id
      WHERE i.activo = true
      ORDER BY i.nombre ASC
    `);
    
    return result.rows || [];
  } catch (error) {
    console.error('Error obteniendo instalaciones:', error);
    throw new Error('Error al obtener instalaciones');
  }
}

// Crear nueva instalación
export async function crearInstalacion(data: CrearInstalacion): Promise<Instalacion> {
  try {
    const result = await query(`
      INSERT INTO instalaciones (
        nombre, 
        direccion, 
        comuna, 
        region, 
        cliente_id, 
        tipo_instalacion,
        capacidad,
        descripcion,
        activo
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      RETURNING *
    `, [
      data.nombre,
      data.direccion,
      data.comuna,
      data.region,
      data.cliente_id,
      data.tipo_instalacion,
      data.capacidad,
      data.descripcion,
      true
    ]);
    
    return result.rows[0];
  } catch (error) {
    console.error('Error creando instalación:', error);
    throw new Error('Error al crear instalación');
  }
}

// Actualizar instalación
export async function actualizarInstalacion(data: ActualizarInstalacion): Promise<Instalacion> {
  try {
    const result = await query(`
      UPDATE instalaciones 
      SET 
        nombre = $1,
        direccion = $2,
        comuna = $3,
        region = $4,
        cliente_id = $5,
        tipo_instalacion = $6,
        capacidad = $7,
        descripcion = $8,
        actualizado_en = NOW()
      WHERE id = $9
      RETURNING *
    `, [
      data.nombre,
      data.direccion,
      data.comuna,
      data.region,
      data.cliente_id,
      data.tipo_instalacion,
      data.capacidad,
      data.descripcion,
      data.id
    ]);
    
    if (!result.rows[0]) {
      throw new Error('Instalación no encontrada');
    }
    
    return result.rows[0];
  } catch (error) {
    console.error('Error actualizando instalación:', error);
    throw new Error('Error al actualizar instalación');
  }
}

// Eliminar instalación (marcar como inactiva)
export async function eliminarInstalacion(id: number): Promise<void> {
  try {
    const result = await query(`
      UPDATE instalaciones 
      SET activo = false, actualizado_en = NOW()
      WHERE id = $1
    `, [id]);
    
    if (result.rowCount === 0) {
      throw new Error('Instalación no encontrada');
    }
  } catch (error) {
    console.error('Error eliminando instalación:', error);
    throw new Error('Error al eliminar instalación');
  }
}

// Obtener comunas para filtros
export async function obtenerComunas(): Promise<string[]> {
  try {
    const result = await query(`
      SELECT DISTINCT comuna 
      FROM instalaciones 
      WHERE activo = true AND comuna IS NOT NULL
      ORDER BY comuna ASC
    `);
    
    return result.rows.map((row: any) => row.comuna);
  } catch (error) {
    console.error('Error obteniendo comunas:', error);
    throw new Error('Error al obtener comunas');
  }
}

// Obtener clientes para filtros
export async function obtenerClientes(): Promise<{ id: number; nombre: string; rut: string }[]> {
  try {
    const result = await query(`
      SELECT id, nombre, rut
      FROM clientes 
      WHERE activo = true
      ORDER BY nombre ASC
    `);
    
    return result.rows;
  } catch (error) {
    console.error('Error obteniendo clientes:', error);
    throw new Error('Error al obtener clientes');
  }
} 