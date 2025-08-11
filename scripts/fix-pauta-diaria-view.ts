import dotenv from 'dotenv';
import path from 'path';
import { Client } from 'pg';

dotenv.config({ path: path.join(process.cwd(), '.env.local') });

async function main() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL
  });

  try {
    await client.connect();
    console.log('🔌 Conectado a la base de datos');

    // Eliminar la vista existente
    console.log('🗑️ Eliminando vista existente...');
    await client.query('DROP VIEW IF EXISTS as_turnos_v_pauta_diaria_dedup CASCADE');

    // Recrear la vista corregida
    console.log('🔨 Creando vista corregida...');
    await client.query(`
      CREATE OR REPLACE VIEW as_turnos_v_pauta_diaria_dedup AS
      WITH pauta_dedup AS (
        SELECT DISTINCT ON (pm.puesto_id, pm.anio, pm.mes, pm.dia)
          pm.id::text as pauta_id,
          pm.puesto_id,
          pm.guardia_id,
          pm.anio,
          pm.mes,
          pm.dia,
          TO_DATE(CONCAT(pm.anio, '-', pm.mes, '-', pm.dia), 'YYYY-MM-DD') as fecha,
          pm.estado,
          pm.observaciones,
          pm.meta,
          pm.estado_ui as estado_ui_tabla,
          
          -- Información de la instalación
          i.id as instalacion_id,
          i.nombre as instalacion_nombre,
          
          -- Información del guardia titular
          g.id as guardia_titular_id,
          CONCAT(g.apellido_paterno, ' ', g.apellido_materno, ', ', g.nombre) as guardia_titular_nombre,
          
          -- Información del puesto
          po.nombre_puesto as puesto_nombre,
          po.es_ppc,
          
          -- Información del rol de servicio
          rs.id as rol_id,
          rs.nombre as rol_nombre,
          rs.hora_inicio::text as hora_inicio,
          rs.hora_termino::text as hora_fin
          
        FROM as_turnos_pauta_mensual pm
        INNER JOIN as_turnos_puestos_operativos po ON pm.puesto_id = po.id
        INNER JOIN instalaciones i ON po.instalacion_id = i.id
        LEFT JOIN guardias g ON pm.guardia_id = g.id
        LEFT JOIN as_turnos_roles_servicio rs ON po.rol_id = rs.id
        WHERE po.activo = true
        ORDER BY pm.puesto_id, pm.anio, pm.mes, pm.dia, pm.id DESC
      )
      SELECT 
        pd.pauta_id,
        pd.fecha::text,
        pd.puesto_id::text,
        pd.puesto_nombre,
        pd.instalacion_id::text,
        pd.instalacion_nombre,
        pd.estado,
        
        -- Estado UI: usar el valor del meta si existe, sino aplicar lógica por defecto
        COALESCE(
          pd.meta->>'estado_ui',
          pd.estado_ui_tabla,
          CASE 
            WHEN pd.estado = 'reemplazo' THEN 'reemplazo'
            WHEN pd.estado IN ('trabajado', 'T') AND pd.meta->>'cobertura_guardia_id' IS NOT NULL THEN 'reemplazo'
            WHEN pd.estado IN ('trabajado', 'T') THEN 'asistido'
            WHEN pd.estado = 'libre' THEN 'libre'
            WHEN pd.estado = 'sin_cobertura' THEN 'sin_cobertura'
            WHEN pd.estado = 'inasistencia' THEN 'sin_cobertura'
            WHEN pd.estado = 'permiso' THEN 'permiso'
            WHEN pd.estado = 'licencia' THEN 'licencia'
            WHEN pd.es_ppc AND pd.guardia_id IS NULL THEN 'ppc_libre'
            ELSE 'plan'
          END
        ) as estado_ui,
        
        -- Metadatos: usar directamente el campo meta de la tabla
        pd.meta,
        
        -- ID del guardia que trabaja (de cobertura si existe, sino el titular)
        COALESCE(pd.meta->>'cobertura_guardia_id', pd.guardia_id::text) as guardia_trabajo_id,
        
        -- Nombre del guardia que trabaja
        CASE 
          WHEN pd.meta->>'cobertura_guardia_id' IS NOT NULL THEN 
            (SELECT CONCAT(apellido_paterno, ' ', apellido_materno, ', ', nombre) 
             FROM guardias WHERE id::text = pd.meta->>'cobertura_guardia_id')
          ELSE pd.guardia_titular_nombre
        END as guardia_trabajo_nombre,
        
        -- Información del guardia titular
        pd.guardia_titular_id::text,
        pd.guardia_titular_nombre,
        
        -- Flags de estado
        pd.es_ppc,
        (pd.meta->>'cobertura_guardia_id' IS NOT NULL) as es_reemplazo,
        (pd.estado IN ('sin_cobertura', 'inasistencia')) as es_sin_cobertura,
        (pd.estado = 'inasistencia' OR pd.meta->>'falta_sin_aviso' = 'true') as es_falta_sin_aviso,
        (pd.es_ppc AND pd.guardia_id IS NULL AND pd.meta->>'cobertura_guardia_id' IS NULL) OR 
        (pd.estado IN ('sin_cobertura', 'inasistencia') AND pd.meta->>'cobertura_guardia_id' IS NULL) as necesita_cobertura,
        
        -- Información del horario
        pd.hora_inicio,
        pd.hora_fin,
        pd.rol_id::text,
        pd.rol_nombre,
        NULL::text as rol_alias,
        
        -- Nombres de reemplazo/cobertura (para compatibilidad)
        CASE 
          WHEN pd.meta->>'cobertura_guardia_id' IS NOT NULL THEN 
            (SELECT CONCAT(apellido_paterno, ' ', apellido_materno, ', ', nombre) 
             FROM guardias WHERE id::text = pd.meta->>'cobertura_guardia_id')
          ELSE NULL
        END as reemplazo_guardia_nombre,
        
        CASE 
          WHEN pd.meta->>'cobertura_guardia_id' IS NOT NULL THEN 
            (SELECT CONCAT(apellido_paterno, ' ', apellido_materno, ', ', nombre) 
             FROM guardias WHERE id::text = pd.meta->>'cobertura_guardia_id')
          ELSE NULL
        END as cobertura_guardia_nombre
        
      FROM pauta_dedup pd
    `);

    console.log('✅ Vista recreada exitosamente');

    // Verificar que funciona correctamente
    console.log('\n🧪 Verificando vista actualizada...');
    const { rows } = await client.query(`
      SELECT 
        pauta_id,
        estado,
        estado_ui,
        meta,
        meta->>'cobertura_guardia_id' as cobertura_id,
        cobertura_guardia_nombre,
        guardia_trabajo_nombre,
        es_reemplazo
      FROM as_turnos_v_pauta_diaria_dedup
      WHERE pauta_id = '43'
    `);

    if (rows.length > 0) {
      console.log('\n📊 Datos en la vista actualizada:');
      console.log(`  Pauta ID: ${rows[0].pauta_id}`);
      console.log(`  Estado: ${rows[0].estado}`);
      console.log(`  Estado UI: ${rows[0].estado_ui}`);
      console.log(`  Cobertura ID: ${rows[0].cobertura_id}`);
      console.log(`  Cobertura nombre: ${rows[0].cobertura_guardia_nombre}`);
      console.log(`  Guardia trabajo: ${rows[0].guardia_trabajo_nombre}`);
      console.log(`  Es reemplazo: ${rows[0].es_reemplazo}`);
      
      if (rows[0].cobertura_guardia_nombre) {
        console.log('\n✅ ¡El nombre del guardia de cobertura se muestra correctamente!');
      } else if (rows[0].cobertura_id) {
        console.log('\n⚠️ Se encontró el ID de cobertura pero no el nombre');
      } else {
        console.log('\n❌ No se encontró información de cobertura');
      }
    }

    // Comentario en la vista
    await client.query(`
      COMMENT ON VIEW as_turnos_v_pauta_diaria_dedup IS 
      'Vista para pauta diaria con deduplicación. Actualizada para tomar datos de cobertura del campo meta de as_turnos_pauta_mensual'
    `);

  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  } finally {
    await client.end();
    console.log('\n🔌 Conexión cerrada');
  }
}

main().catch(console.error);
