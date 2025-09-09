import { query } from '../src/lib/database';

async function checkInstalacionDocumentos() {
  try {
    const instalacionId = 'fb0d4f19-75f3-457e-8181-df032266441c'; // Aerodromo Victor Lafón F
    
    console.log('🔍 Verificando documentos de la instalación:', instalacionId);
    
    // Buscar en documentos_instalacion
    const queryInstalacion = `
      SELECT 
        di.*,
        i.nombre as instalacion_nombre,
        td.nombre as tipo_documento_nombre
      FROM documentos_instalacion di
      LEFT JOIN instalaciones i ON di.instalacion_id = i.id
      LEFT JOIN tipos_documentos td ON di.tipo_documento_id = td.id
      WHERE di.instalacion_id = $1
    `;
    
    const resultInstalacion = await query(queryInstalacion, [instalacionId]);
    console.log('📋 Documentos en documentos_instalacion:', resultInstalacion.rows);
    
    // Buscar en documentos_clientes (por si acaso)
    const queryClientes = `
      SELECT 
        dc.*,
        c.nombre as cliente_nombre,
        td.nombre as tipo_documento_nombre
      FROM documentos_clientes dc
      LEFT JOIN clientes c ON dc.cliente_id = c.id
      LEFT JOIN tipos_documentos td ON dc.tipo_documento_id = td.id
      WHERE c.id IN (
        SELECT cliente_id FROM instalaciones WHERE id = $1
      )
    `;
    
    const resultClientes = await query(queryClientes, [instalacionId]);
    console.log('📋 Documentos en documentos_clientes:', resultClientes.rows);
    
    // Buscar en alertas de documentos
    const queryAlertas = `
      SELECT 
        di.id as documento_id,
        COALESCE(td.nombre, di.tipo) as documento_nombre,
        di.fecha_vencimiento,
        i.nombre as entidad_nombre,
        i.id as entidad_id,
        td.nombre as tipo_documento_nombre,
        td.dias_antes_alarma,
        (di.fecha_vencimiento::date - CURRENT_DATE) as dias_restantes,
        CASE 
          WHEN di.fecha_vencimiento::date < CURRENT_DATE THEN 'El documento ha vencido'
          WHEN di.fecha_vencimiento::date = CURRENT_DATE THEN 'El documento vence hoy'
          WHEN (di.fecha_vencimiento::date - CURRENT_DATE) = 1 THEN 'El documento vence mañana'
          ELSE 'El documento vence en ' || (di.fecha_vencimiento::date - CURRENT_DATE) || ' días'
        END as mensaje,
        'instalaciones' as modulo
      FROM documentos_instalacion di
      JOIN instalaciones i ON di.instalacion_id = i.id
      LEFT JOIN tipos_documentos td ON di.tipo_documento_id = td.id
      WHERE di.instalacion_id = $1
        AND di.fecha_vencimiento IS NOT NULL
        AND td.requiere_vencimiento = true
        AND (di.fecha_vencimiento::date - CURRENT_DATE) <= COALESCE(td.dias_antes_alarma, 30)
        AND (di.fecha_vencimiento::date - CURRENT_DATE) >= -365
    `;
    
    const resultAlertas = await query(queryAlertas, [instalacionId]);
    console.log('📋 Alertas de documentos:', resultAlertas.rows);
    
  } catch (error) {
    console.error('❌ Error verificando documentos de instalación:', error);
  }
}

checkInstalacionDocumentos(); 