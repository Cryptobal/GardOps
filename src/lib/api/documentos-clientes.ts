import { query } from '../database';
import { DocumentoCliente } from '../schemas/clientes';

// Obtener documentos de un cliente
export async function obtenerDocumentosCliente(clienteId: string): Promise<DocumentoCliente[]> {
  try {
    const result = await query(`
      SELECT 
        dc.id,
        dc.cliente_id,
        dc.nombre,
        dc.tipo,
        dc.archivo_url,
        dc.tamaño,
        dc.created_at,
        dc.tipo_documento_id,
        td.nombre as tipo_documento_nombre
      FROM documentos_clientes dc
      LEFT JOIN documentos_tipos td ON dc.tipo_documento_id = td.id
      WHERE dc.cliente_id = $1
      ORDER BY dc.created_at DESC
      LIMIT 100
    `, [clienteId]);
    
    return result.rows;
  } catch (error) {
    console.error('❌ Error obteniendo documentos del cliente:', error);
    // En lugar de throw, devolver array vacío para no bloquear la UI
    return [];
  }
}

// Crear nuevo documento para cliente
export async function crearDocumentoCliente(
  clienteId: string,
  nombre: string,
  tipo: string,
  archivoUrl: string,
  tamaño: number,
  tipoDocumentoId?: string
): Promise<DocumentoCliente> {
  try {
    const result = await query(`
      INSERT INTO documentos_clientes (
        id,
        cliente_id,
        nombre,
        tipo,
        archivo_url,
        tamaño,
        tipo_documento_id,
        created_at
      ) VALUES (
        gen_random_uuid(),
        $1,
        $2,
        $3,
        $4,
        $5,
        $6,
        NOW()
      )
      RETURNING 
        id,
        cliente_id,
        nombre,
        tipo,
        archivo_url,
        tamaño,
        tipo_documento_id,
        created_at
    `, [clienteId, nombre, tipo, archivoUrl, tamaño, tipoDocumentoId]);
    
    return result.rows[0];
  } catch (error) {
    console.error('❌ Error creando documento del cliente:', error);
    throw new Error('Error al crear documento del cliente');
  }
}

// Eliminar documento de cliente
export async function eliminarDocumentoCliente(documentoId: string): Promise<void> {
  try {
    const result = await query(`
      DELETE FROM documentos_clientes WHERE id = $1
    `, [documentoId]);
    
    if (result.rowCount === 0) {
      throw new Error('Documento no encontrado');
    }
  } catch (error) {
    console.error('❌ Error eliminando documento del cliente:', error);
    throw new Error('Error al eliminar documento del cliente');
  }
}

// Crear tabla documentos_clientes - versión simplificada
export async function crearTablaDocumentosClientes(): Promise<void> {
  try {
    // Solo verificar si existe, no crear automáticamente
    const existeTabla = await query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_name = 'documentos_clientes'
      );
    `);

    if (!existeTabla.rows[0].exists) {
      console.log('⚠️ Tabla documentos_clientes no existe. Ejecuta la migración: GET /api/migrate-documentos');
      return;
    }

    console.log('✅ Tabla documentos_clientes verificada');
    
  } catch (error) {
    console.error('❌ Error verificando tabla documentos_clientes:', error);
  }
} 