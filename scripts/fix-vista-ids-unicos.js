const { Pool } = require('pg');
require('dotenv').config({ path: '.env.local' });

// Configurar conexión a la base de datos
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL.includes('localhost') ? false : { rejectUnauthorized: false }
});

async function fixVistaIdsUnicos() {
  console.log('🔧 CORRIGIENDO VISTA PARA IDs ÚNICOS\n');

  const client = await pool.connect();
  
  try {
    console.log('1️⃣ Eliminando vista existente...');
    await client.query('DROP VIEW IF EXISTS central_v_llamados_automaticos');
    console.log('✅ Vista eliminada');

    console.log('2️⃣ Creando vista con IDs únicos...');
    
    const createViewSQL = `
    CREATE VIEW central_v_llamados_automaticos AS
    WITH datos_base AS (
      SELECT DISTINCT
        pm.id as pauta_id,
        pm.puesto_id,
        pm.guardia_id,
        po.instalacion_id,
        i.nombre AS instalacion_nombre,
        i.telefono AS instalacion_telefono,
        g.nombre AS guardia_nombre,
        po.nombre_puesto,
        rs.nombre AS rol_nombre,
        cci.intervalo_minutos,
        cci.ventana_inicio,
        cci.ventana_fin,
        cci.modo,
        cci.mensaje_template,
        (pm.anio || '-' || LPAD(pm.mes::text,2,'0') || '-' || LPAD(pm.dia::text,2,'0'))::date AS fecha
      FROM as_turnos_pauta_mensual pm
      INNER JOIN as_turnos_puestos_operativos po ON po.id = pm.puesto_id AND po.activo = true
      INNER JOIN instalaciones i ON i.id = po.instalacion_id
      INNER JOIN central_config_instalacion cci ON cci.instalacion_id = i.id
      LEFT JOIN guardias g ON pm.guardia_id = g.id
      LEFT JOIN as_turnos_roles_servicio rs ON po.rol_id = rs.id
      WHERE pm.tipo_turno = 'planificado'
        AND cci.habilitado = true
        AND cci.intervalo_minutos IS NOT NULL
        AND cci.ventana_inicio IS NOT NULL
        AND cci.ventana_fin IS NOT NULL
    ),
    slots_diurnos AS (
      SELECT 
        db.*,
        gs.slot_inicio
      FROM datos_base db
      CROSS JOIN LATERAL generate_series(
        db.fecha::timestamp + db.ventana_inicio::time,
        db.fecha::timestamp + db.ventana_fin::time,
        make_interval(mins => db.intervalo_minutos)
      ) AS gs(slot_inicio)
      WHERE db.ventana_inicio < db.ventana_fin
    ),
    slots_nocturnos_1 AS (
      SELECT 
        db.*,
        gs.slot_inicio
      FROM datos_base db
      CROSS JOIN LATERAL generate_series(
        db.fecha::timestamp + db.ventana_inicio::time,
        db.fecha::timestamp + time '23:59:59',
        make_interval(mins => db.intervalo_minutos)
      ) AS gs(slot_inicio)
      WHERE db.ventana_inicio >= db.ventana_fin
    ),
    slots_nocturnos_2 AS (
      SELECT 
        db.*,
        gs.slot_inicio
      FROM datos_base db
      CROSS JOIN LATERAL generate_series(
        (db.fecha + interval '1 day')::timestamp,
        (db.fecha + interval '1 day')::timestamp + db.ventana_fin::time,
        make_interval(mins => db.intervalo_minutos)
      ) AS gs(slot_inicio)
      WHERE db.ventana_inicio >= db.ventana_fin
    ),
    todos_los_slots AS (
      SELECT * FROM slots_diurnos
      UNION ALL
      SELECT * FROM slots_nocturnos_1
      UNION ALL
      SELECT * FROM slots_nocturnos_2
    ),
    slots_colapsados AS (
      SELECT 
        ts.*,
        ROW_NUMBER() OVER (
          PARTITION BY ts.instalacion_id, 
                       date_trunc('hour', ts.slot_inicio)
          ORDER BY ts.pauta_id, ts.slot_inicio
        ) as rn
      FROM todos_los_slots ts
    ),
    slots_finales AS (
      SELECT sc.*
      FROM slots_colapsados sc
      WHERE sc.rn = 1
    ),
    -- ✅ NUEVA LÓGICA: Unir con central_llamados y generar IDs únicos
    slots_con_registros AS (
      SELECT 
        sf.*,
        cl.id as registro_id,
        cl.estado as estado_registro,
        cl.observaciones as observaciones_registro,
        cl.contacto_tipo as contacto_tipo_registro,
        cl.contacto_id as contacto_id_registro,
        cl.contacto_nombre as contacto_nombre_registro,
        cl.contacto_telefono as contacto_telefono_registro,
        ROW_NUMBER() OVER (
          PARTITION BY sf.instalacion_id, date_trunc('hour', sf.slot_inicio)
          ORDER BY cl.created_at DESC NULLS LAST, sf.slot_inicio
        ) as rn_registro
      FROM slots_finales sf
      LEFT JOIN central_llamados cl 
        ON cl.instalacion_id = sf.instalacion_id 
        AND date_trunc('hour', cl.programado_para) = date_trunc('hour', sf.slot_inicio)
    )
    SELECT 
      -- ✅ ID ÚNICO: Incluir el ROW_NUMBER para garantizar unicidad
      md5(
        concat(
          scr.instalacion_id::text, 
          '|', 
          extract(epoch from scr.slot_inicio)::text,
          '|',
          scr.rn_registro::text
        )
      )::uuid AS id,
      
      scr.instalacion_id,
      scr.guardia_id,
      scr.pauta_id,
      scr.puesto_id,
      scr.slot_inicio AS programado_para,
      
      -- ✅ ESTADO: Usar el registro más reciente si existe
      COALESCE(scr.estado_registro, 'pendiente') AS estado_llamado,
      
      -- ✅ CONTACTO: Usar datos del registro si existe
      COALESCE(scr.contacto_tipo_registro, 'instalacion') AS contacto_tipo,
      COALESCE(scr.contacto_id_registro, scr.instalacion_id) AS contacto_id,
      COALESCE(scr.contacto_nombre_registro, scr.instalacion_nombre) AS contacto_nombre,
      COALESCE(scr.contacto_telefono_registro, scr.instalacion_telefono) AS contacto_telefono,
      
      -- ✅ OBSERVACIONES: Usar las del registro si existe
      scr.observaciones_registro AS observaciones,
      
      scr.instalacion_nombre,
      scr.guardia_nombre,
      scr.nombre_puesto,
      scr.rol_nombre,
      scr.intervalo_minutos,
      scr.ventana_inicio,
      scr.ventana_fin,
      scr.modo,
      scr.mensaje_template,
      
      -- ✅ URGENTE: Más de 30 min atrasado (en zona horaria Chile)
      CASE 
        WHEN (scr.slot_inicio AT TIME ZONE 'America/Santiago') < (now() AT TIME ZONE 'America/Santiago') - interval '30 minutes'
        THEN true 
        ELSE false 
      END AS es_urgente,
      
      -- ✅ ACTUAL: **CONVERTIR A CHILE ANTES DE COMPARAR**
      CASE 
        WHEN date_trunc('hour', scr.slot_inicio AT TIME ZONE 'America/Santiago') = 
             date_trunc('hour', now() AT TIME ZONE 'America/Santiago')
        THEN true 
        ELSE false 
      END AS es_actual,
      
      -- ✅ PRÓXIMO: Futuro (en zona horaria Chile)
      CASE 
        WHEN (scr.slot_inicio AT TIME ZONE 'America/Santiago') > (now() AT TIME ZONE 'America/Santiago')
        THEN true 
        ELSE false 
      END AS es_proximo,
      
      -- ✅ NO REALIZADO: Pendiente Y ya pasó su hora (en zona horaria Chile)
      CASE 
        WHEN COALESCE(scr.estado_registro, 'pendiente') = 'pendiente' 
         AND (scr.slot_inicio AT TIME ZONE 'America/Santiago') < (now() AT TIME ZONE 'America/Santiago')
        THEN true 
        ELSE false 
      END AS es_no_realizado
      
    FROM slots_con_registros scr
    WHERE scr.rn_registro = 1  -- ✅ Solo el registro más reciente por instalación y hora
    ORDER BY programado_para ASC
    `;
    
    await client.query(createViewSQL);
    console.log('✅ Vista recreada con IDs únicos');

    // 3. Verificar corrección
    console.log('3️⃣ Verificando corrección...');
    
    const duplicadosDespues = await client.query(`
      SELECT 
        id,
        COUNT(*) as cantidad
      FROM central_v_llamados_automaticos
      GROUP BY id
      HAVING COUNT(*) > 1
    `);
    
    console.log(`📊 IDs duplicados después de corrección: ${duplicadosDespues.rows.length}`);
    
    if (duplicadosDespues.rows.length === 0) {
      console.log('✅ PERFECTO: No hay IDs duplicados');
    } else {
      console.log('❌ Aún hay IDs duplicados:');
      duplicadosDespues.rows.forEach((row, i) => {
        console.log(`  ${i+1}. ID: ${row.id} - Cantidad: ${row.cantidad}`);
      });
    }

    // 4. Verificar los IDs específicos que causaban problemas
    console.log('4️⃣ Verificando IDs específicos...');
    
    const idsEspecificos = ['3364cbdc-add8-82b5-97f8-38110f29fdde', 'e6c86edd-99be-8f79-86f9-1082568b9709'];
    
    for (const id of idsEspecificos) {
      const resultado = await client.query(`
        SELECT 
          id,
          instalacion_nombre,
          programado_para,
          estado_llamado
        FROM central_v_llamados_automaticos
        WHERE id = $1
      `, [id]);
      
      console.log(`\n📊 ID ${id}:`);
      if (resultado.rows.length === 0) {
        console.log('  ✅ ID ya no existe (correcto)');
      } else {
        resultado.rows.forEach((row, i) => {
          console.log(`  ${i+1}. Instalación: ${row.instalacion_nombre}`);
          console.log(`     Programado: ${row.programado_para}`);
          console.log(`     Estado: ${row.estado_llamado}`);
        });
      }
    }

    // 5. Verificar total de registros
    console.log('5️⃣ Verificando total de registros...');
    
    const totalRegistros = await client.query(`
      SELECT COUNT(*) as total
      FROM central_v_llamados_automaticos
    `);
    
    console.log(`📊 Total de registros en la vista: ${totalRegistros.rows[0].total}`);

    console.log('\n🎉 VISTA CORREGIDA PARA IDs ÚNICOS');
    console.log('✅ IDs únicos garantizados');
    console.log('✅ Solo el registro más reciente por instalación y hora');
    console.log('✅ Sin duplicados en React');

  } catch (error) {
    console.error('❌ Error:', error);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

// Ejecutar
fixVistaIdsUnicos()
  .then(() => process.exit(0))
  .catch(() => process.exit(1));
