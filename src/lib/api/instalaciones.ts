import { query } from '../database';
import { Instalacion, CrearInstalacionData, ActualizarInstalacionData } from '../schemas/instalaciones';

// Obtener todas las instalaciones
export async function obtenerInstalaciones(): Promise<Instalacion[]> {
  try {
    const result = await query(`
      SELECT 
        i.id,
        i.nombre,
        i.cliente_id,
        i.direccion,
        i.latitud,
        i.longitud,
        i.region,
        i.ciudad,
        i.comuna,
        i.estado,
        i.created_at,
        i.updated_at,
        i.tenant_id,
        c.nombre as cliente_nombre,
        c.rut as cliente_rut,
        COALESCE(gc.guardias_count, 0) as guardias_asignados,
        COALESCE(pc.puestos_cubiertos, 0) as puestos_cubiertos,
        COALESCE(ppc.puestos_por_cubrir, 0) as puestos_por_cubrir
      FROM instalaciones i
      LEFT JOIN clientes c ON i.cliente_id = c.id
      LEFT JOIN (
        SELECT instalacion_id, COUNT(*) as guardias_count
        FROM guardias 
        WHERE estado = 'Activo'
        GROUP BY instalacion_id
      ) gc ON i.id = gc.instalacion_id
      LEFT JOIN (
        SELECT instalacion_id, COUNT(*) as puestos_cubiertos
        FROM puestos_operativos 
        WHERE estado = 'Cubierto'
        GROUP BY instalacion_id
      ) pc ON i.id = pc.instalacion_id
      LEFT JOIN (
        SELECT instalacion_id, COUNT(*) as puestos_por_cubrir
        FROM puestos_por_cubrir 
        WHERE estado = 'Pendiente'
        GROUP BY instalacion_id
      ) ppc ON i.id = ppc.instalacion_id
      WHERE i.estado = 'Activo'
      ORDER BY i.created_at DESC
    `);
    
    return result.rows;
  } catch (error) {
    console.error('❌ Error obteniendo instalaciones:', error);
    throw new Error('Error al obtener instalaciones');
  }
}

// Obtener instalación por ID
export async function obtenerInstalacionPorId(id: string): Promise<Instalacion | null> {
  try {
    const result = await query(`
      SELECT 
        i.id,
        i.nombre,
        i.cliente_id,
        i.direccion,
        i.latitud,
        i.longitud,
        i.region,
        i.ciudad,
        i.comuna,
        i.estado,
        i.created_at,
        i.updated_at,
        i.tenant_id,
        c.nombre as cliente_nombre,
        c.rut as cliente_rut,
        COALESCE(gc.guardias_count, 0) as guardias_asignados,
        COALESCE(pc.puestos_cubiertos, 0) as puestos_cubiertos,
        COALESCE(ppc.puestos_por_cubrir, 0) as puestos_por_cubrir
      FROM instalaciones i
      LEFT JOIN clientes c ON i.cliente_id = c.id
      LEFT JOIN (
        SELECT instalacion_id, COUNT(*) as guardias_count
        FROM guardias 
        WHERE estado = 'Activo'
        GROUP BY instalacion_id
      ) gc ON i.id = gc.instalacion_id
      LEFT JOIN (
        SELECT instalacion_id, COUNT(*) as puestos_cubiertos
        FROM puestos_operativos 
        WHERE estado = 'Cubierto'
        GROUP BY instalacion_id
      ) pc ON i.id = pc.instalacion_id
      LEFT JOIN (
        SELECT instalacion_id, COUNT(*) as puestos_por_cubrir
        FROM puestos_por_cubrir 
        WHERE estado = 'Pendiente'
        GROUP BY instalacion_id
      ) ppc ON i.id = ppc.instalacion_id
      WHERE i.id = $1
    `, [id]);
    
    return result.rows[0] || null;
  } catch (error) {
    console.error('❌ Error obteniendo instalación por ID:', error);
    throw new Error('Error al obtener instalación');
  }
}

// Crear nueva instalación
export async function crearInstalacion(data: CrearInstalacionData): Promise<Instalacion> {
  try {
    const result = await query(`
      INSERT INTO instalaciones (
        nombre, 
        cliente_id,
        direccion,
        latitud,
        longitud,
        region,
        ciudad,
        comuna,
        estado,
        created_at,
        updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW(), NOW())
      RETURNING *
    `, [
      data.nombre,
      data.cliente_id,
      data.direccion,
      data.latitud,
      data.longitud,
      data.region,
      data.ciudad,
      data.comuna,
      data.estado
    ]);
    
    return result.rows[0];
  } catch (error) {
    console.error('❌ Error creando instalación:', error);
    throw new Error('Error al crear instalación');
  }
}

// Actualizar instalación
export async function actualizarInstalacion(data: ActualizarInstalacionData): Promise<Instalacion> {
  try {
    const result = await query(`
      UPDATE instalaciones 
      SET 
        nombre = $2,
        cliente_id = $3,
        direccion = $4,
        latitud = $5,
        longitud = $6,
        region = $7,
        ciudad = $8,
        comuna = $9,
        estado = $10,
        updated_at = NOW()
      WHERE id = $1
      RETURNING *
    `, [
      data.id,
      data.nombre,
      data.cliente_id,
      data.direccion,
      data.latitud,
      data.longitud,
      data.region,
      data.ciudad,
      data.comuna,
      data.estado
    ]);
    
    if (!result.rows[0]) {
      throw new Error('Instalación no encontrada');
    }
    
    return result.rows[0];
  } catch (error) {
    console.error('❌ Error actualizando instalación:', error);
    throw new Error('Error al actualizar instalación');
  }
}

// Eliminar instalación (marcar como inactiva)
export async function eliminarInstalacion(id: string): Promise<void> {
  try {
    const result = await query(`
      UPDATE instalaciones 
      SET estado = 'Inactivo', updated_at = NOW()
      WHERE id = $1
    `, [id]);
    
    if (result.rowCount === 0) {
      throw new Error('Instalación no encontrada');
    }
  } catch (error) {
    console.error('❌ Error eliminando instalación:', error);
    throw new Error('Error al eliminar instalación');
  }
}

// Obtener comunas para filtros
export async function obtenerComunas(): Promise<string[]> {
  try {
    const result = await query(`
      SELECT DISTINCT comuna 
      FROM instalaciones 
      WHERE estado = 'Activo' AND comuna IS NOT NULL AND comuna != ''
      ORDER BY comuna ASC
    `);
    
    return result.rows.map((row: any) => row.comuna);
  } catch (error) {
    console.error('❌ Error obteniendo comunas:', error);
    throw new Error('Error al obtener comunas');
  }
}

// Obtener clientes para filtros
export async function obtenerClientesParaInstalaciones(): Promise<{ id: string; nombre: string; rut: string }[]> {
  try {
    const result = await query(`
      SELECT id, nombre, rut
      FROM clientes 
      WHERE estado = 'Activo'
      ORDER BY nombre ASC
    `);
    
    return result.rows;
  } catch (error) {
    console.error('❌ Error obteniendo clientes:', error);
    throw new Error('Error al obtener clientes');
  }
}

// Obtener instalaciones por cliente
export async function obtenerInstalacionesPorCliente(clienteId: string): Promise<Instalacion[]> {
  try {
    const result = await query(`
      SELECT 
        i.*,
        COALESCE(gc.guardias_count, 0) as guardias_asignados,
        COALESCE(pc.puestos_cubiertos, 0) as puestos_cubiertos,
        COALESCE(ppc.puestos_por_cubrir, 0) as puestos_por_cubrir
      FROM instalaciones i
      LEFT JOIN (
        SELECT instalacion_id, COUNT(*) as guardias_count
        FROM guardias 
        WHERE estado = 'Activo'
        GROUP BY instalacion_id
      ) gc ON i.id = gc.instalacion_id
      LEFT JOIN (
        SELECT instalacion_id, COUNT(*) as puestos_cubiertos
        FROM puestos_operativos 
        WHERE estado = 'Cubierto'
        GROUP BY instalacion_id
      ) pc ON i.id = pc.instalacion_id
      LEFT JOIN (
        SELECT instalacion_id, COUNT(*) as puestos_por_cubrir
        FROM puestos_por_cubrir 
        WHERE estado = 'Pendiente'
        GROUP BY instalacion_id
      ) ppc ON i.id = ppc.instalacion_id
      WHERE i.cliente_id = $1 AND i.estado = 'Activo'
      ORDER BY i.nombre ASC
    `, [clienteId]);
    
    return result.rows;
  } catch (error) {
    console.error('❌ Error obteniendo instalaciones por cliente:', error);
    throw new Error('Error al obtener instalaciones del cliente');
  }
} 